import React, { useState, useEffect, useRef } from "react";
import { ReadingSettings, UserBookmark, NoteSection, NoteDocument, CourseAnnouncement } from "../types";
import { DocumentModalViewer } from "../components/DocumentModalViewer";
import { StudentPortal } from "./StudentPortal";
import { FlashcardsQuiz } from "./FlashcardsQuiz";
import { SearchModal } from "./SearchModal";
import { ExportModal } from "./ExportModal";
import { AiAssistantModal } from "./AiAssistantModal";
import { GraduationCap, BookOpen, Sparkles, Share2, Check, ArrowLeft } from "lucide-react";
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
}

export const StudentApp: React.FC<Props> = ({ isStandalone = true }) => {
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

  // Fetch published documents from backend with IndexedDB cache fallback and smart server sync
  useEffect(() => {
    let isMounted = true;
    const fetchDocs = async () => {
      // 1. Load local documents first
      const localDocs = await loadDocumentsFromStorage();
      if (isMounted && localDocs.length > 0) {
        setDocuments(localDocs.filter(d => d.isPublished !== false));
      }

      // 2. Fetch latest published documents from backend and perform smart sync
      try {
        const res = await fetch("/api/documents?role=student");
        if (res.ok) {
          const data = await res.json();
          const serverDocs = Array.isArray(data.documents) ? data.documents : [];
          const merged = await syncDocumentsWithServer(serverDocs, "student");
          if (isMounted && merged.length > 0) {
            setDocuments(merged.filter(d => d.isPublished !== false));
          }
        }
      } catch {
        // fallback to local storage
      } finally {
        isInitializedRef.current = true;
      }
    };

    fetchDocs();
    return () => { isMounted = false; };
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
            onClick={() => setAiChatOpen(true)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Smart Tutor</span>
          </button>

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
            onOpenAiChat={() => setAiChatOpen(true)}
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

      {/* AI Smart Tutor Modal */}
      {aiChatOpen && (
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
