import React from "react";
import { Info, X, FileText, Hash, Clock, Code, Table, CheckCircle2, HardDrive, Layers } from "lucide-react";
import { NoteDocument } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: NoteDocument | null;
}

export const DocumentDetailsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  document
}) => {
  if (!isOpen || !document) return null;

  // Calculate statistics
  const totalSections = document.sections.length;
  let wordCount = 0;
  let codeBlocksCount = 0;
  let tablesCount = 0;
  let calloutsCount = 0;

  document.sections.forEach(s => {
    wordCount += s.contentMarkdown.split(/\s+/).filter(Boolean).length;
    if (s.codeBlocks) codeBlocksCount += s.codeBlocks.length;
    if (s.tables) tablesCount += s.tables.length;
    if (s.callouts) calloutsCount += s.callouts.length;
  });

  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1e1e24] border border-[#383842] rounded-2xl max-w-lg w-full p-5 shadow-2xl relative text-slate-100 flex flex-col gap-5 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#383842] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">File Inspector</div>
              <h3 className="text-base font-bold text-white line-clamp-1">{document.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-[#141418] border border-[#2d2d36] rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <FileText className="w-3.5 h-3.5 text-amber-400" /> Pages
            </div>
            <div className="text-lg font-bold text-white font-mono">{document.pageCount}</div>
          </div>

          <div className="bg-[#141418] border border-[#2d2d36] rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Hash className="w-3.5 h-3.5 text-sky-400" /> Total Words
            </div>
            <div className="text-lg font-bold text-white font-mono">{wordCount.toLocaleString()}</div>
          </div>

          <div className="bg-[#141418] border border-[#2d2d36] rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Clock className="w-3.5 h-3.5 text-emerald-400" /> Read Time
            </div>
            <div className="text-lg font-bold text-white font-mono">~{readingTimeMinutes} mins</div>
          </div>

          <div className="bg-[#141418] border border-[#2d2d36] rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Code className="w-3.5 h-3.5 text-indigo-400" /> Code Blocks
            </div>
            <div className="text-lg font-bold text-white font-mono">{codeBlocksCount}</div>
          </div>

          <div className="bg-[#141418] border border-[#2d2d36] rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Table className="w-3.5 h-3.5 text-purple-400" /> Data Tables
            </div>
            <div className="text-lg font-bold text-white font-mono">{tablesCount}</div>
          </div>

          <div className="bg-[#141418] border border-[#2d2d36] rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Layers className="w-3.5 h-3.5 text-amber-400" /> Callout Boxes
            </div>
            <div className="text-lg font-bold text-white font-mono">{calloutsCount}</div>
          </div>
        </div>

        {/* Metadata Details */}
        <div className="bg-[#141418] border border-[#2d2d36] rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-[#22222a] pb-2">
            <span className="text-slate-400">Document Unique ID</span>
            <span className="font-mono text-slate-200 bg-[#22222a] px-2 py-0.5 rounded text-[11px]">{document.id}</span>
          </div>
          <div className="flex items-center justify-between border-b border-[#22222a] pb-2">
            <span className="text-slate-400">Format Source</span>
            <span className="text-amber-400 font-semibold">{document.pdfUrl || document.pdfDataUrl ? "Original PDF Document" : "Structured AI Study Note"}</span>
          </div>
          <div className="flex items-center justify-between border-b border-[#22222a] pb-2">
            <span className="text-slate-400">RAG Vector Status</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Indexed for AI Querying
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Storage Location</span>
            <span className="text-slate-300 flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" /> Local Application State
            </span>
          </div>
        </div>

        {/* Close button */}
        <div className="flex justify-end pt-2 border-t border-[#383842]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
