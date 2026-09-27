import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  ChevronLeft, ChevronRight, Play, Maximize2, Minimize2, 
  ZoomIn, ZoomOut, RotateCcw, Download, X, Layers, 
  Grid, FileText, Sparkles, Printer, Bookmark, PanelLeft,
  Tv, Radio, Volume2, ArrowLeft, MessageSquareQuote, ChevronDown
} from "lucide-react";
import { NoteDocument, NoteSection } from "../types";
import { PaperMarkdownRenderer } from "./PaperMarkdownRenderer";

interface PptReaderProps {
  doc: NoteDocument;
  initialSlide?: number;
  onClose?: () => void;
  onSwitchToNotes?: () => void;
  onSwitchToPdf?: () => void;
  onToggleAiPanel?: () => void;
  isAiPanelOpen?: boolean;
  allUnits?: string[];
  notesByUnit?: Record<string, NoteDocument[]>;
  activeView?: string;
  setActiveView?: (view: string) => void;
  setCurrentUnitContext?: (unit: string) => void;
  isAllFilesView?: boolean;
  effectiveUnit?: string;
}

export const PptReader: React.FC<PptReaderProps> = ({
  doc,
  initialSlide = 1,
  onClose,
  onSwitchToNotes,
  onSwitchToPdf,
  onToggleAiPanel,
  isAiPanelOpen = false,
  allUnits = ["Unit 1"],
  notesByUnit = {},
  activeView = "",
  setActiveView,
  setCurrentUnitContext,
  isAllFilesView = false,
  effectiveUnit = "Unit 1",
}) => {
  const sections = doc.sections || [];
  const totalSlides = Math.max(doc.pageCount || 1, sections.length || 1);
  const [currentSlide, setCurrentSlide] = useState<number>(Math.min(Math.max(1, initialSlide), totalSlides));
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [showSlideNotes, setShowSlideNotes] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLaserActive, setIsLaserActive] = useState<boolean>(false);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [bookmarkedSlides, setBookmarkedSlides] = useState<Set<number>>(new Set());

  const stageRef = useRef<HTMLDivElement>(null);
  const thumbnailListRef = useRef<HTMLDivElement>(null);
  const activeThumbnailRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll thumbnail rail to keep active slide in view
  useEffect(() => {
    if (activeThumbnailRef.current) {
      activeThumbnailRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentSlide, showThumbnails]);

  const goToPrevSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.max(1, prev - 1));
  }, []);

  const goToNextSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.min(totalSlides, prev + 1));
  }, [totalSlides]);

  // Keyboard navigation for PPT Reader (Arrow keys, Space, PageUp/Down, Fullscreen F/F5, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        goToNextSlide();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goToPrevSlide();
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrentSlide(1);
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrentSlide(totalSlides);
      } else if (e.key === "f" || e.key === "F" || e.key === "F5") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "Escape") {
        if (isFullscreen) {
          e.preventDefault();
          setIsFullscreen(false);
        } else if (onClose) {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNextSlide, goToPrevSlide, totalSlides, isFullscreen, onClose]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (stageRef.current?.requestFullscreen) {
        stageRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      setIsFullscreen(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const toggleBookmark = (slideNum: number) => {
    setBookmarkedSlides((prev) => {
      const next = new Set(prev);
      if (next.has(slideNum)) next.delete(slideNum);
      else next.add(slideNum);
      return next;
    });
  };

  // Get current active section
  const currentSection: NoteSection | undefined = sections[currentSlide - 1];

  // Resolve slide image URL
  const getSlideImageUrl = (pageNum: number): string => {
    if (doc.slideImages && doc.slideImages[pageNum - 1]) {
      return doc.slideImages[pageNum - 1];
    }
    const sec = sections[pageNum - 1];
    if (sec?.slideImageUrl) {
      return sec.slideImageUrl;
    }
    return `/api/slide/${doc.id}/${pageNum}`;
  };

  const activeSlideImg = getSlideImageUrl(currentSlide);

  // Extract embedded diagrams or images from markdown if present
  const embeddedDiagram = currentSection?.contentMarkdown?.match(
    /!\[Slide Diagram\]\((data:image\/[a-zA-Z+]+;base64,[^\)]+)\)/
  )?.[1];

  // Extract clean text points
  const rawBullets = (currentSection?.contentMarkdown || "")
    .replace(/!\[Slide Diagram\]\([^\)]+\)/g, "")
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[#*\-•\d.]+\s*/, "").trim())
    .filter((l) => l.length > 2 && !l.startsWith("--- [Slide") && !l.startsWith("```"));

  return (
    <div 
      ref={stageRef}
      className={`w-full h-full flex flex-col ${
        isFullscreen ? "fixed inset-0 z-50 bg-[#09090b] text-white" : "bg-[#f1f3f7] dark:bg-[#12141a] text-slate-900 dark:text-slate-100"
      } select-none overflow-hidden font-sans`}
      onMouseMove={(e) => {
        if (isLaserActive) {
          const rect = stageRef.current?.getBoundingClientRect();
          if (rect) {
            setLaserPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }
        }
      }}
    >
      {/* 1. PPT Reader Top Navigation Ribbon */}
      {!isFullscreen && (
        <header className="h-14 bg-[#1e222d] border-b border-[#2d3345] px-3 sm:px-5 flex items-center justify-between gap-2 shrink-0 z-20 text-xs">
          {/* Left: Document Info & PPT badge */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Back to Dashboard (Esc)"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`p-1.5 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                showThumbnails
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
              title="Toggle Slide Thumbnails Rail (Ctrl+B)"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            {/* PPTX Badge */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded font-black text-[10px] tracking-wider uppercase bg-[#ea580c] text-white shadow-xs shrink-0">
                PPTX
              </span>
              <span className="font-bold text-slate-200 truncate max-w-[140px] xs:max-w-[180px] sm:max-w-[220px] text-xs sm:text-sm">
                {doc.title}
              </span>
              {doc.unit && (
                <span className="hidden md:inline text-[10px] font-semibold text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 shrink-0">
                  {doc.unit}
                </span>
              )}
            </div>

            {/* Note Selector Dropdown */}
            <div className="flex items-center relative ml-1">
              <select
                value={isAllFilesView ? (activeView === "all-files-everything" ? "all-files-everything" : `all-unit-${effectiveUnit}`) : activeView}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith("all-unit-") && setCurrentUnitContext) {
                    const u = val.replace("all-unit-", "");
                    setCurrentUnitContext(u);
                  }
                  if (setActiveView) {
                    setActiveView(val);
                  }
                }}
                className="bg-[#18181b] text-amber-400 font-extrabold border border-[#3a3a3c] hover:border-amber-500/50 rounded-lg pl-2.5 sm:pl-3 pr-6 sm:pr-7 py-1 sm:py-1.5 text-[11px] sm:text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 appearance-none shadow-inner max-w-[130px] xs:max-w-[160px] sm:max-w-[220px] truncate"
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

          {/* Center: Slideshow Trigger */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Start Slideshow Button */}
            <button
              onClick={toggleFullscreen}
              className="hidden xs:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer shrink-0"
              title="Start Fullscreen Presentation (F5 or F)"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Slideshow</span>
            </button>
          </div>

          {/* Right: Download & Mode Switching */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* Download Original Presentation File */}
            <a
              href={doc.downloadUrl || doc.originalFileUrl || `/api/download/${doc.id}`}
              download={doc.originalFileName || `${doc.title}.pptx`}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              title="Download original untouched PowerPoint file"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download</span>
            </a>



            {/* Ask AI Side Panel */}
            {onToggleAiPanel && (
              <button
                type="button"
                onClick={onToggleAiPanel}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all shadow-xs cursor-pointer ${
                  isAiPanelOpen
                    ? "bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300/40"
                    : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                }`}
                title="Ask AI Study Tutor about this slide"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            )}

            {/* Exit / Close */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 transition-colors cursor-pointer"
                title="Close presentation (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>
      )}

      {/* 2. Main Reader Viewport */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Slide Thumbnails Sorter Filmstrip */}
        {showThumbnails && !isFullscreen && (
          <aside 
            ref={thumbnailListRef}
            className="w-48 sm:w-56 md:w-64 bg-[#181a22] border-r border-[#2a2f3f] flex flex-col shrink-0 overflow-y-auto overflow-x-hidden p-2 sm:p-3 space-y-2 z-10"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 px-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-amber-500" /> Slides ({totalSlides})
              </span>
              <span className="text-[10px] text-slate-500 font-mono">16:9</span>
            </div>

            {Array.from({ length: totalSlides }, (_, idx) => {
              const slideNum = idx + 1;
              const isActive = slideNum === currentSlide;
              const isBookmarked = bookmarkedSlides.has(slideNum);
              const thumbUrl = getSlideImageUrl(slideNum);
              const sec = sections[idx];
              const slideTitle = sec?.title || `Slide ${slideNum}`;

              return (
                <button
                  key={slideNum}
                  ref={isActive ? activeThumbnailRef : undefined}
                  type="button"
                  onClick={() => setCurrentSlide(slideNum)}
                  className={`w-full group text-left rounded-xl p-1.5 transition-all cursor-pointer flex flex-col gap-1 relative ${
                    isActive
                      ? "bg-amber-500/15 border-2 border-amber-500 shadow-md ring-2 ring-amber-500/20"
                      : "bg-[#202430]/60 hover:bg-[#282d3d] border border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {/* Thumbnail Header Bar */}
                  <div className="flex items-center justify-between px-1">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                        isActive
                          ? "bg-amber-500 text-slate-950 font-black"
                          : "bg-slate-800 text-slate-400 group-hover:text-slate-200"
                      }`}
                    >
                      {slideNum}
                    </span>
                    <span className="text-[10px] text-slate-400 group-hover:text-slate-200 truncate max-w-[120px] font-medium">
                      {slideTitle}
                    </span>
                    {isBookmarked && (
                      <Bookmark className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                    )}
                  </div>

                  {/* Thumbnail Slide Preview */}
                  <div className="w-full aspect-[16/9] rounded-lg overflow-hidden bg-white dark:bg-[#12141a] border border-slate-700/60 relative flex items-center justify-center shadow-xs">
                    {!failedImages.has(slideNum) ? (
                      <img
                        src={thumbUrl}
                        alt={`Slide ${slideNum}`}
                        onError={() => setFailedImages((prev) => new Set(prev).add(slideNum))}
                        className="w-full h-full object-contain pointer-events-none"
                        loading={slideNum <= 6 ? "eager" : "lazy"}
                      />
                    ) : (
                      <div className="w-full h-full p-2 bg-slate-50 dark:bg-slate-900 flex flex-col justify-between text-left">
                        <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 line-clamp-1">
                          {sec?.subtitle || `Slide ${slideNum}`}
                        </span>
                        <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight">
                          {slideTitle}
                        </span>
                        <div className="flex justify-between items-center text-[8px] text-slate-400 font-mono">
                          <span>{doc.shortTitle || "PPT"}</span>
                          <span>{slideNum}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </aside>
        )}

        {/* Center Presentation Stage */}
        <main className="flex-1 overflow-auto flex flex-col items-center justify-start p-6 sm:p-12 pb-24 relative bg-[#e2e5eb] dark:bg-[#0c0d12]">
          {/* Laser Pointer in Presentation Mode */}
          {isLaserActive && isFullscreen && (
            <div
              className="pointer-events-none fixed z-50 w-5 h-5 rounded-full bg-red-500 shadow-[0_0_14px_4px_rgba(239,68,68,0.9)] transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
              style={{ left: laserPos.x, top: laserPos.y }}
            />
          )}

          {/* Floating Left / Right Hover Navigation Paddles */}
          <button
            onClick={goToPrevSlide}
            disabled={currentSlide <= 1}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white disabled:opacity-0 transition-all opacity-0 hover:opacity-100 focus:opacity-100 shadow-2xl border border-white/20 cursor-pointer backdrop-blur-xs"
            title="Previous Slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={goToNextSlide}
            disabled={currentSlide >= totalSlides}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white disabled:opacity-0 transition-all opacity-0 hover:opacity-100 focus:opacity-100 shadow-2xl border border-white/20 cursor-pointer backdrop-blur-xs"
            title="Next Slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* The Slide Canvas */}
          <div className="flex flex-col items-center gap-10 w-full max-w-[1360px] mx-auto py-12 px-4">
            {Array.from({ length: totalSlides }, (_, idx) => {
              const slideNum = idx + 1;
              const slideImg = doc.slideImages?.[idx] || `/api/slide/${doc.id}/${slideNum}`;
              const slideSec = sections[idx] || { title: `Slide ${slideNum}`, contentMarkdown: doc.description || "AWS Cloud Architecture and Module Specifications." };
              const hasFailed = failedImages.has(slideNum);
              return (
                <div
                  key={slideNum}
                  id={`ppt-slide-${slideNum}`}
                  className="w-full aspect-[16/9] transition-transform duration-150 ease-out flex items-center justify-center relative shadow-2xl rounded-2xl bg-[#0f1117] text-slate-100 border border-slate-700/40 shrink-0 overflow-hidden"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: "center center",
                  }}
                >
                  {!hasFailed ? (
                    <img
                      src={slideImg}
                      alt={`Slide ${slideNum}`}
                      className="w-full h-full object-contain select-none bg-[#0f1117] rounded-2xl"
                      loading={slideNum <= 3 ? "eager" : "lazy"}
                      onError={() => setFailedImages((prev) => new Set(prev).add(slideNum))}
                    />
                  ) : (
                    <div className="w-full h-full p-8 sm:p-12 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-[#151821] to-[#0f1117] text-slate-100 rounded-2xl select-text overflow-y-auto">
                      <div className="space-y-3">
                        <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                          {doc.shortTitle || doc.title} • Slide {slideNum} of {totalSlides}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                          {slideSec.title || `Slide ${slideNum}`}
                        </h2>
                        {slideSec.subtitle && (
                          <p className="text-xs sm:text-sm text-slate-300 font-medium">
                            {slideSec.subtitle}
                          </p>
                        )}
                      </div>
                      <div className="my-4 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans border-t border-slate-800/80 pt-4">
                        <PaperMarkdownRenderer content={slideSec.contentMarkdown || slideSec.speakerNotes || "AWS Cloud Architecture and Module Specifications."} />
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-800 pt-3">
                        <span>{doc.unit || "AWS Cloud Practitioner"}</span>
                        <span className="font-mono">Page {slideNum}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Floating Control Bar (Slide Pagination & Zoom) */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#181b24]/95 backdrop-blur-md border border-slate-700/80 text-white rounded-xl px-4 py-2 flex items-center gap-6 shadow-2xl">
            {/* Slide Switcher */}
            <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg p-0.5 shadow-inner">
              <button
                onClick={goToPrevSlide}
                disabled={currentSlide <= 1}
                className="p-1.5 rounded-md hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-200 transition-colors cursor-pointer"
                title="Previous Slide (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-3 text-center min-w-[70px] sm:min-w-[90px] font-mono text-xs font-bold text-amber-400">
                <span>{currentSlide}</span>
                <span className="text-slate-500 font-normal mx-1">/</span>
                <span className="text-slate-400">{totalSlides}</span>
              </div>

              <button
                onClick={goToNextSlide}
                disabled={currentSlide >= totalSlides}
                className="p-1.5 rounded-md hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-200 transition-colors cursor-pointer"
                title="Next Slide (Right Arrow or Space)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-5 bg-slate-700" />

            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg p-0.5 text-slate-300">
              <button
                onClick={() => setZoom((z) => Math.max(50, z - 15))}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(100)}
                className="px-2 text-xs font-mono font-bold text-amber-400 hover:bg-slate-800 rounded min-w-[42px] text-center"
                title="Reset Zoom"
              >
                {zoom}%
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(200, z + 15))}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* 2b. PowerPoint Notes (Speaker Notes) Pane */}
      {showSlideNotes && !isFullscreen && (
        <div className="h-40 sm:h-48 bg-[#181a22] border-t border-[#2a2f3f] flex flex-col shrink-0 z-20 shadow-2xl">
          <div className="h-8 px-4 bg-[#14161d] border-b border-[#242836] flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 font-bold text-amber-400 text-[11px] uppercase tracking-wider">
                <MessageSquareQuote className="w-3.5 h-3.5" /> Slide {currentSlide} Notes
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {currentSection?.speakerNotes ? "Original PowerPoint Speaker Notes" : "No speaker notes on this slide"}
              </span>
            </div>
            <button
              onClick={() => setShowSlideNotes(false)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Slide Notes"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans select-text whitespace-pre-wrap">
            {currentSection?.speakerNotes ? (
              currentSection.speakerNotes
            ) : (
              <span className="text-slate-500 italic">No notes were entered for this slide in the original PowerPoint file.</span>
            )}
          </div>
        </div>
      )}

      {/* 3. Floating Presenter HUD Bar in Fullscreen Mode */}
      {isFullscreen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black/85 backdrop-blur-md border border-white/20 text-white rounded-2xl px-4 py-2.5 flex items-center gap-4 shadow-2xl">
          <button
            onClick={goToPrevSlide}
            disabled={currentSlide <= 1}
            className="p-1.5 rounded-lg hover:bg-white/20 disabled:opacity-30 cursor-pointer"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="font-mono text-sm font-bold text-amber-400">
            {currentSlide} / {totalSlides}
          </span>

          <button
            onClick={goToNextSlide}
            disabled={currentSlide >= totalSlides}
            className="p-1.5 rounded-lg hover:bg-white/20 disabled:opacity-30 cursor-pointer"
            title="Next (Right Arrow / Space)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="w-px h-5 bg-white/20" />

          {/* Laser Pointer */}
          <button
            onClick={() => setIsLaserActive(!isLaserActive)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLaserActive ? "bg-red-500 text-white shadow-lg" : "hover:bg-white/20 text-slate-300"
            }`}
            title="Toggle Laser Pointer"
          >
            <Radio className="w-4 h-4" />
          </button>

          {/* Bookmark */}
          <button
            onClick={() => toggleBookmark(currentSlide)}
            className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-amber-400 cursor-pointer"
            title="Bookmark Slide"
          >
            <Bookmark className={`w-4 h-4 ${bookmarkedSlides.has(currentSlide) ? "text-amber-400 fill-amber-400" : ""}`} />
          </button>

          {/* Exit Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
            title="Exit Slideshow (Esc)"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
export default PptReader;
