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
        <div className="flex items-center justify-between border-b border-[#383842] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Teacher Studio Inspector</div>
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

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Syllabus Unit</span>
            </div>
            <div className="font-bold text-slate-100">{document.unit || (document.unitNumber ? `Unit ${document.unitNumber}` : "General")}</div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Sections</span>
            </div>
            <div className="font-bold text-slate-100">{totalSections} pages</div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Hash className="w-3.5 h-3.5 text-purple-400" />
              <span>Word Count</span>
            </div>
            <div className="font-bold text-slate-100">~{wordCount.toLocaleString()}</div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Reading Time</span>
            </div>
            <div className="font-bold text-slate-100">~{readingTimeMinutes} mins</div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Code className="w-3.5 h-3.5 text-purple-400" />
              <span>Code Blocks</span>
            </div>
            <div className="font-bold text-slate-100">{codeBlocksCount}</div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
            <div className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Table className="w-3.5 h-3.5 text-purple-400" />
              <span>Data Tables</span>
            </div>
            <div className="font-bold text-slate-100">{tablesCount}</div>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="font-semibold text-slate-300">Document Overview:</div>
          <p className="text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
            {document.description || "No description provided."}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-[#383842]">
          <span>Uploaded by: {document.uploadedBy || "Instructor"}</span>
          <span>Status: {document.isPublished !== false ? "Published to Students" : "Draft"}</span>
        </div>
      </div>
    </div>
  );
};
