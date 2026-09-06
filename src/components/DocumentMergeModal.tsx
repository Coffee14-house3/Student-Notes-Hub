import React, { useState } from "react";
import { GitMerge, X, Check, Layers, FileText } from "lucide-react";
import { NoteDocument } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notes: NoteDocument[];
  activeDoc: NoteDocument | null;
  onMerge: (mergedTitle: string, docIdsToMerge: string[]) => void;
}

export const DocumentMergeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  notes,
  activeDoc,
  onMerge
}) => {
  const [title, setTitle] = useState<string>(activeDoc ? `${activeDoc.title} (Merged Master Guide)` : "Merged Study Guide");
  const [selectedIds, setSelectedIds] = useState<string[]>(activeDoc ? [activeDoc.id] : []);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmitted = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length >= 2 && title.trim()) {
      onMerge(title.trim(), selectedIds);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1e1e24] border border-[#383842] rounded-2xl max-w-lg w-full p-5 shadow-2xl relative text-slate-100 flex flex-col gap-4 my-auto">
        <div className="flex items-center justify-between border-b border-[#383842] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">File Functions</div>
              <h3 className="text-base font-bold text-white">Merge Documents into Master Guide</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitted} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Merged Document Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#121215] border border-[#383842] focus:border-amber-500 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              placeholder="Enter merged document title..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Select 2 or More Documents to Combine ({selectedIds.length} Selected)
            </label>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {notes.map((n) => {
                const isChecked = selectedIds.includes(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => toggleSelect(n.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isChecked
                        ? "bg-amber-500/15 border-amber-500/40 text-white"
                        : "bg-[#141418] border-[#2d2d36] text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <FileText className={`w-4 h-4 shrink-0 ${isChecked ? "text-amber-400" : "text-slate-500"}`} />
                      <div className="truncate text-xs font-semibold">{n.title}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      isChecked ? "bg-amber-500 border-amber-500 text-slate-950" : "border-slate-600"
                    }`}>
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#383842]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedIds.length < 2 || !title.trim()}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <GitMerge className="w-3.5 h-3.5" /> Merge Selected Files
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
