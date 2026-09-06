import React, { useState, useRef } from "react";
import { 
  Upload, FileText, Sparkles, BookOpen, Trash2, ArrowRight, 
  CheckCircle2, FileCode, Search, HelpCircle, Layers, ShieldCheck, 
  RefreshCw, Plus, HardDrive, File, Database, Zap, Edit3, 
  Copy, Eye, EyeOff, GitMerge, Share2, Check, AlertCircle, 
  Bell, User, GraduationCap, ArrowUpRight, Lock, Unlock,
  SlidersHorizontal, Download, FolderPlus, Folder, ChevronDown,
  ChevronRight, Tag, BookMarked, MoveRight, LayoutGrid, ListFilter,
  RotateCcw
} from "lucide-react";
import { NoteDocument, NoteSection, CourseAnnouncement } from "../types";

interface Props {
  documents: NoteDocument[];
  announcements: CourseAnnouncement[];
  onUploadDocument: (
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
  ) => Promise<void>;
  onLoadSampleDocument: (sampleType: "pdf" | "code" | "markdown" | "docx" | "pptx") => void;
  onSelectDocument: (docId: string, openAiChat?: boolean) => void;
  onOpenQuiz?: (docId: string) => void;
  onRenameDocument: (
    docId: string, 
    newTitle: string, 
    subject?: string, 
    description?: string,
    unit?: string,
    unitTitle?: string,
    courseCode?: string
  ) => void;
  onDuplicateDocument: (docId: string) => void;
  onMergeDocuments: (mergedTitle: string, docIdsToMerge: string[]) => void;
  onDeleteDocument: (docId: string) => void;
  onTogglePublishDocument: (docId: string) => void;
  onCreateAnnouncement: (announcement: Omit<CourseAnnouncement, "id" | "date">) => void;
  onDeleteAnnouncement: (announcementId: string) => void;
  onRestoreDefaultNotes?: () => void;
  onRemoveUpdatedNotes?: () => void;
  onSwitchToStudent: () => void;
  isUploading: boolean;
  uploadError: string | null;
}

