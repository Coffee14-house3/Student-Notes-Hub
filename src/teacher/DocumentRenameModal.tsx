import React, { useState, useEffect } from "react";
import { Edit3, X, Check } from "lucide-react";
import { NoteDocument } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: NoteDocument | null;
  onRename: (
    docId: string, 
    newTitle: string,
    subject?: string,
    description?: string,
    unit?: string,
    unitTitle?: string,
    courseCode?: string
  ) => void;
}

export const DocumentRenameModal: React.FC<Props> = ({
  isOpen,
  onClose,
  document,
  onRename
}) => {
  const [title, setTitle] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [unit, setUnit] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setSubject(document.subject || "");
      setUnit(document.unit || (document.unitNumber ? `Unit ${document.unitNumber}` : ""));
      setDescription(document.description || "");
    }
  }, [document]);

  if (!isOpen || !document) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onRename(
        document.id, 
        title.trim(),
        subject.trim() || undefined,
        description.trim() || undefined,
        unit.trim() || undefined
      );
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1e1e24] border border-[#383842] rounded-2xl max-w-md w-full p-5 shadow-2xl relative text-slate-100 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#383842] pb-3">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Edit Document Metadata</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-300">Document Title:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-300">Subject / Category:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. AWS Cloud & Labs"
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-300">Syllabus Unit:</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. Unit 1: Foundations"
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-300">Description:</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary for students..."
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#383842]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors disabled:opacity-40"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
