import React, { useState } from "react";
import { 
  BookOpen, HelpCircle, Search, 
  Tag, Clock, ChevronRight, Layers, FileText, ArrowRight,
  GraduationCap, Bell, ArrowUpRight, Award, Folder, RefreshCw, CheckCircle2, Upload
} from "lucide-react";
import { NoteDocument, CourseAnnouncement } from "../types";

interface Props {
  documents: NoteDocument[];
  announcements?: CourseAnnouncement[];
  onSelectDocument: (docId: string, openAiChat?: boolean) => void;
  onOpenQuiz: (docId?: string) => void;
  onOpenSearch: () => void;
  onOpenAiTutor?: () => void;
  isStandalone?: boolean;
  onSyncWithTeacher?: () => Promise<void> | void;
  onSwitchPortal?: (mode: "student" | "teacher") => void;
  isSyncing?: boolean;
  syncStatus?: string | null;
}

export const StudentPortal: React.FC<Props> = ({
  documents,
  announcements = [],
  onSelectDocument,
  onOpenQuiz,
  onOpenSearch,
  onOpenAiTutor,
  isStandalone = false,
  onSyncWithTeacher,
  onSwitchPortal,
  isSyncing = false,
  syncStatus = null
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>("all");

  // Filter only published documents for students
  const publishedDocs = (documents || []).filter((doc) => doc.isPublished !== false);

  // Extract distinct subjects
  const availableSubjects = Array.from(
    new Set(publishedDocs.map((d) => d.subject).filter(Boolean))
  ) as string[];

  // Extract distinct units
  const availableUnits = Array.from(
    new Set(
      publishedDocs
        .map((d) => d.unit || (d.unitNumber ? `Unit ${d.unitNumber}` : undefined))
        .filter(Boolean)
    )
  ) as string[];

  // Filter documents
  const filteredDocs = publishedDocs.filter((doc) => {
    const matchesSubject =
      selectedSubjectFilter === "all" || doc.subject === selectedSubjectFilter;
    const docUnit = doc.unit || (doc.unitNumber ? `Unit ${doc.unitNumber}` : "");
    const matchesUnit =
      selectedUnitFilter === "all" || docUnit === selectedUnitFilter;
    const matchesSearch =
      searchQuery.trim() === "" ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.shortTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.tags && doc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesSubject && matchesUnit && matchesSearch;
  });

  // Group filtered documents by Subject
  const groupedBySubject = filteredDocs.reduce((acc, doc) => {
    const subj = doc.subject || "General Course Materials";
    if (!acc[subj]) acc[subj] = [];
    acc[subj].push(doc);
    return acc;
  }, {} as Record<string, NoteDocument[]>);

  // Calculate total pages / reading items
  const totalPages = publishedDocs.reduce((sum, d) => sum + (d.pageCount || d.sections?.length || 1), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Top Banner / Hero */}
      <div className="border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student Notes Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Course Materials & Study Hub
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
                Browse verified course notes uploaded by your instructor. Read materials and practice interactive quizzes.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {onSyncWithTeacher && (
                <button
                  onClick={() => onSyncWithTeacher()}
                  disabled={isSyncing}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-amber-500/50 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  title="Sync and refresh notes from the instructor portal"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>{isSyncing ? "Syncing..." : "Sync Notes"}</span>
                </button>
              )}

              <button
                onClick={() => onOpenQuiz()}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:border-amber-500/50"
                title="Practice with interactive quizzes"
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Practice Quiz</span>
              </button>

              {syncStatus && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium animate-fadeIn">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {syncStatus}
                </span>
              )}
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, keywords, services, concepts..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Subject Filter */}
            {availableSubjects.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">All Subjects ({availableSubjects.length})</option>
                  {availableSubjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Unit Filter */}
            {availableUnits.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedUnitFilter}
                  onChange={(e) => setSelectedUnitFilter(e.target.value)}
                  className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">All Units ({availableUnits.length})</option>
                  {availableUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Metrics */}
            <div className="hidden lg:flex items-center gap-4 text-xs text-slate-400 px-3 py-2 bg-slate-900/40 rounded-xl border border-slate-800/60">
              <span>{publishedDocs.length} Documents</span>
              <span>•</span>
              <span>{totalPages} Pages</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Course Announcements (if any) */}
        {announcements && announcements.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Bell className="w-3.5 h-3.5" />
              <span>Instructor Announcements</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(announcements || []).map((ann) => (
                <div
                  key={ann.id}
                  className="p-4 bg-slate-900/80 border border-amber-500/20 rounded-2xl relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-100">{ann.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{ann.content}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">{ann.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes Grid by Subject */}
        {publishedDocs.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto my-12">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
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
            <p className="text-sm text-slate-400">No documents match the filter "{searchQuery}".</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedSubjectFilter("all");
                setSelectedUnitFilter("all");
              }}
              className="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs hover:bg-slate-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          (Object.entries(groupedBySubject) as [string, NoteDocument[]][]).map(([subject, docs]) => (
            <div key={subject} className="space-y-4">
              {/* Subject Section Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h2 className="text-base sm:text-lg font-bold text-white">{subject}</h2>
                  <span className="text-xs text-slate-500 font-medium">({docs.length} notes)</span>
                </div>
              </div>

              {/* Subject Notes Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 hover:border-amber-500/50 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-amber-500/5"
                  >
                    <div className="space-y-3">
                      {/* Card Header & Unit Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-slate-800 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          {(doc.unit || doc.unitNumber) && (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
                              {doc.unit || `Unit ${doc.unitNumber}`}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {doc.pageCount || doc.sections?.length || 1} pages
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="font-bold text-sm text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-2">
                          {doc.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-3 leading-relaxed">
                          {doc.description}
                        </p>
                      </div>

                      {/* Tags */}
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {doc.tags.slice(0, 3).map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-400 border border-slate-800"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onOpenQuiz(doc.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Take practice quiz for this note"
                      >
                        <HelpCircle className="w-3 h-3 text-amber-400" />
                        <span>Quiz</span>
                      </button>

                      <button
                        onClick={() => onSelectDocument(doc.id, false)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <span>Read Note</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Student Portal Footer */}
        <div className="pt-12 pb-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-amber-500" />
            <span>Student Notes Hub — Verified Course Materials</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 text-[11px] flex-wrap">
            <span>Interactive RAG Tutor Active</span>
            <span>•</span>
            <span>Self-Paced Practice Quiz</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                if (onSwitchPortal) {
                  onSwitchPortal("teacher");
                } else {
                  const url = new URL(window.location.href);
                  url.searchParams.set("portal", "teacher");
                  window.location.href = url.toString();
                }
              }}
              className="text-purple-400 hover:text-purple-300 transition-colors cursor-pointer font-medium flex items-center gap-1"
              title="Open Instructor Upload Studio"
            >
              <Layers className="w-3 h-3" />
              <span>Teacher Studio</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
