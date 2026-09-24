import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  ChevronLeft, ChevronRight, ChevronDown, Search, Sparkles, 
  Download, HelpCircle, Layers, FileText, Bookmark, Grid, 
  RotateCcw, PanelLeft, Sun, Moon, X, Copy, Check,
  Upload, LayoutGrid, FolderCog, Edit3, Trash2, MessageSquare,
  Info, GitMerge, Volume2, List, Printer, Plus, Minus, ExternalLink
} from "lucide-react";
import { NoteDocument, NoteSection, ReadingSettings, UserBookmark } from "../types";
import { InteractiveDiagramRenderer } from "./InteractiveDiagrams";
import { CostCalculator } from "./CostCalculator";
import { CloudComparisonTable } from "./CloudComparisonTable";
import { AiAssistantModal } from "./AiAssistantModal";
import { FlashcardsQuiz } from "./FlashcardsQuiz";
import { FigureCard } from "./FigureCard";
import { PdfCanvasViewer } from "./PdfCanvasViewer";
import { DocumentSummaryModal } from "./DocumentSummaryModal";
import { DocumentRenameModal } from "./DocumentRenameModal";
import { DocumentDetailsModal } from "./DocumentDetailsModal";
import { DocumentMergeModal } from "./DocumentMergeModal";
import { TextToSpeechPlayer } from "./TextToSpeechPlayer";
import { DocumentOutlineDrawer } from "./DocumentOutlineDrawer";

interface Props {
  notes?: NoteDocument[];
  allDocuments?: NoteDocument[];
  document?: NoteDocument | null;
  isOpen?: boolean;
  onClose?: () => void;
  activeView?: string;
  setActiveView?: (view: string) => void;
  onSelectDocument?: (docId: string, openAiChat?: boolean) => void;
  activeSectionId?: string;
  setActiveSectionId?: (id: string) => void;
  settings?: ReadingSettings;
  setSettings?: React.Dispatch<React.SetStateAction<ReadingSettings>>;
  readingSettings?: ReadingSettings;
  onUpdateSettings?: (settings: ReadingSettings) => void;
  bookmarks?: UserBookmark[];
  onToggleBookmark?: (section: NoteSection, snippet: string) => void;
  onAddBookmark?: (section: NoteSection, snippet: string) => void;
  onRemoveBookmark?: (id: string) => void;
  onOpenSearch?: () => void;
  onOpenAiChat?: () => void;
  onCloseAiChat?: () => void;
  onToggleAiChat?: () => void;
  isAiChatOpen?: boolean;
  onOpenExport?: () => void;
  onOpenQuiz?: (docId?: string) => void;
  onUploadDocument?: (file: File) => void;
  onRenameDocument?: (docId: string, newTitle: string) => void;
  onDuplicateDocument?: (docId: string) => void;
  onMergeDocuments?: (mergedTitle: string, docIdsToMerge: string[]) => void;
  onDeleteDocument?: (docId: string) => void;
}

