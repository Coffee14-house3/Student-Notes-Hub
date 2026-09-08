import React, { useState } from "react";
import { 
  BookOpen, Search, Sparkles, HelpCircle, ArrowRight, FileText, 
  Layers, CheckCircle2, Bookmark, Download, ExternalLink,
  GraduationCap, Bell, Filter, Tag, Calendar, User, Eye,
  Share2, Check, Clock, Laptop, Shield, Cpu, Server, Database,
  ArrowUpRight, AlertCircle, Copy, Folder, BookMarked, LayoutGrid,
  ChevronDown, ChevronRight
} from "lucide-react";
import { NoteDocument, CourseAnnouncement } from "../types";

interface Props {
  documents: NoteDocument[];
  announcements: CourseAnnouncement[];
  onSelectDocument: (docId: string, openAiChat?: boolean) => void;
  onOpenQuiz: (docId?: string) => void;
  onOpenSearch: () => void;
  onOpenAiTutor?: () => void;
  isStandalone?: boolean;
}

export const StudentPortal: React.FC<Props> = ({
  documents,
  announcements,
  onSelectDocument,
  onOpenQuiz,
  onOpenSearch,
  onOpenAiTutor,
  isStandalone = false
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [viewLayout, setViewLayout] = useState<"curriculum" | "grid">("curriculum");
  const [collapsedSubjects, setCollapsedSubjects] = useState<Record<string, boolean>>({});
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Filter only published documents for students
  const publishedDocs = (documents || []).filter(d => d.isPublished !== false);

  // Extract unique subjects
  const subjects: string[] = Array.from(
    new Set<string>(
      publishedDocs.map(d => d.subject?.trim()).filter((s): s is string => Boolean(s))
    )
  );

  // Extract unique units
  const units: string[] = Array.from(
    new Set<string>(
      publishedDocs.map(d => d.unit?.trim()).filter((u): u is string => Boolean(u))
    )
  ).sort();

  const filteredDocs = publishedDocs.filter((doc) => {
    const docSubj = doc.subject?.trim() || "General Studies";
    const docUnit = doc.unit?.trim() || "Unit 1";

    const matchesSubject = selectedSubject === "all" || docSubj === selectedSubject;
    const matchesUnit = selectedUnit === "all" || docUnit === selectedUnit;
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
      (doc.tags && doc.tags.some(t => t.toLowerCase().includes(q))) ||
      doc.sections.some(s => s.title.toLowerCase().includes(q) || s.contentMarkdown.toLowerCase().includes(q))
    );
  });

  // Group filtered documents by Subject -> Unit for Curriculum View
  const groupedBySubject = subjects.reduce<Record<string, Record<string, NoteDocument[]>>>((acc, subj) => {
    const docsInSubj = filteredDocs.filter(d => (d.subject?.trim() || "General Studies") === subj);
    if (docsInSubj.length > 0 || selectedSubject === "all" || selectedSubject === subj) {
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

  const totalPages = publishedDocs.reduce((acc, d) => acc + (d.pageCount || d.sections.length), 0);
  const totalSections = publishedDocs.reduce((acc, d) => acc + d.sections.length, 0);

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

  const getSubjectIcon = (subj?: string) => {
    const s = (subj || "").toLowerCase();
    if (s.includes("security") || s.includes("iam")) return <Shield className="w-4 h-4 text-emerald-400" />;
    if (s.includes("virtualization") || s.includes("hypervisor")) return <Cpu className="w-4 h-4 text-purple-400" />;
    if (s.includes("data center") || s.includes("hardware")) return <Server className="w-4 h-4 text-sky-400" />;
    if (s.includes("database") || s.includes("storage")) return <Database className="w-4 h-4 text-rose-400" />;
    return <Laptop className="w-4 h-4 text-amber-400" />;
  };

  const getDocFormatBadge = (doc: NoteDocument) => {
    const name = doc.title.toLowerCase();
    const isPpt = doc.fileFormat === "pptx" || doc.fileFormat === "ppt" || name.endsWith(".pptx") || name.endsWith(".ppt") || doc.tags?.includes("PPTX") || doc.tags?.includes("PowerPoint");
    const isDocx = doc.fileFormat === "docx" || doc.fileFormat === "doc" || name.endsWith(".docx") || name.endsWith(".doc") || doc.tags?.includes("DOCX") || doc.tags?.includes("Word");
    const isPdf = doc.fileFormat === "pdf" || name.endsWith(".pdf") || doc.pdfUrl || doc.tags?.includes("PDF") || doc.tags?.includes("Whitepaper");
    const isCode = doc.fileFormat === "code" || /\.(py|js|ts|json)$/i.test(name) || doc.tags?.includes("Lambda");

    if (isPpt) {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
          PPTX • Slides
        </span>
      );
    }
    if (isDocx) {
      return (
        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
          DOCX • Word
        </span>
      );
    }
    if (isPdf) {
      return (
        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
          PDF • Notes
        </span>
      );
    }
    if (isCode) {
      return (
        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
          Code • Script
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
        Document
      </span>
    );
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-4 sm:p-8 overflow-y-auto min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Student Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-xs">
                  <GraduationCap className="w-4 h-4" /> Student Notes Hub
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Organized Subject & Unit Wise
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Course Notes & Study Portal
              </h1>
              
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Browse verified course materials organized by <strong className="text-amber-400">Subject</strong> and <strong className="text-purple-300">Unit</strong>. Study unit-by-unit with interactive diagrams, take practice quizzes, and get instant answers with the AI Smart Tutor.
              </p>
            </div>

            {/* Quick Action Controls */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
              <button
                onClick={handleCopyStudentLink}
                className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:border-slate-600 shadow-sm"
                title="Copy shareable link to student portal"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-slate-400" />
                    <span>Share Student Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Learning Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-bold text-white">{publishedDocs.length} Notes</div>
                <div className="text-slate-400 text-[11px]">{subjects.length} Subjects • {units.length} Units</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-bold text-white">{totalPages} Pages</div>
                <div className="text-slate-400 text-[11px]">Total Study Material</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-bold text-white">{totalSections} Topics</div>
                <div className="text-slate-400 text-[11px]">Interactive Sections</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-base font-bold text-emerald-400 flex items-center gap-1">
                  Active <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-slate-400 text-[11px]">AI Tutor & RAG Ready</div>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Course Announcements Banner (Notice Board) */}
        {announcements && announcements.length > 0 && (
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Bell className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  Instructor Notice Board & Exam Tips ({announcements.length})
                </h2>
              </div>
              <span className="text-[11px] text-amber-400/80 font-medium">Important Updates</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {(announcements || []).map((ann) => (
                <div 
                  key={ann.id}
                  className={`p-4 rounded-xl border transition-all ${
                    ann.important 
                      ? "bg-amber-950/30 border-amber-500/40 text-slate-200" 
                      : "bg-slate-950/60 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {ann.important && <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {ann.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{ann.date}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{ann.content}</p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" /> By {ann.author}
                    </span>
                    {ann.relatedDocId && (
                      <button
                        onClick={() => onSelectDocument(ann.relatedDocId!)}
                        className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        Open Linked Note <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Subject / Unit Category Filter Section */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" /> Course Notes Library ({filteredDocs.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Organized by subject & syllabus unit for targeted study and exam revision.
              </p>
            </div>

            {/* View Layout Toggle + Search Field */}
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
                  title="Syllabus Unit View (Grouped by Subject & Unit)"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Syllabus View</span>
                </button>
                <button
                  onClick={() => setViewLayout("grid")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewLayout === "grid"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Flat Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid View</span>
                </button>
              </div>

              {/* Search Input Field */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search subject, unit, topic..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-7 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs p-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filter Bar: Subject & Unit Filters */}
          <div className="space-y-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5">
            {/* Row 1: Subject Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-purple-400" /> Subject:
              </span>
              <button
                onClick={() => setSelectedSubject("all")}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedSubject === "all"
                    ? "bg-purple-600 text-white font-bold shadow-sm"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                All Subjects ({publishedDocs.length})
              </button>
              {subjects.map((subj) => {
                const count = publishedDocs.filter(d => (d.subject || "AWS Cloud & Labs") === subj).length;
                return (
                  <button
                    key={subj}
                    onClick={() => setSelectedSubject(subj)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      selectedSubject === subj
                        ? "bg-purple-600 text-white font-bold shadow-sm"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {getSubjectIcon(subj)}
                    <span>{subj}</span>
                    <span className="opacity-75 text-[10px] font-mono">({count})</span>
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
                onClick={() => setSelectedUnit("all")}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedUnit === "all"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                All Units
              </button>
              {units.map((u) => {
                const count = publishedDocs.filter(d => (d.unit || "Unit 1") === u).length;
                return (
                  <button
                    key={u}
                    onClick={() => setSelectedUnit(u)}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      selectedUnit === u
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
        </div>

        {/* VIEW 1: CURRICULUM VIEW (Organized Hierarchically Subject -> Unit) */}
        {viewLayout === "curriculum" ? (
          <div className="space-y-6">
            {publishedDocs.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white">No Course Notes Published Yet</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    No course notes have been published for this curriculum yet. Please check back soon or consult your instructor for updates.
                  </p>
                </div>
              </div>
            ) : Object.keys(groupedBySubject).length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <div className="p-3 bg-slate-800/80 text-slate-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">No matching notes found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Try clearing search filters or selecting "All Subjects" and "All Units".
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSubject("all");
                    setSelectedUnit("all");
                  }}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
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
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5">
                            {getSubjectIcon(subjectName)}
                            {subjectName}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            ({subjectDocCount} {subjectDocCount === 1 ? "Note" : "Notes"} in {Object.keys(unitsMap).length} {Object.keys(unitsMap).length === 1 ? "Unit" : "Units"})
                          </span>
                        </div>
                      </div>

                      <span className="text-xs text-amber-400 font-semibold hidden sm:inline">
                        Click to {isCollapsed ? "expand" : "collapse"}
                      </span>
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

                              <button
                                onClick={() => onSelectDocument(`all-unit-${unitName}`)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title={`Open all ${unitDocs.length} notes in ${unitName} in combined view`}
                              >
                                <Layers className="w-3.5 h-3.5 text-amber-400" />
                                <span>All {unitName} Notes ({unitDocs.length})</span>
                              </button>
                            </div>

                            {/* Unit Notes Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {unitDocs.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="bg-slate-950/70 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-4 sm:p-5 transition-all flex flex-col justify-between gap-3.5 group hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-0.5"
                                >
                                  <div className="space-y-2.5">
                                    {/* Card Badges Top */}
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {getDocFormatBadge(doc)}
                                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                          {doc.unit || "Unit 1"}
                                        </span>
                                        {doc.courseCode && (
                                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                            {doc.courseCode}
                                          </span>
                                        )}
                                      </div>

                                      <span className="text-[10px] text-slate-400 font-mono bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700/60">
                                        {doc.pageCount || doc.sections.length} {(doc.pageCount || doc.sections.length) === 1 ? (doc.fileFormat === "pptx" || doc.fileFormat === "ppt" ? "Slide" : "Page") : (doc.fileFormat === "pptx" || doc.fileFormat === "ppt" ? "Slides" : "Pages")}
                                      </span>
                                    </div>

                                    {/* Note Title */}
                                    <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                                      {doc.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                      {doc.description || "Comprehensive lecture notes and study material covering key architecture concepts."}
                                    </p>

                                    {/* Metadata */}
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5 font-mono">
                                      <span>By {doc.uploadedBy || "Instructor"}</span>
                                    </div>
                                  </div>

                                  {/* Card Bottom Actions */}
                                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                                    <button
                                      onClick={() => onOpenQuiz(doc.id)}
                                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 font-bold transition-all flex items-center gap-1 text-xs border border-amber-500/20 cursor-pointer"
                                      title={`Take interactive quiz on ${doc.shortTitle || doc.title}`}
                                    >
                                      <HelpCircle className="w-3.5 h-3.5" /> Quiz
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => onSelectDocument(doc.id, true)}
                                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 transition-all flex items-center gap-1 font-semibold text-xs border border-slate-700 cursor-pointer"
                                        title="Ask AI questions about this specific note"
                                      >
                                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Ask AI
                                      </button>

                                      <button
                                        onClick={() => onSelectDocument(doc.id, false)}
                                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all flex items-center gap-1 text-xs shadow-sm cursor-pointer"
                                        title="Open interactive reader mode"
                                      >
                                        <span>Read</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
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
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white">No Course Notes Available</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  {publishedDocs.length === 0 
                    ? "No notes have been uploaded yet. Upload course materials in the Teacher Portal to get started."
                    : "No notes match your current search or filter criteria. Try resetting filters."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-5 transition-all flex flex-col justify-between gap-4 group hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-0.5 relative"
              >
                <div className="space-y-3">
                  {/* Card Badges Top */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getDocFormatBadge(doc)}
                      <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[11px] font-bold flex items-center gap-1">
                        {getSubjectIcon(doc.subject)}
                        <span>{doc.subject || "AWS Cloud"}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                        {doc.unit || "Unit 1"}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700/60">
                      {doc.pageCount || doc.sections.length} {(doc.pageCount || doc.sections.length) === 1 ? (doc.fileFormat === "pptx" || doc.fileFormat === "ppt" ? "Slide" : "Page") : (doc.fileFormat === "pptx" || doc.fileFormat === "ppt" ? "Slides" : "Pages")}
                    </span>
                  </div>

                  {/* Note Title */}
                  <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                    {doc.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {doc.description || "Comprehensive lecture notes and study material covering key architecture concepts."}
                  </p>

                  {/* Metadata tags */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {doc.uploadedBy || "Instructor"}
                    </span>
                    {doc.courseCode && (
                      <>
                        <span>•</span>
                        <span className="uppercase">{doc.courseCode}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => onOpenQuiz(doc.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 font-bold transition-all flex items-center gap-1 text-xs border border-amber-500/20 cursor-pointer"
                    title={`Take interactive quiz on ${doc.shortTitle || doc.title}`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Quiz
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectDocument(doc.id, true)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 transition-all flex items-center gap-1 font-semibold text-xs border border-slate-700 cursor-pointer"
                      title="Ask AI questions about this specific note"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Ask AI
                    </button>

                    <button
                      onClick={() => onSelectDocument(doc.id, false)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all flex items-center gap-1 text-xs shadow-sm cursor-pointer"
                      title="Open interactive reader mode"
                    >
                      <span>Read</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Student Portal Footer */}
        <div className="pt-12 pb-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-amber-500" />
            <span>Student Notes Hub — Verified Course Materials</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 text-[11px]">
            <span>Interactive RAG Tutor Active</span>
            <span>•</span>
            <span>Self-Paced Practice Quiz</span>
          </div>
        </div>

      </div>
    </div>
  );
};
