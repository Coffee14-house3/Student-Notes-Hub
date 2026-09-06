import React from "react";
import { Bookmark, FileText, ChevronRight, X, Sparkles, HelpCircle } from "lucide-react";
import { NoteDocument, UserBookmark } from "../types";

interface Props {
  notes: NoteDocument[];
  activeView: string;
  setActiveView: (view: string) => void;
  activeSectionId: string;
  onSelectSection: (noteId: string, sectionId: string) => void;
  bookmarks: UserBookmark[];
  onRemoveBookmark: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<Props> = ({
  notes,
  activeView,
  setActiveView,
  activeSectionId,
  onSelectSection,
  bookmarks,
  onRemoveBookmark,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <aside className="w-80 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md h-[calc(100vh-57px)] sticky top-[57px] overflow-y-auto p-4 z-20 space-y-6 text-xs transition-all">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-sm">
          <FileText className="w-4 h-4 text-amber-500" /> Document Outline
        </span>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          title="Close Outline"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Navigation Buttons */}
      <div className="space-y-1">
        <button
          onClick={() => setActiveView("quiz")}
          className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between font-semibold transition-colors ${
            activeView === "quiz"
              ? "bg-amber-500 text-slate-950 font-bold"
              : "bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-amber-500"
          }`}
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" /> Practice Quiz
          </span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Table of Contents for Notes */}
      <div className="space-y-4">
        {notes.map((note) => (
          <div key={note.id} className="space-y-1.5">
            <button
              onClick={() => setActiveView(note.id as any)}
              className={`w-full text-left font-bold text-xs p-2 rounded-lg flex items-center justify-between transition-colors ${
                activeView === note.id
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  : "text-slate-900 dark:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-1.5 truncate pr-1">
                {note.unit && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 dark:text-amber-400 text-[9px] font-bold shrink-0">
                    {note.unit}
                  </span>
                )}
                <span className="truncate">{note.shortTitle}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono shrink-0">{note.pageCount || note.sections.length} P.</span>
            </button>

            <div className="pl-2 space-y-0.5 border-l-2 border-slate-200 dark:border-slate-800">
              {note.sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => onSelectSection(note.id, sec.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all flex items-center justify-between ${
                    activeSectionId === sec.id
                      ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span className="truncate pr-2">{sec.title}</span>
                  <span className="text-[10px] opacity-70 font-mono">P.{sec.pageNumber}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bookmarked Highlights */}
      {bookmarks.length > 0 && (
        <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-amber-500" /> Saved Bookmarks ({bookmarks.length})
            </span>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {bookmarks.map((b) => (
              <div
                key={b.id}
                className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1 relative group"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <button
                    onClick={() => onSelectSection(b.noteId, b.sectionId)}
                    className="font-semibold text-amber-600 dark:text-amber-400 hover:underline truncate pr-2"
                  >
                    {b.sectionTitle}
                  </button>
                  <button
                    onClick={() => onRemoveBookmark(b.id)}
                    className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove bookmark"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2 italic">
                  "{b.textSnippet}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