export const DocumentModalViewer: React.FC<Props> = ({
  notes: propsNotes,
  allDocuments,
  document: propDocument,
  isOpen = true,
  onClose,
  activeView: propsActiveView,
  setActiveView: propsSetActiveView,
  onSelectDocument,
  activeSectionId: propsActiveSectionId,
  setActiveSectionId: propsSetActiveSectionId,
  settings: propsSettings,
  setSettings: propsSetSettings,
  readingSettings,
  onUpdateSettings,
  bookmarks: propsBookmarks = [],
  onToggleBookmark,
  onAddBookmark,
  onRemoveBookmark,
  onOpenSearch = () => {},
  onOpenAiChat = () => {},
  onCloseAiChat,
  onToggleAiChat,
  isAiChatOpen,
  onOpenExport = () => {},
  onOpenQuiz,
  onUploadDocument,
  onRenameDocument,
  onDuplicateDocument,
  onMergeDocuments,
  onDeleteDocument
}) => {
  if (isOpen === false) return null;

  const notes = useMemo<NoteDocument[]>(() => {
    const list = propsNotes || allDocuments || (propDocument ? [propDocument] : []);
    return Array.isArray(list) ? list : [];
  }, [propsNotes, allDocuments, propDocument]);

  const [internalActiveView, setInternalActiveView] = useState<string>(() => {
    return propsActiveView || propDocument?.id || notes[0]?.id || "dashboard";
  });

  // Local state for AI side-by-side panel if not externally controlled
  const [internalAiChatOpen, setInternalAiChatOpen] = useState<boolean>(false);
  const effectiveAiChatOpen = isAiChatOpen !== undefined ? isAiChatOpen : internalAiChatOpen;

  const handleToggleAiPanel = () => {
    setInternalAiChatOpen(prev => !prev);
    if (onToggleAiChat) {
      onToggleAiChat();
    } else if (onOpenAiChat && onCloseAiChat) {
      if (effectiveAiChatOpen) onCloseAiChat();
      else onOpenAiChat();
    } else if (onOpenAiChat) {
      onOpenAiChat();
    }
  };

  const handleCloseAiPanel = () => {
    setInternalAiChatOpen(false);
    if (onCloseAiChat) {
      onCloseAiChat();
    } else if (onToggleAiChat && effectiveAiChatOpen) {
      onToggleAiChat();
    }
  };

  const activeView = propsActiveView || (propDocument ? propDocument.id : internalActiveView) || notes[0]?.id || "";

  const setActiveView = (view: string) => {
    if (view === "dashboard" && onClose) {
      onClose();
      return;
    }
    setInternalActiveView(view);
    if (propsSetActiveView) {
      propsSetActiveView(view);
    } else if (onSelectDocument) {
      onSelectDocument(view);
    }
  };

  const handleCloseViewer = () => {
    if (onClose) {
      onClose();
    } else {
      setActiveView("dashboard");
    }
  };

  // Track closed document tab IDs
  const [closedTabIds, setClosedTabIds] = useState<Set<string>>(new Set());

  // Automatically ensure the currently active document tab is not closed
  useEffect(() => {
    if (activeView && closedTabIds.has(activeView)) {
      setClosedTabIds(prev => {
        const next = new Set(prev);
        next.delete(activeView);
        return next;
      });
    }
  }, [activeView, closedTabIds]);

  // Handle closing a single document tab
  const handleCloseTab = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    
    setClosedTabIds(prev => {
      const next = new Set(prev);
      next.add(docId);
      return next;
    });

    // If the closed tab was currently active, switch to another visible tab or close viewer
    if (activeView === docId) {
      const remainingDocs = notes.filter(d => d.id !== docId && !closedTabIds.has(d.id));
      if (remainingDocs.length > 0) {
        const docIdx = notes.findIndex(d => d.id === docId);
        const nextDoc = remainingDocs.find((_, i) => i >= docIdx) || remainingDocs[remainingDocs.length - 1];
        setActiveView(nextDoc.id);
        setCurrentPage(1);
      } else {
        handleCloseViewer();
      }
    }
  };

  const [internalSectionId, setInternalSectionId] = useState<string>(() => propsActiveSectionId || "section-1");
  const activeSectionId = propsActiveSectionId || internalSectionId;
  const setActiveSectionId = (id: string) => {
    setInternalSectionId(id);
    if (propsSetActiveSectionId) {
      propsSetActiveSectionId(id);
    }
  };

  const settings = propsSettings || readingSettings || {
    fontSize: "medium",
    lineSpacing: "normal",
    fontFamily: "sans",
    focusMode: false,
    readingGoalMinutes: 15,
    highContrastMode: false,
    darkMode: true
  };

  const bookmarks = propsBookmarks;
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [showQuizModal, setShowQuizModal] = useState<boolean>(false);
  const [isContinuousScroll, setIsContinuousScroll] = useState<boolean>(true);
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"pdf" | "notes" | "split">("pdf");
  const [showFileActionsMenu, setShowFileActionsMenu] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showMergeModal, setShowMergeModal] = useState<boolean>(false);
  const [showTtsPlayer, setShowTtsPlayer] = useState<boolean>(false);
  const [showOutlineDrawer, setShowOutlineDrawer] = useState<boolean>(false);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState<boolean>(false);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<any>(null);

  const handleAttachPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDoc) return;
    setIsUploadingPdf(true);
    try {
      const fileContent: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/parse-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: "application/pdf",
          fileContent,
          title: activeDoc.title,
          subject: activeDoc.subject,
          unit: activeDoc.unit,
          unitNumber: activeDoc.unitNumber,
          unitTitle: activeDoc.unitTitle,
          courseCode: activeDoc.courseCode,
          uploadedBy: activeDoc.uploadedBy
        })
      });

      if (res.ok) {
        const data = await res.json();
        const newDoc: NoteDocument = data.document;
        if (newDoc) {
          activeDoc.pdfUrl = newDoc.pdfUrl;
          activeDoc.pdfDataUrl = newDoc.pdfDataUrl;
          activeDoc.fileFormat = "pdf";
          if (onUploadDocument) {
            onUploadDocument(file);
          }
          if (onSelectDocument) {
            onSelectDocument(newDoc.id);
          }
          setViewMode("pdf");
        }
      }
    } catch (err) {
      console.error("Failed to upload PDF:", err);
    } finally {
      setIsUploadingPdf(false);
      if (pdfFileInputRef.current) {
        pdfFileInputRef.current.value = "";
      }
    }
  };

  // Helper to expand any document into its full list of pages matching doc.pageCount
  const generateFullSectionsForDoc = (doc: NoteDocument): NoteSection[] => {
    const targetPageCount = Math.max(doc.pageCount || 1, doc.sections?.length || 1);
    const sectionMap = new Map<number, NoteSection>();
    
    (doc.sections || []).forEach((sec, idx) => {
      const pNum = sec.pageNumber || (idx + 1);
      sectionMap.set(pNum, sec);
    });

    const result: NoteSection[] = [];
    let lastSection = doc.sections?.[0];

    for (let p = 1; p <= targetPageCount; p++) {
      if (sectionMap.has(p)) {
        lastSection = sectionMap.get(p)!;
        result.push({
          ...lastSection,
          pageNumber: p
        });
      } else if (lastSection) {
        const docName = doc.shortTitle || doc.title;
        result.push({
          ...lastSection,
          id: `${doc.id}-p${p}`,
          pageNumber: p,
          title: lastSection.title ? `${lastSection.title} (Page ${p})` : `${docName} - Page ${p}`,
          subtitle: `Page ${p} of ${targetPageCount} • ${docName}`,
          contentMarkdown: lastSection.contentMarkdown
        });
      } else {
        const docName = doc.shortTitle || doc.title;
        result.push({
          id: `${doc.id}-p${p}`,
          pageNumber: p,
          title: `${docName} - Page ${p}`,
          subtitle: `Page ${p} of ${targetPageCount} • ${docName}`,
          contentMarkdown: `### ${docName} - Page ${p}\n\nAWS Technical Architecture & Module Specifications.`
        });
      }
    }

    return result;
  };

  // Track the active unit context (synced when a note is opened)
  const [currentUnitContext, setCurrentUnitContext] = useState<string>("Unit 1");

  // Extract all unique units from notes
  const allUnits = useMemo(() => {
    const list = Array.from(
      new Set(notes.map(n => n.unit?.trim()).filter((u): u is string => Boolean(u)))
    ).sort();
    return list.length > 0 ? list : ["Unit 1"];
  }, [notes]);

  // Group documents by unit
  const notesByUnit = useMemo(() => {
    const map: Record<string, NoteDocument[]> = {};
    notes.forEach((doc) => {
      const u = doc.unit?.trim() || "Unit 1";
      if (!map[u]) map[u] = [];
      map[u].push(doc);
    });
    return map;
  }, [notes]);

  // Find if activeView is a specific single document
  const singleDoc = useMemo(() => {
    return notes.find(n => n.id === activeView);
  }, [notes, activeView]);

  // Whenever a single doc is open, sync the unit context
  useEffect(() => {
    if (singleDoc && singleDoc.unit) {
      setCurrentUnitContext(singleDoc.unit.trim());
    }
  }, [singleDoc]);

  // Effective unit for the "All Files View"
  const effectiveUnit = useMemo(() => {
    if (activeView.startsWith("all-unit-")) {
      return activeView.replace("all-unit-", "");
    }
    if (singleDoc && singleDoc.unit) {
      return singleDoc.unit.trim();
    }
    if (currentUnitContext && notesByUnit[currentUnitContext]?.length) {
      return currentUnitContext;
    }
    return allUnits[0] || "Unit 1";
  }, [activeView, singleDoc, currentUnitContext, notesByUnit, allUnits]);

  // Virtual document for "All Files View" (combines all pages of the selected Unit or overall)
  const allFilesDoc: NoteDocument = useMemo(() => {
    const isGlobalAll = activeView === "all-files-everything";
    const targetDocs = isGlobalAll
      ? notes
      : (notesByUnit[effectiveUnit] && notesByUnit[effectiveUnit].length > 0
          ? notesByUnit[effectiveUnit]
          : notes);

    let globalPageCounter = 1;
    const combinedSections: NoteSection[] = [];

    targetDocs.forEach((doc) => {
      const docSections = generateFullSectionsForDoc(doc);
      docSections.forEach((sec) => {
        combinedSections.push({
          ...sec,
          id: `all-sec-${doc.id}-${globalPageCounter}`,
          pageNumber: globalPageCounter,
          title: `[${doc.shortTitle || doc.title}] ${sec.title}`,
          subtitle: `${isGlobalAll ? (doc.unit || "Unit") : effectiveUnit} • ${doc.shortTitle || doc.title} • Page ${sec.pageNumber}`
        });
        globalPageCounter++;
      });
    });

    const displayTitle = isGlobalAll
      ? `📚 All Course Notes (${targetDocs.length} Documents Combined)`
      : `📚 All ${effectiveUnit} Notes (${targetDocs.length} ${targetDocs.length === 1 ? 'Document' : 'Documents'} Combined)`;

    const displayShortTitle = isGlobalAll
      ? `All Course Files`
      : `All ${effectiveUnit} Files`;

    return {
      id: isGlobalAll ? "all-files-everything" : `all-unit-${effectiveUnit}`,
      title: displayTitle,
      shortTitle: displayShortTitle,
      description: `Combined continuous view containing all ${targetDocs.length} note files (${combinedSections.length} pages total) in ${isGlobalAll ? 'all course modules' : effectiveUnit}.`,
      pageCount: combinedSections.length,
      unit: effectiveUnit,
      sections: combinedSections,
      pdfUrl: targetDocs.length === 1 ? targetDocs[0].pdfUrl : undefined,
      pdfDataUrl: targetDocs.length === 1 ? targetDocs[0].pdfDataUrl : undefined,
    };
  }, [notes, effectiveUnit, notesByUnit, activeView]);

  const isAllFilesView = activeView === "all-files" || activeView === "combined" || activeView.startsWith("all-unit-") || activeView === "all-files-everything";

  const activeDoc = isAllFilesView
    ? allFilesDoc
    : (singleDoc || notes[0] || allFilesDoc);

  const isPptxDoc = Boolean(
    activeDoc?.fileFormat === "pptx" || 
    activeDoc?.fileFormat === "ppt" || 
    activeDoc?.title?.toLowerCase().endsWith(".pptx") || 
    activeDoc?.title?.toLowerCase().endsWith(".ppt") || 
    activeDoc?.originalFileName?.toLowerCase().endsWith(".pptx") || 
    activeDoc?.originalFileName?.toLowerCase().endsWith(".ppt") || 
    activeDoc?.downloadUrl?.toLowerCase().includes(".pptx") ||
    activeDoc?.downloadUrl?.toLowerCase().includes(".ppt") ||
    (activeDoc?.description && activeDoc.description.toLowerCase().includes("powerpoint")) ||
    (activeDoc?.sections?.[0]?.subtitle && activeDoc.sections[0].subtitle.toLowerCase().includes("powerpoint")) ||
    (activeDoc?.tags && activeDoc.tags.some(t => t.toLowerCase().includes("powerpoint") || t.toLowerCase() === "ppt" || t.toLowerCase() === "pptx")) ||
    (activeDoc?.slideImages && activeDoc.slideImages.length > 0)
  );

  const [slideDeckTheme, setSlideDeckTheme] = useState<"dark" | "light">("dark");
  const [pptViewerMode, setPptViewerMode] = useState<"slides" | "office" | "google">("office");

  const absolutePptUrl = useMemo(() => {
    if (typeof window === "undefined" || !activeDoc) return "";
    const rawPath = activeDoc.originalFileUrl || activeDoc.downloadUrl || `/api/file/${activeDoc.id}`;
    if (rawPath.startsWith("http")) return rawPath;
    return `${window.location.origin}${rawPath}`;
  }, [activeDoc]);

  const officeEmbedUrl = useMemo(() => {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absolutePptUrl)}&wdSlideIndex=${currentPage}#slide=${currentPage}`;
  }, [absolutePptUrl, currentPage]);

  const googleEmbedUrl = useMemo(() => {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(absolutePptUrl)}&embedded=true#page=${currentPage}`;
  }, [absolutePptUrl, currentPage]);

  useEffect(() => {
    if (!isPptxDoc && (activeDoc?.pdfUrl || activeDoc?.pdfDataUrl)) {
      setViewMode("pdf");
    } else {
      setViewMode("notes");
    }
  }, [activeView, isPptxDoc, activeDoc?.pdfUrl, activeDoc?.pdfDataUrl]);

  const handleCopyCode = (codeText: string, key: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeKey(key);
    setTimeout(() => setCopiedCodeKey(null), 2000);
  };

  const handlePrintDocument = () => {
    setIsContinuousScroll(true);
    setShowFileActionsMenu(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Get active sections for the active document or combined view
  const getActiveSections = (): NoteSection[] => {
    if (!activeDoc) return [];
    if (isAllFilesView || activeDoc.id.startsWith("all-") || activeDoc.id === "all-files" || activeDoc.id === "combined") {
      return activeDoc.sections || [];
    }
    return generateFullSectionsForDoc(activeDoc);
  };

  const activeSections = getActiveSections();
  const totalPages = activeSections.length;

  // Sync currentPage with activeSectionId
  useEffect(() => {
    const idx = activeSections.findIndex(s => s.id === activeSectionId);
    if (idx !== -1) {
      setCurrentPage(idx + 1);
    }
  }, [activeSectionId, activeView]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    const sec = activeSections[newPage - 1];
    if (sec) {
      setActiveSectionId(sec.id);
    }

    const container = pageContainerRef.current;
    if (!container) return;

    if (!isContinuousScroll) {
      // In Single Page mode: reset container scroll to top for the selected slide
      container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // In Continuous All Pages mode:
    const pageEl = window.document.getElementById(`doc-page-${newPage}`);
    if (pageEl) {
      isProgrammaticScrollRef.current = true;

      const scale = (zoomLevel || 100) / 100;
      const containerRect = container.getBoundingClientRect();
      const pageRect = pageEl.getBoundingClientRect();
      const relativeTop = (pageRect.top - containerRect.top) / scale;
      const targetScrollTop = container.scrollTop + relativeTop - 20;

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth"
      });

      // Secondary scrollIntoView call
      try {
        pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {
        // fallback
      }

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 750);

      pageEl.classList.add("ring-4", "ring-amber-500", "ring-offset-4", "transition-all", "duration-300");
      setTimeout(() => {
        pageEl.classList.remove("ring-4", "ring-amber-500", "ring-offset-4");
      }, 2500);
    } else {
      // Fallback: estimate position
      const estHeight = 720;
      container.scrollTo({
        top: Math.max(0, (newPage - 1) * estHeight),
        behavior: "smooth"
      });
    }
  };

  // Scroll listener for continuous scroll page sync
  useEffect(() => {
    if (!isContinuousScroll || !pageContainerRef.current) return;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      const container = pageContainerRef.current;
      if (!container) return;

      const containerTop = container.getBoundingClientRect().top;

      for (let i = 0; i < activeSections.length; i++) {
        const pageEl = window.document.getElementById(`doc-page-${i + 1}`);
        if (pageEl) {
          const rect = pageEl.getBoundingClientRect();
          if (rect.top <= containerTop + 250 && rect.bottom >= containerTop + 100) {
            setCurrentPage(i + 1);
            setActiveSectionId(activeSections[i].id);
            break;
          }
        }
      }
    };

    const containerEl = pageContainerRef.current;
    containerEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      containerEl.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [isContinuousScroll, activeSections, setActiveSectionId]);

  const currentSection = activeSections[currentPage - 1] || activeSections[0];

  // Key navigation (Left / Right arrow for pages, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (window.document.activeElement?.tagName === "INPUT" || window.document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      if (e.key === "Escape") {
        if (showQuizModal || showSummaryModal || showRenameModal || showDetailsModal || showMergeModal || showTtsPlayer || showOutlineDrawer) {
          return;
        }
        handleCloseViewer();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        handlePageChange(currentPage + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        handlePageChange(currentPage - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages, showQuizModal, showSummaryModal, showRenameModal, showDetailsModal, showMergeModal, showTtsPlayer, showOutlineDrawer]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1e1e1e] text-slate-100 overflow-hidden font-sans select-text">
      {/* Top Horizontal PDF Browser Tab Strip */}
      <div className="bg-[#18181c] border-b border-[#33333d] flex items-center justify-between shrink-0 text-xs z-30">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none px-2 pt-1.5 flex-1 min-w-0">
          {/* Unit All Files Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveView(`all-unit-${effectiveUnit}`);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg transition-all border-t border-x shrink-0 text-xs font-semibold cursor-pointer ${
              isAllFilesView
                ? "bg-[#28282c] text-amber-400 border-[#404048] font-bold shadow-xs"
                : "bg-[#1c1c20] text-slate-400 hover:text-amber-300 border-transparent hover:bg-[#232328]"
            }`}
            title={`View all ${effectiveUnit} notes in combined sequence`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>All {effectiveUnit} Notes</span>
          </button>

          {notes.filter(doc => !closedTabIds.has(doc.id)).map((doc) => {
            const isActive = doc.id === activeView;
            return (
              <div
                key={doc.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveView(doc.id);
                  setCurrentPage(1);
                }}
                className={`group flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-t-lg transition-all border-t border-x shrink-0 text-xs font-medium cursor-pointer max-w-[190px] sm:max-w-[240px] select-none ${
                  isActive
                    ? "bg-[#28282c] text-white border-[#404048] font-bold shadow-xs"
                    : "bg-[#1c1c20] text-slate-400 hover:text-slate-200 border-transparent hover:bg-[#232328]"
                }`}
                title={doc.title}
              >
                <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                <span className="truncate">{doc.shortTitle || doc.title}</span>
                {doc.unit && (
                  <span className="text-[9px] text-amber-400/90 bg-amber-500/10 px-1 py-0.2 rounded shrink-0">
                    {doc.unit}
                  </span>
                )}
                {/* Close Tab 'x' Button */}
                <button
                  type="button"
                  onClick={(e) => handleCloseTab(e, doc.id)}
                  className={`ml-1 p-0.5 rounded hover:bg-slate-700/90 hover:text-red-400 transition-colors shrink-0 cursor-pointer ${
                    isActive
                      ? "text-slate-400 hover:text-red-300 opacity-90 hover:opacity-100"
                      : "text-slate-500 opacity-0 group-hover:opacity-100 hover:opacity-100"
                  }`}
                  title={`Close ${doc.shortTitle || doc.title}`}
                  aria-label={`Close ${doc.title}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-[#28282c] rounded-md transition-colors shrink-0 ml-1 cursor-pointer"
            title="Open / Add Document"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Right Corner: Close File / Exit Viewer button pinned to right edge of tab bar */}
        <div className="flex items-center px-2 shrink-0 border-l border-[#33333d]/60 bg-[#18181c]">
          <button
            type="button"
            onClick={handleCloseViewer}
            className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-red-400 hover:bg-red-500/15 rounded-md transition-all cursor-pointer font-semibold text-xs border border-transparent hover:border-red-500/30"
            title="Close file and return to notes dashboard (Esc)"
            aria-label="Close file and return to notes dashboard"
          >
            <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>
      </div>

      {/* Top Document Preview Bar */}
      <header className="min-h-12 bg-[#242424] border-b border-[#383838] px-2.5 sm:px-4 py-1.5 flex items-center justify-between gap-2 shrink-0 z-20 text-xs flex-wrap sm:flex-nowrap">
        {/* Left: Dashboard Button, Sidebar Toggle, Document Icon & Note Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={handleCloseViewer}
            className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-lg text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
            title="Return to Main Dashboard"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="font-bold hidden xs:inline">Dashboard</span>
          </button>

          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-1.5 rounded-lg border border-[#383838] transition-colors shrink-0 ${
              showThumbnails ? "bg-amber-500/20 text-amber-400 border-amber-500/40" : "bg-[#18181a] text-slate-300 hover:text-white hover:bg-white/10"
            }`}
            title="Toggle Page Thumbnails Sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 shrink">
            {/* Note Selector Dropdown */}
            <div className="flex items-center relative">
              <select
                value={isAllFilesView ? (activeView === "all-files-everything" ? "all-files-everything" : `all-unit-${effectiveUnit}`) : activeView}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith("all-unit-")) {
                    const u = val.replace("all-unit-", "");
                    setCurrentUnitContext(u);
                  }
                  setActiveView(val);
                  setCurrentPage(1);
                }}
                className="bg-[#18181b] text-amber-400 font-extrabold border border-[#3a3a3c] hover:border-amber-500/50 rounded-lg pl-2.5 sm:pl-3 pr-6 sm:pr-7 py-1 sm:py-1.5 text-[11px] sm:text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 appearance-none shadow-inner max-w-[140px] xs:max-w-[190px] sm:max-w-[280px] md:max-w-[360px] truncate"
              >
                {/* Unit All Files Options */}
                <optgroup label="📚 All Files (Combined by Unit)" className="bg-[#18181c] text-amber-400 font-bold">
                  {allUnits.map((u) => {
                    const count = notesByUnit[u]?.length || 0;
                    return (
                      <option key={`all-unit-${u}`} value={`all-unit-${u}`} className="bg-[#2c2c2c] text-amber-400 font-bold">
                        📚 All {u} Notes ({count} {count === 1 ? 'File' : 'Files'})
                      </option>
                    );
                  })}
                  {allUnits.length > 1 && (
                    <option value="all-files-everything" className="bg-[#2c2c2c] text-amber-300 font-semibold">
                      📚 All Course Notes (All Units Combined)
                    </option>
                  )}
                </optgroup>

                {/* Individual Notes grouped by Unit */}
                {allUnits.map((unitName) => {
                  const unitDocs = notesByUnit[unitName] || [];
                  if (unitDocs.length === 0) return null;
                  return (
                    <optgroup key={unitName} label={`📁 ${unitName}`} className="bg-[#18181c] text-slate-300 font-semibold">
                      {unitDocs.map((n) => (
                        <option key={n.id} value={n.id} className="bg-[#2c2c2c] text-white font-medium">
                          {n.shortTitle || n.title}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-amber-400 absolute right-1.5 sm:right-2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Center: Interactive Mode Indicator */}
        {!(activeDoc?.pdfUrl || activeDoc?.pdfDataUrl) && (
          <div className="hidden lg:flex items-center gap-2 text-xs text-amber-400 font-medium bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Interactive Visualizer Active</span>
          </div>
        )}

        {/* Right Tools: Ask AI & Close Button */}
        <div className="flex items-center gap-2 shrink-0">
          {isPptxDoc && (
            <a
              href={activeDoc?.downloadUrl || activeDoc?.originalFileUrl || `/api/download/${activeDoc?.id}`}
              download={activeDoc?.originalFileName || `${activeDoc?.title || "presentation"}.pptx`}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all shadow-md bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 cursor-pointer"
              title="Download original untouched PowerPoint presentation (.pptx)"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline">Download PPT</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleToggleAiPanel}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all shadow-md cursor-pointer ${
              effectiveAiChatOpen 
                ? "bg-amber-400 text-slate-950 ring-2 ring-amber-300/60 font-extrabold" 
                : "bg-amber-500 hover:bg-amber-400 text-slate-950"
            }`}
            title={effectiveAiChatOpen ? "Close AI Side Panel" : "Ask AI Tutor (Side-by-side with notes)"}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI</span>
          </button>

          {/* Close Document Viewer Button */}
          <button
            type="button"
            onClick={handleCloseViewer}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all shadow-md bg-[#2d2d32] hover:bg-red-500/20 text-slate-200 hover:text-red-300 border border-[#3e3e46] hover:border-red-500/40 cursor-pointer group"
            title="Close file and return to notes portal (Esc)"
            aria-label="Close document"
          >
            <X className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-400 transition-colors" />
            <span>Close</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Page Thumbnails Drawer / Sidebar */}
        {showThumbnails && activeView !== "quiz" && (
          <>
            {/* Dark Backdrop on mobile to close drawer when tapping outside */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 sm:hidden"
              onClick={() => setShowThumbnails(false)}
            />
            <aside className="fixed inset-y-0 left-0 top-14 w-64 sm:static sm:w-56 bg-[#252526] border-r border-[#3c3c3c] flex flex-col shrink-0 z-40 sm:z-10 shadow-2xl sm:shadow-none transition-all">
              <div className="p-3 border-b border-[#3c3c3c] flex items-center justify-between text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-amber-500" /> {isPptxDoc ? "Slide Thumbnails" : "Page Thumbnails"}
                </span>
                <span className="text-[11px] text-slate-500">{totalPages} {isPptxDoc ? "Slides" : "Pages"}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Saved Bookmarks Section if any exist */}
                {bookmarks.length > 0 && (
                  <div className="mb-4 pb-3 border-b border-[#383838] space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
                      <span className="flex items-center gap-1">
                        <Bookmark className="w-3.5 h-3.5 fill-amber-400" /> Bookmarks ({bookmarks.length})
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {bookmarks.map((b) => (
                        <div
                          key={b.id}
                          className="p-2 rounded bg-[#1e1e1e] border border-amber-500/30 flex items-center justify-between gap-2 group hover:border-amber-500 transition-colors"
                        >
                          <button
                            onClick={() => {
                              const bIdx = activeSections.findIndex(s => s.id === b.sectionId);
                              if (bIdx !== -1) {
                                handlePageChange(bIdx + 1);
                                if (window.innerWidth < 640) setShowThumbnails(false);
                              }
                            }}
                            className="text-left flex-1 min-w-0"
                          >
                            <div className="text-xs font-medium text-slate-200 truncate">{b.sectionTitle}</div>
                            <div className="text-[10px] text-amber-400/80 font-mono">Jump to page</div>
                          </button>
                          <button
                            onClick={() => onRemoveBookmark?.(b.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-950/40 transition-colors shrink-0"
                            title="Remove Bookmark"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSections.map((sec, idx) => {
                  const pageNum = idx + 1;
                  const isSelected = pageNum === currentPage;
                  const isBookmarked = bookmarks.some(b => b.sectionId === sec.id);
                  return (
                    <div
                      key={sec.id}
                      onClick={() => {
                        handlePageChange(pageNum);
                        if (window.innerWidth < 640) setShowThumbnails(false);
                      }}
                      className={`w-full text-left p-2.5 rounded border transition-all flex flex-col gap-1 relative cursor-pointer hover:border-amber-500/80 ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500 text-amber-300 shadow-sm"
                          : "bg-[#1e1e1e] border-[#383838] text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full text-[11px] font-mono pointer-events-none">
                        <span
                          className={`font-bold ${isSelected ? "text-amber-400" : "text-slate-400"}`}
                        >
                          {isPptxDoc ? "Slide" : "Page"} {pageNum}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleBookmark) {
                              onToggleBookmark(sec, sec.title);
                            } else if (isBookmarked && onRemoveBookmark) {
                              const b = bookmarks.find(bm => bm.sectionId === sec.id);
                              if (b) onRemoveBookmark(b.id);
                            } else {
                              onAddBookmark?.(sec, sec.title);
                            }
                          }}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors pointer-events-auto"
                          title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "text-amber-400 fill-amber-400" : ""}`} />
                        </button>
                      </div>
                      <div
                        className="text-left text-xs font-medium line-clamp-2 leading-tight text-slate-300 group-hover:text-white pointer-events-none"
                      >
                        {sec.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </>
        )}

        {/* Center Canvas / Document Paper Sheet */}
        <main 
          ref={pageContainerRef}
          className="flex-1 min-w-0 overflow-auto bg-[#e5e7eb] dark:bg-[#1a1a1e] p-2 sm:p-8 flex justify-center items-start relative"
        >
          {activeView === "quiz" ? (
            <div className="w-full max-w-3xl my-6">
              {/* Quiz view handled inside main container */}
            </div>
          ) : !isPptxDoc && viewMode === "pdf" && (activeDoc?.pdfUrl || activeDoc?.pdfDataUrl) ? (
            /* High-Fidelity PDF Canvas Viewer — All Figures & Diagrams Intact */
            <div className="w-full h-full flex flex-col items-center justify-center p-1 sm:p-2">
              <div className="w-full max-w-6xl h-[calc(100vh-5.5rem)]">
                <PdfCanvasViewer
                  pdfUrl={activeDoc.pdfUrl}
                  pdfDataUrl={activeDoc.pdfDataUrl}
                  currentPage={currentPage}
                  onPageChange={(p) => setCurrentPage(p)}
                  documentTitle={activeDoc.title}
                />
              </div>
            </div>
          ) : !isPptxDoc && viewMode === "split" && (activeDoc?.pdfUrl || activeDoc?.pdfDataUrl) ? (
            /* Split View: Side-by-side Original PDF Canvas and AI Notes */
            <div className="w-full h-[calc(100vh-5.5rem)] grid grid-cols-1 lg:grid-cols-2 gap-4 p-2 sm:p-4 overflow-hidden">
              <div className="h-full overflow-hidden">
                <PdfCanvasViewer
                  pdfUrl={activeDoc.pdfUrl}
                  pdfDataUrl={activeDoc.pdfDataUrl}
                  currentPage={currentPage}
                  onPageChange={(p) => setCurrentPage(p)}
                  documentTitle={activeDoc.title}
                />
              </div>
              <div className="h-full overflow-y-auto p-6 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-300 font-sans text-xs sm:text-[14px]">
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">AI Extracted Page Notes</div>
                <h2 className="text-lg font-bold mb-4 border-b pb-2 text-slate-900">
                  {activeSections[currentPage - 1]?.title || `Page ${currentPage}`}
                </h2>
                <PaperMarkdownRenderer content={activeSections[currentPage - 1]?.contentMarkdown || ""} />
              </div>
            </div>
          ) : (
            <div 
              className="transition-all duration-150 ease-out my-2 sm:my-4 w-full flex flex-col items-center"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
            >
              {/* Native PowerPoint Presentation Web Embed (Only the PPT) */}
              {isPptxDoc && (pptViewerMode === "office" || pptViewerMode === "google") ? (
                <div className="w-full max-w-[1280px] h-[calc(100vh-6.5rem)] min-h-[640px] bg-slate-950 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col mb-4">
                  <div className="bg-[#111927] border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="font-semibold text-slate-200 truncate max-w-xs sm:max-w-sm">
                        {activeDoc.title}
                      </span>
                    </div>

                    {/* Direct Slide Navigation Controls synced with Thumbnails */}
                    <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-700/60 font-mono text-[11px]">
                      <button
                        type="button"
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                        className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white cursor-pointer transition-colors"
                        title="Previous Slide"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-1.5 font-bold text-amber-400">
                        Slide {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white cursor-pointer transition-colors"
                        title="Next Slide"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30 text-[11px] font-semibold text-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        Office Live
                      </div>
                      <a
                        href={officeEmbedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium hover:underline text-xs"
                        title="Open in Fullscreen Tab"
                      >
                        <span>Fullscreen</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                  <iframe
                    key={`office-${currentPage}`}
                    src={officeEmbedUrl}
                    className="w-full flex-1 border-0 bg-slate-950"
                    title={`PowerPoint Presentation - Slide ${currentPage}`}
                    allowFullScreen
                  />
                </div>
              ) : null}

              {(!isPptxDoc || pptViewerMode === "slides") && (isContinuousScroll ? (
                /* Continuous All Pages Presentation Slide Deck Stack */
                <div id="doc-page-container" className="flex flex-col items-center gap-8 sm:gap-12 w-full pb-20">
                  {activeSections.map((sec, idx) => {
                    const pageNum = idx + 1;
                    const isBookmarked = bookmarks.some(b => b.sectionId === sec.id);
                    const visualSlideImg = sec.slideImageUrl || (activeDoc?.slideImages && activeDoc.slideImages[idx]);
                    return (
                      <PresentationSlideCard
                        key={sec.id}
                        sec={sec}
                        pageNum={pageNum}
                        totalPages={totalPages}
                        docTitle={activeDoc ? activeDoc.title : "Study Notes"}
                        shortTitle={activeDoc ? (activeDoc.shortTitle || activeDoc.title) : "Slide Deck"}
                        isBookmarked={isBookmarked}
                        isDarkMode={slideDeckTheme === "dark"}
                        slideImageUrl={visualSlideImg}
                        onToggleBookmark={() => {
                          if (onToggleBookmark) {
                            onToggleBookmark(sec, sec.title);
                          } else {
                            onAddBookmark?.(sec, sec.title);
                          }
                        }}
                        copiedCodeKey={copiedCodeKey}
                        handleCopyCode={handleCopyCode}
                      />
                    );
                  })}
                </div>
              ) : (
                /* Single Page Presentation Slide */
                currentSection && (
                  <PresentationSlideCard
                    sec={currentSection}
                    pageNum={currentPage}
                    totalPages={totalPages}
                    docTitle={activeDoc ? activeDoc.title : "Study Notes"}
                    shortTitle={activeDoc ? (activeDoc.shortTitle || activeDoc.title) : "Slide Deck"}
                    isBookmarked={bookmarks.some(b => b.sectionId === currentSection.id)}
                    isDarkMode={slideDeckTheme === "dark"}
                    slideImageUrl={currentSection.slideImageUrl || (activeDoc?.slideImages && activeDoc.slideImages[currentPage - 1])}
                    onToggleBookmark={() => {
                      if (onToggleBookmark) {
                        onToggleBookmark(currentSection, currentSection.title);
                      } else {
                        onAddBookmark?.(currentSection, currentSection.title);
                      }
                    }}
                    copiedCodeKey={copiedCodeKey}
                    handleCopyCode={handleCopyCode}
                  />
                )
              ))}
            </div>
          )}

          {/* Floating Page Badge Overlay Bottom Left (Matching Screenshot) */}
          {activeView !== "quiz" && viewMode !== "pdf" && (
            <div className="fixed bottom-6 left-6 z-30 flex items-center gap-2 bg-white/95 dark:bg-[#202025]/95 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#383842] shadow-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#121215] border border-slate-300 dark:border-[#3a3a42] font-extrabold text-slate-900 dark:text-white">
                {isPptxDoc ? `Slide ${currentPage}` : currentPage}
              </span>
              <span className="text-slate-400">{isPptxDoc ? `of ${totalPages}` : totalPages}</span>
            </div>
          )}


        </main>

        {/* Right Side Panel: AI AWS Tutor (Slide-in on Mobile, True Side-by-Side Docked Panel on Tablet & Desktop) */}
        <>
          {/* Dark Backdrop for Mobile */}
          {effectiveAiChatOpen && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 sm:hidden"
              onClick={handleCloseAiPanel}
            />
          )}
          <aside className={`${effectiveAiChatOpen ? "flex" : "hidden"} fixed inset-y-0 right-0 z-50 w-full sm:static sm:z-20 sm:w-[380px] md:w-[420px] lg:w-[460px] xl:w-[500px] border-l border-[#3c3c3c] bg-white dark:bg-slate-900 shrink-0 h-full flex-col shadow-2xl transition-all`}>
            <AiAssistantModal
              isOpen={effectiveAiChatOpen}
              onClose={handleCloseAiPanel}
              contextText={activeSections.map(s => `[Page ${s.pageNumber} - ${s.title}]: ${s.contentMarkdown}`).join("\n\n")}
              activeDocument={activeDoc}
              isEmbedded={true}
              onNavigateToPage={handlePageChange}
            />
          </aside>
        </>
      </div>

      {/* Note-Specific Practice Quiz Modal Overlay */}
      {(showQuizModal || activeView === "quiz") && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl my-auto relative">
            <FlashcardsQuiz
              selectedNote={notes.find(n => n.id === activeView) || null}
              allNotes={notes}
              onSelectNote={(noteId) => {
                setActiveView(noteId);
              }}
              onClose={() => {
                setShowQuizModal(false);
                if (activeView === "quiz") {
                  setActiveView(notes[0]?.id || "dashboard");
                }
              }}
            />
          </div>
        </div>
      )}

      {/* AI Summary Modal */}
      <DocumentSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        document={activeDoc || null}
        onOpenQuiz={() => setShowQuizModal(true)}
        onOpenAiChat={onOpenAiChat}
      />

      {/* Rename Document Modal */}
      <DocumentRenameModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        document={activeDoc || null}
        onRename={(docId, newTitle) => {
          if (onRenameDocument) {
            onRenameDocument(docId, newTitle);
          }
        }}
      />

      {/* File Inspector Details Modal */}
      <DocumentDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        document={activeDoc || null}
      />

      {/* Merge Documents Modal */}
      <DocumentMergeModal
        isOpen={showMergeModal}
        onClose={() => setShowMergeModal(false)}
        notes={notes}
        activeDoc={activeDoc || null}
        onMerge={(mergedTitle, docIdsToMerge) => {
          if (onMergeDocuments) {
            onMergeDocuments(mergedTitle, docIdsToMerge);
          }
        }}
      />

      {/* Text To Speech Read Aloud Player */}
      {showTtsPlayer && activeDoc && (
        <TextToSpeechPlayer
          textToRead={activeDoc.sections?.[currentPage - 1]?.contentMarkdown || activeDoc.description || activeDoc.title}
          pageTitle={`${activeDoc.title} — Page ${currentPage}`}
          onClose={() => setShowTtsPlayer(false)}
        />
      )}

      {/* Section Outline Drawer */}
      <DocumentOutlineDrawer
        isOpen={showOutlineDrawer}
        onClose={() => setShowOutlineDrawer(false)}
        document={activeDoc || null}
        currentPage={currentPage}
        onSelectPage={(p) => setCurrentPage(p)}
      />

      {/* Hidden File Inputs for Opening / Adding Document & Attaching Original PDF */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.md"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (onUploadDocument) {
            onUploadDocument(file);
          }
          e.target.value = "";
        }}
      />
      <input
        type="file"
        ref={pdfFileInputRef}
        accept=".pdf"
        className="hidden"
        onChange={handleAttachPdf}
      />
    </div>
  );
};

