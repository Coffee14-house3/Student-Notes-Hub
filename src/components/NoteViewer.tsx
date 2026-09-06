import React, { useState } from "react";
import { 
  Bookmark, Check, Copy, Info, AlertTriangle, Lightbulb, ShieldAlert
} from "lucide-react";
import { NoteSection, CalloutBox, CodeBlock, ReadingSettings, UserBookmark } from "../types";
import { InteractiveDiagramRenderer } from "./InteractiveDiagrams";
import { CostCalculator } from "./CostCalculator";
import { CloudComparisonTable } from "./CloudComparisonTable";

interface Props {
  sections: NoteSection[];
  settings: ReadingSettings;
  bookmarks: UserBookmark[];
  onAddBookmark: (section: NoteSection, snippet: string) => void;
  searchKeyword?: string;
}

export const NoteViewer: React.FC<Props> = ({
  sections,
  settings,
  bookmarks,
  onAddBookmark,
  searchKeyword
}) => {
  const getThemeClass = () => {
    switch (settings.theme) {
      case "sepia":
        return "bg-[#fbf0d9] text-[#5f4b32]";
      case "dark":
        return "bg-slate-950 text-slate-200";
      case "nord":
        return "bg-[#2e3440] text-[#eceff4]";
      case "light":
      default:
        return "bg-white text-slate-800";
    }
  };

  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case "sm":
        return "text-xs leading-relaxed";
      case "lg":
        return "text-base leading-relaxed";
      case "xl":
        return "text-lg leading-loose";
      case "md":
      default:
        return "text-sm leading-relaxed";
    }
  };

  const getMaxWidthClass = () => {
    switch (settings.maxWidth) {
      case "narrow":
        return "max-w-2xl";
      case "wide":
        return "max-w-5xl";
      case "full":
        return "max-w-full";
      case "medium":
      default:
        return "max-w-4xl";
    }
  };

  return (
    <div className={`min-h-screen p-4 sm:p-8 transition-colors ${getThemeClass()}`}>
      <div className={`mx-auto space-y-12 ${getMaxWidthClass()}`}>
        {sections.map((section) => (
          <article
            key={section.id}
            id={section.id}
            className="scroll-mt-20 border-b border-slate-200 dark:border-slate-800/80 pb-12 last:border-0"
          >
            {/* Section Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-amber-500 text-slate-950">
                  Page {section.pageNumber}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  ID: {section.id}
                </span>
              </div>

              <button
                onClick={() => onAddBookmark(section, section.title)}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20"
              >
                <Bookmark className="w-3.5 h-3.5" /> Bookmark Section
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-1">
              {section.title}
            </h2>
            {section.subtitle && (
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-6">
                {section.subtitle}
              </p>
            )}

            {/* Markdown Main Text Content */}
            <div className={`prose dark:prose-invert max-w-none ${getFontSizeClass()}`}>
              <SimpleMarkdownRenderer content={section.contentMarkdown} searchKeyword={searchKeyword} />
            </div>

            {/* Callout Boxes */}
            {section.callouts && section.callouts.length > 0 && (
              <div className="my-6 space-y-3">
                {section.callouts.map((call, idx) => (
                  <CalloutComponent key={idx} callout={call} />
                ))}
              </div>
            )}

            {/* Code Blocks */}
            {section.codeBlocks && section.codeBlocks.length > 0 && (
              <div className="my-6 space-y-3">
                {section.codeBlocks.map((code, idx) => (
                  <CodeBlockComponent key={idx} codeBlock={code} />
                ))}
              </div>
            )}

            {/* Interactive Diagrams */}
            {settings.showDiagrams && section.diagrams && section.diagrams.length > 0 && (
              <div className="my-8">
                {section.diagrams.map((diag) => (
                  <InteractiveDiagramRenderer key={diag.id} diagram={diag} />
                ))}
              </div>
            )}

            {/* Tables & Calculators */}
            {section.tables && section.tables.length > 0 && (
              <div className="my-8 space-y-6">
                {section.tables.map((tbl) => {
                  if (tbl.interactiveType === "billing-calculator") {
                    return <CostCalculator key={tbl.id} />;
                  }
                  if (tbl.interactiveType === "comparison-matrix") {
                    return <CloudComparisonTable key={tbl.id} table={tbl} />;
                  }
                  return (
                    <div key={tbl.id} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs text-xs">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700">
                        {tbl.title}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-800 text-white">
                              {tbl.headers.map((h) => (
                                <th key={h} className="p-3 font-semibold">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {tbl.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-3 font-medium">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};

/* Markdown Renderer Helper */
const SimpleMarkdownRenderer: React.FC<{ content: string; searchKeyword?: string }> = ({ content }) => {
  // Simple markdown transformer for headers, bullets, bold text
  const lines = content.split("\n");

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 mb-2">
              {trimmed.replace("### ", "")}
            </h3>
          );
        }
        if (trimmed.startsWith("#### ")) {
          return (
            <h4 key={idx} className="text-base font-bold text-amber-600 dark:text-amber-400 mt-4 mb-2">
              {trimmed.replace("#### ", "")}
            </h4>
          );
        }
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          const itemText = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-amber-500 font-bold mt-1">•</span>
              <p className="flex-1 my-0">{parseFormattedText(itemText)}</p>
            </div>
          );
        }
        if (trimmed.startsWith("1. ") || trimmed.startsWith("2. ") || trimmed.startsWith("3. ")) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 font-medium">
              <span className="text-amber-500 font-bold">{trimmed.substring(0, 3)}</span>
              <p className="flex-1 my-0">{parseFormattedText(trimmed.substring(3))}</p>
            </div>
          );
        }
        if (trimmed === "---") {
          return <hr key={idx} className="my-6 border-slate-200 dark:border-slate-800" />;
        }
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        return <p key={idx} className="my-1.5 text-slate-700 dark:text-slate-300">{parseFormattedText(trimmed)}</p>;
      })}
    </div>
  );
};

/* Text Formatting parser for **bold** and *italic* */
function parseFormattedText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-bold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

/* Callout Box Component */
const CalloutComponent: React.FC<{ callout: CalloutBox }> = ({ callout }) => {
  const getCalloutStyle = () => {
    switch (callout.type) {
      case "definition":
        return {
          bg: "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200",
          icon: <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />,
          label: "NIST Definition"
        };
      case "warning":
        return {
          bg: "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200",
          icon: <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />,
          label: "Security Warning"
        };
      case "case-study":
        return {
          bg: "bg-sky-500/10 border-sky-500/30 text-sky-900 dark:text-sky-200",
          icon: <Info className="w-4 h-4 text-sky-500 shrink-0" />,
          label: "Case Study Insight"
        };
      case "tip":
      default:
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200",
          icon: <Lightbulb className="w-4 h-4 text-emerald-500 shrink-0" />,
          label: "Pro Tip"
        };
    }
  };

  const style = getCalloutStyle();

  return (
    <div className={`p-4 rounded-xl border ${style.bg} text-xs space-y-1.5 shadow-xs`}>
      <div className="flex items-center gap-2 font-bold">
        {style.icon}
        <span>{callout.title}</span>
      </div>
      <p className="leading-relaxed pl-6">{callout.content}</p>
    </div>
  );
};

/* Code Block Component with Copy button */
const CodeBlockComponent: React.FC<{ codeBlock: CodeBlock }> = ({ codeBlock }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeBlock.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-200 font-mono text-xs my-4 shadow-sm">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>{codeBlock.description || codeBlock.language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sky-300 leading-relaxed text-[11px]">
        {codeBlock.code}
      </pre>
    </div>
  );
};
