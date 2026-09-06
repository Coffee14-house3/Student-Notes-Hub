import React, { useState } from "react";
import { Sparkles, X, FileText, CheckCircle2, Copy, BookOpen, Layers, Key, ArrowRight } from "lucide-react";
import { NoteDocument } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: NoteDocument | null;
  onOpenQuiz?: () => void;
  onOpenAiChat?: () => void;
}

export const DocumentSummaryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  document,
  onOpenQuiz,
  onOpenAiChat
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !document) return null;

  // Extract key bullet points from sections
  const keyTakeaways = (document.sections || []).map((section, idx) => {
    const lines = (section.contentMarkdown || "")
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.startsWith("- ") || l.startsWith("* ") || l.startsWith("1.") || l.startsWith("###") || l.startsWith("##"));
    
    const summaryLine = lines[0] ? lines[0].replace(/^[-*#0-9.]+\s*/, "") : section.subtitle || section.title;
    return {
      pageNumber: section.pageNumber,
      title: section.title,
      point: summaryLine
    };
  });

  const handleCopySummary = () => {
    const text = `Document Title: ${document.title}\nTotal Pages: ${document.pageCount}\nDescription: ${document.description}\n\nKey Takeaways:\n` +
      keyTakeaways.map(k => `• Page ${k.pageNumber} (${k.title}): ${k.point}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#1e1e24] border border-[#383842] rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative text-slate-100 flex flex-col gap-5 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#383842] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">AI Executive Summary</div>
              <h2 className="text-base sm:text-lg font-bold text-white line-clamp-1">{document.title}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Box */}
        <div className="bg-[#141418] border border-[#2d2d36] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-400">
              <BookOpen className="w-3.5 h-3.5" /> Core Overview
            </span>
            <span className="font-mono text-[11px] bg-[#22222a] px-2 py-0.5 rounded text-slate-300">
              {document.pageCount} {document.pageCount === 1 ? "Page" : "Pages"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {document.description || "Comprehensive technical document covering core architecture, procedures, and best practices."}
          </p>
        </div>

        {/* Key Takeaways List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" /> Key Page Takeaways ({keyTakeaways.length})
            </h3>
            <button
              onClick={handleCopySummary}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Summary"}</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {keyTakeaways.map((item, idx) => (
              <div key={idx} className="bg-[#18181f] border border-[#2d2d38] rounded-xl p-3 flex items-start gap-3">
                <span className="text-[10px] font-extrabold font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded shrink-0">
                  Page {item.pageNumber}
                </span>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{item.title}</div>
                  <div className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{item.point}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#383842] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onOpenQuiz && (
              <button
                onClick={() => { onClose(); onOpenQuiz(); }}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-xs border border-amber-500/40 cursor-pointer"
              >
                Start Quiz
              </button>
            )}
            {onOpenAiChat && (
              <button
                onClick={() => { onClose(); onOpenAiChat(); }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Ask AI Tutor
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
