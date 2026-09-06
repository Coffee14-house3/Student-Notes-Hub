import React, { useState, useEffect, useRef } from "react";
import { ReadingSettings, UserBookmark, NoteDocument, CourseAnnouncement } from "../types";
import { TeacherPortal } from "../components/TeacherPortal";
import { DocumentModalViewer } from "../components/DocumentModalViewer";
import { StudentPortal } from "../student/StudentPortal";
import { DocumentMergeModal } from "./DocumentMergeModal";
import { DocumentRenameModal } from "./DocumentRenameModal";
import { DocumentDetailsModal } from "./DocumentDetailsModal";
import { Layers, GraduationCap, ArrowLeft, Eye, EyeOff } from "lucide-react";
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

export const TeacherApp: React.FC<Props> = ({ isStandalone = true }) => {
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [isPreviewingStudent, setIsPreviewingStudent] = useState<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);

  // Documents state initialized with cached local data for instant 0ms reload
  const [documents, setDocuments] = useState<NoteDocument[]>(() => {
    return getStoredDocumentsSync();
  });

  // Announcements state initialized with cached local data
  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>(() => {
    return getStoredAnnouncementsSync();
  });

  // Automatically save documents whenever state updates
  useEffect(() => {
    if (isInitializedRef.current) {
      saveDocumentsToStorage(documents);
    }
  }, [documents]);

  // Automatically save announcements whenever state updates
  useEffect(() => {
    if (isInitializedRef.current) {
      saveAnnouncementsToStorage(announcements);
    }
  }, [announcements]);

  // Bi-directional document loading & server synchronization on mount
  useEffect(() => {
    let isMounted = true;
    const loadAndSync = async () => {
      // 1. Asynchronously load complete docs from IndexedDB (including large PDFs and slides)
      const local = await loadDocumentsFromStorage();
      if (isMounted && local.length > 0) {
        setDocuments(local);
      }

      // 2. Fetch server documents and perform smart bi-directional sync
      try {
        const res = await fetch("/api/documents?role=all");
        if (res.ok) {
          const data = await res.json();
          const serverDocs = Array.isArray(data.documents) ? data.documents : [];
          const merged = await syncDocumentsWithServer(serverDocs, "teacher");
          if (isMounted && merged.length > 0) {
            setDocuments(merged);
          }
        }
      } catch (err) {
        console.warn("[TeacherApp] Network notice during document fetch:", err);
      } finally {
        isInitializedRef.current = true;
      }
    };

    loadAndSync();
    return () => { isMounted = false; };
  }, []);

  // Fetch announcements on mount with local storage fallback
  useEffect(() => {
    let isMounted = true;
    const loadAnns = async () => {
      const local = await loadAnnouncementsFromStorage();
      if (isMounted && local.length > 0) {
        setAnnouncements(local);
      }
      try {
        const res = await fetch("/api/announcements");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.announcements) && data.announcements.length > 0) {
            if (isMounted) setAnnouncements(data.announcements);
            saveAnnouncementsToStorage(data.announcements);
          }
        }
      } catch {
        // ignore
      }
    };
    loadAnns();
    return () => { isMounted = false; };
  }, []);

  // Reading settings & bookmarks for previewing docs
  const [readingSettings, setReadingSettings] = useState<ReadingSettings>({
    fontSize: "medium",
    lineSpacing: "normal",
    fontFamily: "sans",
    focusMode: false,
    readingGoalMinutes: 15,
    highContrastMode: false,
    darkMode: true
  });

  const [bookmarks, setBookmarks] = useState<UserBookmark[]>([]);

  // File Upload Handler
  const handleUploadDocument = async (
    file: File, 
    metadata?: { 
      title?: string; 
      subject?: string; 
      unit?: string; 
      unitNumber?: number; 
      unitTitle?: string; 
      courseCode?: string; 
      uploadedBy?: string; 
      isPublished?: boolean 
    }
  ) => {
    // Read file as base64 data URL
    const fileContent: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const payload = {
      fileName: file.name,
      fileType: file.type || undefined,
      fileContent,
      title: metadata?.title || file.name,
      subject: metadata?.subject,
      unit: metadata?.unit,
      unitNumber: metadata?.unitNumber,
      unitTitle: metadata?.unitTitle,
      courseCode: metadata?.courseCode,
      uploadedBy: metadata?.uploadedBy,
      isPublished: metadata?.isPublished
    };

    const res = await fetch("/api/parse-document", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to process document file");
    }

    const data = await res.json();
    const newDoc: NoteDocument = data.document || data;
    setDocuments(prev => [newDoc, ...prev]);
  };

  // Rename / Edit Metadata Handler
  const handleRenameDocument = async (
    docId: string, 
    newTitle: string, 
    subject?: string, 
    description?: string,
    unit?: string,
    unitTitle?: string,
    courseCode?: string
  ) => {
    try {
      await fetch(`/api/documents/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          subject,
          description,
          unit,
          unitTitle,
          courseCode
        })
      });
    } catch {
      // ignore
    }

    setDocuments(prev =>
      prev.map(d => {
        if (d.id === docId) {
          return {
            ...d,
            title: newTitle,
            shortTitle: newTitle.length > 25 ? newTitle.slice(0, 22) + "..." : newTitle,
            subject: (subject && subject.trim()) ? subject.trim() : (d.subject || "General Studies"),
            description: description !== undefined ? description : d.description,
            unit: (unit && unit.trim()) ? unit.trim() : (d.unit || "Unit 1"),
            unitTitle: unitTitle !== undefined ? unitTitle : d.unitTitle,
            courseCode: courseCode !== undefined ? courseCode : d.courseCode
          };
        }
        return d;
      })
    );
  };

  // Duplicate Document
  const handleDuplicateDocument = (docId: string) => {
    const found = documents.find(d => d.id === docId);
    if (!found) return;
    const duplicated: NoteDocument = {
      ...found,
      id: `doc-${Date.now()}`,
      title: `${found.title} (Copy)`,
      shortTitle: `${found.shortTitle} (Copy)`,
      uploadedAt: "Just now"
    };
    setDocuments(prev => [duplicated, ...prev]);
  };

  // Merge Documents
  const handleMergeDocuments = (mergedTitle: string, docIdsToMerge: string[]) => {
    const selected = documents.filter(d => docIdsToMerge.includes(d.id));
    if (selected.length < 2) return;

    let mergedSections: any[] = [];
    let pageCounter = 1;
    selected.forEach(doc => {
      doc.sections.forEach(sec => {
        mergedSections.push({
          ...sec,
          id: `merged-sec-${Date.now()}-${pageCounter}`,
          pageNumber: pageCounter++
        });
      });
    });

    const mergedDoc: NoteDocument = {
      id: `merged-${Date.now()}`,
      title: mergedTitle,
      shortTitle: mergedTitle.length > 24 ? mergedTitle.slice(0, 22) + "..." : mergedTitle,
      description: `Comprehensive master study guide combined from ${selected.length} materials.`,
      pageCount: mergedSections.length,
      sections: mergedSections,
      subject: selected[0]?.subject || "Comprehensive Master Notes",
      uploadedBy: "Teacher & Instructor Studio",
      uploadedAt: "Just now",
      isPublished: true,
      tags: ["Master Guide", "Merged", "Comprehensive"]
    };

    setDocuments(prev => [mergedDoc, ...prev]);
  };

  // Delete Document
  const handleDeleteDocument = async (docId: string) => {
    try {
      await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    setDocuments(prev => prev.filter(d => d.id !== docId));
    if (activeView === docId) setActiveView("dashboard");
  };

  // Toggle Publish
  const handleTogglePublishDocument = async (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    const newStatus = doc?.isPublished === false ? true : false;
    try {
      await fetch(`/api/documents/${docId}/publish`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: newStatus })
      });
    } catch {
      // ignore
    }
    setDocuments(prev =>
      prev.map(d => (d.id === docId ? { ...d, isPublished: newStatus } : d))
    );
  };

  // Announcements Handlers
  const handleCreateAnnouncement = async (ann: Omit<CourseAnnouncement, "id" | "date">) => {
    const newAnn: CourseAnnouncement = {
      ...ann,
      id: `ann-${Date.now()}`,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
    };
    try {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAnn)
      });
    } catch {
      // ignore
    }
    setAnnouncements(prev => [newAnn, ...prev]);
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    try {
      await fetch(`/api/announcements/${annId}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    setAnnouncements(prev => prev.filter(a => a.id !== annId));
  };

  const currentDocument = documents.find(d => d.id === activeView);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-purple-500/30 selection:text-purple-200">
      
      {/* Top Teacher Studio Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-purple-900/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-sm">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-white tracking-tight">Teacher & Instructor Studio</span>
            <span className="hidden sm:inline text-[10px] text-purple-300/80 ml-2 border-l border-purple-900/40 pl-2">
              Curriculum & Vector Indexing Management
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {activeView !== "dashboard" ? (
            <button
              onClick={() => setActiveView("dashboard")}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Studio Dashboard</span>
            </button>
          ) : (
            <button
              onClick={() => setIsPreviewingStudent(!isPreviewingStudent)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border ${
                isPreviewingStudent
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                  : "bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border-purple-800/60"
              }`}
              title="Preview student view"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{isPreviewingStudent ? "Exit Student Preview" : "Preview as Student"}</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Studio Area */}
      <main className="flex-1">
        {isPreviewingStudent ? (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-300">
              <span className="font-semibold flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Live Student Preview Mode — Only published materials are displayed
              </span>
              <button
                onClick={() => setIsPreviewingStudent(false)}
                className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-[11px] hover:bg-amber-400"
              >
                Return to Teacher Studio
              </button>
            </div>
            <StudentPortal
              documents={documents}
              announcements={announcements}
              onSelectDocument={(docId) => setActiveView(docId)}
              onOpenQuiz={() => {}}
              onOpenSearch={() => {}}
              onOpenAiTutor={() => {}}
              isStandalone={false}
            />
          </div>
        ) : activeView === "dashboard" || !currentDocument ? (
          <TeacherPortal
            documents={documents}
            announcements={announcements}
            onUploadDocument={handleUploadDocument}
            onLoadSampleDocument={() => {}}
            onSelectDocument={(docId) => setActiveView(docId)}
            onRenameDocument={handleRenameDocument}
            onDuplicateDocument={handleDuplicateDocument}
            onMergeDocuments={handleMergeDocuments}
            onDeleteDocument={handleDeleteDocument}
            onTogglePublishDocument={handleTogglePublishDocument}
            onCreateAnnouncement={handleCreateAnnouncement}
            onDeleteAnnouncement={handleDeleteAnnouncement}
            onSwitchToStudent={() => setIsPreviewingStudent(true)}
          />
        ) : (
          <DocumentModalViewer
            isOpen={true}
            onClose={() => setActiveView("dashboard")}
            document={currentDocument}
            notes={documents}
            allDocuments={documents}
            activeView={activeView}
            setActiveView={(docId) => setActiveView(docId)}
            onSelectDocument={(docId) => setActiveView(docId)}
            readingSettings={readingSettings}
            onUpdateSettings={setReadingSettings}
            bookmarks={bookmarks}
            onToggleBookmark={() => {}}
            onOpenAiChat={() => {}}
            onOpenQuiz={() => {}}
            onOpenExport={() => {}}
          />
        )}
      </main>

    </div>
  );
};

export default TeacherApp;
