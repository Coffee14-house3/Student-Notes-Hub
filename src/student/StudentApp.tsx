import React, { useState, useEffect, useRef } from "react";
import { ReadingSettings, UserBookmark, NoteSection, NoteDocument, CourseAnnouncement } from "../types";
import { DocumentModalViewer } from "../components/DocumentModalViewer";
import { StudentPortal } from "./StudentPortal";
import { FlashcardsQuiz } from "./FlashcardsQuiz";
import { SearchModal } from "./SearchModal";
import { ExportModal } from "./ExportModal";
import { AiAssistantModal } from "./AiAssistantModal";
import { GraduationCap, BookOpen, Share2, Check, ArrowLeft } from "lucide-react";
import {
  getStoredDocumentsSync,
  getStoredAnnouncementsSync,
  loadDocumentsFromStorage,
  saveDocumentsToStorage,
  loadAnnouncementsFromStorage,
  saveAnnouncementsToStorage,
  syncDocumentsWithServer
} from "../utils/documentStorage";

interface Props {
  isStandalone?: boolean;
  onSwitchPortal?: (mode: "student" | "teacher") => void;
}

export const StudentApp: React.FC<Props> = ({ isStandalone = true, onSwitchPortal }) => {
  const [activeView, setActiveView] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const docParam = params.get("doc");
      if (docParam) return docParam;
    } catch {
      // ignore
    }
    return "dashboard";
  });

  const [activeSectionId, setActiveSectionId] = useState<string>("section-1");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);

  // Documents state initialized with cached local data for instant 0ms reload
  const [documents, setDocuments] = useState<NoteDocument[]>(() => {
    return getStoredDocumentsSync();
  });

  // Announcements state initialized with cached local data
  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>(() => {
    return getStoredAnnouncementsSync();
  });

  // Save documents to local cache when updated
  useEffect(() => {
    if (isInitializedRef.current) {
      saveDocumentsToStorage(documents);
    }
  }, [documents]);

  // Save announcements to local cache when updated
  useEffect(() => {
    if (isInitializedRef.current) {
      saveAnnouncementsToStorage(announcements);
    }
  }, [announcements]);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Core synchronization: Queries the backend/teacher portal and purges any notes deleted by the teacher
  const handleSyncWithTeacher = async (isManual = false) => {
    if (isManual) setIsSyncing(true);
    try {
      let serverDocs: NoteDocument[] | null = null;

      // 1. Try local server endpoint
      try {
        const res = await fetch(`/api/documents?role=student&_t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.documents)) {
            serverDocs = data.documents;
          }
        }
      } catch (e) {
        console.warn("[StudentApp] Local fetch failed:", e);
      }

      // 2. If local server returned empty or failed and we are on a remote client, try remote Teacher directly
      if (
        (!serverDocs || serverDocs.length === 0) &&
        typeof window !== "undefined" &&
        !window.location.hostname.includes("course-teacher-portal")
      ) {
        try {
          const remoteRes = await fetch(
            `https://course-teacher-portal.onrender.com/api/documents?role=student&_t=${Date.now()}`,
            { cache: "no-store" }
          );
          if (remoteRes.ok) {
            const remoteData = await remoteRes.json();
            if (Array.isArray(remoteData.documents) && remoteData.documents.length > 0) {
              serverDocs = remoteData.documents;
            }
          }
        } catch {
          // ignore fallback error
        }
      }

      // 3. When authoritative list is received from server:
      if (serverDocs !== null) {
        const publishedOnly = serverDocs.filter(d => d.isPublished !== false);
        // syncDocumentsWithServer strictly purges any documents that are no longer in publishedOnly
        const synced = await syncDocumentsWithServer(publishedOnly, "student");
        setDocuments(synced);

        if (isManual) {
          setSyncStatus(`Synced • ${synced.length} active note${synced.length === 1 ? "" : "s"}`);
          setTimeout(() => setSyncStatus(null), 4000);
        }
      }
    } catch (err) {
      console.warn("[StudentApp] Sync failed:", err);
      if (isManual) {
        setSyncStatus("Sync failed (offline or server restarting)");
        setTimeout(() => setSyncStatus(null), 4000);
      }
    } finally {
      if (isManual) setIsSyncing(false);
      isInitializedRef.current = true;
    }
  };

  // Fetch published documents from backend and keep in sync
  useEffect(() => {
    let isMounted = true;
    const initialLoad = async () => {
      // 1. Initial cached display for 0ms load
      const localDocs = await loadDocumentsFromStorage();
      if (isMounted && localDocs.length > 0) {
        setDocuments(localDocs.filter(d => d.isPublished !== false));
      }
      // 2. Authoritative sync with server to prune deleted notes
      await handleSyncWithTeacher(false);
    };

    initialLoad();

    // Auto-sync whenever tab gains focus (e.g. after teacher modified files) or every 20s
    const handleFocus = () => handleSyncWithTeacher(false);
    window.addEventListener("focus", handleFocus);
    const interval = setInterval(() => handleSyncWithTeacher(false), 20000);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, []);

  // Fetch announcements from backend
  useEffect(() => {
    let isMounted = true;
    const fetchAnnouncements = async () => {
      const localAnns = await loadAnnouncementsFromStorage();
      if (isMounted && localAnns.length > 0) {
        setAnnouncements(localAnns);
      }
      try {
        const res = await fetch("/api/announcements");
        if (res.ok) {
          const data = await res.json();
          if (data.announcements && Array.isArray(data.announcements)) {
            if (data.announcements.length > 0) {
              if (isMounted) setAnnouncements(data.announcements);
              await saveAnnouncementsToStorage(data.announcements);
            }
          }
        }
      } catch {
        // fallback
      }
    };
    fetchAnnouncements();
    return () => { isMounted = false; };
  }, []);

  // User interaction modals
  const [aiChatOpen, setAiChatOpen] = useState<boolean>(false);
  const [quizModalOpen, setQuizModalOpen] = useState<boolean>(false);
  const [quizTargetDocId, setQuizTargetDocId] = useState<string | undefined>(undefined);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);

  // User reading settings
  const [readingSettings, setReadingSettings] = useState<ReadingSettings>(() => {
    try {
      const saved = localStorage.getItem("aws_notes_reading_settings");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      fontSize: "medium",
      lineSpacing: "normal",
      fontFamily: "sans",
      focusMode: false,
      readingGoalMinutes: 15,
      highContrastMode: false,
      darkMode: true
    };
  });

  // User bookmarks
  const [bookmarks, setBookmarks] = useState<UserBookmark[]>(() => {
    try {
      const saved = localStorage.getItem("aws_notes_user_bookmarks");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const handleToggleBookmark = (noteId: string, sectionId: string, sectionTitle: string, pageNumber: number) => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.noteId === noteId && b.sectionId === sectionId);
      if (exists) {
        return prev.filter(b => !(b.noteId === noteId && b.sectionId === sectionId));
      } else {
        const newBm: UserBookmark = {
          id: `bm-${Date.now()}`,
          noteId,
          sectionId,
          sectionTitle,
          textSnippet: sectionTitle,
          createdTime: new Date().toISOString().split("T")[0]
        };
        return [...prev, newBm];
      }
    });
  };

  const handleCopyShareLink = () => {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const currentDocument = documents.find(d => d.id === activeView);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Top Student Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-500 text-slate-950 font-bold rounded-xl shadow-sm">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-white tracking-tight">Student Notes Hub</span>
            <span className="hidden sm:inline text-[10px] text-slate-400 ml-2 border-l border-slate-800 pl-2">
              Verified Course Materials
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {activeView !== "dashboard" && (
            <button
              onClick={() => {
                setActiveView("dashboard");
                const url = new URL(window.location.href);
                url.searchParams.delete("doc");
                window.history.pushState({}, "", url.toString());
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Course Notes</span>
            </button>
          )}

          <button
            onClick={handleCopyShareLink}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Copy shareable link"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Share Link</span>
              </>
            )}
          </button>
        </div>
      </nav>

      {/* Main View Area */}
      <main className="flex-1">
        {activeView === "dashboard" || !currentDocument ? (
          <StudentPortal
            documents={documents}
            announcements={announcements}
            onSelectDocument={(docId, openAiChat) => {
              setActiveView(docId);
              if (openAiChat) setAiChatOpen(true);
              const url = new URL(window.location.href);
              url.searchParams.set("doc", docId);
              window.history.pushState({}, "", url.toString());
            }}
            onOpenQuiz={(docId) => {
              setQuizTargetDocId(docId);
              setQuizModalOpen(true);
            }}
            onOpenSearch={() => setSearchOpen(true)}
            onOpenAiTutor={() => setAiChatOpen(true)}
            isStandalone={isStandalone}
            onSyncWithTeacher={() => handleSyncWithTeacher(true)}
            isSyncing={isSyncing}
            syncStatus={syncStatus}
          />
        ) : (
          <DocumentModalViewer
            isOpen={true}
            onClose={() => {
              setActiveView("dashboard");
              const url = new URL(window.location.href);
              url.searchParams.delete("doc");
              window.history.pushState({}, "", url.toString());
            }}
            document={currentDocument}
            notes={documents}
            allDocuments={documents}
            activeView={activeView}
            setActiveView={(docId) => {
              setActiveView(docId);
              const url = new URL(window.location.href);
              if (docId === "dashboard") {
                url.searchParams.delete("doc");
              } else {
                url.searchParams.set("doc", docId);
              }
              window.history.pushState({}, "", url.toString());
            }}
            onSelectDocument={(docId) => {
              setActiveView(docId);
              const url = new URL(window.location.href);
              url.searchParams.set("doc", docId);
              window.history.pushState({}, "", url.toString());
            }}
            readingSettings={readingSettings}
            onUpdateSettings={setReadingSettings}
            bookmarks={bookmarks}
            onToggleBookmark={handleToggleBookmark}
            isAiChatOpen={aiChatOpen}
            onOpenAiChat={() => setAiChatOpen(true)}
            onCloseAiChat={() => setAiChatOpen(false)}
            onToggleAiChat={() => setAiChatOpen(prev => !prev)}
            onOpenQuiz={() => {
              if (currentDocument) {
                setQuizTargetDocId(currentDocument.id);
              }
              setQuizModalOpen(true);
            }}
            onOpenExport={() => setExportModalOpen(true)}
          />
        )}
      </main>

      {/* AI Smart Tutor Modal (Only rendered as floating modal when on dashboard/portal view) */}
      {aiChatOpen && (activeView === "dashboard" || !currentDocument) && (
        <AiAssistantModal
          isOpen={aiChatOpen}
          onClose={() => setAiChatOpen(false)}
          contextText={currentDocument ? (currentDocument.sections || []).map(s => `${s.title}: ${s.contentMarkdown}`).join("\n\n") : ""}
          activeDocument={currentDocument}
        />
      )}

      {/* Practice Quiz Modal */}
      {quizModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl my-auto">
            <FlashcardsQuiz
              selectedNote={documents.find(d => d.id === quizTargetDocId) || currentDocument || null}
              allNotes={documents}
              onSelectNote={(noteId) => setQuizTargetDocId(noteId)}
              onClose={() => setQuizModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        notes={documents}
        onSelectResult={(noteId) => {
          setActiveView(noteId);
          setSearchOpen(false);
          const url = new URL(window.location.href);
          url.searchParams.set("doc", noteId);
          window.history.pushState({}, "", url.toString());
        }}
      />

      {/* Export Modal */}
      {exportModalOpen && currentDocument && (
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          document={currentDocument}
        />
      )}

    </div>
  );
};

export default StudentApp;