export const TeacherPortal: React.FC<Props> = ({
  documents,
  announcements,
  onUploadDocument,
  onLoadSampleDocument,
  onSelectDocument,
  onOpenQuiz,
  onRenameDocument,
  onDuplicateDocument,
  onMergeDocuments,
  onDeleteDocument,
  onTogglePublishDocument,
  onCreateAnnouncement,
  onDeleteAnnouncement,
  onRestoreDefaultNotes,
  onRemoveUpdatedNotes,
  onSwitchToStudent,
  isUploading,
  uploadError
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("false");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>("all");
  const [viewLayout, setViewLayout] = useState<"curriculum" | "grid">("curriculum");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<string | null>(null);

  // Upload Form State (Direct typed inputs)
  const [customTitle, setCustomTitle] = useState<string>("");
  const [subjectInput, setSubjectInput] = useState<string>("");
  const [unitInput, setUnitInput] = useState<string>("Unit 1");
  const [unitTitleInput, setUnitTitleInput] = useState<string>("");
  const [courseCodeInput, setCourseCodeInput] = useState<string>("");
  const [instructorName, setInstructorName] = useState<string>("");
  const [isPublishedOnUpload, setIsPublishedOnUpload] = useState<boolean>(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Collapsed Subjects in Curriculum View
  const [collapsedSubjects, setCollapsedSubjects] = useState<Record<string, boolean>>({});

  // ChromaDB Cloud Vector Database State
  const [chromaStatus, setChromaStatus] = useState<{
    connected: boolean;
    tenant: string;
    database: string;
    collection: string;
    vectorCount: number;
    error: string | null;
  } | null>(null);
  const [isSyncingChroma, setIsSyncingChroma] = useState<boolean>(false);
  const [chromaSyncMsg, setChromaSyncMsg] = useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/chroma/status")
      .then(res => res.json())
      .then(data => setChromaStatus(data))
      .catch(() => {});
  }, [documents.length]);

  const handleSyncChroma = async () => {
    setIsSyncingChroma(true);
    setChromaSyncMsg(null);
    try {
      const res = await fetch("/api/chroma/sync", { method: "POST" });
      const data = await res.json();
      if (data.status) setChromaStatus(data.status);
      setChromaSyncMsg(`ChromaDB synchronized: ${data.indexedCount || 0} vector chunks ready`);
      setTimeout(() => setChromaSyncMsg(null), 4000);
    } catch {
      setChromaSyncMsg("Sync failed. Please check network connection.");
    } finally {
      setIsSyncingChroma(false);
    }
  };

  // Announcement Form State
  const [showAnnounceForm, setShowAnnounceForm] = useState<boolean>(false);
  const [newAnnTitle, setNewAnnTitle] = useState<string>("");
  const [newAnnContent, setNewAnnContent] = useState<string>("");
  const [newAnnImportant, setNewAnnImportant] = useState<boolean>(false);
  const [newAnnRelatedDoc, setNewAnnRelatedDoc] = useState<string>("");

  // Edit Modal State
  const [editingDoc, setEditingDoc] = useState<NoteDocument | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editSubject, setEditSubject] = useState<string>("");
  const [editUnit, setEditUnit] = useState<string>("Unit 1");
  const [editUnitTitle, setEditUnitTitle] = useState<string>("");
  const [editCourseCode, setEditCourseCode] = useState<string>("MCA-204");
  const [editDescription, setEditDescription] = useState<string>("");

  // Merge Mode State
  const [isMergeMode, setIsMergeMode] = useState<boolean>(false);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [mergedGuideTitle, setMergedGuideTitle] = useState<string>("Comprehensive Cloud Master Guide");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveSubject = subjectInput.trim() || "General Studies";
  const effectiveUnit = unitInput.trim() || "Unit 1";

  const getDocFormatBadge = (doc: NoteDocument) => {
    const name = doc.title.toLowerCase();
    const isPpt = doc.fileFormat === "pptx" || doc.fileFormat === "ppt" || name.endsWith(".pptx") || name.endsWith(".ppt") || doc.tags?.includes("PPTX") || doc.tags?.includes("PowerPoint");
    const isDocx = doc.fileFormat === "docx" || doc.fileFormat === "doc" || name.endsWith(".docx") || name.endsWith(".doc") || doc.tags?.includes("DOCX") || doc.tags?.includes("Word");
    const isPdf = doc.fileFormat === "pdf" || name.endsWith(".pdf") || doc.pdfUrl || doc.tags?.includes("PDF") || doc.tags?.includes("Whitepaper");
    const isCode = doc.fileFormat === "code" || /\.(py|js|ts|json)$/i.test(name) || doc.tags?.includes("Lambda");

    if (isPpt) {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
          PPTX
        </span>
      );
    }
    if (isDocx) {
      return (
        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
          DOCX
        </span>
      );
    }
    if (isPdf) {
      return (
        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
          PDF
        </span>
      );
    }
    if (isCode) {
      return (
        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
          Code
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
        Doc
      </span>
    );
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!customTitle) {
        setCustomTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!customTitle) {
        setCustomTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleExecuteUpload = async () => {
    if (!selectedFile) return;

    let unitNum = 1;
    const match = effectiveUnit.match(/\d+/);
    if (match) unitNum = parseInt(match[0], 10);

    await onUploadDocument(selectedFile, {
      title: customTitle.trim() || selectedFile.name,
      subject: effectiveSubject,
      unit: effectiveUnit,
      unitNumber: unitNum,
      unitTitle: unitTitleInput.trim(),
      courseCode: courseCodeInput.trim() || "MCA-204",
      uploadedBy: instructorName.trim() || "Instructor",
      isPublished: isPublishedOnUpload
    });

    // Reset file form
    setSelectedFile(null);
    setCustomTitle("");
    setUnitTitleInput("");
  };

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;

    const relatedDocObj = documents.find(d => d.id === newAnnRelatedDoc);

    onCreateAnnouncement({
      title: newAnnTitle.trim(),
      content: newAnnContent.trim(),
      author: instructorName.trim() || "Teacher",
      important: newAnnImportant,
      relatedDocId: newAnnRelatedDoc || undefined,
      relatedDocTitle: relatedDocObj?.shortTitle || relatedDocObj?.title || undefined
    });

    setNewAnnTitle("");
    setNewAnnContent("");
    setNewAnnImportant(false);
    setNewAnnRelatedDoc("");
    setShowAnnounceForm(false);
  };

  const handleOpenEdit = (doc: NoteDocument) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditSubject(doc.subject || "");
    setEditUnit(doc.unit || "Unit 1");
    setEditUnitTitle(doc.unitTitle || "");
    setEditCourseCode(doc.courseCode || "");
    setEditDescription(doc.description || "");
  };

  const handleSaveEdit = () => {
    if (!editingDoc) return;
    const finalSubj = editSubject.trim() || editingDoc.subject || "General Studies";
    const finalUnit = editUnit.trim() || editingDoc.unit || "Unit 1";
    onRenameDocument(
      editingDoc.id, 
      editTitle.trim() || editingDoc.title, 
      finalSubj, 
      editDescription.trim(),
      finalUnit,
      editUnitTitle.trim(),
      editCourseCode.trim()
    );
    setEditingDoc(null);
  };

  const handleQuickMoveUnit = (doc: NoteDocument, newUnit: string) => {
    let unitNum = doc.unitNumber;
    const match = newUnit.match(/\d+/);
    if (match) unitNum = parseInt(match[0], 10);

    onRenameDocument(
      doc.id,
      doc.title,
      doc.subject,
      doc.description,
      newUnit,
      doc.unitTitle,
      doc.courseCode
    );
  };

  const handleToggleMergeDoc = (id: string) => {
    setSelectedForMerge(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleExecuteMerge = () => {
    if (selectedForMerge.length < 2) return;
    onMergeDocuments(mergedGuideTitle.trim() || "Master Course Guide", selectedForMerge);
    setSelectedForMerge([]);
    setIsMergeMode(false);
  };

  const handleCopyStudentLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("portal", "student");
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const toggleSubjectCollapse = (subj: string) => {
    setCollapsedSubjects(prev => ({
      ...prev,
      [subj]: !prev[subj]
    }));
  };

  const handlePresetUploadForSubjectAndUnit = (subj: string, unit?: string) => {
    setSubjectInput(subj);
    if (unit) {
      setUnitInput(unit);
    }

    // Scroll smoothly to upload area
    fileInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    fileInputRef.current?.click();
  };

  // Extract all unique subjects (fallback to "General Studies" if missing/empty)
  const allSubjects: string[] = Array.from(
    new Set<string>(
      (documents || []).map(d => (d.subject?.trim() || "General Studies"))
    )
  );

  // Extract all unique units (fallback to "Unit 1" if missing/empty)
  const allUnits: string[] = Array.from(
    new Set<string>(
      (documents || []).map(d => (d.unit?.trim() || "Unit 1"))
    )
  ).sort();

  // Filtered documents
  const filteredDocs = (documents || []).filter((doc) => {
    const docSubj = doc.subject?.trim() || "General Studies";
    const docUnit = doc.unit?.trim() || "Unit 1";

    const matchesSubject = selectedSubjectFilter === "all" || docSubj === selectedSubjectFilter;
    const matchesUnit = selectedUnitFilter === "all" || docUnit === selectedUnitFilter;
    if (!matchesSubject || !matchesUnit) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      (doc.shortTitle && doc.shortTitle.toLowerCase().includes(q)) ||
      (doc.description && doc.description.toLowerCase().includes(q)) ||
      docSubj.toLowerCase().includes(q) ||
      docUnit.toLowerCase().includes(q) ||
      (doc.unitTitle && doc.unitTitle.toLowerCase().includes(q)) ||
      (doc.courseCode && doc.courseCode.toLowerCase().includes(q)) ||
      doc.sections.some(s => s.title.toLowerCase().includes(q) || s.contentMarkdown.toLowerCase().includes(q))
    );
  });

  // Group filtered documents by Subject -> Unit
  const groupedBySubject = allSubjects.reduce<Record<string, Record<string, NoteDocument[]>>>((acc, subj) => {
    const docsInSubj = filteredDocs.filter(d => (d.subject?.trim() || "General Studies") === subj);
    if (docsInSubj.length > 0 || selectedSubjectFilter === "all" || selectedSubjectFilter === subj) {
      acc[subj] = {};
      docsInSubj.forEach(doc => {
        const u = doc.unit?.trim() || "Unit 1";
        if (!acc[subj][u]) {
          acc[subj][u] = [];
        }
        acc[subj][u].push(doc);
      });
    }
    return acc;
  }, {});

  const totalPages = documents.reduce((sum, doc) => sum + (doc.pageCount || doc.sections.length), 0);
  const publishedCount = documents.filter(d => d.isPublished !== false).length;
  const draftCount = documents.filter(d => d.isPublished === false).length;

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-4 sm:p-8 overflow-y-auto min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Teacher Studio Header */}
        <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-amber-950/30 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-xs">
                  <BookOpen className="w-4 h-4 text-purple-400" /> Teacher & Instructor Studio
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium">
                  Subject & Unit Curriculum Manager
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Course Notes Studio
              </h1>
              
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Upload and categorize course materials <strong className="text-amber-400">Subject-wise</strong> and <strong className="text-purple-300">Unit-wise</strong>. Broadcast announcements, manage draft/published visibility, and verify student study materials.
              </p>
            </div>

            {/* Quick Actions Header Buttons */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
              {(onRemoveUpdatedNotes || onRestoreDefaultNotes) && (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-rose-600"
                  title="Remove all updated and uploaded notes, restoring original notes"
                >
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  <span>Remove Updated Notes</span>
                  {documents.filter(d => d.id.startsWith("upload-") || d.id.includes("-copy") || d.id.includes("-merged")).length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold text-[10px]">
                      {documents.filter(d => d.id.startsWith("upload-") || d.id.includes("-copy") || d.id.includes("-merged")).length}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={handleCopyStudentLink}
                className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-slate-600"
                title="Copy direct shareable link for students"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Student Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-slate-400" />
                    <span>Copy Student Link</span>
                  </>
                )}
              </button>

              <button
                onClick={onSwitchToStudent}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md hover:shadow-amber-500/20 cursor-pointer"
                title="Preview the portal exactly as students see it"
              >
                <Eye className="w-4 h-4" />
                <span>View as Student</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Folder className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-bold text-white">{allSubjects.length} Subjects</div>
                <div className="text-slate-400 text-[11px]">{allUnits.length} Units Active</div>
              </div>
            </div>

            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-bold text-white">{publishedCount} Notes</div>
                <div className="text-slate-400 text-[11px]">Published to Students</div>
              </div>
            </div>

            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-bold text-white">{draftCount} Drafts</div>
                <div className="text-slate-400 text-[11px]">Drafts / In-Review</div>
              </div>
            </div>

            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-bold text-white">{totalPages} Pages</div>
                <div className="text-slate-400 text-[11px]">Total Study Content</div>
              </div>
            </div>
          </div>

          {/* ChromaDB Cloud Vector Database Status Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <Database className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-200">ChromaDB Cloud:</span>
                <span className="font-mono text-purple-300 bg-purple-950/50 px-2 py-0.5 rounded-md border border-purple-800/40 text-[11px]">
                  {chromaStatus?.database || "rag-notes-application1"}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {chromaStatus?.connected ? `Connected (${chromaStatus.vectorCount} Vector Chunks)` : "Connected (Chroma Cloud)"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {chromaSyncMsg && (
                <span className="text-[11px] text-emerald-400 font-medium bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/40 animate-fadeIn">
                  {chromaSyncMsg}
                </span>
              )}
              <button
                onClick={handleSyncChroma}
                disabled={isSyncingChroma}
                className="px-3 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 font-semibold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Synchronize all notes into ChromaDB Cloud vector database"
              >
                <RefreshCw className={`w-3 h-3 text-purple-400 ${isSyncingChroma ? "animate-spin" : ""}`} />
                <span>{isSyncingChroma ? "Syncing..." : "Sync ChromaDB Vectors"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Upload Studio Card (Drag & Drop + Subject/Unit Form) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-400" /> Upload Course Material (PDF, DOCX, PPT)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload PDF lecture notes, Word documents (.docx, .doc), PowerPoint presentations (.pptx, .ppt), code, or markdown with automatic slide/page extraction.
              </p>
            </div>

            {/* Quick Sample Note Loaders */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 mr-1">Quick Sample:</span>
              <button
                onClick={() => onLoadSampleDocument("pdf")}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-red-300 hover:text-red-200 text-xs font-semibold border border-red-900/40 transition-colors cursor-pointer"
                title="Test with PDF Whitepaper"
              >
                + PDF Notes
              </button>
              <button
                onClick={() => onLoadSampleDocument("docx")}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-blue-200 text-xs font-semibold border border-blue-900/40 transition-colors cursor-pointer"
                title="Test with Word Document (.docx)"
              >
                + Word (.docx)
              </button>
              <button
                onClick={() => onLoadSampleDocument("pptx")}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs font-semibold border border-amber-900/40 transition-colors cursor-pointer"
                title="Test with PowerPoint Slide Deck (.pptx)"
              >
                + Slide Deck (.pptx)
              </button>
              <button
                onClick={() => onLoadSampleDocument("code")}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 text-xs font-semibold border border-emerald-900/40 transition-colors cursor-pointer"
              >
                + Code (.py)
              </button>
            </div>
          </div>

          {/* Upload Drop Zone & Form Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left: Drag & Drop Dropzone (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.py,.js,.json,.html"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 relative min-h-[240px] ${
                  dragActive
                    ? "border-amber-500 bg-amber-500/10 scale-[1.01]"
                    : selectedFile
                    ? "border-emerald-500/60 bg-emerald-950/20"
                    : "border-slate-700 hover:border-amber-500/60 bg-slate-950/50 hover:bg-slate-900"
                }`}
              >
                <div className={`p-3.5 rounded-2xl ${
                  selectedFile 
                    ? "bg-emerald-500/20 text-emerald-400" 
                    : "bg-amber-500/10 text-amber-400"
                }`}>
                  {selectedFile ? <CheckCircle2 className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white truncate max-w-[240px]">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-emerald-400 font-medium">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready to parse & index
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-[11px] text-rose-400 hover:underline pt-1"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white">
                      Drag & drop note file, or <span className="text-amber-400">browse</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      PDF, Word (.docx, .doc), PowerPoint (.pptx, .ppt), Code (Max 100MB)
                    </div>
                  </div>
                )}
              </div>

              {/* Supported Format Badges */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-2 text-center">
                  <div className="text-[11px] font-bold text-red-300">PDF</div>
                  <div className="text-[9px] text-slate-400">.pdf docs</div>
                </div>
                <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-2 text-center">
                  <div className="text-[11px] font-bold text-blue-300">Word</div>
                  <div className="text-[9px] text-slate-400">.docx / .doc</div>
                </div>
                <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl p-2 text-center">
                  <div className="text-[11px] font-bold text-amber-300">PowerPoint</div>
                  <div className="text-[9px] text-slate-400">.pptx / .ppt</div>
                </div>
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            {/* Right: Subject, Unit & Metadata Settings (7 cols) */}
            <div className="lg:col-span-7 space-y-4 bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" /> Subject & Unit Classification
                </h3>
                <span className="text-[11px] text-amber-400 font-mono">
                  {effectiveSubject} • {effectiveUnit}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* 1. Document Title */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. EC2 Virtual Servers & Database Architecture"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* 2. Subject / Course (Direct text input) */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Subject / Course Name
                  </label>
                  <input
                    type="text"
                    list="existing-subjects-list"
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    placeholder="Type subject (e.g. Operating Systems, Cloud Computing)..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {allSubjects.length > 0 && (
                    <datalist id="existing-subjects-list">
                      {allSubjects.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  )}
                </div>

                {/* 3. Unit Organization */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Unit / Module Name
                  </label>
                  <input
                    type="text"
                    list="existing-units-list"
                    value={unitInput}
                    onChange={(e) => setUnitInput(e.target.value)}
                    placeholder="e.g. Unit 1, Module 2, Lab Manual"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <datalist id="existing-units-list">
                    <option value="Unit 1" />
                    <option value="Unit 2" />
                    <option value="Unit 3" />
                    <option value="Unit 4" />
                    <option value="Unit 5" />
                    <option value="Unit 6" />
                    <option value="Lab Manual" />
                    {allUnits.filter(u => !["Unit 1","Unit 2","Unit 3","Unit 4","Unit 5","Unit 6","Lab Manual"].includes(u)).map(u => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>

                {/* 4. Unit Topic Subtitle */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Unit Topic / Chapter Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={unitTitleInput}
                    onChange={(e) => setUnitTitleInput(e.target.value)}
                    placeholder="e.g. Compute Services & IaaS Deployments"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* 5. Course Code */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Course Code / Semester (Optional)
                  </label>
                  <input
                    type="text"
                    value={courseCodeInput}
                    onChange={(e) => setCourseCodeInput(e.target.value)}
                    placeholder="e.g. MCA-204 or CS-301"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* 6. Instructor Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Instructor Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    placeholder="e.g. Prof. Alan or Dr. Sharma"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* 7. Visibility */}
                <div className="flex flex-col justify-end">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Student Visibility
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPublishedOnUpload(!isPublishedOnUpload)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isPublishedOnUpload
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                        : "bg-slate-800 border-slate-700 text-slate-400"
                    }`}
                  >
                    {isPublishedOnUpload ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>🟢 Published (Visible to Students)</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>🟡 Save as Draft (Hidden)</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* Upload Button */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400 hidden sm:block">
                  Destination: <span className="text-white font-medium">{effectiveSubject}</span> &gt; <span className="text-amber-400 font-medium">{effectiveUnit}</span>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteUpload}
                  disabled={!selectedFile || isUploading}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                    !selectedFile || isUploading
                      ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-amber-500/20"
                  }`}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Parsing & Indexing into {effectiveUnit}...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload to {effectiveUnit}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Teacher Class Announcements & Notice Board */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" /> Course Announcements & Exam Alerts
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Broadcast reading reminders and unit exam alerts directly to students.
              </p>
            </div>

            <button
              onClick={() => setShowAnnounceForm(!showAnnounceForm)}
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAnnounceForm ? "Cancel Notice" : "+ New Announcement"}</span>
            </button>
          </div>

          {/* Announcement Creation Form */}
          {showAnnounceForm && (
            <form onSubmit={handlePostAnnouncement} className="bg-slate-950/70 border border-purple-500/30 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Announcement Headline
                  </label>
                  <input
                    type="text"
                    required
                    value={newAnnTitle}
                    onChange={(e) => setNewAnnTitle(e.target.value)}
                    placeholder="e.g. Unit 2 Exam Alert: Para-Virtualization vs Full Virtualization"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Link to Course Note (Optional)
                  </label>
                  <select
                    value={newAnnRelatedDoc}
                    onChange={(e) => setNewAnnRelatedDoc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">-- No Note Linked --</option>
                    {(documents || []).map(d => (
                      <option key={d.id} value={d.id}>
                        [{d.unit || "Unit 1"}] {d.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Message Content
                </label>
                <textarea
                  required
                  rows={2}
                  value={newAnnContent}
                  onChange={(e) => setNewAnnContent(e.target.value)}
                  placeholder="e.g. Please review Page 2 of Virtualization Concepts before Thursday's lecture."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAnnImportant}
                    onChange={(e) => setNewAnnImportant(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Mark as High-Priority / Highlighted Alert</span>
                </label>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  Post Announcement
                </button>
              </div>
            </form>
          )}

          {/* Active Announcements List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {(announcements || []).map((ann) => (
              <div 
                key={ann.id}
                className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {ann.important && <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {ann.title}
                    </h4>
                    <button
                      onClick={() => onDeleteAnnouncement(ann.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Delete announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{ann.content}</p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                  <span>By {ann.author} • {ann.date}</span>
                  {ann.relatedDocTitle && (
                    <span className="text-amber-400 font-medium truncate max-w-[140px]">
                      Linked: {ann.relatedDocTitle}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Course Notes Library: Subject & Unit Manager */}
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-amber-400" /> Course Notes Library ({filteredDocs.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Organized Subject-wise and Unit-wise. Toggle visibility, edit metadata, duplicate, reorder units, or merge notes.
              </p>
            </div>

            {/* View Mode Switcher + Merge + Search */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Layout Switcher */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center gap-1">
                <button
                  onClick={() => setViewLayout("curriculum")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewLayout === "curriculum"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Curriculum Unit View (Grouped by Subject & Unit)"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Curriculum View</span>
                </button>
                <button
                  onClick={() => setViewLayout("grid")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewLayout === "grid"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="All Notes Flat Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid View</span>
                </button>
              </div>

              {/* Merge Toggle Button */}
              <button
                onClick={() => {
                  setIsMergeMode(!isMergeMode);
                  setSelectedForMerge([]);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isMergeMode
                    ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
                }`}
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>{isMergeMode ? "Cancel Merge" : "Merge Notes"}</span>
              </button>

              {documents.length > 0 && (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border-rose-800/60"
                  title="Clear all uploaded documents from the portal"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Clear All Files ({documents.length})</span>
                </button>
              )}

              {/* Search Bar */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search subject, unit, topic..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Merge Toolbar (when active) */}
          {isMergeMode && (
            <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="space-y-1">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <GitMerge className="w-4 h-4" /> Multi-Note Merge Mode
                </div>
                <div className="text-xs text-slate-300">
                  Selected {selectedForMerge.length} documents to combine into one comprehensive course master guide.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={mergedGuideTitle}
                  onChange={(e) => setMergedGuideTitle(e.target.value)}
                  placeholder="Merged Guide Title"
                  className="bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none w-60"
                />
                <button
                  onClick={handleExecuteMerge}
                  disabled={selectedForMerge.length < 2}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedForMerge.length < 2
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md"
                  }`}
                >
                  Merge Now
                </button>
              </div>
            </div>
          )}

          {/* Filter Bar: Subject & Unit Filters */}
          <div className="space-y-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5">
            {/* Row 1: Subject Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-purple-400" /> Subject:
              </span>
              <button
                onClick={() => setSelectedSubjectFilter("all")}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedSubjectFilter === "all"
                    ? "bg-purple-600 text-white font-bold shadow-sm"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                All Subjects ({documents.length})
              </button>
              {allSubjects.map((subj) => {
                const count = documents.filter(d => (d.subject?.trim() || "General Studies") === subj).length;
                return (
                  <button
                    key={subj}
                    onClick={() => setSelectedSubjectFilter(subj)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      selectedSubjectFilter === subj
                        ? "bg-purple-600 text-white font-bold shadow-sm"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {subj} ({count})
                  </button>
                );
              })}
            </div>

            {/* Row 2: Unit Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pt-1 border-t border-slate-800/60 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                <BookMarked className="w-3.5 h-3.5 text-amber-400" /> Unit:
              </span>
              <button
                onClick={() => setSelectedUnitFilter("all")}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedUnitFilter === "all"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                All Units
              </button>
              {allUnits.map((u) => {
                const count = documents.filter(d => (d.unit?.trim() || "Unit 1") === u).length;
                return (
                  <button
                    key={u}
                    onClick={() => setSelectedUnitFilter(u)}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      selectedUnitFilter === u
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {u} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* VIEW 1: CURRICULUM VIEW (Organized Hierarchically Subject -> Unit) */}
          {viewLayout === "curriculum" ? (
            <div className="space-y-6">
              {Object.keys(groupedBySubject).length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <Folder className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="text-base font-bold text-white">No notes matching your filters</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Try clearing the search query or selecting "All Subjects" and "All Units".
                  </p>
                </div>
              ) : (
                Object.entries(groupedBySubject).map(([subjectName, unitsMap]) => {
                  const subjectDocCount = Object.values(unitsMap).reduce((sum, list) => sum + list.length, 0);
                  const isCollapsed = !!collapsedSubjects[subjectName];

                  return (
                    <div 
                      key={subjectName}
                      className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-lg"
                    >
                      {/* Subject Section Header Banner */}
                      <div 
                        onClick={() => toggleSubjectCollapse(subjectName)}
                        className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors select-none"
                      >
                        <div className="flex items-center gap-3">
                          <button className="p-1 rounded-lg bg-slate-800 text-slate-300">
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
                                {subjectName}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                ({subjectDocCount} {subjectDocCount === 1 ? "Note" : "Notes"} across {Object.keys(unitsMap).length} {Object.keys(unitsMap).length === 1 ? "Unit" : "Units"})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Subject Quick Add Shortcut */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handlePresetUploadForSubjectAndUnit(subjectName, "Unit 1")}
                            className="px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                            title={`Upload note directly to ${subjectName}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add to {subjectName}</span>
                          </button>
                        </div>
                      </div>

                      {/* Units within Subject */}
                      {!isCollapsed && (
                        <div className="p-4 sm:p-6 space-y-6">
                          {Object.entries(unitsMap).map(([unitName, unitDocs]) => (
                            <div key={unitName} className="space-y-3">
                              {/* Unit Sub-Header */}
                              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-extrabold flex items-center gap-1.5">
                                    <BookMarked className="w-3.5 h-3.5" />
                                    {unitName}
                                  </span>
                                  {unitDocs[0]?.unitTitle && (
                                    <span className="text-xs font-semibold text-slate-200">
                                      {unitDocs[0].unitTitle}
                                    </span>
                                  )}
                                  <span className="text-[11px] text-slate-500 font-mono">
                                    ({unitDocs.length} {unitDocs.length === 1 ? "Note" : "Notes"})
                                  </span>
                                </div>

                                <div className="flex items-center gap-2.5">
                                  <button
                                    onClick={() => onSelectDocument(`all-unit-${unitName}`)}
                                    className="px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                    title={`View all ${unitName} notes in combined sequence`}
                                  >
                                    <Layers className="w-3 h-3 text-amber-400" />
                                    <span>All {unitName} Notes</span>
                                  </button>

                                  <button
                                    onClick={() => handlePresetUploadForSubjectAndUnit(subjectName, unitName)}
                                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer hover:underline"
                                  >
                                    <Plus className="w-3 h-3" /> Add to {unitName}
                                  </button>
                                </div>
                              </div>

                              {/* Unit Notes Cards Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {unitDocs.map((doc) => {
                                  const isUserUploaded = doc.id.startsWith("upload-");
                                  const isPublished = doc.isPublished !== false;
                                  const isSelectedForMerge = selectedForMerge.includes(doc.id);

                                  return (
                                    <div
                                      key={doc.id}
                                      className={`bg-slate-950/70 border rounded-2xl p-4 sm:p-5 transition-all flex flex-col justify-between gap-3.5 relative group ${
                                        isSelectedForMerge
                                          ? "border-amber-500 bg-amber-950/20"
                                          : isPublished
                                          ? "border-slate-800 hover:border-purple-500/50"
                                          : "border-slate-800/80 bg-slate-950/90 opacity-80"
                                      }`}
                                    >
                                      <div className="space-y-2.5">
                                        {/* Top Card Row */}
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            {isMergeMode && (
                                              <input
                                                type="checkbox"
                                                checked={isSelectedForMerge}
                                                onChange={() => handleToggleMergeDoc(doc.id)}
                                                className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer mr-1"
                                              />
                                            )}
                                            
                                            {/* Format Badge */}
                                            {getDocFormatBadge(doc)}

                                            {/* Subject Badge */}
                                            <span className="px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                                              {doc.subject?.trim() || "General Studies"}
                                            </span>

                                            {/* Quick Unit Reassign Pill */}
                                            <div className="relative group/unit">
                                              <select
                                                value={doc.unit || "Unit 1"}
                                                onChange={(e) => handleQuickMoveUnit(doc, e.target.value)}
                                                className="bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold rounded-lg px-2 py-0.5 focus:outline-none focus:border-amber-400 cursor-pointer appearance-none pr-5"
                                                title="Quick change Unit"
                                              >
                                                {["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6", "Lab Manual", ...allUnits.filter(u => !["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5", "Unit 6", "Lab Manual"].includes(u))].map(u => (
                                                  <option key={u} value={u} className="bg-slate-900 text-white">{u}</option>
                                                ))}
                                              </select>
                                              <ChevronDown className="w-3 h-3 text-amber-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            </div>

                                            {doc.courseCode && (
                                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                                {doc.courseCode}
                                              </span>
                                            )}
                                          </div>

                                          {/* Publish / Draft Toggle Badge */}
                                          <button
                                            onClick={() => onTogglePublishDocument(doc.id)}
                                            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                                              isPublished
                                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30"
                                                : "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                                            }`}
                                            title="Click to toggle visibility for students"
                                          >
                                            {isPublished ? (
                                              <>
                                                <Eye className="w-3 h-3" />
                                                <span>Published</span>
                                              </>
                                            ) : (
                                              <>
                                                <EyeOff className="w-3 h-3" />
                                                <span>Draft (Hidden)</span>
                                              </>
                                            )}
                                          </button>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-2">
                                          {doc.title}
                                        </h3>

                                        {/* Description */}
                                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                          {doc.description || "Course study document formatted for student reading and AI Q&A."}
                                        </p>

                                        {/* Metadata */}
                                        <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-mono pt-1">
                                          <span>{doc.pageCount || doc.sections.length} Pages</span>
                                          <span>•</span>
                                          <span>By {doc.uploadedBy || "Instructor"}</span>
                                          <span>•</span>
                                          <span>{doc.uploadedAt || "Published"}</span>
                                        </div>
                                      </div>

                                      {/* Bottom Teacher Action Bar */}
                                      <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs flex-wrap">
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => handleOpenEdit(doc)}
                                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                            title="Edit Subject, Unit & Title"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => onDuplicateDocument(doc.id)}
                                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                            title="Duplicate Note"
                                          >
                                            <Copy className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => onDeleteDocument(doc.id)}
                                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                            title="Delete Note"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={() => onSelectDocument(doc.id, true)}
                                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                          >
                                            <Sparkles className="w-3 h-3 text-amber-400" />
                                            <span>AI Tutor</span>
                                          </button>
                                          <button
                                            onClick={() => onSelectDocument(doc.id, false)}
                                            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                                          >
                                            <span>Open Reader</span>
                                            <ArrowRight className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* VIEW 2: FLAT GRID VIEW */
            filteredDocs.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white">No Course Notes in Library</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    {documents.length === 0 
                      ? "Your library is clean and ready. Upload your first PDF, Word (.docx), PowerPoint (.pptx), or Code file using the upload section above."
                      : "No notes match your current search query. Try adjusting your search."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDocs.map((doc) => {
                const isPublished = doc.isPublished !== false;
                const isSelectedForMerge = selectedForMerge.includes(doc.id);

                return (
                  <div
                    key={doc.id}
                    className={`bg-slate-900/90 border rounded-2xl p-5 transition-all flex flex-col justify-between gap-4 relative group ${
                      isSelectedForMerge
                        ? "border-amber-500 bg-amber-950/20"
                        : isPublished
                        ? "border-slate-800 hover:border-purple-500/50"
                        : "border-slate-800/80 bg-slate-950/80 opacity-80"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Row: Subject + Unit + Visibility Toggle */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isMergeMode && (
                            <input
                              type="checkbox"
                              checked={isSelectedForMerge}
                              onChange={() => handleToggleMergeDoc(doc.id)}
                              className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                            />
                          )}
                          {getDocFormatBadge(doc)}
                          <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[11px] font-bold">
                            {doc.subject?.trim() || "General Studies"}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                            {doc.unit?.trim() || "Unit 1"}
                          </span>
                        </div>

                        {/* Publish / Draft Toggle Badge */}
                        <button
                          onClick={() => onTogglePublishDocument(doc.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                            isPublished
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30"
                              : "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                          }`}
                          title="Click to toggle visibility for students"
                        >
                          {isPublished ? (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>Published</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>Draft</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                        {doc.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {doc.description || "Course study document formatted for student reading and AI Q&A."}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>{doc.pageCount || doc.sections.length} Pages</span>
                        <span>•</span>
                        <span>By {doc.uploadedBy || "Instructor"}</span>
                        {doc.courseCode && (
                          <>
                            <span>•</span>
                            <span>{doc.courseCode}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bottom Teacher Action Bar */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(doc)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit Subject, Unit & Title"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDuplicateDocument(doc.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Duplicate Note"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteDocument(doc.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectDocument(doc.id, true)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>AI Tutor</span>
                        </button>
                        <button
                          onClick={() => onSelectDocument(doc.id, false)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                        >
                          <span>Open Reader</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

        </div>

      </div>

      {/* Edit Metadata Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" /> Edit Subject, Unit & Note Details
              </h3>
              <button
                onClick={() => setEditingDoc(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Subject / Course
                  </label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="e.g. AWS Cloud & Labs"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Unit / Module
                  </label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    placeholder="e.g. Unit 1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Unit Topic Title
                  </label>
                  <input
                    type="text"
                    value={editUnitTitle}
                    onChange={(e) => setEditUnitTitle(e.target.value)}
                    placeholder="e.g. Cloud Fundamentals"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Course Code
                  </label>
                  <input
                    type="text"
                    value={editCourseCode}
                    onChange={(e) => setEditCourseCode(e.target.value)}
                    placeholder="e.g. MCA-204"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Description / Summary
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Files Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Clear All Files?</h3>
                <p className="text-xs text-slate-400">
                  This will remove all {documents.length} document{documents.length === 1 ? "" : "s"} and vector indexes from the portal so you can start completely fresh.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Total Documents to Clear:</span>
                <span className="font-bold text-rose-400">{documents.length}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onRemoveUpdatedNotes) onRemoveUpdatedNotes();
                  else if (onRestoreDefaultNotes) onRestoreDefaultNotes();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm & Delete All</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
