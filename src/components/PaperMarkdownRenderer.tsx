import React from "react";
import { Sparkles, ExternalLink } from "lucide-react";
import { FigureCard } from "./FigureCard";

export const PaperMarkdownRenderer: React.FC<{ content: string; isDark?: boolean }> = ({ content, isDark = false }) => {
  const lines = (content || "").split("\n");

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Suppress presenter notes and speaker notes completely
        if (
          trimmed.startsWith("> Speaker Notes:") || 
          trimmed.startsWith("> **Speaker Notes:**") ||
          trimmed.startsWith("> Presenter Notes:") ||
          trimmed.startsWith("> **Presenter Notes:**") ||
          trimmed === "Speaker Notes:" ||
          trimmed === "Presenter Notes:" ||
          trimmed === "**Speaker Notes:**" ||
          trimmed === "**Presenter Notes:**" ||
          /^>\s*\d+\s*$/.test(trimmed) ||
          /^\s*\d+\s*$/.test(trimmed)
        ) {
          return null;
        }

        // Suppress redundant duplicate slide titles like "## Slide 3: STEP 1 · VLAN"
        if (/^##\s*Slide\s*\d+[\s\:]/i.test(trimmed)) {
          return null;
        }

        // Takeaway / Quote Banner
        if (trimmed.startsWith("> ")) {
          const quoteText = trimmed.replace(/^>\s*/, "");
          return (
            <div key={idx} className={`p-4 sm:p-5 rounded-xl border ${isDark ? "bg-gradient-to-r from-amber-950/40 via-[#182338] to-[#182338] border-amber-500/50 text-amber-100" : "bg-amber-50 border-amber-300 text-amber-950"} my-4 shadow-md flex items-start gap-3`}>
              <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-800"}`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs sm:text-sm font-medium leading-relaxed">
                {renderBoldText(quoteText.replace(/^\*\*(?:Key Takeaway:?|Takeaway:?)\*\*\s*/i, ""), isDark)}
              </div>
            </div>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={idx} className={`text-lg sm:text-xl font-bold mt-5 mb-2 border-b pb-1.5 ${isDark ? "text-amber-400 border-slate-700" : "text-amber-800 border-slate-200"}`}>
              {renderBoldText(trimmed.replace(/^##\s*/, ""), isDark)}
            </h2>
          );
        }
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className={`text-base sm:text-lg font-bold mt-4 mb-2 flex items-center gap-2 ${isDark ? "text-amber-300" : "text-amber-800"}`}>
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 inline-block"></span>
              <span>{renderBoldText(trimmed.replace("### ", ""), isDark)}</span>
            </h3>
          );
        }
        if (trimmed.startsWith("#### ")) {
          return (
            <h4 key={idx} className={`text-sm font-bold mt-3 mb-1 ${isDark ? "text-amber-400" : "text-amber-800"}`}>
              {renderBoldText(trimmed.replace("#### ", ""), isDark)}
            </h4>
          );
        }
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          const itemText = trimmed.substring(2);
          return (
            <div key={idx} className={`flex items-start gap-2.5 pl-2 py-1 rounded-lg ${isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-100/60"} transition-colors`}>
              <span className={`font-bold mt-1 text-[9px] ${isDark ? "text-amber-400" : "text-amber-600"}`}>◆</span>
              <div className={`flex-1 leading-relaxed ${isDark ? "text-slate-200" : "text-slate-800"}`}>{renderBoldText(itemText, isDark)}</div>
            </div>
          );
        }
        if (trimmed.startsWith("1. ") || trimmed.startsWith("2. ") || trimmed.startsWith("3. ") || trimmed.startsWith("4. ") || trimmed.startsWith("5. ")) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 font-medium">
              <span className={`font-bold ${isDark ? "text-amber-400" : "text-slate-800"}`}>{trimmed.substring(0, 3)}</span>
              <div className={`flex-1 my-0 leading-relaxed ${isDark ? "text-slate-200" : "text-slate-800"}`}>{renderBoldText(trimmed.substring(3), isDark)}</div>
            </div>
          );
        }
        if (trimmed === "---") {
          return <hr key={idx} className={`my-5 ${isDark ? "border-slate-700" : "border-slate-200"}`} />;
        }
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Markdown image support (e.g. diagrams and figures extracted from slides)
        const imgMatch = trimmed.match(/!\[([^\]]*)\]\((data:image\/[^)]+)\)/);
        if (imgMatch) {
          const alt = imgMatch[1];
          const src = imgMatch[2];
          const parts = trimmed.split(imgMatch[0]);
          return (
            <div key={idx} className="my-3">
              {parts[0] && <p className={`my-1 leading-relaxed ${isDark ? "text-slate-200" : "text-slate-800"}`}>{renderBoldText(parts[0], isDark)}</p>}
              <div className="my-3 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/80 border border-slate-700 shadow-md">
                <img src={src} alt={alt || "Slide Figure"} className="max-h-[400px] max-w-full object-contain rounded-lg shadow-sm bg-white/5 p-2" />
                {alt && alt !== "Slide Diagram" && alt !== "Slide Figure" && (
                  <span className="text-[11px] text-slate-400 mt-1.5 italic text-center">{alt}</span>
                )}
              </div>
              {parts[1] && <p className={`my-1 leading-relaxed ${isDark ? "text-slate-200" : "text-slate-800"}`}>{renderBoldText(parts[1], isDark)}</p>}
            </div>
          );
        }

        // Check if line represents a figure or diagram caption
        const isFigure = /^(Fig(?:ure|\.)?)\s*[\d\.\-\:]+/i.test(trimmed) || 
                         trimmed.toLowerCase().startsWith("fig ") || 
                         trimmed.toLowerCase().startsWith("fig.") || 
                         trimmed.toLowerCase().startsWith("figure ");

        if (isFigure) {
          return <FigureCard key={idx} rawLine={trimmed} />;
        }

        return <p key={idx} className={`my-1.5 leading-relaxed ${isDark ? "text-slate-200" : "text-slate-800"}`}>{renderBoldText(trimmed, isDark)}</p>;
      })}
    </div>
  );
};

function renderBoldText(rawText: string, isDark: boolean = false) {
  const text = (rawText || "")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  const parts = text.split(/(\[.*?\]\(https?:\/\/[^\)]+\)|\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    const linkMatch = part.match(/^\[(.*?)\]\((https?:\/\/.*?)\)$/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];
      return (
        <a
          key={i}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-xs my-1 ${
            isDark 
              ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40" 
              : "bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300"
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span>{linkText}</span>
        </a>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className={`font-bold ${isDark ? "text-white" : "text-slate-950"}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
