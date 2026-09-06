import React, { useState } from "react";
import { Search, X, ChevronRight, FileText } from "lucide-react";
import { NoteDocument, SearchResult } from "../types";

interface Props {
  notes: NoteDocument[];
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (noteId: string, sectionId: string) => void;
}

export const SearchModal: React.FC<Props> = ({
  notes,
  isOpen,
  onClose,
  onSelectResult
}) => {
  const [query, setQuery] = useState<string>("");

  if (!isOpen) return null;

  const results: SearchResult[] = [];
  if (query.trim().length >= 2) {
    const q = query.toLowerCase();
    notes.forEach((note) => {
      note.sections.forEach((sec) => {
        const fullContent = (sec.title + " " + sec.subtitle + " " + sec.contentMarkdown).toLowerCase();
        if (fullContent.includes(q)) {
          results.push({
            noteId: note.id,
            sectionId: sec.id,
            sectionTitle: sec.title,
            pageNumber: sec.pageNumber,
            matchedText: sec.title,
            context: sec.subtitle || sec.contentMarkdown.slice(0, 100) + "..."
          });
        }
      });
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 sm:p-12">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col text-xs">
        {/* Search input bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-amber-500 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords, definitions, sections..."
            className="flex-1 bg-transparent border-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none text-xs sm:text-sm font-medium"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results container */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60">
          {query.trim().length < 2 ? (
            <div className="p-8 text-center text-slate-400">
              Type at least 2 characters to search across all notes...
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No matching sections found for "{query}".
            </div>
          ) : (
            results.map((res, i) => (
              <button
                key={i}
                onClick={() => {
                  onSelectResult(res.noteId, res.sectionId);
                  onClose();
                }}
                className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-1 pr-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition-colors truncate">
                      {res.sectionTitle}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (Page {res.pageNumber})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {res.context}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex justify-between items-center px-4">
          <span>{results.length} results found</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};
