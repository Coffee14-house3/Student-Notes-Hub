import React, { useState, useEffect, useRef } from "react";
import { Sparkles, X, Send, Bot, User, RotateCcw, Copy, Check, Network, Maximize2, Minimize2 } from "lucide-react";

import { NoteDocument } from "../types";
import { apiFetch } from "../utils/apiClient";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contextText: string;
  activeDocument?: NoteDocument;
  isEmbedded?: boolean;
  onNavigateToPage?: (pageNumber: number) => void;
}

function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={i} className="font-bold text-slate-900 dark:text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={i} className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700/80 text-amber-600 dark:text-amber-300 font-mono text-[11px] break-all">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2 && !part.startsWith("**")) {
      return (
        <em key={i} className="italic text-slate-800 dark:text-slate-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const MarkdownTableComponent: React.FC<{
  headers: string[];
  alignments: ("left" | "center" | "right")[];
  rows: string[][];
}> = ({ headers, alignments, rows }) => {
  return (
    <div className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs max-w-full">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-amber-500/10 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
            {headers.map((h, hIdx) => {
              const align = alignments[hIdx] || "left";
              const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
              return (
                <th
                  key={hIdx}
                  className={`px-3 py-2 font-bold border-r last:border-r-0 border-slate-200 dark:border-slate-700 whitespace-nowrap text-amber-600 dark:text-amber-400 ${alignClass}`}
                >
                  {renderFormattedText(h)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
          {rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className={`${
                rIdx % 2 === 0
                  ? "bg-transparent"
                  : "bg-slate-50/70 dark:bg-slate-800/40"
              } hover:bg-amber-500/5 dark:hover:bg-amber-500/10 transition-colors`}
            >
              {row.map((cell, cIdx) => {
                const align = alignments[cIdx] || "left";
                const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
                return (
                  <td
                    key={cIdx}
                    className={`px-3 py-2 border-r last:border-r-0 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 leading-relaxed min-w-[110px] ${alignClass}`}
                  >
                    {renderFormattedText(cell)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DiagramCodeBlock: React.FC<{
  rawCode: string;
  lang?: string;
}> = ({ rawCode, lang = "" }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);

  // Detect if this is an ASCII / network / architecture diagram
  const isDiagram = (() => {
    const l = (lang || "").toLowerCase();
    if (["ascii", "diagram", "topology", "architecture", "net", "network", "chart", "map", "flow"].includes(l)) {
      return true;
    }
    const lines = rawCode.trim().split("\n");
    if (lines.length < 2) return false;
    let matches = 0;
    for (const line of lines) {
      if (
        /[+\|][\-=]{2,}/.test(line) ||
        (/\|/.test(line) && (line.match(/\|/g) || []).length >= 2) ||
        /[-=]{2,}>|<[-=]{2,}/.test(line) ||
        /\[[^\]]+\]\s*[-=~>]*\s*\[[^\]]+\]/.test(line) ||
        /^[+\-=|_#~*]{4,}$/.test(line.trim())
      ) {
        matches++;
      }
    }
    return matches >= 2;
  })();

  const handleCopy = () => {
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="my-2.5 rounded-xl bg-[#0b0f17] text-slate-100 border border-slate-700/80 shadow-md overflow-hidden max-w-full">
        <div className="px-3 py-1.5 bg-[#161f2e] border-b border-slate-700/80 flex items-center justify-between gap-2 select-none">
          <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold tracking-wider text-[10px] uppercase">
            {isDiagram ? (
              <>
                <Network className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Architecture Diagram</span>
              </>
            ) : (
              <span>{lang || "Code"}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isDiagram && (
              <button
                type="button"
                onClick={() => setWrapLines(!wrapLines)}
                className="px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-sans"
                title="Toggle line wrapping"
              >
                {wrapLines ? "Fixed Width" : "Wrap"}
              </button>
            )}
            {isDiagram && (
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-sans"
                title="Open fullscreen view"
              >
                <Maximize2 className="w-3 h-3" />
                <span className="hidden sm:inline">Expand</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-sans"
              title="Copy diagram text"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Monospace ASCII Canvas with preserved columns */}
        <div className="overflow-x-auto p-3 bg-[#0b0f17] custom-scrollbar max-w-full">
          <pre
            className={`font-mono text-[11px] sm:text-xs leading-snug text-slate-200 ${
              wrapLines ? "whitespace-pre-wrap break-words" : "whitespace-pre"
            } select-text block`}
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              letterSpacing: "0px",
              tabSize: 2
            }}
          >
            {rawCode}
          </pre>
        </div>

        {isDiagram && (
          <div className="px-3 py-1 bg-[#111827] border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="italic flex items-center gap-1">
              ↔ Scroll horizontally to view full diagram
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer"
            >
              Expand view ↗
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Expanded Diagram Modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="bg-[#0b0f17] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-[#161f2e] border-b border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-xs uppercase">
                <Network className="w-4 h-4 text-amber-400" />
                <span>Architecture & Network Diagram (Fullscreen)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy Diagram"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="Close diagram"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-[#070a10]">
              <pre
                className="whitespace-pre font-mono text-xs sm:text-sm leading-relaxed text-slate-100 select-text"
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                  letterSpacing: "0px",
                  tabSize: 2
                }}
              >
                {rawCode}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function parseMarkdownContent(lines: string[]) {
  const elements: Array<
    | { type: "space"; key: number }
    | { type: "hr"; key: number }
    | { type: "h1" | "h2" | "h3" | "h4"; text: string; key: number }
    | { type: "bullet"; text: string; key: number }
    | { type: "numbered"; number: string; text: string; key: number }
    | { type: "table"; headers: string[]; alignments: ("left" | "center" | "right")[]; rows: string[][]; key: number }
    | { type: "diagram"; text: string; key: number }
    | { type: "image"; alt: string; src: string; key: number }
    | { type: "paragraph"; text: string; key: number }
  > = [];

  const splitRowCells = (rowStr: string): string[] => {
    let s = rowStr.trim();
    if (s.startsWith("|")) s = s.substring(1);
    if (s.endsWith("|")) s = s.substring(0, s.length - 1);
    return s.split("|").map(c => c.trim());
  };

  const isSeparatorLine = (lineStr: string): boolean => {
    const trimmed = lineStr.trim();
    if (!trimmed.includes("|") && !trimmed.includes("-")) return false;
    let s = trimmed;
    if (s.startsWith("|")) s = s.substring(1);
    if (s.endsWith("|")) s = s.substring(0, s.length - 1);
    const cells = s.split("|").map(c => c.trim());
    if (cells.length === 0) return false;
    return cells.every(c => /^:?-+:?$/.test(c));
  };

  const isDiagramLine = (lineStr: string): boolean => {
    const trimmed = lineStr.trim();
    if (!trimmed) return false;
    if (/[+\|][\-=]{2,}/.test(trimmed)) return true;
    if ((trimmed.match(/\|/g) || []).length >= 2) return true;
    if (/[-=]{2,}>|<[-=]{2,}/.test(trimmed)) return true;
    if (/\[[^\]]+\]\s*[-=~>]*\s*\[[^\]]+\]/.test(trimmed)) return true;
    if (/^\[\s*[A-Z0-9\s/_\-:]+\s*\]/.test(trimmed) && trimmed.includes("]")) return true;
    if (/^[+\-=|_#~*]{4,}$/.test(trimmed)) return true;
    return false;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect Markdown Table: current line has '|', next line is a separator line (e.g. |---|---|)
    if (trimmed.includes("|") && i + 1 < lines.length && isSeparatorLine(lines[i + 1])) {
      const headers = splitRowCells(trimmed);
      let sepStr = lines[i + 1].trim();
      if (sepStr.startsWith("|")) sepStr = sepStr.substring(1);
      if (sepStr.endsWith("|")) sepStr = sepStr.substring(0, sepStr.length - 1);
      const sepCells = sepStr.split("|").map(c => c.trim());

      const alignments: ("left" | "center" | "right")[] = sepCells.map(cell => {
        if (cell.startsWith(":") && cell.endsWith(":")) return "center";
        if (cell.endsWith(":")) return "right";
        return "left";
      });

      const rows: string[][] = [];
      const startKey = i;
      i += 2; // Skip header and separator rows

      while (i < lines.length) {
        const rowLine = lines[i].trim();
        if (!rowLine || !rowLine.includes("|")) {
          break;
        }
        const cells = splitRowCells(rowLine);
        while (cells.length < headers.length) {
          cells.push("");
        }
        rows.push(cells);
        i++;
      }

      elements.push({
        type: "table",
        headers,
        alignments,
        rows,
        key: startKey
      });
      continue;
    }

    // Detect plain ASCII Diagram (box borders +---+, |...|, --->, [... ...])
    if (isDiagramLine(line) && i + 1 < lines.length && (isDiagramLine(lines[i + 1]) || !lines[i + 1].trim())) {
      const diagramLines: string[] = [line];
      const startKey = i;
      i++;
      while (i < lines.length) {
        if (isDiagramLine(lines[i]) || (!lines[i].trim() && i + 1 < lines.length && isDiagramLine(lines[i + 1]))) {
          diagramLines.push(lines[i]);
          i++;
        } else {
          break;
        }
      }
      if (diagramLines.filter(l => l.trim()).length >= 2) {
        elements.push({
          type: "diagram",
          text: diagramLines.join("\n"),
          key: startKey
        });
        continue;
      }
    }

    if (!trimmed) {
      elements.push({ type: "space", key: i });
      i++;
      continue;
    }

    const imgMatch = trimmed.match(/!\[([^\]]*)\]\((data:image\/[^)]+)\)/);
    if (imgMatch) {
      elements.push({ type: "image", alt: imgMatch[1], src: imgMatch[2], key: i });
      i++;
      continue;
    }

    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      elements.push({ type: "hr", key: i });
      i++;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      elements.push({ type: "h3", text: trimmed.replace("### ", ""), key: i });
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      elements.push({ type: "h2", text: trimmed.replace("## ", ""), key: i });
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      elements.push({ type: "h1", text: trimmed.replace("# ", ""), key: i });
      i++;
      continue;
    }

    if (trimmed.startsWith("#### ")) {
      elements.push({ type: "h4", text: trimmed.replace("#### ", ""), key: i });
      i++;
      continue;
    }

    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      elements.push({ type: "bullet", text: trimmed.substring(2), key: i });
      i++;
      continue;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push({ type: "numbered", number: numMatch[1], text: numMatch[2], key: i });
      i++;
      continue;
    }

    elements.push({ type: "paragraph", text: trimmed, key: i });
    i++;
  }

  return elements;
}

const ChatMarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const codeBlockRegex = /```([\s\S]*?)```/g;
  const blocks: { type: "code" | "markdown"; value: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: "markdown", value: content.substring(lastIndex, match.index) });
    }
    blocks.push({ type: "code", value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    blocks.push({ type: "markdown", value: content.substring(lastIndex) });
  }

  return (
    <div className="space-y-2 text-xs leading-relaxed text-slate-800 dark:text-slate-200 min-w-0 break-words overflow-hidden">
      {blocks.map((block, bIdx) => {
        if (block.type === "code") {
          const codeLines = block.value.trim().split("\n");
          const firstLine = codeLines[0] || "";
          const lang = /^[a-z0-9_-]+$/i.test(firstLine) ? firstLine : "";
          const rawCode = lang ? codeLines.slice(1).join("\n") : block.value.trim();

          return (
            <DiagramCodeBlock
              key={bIdx}
              rawCode={rawCode}
              lang={lang}
            />
          );
        }

        const lines = block.value.split("\n");
        const parsedElements = parseMarkdownContent(lines);

        return (
          <div key={bIdx} className="space-y-1.5 min-w-0 break-words">
            {parsedElements.map((elem) => {
              if (elem.type === "space") {
                return <div key={elem.key} className="h-0.5" />;
              }

              if (elem.type === "hr") {
                return <hr key={elem.key} className="my-2.5 border-slate-200 dark:border-slate-700/80" />;
              }

              if (elem.type === "diagram") {
                return (
                  <DiagramCodeBlock
                    key={elem.key}
                    rawCode={elem.text}
                    lang="ascii"
                  />
                );
              }

              if (elem.type === "image") {
                return (
                  <div key={elem.key} className="my-3 flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950/80 border border-slate-700/80 shadow-md">
                    <img src={elem.src} alt={elem.alt || "Slide Diagram"} className="max-h-[320px] max-w-full object-contain rounded-lg shadow-sm bg-white/5 p-1" />
                    {elem.alt && elem.alt !== "Slide Diagram" && (
                      <span className="text-[10px] text-slate-400 mt-1 italic text-center">{elem.alt}</span>
                    )}
                  </div>
                );
              }

              if (elem.type === "table") {
                return (
                  <MarkdownTableComponent
                    key={elem.key}
                    headers={elem.headers}
                    alignments={elem.alignments}
                    rows={elem.rows}
                  />
                );
              }

              if (elem.type === "h3") {
                return (
                  <h3 key={elem.key} className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 mt-2.5 mb-1 border-b border-slate-200 dark:border-slate-700/60 pb-1 break-words">
                    {renderFormattedText(elem.text)}
                  </h3>
                );
              }

              if (elem.type === "h2") {
                return (
                  <h2 key={elem.key} className="text-sm font-extrabold text-amber-600 dark:text-amber-400 mt-3 mb-1 border-b border-slate-200 dark:border-slate-700 pb-1 break-words">
                    {renderFormattedText(elem.text)}
                  </h2>
                );
              }

              if (elem.type === "h1") {
                return (
                  <h1 key={elem.key} className="text-base font-black text-amber-600 dark:text-amber-400 mt-3 mb-1 border-b border-slate-200 dark:border-slate-700 pb-1 break-words">
                    {renderFormattedText(elem.text)}
                  </h1>
                );
              }

              if (elem.type === "h4") {
                return (
                  <h4 key={elem.key} className="text-xs font-bold text-amber-500 dark:text-amber-300 mt-2 mb-0.5 break-words">
                    {renderFormattedText(elem.text)}
                  </h4>
                );
              }

              if (elem.type === "bullet") {
                return (
                  <div key={elem.key} className="flex items-start gap-1.5 pl-1 my-0.5 break-words min-w-0">
                    <span className="text-amber-500 dark:text-amber-400 font-bold text-[10px] mt-0.5 shrink-0">●</span>
                    <p className="flex-1 my-0 leading-relaxed break-words min-w-0">{renderFormattedText(elem.text)}</p>
                  </div>
                );
              }

              if (elem.type === "numbered") {
                return (
                  <div key={elem.key} className="flex items-start gap-1.5 pl-1 my-0.5 break-words min-w-0">
                    <span className="text-amber-500 dark:text-amber-400 font-bold shrink-0 text-xs">{elem.number}.</span>
                    <p className="flex-1 my-0 leading-relaxed break-words min-w-0">{renderFormattedText(elem.text)}</p>
                  </div>
                );
              }

              return (
                <p key={elem.key} className="my-0.5 leading-relaxed break-words min-w-0">
                  {renderFormattedText(elem.text)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

const MessageContentRenderer: React.FC<{
  text: string;
  role: "user" | "assistant";
}> = ({ text, role }) => {
  if (role === "user") {
    return <p className="whitespace-pre-wrap break-words select-text flex-1 min-w-0">{text}</p>;
  }

  return (
    <div className="select-text flex-1 min-w-0 space-y-2 break-words overflow-hidden">
      <ChatMarkdownRenderer content={text} />
    </div>
  );
};

const INITIAL_MESSAGE = {
  role: "assistant" as const,
  text: "Hello! I am your AI Smart Tutor. Ask me any question about the lecture notes—such as architecture explanations, cost calculations, or service comparisons!"
};

export const AiAssistantModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  contextText, 
  activeDocument, 
  isEmbedded = false,
  onNavigateToPage
}) => {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>(() => {
    try {
      const saved = localStorage.getItem("aws_ai_tutor_messages");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback to initial
    }
    return [INITIAL_MESSAGE];
  });
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const [isWide, setIsWide] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgIdx(idx);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
  };

  // Persist conversation history to local storage
  useEffect(() => {
    try {
      localStorage.setItem("aws_ai_tutor_messages", JSON.stringify(messages));
    } catch {
      // ignore storage errors
    }
  }, [messages]);

  // Auto scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleClearChat = () => {
    setMessages([INITIAL_MESSAGE]);
    try {
      localStorage.removeItem("aws_ai_tutor_messages");
    } catch {
      // ignore
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMsg,
          context: contextText,
          activeDocument
        })
      });

      const resText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch (parseErr) {
        data = { text: resText || "Received non-JSON response from server." };
      }

      if (res.ok && data.text) {
        setMessages(prev => [...prev, { role: "assistant", text: data.text }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", text: `Error: ${data.error || resText.slice(0, 150) || "Failed to communicate with AI Assistant."}` }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", text: "Failed to connect to AI Assistant server." }]);
    } finally {
      setLoading(false);
    }
  };

  const containerClasses = isEmbedded
    ? "w-full h-full flex flex-col bg-white dark:bg-slate-900 text-xs overflow-hidden"
    : `fixed inset-y-0 right-0 z-50 w-full ${isWide ? "sm:w-[680px] lg:w-[760px]" : "sm:w-[460px]"} max-w-full h-full max-h-[100dvh] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col text-xs transition-all duration-200`;

  return (
    <>
      {!isEmbedded && isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div className={containerClasses}>
        {/* Header */}
        <div className="p-3 sm:p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5 truncate">
                AI Smart Tutor
              </h3>
              <p className="text-[10px] text-slate-400 truncate">Ask questions grounded in your course notes</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isEmbedded && (
              <button
                type="button"
                onClick={() => setIsWide(!isWide)}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold transition-colors shrink-0 min-h-[36px]"
                title={isWide ? "Standard drawer width" : "Widen panel to view diagrams comfortably"}
              >
                {isWide ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isWide ? "Normal" : "Wide View"}</span>
              </button>
            )}

            {messages.length > 1 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 rounded-lg text-[11px] font-semibold transition-colors shrink-0 min-h-[36px]"
                title="Reset Chat History"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            <button 
              type="button"
              onClick={onClose} 
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors shrink-0 min-h-[36px]"
              title="Close AI Tutor Panel"
            >
              <X className="w-4 h-4" />
              <span className="sm:hidden text-xs">Close</span>
            </button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-3.5 bg-slate-50 dark:bg-slate-950/70 min-w-0">
          {messages.map((m, idx) => {
            const isCopied = copiedMsgIdx === idx;
            return (
              <div
                key={idx}
                className={`flex gap-2 group w-full min-w-0 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`p-3 sm:p-3.5 rounded-2xl max-w-[95%] sm:max-w-[92%] min-w-0 leading-relaxed text-xs relative break-words overflow-hidden ${
                    m.role === "user"
                      ? "bg-amber-500 text-slate-950 font-medium rounded-tr-none shadow-xs"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 w-full min-w-0">
                    <MessageContentRenderer 
                      text={m.text} 
                      role={m.role} 
                    />
                    <button
                      onClick={() => handleCopyMessage(m.text, idx)}
                      className={`p-1 rounded transition-colors shrink-0 mt-0.5 ${
                        m.role === "user"
                          ? "text-slate-900/60 hover:text-slate-950 hover:bg-black/10"
                          : "text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                      title="Copy response text"
                    >
                      {isCopied ? (
                        <Check className={`w-3.5 h-3.5 ${m.role === "user" ? "text-emerald-950" : "text-emerald-500"}`} />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center gap-2 text-slate-400 p-2.5 italic text-[11px] bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit border border-slate-200/50 dark:border-slate-700/50">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>AI is analyzing notes...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-2.5 sm:p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <input
            type="text"
            placeholder="Ask a question about these notes..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 border border-slate-200 dark:border-slate-700"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl disabled:opacity-40 hover:bg-amber-400 active:scale-95 transition-all shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px]"
            title="Send question"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
