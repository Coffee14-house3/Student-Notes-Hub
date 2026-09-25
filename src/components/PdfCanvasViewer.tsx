import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { 
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, 
  Layers, RefreshCw, AlertCircle, ExternalLink, Bookmark
} from "lucide-react";
import { NoteSection } from "../types";
import { PaperMarkdownRenderer } from "./PaperMarkdownRenderer";

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.10.38"}/pdf.worker.mjs`;

interface Props {
  pdfUrl?: string;
  pdfDataUrl?: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  documentTitle?: string;
  fallbackSections?: NoteSection[];
  fallbackSlideImages?: string[];
  shortTitle?: string;
}

export const PdfCanvasViewer: React.FC<Props> = ({
  pdfUrl,
  pdfDataUrl,
  currentPage = 1,
  onPageChange,
  documentTitle = "Document",
  fallbackSections,
  fallbackSlideImages,
  shortTitle
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(fallbackSections?.length || 1);
  const [activePage, setActivePage] = useState<number>(currentPage);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(pdfUrl || pdfDataUrl));
  const [error, setError] = useState<string | null>(null);
  const [renderMode, setRenderMode] = useState<"single" | "continuous">("continuous");

  const singleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});
  const renderedPagesRef = useRef<Map<number, number>>(new Map());
  const renderTasksRef = useRef<Map<number | string, any>>(new Map());
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const isUserScrollingRef = useRef<boolean>(false);
  const scrollEndTimeoutRef = useRef<any>(null);
  const lastWheelTimeRef = useRef<number>(0);
  const prevCurrentPageRef = useRef<number>(currentPage);
  const loadedSourceRef = useRef<string | null>(null);

  const sourceUrl = pdfUrl || pdfDataUrl;

  // Programmatic scroll to target page (for page buttons, key navigation, thumbnails)
  const scrollToPage = (targetPage: number) => {
    const valid = Math.min(Math.max(1, targetPage), numPages || 1);
    setActivePage(valid);
    prevCurrentPageRef.current = valid;
    if (onPageChange) onPageChange(valid);

    const container = containerRef.current;
    if (!container) return;

    if (renderMode === "single") {
      container.scrollTop = 0;
      return;
    }

    const pageEl = container.querySelector(`#doc-page-${valid}`) as HTMLElement | null;
    if (pageEl) {
      isProgrammaticScrollRef.current = true;
      const containerRect = container.getBoundingClientRect();
      const pageRect = pageEl.getBoundingClientRect();
      const targetScrollTop = container.scrollTop + (pageRect.top - containerRect.top) - 15;
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth"
      });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 500);
    }
  };

  // Only scroll when currentPage prop changes from parent (e.g. user clicked a thumbnail or jump button)
  useEffect(() => {
    if (currentPage && currentPage !== prevCurrentPageRef.current) {
      prevCurrentPageRef.current = currentPage;
      // Do not trigger programmatic scrolling if user is actively scrolling manually
      if (currentPage !== activePage && !isUserScrollingRef.current) {
        scrollToPage(currentPage);
      }
    }
  }, [currentPage]);

  // Load PDF Document - only reload when sourceUrl truly changes, never on parent section re-renders
  useEffect(() => {
    if (!sourceUrl) {
      if (fallbackSections && fallbackSections.length > 0) {
        setNumPages(fallbackSections.length);
        setIsLoading(false);
        setError(null);
      } else {
        setIsLoading(false);
        setError("No document binary source available.");
      }
      return;
    }

    // If already loaded for this exact sourceUrl, preserve existing document and scroll position
    if (pdfDoc && loadedSourceRef.current === sourceUrl) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    renderedPagesRef.current.clear();

    const loadingTask = pdfjsLib.getDocument({
      url: sourceUrl,
      cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/",
      cMapPacked: true,
    });

    loadingTask.promise
      .then((doc) => {
        if (!isMounted) return;
        loadedSourceRef.current = sourceUrl;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("PDF.js load notice:", err);
        // Fallback: try fetching as ArrayBuffer if dataUrl or relative URL
        if (pdfDataUrl) {
          fetch(pdfDataUrl)
            .then(res => res.arrayBuffer())
            .then(buffer => {
              return pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
            })
            .then(doc => {
              if (!isMounted) return;
              loadedSourceRef.current = sourceUrl;
              setPdfDoc(doc);
              setNumPages(doc.numPages);
              setIsLoading(false);
            })
            .catch(() => {
              if (!isMounted) return;
              if (fallbackSections && fallbackSections.length > 0) {
                setNumPages(fallbackSections.length);
                setIsLoading(false);
                setError(null);
              } else {
                setIsLoading(false);
                setError("Failed to load PDF document.");
              }
            });
        } else if (fallbackSections && fallbackSections.length > 0) {
          // Gracefully fall back to rendering slide cards/images
          setNumPages(fallbackSections.length);
          setIsLoading(false);
          setError(null);
        } else {
          setIsLoading(false);
          setError("Failed to render PDF document.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sourceUrl]);

  const renderCanvasPage = async (pageNum: number, canvas: HTMLCanvasElement, targetScale: number, taskIdKey: number | string) => {
    if (!pdfDoc || !canvas) return;
    try {
      const existingTask = renderTasksRef.current.get(taskIdKey);
      if (existingTask) {
        existingTask.cancel();
        renderTasksRef.current.delete(taskIdKey);
      }

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: targetScale });
      const context = canvas.getContext("2d");
      if (!context) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderTask = page.render({
        canvasContext: context,
        viewport: viewport
      });
      renderTasksRef.current.set(taskIdKey, renderTask);
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.warn(`Render notice for page ${pageNum}:`, err?.message);
      }
    }
  };

  // Render Single Page Canvas
  useEffect(() => {
    if (!pdfDoc || renderMode !== "single" || !singleCanvasRef.current) return;
    const pageNumToRender = Math.min(Math.max(1, activePage), numPages || 1);
    renderCanvasPage(pageNumToRender, singleCanvasRef.current, scale, "single");
  }, [pdfDoc, activePage, scale, renderMode, numPages]);

  // Render Continuous Mode Pages
  useEffect(() => {
    if (!pdfDoc || renderMode !== "continuous") return;
    for (let p = 1; p <= numPages; p++) {
      const targetCanvas = pageRefs.current[p];
      if (targetCanvas) {
        const lastScale = renderedPagesRef.current.get(p);
        if (lastScale !== scale) {
          renderedPagesRef.current.set(p, scale);
          renderCanvasPage(p, targetCanvas, scale * 0.95, p);
        }
      }
    }
  }, [pdfDoc, scale, renderMode, numPages]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "ArrowRight" || (e.key === " " && !e.shiftKey)) {
        if (renderMode === "single" && activePage < numPages) {
          e.preventDefault();
          handlePageChange(activePage + 1);
        }
      } else if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "ArrowLeft" || (e.key === " " && e.shiftKey)) {
        if (renderMode === "single" && activePage > 1) {
          e.preventDefault();
          handlePageChange(activePage - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePage, numPages, renderMode]);

  // Handle Wheel Navigation only in Single Page mode
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (renderMode !== "single" || numPages <= 1) return;
    const el = containerRef.current;
    if (!el) return;

    // Require decisive wheel scroll to prevent trackpad inertial rubber-banding
    if (Math.abs(e.deltaY) < 40) return;

    const now = Date.now();
    if (now - lastWheelTimeRef.current < 550) {
      return;
    }

    const isScrollableY = el.scrollHeight > el.clientHeight + 10;
    const isAtBottom = !isScrollableY || (el.scrollHeight - el.scrollTop - el.clientHeight <= 15);
    const isAtTop = !isScrollableY || (el.scrollTop <= 15);

    if (e.deltaY > 40 && isAtBottom) {
      if (activePage < numPages) {
        lastWheelTimeRef.current = now;
        handlePageChange(activePage + 1);
      }
    } else if (e.deltaY < -40 && isAtTop) {
      if (activePage > 1) {
        lastWheelTimeRef.current = now;
        handlePageChange(activePage - 1);
      }
    }
  };

  // Track active page while scrolling in continuous mode without jumping or resetting scroll
  const handleScroll = () => {
    if (isProgrammaticScrollRef.current) return;

    // Flag that user is actively scrolling manually
    isUserScrollingRef.current = true;
    if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
    scrollEndTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 600);

    if (renderMode !== "continuous" || numPages <= 1) return;
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const probeY = containerRect.top + Math.min(260, containerRect.height * 0.35);

    // Use container.querySelectorAll to only inspect pages inside this viewer
    const pageElements = container.querySelectorAll('[id^="doc-page-"]');
    let currentInView = activePage;

    for (let i = 0; i < pageElements.length; i++) {
      const el = pageElements[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      if (rect.top <= probeY && rect.bottom >= probeY) {
        const pNum = parseInt(el.id.replace("doc-page-", ""), 10);
        if (pNum) {
          currentInView = pNum;
          break;
        }
      }
    }

    if (currentInView !== activePage) {
      setActivePage(currentInView);
      prevCurrentPageRef.current = currentInView;
      if (onPageChange) onPageChange(currentInView);
    }
  };

  const handlePageChange = (newPage: number) => {
    scrollToPage(newPage);
  };

  const handleDownload = () => {
    if (!sourceUrl) return;
    const a = document.createElement("a");
    a.href = sourceUrl;
    a.download = `${documentTitle.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-full flex flex-col h-full bg-[#1e1e1e] border border-[#333] rounded-none overflow-hidden shadow-2xl font-sans text-slate-100 relative">
      {/* Top Toolbar */}
      <div className="px-2.5 sm:px-4 py-2 bg-[#252528] border-b border-[#38383e] flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 z-10 text-xs flex-wrap">
        {/* Left: Page Navigation */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => handlePageChange(activePage - 1)}
            disabled={activePage <= 1}
            className="p-1 sm:p-1.5 rounded-lg bg-[#303038] hover:bg-[#3d3d48] disabled:opacity-30 disabled:hover:bg-[#303038] text-slate-200 cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <div className="flex items-center gap-1 text-[11px] sm:text-xs font-mono px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#161619] rounded border border-[#3b3b45]">
            <span className="text-amber-400 font-bold">{activePage}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-300">{numPages || 1}</span>
          </div>
          <button
            onClick={() => handlePageChange(activePage + 1)}
            disabled={activePage >= numPages}
            className="p-1 sm:p-1.5 rounded-lg bg-[#303038] hover:bg-[#3d3d48] disabled:opacity-30 disabled:hover:bg-[#303038] text-slate-200 cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Center: View Controls (Zoom, Mode) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-0.5 sm:gap-1 bg-[#161619] p-0.5 sm:p-1 rounded-lg border border-[#3b3b45]">
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.15))}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#282830]"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScale(1.0)}
              className="text-[10px] sm:text-[11px] font-mono text-amber-400 px-1 font-bold min-w-[36px] sm:min-w-[42px] text-center hover:bg-[#282830] rounded"
              title="Reset Zoom"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={() => setScale(s => Math.min(2.5, s + 0.15))}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#282830]"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex bg-[#161619] p-0.5 sm:p-1 rounded-lg border border-[#3b3b45] text-[10px] sm:text-[11px]">
            <button
              onClick={() => setRenderMode("single")}
              className={`px-2 py-1 rounded font-bold transition-all ${
                renderMode === "single"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Page
            </button>
            <button
              onClick={() => setRenderMode("continuous")}
              className={`px-2 py-1 rounded font-bold transition-all ${
                renderMode === "continuous"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Main Light Canvas Viewer Stage */}
      <div 
        ref={containerRef}
        onWheel={handleWheel}
        onScroll={handleScroll}
        tabIndex={0}
        className="flex-1 overflow-y-auto overflow-x-auto bg-[#e5e7eb] dark:bg-[#1f1f23] p-3 sm:p-6 md:p-8 flex flex-col items-center relative w-full h-full outline-none focus:outline-none"
      >
        {isLoading && (
          <div className="my-auto flex flex-col items-center justify-center space-y-3 p-6 sm:p-8 text-center bg-white/80 dark:bg-[#202025]/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-300 dark:border-slate-700 max-w-sm">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            <div className="text-sm font-bold text-slate-900 dark:text-white">Rendering Original High-Resolution PDF...</div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Processing vector graphics, slides, code blocks, and diagrams.
            </p>
          </div>
        )}

        {error && !isLoading && (
          <div className="my-auto flex flex-col items-center justify-center space-y-3 p-6 sm:p-8 text-center max-w-md bg-white dark:bg-[#1a1a20] rounded-2xl shadow-2xl border border-red-400">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <div className="text-sm font-bold text-slate-900 dark:text-white">PDF Viewer</div>
            <p className="text-xs text-slate-600 dark:text-slate-300">{error}</p>
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> Open Original File
              </a>
            )}
          </div>
        )}

        {!isLoading && !error && renderMode === "single" && (
          <div className="w-full flex-1 min-h-full flex flex-col items-center justify-start py-4 sm:py-6 px-1 sm:px-4 max-w-full">
            {pdfDoc ? (
              <div className="bg-white shadow-2xl rounded-xs overflow-hidden border border-slate-300 transition-transform max-w-full">
                <canvas ref={singleCanvasRef} className="block max-w-full h-auto mx-auto" />
              </div>
            ) : fallbackSlideImages?.[activePage - 1] ? (
              <div className="bg-white shadow-2xl rounded-xs overflow-hidden border border-slate-300 transition-transform max-w-full p-2">
                <img
                  src={fallbackSlideImages[activePage - 1]}
                  alt={`Slide ${activePage}`}
                  style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
                  className="max-w-full h-auto block mx-auto rounded"
                />
              </div>
            ) : fallbackSections && fallbackSections[activePage - 1] ? (
              <div 
                className="bg-white shadow-2xl rounded-xs overflow-hidden border border-slate-300 transition-transform max-w-full p-2 sm:p-4"
                style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
              >
                <div className="w-full sm:w-[840px] max-w-full min-h-[460px] sm:min-h-[540px] bg-[#1a2332] text-white rounded-xl p-6 sm:p-10 relative overflow-hidden font-sans flex flex-col justify-between shadow-2xl">
                  <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-[#222f42] opacity-60 pointer-events-none blur-md" />
                  <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-[#1e2a3c] opacity-80 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-[#232f42] border border-[#34445d] flex items-center justify-center mb-4 sm:mb-6 shadow-md">
                      <Layers className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="text-amber-400 font-bold uppercase tracking-widest text-[11px] sm:text-xs mb-2">
                      {fallbackSections[activePage - 1]?.subtitle || shortTitle || "PRESENTATION DECK"}
                    </div>
                    <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
                      {fallbackSections[activePage - 1]?.title || `Slide ${activePage}`}
                    </h1>
                    <div className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6 font-normal">
                      <PaperMarkdownRenderer content={fallbackSections[activePage - 1]?.contentMarkdown || ""} isDark={true} />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[#2d3a50] flex items-center justify-between text-xs text-slate-400 font-mono relative z-10">
                    <span className="truncate pr-2">{documentTitle || `Slide ${activePage}`}</span>
                    <span>{activePage} / {numPages}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {!isLoading && !error && renderMode === "continuous" && (
          <div className="w-full flex flex-col items-center space-y-6 sm:space-y-10 my-2 pb-24 max-w-full">
            {pdfDoc ? (
              Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                <div key={pageNum} id={`doc-page-${pageNum}`} className="flex flex-col items-center scroll-mt-4 max-w-full">
                  <div className="bg-white shadow-2xl rounded-xs overflow-hidden border border-slate-300 max-w-full">
                    <canvas
                      ref={(el) => {
                        pageRefs.current[pageNum] = el;
                        if (el && pdfDoc && renderedPagesRef.current.get(pageNum) !== scale) {
                          renderedPagesRef.current.set(pageNum, scale);
                          renderCanvasPage(pageNum, el, scale * 0.95, pageNum);
                        }
                      }}
                      className="block max-w-full h-auto mx-auto"
                    />
                  </div>
                </div>
              ))
            ) : fallbackSections && fallbackSections.length > 0 ? (
              fallbackSections.map((sec, idx) => {
                const pageNum = idx + 1;
                const slideImg = fallbackSlideImages?.[idx];
                return (
                  <div key={pageNum} id={`doc-page-${pageNum}`} className="flex flex-col items-center scroll-mt-6 max-w-full">
                    {slideImg ? (
                      <div className="bg-white shadow-2xl rounded-xs overflow-hidden border border-slate-300 p-2 max-w-full">
                        <img src={slideImg} alt={`Slide ${pageNum}`} className="max-w-full h-auto block mx-auto rounded" />
                      </div>
                    ) : (
                      <div className="bg-white shadow-2xl rounded-xs overflow-hidden border border-slate-300 p-4 max-w-full">
                        <div className="w-full sm:w-[840px] max-w-full min-h-[460px] sm:min-h-[540px] bg-[#1a2332] text-white rounded-xl p-6 sm:p-10 relative overflow-hidden font-sans flex flex-col justify-between shadow-2xl">
                          <div className="relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-[#232f42] border border-[#34445d] flex items-center justify-center mb-4 shadow-md">
                              <Layers className="w-5 h-5 text-amber-400" />
                            </div>
                            <div className="text-amber-400 font-bold uppercase tracking-widest text-[11px] sm:text-xs mb-2">
                              {sec.subtitle || `SLIDE ${pageNum} OF ${numPages}`}
                            </div>
                            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-white mb-4">
                              {sec.title || `Slide ${pageNum}`}
                            </h2>
                            <div className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
                              <PaperMarkdownRenderer content={sec.contentMarkdown || ""} isDark={true} />
                            </div>
                          </div>
                          <div className="pt-3 border-t border-[#2d3a50] flex items-center justify-between text-xs text-slate-400 font-mono">
                            <span className="truncate pr-2">{documentTitle}</span>
                            <span>{pageNum} / {numPages}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : null}
          </div>
        )}

        {/* Floating Page Badge Overlay Bottom Left (Matching Screenshot) */}
        {!isLoading && !error && (
          <div className="hidden sm:flex fixed bottom-6 left-6 z-30 items-center gap-2 bg-white/95 dark:bg-[#202025]/95 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#383842] shadow-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#121215] border border-slate-300 dark:border-[#3a3a42] font-extrabold text-slate-900 dark:text-white">
              {activePage}
            </span>
            <span className="text-slate-400">{numPages}</span>
          </div>
        )}
      </div>
    </div>
  );
};
