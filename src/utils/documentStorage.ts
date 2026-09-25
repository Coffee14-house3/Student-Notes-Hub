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
  // 1. Sync to localStorage (strip heavy base64 data URLs to guarantee 0ms instant reload without 5MB quota error)
  try {
    const safeDocs = docs.map(doc => {
      const { pdfDataUrl, ...rest } = doc;
      return {
        ...rest,
        pdfUrl: rest.pdfUrl || `/api/pdf/${doc.id}`
      };
    });
    localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(safeDocs));
  } catch (e) {
    // If quota exceeded, try storing just metadata summary
    try {
      const miniDocs = docs.map(({ sections, pdfDataUrl, ...rest }) => ({
        ...rest,
        pdfUrl: rest.pdfUrl || `/api/pdf/${rest.id}`,
        sections: (sections || []).map(s => ({ id: s.id, pageNumber: s.pageNumber, title: s.title, subtitle: s.subtitle, contentMarkdown: s.contentMarkdown.slice(0, 200) }))
      }));
      localStorage.setItem(LOCAL_DOCS_KEY, JSON.stringify(miniDocs));
    } catch {
      // ignore
    }
  }

  // 2. Persist complete structured documents into IndexedDB (strip raw 50MB+ base64 blobs to preserve browser memory)
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
      // Omit heavy base64 in IndexedDB if larger than 200KB to guarantee elastic browser stability
      const cleanDoc = (doc.pdfDataUrl && doc.pdfDataUrl.length > 200000)
        ? { ...doc, pdfDataUrl: undefined, pdfUrl: doc.pdfUrl || `/api/pdf/${doc.id}` }
        : doc;
      store.put(cleanDoc);
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
 * - When role is 'student': Server documents are strictly authoritative. Any documents deleted
 *   or unpublished by the teacher are immediately purged from the student's local cache.
 * - When role is 'teacher': If the server has documents, it is authoritative.
 *   Only if the server is completely empty (e.g. cold restart on ephemeral disk) does local re-hydration occur.
 */
export async function syncDocumentsWithServer(
  serverDocs: NoteDocument[],
  role: "teacher" | "student" = "teacher"
): Promise<NoteDocument[]> {
  // 1. For Students: The teacher's server is the absolute ground truth.
  if (role === "student") {
    if (Array.isArray(serverDocs)) {
      // Overwrite student local storage with the exact published list from the server
      const publishedOnly = serverDocs.filter(d => d.isPublished !== false);
      await saveDocumentsToStorage(publishedOnly);
      return publishedOnly;
    }
    return [];
  }

  // 2. For Teacher: If server already has documents, synchronize local cache to match server
  const localDocs = await loadDocumentsFromStorage();
  if (Array.isArray(serverDocs) && serverDocs.length > 0) {
    await saveDocumentsToStorage(serverDocs);
    return serverDocs;
  }

  // 3. If server returned empty, but teacher has persisted files from previous session,
  // re-hydrate server so files are restored after container restart
  if (localDocs.length > 0) {
    console.log(`[Storage] Server storage was empty; re-hydrating teacher server with ${localDocs.length} local documents...`);
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

/**
 * Purge deleted documents from local cache given an authoritative list of IDs
 */
export async function purgeDeletedDocuments(authoritativeDocIds: string[]): Promise<void> {
  const allowed = new Set(authoritativeDocIds);
  const localDocs = await loadDocumentsFromStorage();
  const filtered = localDocs.filter(d => allowed.has(d.id));
  await saveDocumentsToStorage(filtered);
}

/**
 * Clear all document caches from IndexedDB and localStorage
 */
export async function clearAllDocumentStorage(): Promise<void> {
  try {
    localStorage.removeItem(LOCAL_DOCS_KEY);
  } catch {}
  try {
    const db = await openDB();
    const tx = db.transaction(DOCS_STORE, "readwrite");
    const store = tx.objectStore(DOCS_STORE);
    store.clear();
  } catch {}
}

