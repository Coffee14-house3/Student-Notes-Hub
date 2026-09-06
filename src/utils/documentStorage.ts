import { NoteDocument, CourseAnnouncement } from "../types";

const DB_NAME = "CourseNotesHubDB";
const DB_VERSION = 1;
const DOCS_STORE = "documents";
const ANNOUNCEMENTS_STORE = "announcements";

const LOCAL_DOCS_KEY = "aws_notes_uploaded_documents";
const LOCAL_ANNOUNCEMENTS_KEY = "aws_course_announcements";

/**
 * Open or upgrade the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DOCS_STORE)) {
        db.createObjectStore(DOCS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ANNOUNCEMENTS_STORE)) {
        db.createObjectStore(ANNOUNCEMENTS_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Synchronously retrieve cached documents from localStorage for instant initial render (no flicker)
 */
export function getStoredDocumentsSync(): NoteDocument[] {
  try {
    const raw = localStorage.getItem(LOCAL_DOCS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[Storage] localStorage read error:", err);
  }
  return [];
}

/**
 * Synchronously retrieve cached announcements from localStorage for instant initial render
 */
export function getStoredAnnouncementsSync(): CourseAnnouncement[] {
  try {
    const raw = localStorage.getItem(LOCAL_ANNOUNCEMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[Storage] localStorage announcements read error:", err);
  }
  return [];
}

/**
 * Save documents to IndexedDB (with localStorage backup of lightweight metadata)
 */
export async function saveDocumentsToStorage(docs: NoteDocument[]): Promise<void> {
  // 1. Sync to localStorage (strip heavy base64 data URLs if needed to prevent 5MB localStorage quota error)
  try {
    const safeDocs = docs.map(doc => {
      // If doc has large pdfDataUrl > 2MB, keep it in IndexedDB but omit from localStorage
      if (doc.pdfDataUrl && doc.pdfDataUrl.length > 2000000) {
        const { pdfDataUrl, ...rest } = doc;
        return rest;
      }
      return doc;
    });
    localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(safeDocs));
  } catch (e) {
    // If quota exceeded, try storing just metadata summary
    try {
      const miniDocs = docs.map(({ sections, pdfDataUrl, ...rest }) => ({
        ...rest,
        sections: (sections || []).map(s => ({ id: s.id, pageNumber: s.pageNumber, title: s.title, subtitle: s.subtitle, contentMarkdown: s.contentMarkdown.slice(0, 300) }))
      }));
      localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(miniDocs));
    } catch {
      // ignore
    }
  }

  // 2. Persist complete documents into IndexedDB (supports unlimited storage for full PDFs/slides)
  try {
    const db = await openDB();
    const tx = db.transaction(DOCS_STORE, "readwrite");
    const store = tx.objectStore(DOCS_STORE);

    // Clear and put all
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    for (const doc of docs) {
      store.put(doc);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (idbErr) {
    console.warn("[Storage] IndexedDB save notice:", idbErr);
  }
}

/**
 * Load full documents from IndexedDB, falling back to localStorage
 */
export async function loadDocumentsFromStorage(): Promise<NoteDocument[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(DOCS_STORE, "readonly");
    const store = tx.objectStore(DOCS_STORE);
    const docs = await new Promise<NoteDocument[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (Array.isArray(docs) && docs.length > 0) {
      return docs;
    }
  } catch (err) {
    console.warn("[Storage] IndexedDB read error, falling back to localStorage:", err);
  }

  return getStoredDocumentsSync();
}

/**
 * Save announcements to IndexedDB and localStorage
 */
export async function saveAnnouncementsToStorage(announcements: CourseAnnouncement[]): Promise<void> {
  try {
    localStorage.setItem(LOCAL_ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
  } catch {
    // ignore
  }

  try {
    const db = await openDB();
    const tx = db.transaction(ANNOUNCEMENTS_STORE, "readwrite");
    const store = tx.objectStore(ANNOUNCEMENTS_STORE);
    store.clear();
    for (const ann of announcements) {
      store.put(ann);
    }
  } catch {
    // ignore
  }
}

/**
 * Load announcements from IndexedDB and localStorage
 */
export async function loadAnnouncementsFromStorage(): Promise<CourseAnnouncement[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(ANNOUNCEMENTS_STORE, "readonly");
    const store = tx.objectStore(ANNOUNCEMENTS_STORE);
    const anns = await new Promise<CourseAnnouncement[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    if (Array.isArray(anns) && anns.length > 0) {
      return anns;
    }
  } catch {
    // ignore
  }

  return getStoredAnnouncementsSync();
}

/**
 * Bi-directional Smart Sync:
 * - Compares server documents and local documents
 * - If server has docs, updates local cache
 * - If server was restarted or cleared (e.g. Render ephemeral restart) and local has uploaded files,
 *   re-hydrates the server via /api/documents/sync so files are restored both in the server and in ChromaDB!
 */
export async function syncDocumentsWithServer(
  serverDocs: NoteDocument[],
  role: "teacher" | "student" = "teacher"
): Promise<NoteDocument[]> {
  const localDocs = await loadDocumentsFromStorage();

  // If server has documents, merge server documents with local
  if (Array.isArray(serverDocs) && serverDocs.length > 0) {
    // Merge: server docs take priority for metadata, but keep any local docs not on server
    const serverMap = new Map<string, NoteDocument>(serverDocs.map(d => [d.id, d]));
    const merged: NoteDocument[] = [...serverDocs];

    // Check if there are local user-uploaded docs missing on server
    const missingOnServer = localDocs.filter(d => !serverMap.has(d.id));
    if (missingOnServer.length > 0) {
      merged.push(...missingOnServer);
      // Resync missing files back to server in background
      fetch("/api/documents/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: missingOnServer })
      }).catch(err => console.warn("[Sync] Background sync to server failed:", err));
    }

    await saveDocumentsToStorage(merged);
    return merged;
  }

  // If server returned empty, but client has persisted files from previous uploads!
  if (localDocs.length > 0) {
    console.log(`[Storage] Server storage was empty; re-hydrating server with ${localDocs.length} local documents...`);
    // Restore server from client
    try {
      const res = await fetch("/api/documents/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: localDocs })
      });
      if (res.ok) {
        const syncedData = await res.json();
        if (syncedData.documents && Array.isArray(syncedData.documents)) {
          return syncedData.documents;
        }
      }
    } catch (syncErr) {
      console.warn("[Storage] Server rehydration sync notice:", syncErr);
    }
    return localDocs;
  }

  return [];
}
