import React, { useState, useRef } from "react";
import { 
  Upload, FileText, Sparkles, BookOpen, Trash2, ArrowRight, 
  CheckCircle2, FileCode, Search, HelpCircle, Layers, ShieldCheck, 
  RefreshCw, Plus, HardDrive, File, Database, Zap
} from "lucide-react";
import { NoteDocument } from "../types";

interface Props {
  documents: NoteDocument[];
  onUploadDocument: (file: File) => Promise<void>;
  onLoadSampleDocument: (sampleType: "pdf" | "code" | "markdown") => void;
  onSelectDocument: (docId: string, openAiChat?: boolean) => void;
  onOpenQuiz?: (docId: string) => void;
  onDeleteDocument: (docId: string) => void;
  onRestoreDefaultNotes?: () => void;
  isUploading: boolean;
  uploadError: string | null;
}

export const DocumentDashboard: React.FC<Props> = ({
  documents,
  onUploadDocument,
  onLoadSampleDocument,
  onSelectDocument,
  onOpenQuiz,
  onDeleteDocument,
  onRestoreDefaultNotes,
  isUploading,
  uploadError
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [dashboardSearch, setDashboardSearch] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      onUploadDocument(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadDocument(e.target.files[0]);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (!dashboardSearch.trim()) return true;
    const query = dashboardSearch.toLowerCase();
    return (
      doc.title.toLowerCase().includes(query) ||
      doc.description.toLowerCase().includes(query) ||
      doc.sections.some(s => s.title.toLowerCase().includes(query) || s.contentMarkdown.toLowerCase().includes(query))
    );
  });

  const totalPages = documents.reduce((sum, doc) => sum + doc.pageCount, 0);
  const totalSections = documents.reduce((sum, doc) => sum + doc.sections.length, 0);

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-4 sm:p-8 overflow-y-auto min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> RAG Document Hub
              </span>
              <span className="text-xs text-slate-400 font-mono">v2.5 AI Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Document Dashboard & Study Hub
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Access your preloaded course notes, practice flashcards & quizzes, and query your material using Retrieval-Augmented Generation (RAG) AI.
            </p>
          </div>

          <button
            disabled
            className="px-4 py-2.5 bg-slate-800 text-slate-500 font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 text-xs cursor-not-allowed opacity-75 self-start md:self-auto"
            title="File uploads are currently disabled"
          >
            <Upload className="w-4 h-4" /> Upload Disabled
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">{documents.length}</div>
              <div className="text-[11px] text-slate-400 font-medium">Documents</div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-lg shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">{totalPages}</div>
              <div className="text-[11px] text-slate-400 font-medium">Total Pages</div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">{totalSections}</div>
              <div className="text-[11px] text-slate-400 font-medium">RAG Chunks</div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-lg shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-400 flex items-center gap-1">
                Active <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="text-[11px] text-slate-400 font-medium">RAG Search Index</div>
            </div>
          </div>
        </div>

        {/* Disabled Upload Zone Banner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-slate-500" /> File Upload Status
              </h2>
              <p className="text-xs text-slate-400">
                New file uploads have been disabled. You can view, search, and practice with all preloaded document notes below.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-xs font-mono font-bold">
              Uploads Disabled
            </span>
          </div>

          <div
            className="border-2 border-dashed border-slate-800 rounded-xl p-6 sm:p-8 text-center bg-slate-950/50 flex flex-col items-center justify-center gap-2 cursor-not-allowed opacity-70"
          >
            <div className="p-3 bg-slate-800/80 text-slate-500 rounded-full border border-slate-700">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-400">
                File upload functionality is currently disabled
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Select any existing document from your library below to start studying or chatting with the AI Tutor.
              </div>
            </div>
          </div>
        </div>

        {/* Search & Library Grid Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-amber-400" /> Your Document Library ({filteredDocuments.length})
              </h2>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={dashboardSearch}
                onChange={(e) => setDashboardSearch(e.target.value)}
                placeholder="Search documents or sections..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Document Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


            {filteredDocuments.map((doc) => {
              const isUserUploaded = doc.id.startsWith("upload-");
              return (
                <div
                  key={doc.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 transition-all flex flex-col justify-between gap-4 group hover:shadow-xl hover:shadow-amber-500/5 relative"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg text-slate-950 font-bold ${
                          isUserUploaded ? "bg-emerald-400" : "bg-amber-400"
                        }`}>
                          {isUserUploaded ? <FileText className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {isUserUploaded ? "User Upload" : "Preset Note"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                          {doc.pageCount} {doc.pageCount === 1 ? "Page" : "Pages"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDocument(doc.id);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                          title={`Delete ${isUserUploaded ? "Uploaded" : "Preset"} Note`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                      {doc.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {doc.description || "Formatted document sections indexed for RAG vector search and interactive reader mode."}
                    </p>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={() => onOpenQuiz ? onOpenQuiz(doc.id) : onSelectDocument(doc.id, false)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 font-extrabold transition-colors flex items-center gap-1 text-xs border border-amber-500/30 cursor-pointer"
                      title={`Take practice quiz for ${doc.shortTitle || doc.title}`}
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Quiz
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectDocument(doc.id, true)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 transition-colors flex items-center gap-1 font-medium text-xs border border-slate-700 cursor-pointer"
                        title="Query with RAG AI Assistant"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Ask AI
                      </button>

                      <button
                        onClick={() => onSelectDocument(doc.id, false)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors flex items-center gap-1 text-xs shadow-xs cursor-pointer"
                      >
                        Open Reader <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
