import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { 
  ZoomIn, ZoomOut, Maximize2, Download, ChevronLeft, ChevronRight, 
  Layers, RefreshCw, FileText, AlertCircle, ExternalLink, Plus, Minus
} from "lucide-react";

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.10.38"}/pdf.worker.mjs`;

interface Props {
  pdfUrl?: string;
  pdfDataUrl?: string;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  documentTitle?: string;
}

export const PdfCanvasViewer: React.FC<Props> = ({
  pdfUrl,
  pdfDataUrl,
  currentPage = 1,
  onPageChange,
  documentTitle = "Document"
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [activePage, setActivePage] = useState<number>(currentPage);
  const [scale, setScale] = useState<number>(1.25);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [renderMode, setRenderMode] = useState<"single" | "continuous">("continuous");

  const singleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});

  const sourceUrl = pdfUrl || pdfDataUrl;

  // Sync prop active page
  useEffect(() => {
    if (currentPage && currentPage !== activePage) {
      setActivePage(currentPage);
    }
  }, [currentPage]);

  // Scroll active page into view smoothly
  useEffect(() => {
    if (!activePage || isLoading) return;

    if (renderMode === "single") {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    } else {
      const pageEl = document.getElementById(`doc-page-${activePage}`);
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
        pageEl.classList.add("ring-4", "ring-amber-500", "ring-offset-4", "transition-all", "duration-300");
        const timer = setTimeout(() => {
          pageEl.classList.remove("ring-4", "ring-amber-500", "ring-offset-4");
        }, 2200);
        return () => clearTimeout(timer);
      }
    }
  }, [activePage, isLoading, renderMode]);

  // Load PDF Document
  useEffect(() => {
    if (!sourceUrl) {
      setIsLoading(false);
      setError("No PDF binary source available.");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const loadingTask = pdfjsLib.getDocument({
      url: sourceUrl,
      cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/",
      cMapPacked: true,
    });

    loadingTask.promise
      .then((doc) => {
        if (!isMounted) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("PDF.js load error:", err);
        // Fallback: try fetching as ArrayBuffer if dataUrl or relative URL
        if (pdfDataUrl) {
          fetch(pdfDataUrl)
            .then(res => res.arrayBuffer())
            .then(buffer => {
              return pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
            })
            .then(doc => {
              if (!isMounted) return;
              setPdfDoc(doc);
              setNumPages(doc.numPages);
              setIsLoading(false);
            })
            .catch(e => {
              if (!isMounted) return;
              setIsLoading(false);
              setError("Failed to load PDF document into viewer.");
            });
        } else {
          setIsLoading(false);
          setError("Failed to render PDF document.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sourceUrl]);

  // Render Single Page Canvas
  useEffect(() => {
    if (!pdfDoc || renderMode !== "single" || !singleCanvasRef.current) return;

    let isCancelled = false;
    const pageNumToRender = Math.min(Math.max(1, activePage), numPages || 1);

    pdfDoc.getPage(pageNumToRender).then((page: any) => {
      if (isCancelled || !singleCanvasRef.current) return;

      const viewport = page.getViewport({ scale });
      const canvas = singleCanvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * devicePixelRatio);
      canvas.height = Math.floor(viewport.height * devicePixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.scale(devicePixelRatio, devicePixelRatio);

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      page.render(renderContext);
    });

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, activePage, scale, renderMode, numPages]);

  // Render Continuous Mode Pages
  useEffect(() => {
    if (!pdfDoc || renderMode !== "continuous") return;

    let isCancelled = false;

    for (let p = 1; p <= numPages; p++) {
      const canvas = pageRefs.current[p];
      if (!canvas) continue;

      const pageNum = p;
      pdfDoc.getPage(pageNum).then((page: any) => {
        if (isCancelled) return;
        const targetCanvas = pageRefs.current[pageNum];
        if (!targetCanvas) return;

        const viewport = page.getViewport({ scale: scale * 0.95 });
        const context = targetCanvas.getContext("2d");
        if (!context) return;

        const devicePixelRatio = window.devicePixelRatio || 1;
        targetCanvas.width = Math.floor(viewport.width * devicePixelRatio);
        targetCanvas.height = Math.floor(viewport.height * devicePixelRatio);
        targetCanvas.style.width = `${Math.floor(viewport.width)}px`;
        targetCanvas.style.height = `${Math.floor(viewport.height)}px`;

        context.scale(devicePixelRatio, devicePixelRatio);

        page.render({
          canvasContext: context,
          viewport: viewport
        });
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, scale, renderMode, numPages]);

  const handlePageChange = (newPage: number) => {
    const valid = Math.min(Math.max(1, newPage), numPages);
    setActivePage(valid);
    if (onPageChange) onPageChange(valid);
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

      {/* Main Light Canvas Viewer Stage matching user screenshot */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-[#e5e7eb] dark:bg-[#1f1f23] p-2 sm:p-6 md:p-8 flex flex-col items-center relative min-h-[400px] sm:min-h-[500px]"
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
          <div className="my-auto flex flex-col items-center w-full max-w-full overflow-x-auto">
            <div className="bg-white shadow-2xl rounded-xs overflow-hidden border border-slate-300 transition-transform max-w-full">
              <canvas ref={singleCanvasRef} className="block max-w-full h-auto mx-auto" />
            </div>
          </div>
        )}

        {!isLoading && !error && renderMode === "continuous" && (
          <div className="w-full flex flex-col items-center space-y-6 sm:space-y-8 my-2 pb-16 max-w-full overflow-x-auto">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <div key={pageNum} id={`doc-page-${pageNum}`} className="flex flex-col items-center scroll-mt-6 max-w-full">
                <div className="bg-white shadow-2xl rounded-xs overflow-hidden border border-slate-300 max-w-full">
                  <canvas
                    ref={(el) => {
                      pageRefs.current[pageNum] = el;
                    }}
                    className="block max-w-full h-auto mx-auto"
                  />
                </div>
              </div>
            ))}
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
