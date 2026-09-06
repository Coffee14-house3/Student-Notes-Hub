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
            placeholder="Search notes (e.g. S3, VPC, Load balancer, Free tier, John)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-slate-900 dark:text-slate-100 text-sm focus:outline-none placeholder:text-slate-400"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results list */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {query.trim().length < 2 ? (
            <div className="p-8 text-center text-slate-400">
              Type at least 2 characters to search across both lecture notes...
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No matching sections found for "{query}".
            </div>
          ) : (
            results.map((res, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelectResult(res.noteId, res.sectionId);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group"
              >
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {res.sectionTitle}
                    </span>
                    <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-mono rounded">
                      Page {res.pageNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {res.context}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