/* Presentation Slide Card Component matching high-fidelity slide deck design */
interface PresentationSlideCardProps {
  sec: NoteSection;
  pageNum: number;
  totalPages: number;
  docTitle: string;
  shortTitle: string;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  copiedCodeKey: string | null;
  handleCopyCode: (code: string, key: string) => void;
  isDarkMode?: boolean;
  slideImageUrl?: string;
}

const PresentationSlideCard: React.FC<PresentationSlideCardProps> = ({
  sec,
  pageNum,
  totalPages,
  docTitle,
  shortTitle,
  isBookmarked,
  onToggleBookmark,
  copiedCodeKey,
  handleCopyCode,
  isDarkMode = true,
  slideImageUrl
}) => {
  const visualSlideUrl = slideImageUrl || sec.slideImageUrl;

  // Render high-resolution exact visual presentation slide matching the original PowerPoint file
  if (visualSlideUrl) {
    return (
      <div
        id={`doc-page-${pageNum}`}
        className="w-full sm:w-[980px] max-w-full sm:max-w-[95vw] bg-[#0c121e] text-white shadow-2xl border border-slate-700/80 rounded-2xl overflow-hidden relative font-sans transition-all scroll-mt-6 mb-6 flex flex-col group"
      >
        {/* Top Header Row with Slide Details */}
        <div className="bg-[#151e2e] border-b border-slate-700/80 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/25">
              Slide {pageNum}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400 font-medium">{totalPages}</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-200 font-semibold truncate max-w-[200px] sm:max-w-md hidden sm:inline">
              {sec.title || docTitle}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleBookmark}
              className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title={isBookmarked ? "Remove bookmark" : "Bookmark this slide"}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "text-amber-400 fill-amber-400" : ""}`} />
              <span className="hidden sm:inline">{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
            </button>
          </div>
        </div>

        {/* High-Resolution Slide Image (Exact Visual Copy of Original PowerPoint Slide) */}
        <div className="w-full aspect-[16/9] relative bg-black flex items-center justify-center overflow-hidden">
          <img
            src={visualSlideUrl}
            alt={`Slide ${pageNum}: ${sec.title || "PowerPoint Slide"}`}
            className="w-full h-full object-contain select-none"
            loading={pageNum <= 3 ? "eager" : "lazy"}
          />
        </div>

        {/* Bottom Bar */}
        <div className="px-4 sm:px-6 py-2 border-t border-slate-800 bg-[#0f1724] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="truncate pr-2">{docTitle || `Slide ${pageNum}`}</span>
          <span>Original PPT Slide {pageNum} of {totalPages}</span>
        </div>
      </div>
    );
  }

  const isTitleSlide = pageNum === 1 || sec.pageNumber === 1;

  if (isTitleSlide) {
    return (
      <div
        id={`doc-page-${pageNum}`}
        className="w-full sm:w-[840px] max-w-full sm:max-w-[95vw] min-h-[460px] sm:min-h-[640px] bg-[#1a2332] text-white shadow-2xl border border-slate-700/80 rounded-2xl p-4 sm:p-8 md:p-12 relative overflow-hidden font-sans leading-relaxed transition-all scroll-mt-6 flex flex-col justify-between"
      >
        {/* Background Decorative Graphic Curve */}
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-[#222f42] opacity-60 pointer-events-none blur-md" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#1e2a3c] opacity-80 pointer-events-none" />

        <div className="relative z-10">
          {/* Top Header Row */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#232f42] border border-[#34445d] flex items-center justify-center shadow-md shrink-0">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={onToggleBookmark}
                className="p-2 rounded-xl bg-[#232f42] hover:bg-[#2e3e57] text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-xs min-h-[36px]"
                title={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? "text-amber-400 fill-amber-400" : ""}`} />
                <span className="hidden sm:inline">{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
              </button>
            </div>
          </div>

          {/* Category Eyebrow */}
          <div className="text-amber-400 font-bold uppercase tracking-widest text-[11px] sm:text-xs mb-2 sm:mb-3">
            {sec.subtitle || shortTitle || "PRESENTATION DECK"}
          </div>

          {/* Title */}
          <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-3">
            {sec.title}
          </h1>

          {/* Description Content */}
          <div className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed mb-6 sm:mb-8 max-w-3xl font-normal">
            <PaperMarkdownRenderer content={sec.contentMarkdown} isDark={true} />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 sm:pt-4 border-t border-[#2d3a50] flex items-center justify-between text-xs text-slate-400 font-mono relative z-10 mt-4">
          <span className="truncate pr-2">{docTitle || "Slide 1"}</span>
          <span>1 / {totalPages}</span>
        </div>
      </div>
    );
  }

  // Content Slide (Supports both Dark Slide Deck & Light Document modes)
  return (
    <div
      id={`doc-page-${pageNum}`}
      className={`w-full sm:w-[840px] max-w-full sm:max-w-[95vw] min-h-[460px] sm:min-h-[640px] ${
        isDarkMode
          ? "bg-[#0b1329] text-slate-100 border-[#1e293b] shadow-black/80"
          : "bg-[#f8fafc] text-slate-900 border-slate-200 shadow-slate-300/40"
      } shadow-2xl border rounded-2xl p-4 sm:p-8 md:p-12 relative font-sans leading-relaxed transition-all scroll-mt-6 flex flex-col justify-between`}
    >
      <div>
        {/* Top Eyebrow & Bookmark */}
        <div className="flex items-center justify-between mb-3">
          <div className={`${isDarkMode ? "text-amber-400" : "text-amber-600"} font-bold uppercase tracking-widest text-[11px] sm:text-xs`}>
            {sec.subtitle || `SLIDE ${pageNum} OF ${totalPages}`}
          </div>
          <button
            onClick={onToggleBookmark}
            className={`p-1.5 sm:p-2 rounded-lg ${
              isDarkMode
                ? "bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-amber-400"
                : "bg-slate-200/80 hover:bg-slate-300 text-slate-600 hover:text-amber-600"
            } transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer min-h-[36px]`}
            title={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? (isDarkMode ? "text-amber-400 fill-amber-400" : "text-amber-500 fill-amber-500") : ""}`} />
            <span className="hidden sm:inline">{isBookmarked ? "Bookmarked" : "Bookmark"}</span>
          </button>
        </div>

        {/* Title */}
        <h1 className={`font-sans text-xl sm:text-3xl md:text-4xl font-extrabold ${isDarkMode ? "text-white" : "text-slate-900"} tracking-tight leading-snug mb-4 sm:mb-6`}>
          {sec.title}
        </h1>

        {/* Content Markdown */}
        <div className="space-y-4 font-normal text-sm sm:text-base">
          <PaperMarkdownRenderer content={sec.contentMarkdown} isDark={isDarkMode} />
        </div>

        {/* Callout Boxes */}
        {(() => {
          const validCallouts = (sec.callouts || []).filter(
            c => c && c.content && c.content.trim().length > 3 && 
            !c.title?.toLowerCase().includes("presenter") && 
            !c.title?.toLowerCase().includes("speaker") &&
            !/^\s*\d+\s*$/.test(c.content.trim())
          );
          if (validCallouts.length === 0) return null;
          return (
            <div className="my-6 space-y-3">
              {validCallouts.map((call, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${
                    isDarkMode
                      ? "border-amber-500/40 bg-amber-950/30 text-amber-200"
                      : "border-amber-300/80 bg-amber-50/80 text-slate-900"
                  } text-xs sm:text-sm space-y-1 shadow-xs`}
                >
                  <div className={`font-bold ${isDarkMode ? "text-amber-300" : "text-amber-900"}`}>{call.title}</div>
                  <p className={`${isDarkMode ? "text-slate-200" : "text-slate-800"} leading-relaxed`}>{call.content}</p>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Code Blocks */}
        {sec.codeBlocks && sec.codeBlocks.length > 0 && (
          <div className="my-6 space-y-3">
            {sec.codeBlocks.map((code, idx) => {
              const codeKey = `${sec.id}-code-${idx}`;
              const isCopied = copiedCodeKey === codeKey;
              return (
                <div key={idx} className="p-4 rounded-xl bg-slate-900 text-sky-300 font-mono text-xs sm:text-sm overflow-x-auto relative group shadow-lg">
                  <div className="text-slate-400 text-[10px] uppercase font-bold mb-2 border-b border-slate-800 pb-1 flex items-center justify-between">
                    <span>{code.description || code.language}</span>
                    <button
                      onClick={() => handleCopyCode(code.code, codeKey)}
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                      title="Copy code snippet"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap select-text">{code.code}</pre>
                </div>
              );
            })}
          </div>
        )}

        {/* Diagrams */}
        {sec.diagrams && sec.diagrams.length > 0 && (
          <div className="my-6 overflow-x-auto">
            {sec.diagrams.map((diag) => (
              <InteractiveDiagramRenderer key={diag.id} diagram={diag} />
            ))}
          </div>
        )}

        {/* Tables */}
        {sec.tables && sec.tables.length > 0 && (
          <div className="my-6 space-y-6">
            {sec.tables.map((tbl) => {
              if (tbl.interactiveType === "billing-calculator") {
                return <CostCalculator key={tbl.id} />;
              }
              if (tbl.interactiveType === "comparison-matrix") {
                return <CloudComparisonTable key={tbl.id} table={tbl} />;
              }
              return (
                <div key={tbl.id} className="border border-slate-300 rounded-xl overflow-hidden text-xs sm:text-sm shadow-xs">
                  <div className="p-3 bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                    {tbl.title}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[300px]">
                      <thead>
                        <tr className="bg-slate-800 text-white">
                          {tbl.headers.map((h) => (
                            <th key={h} className="p-2.5 font-semibold text-xs">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {tbl.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2.5 text-xs">{cell}</td>
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
      </div>

      {/* Footer */}
      <div className={`pt-3 sm:pt-4 border-t ${isDarkMode ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"} flex items-center justify-between text-xs font-mono relative z-10 mt-6`}>
        <span className="truncate pr-2">{docTitle || "Slide"}</span>
        <span>{pageNum} / {totalPages}</span>
      </div>
    </div>
  );
};

/* Paper Markdown Renderer for Document View */
const PaperMarkdownRenderer: React.FC<{ content: string; isDark?: boolean }> = ({ content, isDark = false }) => {
  const lines = content.split("\n");

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
        const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imgMatch) {
          const alt = imgMatch[1];
          const src = imgMatch[2];
          return (
            <div key={idx} className="my-4 flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/60 border border-slate-700/60 shadow-md">
              <img src={src} alt={alt || "Slide Figure"} className="max-h-[380px] max-w-full object-contain rounded-lg shadow-sm" />
              {alt && alt !== "Slide Diagram" && alt !== "Slide Figure" && (
                <span className="text-[11px] text-slate-400 mt-1 italic text-center">{alt}</span>
              )}
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

  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className={`font-bold ${isDark ? "text-white" : "text-slate-950"}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
