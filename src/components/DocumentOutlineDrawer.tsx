import React from "react";
import { List, X, ChevronRight, FileText, Hash } from "lucide-react";
import { NoteDocument } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: NoteDocument | null;
  currentPage: number;
  onSelectPage: (pageNumber: number) => void;
}

export const DocumentOutlineDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  document,
  currentPage,
  onSelectPage
}) => {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-[#18181c] border-l border-[#383842] shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-14 px-4 border-b border-[#383842] flex items-center justify-between shrink-0 bg-[#1e1e24]">
        <div className="flex items-center gap-2">
          <List className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Document Outline</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Title info */}
      <div className="p-3 bg-[#121215] border-b border-[#2d2d38]">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Document</div>
        <div className="text-xs font-bold text-amber-400 truncate mt-0.5">{document.title}</div>
      </div>

      {/* Sections Outline List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {(document.sections || []).map((sec, idx) => {
          const isActive = sec.pageNumber === currentPage;
          return (
            <button
              key={sec.id || idx}
              onClick={() => {
                onSelectPage(sec.pageNumber);
                onClose();
              }}
              className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                isActive
                  ? "bg-amber-500/15 border-amber-500/40 text-white shadow-sm"
                  : "bg-[#1f1f26] border-[#2d2d38] text-slate-300 hover:border-slate-500 hover:text-white"
              }`}
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-400 font-mono">
                  <Hash className="w-3 h-3 text-amber-400" /> Page {sec.pageNumber}
                </div>
                <div className="text-xs font-bold line-clamp-1">{sec.title}</div>
                {sec.subtitle && (
                  <div className="text-[11px] text-slate-400 line-clamp-1">{sec.subtitle}</div>
                )}
              </div>

              <ChevronRight className={`w-4 h-4 shrink-0 mt-1 ${isActive ? "text-amber-400" : "text-slate-600"}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
