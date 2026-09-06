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
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Teacher Studio Tool</div>
              <h3 className="text-base font-bold text-white">Merge Documents into Master Guide</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitted} className="flex flex-col gap-4 text-xs">
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-slate-300">Merged Document Title:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete AWS Certification Comprehensive Guide"
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-semibold text-slate-300">
              Select at least 2 files to combine ({selectedIds.length} selected):
            </label>
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {notes.map(n => {
                const isChecked = selectedIds.includes(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => toggleSelect(n.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-purple-500/15 border-purple-500/50 text-white"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <FileText className="w-4 h-4 shrink-0 text-purple-400" />
                      <span className="truncate font-medium">{n.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({n.sections.length} sec)</span>
                    </div>
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${isChecked ? "bg-purple-500 border-purple-500 text-slate-950" : "border-slate-700"}`}>
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
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
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedIds.length < 2 || !title.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
            >
              Combine & Create Master Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
