import express from "express";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import AdmZip from "adm-zip";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { notesData } from "./src/data/notesData";
import { CourseAnnouncement } from "./src/types";
import {
  parseDocxBuffer,
  parsePptxBuffer,
  parseLegacyOfficeBuffer
} from "./serverDocParsers";
import {
  initChroma,
  getChromaStatus,
  getChromaConfig,
  indexDocumentToChroma,
  indexAllDocumentsToChroma,
  deleteDocumentFromChroma,
  indexAnnouncementToChroma,
  deleteAnnouncementFromChroma,
  indexAllAnnouncementsToChroma,
  resetChromaDatabase,
  queryChroma
} from "./serverChroma";
import { AutoScalingStorageManager } from "./serverStorageScaler";
import { convertPptxToSlides } from "./server/converter.js";

dotenv.config();

async function parsePdfBuffer(pdfBuffer: Buffer): Promise<{ text: string; pageCount: number; pages: { pageNum: number; text: string }[] }> {
  try {
    if (!pdfBuffer || pdfBuffer.length < 5) {
      return { text: "", pageCount: 1, pages: [] };
    }

    // Verify buffer starts with %PDF- signature
    const headerSlice = pdfBuffer.slice(0, 1024).toString("latin1");
    if (!headerSlice.includes("%PDF-")) {
      return { text: "", pageCount: 1, pages: [] };
    }

    // @ts-ignore
    const pdfModule = await import("pdf-parse");
    const PDFParseClass = (pdfModule as any).PDFParse || (pdfModule as any).default?.PDFParse;

    if (PDFParseClass) {
      const instance = new PDFParseClass({ data: pdfBuffer });
      await instance.load();
      const info = await instance.getInfo();
      const textObj = await instance.getText();

      const totalPages = Math.max(info?.total || 1, textObj?.pages?.length || 1);
      const pagesList: { pageNum: number; text: string }[] = [];

      if (Array.isArray(textObj?.pages)) {
        textObj.pages.forEach((p: any, idx: number) => {
          pagesList.push({
            pageNum: p.num || idx + 1,
            text: (p.text || "").trim()
          });
        });
      }

      if (pagesList.length < totalPages) {
        for (let i = pagesList.length + 1; i <= totalPages; i++) {
          try {
            const pageText = await instance.getPageText(i);
            const str = typeof pageText === "string" ? pageText : (pageText?.text || "");
            pagesList.push({ pageNum: i, text: str.trim() });
          } catch {
            pagesList.push({ pageNum: i, text: "" });
          }
        }
      }

      let fullText = textObj?.text || pagesList.map(p => p.text).join("\n\n");
      fullText = fullText
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
        .replace(/\r\n/g, "\n")
        .trim();

      return { text: fullText, pageCount: totalPages, pages: pagesList };
    }

    const pdfFn = typeof pdfModule === "function" 
      ? pdfModule 
      : (pdfModule as any).default;

    if (typeof pdfFn === "function") {
      const pageMap: Map<number, string> = new Map();
      const options = {
        pagerender: function(pageData: any) {
          return pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
            .then(function(textContent: any) {
              let text = "";
              if (textContent && textContent.items) {
                for (const item of textContent.items) {
                  text += (item.str || "") + " ";
                }
              }
              const pageIdx = pageData.pageIndex + 1;
              pageMap.set(pageIdx, text);
              return text;
            })
            .catch(() => "");
        }
      };

      const pdfData = await pdfFn(pdfBuffer, options);
      const pageCount = pdfData?.numpages || pageMap.size || 1;
      let text = pdfData?.text || "";

      text = text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
        .replace(/\r\n/g, "\n")
        .trim();

      const pagesList: { pageNum: number; text: string }[] = [];
      const totalPages = Math.max(pageCount, pageMap.size);

      for (let i = 1; i <= totalPages; i++) {
        const pageText = (pageMap.get(i) || "").trim();
        pagesList.push({
          pageNum: i,
          text: pageText
        });
      }

      return { text, pageCount: totalPages, pages: pagesList };
    }
  } catch (err: any) {
    // Safe graceful fallback for non-standard or encrypted PDFs
  }

  return { text: "", pageCount: 1, pages: [] };
}

let geminiClientInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;
  if (!geminiClientInstance) {
    geminiClientInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClientInstance;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 2,
  baseDelayMs = 600
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const errMsg = err?.message || String(err);
      const isTransient =
        err?.status === 503 ||
        err?.status === 429 ||
        errMsg.includes("503") ||
        errMsg.includes("429") ||
        errMsg.includes("high demand") ||
        errMsg.includes("UNAVAILABLE");

      if (attempt <= retries && isTransient) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[Gemini API] Transient condition (503/429), retrying in ${delay}ms (attempt ${attempt}/${retries})...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

async function callGeminiChat(
  systemInstruction: string,
  userPromptWithContext: string
): Promise<{ text: string; modelUsed: string } | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  // Primary: gemini-3.8-flash, Secondary fallback: gemini-3.1-flash-lite
  const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];

  for (const model of candidateModels) {
    try {
      const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
          model,
          contents: userPromptWithContext,
          config: {
            systemInstruction,
            temperature: 0.3,
          },
        });
      });

      if (response?.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[Gemini API] Chat error with ${model}:`, err?.message || err);
      // Fall through to next model candidate
    }
  }
  return null;
}

async function callGeminiQuiz(
  systemInstruction: string,
  userPrompt: string
): Promise<{ text: string; modelUsed: string } | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];

  for (const model of candidateModels) {
    try {
      const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });
      });

      if (response?.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[Gemini API] Quiz error with ${model}:`, err?.message || err);
    }
  }
  return null;
}

async function callOpenRouterChat(
  messages: Array<{ role: string; content: string }>,
  preferredModels?: string[],
  jsonMode?: boolean
): Promise<{ text: string; modelUsed: string } | null> {
  const apiKey = (process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY || "").trim();
  if (!apiKey) return null;

  const models = preferredModels || [
    "meta-llama/llama-3.3-70b-instruct",
    "deepseek/deepseek-chat",
    "qwen/qwen-2.5-72b-instruct",
    "openai/gpt-4o-mini",
    "meta-llama/llama-3.1-8b-instruct",
    "mistralai/mistral-large-2411"
  ];

  for (const model of models) {
    try {
      const payload: any = {
        model,
        messages,
        temperature: 0.3,
        max_tokens: 3500
      };
      if (jsonMode) {
        payload.response_format = { type: "json_object" };
      }

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://render.com",
          "X-Title": "AWS Study Notes Hub"
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content && typeof content === "string" && content.trim().length > 0) {
          return { text: content.trim(), modelUsed: model };
        }
      }
    } catch {
      // try next model
    }
  }
  return null;
}

async function callGroqChat(
  messages: Array<{ role: string; content: string }>,
  preferredModels?: string[],
  jsonMode?: boolean
): Promise<{ text: string; modelUsed: string } | null> {
  const apiKey = (process.env.GROQ_API_KEY || process.env.GROK_API_KEY || "").trim();
  if (!apiKey) return null;

  const models = preferredModels || [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768"
  ];

  for (const model of models) {
    try {
      const payload: any = {
        model,
        messages,
        temperature: 0.3,
        max_tokens: 3500
      };
      if (jsonMode) {
        payload.response_format = { type: "json_object" };
      }

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content && typeof content === "string" && content.trim().length > 0) {
          return { text: content.trim(), modelUsed: model };
        }
      }
    } catch {
      // try next model
    }
  }
  return null;
}

async function startServer() {
  const app = express();
  // Support Render / cloud dynamic port assignment ($PORT) with fallback to 3000
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Instant health check for Render uptime monitoring
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use(express.json({ limit: "1024mb" }));
  app.use(express.urlencoded({ limit: "1024mb", extended: true }));

  // Enable CORS for all incoming requests (crucial for cross-domain student/teacher sync on Render)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // Server state for Documents & Announcements with disk persistence
  let serverDocuments: any[] = [];
  let serverAnnouncements: any[] = [];

  const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
  const DOCS_FILE = path.join(DATA_DIR, "documents.json");
  const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, "announcements.json");
  const PDF_DIR = path.join(DATA_DIR, "pdfs");
  const RAW_FILES_DIR = path.join(DATA_DIR, "files");
  const SLIDES_DIR = path.join(DATA_DIR, "slides");
  const storageScaler = new AutoScalingStorageManager(DATA_DIR);
  const rawFilesMap: Map<string, { buffer: Buffer; fileName: string; mimeType: string }> = new Map();

  function ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(PDF_DIR)) {
        fs.mkdirSync(PDF_DIR, { recursive: true });
      }
      if (!fs.existsSync(RAW_FILES_DIR)) {
        fs.mkdirSync(RAW_FILES_DIR, { recursive: true });
      }
      if (!fs.existsSync(SLIDES_DIR)) {
        fs.mkdirSync(SLIDES_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn("[Storage] Could not create data directory:", e);
    }
  }

  function loadPersistedData() {
    ensureDataDir();
    try {
      if (fs.existsSync(DOCS_FILE)) {
        const raw = fs.readFileSync(DOCS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          serverDocuments = parsed;

          // Connect any pre-generated slides to document sections
          for (const doc of serverDocuments) {
            const docSlideDir = path.join(SLIDES_DIR, doc.id);
            if (fs.existsSync(docSlideDir)) {
              const slideFiles = fs.readdirSync(docSlideDir)
                .filter(f => /\.(png|webp|jpg|jpeg|svg)$/i.test(f))
                .sort((a, b) => {
                  const numA = parseInt(a.replace(/\D/g, "") || "0", 10);
                  const numB = parseInt(b.replace(/\D/g, "") || "0", 10);
                  return numA - numB;
                });
              if (slideFiles.length > 0) {
                const slideUrls = slideFiles.map((_, idx) => `/api/slide/${doc.id}/${idx + 1}`);
                doc.slideImages = slideUrls;
                if (Array.isArray(doc.sections)) {
                  doc.sections.forEach((sec: any, idx: number) => {
                    if (slideUrls[idx]) {
                      sec.slideImageUrl = slideUrls[idx];
                    }
                  });
                }
              }
            }
          }

          console.log(`[Storage] Loaded ${serverDocuments.length} persisted documents from ${DOCS_FILE}`);
        }
      }
    } catch (e) {
      console.warn("[Storage] Error loading persisted documents:", e);
    }

    try {
      if (fs.existsSync(ANNOUNCEMENTS_FILE)) {
        const raw = fs.readFileSync(ANNOUNCEMENTS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          serverAnnouncements = parsed;
          console.log(`[Storage] Loaded ${serverAnnouncements.length} persisted announcements from ${ANNOUNCEMENTS_FILE}`);
        }
      }
    } catch (e) {
      console.warn("[Storage] Error loading persisted announcements:", e);
    }
  }

  function saveDocuments() {
    try {
      ensureDataDir();
      // Strip large pdfDataUrl from documents before writing documents.json (the PDF binary is already persisted in PDF_DIR)
      const cleanDocs = serverDocuments.map(doc => {
        if (doc && doc.pdfDataUrl) {
          const { pdfDataUrl, ...rest } = doc;
          return {
            ...rest,
            pdfUrl: rest.pdfUrl || `/api/pdf/${doc.id}`
          };
        }
        return doc;
      });
      fs.writeFileSync(DOCS_FILE, JSON.stringify(cleanDocs, null, 2), "utf-8");
      // Automatically trigger background sync to ChromaDB Cloud
      triggerAutoChromaSync(1200);
    } catch (e) {
      console.warn("[Storage] Error saving documents to disk:", e);
    }
  }

  function saveAnnouncements() {
    try {
      ensureDataDir();
      fs.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify(serverAnnouncements, null, 2), "utf-8");
      // Automatically trigger background sync to ChromaDB Cloud
      triggerAutoChromaSync(1200);
    } catch (e) {
      console.warn("[Storage] Error saving announcements to disk:", e);
    }
  }

  // Automatic ChromaDB Cloud Synchronization Engine
  let autoChromaSyncTimer: NodeJS.Timeout | null = null;
  let isAutoChromaSyncRunning = false;

  function triggerAutoChromaSync(delayMs = 1500) {
    if (autoChromaSyncTimer) clearTimeout(autoChromaSyncTimer);
    autoChromaSyncTimer = setTimeout(async () => {
      if (isAutoChromaSyncRunning) {
        // Reschedule if already performing a synchronization pass
        setTimeout(() => triggerAutoChromaSync(3000), 3000);
        return;
      }
      isAutoChromaSyncRunning = true;
      try {
        console.log(`[ChromaDB Auto-Sync] Auto-synchronizing ${serverDocuments.length} documents and ${serverAnnouncements.length} announcements to ChromaDB Cloud...`);
        const ready = await initChroma();
        if (ready) {
          const docCount = await indexAllDocumentsToChroma(serverDocuments);
          const annCount = await indexAllAnnouncementsToChroma(serverAnnouncements);
          const status = await getChromaStatus();
          console.log(`[ChromaDB Auto-Sync] Complete: ${docCount} document chunks, ${annCount} announcement vectors synced. Collection total: ${status.vectorCount} vectors in database "${status.database}".`);
        }
      } catch (syncErr: any) {
        console.warn(`[ChromaDB Auto-Sync] Synchronization warning:`, syncErr?.message || syncErr);
      } finally {
        isAutoChromaSyncRunning = false;
      }
    }, delayMs);
  }

  // Load any previously persisted data on server boot
  loadPersistedData();
  
  // Initial background auto-sync to ensure ChromaDB is always updated on server launch
  triggerAutoChromaSync(2000);

  // Periodic automatic reconciliation every 5 minutes
  setInterval(() => {
    triggerAutoChromaSync(500);
  }, 5 * 60 * 1000);

  const pdfBuffers = new Map<string, Buffer>();
  const setPdfBuffer = (key: string, val: Buffer) => {
    if (pdfBuffers.size >= 3) {
      const firstKey = pdfBuffers.keys().next().value;
      if (firstKey) pdfBuffers.delete(firstKey);
    }
    pdfBuffers.set(key, val);
  };

  // High-performance, low-memory streaming helper with HTTP Range support (Zero Heap Bloat)
  function streamFileWithRange(
    filePath: string,
    req: express.Request,
    res: express.Response,
    mimeType: string = "application/pdf",
    downloadName?: string
  ): boolean {
    if (!fs.existsSync(filePath)) return false;
    try {
      const stat = fs.statSync(filePath);
      const range = req.headers.range;

      if (downloadName) {
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(downloadName)}"`);
      } else {
        res.setHeader("Content-Disposition", "inline");
      }
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=86400");

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        if (start >= stat.size || end >= stat.size || start > end) {
          res.status(416).setHeader("Content-Range", `bytes */${stat.size}`).send();
          return true;
        }
        const chunksize = (end - start) + 1;
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Content-Length": chunksize,
          "Content-Type": mimeType
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return true;
      }

      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": mimeType
      });
      fs.createReadStream(filePath).pipe(res);
      return true;
    } catch (e) {
      console.warn("[StreamFile] Error streaming file:", e);
      return false;
    }
  }

  // Auto-Scaling Storage Management Endpoints
  app.get("/api/storage/metrics", (req, res) => {
    try {
      const metrics = storageScaler.getMetrics();
      return res.json(metrics);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to retrieve storage metrics" });
    }
  });

  app.post("/api/storage/auto-scale/trigger", (req, res) => {
    try {
      const reason = req.body?.reason || "Simulated auto-scale tier test requested by teacher";
      const nextTier = storageScaler.forceScaleUp(reason);
      const metrics = storageScaler.getMetrics();
      return res.json({ success: true, newTier: nextTier, metrics });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to trigger auto-scale" });
    }
  });

  app.post("/api/storage/optimize", (req, res) => {
    try {
      const optResult = storageScaler.optimizeStorage();
      const metrics = storageScaler.getMetrics();
      return res.json({ success: true, ...optResult, metrics });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to optimize storage" });
    }
  });

  // Route to stream original PDF binary buffer (with fallback to disk, on-demand PPTX conversion, and remote Teacher service)
  app.get("/api/pdf/:id", async (req, res) => {
    // 1. First check if PDF exists on disk in PDF_DIR and stream via Range
    const onDiskPath = path.join(PDF_DIR, `${req.params.id}.pdf`);
    if (fs.existsSync(onDiskPath)) {
      if (streamFileWithRange(onDiskPath, req, res, "application/pdf")) return;
    }

    // 2. Check if PDF exists in RAW_FILES_DIR
    const rawPdfPath = path.join(RAW_FILES_DIR, `${req.params.id}.pdf`);
    if (fs.existsSync(rawPdfPath)) {
      if (streamFileWithRange(rawPdfPath, req, res, "application/pdf")) return;
    }

    // 3. Check if there is an uploaded PPTX or PPT file that can be converted to PDF on the fly
    if (fs.existsSync(RAW_FILES_DIR)) {
      try {
        const pptxFile = fs.readdirSync(RAW_FILES_DIR).find(f => f.startsWith(`${req.params.id}.`) && /\.(pptx|ppt)$/i.test(f));
        if (pptxFile) {
          const rawPptxPath = path.join(RAW_FILES_DIR, pptxFile);
          await renderPptxToSlideImages(req.params.id, rawPptxPath);
          const checkPdf = path.join(PDF_DIR, `${req.params.id}.pdf`);
          if (fs.existsSync(checkPdf)) {
            if (streamFileWithRange(checkPdf, req, res, "application/pdf")) return;
          }
        }
      } catch (e: any) {
        console.warn("[PDF on-demand conversion notice]:", e?.message);
      }
    }

    // 4. Check if slide images exist for docId and synthesize high-res PDF
    const slideDir = path.join(SLIDES_DIR, req.params.id);
    if (fs.existsSync(slideDir)) {
      try {
        const slideFiles = fs.readdirSync(slideDir)
          .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
          .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, "") || "0", 10);
            const numB = parseInt(b.replace(/\D/g, "") || "0", 10);
            return numA - numB;
          });
        if (slideFiles.length > 0) {
          const { PDFDocument } = await import("pdf-lib");
          const pdfDoc = await PDFDocument.create();
          for (const sf of slideFiles) {
            const imgBytes = fs.readFileSync(path.join(slideDir, sf));
            const img = sf.toLowerCase().endsWith(".png") ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
            const page = pdfDoc.addPage([img.width, img.height]);
            page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
          }
          const pdfBytes = await pdfDoc.save();
          const targetPdf = path.join(PDF_DIR, `${req.params.id}.pdf`);
          fs.writeFileSync(targetPdf, Buffer.from(pdfBytes));
          if (streamFileWithRange(targetPdf, req, res, "application/pdf")) return;
        }
      } catch (e: any) {
        console.warn("[Slide images to PDF compilation notice]:", e?.message);
      }
    }

    let buf = pdfBuffers.get(req.params.id);
    if (!buf) {
      // Check if document has base64 dataUrl in serverDocuments
      const matchingDoc = serverDocuments.find(d => d.id === req.params.id);
      if (matchingDoc?.pdfDataUrl && typeof matchingDoc.pdfDataUrl === "string" && matchingDoc.pdfDataUrl.startsWith("data:")) {
        try {
          const b64 = matchingDoc.pdfDataUrl.split(",")[1];
          buf = Buffer.from(b64, "base64");
        } catch {}
      }
    }

    if (buf) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Content-Length", buf.length);
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(buf);
    }

    let teacherUrl = (process.env.TEACHER_API_URL || process.env.TEACHER_SERVICE_URL || "").trim().replace(/\/$/, "");
    if (teacherUrl && !teacherUrl.startsWith("http://") && !teacherUrl.startsWith("https://")) {
      teacherUrl = `https://${teacherUrl}`;
    }
    if (teacherUrl) {
      try {
        const remoteRes = await fetch(`${teacherUrl}/api/pdf/${req.params.id}`);
        if (remoteRes.ok) {
          const arrayBuf = await remoteRes.arrayBuffer();
          const remoteBuf = Buffer.from(arrayBuf);
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", "inline");
          res.setHeader("Content-Length", remoteBuf.length);
          res.setHeader("Cache-Control", "public, max-age=86400");
          return res.send(remoteBuf);
        }
      } catch (e: any) {
        console.warn("[PDF Proxy Error]:", e?.message);
      }
    }

    return res.status(404).json({ error: "PDF document binary not found or session expired" });
  });

  // Route to stream or view any raw uploaded file (PPTX, PPT, PDF, DOCX, etc.)
  app.get(["/api/file/:id", "/api/file/:id/:filename"], async (req, res) => {
    const fileId = req.params.id;
    if (fs.existsSync(RAW_FILES_DIR)) {
      try {
        const matchingFile = fs.readdirSync(RAW_FILES_DIR).find(f => f.startsWith(`${fileId}.`) || f === fileId);
        if (matchingFile) {
          const fullPath = path.join(RAW_FILES_DIR, matchingFile);
          const ext = path.extname(matchingFile).toLowerCase();
          const mimeType = ext === ".pptx" ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            : ext === ".ppt" ? "application/vnd.ms-powerpoint"
            : ext === ".pdf" ? "application/pdf"
            : ext === ".docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/octet-stream";
          if (streamFileWithRange(fullPath, req, res, mimeType)) return;
        }
      } catch {}
    }

    const onDiskPdf = path.join(PDF_DIR, `${fileId}.pdf`);
    if (fs.existsSync(onDiskPdf)) {
      if (streamFileWithRange(onDiskPdf, req, res, "application/pdf")) return;
    }

    const pdfBuf = pdfBuffers.get(fileId);
    if (pdfBuf) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${fileId}.pdf"`);
      res.setHeader("Content-Length", pdfBuf.length);
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(pdfBuf);
    }

    return res.status(404).json({ error: "File not found or session expired" });
  });

  // Route to download original untouched uploaded file
  app.get("/api/download/:id", async (req, res) => {
    const fileId = req.params.id;
    if (fs.existsSync(RAW_FILES_DIR)) {
      try {
        const matchingFile = fs.readdirSync(RAW_FILES_DIR).find(f => f.startsWith(`${fileId}.`) || f === fileId);
        if (matchingFile) {
          const fullPath = path.join(RAW_FILES_DIR, matchingFile);
          const ext = path.extname(matchingFile).toLowerCase();
          const mimeType = ext === ".pptx" ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            : ext === ".ppt" ? "application/vnd.ms-powerpoint"
            : ext === ".pdf" ? "application/pdf"
            : ext === ".docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/octet-stream";
          if (streamFileWithRange(fullPath, req, res, mimeType, matchingFile)) return;
        }
      } catch {}
    }

    const onDiskPdf = path.join(PDF_DIR, `${fileId}.pdf`);
    if (fs.existsSync(onDiskPdf)) {
      if (streamFileWithRange(onDiskPdf, req, res, "application/pdf", `${fileId}.pdf`)) return;
    }

    const pdfBuf = pdfBuffers.get(fileId);
    if (pdfBuf) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileId}.pdf"`);
      res.setHeader("Content-Length", pdfBuf.length);
      return res.send(pdfBuf);
    }

    const matchingDoc = serverDocuments.find(d => d.id === fileId);
    if (matchingDoc) {
      let exportContent = `# ${matchingDoc.title}\n\n`;
      if (matchingDoc.sections) {
        matchingDoc.sections.forEach(s => {
          exportContent += `\n---\n\n## ${s.title}\n\n${s.contentMarkdown || ""}\n`;
        });
      }
      const buf = Buffer.from(exportContent, "utf-8");
      const safeName = `${matchingDoc.title.replace(/[^a-zA-Z0-9_\-\.]/g, "_")}.md`;
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(safeName)}"`);
      res.setHeader("Content-Length", buf.length);
      return res.send(buf);
    }

    return res.status(404).json({ error: "File not found" });
  });

  // Helper function to render PowerPoint presentations (.pptx, .ppt) directly to exact pixel-for-pixel slide images and PDF
  async function renderPptxToSlideImages(docId: string, pptxPath: string): Promise<string[]> {
    try {
      const mapping = await convertPptxToSlides(docId, pptxPath);
      const urls = Object.values(mapping) as string[];
      if (urls.length > 0) return urls;
    } catch (e) {
      console.warn("[Converter notice]:", e);
    }

    const docSlideDir = path.join(SLIDES_DIR, docId);
    if (!fs.existsSync(docSlideDir)) {
      try { fs.mkdirSync(docSlideDir, { recursive: true }); } catch {}
    }

    // Check if high-resolution raster slide images already exist
    const existingRasters = fs.readdirSync(docSlideDir).filter(f => /\.(png|webp|jpg|jpeg|svg)$/i.test(f));
    if (existingRasters.length > 0) {
      return existingRasters
        .sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, "") || "0", 10);
          const numB = parseInt(b.replace(/\D/g, "") || "0", 10);
          return numA - numB;
        })
        .map((_, idx) => `/api/slide/${docId}/${idx + 1}`);
    }

    // Check if an existing PDF is available to render exact slides with Ghostscript
    const existingPdf = [
      path.join(PDF_DIR, `${docId}.pdf`),
      path.join(RAW_FILES_DIR, `${docId}.pdf`),
      pptxPath.toLowerCase().endsWith(".pdf") ? pptxPath : null
    ].find(p => p && fs.existsSync(p));

    if (existingPdf) {
      try {
        execSync(`gs -dNOPAUSE -dBATCH -sDEVICE=png16m -r150 -sOutputFile="${path.join(docSlideDir, "slide-%d.png")}" "${existingPdf}"`, {
          timeout: 90000,
          stdio: ["ignore", "pipe", "ignore"]
        });
        const generated = fs.readdirSync(docSlideDir).filter(f => /\.(png|webp|jpg|jpeg|svg)$/i.test(f));
        if (generated.length > 0) {
          console.log(`[Ghostscript Engine] Successfully rendered ${generated.length} exact slides for ${docId}`);
          return generated
            .sort((a, b) => {
              const numA = parseInt((a.match(/slide-?(\d+)/i) || a.match(/(\d+)/) || ["0", "0"])[1], 10);
              const numB = parseInt((b.match(/slide-?(\d+)/i) || b.match(/(\d+)/) || ["0", "0"])[1], 10);
              return numA - numB;
            })
            .map((_, idx) => `/api/slide/${docId}/${idx + 1}`);
        }
      } catch (gsErr) {
        console.warn("[Ghostscript direct render notice]:", gsErr);
      }
    }

    // Use our pure Python native SVG renderer script (zero binary dependencies required)
    try {
      fs.mkdirSync(docSlideDir, { recursive: true });
      execSync(`python3 server/pptx_renderer.py "${pptxPath}" "${docSlideDir}"`, {
        timeout: 90000,
        stdio: ["ignore", "pipe", "ignore"]
      });

      const generated = fs.readdirSync(docSlideDir).filter(f => /\.(png|webp|jpg|jpeg|svg)$/i.test(f));
      if (generated.length > 0) {
        console.log(`[PPTX Renderer] Successfully rendered ${generated.length} exact slides for ${docId} via Python native SVG renderer`);
        return generated
          .sort((a, b) => {
            const numA = parseInt((a.match(/slide-?(\d+)/i) || a.match(/(\d+)/) || ["0", "0"])[1], 10);
            const numB = parseInt((b.match(/slide-?(\d+)/i) || b.match(/(\d+)/) || ["0", "0"])[1], 10);
            return numA - numB;
          })
          .map((_, idx) => `/api/slide/${docId}/${idx + 1}`);
      }
    } catch (renderErr) {
      console.warn("[Python PPTX Renderer error]:", renderErr);
    }

    // Native High-Fidelity Slide & PDF Engine (zero external binary dependencies)
    try {
      const pptxBuffer = fs.readFileSync(pptxPath);
      const parsed = await parsePptxBuffer(pptxBuffer, path.basename(pptxPath));
      const pages = parsed.pages && parsed.pages.length > 0 ? parsed.pages : [
        { pageNum: 1, title: path.basename(pptxPath, path.extname(pptxPath)), text: "PowerPoint Slide Deck" }
      ];

      // 1. Generate crisp 16:9 SVG slide images
      for (let idx = 0; idx < pages.length; idx++) {
        const p = pages[idx];
        const pageNum = idx + 1;
        const safeTitle = (p.title || `Slide ${pageNum}`).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeSub = (p.subtitle || `Slide ${pageNum} of ${pages.length} • Presentation Deck`).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Extract embedded diagram image if present
        const imgMatch = p.text ? p.text.match(/!\[Slide Diagram\]\((data:image\/[a-zA-Z+]+;base64,[^\)]+)\)/) : null;
        const diagramDataUrl = imgMatch ? imgMatch[1] : null;

        // Clean text lines
        const cleanLines = (p.text || "")
          .replace(/!\[Slide Diagram\]\([^\)]+\)/g, "")
          .split("\n")
          .map(l => l.trim().replace(/^\*\s*/, ""))
          .filter(l => Boolean(l) && !l.startsWith("--- [Slide"));

        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <!-- Clean Widescreen Presentation Canvas -->
  <rect width="1600" height="900" fill="#ffffff"/>
  <rect width="1600" height="900" fill="#f8fafc" fill-opacity="0.85"/>
  <rect x="0" y="0" width="1600" height="6" fill="#f59e0b"/>

  <!-- Slide Header Section -->
  <g transform="translate(60, 45)">
    <text x="0" y="24" fill="#d97706" font-size="14" font-weight="700" font-family="system-ui, -apple-system, sans-serif" letter-spacing="1.5">SLIDE ${pageNum} OF ${pages.length}</text>
    <text x="0" y="75" fill="#0f172a" font-size="38" font-weight="800" font-family="system-ui, -apple-system, sans-serif">${safeTitle}</text>
    <line x1="0" y1="105" x2="1480" y2="105" stroke="#e2e8f0" stroke-width="2"/>
  </g>
`;

        // Check if slide contains a markdown table
        const tableLines = cleanLines.filter(l => l.startsWith("|") && l.endsWith("|"));
        const nonTableLines = cleanLines.filter(l => !l.startsWith("|") || !l.endsWith("|"));

        if (diagramDataUrl) {
          // Two-column layout with diagram on right
          svgContent += `
  <!-- Left Content Column -->
  <g transform="translate(60, 185)">
`;
          let textY = 25;
          for (let lineIdx = 0; lineIdx < Math.min(nonTableLines.length, 12); lineIdx++) {
            const rawLine = nonTableLines[lineIdx];
            const isSub = rawLine.startsWith("  ") || rawLine.startsWith("\t");
            const cleanText = rawLine.replace(/^[*\-•\s]+/, "").trim();
            const safeLine = cleanText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            const indentX = isSub ? 40 : 15;
            svgContent += `    <circle cx="${indentX}" cy="${textY - 6}" r="${isSub ? 3 : 4.5}" fill="${isSub ? "#94a3b8" : "#d97706"}"/>
    <text x="${indentX + 18}" y="${textY}" fill="#1e293b" font-size="${isSub ? 18 : 21}" font-family="system-ui, -apple-system, sans-serif" font-weight="${isSub ? 400 : 600}">${safeLine}</text>
`;
            textY += isSub ? 34 : 42;
          }
          svgContent += `  </g>

  <!-- Right Diagram Frame -->
  <rect x="760" y="180" width="780" height="630" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
  <image href="${diagramDataUrl}" x="775" y="195" width="750" height="600" preserveAspectRatio="xMidYMid meet"/>
`;
        } else if (tableLines.length >= 3) {
          // Render exact table rows and columns cleanly
          const parsedRows = tableLines
            .filter(l => !l.includes("---"))
            .map(l => l.slice(1, -1).split("|").map(c => c.trim()));
          
          if (parsedRows.length > 0) {
            const numCols = Math.max(...parsedRows.map(r => r.length));
            const colWidth = Math.floor(1480 / numCols);
            const rowHeight = Math.min(65, Math.floor(580 / parsedRows.length));
            
            svgContent += `  <!-- Presentation Table -->\n  <g transform="translate(60, 185)">\n`;
            parsedRows.forEach((row, rIdx) => {
              const y = rIdx * rowHeight;
              const isHeader = rIdx === 0;
              svgContent += `    <rect x="0" y="${y}" width="1480" height="${rowHeight}" fill="${isHeader ? "#f1f5f9" : rIdx % 2 === 0 ? "#ffffff" : "#f8fafc"}" stroke="#cbd5e1" stroke-width="1"/>\n`;
              row.forEach((cell, cIdx) => {
                const x = cIdx * colWidth;
                const safeCell = cell.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                svgContent += `    <text x="${x + 20}" y="${y + rowHeight / 2 + 6}" fill="${isHeader ? "#0f172a" : "#334155"}" font-size="${isHeader ? 18 : 16}" font-weight="${isHeader ? 700 : 500}" font-family="system-ui, -apple-system, sans-serif">${safeCell.slice(0, 40)}</text>\n`;
              });
            });
            svgContent += `  </g>\n`;
          }
        } else {
          // Standard clean presentation bullet list and text
          svgContent += `
  <!-- Presentation Slide Content -->
  <g transform="translate(60, 195)">
`;
          let textY = 25;
          for (let lineIdx = 0; lineIdx < Math.min(cleanLines.length, 12); lineIdx++) {
            const rawLine = cleanLines[lineIdx];
            const isSub = rawLine.startsWith("  ") || rawLine.startsWith("\t");
            const cleanText = rawLine.replace(/^[*\-•\s]+/, "").trim();
            const safeLine = cleanText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

            const indentX = isSub ? 45 : 15;
            svgContent += `    <circle cx="${indentX}" cy="${textY - 6}" r="${isSub ? 3.5 : 5}" fill="${isSub ? "#94a3b8" : "#d97706"}"/>
    <text x="${indentX + 22}" y="${textY}" fill="#1e293b" font-size="${isSub ? 20 : 24}" font-family="system-ui, -apple-system, sans-serif" font-weight="${isSub ? 400 : 600}">${safeLine}</text>
`;
            textY += isSub ? 40 : 48;
          }
          svgContent += `  </g>
`;
        }

        svgContent += `
  <!-- Footer -->
  <line x1="60" y1="840" x2="1540" y2="840" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="60" y="870" fill="#64748b" font-size="14" font-weight="600" font-family="system-ui, -apple-system, sans-serif">${safeSub}</text>
  <text x="1540" y="870" fill="#64748b" font-size="14" font-weight="700" font-family="system-ui, -apple-system, sans-serif" text-anchor="end">Slide ${pageNum} of ${pages.length}</text>
</svg>`;

        fs.writeFileSync(path.join(docSlideDir, `slide-${pageNum}.svg`), svgContent, "utf-8");
      }

      // 2. Synthesize high-resolution PDF for the presentation using pdf-lib
      try {
        const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
        const pdfDoc = await PDFDocument.create();
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

        for (let idx = 0; idx < pages.length; idx++) {
          const p = pages[idx];
          const page = pdfDoc.addPage([960, 540]);
          page.drawRectangle({
            x: 0,
            y: 0,
            width: 960,
            height: 540,
            color: rgb(0.047, 0.071, 0.118) // #0c121e
          });
          page.drawRectangle({
            x: 0,
            y: 536,
            width: 960,
            height: 4,
            color: rgb(0.96, 0.62, 0.04) // amber #f59e0b
          });

          const safeTitle = (p.title || `Slide ${idx + 1}`).replace(/[^\x20-\x7E]/g, " ").slice(0, 55);
          page.drawText(safeTitle, {
            x: 40,
            y: 470,
            size: 22,
            font: fontBold,
            color: rgb(1, 1, 1)
          });

          const safeSub = `Slide ${idx + 1} of ${pages.length} - ${(p.subtitle || "Presentation Deck")}`.replace(/[^\x20-\x7E]/g, " ").slice(0, 70);
          page.drawText(safeSub, {
            x: 40,
            y: 504,
            size: 11,
            font: fontBold,
            color: rgb(0.96, 0.62, 0.04)
          });

          // Embed diagram if present
          const imgMatch = p.text ? p.text.match(/!\[Slide Diagram\]\((data:image\/([a-zA-Z+]+);base64,([^\)]+))\)/) : null;
          let hasImage = false;
          if (imgMatch) {
            try {
              const mime = imgMatch[2].toLowerCase();
              const imgBuffer = Buffer.from(imgMatch[3], "base64");
              const embeddedImg = mime.includes("png") ? await pdfDoc.embedPng(imgBuffer) : await pdfDoc.embedJpg(imgBuffer);
              const maxW = 460;
              const maxH = 360;
              const scale = Math.min(maxW / embeddedImg.width, maxH / embeddedImg.height, 1);
              const imgW = embeddedImg.width * scale;
              const imgH = embeddedImg.height * scale;
              const imgX = 960 - 40 - imgW;
              const imgY = 60 + (360 - imgH) / 2;

              page.drawRectangle({
                x: imgX - 8,
                y: imgY - 8,
                width: imgW + 16,
                height: imgH + 16,
                color: rgb(0.012, 0.027, 0.07),
                borderColor: rgb(0.2, 0.25, 0.35),
                borderWidth: 1
              });
              page.drawImage(embeddedImg, { x: imgX, y: imgY, width: imgW, height: imgH });
              hasImage = true;
            } catch {}
          }

          const cleanBodyText = (p.text || "").replace(/!\[Slide Diagram\]\([^\)]+\)/g, "").trim();
          const rawLines = cleanBodyText.split("\n").map(l => l.trim().replace(/^\*\s*/, "")).filter(Boolean);
          let textY = 425;
          for (const line of rawLines.slice(0, 9)) {
            if (textY < 60) break;
            const safeLine = line.replace(/[^\x20-\x7E]/g, " ").slice(0, hasImage ? 42 : 90);
            page.drawText(`*  ${safeLine}`, {
              x: 40,
              y: textY,
              size: 12,
              font: fontReg,
              color: rgb(0.85, 0.88, 0.95)
            });
            textY -= 30;
          }
        }

        const pdfBytes = await pdfDoc.save();
        const targetPdf = path.join(PDF_DIR, `${docId}.pdf`);
        fs.writeFileSync(targetPdf, Buffer.from(pdfBytes));
        const cachedRawPdf = path.join(RAW_FILES_DIR, `${docId}.pdf`);
        if (!fs.existsSync(cachedRawPdf)) {
          fs.writeFileSync(cachedRawPdf, Buffer.from(pdfBytes));
        }
        setPdfBuffer(docId, Buffer.from(pdfBytes));
      } catch (pdfErr) {
        console.warn("[PPTX-RENDER] Notice generating synthetic PDF:", pdfErr);
      }

      const generated = fs.readdirSync(docSlideDir).filter(f => /\.(png|webp|jpg|jpeg|svg)$/i.test(f));
      return generated
        .sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, "") || "0", 10);
          const numB = parseInt(b.replace(/\D/g, "") || "0", 10);
          return numA - numB;
        })
        .map((_, idx) => `/api/slide/${docId}/${idx + 1}`);
    } catch (nativeErr) {
      console.warn("[PPTX-RENDER] Native slide generation notice:", nativeErr);
      return [];
    }
  }

  function generateSlideSvg(title: string, subtitle: string, bullets: string[], pageNum: number, totalPages: number, docTitle: string): string {
    const esc = (s: string) => String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

    const safeTitle = esc(title || `Slide ${pageNum}`);
    const safeSubtitle = esc(subtitle || "LECTURE NOTES");
    const safeDocTitle = esc(docTitle || "Course Notes Hub");

    const cleanBulletElements = bullets.map((bullet, idx) => {
      const safeBullet = esc(bullet);
      const y = 260 + idx * 60;
      return `
        <circle cx="140" cy="${y - 8}" r="6" fill="#d97706" />
        <text x="165" y="${y}" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="600" fill="#1e293b">${safeBullet}</text>
      `;
    }).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <!-- Clean Widescreen Presentation Canvas (PowerPoint 16:9 Style) -->
  <rect width="1920" height="1080" fill="#ffffff" />
  <rect width="1920" height="1080" fill="#f8fafc" fill-opacity="0.85" />

  <!-- Top Accent Bar -->
  <rect x="0" y="0" width="1920" height="8" fill="#f59e0b" />

  <!-- Slide Header Section -->
  <g transform="translate(120, 85)">
    <!-- Subtitle Eyebrow -->
    <text x="0" y="30" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="800" fill="#d97706" letter-spacing="2.5">${safeSubtitle.toUpperCase()}</text>

    <!-- Main Title -->
    <text x="0" y="95" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="800" fill="#0f172a" letter-spacing="-0.5">${safeTitle}</text>

    <!-- Divider Line -->
    <line x1="0" y1="135" x2="1680" y2="135" stroke="#e2e8f0" stroke-width="2" />
  </g>

  <!-- Slide Body Content -->
  ${cleanBulletElements}

  <!-- Footer Bar -->
  <g transform="translate(120, 1000)">
    <line x1="0" y1="0" x2="1680" y2="0" stroke="#e2e8f0" stroke-width="1.5" />
    <text x="0" y="36" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#64748b">${safeDocTitle}</text>
    <text x="1680" y="36" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#64748b">Slide ${pageNum} of ${totalPages}</text>
  </g>
</svg>`;
  }

  // Route to stream pre-rendered exact high-res slide image or synthesized presentation slide
  app.get("/api/slide/:id/:page", async (req, res) => {
    const docId = req.params.id;
    const pageNum = parseInt(req.params.page, 10);
    const docSlideDir = path.join(SLIDES_DIR, docId);

    // 1. First check if exact raster image (PNG, WebP, JPG, SVG) already exists on disk
    if (fs.existsSync(docSlideDir)) {
      const directPng = path.join(docSlideDir, `slide-${pageNum}.png`);
      if (fs.existsSync(directPng)) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.sendFile(directPng);
      }
      const files = fs.readdirSync(docSlideDir).filter(f => /\.(png|webp|jpg|jpeg|svg)$/i.test(f));
      files.sort((a, b) => {
        const extA = path.extname(a).toLowerCase();
        const extB = path.extname(b).toLowerCase();
        if (extA === ".png" && extB !== ".png") return -1;
        if (extB === ".png" && extA !== ".png") return 1;
        return 0;
      });
      const match = files.find(f => {
        const m = f.match(/slide-?(\d+)/i) || f.match(/(\d+)/);
        return m && parseInt(m[1], 10) === pageNum;
      });
      if (match) {
        const filePath = path.join(docSlideDir, match);
        const ext = path.extname(match).toLowerCase();
        const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".svg" ? "image/svg+xml" : "image/jpeg";
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.sendFile(filePath);
      }
    }

    // 2. If slide image is not yet rendered, check if raw PPTX/PPT exists in RAW_FILES_DIR and render on the fly
    if (fs.existsSync(RAW_FILES_DIR)) {
      try {
        const rawFile = fs.readdirSync(RAW_FILES_DIR).find(f => f.startsWith(`${docId}.`) && /\.(pptx|ppt)$/i.test(f));
        if (rawFile) {
          const rawPath = path.join(RAW_FILES_DIR, rawFile);
          await renderPptxToSlideImages(docId, rawPath);

          if (fs.existsSync(docSlideDir)) {
            const files = fs.readdirSync(docSlideDir).filter(f => /\.(png|webp|jpg|jpeg|svg)$/i.test(f));
            const match = files.find(f => {
              const m = f.match(/slide-?(\d+)/i) || f.match(/(\d+)/);
              return m && parseInt(m[1], 10) === pageNum;
            });
            if (match) {
              const filePath = path.join(docSlideDir, match);
              const ext = path.extname(match).toLowerCase();
              const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".svg" ? "image/svg+xml" : "image/jpeg";
              res.setHeader("Content-Type", mimeType);
              res.setHeader("Cache-Control", "public, max-age=86400");
              return res.sendFile(filePath);
            }
          }
        }
      } catch (renderErr) {
        console.warn("[On-demand slide render notice]:", renderErr);
      }
    }

    // 3. Fallback proxy to Teacher portal backend if running on student portal
    try {
      const teacherSlideUrl = `https://course-teacher-portal.onrender.com/api/slide/${docId}/${pageNum}`;
      const teacherRes = await fetch(teacherSlideUrl);
      if (teacherRes.ok) {
        const buffer = await teacherRes.arrayBuffer();
        const contentType = teacherRes.headers.get("content-type") || "image/svg+xml";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(Buffer.from(buffer));
      }
    } catch {
      // ignore
    }

    // If exact pre-rendered image doesn't exist on disk, return 404 so PptReader seamlessly falls back to the official Office / Google Docs viewer iframe
    return res.status(404).json({ error: "Slide image not found" });
  });

  // Document Parser API route: parses uploaded file (PDF, DOCX, PPTX, PPT, DOC, TXT, MD, Code, JSON) into structured NoteDocument
  app.post("/api/parse-document", async (req, res) => {
    try {
      const { 
        fileName, 
        fileType, 
        fileContent,
        title,
        subject,
        unit,
        unitNumber,
        unitTitle,
        courseCode,
        uploadedBy,
        isPublished
      } = req.body;
      if (!fileName || !fileContent) {
        return res.status(400).json({ error: "fileName and fileContent are required" });
      }

      const docId = `upload-${Date.now()}`;
      const cleanFileName = fileName.replace(/\.[^/.]+$/, "");
      const lowerName = fileName.toLowerCase();

      // Extract binary buffer first
      let fileBuffer: Buffer;
      if (fileContent.startsWith("data:")) {
        const base64Data = fileContent.split(",")[1];
        fileBuffer = Buffer.from(base64Data, "base64");
      } else if (/^[A-Za-z0-9+/=]+$/.test(fileContent.slice(0, 1000).replace(/\s/g, ""))) {
        try {
          fileBuffer = Buffer.from(fileContent, "base64");
        } catch {
          fileBuffer = Buffer.from(fileContent);
        }
      } else {
        fileBuffer = Buffer.from(fileContent);
      }

      // Auto-scale storage engine evaluation (dynamically expands storage tier and memory buffer headroom)
      storageScaler.evaluateAndScaleSync(fileName, fileBuffer?.length || 0);

      // Inspect real file magic bytes to prevent misclassified files (e.g. PPTX named as .pdf)
      let realIsPdf = false;
      let realIsPptx = false;
      let realIsDocx = false;
      let realIsDoc = false;
      let realIsPpt = false;

      if (fileBuffer && fileBuffer.length >= 4) {
        const magicHeader = fileBuffer.slice(0, 1024).toString("latin1");
        const isZip = fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B && fileBuffer[2] === 0x03 && fileBuffer[3] === 0x04;
        const isOle = fileBuffer.length >= 8 && fileBuffer[0] === 0xD0 && fileBuffer[1] === 0xCF && fileBuffer[2] === 0x11 && fileBuffer[3] === 0xE0;

        if (magicHeader.includes("%PDF-")) {
          realIsPdf = true;
        } else if (isZip) {
          try {
            const testZip = new AdmZip(fileBuffer);
            const entries = testZip.getEntries().map(e => e.entryName.toLowerCase());
            if (entries.some(e => e.startsWith("ppt/") || e.includes("presentationml"))) {
              realIsPptx = true;
            } else if (entries.some(e => e.startsWith("word/") || e.includes("wordprocessingml"))) {
              realIsDocx = true;
            }
          } catch {}
        } else if (isOle) {
          if (lowerName.endsWith(".ppt") || fileType?.includes("powerpoint")) realIsPpt = true;
          else realIsDoc = true;
        }
      }

      // Resolve final format with magic bytes priority over file extension
      let isPdf = realIsPdf || (!realIsPptx && !realIsDocx && !realIsDoc && !realIsPpt && (lowerName.endsWith(".pdf") || fileType?.includes("pdf") || fileContent.startsWith("data:application/pdf")));
      let isDocx = realIsDocx || (!realIsPdf && (lowerName.endsWith(".docx") || fileType?.includes("wordprocessingml") || fileContent.startsWith("data:application/vnd.openxmlformats-officedocument.wordprocessingml")));
      let isPptx = realIsPptx || (!realIsPdf && (lowerName.endsWith(".pptx") || fileType?.includes("presentationml") || fileContent.startsWith("data:application/vnd.openxmlformats-officedocument.presentationml")));
      let isDoc = realIsDoc || (!realIsPdf && (lowerName.endsWith(".doc") || fileType?.includes("msword")));
      let isPpt = realIsPpt || (!realIsPdf && (lowerName.endsWith(".ppt") || fileType?.includes("ms-powerpoint") || fileType?.includes("powerpoint")));

      let fileFormat: "pdf" | "docx" | "doc" | "pptx" | "ppt" | "markdown" | "code" | "text" = "text";
      if (isPdf) fileFormat = "pdf";
      else if (isDocx) fileFormat = "docx";
      else if (isPptx) fileFormat = "pptx";
      else if (isDoc) fileFormat = "doc";
      else if (isPpt) fileFormat = "ppt";
      else if (lowerName.endsWith(".md")) fileFormat = "markdown";
      else if (/\.(py|js|ts|jsx|tsx|json|html|css|sh|sql)$/i.test(lowerName)) fileFormat = "code";

      let savedRawFilePath = "";
      // Persist the original raw file (PPTX, PDF, DOCX, etc.) without alterations
      try {
        ensureDataDir();
        const fileExt = path.extname(fileName) || (isPptx ? ".pptx" : isPdf ? ".pdf" : isDocx ? ".docx" : isPpt ? ".ppt" : isDoc ? ".doc" : ".bin");
        const safeStoredName = `${docId}${fileExt}`;
        savedRawFilePath = path.join(RAW_FILES_DIR, safeStoredName);
        fs.writeFileSync(savedRawFilePath, fileBuffer);
        rawFilesMap.set(docId, {
          buffer: fileBuffer,
          fileName,
          mimeType: fileType || (isPptx ? "application/vnd.openxmlformats-officedocument.presentationml.presentation" : isPdf ? "application/pdf" : "application/octet-stream")
        });
      } catch (saveRawErr) {
        console.warn("[Storage] Notice writing raw file to disk:", saveRawErr);
      }

      let extractedText = "";
      let pdfPageCount = 1;
      let extractedPages: { pageNum: number; title?: string; subtitle?: string; text: string; speakerNotes?: string; callouts?: any[] }[] = [];

      // 1. PDF Parser
      if (isPdf && realIsPdf) {
        try {
          if (fileBuffer) {
            setPdfBuffer(docId, fileBuffer);
            try {
              ensureDataDir();
              fs.writeFileSync(path.join(PDF_DIR, `${docId}.pdf`), fileBuffer);
            } catch (diskErr) {
              console.warn("[Storage] Notice writing PDF to disk:", diskErr);
            }
          }
          const pdfRes = await parsePdfBuffer(fileBuffer);
          extractedText = pdfRes.text;
          pdfPageCount = pdfRes.pageCount || 1;
          extractedPages = pdfRes.pages || [];
          
          extractedText = extractedText
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
            .replace(/\r\n/g, "\n")
            .trim();
        } catch (pdfErr: any) {
          console.warn("[PDF Parser] extraction notice:", pdfErr?.message);
        }
      }
      // 2. DOCX Parser
      else if (isDocx) {
        try {
          const docxRes = await parseDocxBuffer(fileBuffer, fileName);
          extractedText = docxRes.text;
          pdfPageCount = docxRes.pageCount;
          extractedPages = docxRes.pages;
        } catch (docxErr: any) {
          console.warn("[DOCX Parser] extraction notice:", docxErr?.message);
        }
      }
      // 3. PPTX Parser (PowerPoint Presentations)
      else if (isPptx) {
        try {
          const pptxRes = await parsePptxBuffer(fileBuffer, fileName);
          extractedText = pptxRes.text;
          pdfPageCount = pptxRes.pageCount;
          extractedPages = pptxRes.pages;
        } catch (pptxErr: any) {
          console.warn("[PPTX Parser] extraction notice:", pptxErr?.message);
        }
      }
      // 4. Legacy DOC / PPT Parser
      else if (isDoc || isPpt) {
        try {
          const legRes = await parseLegacyOfficeBuffer(fileBuffer, fileName, isDoc ? "doc" : "ppt");
          extractedText = legRes.text;
          pdfPageCount = legRes.pageCount;
          extractedPages = legRes.pages;
        } catch (legErr: any) {
          console.warn(`[Legacy ${fileFormat} Parser] extraction notice:`, legErr?.message);
        }
      }
      // 5. Plain text, code, markdown, json
      else {
        if (fileContent.startsWith("data:")) {
          try {
            const base64Part = fileContent.split(",")[1];
            extractedText = Buffer.from(base64Part, "base64").toString("utf-8");
          } catch {
            extractedText = fileContent;
          }
        } else {
          extractedText = fileContent;
        }
      }

      // Filter out lingering syntax if any
      if (extractedText.includes("%PDF-")) {
        extractedText = extractedText.replace(/%PDF-[\s\S]*?stream[\s\S]*?endstream/gi, "").replace(/%PDF-[\s\S]*/gi, "").trim();
      }

      // If OpenRouter or Groq key is available, generate rich document metadata
      let docMeta: { title?: string; shortTitle?: string; description?: string } = {};
      const formatLabel = isPptx ? "PowerPoint Presentation" : isDocx ? "Word Document" : isPdf ? "PDF Document" : "Course Note";
      const promptText = `Provide a concise title, shortTitle (max 20 chars), and brief 1-sentence summary description for the uploaded ${formatLabel} "${fileName}".
Output ONLY valid JSON in this format:
{
  "title": "${cleanFileName}",
  "shortTitle": "${cleanFileName.slice(0, 20)}",
  "description": "Short description of the ${formatLabel}"
}`;
      const metaMessages = [
        { role: "system", content: "You are an expert document parser. Output ONLY valid JSON object with title, shortTitle, and description." },
        { role: "user", content: `${promptText}\n\nDocument Text Sample:\n${extractedText.slice(0, 4000)}` }
      ];

      // 1. Try OpenRouter first
      const openRouterMetaRes = await callOpenRouterChat(metaMessages, undefined, true);
      if (openRouterMetaRes?.text) {
        try {
          const cleanedJson = openRouterMetaRes.text.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/, "").trim();
          docMeta = JSON.parse(cleanedJson);
        } catch {}
      }

      // 2. Try Groq second if needed
      if (!docMeta.title) {
        const groqMetaRes = await callGroqChat(metaMessages, undefined, true);
        if (groqMetaRes?.text) {
          try {
            const cleanedJson = groqMetaRes.text.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/, "").trim();
            docMeta = JSON.parse(cleanedJson);
          } catch {}
        }
      }

      // Build complete page sections preserving EVERY SINGLE PAGE/SLIDE
      const sections: any[] = [];
      const totalPagesOrSlides = Math.max(pdfPageCount || 1, extractedPages.length || 1);

      if (extractedPages.length > 0) {
        for (let i = 0; i < totalPagesOrSlides; i++) {
          const pageObj = extractedPages[i];
          const pageNum = i + 1;
          const pageContent = (pageObj?.text || "").trim();
          const lines = pageContent.split("\n").map(l => l.trim()).filter(Boolean);

          let pageTitle = pageObj?.title || "";
          if (!pageTitle) {
            if (lines[0] && lines[0].length > 2 && lines[0].length < 80) {
              pageTitle = lines[0].replace(/^#+\s*/, "").trim();
            } else if (lines[1] && lines[1].length > 2 && lines[1].length < 80) {
              pageTitle = lines[1].replace(/^#+\s*/, "").trim();
            }
          }

          if (!pageTitle || pageTitle.length < 3) {
            pageTitle = isPptx || isPpt ? `Slide ${pageNum}` : `Page ${pageNum}`;
          }

          const defaultSubtitle = isPptx || isPpt 
            ? `Slide ${pageNum} of ${totalPagesOrSlides} • PowerPoint Deck`
            : isDocx 
            ? `Section ${pageNum} of ${totalPagesOrSlides} • Word Document`
            : `Page ${pageNum} of ${totalPagesOrSlides}`;

          sections.push({
            id: `section-${docId}-${pageNum}`,
            pageNumber: pageNum,
            title: pageTitle,
            subtitle: pageObj?.subtitle || defaultSubtitle,
            contentMarkdown: pageContent || `*(${isPptx || isPpt ? `Slide` : `Page`} ${pageNum})*`,
            speakerNotes: pageObj?.speakerNotes,
            callouts: pageObj?.callouts || [],
            codeBlocks: []
          });
        }
      } else if (extractedText.includes("===PAGE_BREAK_")) {
        const parts = extractedText.split(/===PAGE_BREAK_\d+===/).map(p => p.trim()).filter(Boolean);
        const count = Math.max(totalPagesOrSlides, parts.length);
        for (let i = 0; i < count; i++) {
          const pageNum = i + 1;
          const pageContent = parts[i] || "";
          const lines = pageContent.split("\n").map(l => l.trim()).filter(Boolean);
          let pageTitle = "";
          if (lines[0] && lines[0].length > 2 && lines[0].length < 80) {
            pageTitle = lines[0].replace(/^#+\s*/, "").trim();
          }
          if (!pageTitle || pageTitle.length < 3) {
            pageTitle = isPptx || isPpt ? `Slide ${pageNum}` : `Page ${pageNum}`;
          }

          sections.push({
            id: `section-${docId}-${pageNum}`,
            pageNumber: pageNum,
            title: pageTitle,
            subtitle: `Page ${pageNum} of ${count}`,
            contentMarkdown: pageContent || `*(No text extracted on Page ${pageNum})*`,
            callouts: [],
            codeBlocks: []
          });
        }
      } else {
        // Fallback for non-page text
        const textToChunk = extractedText.trim() || `Uploaded Document: ${cleanFileName}`;
        const hasFormFeed = textToChunk.includes("\f");
        const pageChunks = hasFormFeed
          ? textToChunk.split(/\f+/).map(p => p.trim()).filter(Boolean)
          : [];

        if (hasFormFeed && pageChunks.length > 0) {
          const pageCountToUse = Math.max(totalPagesOrSlides, pageChunks.length);
          for (let i = 0; i < pageCountToUse; i++) {
            const pageNum = i + 1;
            const pageContent = pageChunks[i] || "";
            const lines = pageContent.split("\n").map(l => l.trim()).filter(Boolean);
            let pageTitle = "";
            if (lines[0] && lines[0].length > 2 && lines[0].length < 80) {
              pageTitle = lines[0].replace(/^#+\s*/, "").trim();
            }
            if (!pageTitle || pageTitle.length < 3) {
              pageTitle = `Page ${pageNum}`;
            }

            sections.push({
              id: `section-${docId}-${pageNum}`,
              pageNumber: pageNum,
              title: pageTitle,
              subtitle: `Page ${pageNum} of ${pageCountToUse}`,
              contentMarkdown: pageContent || `*(Page ${pageNum})*`,
              callouts: [],
              codeBlocks: []
            });
          }
        } else {
          // Chunk text into pages of ~1500 chars
          const chunkSize = 1500;
          const totalChunks = Math.max(1, Math.ceil(textToChunk.length / chunkSize));
          for (let i = 0; i < totalChunks; i++) {
            const pageNum = i + 1;
            const chunkText = textToChunk.slice(i * chunkSize, (i + 1) * chunkSize);
            const lines = chunkText.split("\n").map(l => l.trim()).filter(Boolean);
            let pageTitle = "";
            if (lines[0] && lines[0].length > 2 && lines[0].length < 80) {
              pageTitle = lines[0].replace(/^#+\s*/, "").trim();
            }
            if (!pageTitle || pageTitle.length < 3) {
              pageTitle = `Page ${pageNum}`;
            }

            sections.push({
              id: `section-${docId}-${pageNum}`,
              pageNumber: pageNum,
              title: pageTitle,
              subtitle: `Page ${pageNum} of ${totalChunks}`,
              contentMarkdown: chunkText,
              callouts: [],
              codeBlocks: []
            });
          }
        }
      }

      const formatDescription = isPptx
        ? `PowerPoint Presentation with ${sections.length} slides.`
        : isDocx
        ? `Word Document with ${sections.length} sections/pages.`
        : `Parsed ${isPdf ? 'PDF' : 'Course'} note containing ${sections.length} pages.`;

      let slideImageUrls: string[] = [];
      if ((isPptx || isPpt || realIsPptx || realIsPpt) && savedRawFilePath && fs.existsSync(savedRawFilePath)) {
        // Non-blocking background slide image generation for lightning-fast uploads
        renderPptxToSlideImages(docId, savedRawFilePath).then(urls => {
          if (urls && urls.length > 0) {
            const docRef = serverDocuments.find(d => d.id === docId);
            if (docRef) {
              docRef.slideImages = urls;
              docRef.sections.forEach((sec: any, idx: number) => {
                if (urls[idx]) sec.slideImageUrl = urls[idx];
              });
              saveDocuments();
            }
          }
        }).catch(err => {
          console.warn("[Background Slide Render notice]:", err?.message);
        });
      }

      const finalDoc = {
        id: docId,
        title: title || docMeta.title || cleanFileName,
        shortTitle: (title || docMeta.shortTitle || cleanFileName).slice(0, 24),
        description: docMeta.description || formatDescription,
        pageCount: sections.length,
        sections: sections,
        fileFormat,
        pdfUrl: `/api/pdf/${docId}`,
        pdfDataUrl: (isPdf && realIsPdf) && typeof fileContent === "string" && fileContent.length < 500000 ? fileContent : undefined,
        slideImages: slideImageUrls.length > 0 ? slideImageUrls : undefined,
        downloadUrl: `/api/download/${docId}`,
        originalFileUrl: `/api/file/${docId}`,
        originalFileName: fileName,
        fileType: fileType || (isPdf ? "application/pdf" : isDocx ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : isPptx ? "application/vnd.openxmlformats-officedocument.presentationml.presentation" : undefined),
        subject: subject || "AWS Cloud & Labs",
        unit: unit || "Unit 1",
        unitNumber: typeof unitNumber === "number" ? unitNumber : 1,
        unitTitle: unitTitle || "",
        courseCode: courseCode || "MCA-204",
        uploadedBy: uploadedBy || "Instructor",
        uploadedAt: new Date().toLocaleDateString(),
        isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
        tags: [
          isPdf ? "PDF" : isDocx ? "DOCX" : isPptx ? "PPTX" : isDoc ? "DOC" : isPpt ? "PPT" : "Note",
          subject || "Course Material"
        ]
      };

      // Also persist to server-side documents store
      serverDocuments.unshift(finalDoc);
      saveDocuments();

      // Automatically index newly parsed document into ChromaDB Cloud
      try {
        const indexedChunks = await indexDocumentToChroma(finalDoc);
        console.log(`[ChromaDB] Document "${finalDoc.title}" auto-indexed (${indexedChunks} chunks)`);
      } catch (err: any) {
        console.warn("[ChromaDB] Document auto-indexing notice:", err?.message);
      }

      return res.json({ document: finalDoc, provider: "Document Page Engine", format: fileFormat });

    } catch (err: any) {
      console.error("Error in /api/parse-document:", err);
      res.status(500).json({ error: err.message || "Failed to parse uploaded document." });
    }
  });

  // Direct Binary Streaming Upload route for high-MB files (50MB - 1GB+)
  app.post("/api/upload-stream", async (req, res) => {
    try {
      const fileName = decodeURIComponent(String(req.query.fileName || req.headers["x-filename"] || `upload-${Date.now()}.bin`));
      const fileType = String(req.query.fileType || req.headers["x-filetype"] || "application/octet-stream");
      const title = decodeURIComponent(String(req.query.title || req.headers["x-title"] || fileName));
      const subject = decodeURIComponent(String(req.query.subject || req.headers["x-subject"] || "General Studies"));
      const unit = decodeURIComponent(String(req.query.unit || req.headers["x-unit"] || "Unit 1"));
      const unitNumber = parseInt(String(req.query.unitNumber || req.headers["x-unitnumber"] || "1"), 10) || 1;
      const unitTitle = decodeURIComponent(String(req.query.unitTitle || req.headers["x-unittitle"] || ""));
      const courseCode = decodeURIComponent(String(req.query.courseCode || req.headers["x-coursecode"] || "MCA-204"));
      const uploadedBy = decodeURIComponent(String(req.query.uploadedBy || req.headers["x-uploadedby"] || "Instructor"));
      const isPublished = req.query.isPublished !== "false" && req.headers["x-ispublished"] !== "false";

      ensureDataDir();
      const tempDir = path.join(DATA_DIR, "temp_uploads");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const tempFilePath = path.join(tempDir, `stream-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9_\-\.]/g, "_")}`);
      const writeStream = fs.createWriteStream(tempFilePath);

      let bytesReceived = 0;
      req.on("data", (chunk: Buffer) => {
        bytesReceived += chunk.length;
      });

      await new Promise<void>((resolve, reject) => {
        req.pipe(writeStream);
        writeStream.on("finish", () => resolve());
        writeStream.on("error", (err) => reject(err));
        req.on("error", (err) => reject(err));
      });

      // Autonomous scale evaluation check
      storageScaler.evaluateAndScaleSync(fileName, bytesReceived);

      const fileBuffer = fs.readFileSync(tempFilePath);
      try { fs.unlinkSync(tempFilePath); } catch {}

      const base64Data = fileBuffer.toString("base64");
      const fileContent = `data:${fileType};base64,${base64Data}`;

      const parseRes = await fetch(`http://localhost:${PORT}/api/parse-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          fileType,
          fileContent,
          title,
          subject,
          unit,
          unitNumber,
          unitTitle,
          courseCode,
          uploadedBy,
          isPublished
        })
      });

      if (!parseRes.ok) {
        const errJson = await parseRes.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to parse streamed document");
      }

      const parseData = await parseRes.json();
      return res.json({ success: true, ...parseData, bytesReceived });
    } catch (err: any) {
      console.error("[Upload-Stream Error]:", err);
      return res.status(500).json({ error: err?.message || "Failed to stream and parse uploaded document." });
    }
  });

  // Remote Teacher API URL (when Student service is deployed separately on Render)
  let rawTeacherUrl = (
    process.env.TEACHER_API_URL || 
    process.env.TEACHER_SERVICE_URL || 
    ((process.env.PORTAL_MODE || "").toLowerCase().trim() === "student" ? "https://course-teacher-portal.onrender.com" : "")
  ).trim().replace(/\/$/, "");
  if (rawTeacherUrl && !rawTeacherUrl.startsWith("http://") && !rawTeacherUrl.startsWith("https://")) {
    rawTeacherUrl = `https://${rawTeacherUrl}`;
  }
  const teacherApiUrl = rawTeacherUrl;

  async function fetchFromTeacher(apiPath: string, options?: any) {
    let targetUrl = (options?.teacherUrl || teacherApiUrl || "").trim().replace(/\/$/, "");
    if (targetUrl && !targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }
    if (!targetUrl) return null;
    try {
      const res = await fetch(`${targetUrl}${apiPath}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          ...(options?.headers || {})
        }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      console.warn(`[Student Gateway] Error proxying to Teacher at ${targetUrl}${apiPath}:`, err?.message);
    }
    return null;
  }

  // ChromaDB Cloud Status & Configuration API
  app.get("/api/chroma/status", async (req, res) => {
    try {
      const status = await getChromaStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to check ChromaDB status" });
    }
  });

  // ChromaDB Sync / Re-index API
  app.post("/api/chroma/sync", async (req, res) => {
    try {
      const docCount = await indexAllDocumentsToChroma(serverDocuments);
      const annCount = await indexAllAnnouncementsToChroma(serverAnnouncements);
      const status = await getChromaStatus();
      res.json({ success: true, indexedCount: docCount + annCount, docCount, annCount, status });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to sync ChromaDB" });
    }
  });

  // ChromaDB Semantic Vector Search API
  app.post("/api/chroma/search", async (req, res) => {
    try {
      const { query, nResults, docId, subject, unit } = req.body;
      if (!query) return res.status(400).json({ error: "query is required" });
      const results = await queryChroma(query, {
        nResults: nResults || 6,
        docId,
        subject,
        unit
      });
      res.json({ results, count: results.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Vector search failed" });
    }
  });

  // GET /api/config (Portal deployment mode: student, teacher, or both)
  app.get("/api/config", (req, res) => {
    const configuredMode = (process.env.PORTAL_MODE || "").toLowerCase().trim();
    const portalMode = configuredMode === "student" ? "student" : configuredMode === "teacher" ? "teacher" : "both";
    const isStandalone = portalMode === "student" || portalMode === "teacher";
    const chromaConfig = getChromaConfig();
    res.json({
      portalMode,
      isStandalone,
      appName: portalMode === "student" ? "Student Notes Hub" : portalMode === "teacher" ? "Teacher Upload Studio" : "AWS Cloud Notes & Study Hub",
      chroma: {
        database: chromaConfig.database,
        tenant: chromaConfig.tenant,
        collection: chromaConfig.collectionName
      }
    });
  });

  // GET /api/documents (filter by role or environment mode, with remote Teacher sync)
  app.get("/api/documents", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const serverMode = (process.env.PORTAL_MODE || "").toLowerCase().trim();
    const role = (req.query.role as string) || (serverMode === "student" ? "student" : "all");
    const requestedTeacherUrl = (req.query.teacherUrl as string) || undefined;

    // If running in student mode and configured with a remote teacher service
    if (role === "student" || serverMode === "student") {
      const activeTeacherUrl = requestedTeacherUrl || teacherApiUrl;
      if (activeTeacherUrl) {
        const remote = await fetchFromTeacher("/api/documents?role=student", { teacherUrl: activeTeacherUrl });
        if (remote && Array.isArray(remote.documents)) {
          return res.json({ documents: remote.documents, source: "remote_teacher" });
        }
      }
      const published = serverDocuments.filter(d => d.isPublished !== false);
      return res.json({ documents: published });
    }

    return res.json({ documents: serverDocuments });
  });

  // POST /api/documents (Create/Add document)
  app.post("/api/documents", async (req, res) => {
    const newDoc = req.body;
    if (!newDoc || !newDoc.id || !newDoc.title) {
      return res.status(400).json({ error: "Document ID and Title are required." });
    }
    serverDocuments.unshift(newDoc);
    saveDocuments();
    try {
      const chunks = await indexDocumentToChroma(newDoc);
      console.log(`[ChromaDB] Document "${newDoc.title}" added and indexed (${chunks} vector chunks).`);
    } catch (e: any) {
      console.warn("[ChromaDB] Index error on POST /api/documents:", e?.message || e);
    }
    return res.json({ document: newDoc, success: true, indexedInChroma: true });
  });

  // PUT /api/documents/:id (Update document metadata or publish state)
  app.put("/api/documents/:id", async (req, res) => {
    const docId = req.params.id;
    const updates = req.body;
    const idx = serverDocuments.findIndex(d => d.id === docId);
    if (idx === -1) {
      return res.status(404).json({ error: "Document not found." });
    }
    serverDocuments[idx] = { ...serverDocuments[idx], ...updates };
    saveDocuments();
    try {
      await indexDocumentToChroma(serverDocuments[idx]);
      console.log(`[ChromaDB] Document "${serverDocuments[idx].title}" updated in ChromaDB.`);
    } catch (e: any) {
      console.warn("[ChromaDB] Re-index error on PUT /api/documents/:id:", e?.message || e);
    }
    return res.json({ document: serverDocuments[idx], success: true });
  });

  // POST /api/documents/:id/re-render (Re-renders presentation slides and PDF using LibreOffice & Poppler)
  app.post("/api/documents/:id/re-render", async (req, res) => {
    const docId = req.params.id;
    const doc = serverDocuments.find(d => d.id === docId);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    let rawFilePath = "";
    if (fs.existsSync(RAW_FILES_DIR)) {
      const match = fs.readdirSync(RAW_FILES_DIR).find(f => f.startsWith(`${docId}.`) && /\.(pptx|ppt)$/i.test(f));
      if (match) rawFilePath = path.join(RAW_FILES_DIR, match);
    }

    if (!rawFilePath) {
      return res.status(400).json({ error: "Original presentation file not found on server. Please re-upload the presentation to render high-definition slides." });
    }

    try {
      const docSlideDir = path.join(SLIDES_DIR, docId);
      if (fs.existsSync(docSlideDir)) {
        fs.rmSync(docSlideDir, { recursive: true, force: true });
      }

      const slideUrls = await renderPptxToSlideImages(docId, rawFilePath);
      doc.slideImages = slideUrls;
      doc.pdfUrl = `/api/pdf/${docId}`;
      if (doc.sections && slideUrls.length > 0) {
        doc.sections.forEach((sec: any, idx: number) => {
          if (slideUrls[idx]) sec.slideImageUrl = slideUrls[idx];
        });
      }
      saveDocuments();
      return res.json({ success: true, document: doc, slideImages: slideUrls });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to re-render presentation" });
    }
  });

  // PUT /api/documents/:id/publish (Toggle publication status)
  app.put("/api/documents/:id/publish", async (req, res) => {
    const docId = req.params.id;
    const { isPublished } = req.body;
    const idx = serverDocuments.findIndex(d => d.id === docId);
    if (idx === -1) {
      return res.status(404).json({ error: "Document not found." });
    }
    serverDocuments[idx] = {
      ...serverDocuments[idx],
      isPublished: Boolean(isPublished)
    };
    saveDocuments();
    return res.json({ document: serverDocuments[idx], success: true });
  });

  // DELETE /api/documents/:id (Delete document)
  app.delete("/api/documents/:id", async (req, res) => {
    const docId = req.params.id;
    serverDocuments = serverDocuments.filter(d => d.id !== docId);
    saveDocuments();
    try {
      const pdfPath = path.join(PDF_DIR, `${docId}.pdf`);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
      if (fs.existsSync(RAW_FILES_DIR)) {
        const rawFiles = fs.readdirSync(RAW_FILES_DIR).filter(f => f.startsWith(`${docId}.`) || f === docId);
        rawFiles.forEach(f => {
          try { fs.unlinkSync(path.join(RAW_FILES_DIR, f)); } catch {}
        });
      }
      const slideDir = path.join(SLIDES_DIR, docId);
      if (fs.existsSync(slideDir)) {
        fs.rmSync(slideDir, { recursive: true, force: true });
      }
      pdfBuffers.delete(docId);
      rawFilesMap.delete(docId);
    } catch {}
    try {
      await deleteDocumentFromChroma(docId);
      console.log(`[ChromaDB] Document "${docId}" deleted and removed from ChromaDB.`);
    } catch (e: any) {
      console.warn("[ChromaDB] Delete error on DELETE /api/documents/:id:", e?.message || e);
    }
    // Re-evaluate storage metrics
    storageScaler.evaluateAndScaleSync();
    return res.json({ success: true, message: `Document ${docId} removed from storage and ChromaDB.` });
  });

  // POST /api/documents/reset or /api/documents/clear-all (Clear all documents and vectors)
  app.post("/api/documents/reset", async (req, res) => {
    serverDocuments = [];
    saveDocuments();
    try {
      // Clean uploaded files and slide caches
      if (fs.existsSync(PDF_DIR)) {
        fs.readdirSync(PDF_DIR).forEach(f => {
          if (f.startsWith("upload-")) {
            try { fs.unlinkSync(path.join(PDF_DIR, f)); } catch {}
          }
        });
      }
      if (fs.existsSync(RAW_FILES_DIR)) {
        fs.readdirSync(RAW_FILES_DIR).forEach(f => {
          if (f.startsWith("upload-")) {
            try { fs.unlinkSync(path.join(RAW_FILES_DIR, f)); } catch {}
          }
        });
      }
    } catch {}
    pdfBuffers.clear();
    rawFilesMap.clear();
    storageScaler.evaluateAndScaleSync();
    await resetChromaDatabase([], serverAnnouncements);
    return res.json({ documents: [], success: true });
  });

  app.post("/api/documents/clear-all", async (req, res) => {
    serverDocuments = [];
    saveDocuments();
    try {
      if (fs.existsSync(PDF_DIR)) {
        fs.readdirSync(PDF_DIR).forEach(f => {
          if (f.startsWith("upload-")) {
            try { fs.unlinkSync(path.join(PDF_DIR, f)); } catch {}
          }
        });
      }
      if (fs.existsSync(RAW_FILES_DIR)) {
        fs.readdirSync(RAW_FILES_DIR).forEach(f => {
          if (f.startsWith("upload-")) {
            try { fs.unlinkSync(path.join(RAW_FILES_DIR, f)); } catch {}
          }
        });
      }
    } catch {}
    pdfBuffers.clear();
    rawFilesMap.clear();
    storageScaler.evaluateAndScaleSync();
    await resetChromaDatabase([], serverAnnouncements);
    return res.json({ documents: [], success: true });
  });

  // POST /api/documents/sync (Re-hydrate or overwrite server state from client storage)
  app.post("/api/documents/sync", async (req, res) => {
    try {
      const incoming = req.body?.documents;
      const overwrite = Boolean(req.body?.overwrite);

      if (Array.isArray(incoming)) {
        if (overwrite) {
          // Authoritative replacement: identify removed documents to purge from ChromaDB
          const incomingIds = new Set(incoming.map((d: any) => d.id));
          const removedDocs = serverDocuments.filter(d => !incomingIds.has(d.id));

          for (const removed of removedDocs) {
            deleteDocumentFromChroma(removed.id).catch(err => {
              console.warn(`[ChromaDB] Sync cleanup notice for ${removed.id}:`, err?.message || err);
            });
          }

          serverDocuments = [...incoming];
          saveDocuments();
          return res.json({ success: true, count: serverDocuments.length, documents: serverDocuments });
        }

        if (incoming.length > 0) {
          const existingIds = new Set(serverDocuments.map(d => d.id));
          let addedCount = 0;
          for (const doc of incoming) {
            if (doc && doc.id && !existingIds.has(doc.id)) {
              serverDocuments.push(doc);
              existingIds.add(doc.id);
              addedCount++;
              // If doc has pdfDataUrl, save to PDF_DIR
              if (doc.pdfDataUrl && typeof doc.pdfDataUrl === "string" && doc.pdfDataUrl.startsWith("data:")) {
                try {
                  ensureDataDir();
                  const b64 = doc.pdfDataUrl.split(",")[1];
                  fs.writeFileSync(path.join(PDF_DIR, `${doc.id}.pdf`), Buffer.from(b64, "base64"));
                } catch {}
              }
              indexDocumentToChroma(doc).catch(() => {});
            }
          }
          if (addedCount > 0) {
            saveDocuments();
            console.log(`[Storage] Synced ${addedCount} documents from client to server storage.`);
          }
        }
      }
      return res.json({ success: true, count: serverDocuments.length, documents: serverDocuments });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to sync documents" });
    }
  });

  // GET /api/announcements (with remote Teacher sync)
  app.get("/api/announcements", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    if (teacherApiUrl) {
      const remote = await fetchFromTeacher("/api/announcements");
      if (remote && Array.isArray(remote.announcements)) {
        return res.json({ announcements: remote.announcements, source: "remote_teacher" });
      }
    }
    res.json({ announcements: serverAnnouncements });
  });

  // POST /api/announcements
  app.post("/api/announcements", async (req, res) => {
    const { title, content, author, important, relatedDocId, relatedDocTitle } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Title and Content are required." });
    }
    const newAnn: CourseAnnouncement = {
      id: req.body.id || `ann-${Date.now()}`,
      title,
      content,
      date: req.body.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      author: author || "Teacher",
      important: !!important,
      relatedDocId,
      relatedDocTitle
    };
    serverAnnouncements.unshift(newAnn);
    saveAnnouncements();

    // Automatically index new announcement into ChromaDB Cloud
    try {
      await indexAnnouncementToChroma(newAnn);
      console.log(`[ChromaDB] Announcement "${newAnn.title}" added and indexed in ChromaDB.`);
    } catch (e: any) {
      console.warn("[ChromaDB] Announcement indexing notice:", e?.message || e);
    }

    res.json({ announcement: newAnn, success: true, indexedInChroma: true });
  });

  // DELETE /api/announcements/:id
  app.delete("/api/announcements/:id", async (req, res) => {
    const annId = req.params.id;
    serverAnnouncements = serverAnnouncements.filter(a => a.id !== annId);
    saveAnnouncements();

    // Automatically remove announcement from ChromaDB Cloud
    try {
      await deleteAnnouncementFromChroma(annId);
      console.log(`[ChromaDB] Announcement "${annId}" deleted from ChromaDB.`);
    } catch (e: any) {
      console.warn("[ChromaDB] Announcement deletion notice:", e?.message || e);
    }

    res.json({ success: true, message: `Announcement ${annId} removed from storage and ChromaDB.` });
  });

  // AI Notes Assistant API route using OpenRouter or Groq with Full PDF RAG
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, context, activeDocument } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const geminiApiKey = process.env.GEMINI_API_KEY;
      const groqApiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
      const openrouterApiKey = process.env.OPENROUTER_API_KEY;

      // If local AI keys are not set, proxy request to remote Teacher service
      if (!geminiApiKey && !groqApiKey && !openrouterApiKey && teacherApiUrl) {
        const remoteChat = await fetchFromTeacher("/api/chat", {
          method: "POST",
          body: JSON.stringify(req.body)
        });
        if (remoteChat) {
          return res.json(remoteChat);
        }
      }

      // Smart RAG Context Ranking & Context Assembly
      let ragContextText = context || "";

      // 0. Query ChromaDB Cloud Vector Database for semantic chunks
      try {
        const chromaMatches = await queryChroma(prompt, {
          docId: activeDocument?.id,
          nResults: 6
        });
        if (chromaMatches.length > 0) {
          ragContextText += `\n\n[=== CHROMADB CLOUD VECTOR DATABASE MATCHES (Database: rag-notes-application1) ===]\n` +
            chromaMatches.map((m, idx) => `[Vector Match #${idx + 1} - ${m.metadata?.docTitle} - Page ${m.metadata?.pageNumber}]\n${m.document}`).join("\n\n-------------------\n\n");
        }
      } catch (chromaQueryErr: any) {
        console.warn("[ChromaDB] RAG query notice:", chromaQueryErr?.message);
      }

      if (activeDocument && activeDocument.sections && activeDocument.sections.length > 0) {
        const sections: any[] = activeDocument.sections;
        const queryLower = prompt.toLowerCase();
        const keywords = queryLower
          .replace(/[^a-z0-9\s]/gi, " ")
          .split(/\s+/)
          .filter((w: string) => w.length > 2);

        // Score sections by keyword overlap if document is large (e.g. All Files View / 146 pages)
        let selectedSections = sections;
        if (sections.length > 25) {
          if (keywords.length > 0) {
            const scored = sections.map((s: any) => {
              const secText = (s.title + " " + s.contentMarkdown).toLowerCase();
              let score = 0;
              for (const kw of keywords) {
                if (secText.includes(kw)) score += 2;
              }
              return { section: s, score };
            });

            scored.sort((a, b) => b.score - a.score);
            const topMatches = scored.filter(s => s.score > 0).slice(0, 20).map(s => s.section);
            
            if (topMatches.length > 0) {
              const firstPages = sections.slice(0, 5);
              const combinedMap = new Map();
              [...firstPages, ...topMatches].forEach(s => combinedMap.set(s.pageNumber, s));
              selectedSections = Array.from(combinedMap.values()).sort((a, b) => a.pageNumber - b.pageNumber);
            } else {
              selectedSections = sections.slice(0, 30);
            }
          } else {
            selectedSections = sections.slice(0, 30);
          }
        }

        ragContextText = `[ACTIVE PDF DOCUMENT: "${activeDocument.title}" - Total Pages: ${sections.length}]\n\n` +
          selectedSections.map((s: any) => 
            `[=== PDF PAGE ${s.pageNumber} ===]\nTitle: ${s.title}\nSubtitle: ${s.subtitle || ""}\nContent:\n${s.contentMarkdown}`
          ).join("\n\n-------------------\n\n");
      }

      const systemInstruction = `You are an expert AI Smart Tutor and AWS Cloud Architect assisting a student with their AWS lecture notes and lab manuals using RAG.

EXAM MARKS & ANSWERING RULES:
1. MARKS WEIGHTAGE GUIDELINES:
   - 2 MARKS ANSWER: Structure the answer into EXACTLY 4 concise, high-impact bullet points (no more, no less).
   - 6 MARKS ANSWER: Provide a concise, highly accurate, and well-structured answer with sub-headings, key definitions, types/components, and core benefits. DO NOT include unnecessary filler sections, extra topics, or long unrequested "working mechanism" descriptions unless specifically asked by the user.
   - 10 MARKS ANSWER: Provide a comprehensive deep-dive answer with key components, structural architecture, comparison matrix, and key takeaways.
   - GENERAL QUESTIONS: Provide a clear, thorough, accurate, and well-structured answer with bold key terms and bullet points.

2. MULTI-TOPIC PROMPTS (CRITICAL): If the user's question asks about multiple topics (e.g., "Fault Tolerance, IaaS, CDN, Web Server vs App Server, Hypervisor..."), you MUST provide a dedicated 2-mark answer (4 key points) for EVERY SINGLE topic requested. Do NOT omit any topic or collapse them into a single summary.

3. DIRECT & ACCURATE RAG ANSWERS: Always answer strictly using the retrieved document context. Explain cloud terms thoroughly and accurately. Do NOT add extraneous, useless, or unasked sections.

4. CLEAN FORMATTING & TABLES: Use markdown headings, bold terms, bullet points, and code blocks. Whenever comparing concepts, services, tiers, or models (such as IaaS vs PaaS vs SaaS, S3 vs EBS vs EFS, etc.) or when asked for tabular summaries, always present them using standard Markdown tables with clear header rows (| Col 1 | Col 2 |) and separator rows (| --- | --- |). Provide clean, direct, accurate answers without page numbers or source file citations.
5. ARCHITECTURAL & NETWORK DIAGRAMS: Whenever illustrating network topologies, cloud architectures, VPC subnets, peering, VPN gateways, or data flows, ALWAYS enclose the ASCII diagram inside a code block marked with \`\`\`ascii or \`\`\`text. Ensure horizontal alignment and box borders (+---+, |   |, ===, --->) are properly formatted, tidy, and bounded to a standard width (max 65-70 characters per line) so the diagram renders cleanly without wrapping.`;

      const fullPromptWithContext = `${systemInstruction}

==================================================
RETRIEVED DOCUMENT CONTEXT FOR RAG:
==================================================
${ragContextText}
==================================================

User Question: ${prompt}`;

      // 1. Try Gemini 3.6 Flash FIRST using @google/genai SDK
      const geminiResult = await callGeminiChat(
        systemInstruction,
        `Retrieved Document Context:\n${ragContextText}\n\nUser Question: ${prompt}`
      );
      if (geminiResult?.text) {
        return res.json({ text: geminiResult.text, provider: `Google Gemini (${geminiResult.modelUsed})` });
      }

      // 2. Try OpenRouter AI if API key is provided
      const openRouterResult = await callOpenRouterChat([
        { role: "system", content: systemInstruction },
        { role: "user", content: `Retrieved Document Context:\n${ragContextText}\n\nUser Question: ${prompt}` }
      ]);
      if (openRouterResult?.text) {
        return res.json({ text: openRouterResult.text, provider: `OpenRouter (${openRouterResult.modelUsed})` });
      }

      // 3. Try Groq API key if available
      const groqResult = await callGroqChat([
        { role: "system", content: systemInstruction },
        { role: "user", content: `Retrieved Document Context:\n${ragContextText}\n\nUser Question: ${prompt}` }
      ]);
      if (groqResult?.text) {
        return res.json({ text: groqResult.text, provider: `Groq (${groqResult.modelUsed})` });
      }

      // 3. Smart Dynamic Fallback RAG Engine (Local text extraction & search)
      const markAnswer = getMarkBasedAnswer(prompt, activeDocument);
      if (markAnswer) {
        return res.json({ text: markAnswer, provider: "RAG Document Engine" });
      }

      const docName = activeDocument?.title || "AWS Lecture Notes";
      const sectionsList: any[] = activeDocument?.sections || [];
      const queryLower = prompt.toLowerCase();
      const keywords = queryLower
        .replace(/[^a-z0-9\s]/gi, " ")
        .split(/\s+/)
        .filter((w: string) => w.length > 2);

      // Search matching sections
      let matchedSections = sectionsList.filter((s: any) => {
        const text = (s.title + " " + s.contentMarkdown).toLowerCase();
        return keywords.some((kw: string) => text.includes(kw));
      });

      let answer = `### 💡 RAG Assistant Answer\n\n`;

      if (matchedSections.length > 0) {
        answer += `Based on your selected document **"${docName}"**, here is the relevant synthesized information for **"${prompt}"**:\n\n`;
        matchedSections.slice(0, 4).forEach((sec: any) => {
          answer += `#### 📌 ${sec.title}\n${sec.contentMarkdown.slice(0, 800)}\n\n`;
        });
      } else {
        answer += `**Question:** ${prompt}\n\n` +
          `Based on **"${docName}"**, here is the core explanation:\n\n` +
          `- **Key Concept:** This concept is a core element of AWS Cloud Infrastructure designed for high scalability, security, and automated fault tolerance.\n` +
          `- **Working Mechanism:** Operating across isolated Availability Zones (AZs), it decouples processing logic from hardware constraints and converts traditional CapEx to utility OpEx.\n` +
          `- **AWS Service Integration:** Works seamlessly with Amazon EC2 compute instances, Amazon VPC networking, Amazon S3 storage, and Elastic Load Balancing.`;
      }

      return res.json({ text: answer, provider: "RAG Document Engine" });
    } catch (err: any) {
      console.error("Error in /api/chat:", err);
      res.status(500).json({ error: err.message || "Failed to communicate with AI Assistant." });
    }
  });

  // Dynamic Quiz Generator API route using OpenRouter or Groq AI
  app.post("/api/generate-quiz", async (req, res) => {
    try {
      const { documentTitle, documentContent, docId } = req.body;
      if (!documentContent) {
        return res.status(400).json({ error: "documentContent is required" });
      }

      const geminiApiKey = process.env.GEMINI_API_KEY;
      const groqApiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
      const openrouterApiKey = process.env.OPENROUTER_API_KEY;

      // If local AI keys are not set, proxy request to remote Teacher service
      if (!geminiApiKey && !groqApiKey && !openrouterApiKey && teacherApiUrl) {
        const remoteQuiz = await fetchFromTeacher("/api/generate-quiz", {
          method: "POST",
          body: JSON.stringify(req.body)
        });
        if (remoteQuiz) {
          return res.json(remoteQuiz);
        }
      }

      const systemPrompt = `You are an expert exam generator AI.
Your goal is to generate 8-10 high-quality, challenging multiple-choice practice quiz questions based STRICTLY on the provided note text.

STRICT JSON OUTPUT REQUIREMENTS:
1. Return ONLY a valid JSON object with a single key "questions" containing an array of question objects.
2. Each question object MUST contain:
   - "question": string (Clear exam-style question based on the text)
   - "options": array of exactly 4 string options
   - "correctIndex": number (0, 1, 2, or 3 pointing to the correct option in options array)
   - "explanation": string (Detailed educational breakdown explaining why that option is correct citing facts from the note)
   - "topic": string (Short 2-4 word topic concept label)
3. Do NOT include markdown codeblock headers or conversational text outside the JSON object.

Example JSON structure:
{
  "questions": [
    {
      "question": "What is the primary advantage of S3 over EBS?",
      "options": ["Unlimited object scalability", "Faster RAM speed", "Direct CPU bus connection", "Lower power usage"],
      "correctIndex": 0,
      "explanation": "S3 is object storage designed for massive scalability over HTTP...",
      "topic": "S3 Storage"
    }
  ]
}`;

      const userPrompt = `Document Title: "${documentTitle || "Note"}"\n\nNote Content:\n${documentContent.slice(0, 30000)}`;

      const quizMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];

      // 1. Try Google Gemini first
      const geminiQuizRes = await callGeminiQuiz(systemPrompt, userPrompt);
      if (geminiQuizRes?.text) {
        try {
          const cleaned = geminiQuizRes.text.trim().replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/, "").trim();
          let parsed = JSON.parse(cleaned);
          let qList = Array.isArray(parsed) ? parsed : (parsed.questions || Object.values(parsed).find(v => Array.isArray(v)));

          if (Array.isArray(qList) && qList.length > 0) {
            const formatted = qList.map((q: any, i: number) => ({
              id: `gemini-${docId || "note"}-${Date.now()}-${i}`,
              noteId: docId || "note",
              question: q.question || "Practice Question",
              options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["Option A", "Option B", "Option C", "Option D"],
              correctIndex: typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0,
              explanation: q.explanation || "Extracted directly from note content.",
              topic: q.topic || documentTitle || "Key Concept"
            }));

            return res.json({ questions: formatted, provider: `Google Gemini (${geminiQuizRes.modelUsed})` });
          }
        } catch (parseErr) {
          console.warn("[Gemini API] Failed to parse quiz JSON:", parseErr);
        }
      }

      // 2. Try OpenRouter AI
      const openRouterQuizRes = await callOpenRouterChat(quizMessages, undefined, true);
      if (openRouterQuizRes?.text) {
        try {
          const cleaned = openRouterQuizRes.text.trim().replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/, "").trim();
          let parsed = JSON.parse(cleaned);
          let qList = Array.isArray(parsed) ? parsed : (parsed.questions || Object.values(parsed).find(v => Array.isArray(v)));

          if (Array.isArray(qList) && qList.length > 0) {
            const formatted = qList.map((q: any, i: number) => ({
              id: `openrouter-${docId || "note"}-${Date.now()}-${i}`,
              noteId: docId || "note",
              question: q.question || "Practice Question",
              options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["Option A", "Option B", "Option C", "Option D"],
              correctIndex: typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0,
              explanation: q.explanation || "Extracted directly from note content.",
              topic: q.topic || documentTitle || "Key Concept"
            }));

            return res.json({ questions: formatted, provider: `OpenRouter (${openRouterQuizRes.modelUsed})` });
          }
        } catch {}
      }

      // 2. Try Groq AI second
      const groqQuizRes = await callGroqChat(quizMessages, undefined, true);
      if (groqQuizRes?.text) {
        try {
          const cleaned = groqQuizRes.text.trim().replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/, "").trim();
          let parsed = JSON.parse(cleaned);
          let qList = Array.isArray(parsed) ? parsed : (parsed.questions || Object.values(parsed).find(v => Array.isArray(v)));

          if (Array.isArray(qList) && qList.length > 0) {
            const formatted = qList.map((q: any, i: number) => ({
              id: `groq-${docId || "note"}-${Date.now()}-${i}`,
              noteId: docId || "note",
              question: q.question || "Practice Question",
              options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["Option A", "Option B", "Option C", "Option D"],
              correctIndex: typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0,
              explanation: q.explanation || "Directly referenced from the note content.",
              topic: q.topic || documentTitle || "Key Concept"
            }));

            return res.json({ questions: formatted, provider: `Groq (${groqQuizRes.modelUsed})` });
          }
        } catch {}
      }

      // 3. Smart local offline question extractor fallback
      const headings = documentContent.split("\n").filter((l: string) => l.startsWith("#") || l.startsWith("Section") || l.startsWith("**"));
      const fallbackQuestions = [
        {
          id: `fallback-${docId || "note"}-1`,
          noteId: docId || "note",
          question: `What is the key core focus covered in "${documentTitle || "this document"}"?`,
          options: [
            headings[0]?.replace(/[#*]/g, "").trim() || "Cloud architecture and fundamental principles",
            "Physical hardware manufacturing specifications",
            "Third-party desktop operating system licensing",
            "Manual legacy mainframe tape drive backups"
          ],
          correctIndex: 0,
          explanation: `The document "${documentTitle || "Notes"}" details ${headings[0]?.replace(/[#*]/g, "").trim() || "cloud architecture, services, and operational best practices"}.`,
          topic: documentTitle || "Overview"
        },
        {
          id: `fallback-${docId || "note"}-2`,
          noteId: docId || "note",
          question: `According to the content in "${documentTitle || "Notes"}", which operational benefit is highlighted?`,
          options: [
            "Automated cloud elasticity and managed service infrastructure",
            "Exclusive reliance on single-server physical datacenters",
            "Manual software patching with zero uptime guarantees",
            "Unencrypted open public network endpoints"
          ],
          correctIndex: 0,
          explanation: "Cloud computing and modern study architectures emphasize automated elasticity, managed infrastructure, and security.",
          topic: "Cloud Advantage"
        }
      ];

      return res.json({
        questions: fallbackQuestions,
        provider: "Smart Note Quiz Engine"
      });
    } catch (err: any) {
      console.error("Error in /api/generate-quiz:", err);
      res.status(500).json({ error: err.message || "Server error generating quiz" });
    }
  });

function getFigureDetailedExplanation(prompt: string): string | null {
  const p = prompt.toLowerCase();
  
  if (p.includes("1.2") || p.includes("1-2") || p.includes("figure 1.2")) {
    return `### 📊 Detailed Breakdown: Figure 1.2 — Running a Web Shop: On-Premises vs. AWS

**Case Study Context:** John, CIO of a medium-sized e-commerce company, evaluated moving his company's web shop from a traditional rented data center to AWS.

---

### 1. 🏢 On-Premises Architecture (Left Side)
* **What it is:** The traditional approach where John's company rented physical hardware servers in a third-party data center.
* **Architecture Components:**
  - **Web Server:** A physical or virtual server running web server software (Apache/Nginx) to serve product pages to customers.
  - **Database Server:** A dedicated database server (MySQL/PostgreSQL) storing products, customer profiles, and orders.
* **On-Premises Drawbacks:**
  1. ❌ **Fixed Capacity:** Hardware cannot expand automatically during unexpected sales surges or holiday traffic spikes.
  2. ❌ **High Capital & Rental Overhead:** Renting or purchasing physical hardware requires paying full cost 24/7/365 regardless of traffic.
  3. ❌ **Single Point of Failure:** Hardware breakdown or power loss in that single data center takes the whole shop offline.
  4. ❌ **Slow Upgrades:** Adding more capacity requires ordering, mounting, and configuring new servers over days or weeks.

---

### 2. ☁️ AWS Cloud Architecture (Right Side)
* **What it is:** Migrating the web server and database to virtualized infrastructure on AWS.
* **Architecture Components:**
  - **Amazon EC2 Instance:** A virtual server running in the cloud serving web requests.
  - **Amazon EC2 / RDS Database:** A virtualized or managed SQL database storing product and order data.
* **AWS Cloud Benefits:**
  1. ✅ **Pay-As-You-Go:** Billed only for actual hourly server usage, eliminating wasted idle capacity.
  2. ✅ **Instant Elasticity:** Scale server size up or down (e.g., from small to extra-large) in less than 2 minutes.
  3. ✅ **Built-In Snapshots & Backups:** Automatic data replication and instant volume backups.
  4. ✅ **No Hardware Maintenance:** AWS handles physical rack maintenance, power, and cooling.

---

### 💡 Easy Real-World Analogy
- **On-Premises** is like **leasing a physical truck long-term**: You pay every month whether it sits parked or drives, and if the engine breaks down, your delivery business stops until you fix it.
- **AWS Cloud** is like **renting a fleet on-demand**: You order a small car for slow days, swap to a huge truck during sales spikes, and only pay for the exact hours you drive!`;
  }

  if (p.includes("1.1") || p.includes("1-1") || p.includes("figure 1.1")) {
    return `### 📊 Detailed Breakdown: Figure 1.1 — AWS Global Data Center Locations

**Overview:** AWS operates a global cloud infrastructure consisting of geographic **Regions** and isolated **Availability Zones (AZs)** worldwide.

---

### 🔍 Key Components & Locations Shown:
1. **Global Regions:** Dedicated geographic areas hosting clusters of data centers (e.g., U.S. West 1, U.S. West 2, U.S. East, Ireland, Germany, Singapore, Japan, Australia, Brazil).
2. **Availability Zones (AZs):** Each Region contains multiple physically separated, power-independent data centers connected via ultra-low-latency fiber networks.

---

### ⚡ Why Global Distribution Matters:
* **Low Latency:** Deploy apps close to end-users anywhere in the world for fast response times.
* **High Availability & Disaster Recovery:** Replicate applications across multiple AZs or Regions to withstand natural disasters.
* **Data Sovereignty & Legal Compliance:** Store data strictly within specific geographic borders (e.g., EU GDPR compliance in Ireland/Germany).`;
  }

  if (p.includes("1.3") || p.includes("1-3") || p.includes("figure 1.3")) {
    return `### 📊 Detailed Breakdown: Figure 1.3 — Enhanced Web Shop Architecture

**Context:** John's upgraded Web Shop architecture utilizing CDN, Elastic Load Balancer, and Managed Database.

---

### 🔍 Architecture Components:
1. **CloudFront (CDN):** Caches static assets (images, logos, CSS) at edge locations close to global users.
2. **Elastic Load Balancer (ELB):** Automatically distributes incoming customer traffic across multiple Web Servers.
3. **Multiple EC2 Web Servers:** Scalable web server fleet that expands automatically as traffic increases.
4. **Managed Relational Database (RDS):** Decoupled database tier with automatic multi-AZ failover and daily backups.

---

### ⚡ Key Advantages:
- Drastically reduced latency for static files via CDN.
- Eliminates single point of failure by running multiple web servers behind a load balancer.`;
  }

  if (p.includes("1.4") || p.includes("1-4") || p.includes("figure 1.4")) {
    return `### 📊 Detailed Breakdown: Figure 1.4 — Enterprise Java EE in Corporate VPC

**Context:** Maureen's enterprise migration connecting corporate data center to AWS VPC securely via encrypted VPN.

---

### 🔍 Architecture Components:
1. **VPC (Virtual Private Cloud):** An isolated private virtual network (10.10.0.0/16).
2. **Public Subnet (10.10.0.0/24):** Contains Internet Gateway and NAT Gateway for outbound internet access.
3. **Private Subnets (10.10.1.0/24 & 10.10.2.0/24):** Isolated subnets hosting Java EE Application VMs and Database instances completely hidden from the public internet.
4. **IPsec VPN Gateway:** Secure encrypted tunnel directly connecting the Corporate Network (10.20.0.0/16) to the AWS VPC.`;
  }

  if (p.includes("1.5") || p.includes("1-5") || p.includes("figure 1.5")) {
    return `### 📊 Detailed Breakdown: Figure 1.5 — Legal Data Archival On-Premises vs. AWS

**Context:** Greg's law office setup replacing expensive local NAS hardware and physical tapes with AWS cloud storage.

---

### 🔍 Architecture Components:
1. **Storage Gateway Appliance:** On-premises virtual appliance syncing local files seamlessly to AWS S3.
2. **Amazon S3 Object Store:** Highly durable (99.999999999%) storage for active legal files.
3. **Amazon S3 Glacier:** Virtual tape library for automated, long-term, low-cost legal compliance archival (10+ years retention).`;
  }

  if (p.includes("1.6") || p.includes("1-6") || p.includes("figure 1.6")) {
    return `### 📊 Detailed Breakdown: Figure 1.6 — Building a Fault-Tolerant Architecture on AWS

**Context:** Alexa's Multi-AZ system designed around "Murphy's Law" (anything that can fail, will fail).

---

### 🔍 Architecture Components:
1. **Elastic Load Balancer:** Continuously performs health checks and routes traffic away from unhealthy instances.
2. **Multi-AZ Web Servers:** Web servers deployed across physically distinct Data Center A and Data Center B.
3. **Master-Standby Database:** Master DB in Data Center A continuously replicates data to a Standby DB in Data Center B. If Data Center A fails, automatic failover shifts traffic to Data Center B in seconds.`;
  }

  if (p.includes("1.12") || p.includes("1.13") || p.includes("1.14") || p.includes("1.15")) {
    return `### 📊 Detailed Breakdown: AWS Interaction Tools (Figures 1.12 – 1.15)

1. **Figure 1.12 (Interaction Spectrum):** Shows methods from manual Web Management Console -> Command Line Interface (CLI) -> Software Development Kits (SDKs) -> Automated Infrastructure Blueprints (CloudFormation).
2. **Figure 1.13 (Management Console):** Interactive graphical web interface for launching and inspecting EC2 virtual servers.
3. **Figure 1.14 (CLI Terminal):** Terminal commands like \`aws cloudwatch list-metrics\` returning structured JSON outputs.
4. **Figure 1.15 (Blueprints):** Infrastructure as Code (IaC) defining web servers, databases, load balancers, and CDN assets in declarative JSON files.`;
  }

  return null;
}

function getMarkBasedAnswer(prompt: string, activeDocument?: any): string | null {
  const p = prompt.toLowerCase();

  // Detect mark weightage
  const is10Marks = p.includes("10 mark") || p.includes("10 marks") || p.includes("10m") || p.includes("[10") || p.includes("(10") || p.includes("4 pages") || p.includes("10-mark");
  const is6Marks = p.includes("6 mark") || p.includes("6 marks") || p.includes("6m") || p.includes("[6") || p.includes("(6") || p.includes("a4 sheet") || p.includes("6-mark");
  const is2Marks = p.includes("2 mark") || p.includes("2 marks") || p.includes("2m") || p.includes("[2") || p.includes("(2") || p.includes("2 lines") || p.includes("2-mark");
  const isGeneralExplain = p.includes("explain") || p.includes("what is") || p.includes("overview") || p.includes("describe") || p.includes("difference") || p.includes("types");

  if (!is10Marks && !is6Marks && !is2Marks && !isGeneralExplain) {
    return null;
  }

  // Multi-Topic Knowledge Dictionary for 2-Mark & General Explanations
  const topicCatalog: Array<{ id: string; title: string; matchFn: (str: string) => boolean; points: string[] }> = [
    {
      id: "nat_vpn_gateways",
      title: "NAT Gateways & VPN Gateways in Enterprise VPC Networks",
      matchFn: (s) => (s.includes("nat") || s.includes("vpn")) && (s.includes("gateway") || s.includes("enterprise") || s.includes("private subnet")),
      points: [
        "**NAT Gateway (Network Address Translation):** Managed AWS service deployed in a Public Subnet that enables instances in Private Subnets to initiate outbound internet traffic (for OS updates, software patches, or external APIs) while blocking unsolicited inbound connections from the public internet.",
        "**Virtual Private Network (VPN) Gateway / Site-to-Site VPN:** Establishes a secure, encrypted IPsec VPN tunnel between the corporate on-premises data center and the AWS VPC, allowing hybrid enterprise networks to access cloud resources securely over the internet.",
        "**Extending the VPC Pattern for Enterprise Networks:** Combines Public Subnets (hosting Internet Gateways, NAT Gateways, and Load Balancers) with Private Subnets (hosting backend application servers and sensitive databases), bridged to corporate headquarters via VPN/Direct Connect gateways for hybrid enterprise architectures.",
        "**Respect Respective Functions for Private Subnets:** Private Subnets house core enterprise business logic and sensitive customer databases. NAT Gateways provide them safe outbound internet connectivity without exposure, while VPN Gateways seamlessly integrate private subnets with on-premises corporate internal networks."
      ]
    },
    {
      id: "fault_tolerance",
      title: "Fault Tolerance in AWS Cloud",
      matchFn: (s) => s.includes("fault tolerance") || s.includes("fault tolerant") || s.includes("fault-tolerant"),
      points: [
        "**Definition:** Ability of an AWS cloud architecture to remain fully operational without service interruption during hardware, network, or server failures.",
        "**Multi-AZ Deployment:** Achieved by distributing application workloads across multiple isolated Availability Zones (Multi-AZ) with automated failover.",
        "**AWS Services:** Amazon Route 53 (DNS failover), Elastic Load Balancing (ELB), Auto Scaling Groups, and Amazon RDS Multi-AZ Standby replicas.",
        "**Enterprise Impact:** Guarantees business continuity, disaster recovery, and 99.99%+ application availability for critical enterprise workloads."
      ]
    },
    {
      id: "iaas",
      title: "Infrastructure as a Service (IaaS)",
      matchFn: (s) => s.includes("iaas") || s.includes("infrastructure as a service"),
      points: [
        "**Definition:** Cloud service model delivering raw virtualized compute, block storage, and networking primitives over the internet.",
        "**Control Boundary:** Grants customers complete administrative OS-level control, network routing rules, and software installation flexibility.",
        "**AWS Examples:** Amazon EC2 (virtual server instances), Amazon EBS (block storage volumes), and Amazon VPC (Virtual Private Cloud).",
        "**Shared Responsibility:** AWS manages physical data centers, host hardware, and hypervisors; customer manages OS patching, firewalls, and apps."
      ]
    },
    {
      id: "on_demand",
      title: "On-Demand Self-Service",
      matchFn: (s) => s.includes("on demand") || s.includes("on-demand") || s.includes("self-service") || s.includes("self service"),
      points: [
        "**Definition:** Core NIST characteristic where customers provision compute, storage, and networking resources automatically as needed.",
        "**Zero Human Intervention:** Users launch, configure, scale, and terminate infrastructure instantly without contacting cloud provider staff.",
        "**Access Interfaces:** Provisioned seamlessly via the AWS Management Console, Command Line Interface (CLI), SDKs, or Infrastructure as Code (CloudFormation).",
        "**Business Benefit:** Eliminates multi-week hardware procurement lead times, allowing teams to launch server instances in seconds."
      ]
    },
    {
      id: "essential_characteristics",
      title: "Essential Characteristics of Cloud Computing (NIST)",
      matchFn: (s) => s.includes("essential characteristics") || s.includes("characteristics of cloud") || s.includes("nist characteristics"),
      points: [
        "**On-Demand Self-Service:** Automated resource provisioning without manual cloud provider operator intervention.",
        "**Broad Network Access:** Resources accessible globally over standard network protocols via browsers, mobile devices, and APIs.",
        "**Resource Pooling & Elasticity:** Multi-tenant infrastructure pooled dynamically to serve users with rapid scale-up and scale-down capacity.",
        "**Measured Service:** Resource usage automatically metered, monitored, and billed on a transparent pay-as-you-go utility pricing model."
      ]
    },
    {
      id: "web_vs_app_server",
      title: "Web Server vs. Application Server Difference",
      matchFn: (s) => s.includes("webserver") || s.includes("web server") || s.includes("application server") || s.includes("app server"),
      points: [
        "**Web Server Role:** Handles HTTP/HTTPS protocols, serves static content (HTML, CSS, static images), and manages client browser requests (e.g., Apache, Nginx).",
        "**Application Server Role:** Executes dynamic business logic, server-side code execution (Node.js, Java Tomcat, Python), and database connectivity.",
        "**Architecture Tiering:** Web Servers operate at the public ingress edge tier, while Application Servers operate in isolated private backend application subnets.",
        "**Interaction Flow:** Web Servers forward dynamic requests to Application Servers, which process business logic and return generated output."
      ]
    },
    {
      id: "cdn",
      title: "Content Delivery Network (CDN / Amazon CloudFront)",
      matchFn: (s) => s.includes("cdn") || s.includes("cloudfront") || s.includes("content delivery"),
      points: [
        "**Definition:** Globally distributed network of Edge Locations designed to deliver web content to end-users with ultra-low latency.",
        "**Caching Mechanism:** Caches static assets (images, stylesheets, videos) at edge nodes closest to users to reduce origin web server workload.",
        "**AWS Implementation:** Amazon CloudFront integrates seamlessly with Amazon S3 buckets and Elastic Load Balancers for secure global delivery.",
        "**Security Integration:** Built-in DDoS protection via AWS Shield and TLS/SSL certificate encryption at edge points."
      ]
    },
    {
      id: "hypervisor",
      title: "Hypervisor (Type-1 Bare-Metal vs. Type-2 Hosted)",
      matchFn: (s) => s.includes("hypervisor") || s.includes("type 1") || s.includes("type 2") || s.includes("kvm") || s.includes("xen"),
      points: [
        "**Definition:** Firmware or software layer (Virtual Machine Monitor) that abstracts physical hardware to run multiple isolated VMs.",
        "**Type-1 (Bare-Metal):** Runs directly on physical host hardware (e.g., AWS Nitro Hypervisor, KVM, VMware ESXi) delivering near-native speed.",
        "**Type-2 (Hosted):** Runs on top of an existing host OS (e.g., Oracle VM VirtualBox) used primarily for local developer testing.",
        "**AWS Nitro System:** AWS's modern hypervisor offloading I/O management to dedicated hardware cards for 100% EC2 compute utilization."
      ]
    },
    {
      id: "full_virtualization",
      title: "Full Virtualization",
      matchFn: (s) => s.includes("full virtualization") || s.includes("hardware virtualization"),
      points: [
        "**Definition:** Virtualization technique where the hypervisor completely simulates underlying physical hardware (CPU, Memory, BIOS, NICs).",
        "**Unmodified Guest OS:** Guest operating systems run without any modifications because they interact directly with virtual hardware interfaces.",
        "**Hardware Boundary Isolation:** Provides strict multi-tenant isolation, ensuring workloads on the same physical server remain completely secure.",
        "**Cloud Role:** Enables cloud platforms like AWS EC2 to host diverse customer operating systems safely on shared physical infrastructure."
      ]
    },
    {
      id: "para_virtualization",
      title: "Para-Virtualization (Optimal for Cloud Resource Efficiency & Minimal Overhead)",
      matchFn: (s) => s.includes("para virtualization") || s.includes("paravirtualization") || s.includes("para-virtualization") || (s.includes("overhead") && s.includes("virtualization")) || (s.includes("overhead") && s.includes("virtual machine")),
      points: [
        "**Ideal Virtualization Type:** **Para-Virtualization** (or Type-1 Bare-Metal Hypervisor with Para-virtualized drivers/hypercalls) is the ideal choice to maximize resource efficiency and minimize overhead.",
        "**Hypercall Direct Communication:** Unlike Full Virtualization (which simulates entire hardware), guest operating systems are modified or use enlightened drivers (e.g. Virtio, Xen PV) to issue direct hypercalls to the hypervisor.",
        "**Elimination of Emulation Overhead:** Bypasses software emulation traps for CPU, memory, and disk/network I/O, achieving near-native bare-metal execution speeds.",
        "**Cloud Multi-Tenant Use Case:** Used extensively by cloud service providers (e.g., AWS Xen PV mode, AWS Nitro System, KVM with Virtio) to run maximum virtual machine density with lowest latency on physical hosts."
      ]
    },
    {
      id: "cloud_computing",
      title: "Cloud Computing Overview",
      matchFn: (s) => s.includes("cloud computing") || s.includes("what is cloud"),
      points: [
        "**Definition:** On-demand delivery of compute power, database storage, applications, and IT resources over the internet with pay-as-you-go pricing.",
        "**CapEx to OpEx:** Converts heavy upfront hardware capital expenditure (CapEx) into flexible, predictable operational expenditure (OpEx).",
        "**Global Infrastructure:** Deployed across global AWS Regions and isolated Availability Zones for global scalability.",
        "**Core Value:** Eliminates physical server maintenance, infrastructure planning lead times, and capacity constraint risks."
      ]
    },
    {
      id: "types_of_cloud",
      title: "Types of Cloud Deployment & Service Models",
      matchFn: (s) => s.includes("types of cloud") || s.includes("deployment model") || s.includes("public cloud") || s.includes("private cloud") || s.includes("hybrid cloud"),
      points: [
        "**Public Cloud:** Multi-tenant AWS infrastructure (EC2, S3) shared over the internet with zero upfront CapEx and utility pricing.",
        "**Private & Hybrid Cloud:** Private Cloud is dedicated single-tenant hardware (AWS Outposts); Hybrid Cloud connects on-premises data centers to AWS.",
        "**IaaS (Infrastructure as a Service):** Provides raw compute, storage, and networking building blocks (EC2, VPC) with OS administrative control.",
        "**PaaS & SaaS:** PaaS (Elastic Beanstalk) manages application runtime/OS; SaaS (Amazon QuickSight) delivers turnkey web software."
      ]
    },
    {
      id: "load_balancing",
      title: "AWS Elastic Load Balancing (ELB)",
      matchFn: (s) => s.includes("load balancing") || s.includes("load balancer") || s.includes("elb") || s.includes("alb") || s.includes("nlb"),
      points: [
        "**Definition:** Automatically distributes incoming application traffic across multiple target compute resources (EC2, ECS, Lambda) across AZs.",
        "**Types:** Application Load Balancer (ALB - Layer 7), Network Load Balancer (NLB - Layer 4), and Gateway Load Balancer (GWLB).",
        "**Health Checks:** Performs continuous HTTP/TCP health checks on registered instances and automatically reroutes traffic away from unhealthy nodes.",
        "**High Availability:** Eliminates single points of failure and integrates natively with Auto Scaling Groups (ASG) and SSL/TLS termination."
      ]
    }
  ];

  // Scan prompt for all matching topics
  const matchedTopics = topicCatalog.filter((item) => item.matchFn(p));

  // MULTI-TOPIC RESPONSE (When 2 or more topics are detected in prompt)
  if (matchedTopics.length >= 2) {
    let resultText = `### 🟢 Exam Answer (2 Marks Weightage per Topic — Multi-Topic Answer)\n\n`;
    resultText += `Here are the concise, accurate 2-mark answers (4 key points each) for all **${matchedTopics.length} requested topics**:\n\n`;

    matchedTopics.forEach((topic, idx) => {
      resultText += `#### ${idx + 1}. 📌 ${topic.title} (2 Marks)\n`;
      topic.points.forEach((pt, pIdx) => {
        resultText += `${pIdx + 1}. ${pt}\n`;
      });
      resultText += `\n`;
    });

    return resultText;
  }

  // SINGLE TOPIC MATCH
  if (matchedTopics.length === 1) {
    const singleTopic = matchedTopics[0];

    // 2 Marks Single Topic
    if (is2Marks) {
      let resText = `### 🟢 Exam Answer (2 Marks Weightage — 4 Key Points)\n\n`;
      resText += `**Question Topic:** ${singleTopic.title}\n\n`;
      resText += `**Answer (4 Key Points):**\n`;
      singleTopic.points.forEach((pt, pIdx) => {
        resText += `${pIdx + 1}. ${pt}\n`;
      });
      return resText;
    }

    // 6 Marks or 10 Marks Single Topic for special detailed handlers
    if (singleTopic.id === "load_balancing") {
      const wantsWorkingMechanism = p.includes("working") || p.includes("mechanism") || p.includes("how it works");
      let answerText = `### 🟡 Exam Answer (6 Marks Weightage — Structured 2-Page A4 Format)\n\n**Question Topic:** AWS Elastic Load Balancing (ELB) & Traffic Management\n\n---\n\n### 1. 📌 Overview & Definition\n**Elastic Load Balancing (ELB)** is a core AWS networking service that automatically distributes incoming application traffic across multiple target compute resources—such as Amazon EC2 instances, containers (ECS), IP addresses, and AWS Lambda functions—positioned across one or more Availability Zones (AZs).\n\n---\n\n### 2. ⚙️ Types of AWS Load Balancers\n1. **Application Load Balancer (ALB) — Layer 7:** Operates at HTTP/HTTPS level with Path-based and Host-based routing.\n2. **Network Load Balancer (NLB) — Layer 4:** Extreme performance Layer 4 routing for TCP/UDP with static IP addresses.\n3. **Gateway Load Balancer (GWLB) — Layer 3/4:** Scalable deployment of third-party network security appliances.\n4. **Classic Load Balancer (CLB):** Legacy Layer 4/7 load balancer.`;

      if (wantsWorkingMechanism) {
        answerText += `\n\n---\n\n### 3. 🔄 Working Mechanism & Health Check Process\n1. **Client Ingress & DNS Lookup:** Client sends HTTPS request resolved by Route 53.\n2. **Listener Rule Evaluation:** Listener evaluates protocol and port routing rules.\n3. **Target Group Health Check:** ELB performs continuous HTTP/TCP pings.\n4. **Traffic Distribution:** Requests balanced across healthy target instances.`;
      }

      const secNum = wantsWorkingMechanism ? 4 : 3;
      answerText += `\n\n---\n\n### ${secNum}. 📊 Key Enterprise Benefits\n- **High Availability & Fault Tolerance:** Eliminates single points of failure across isolated Availability Zones.\n- **Auto Scaling Integration:** Integrates natively with Auto Scaling Groups (ASG).\n- **SSL/TLS Offloading:** Decrypts encrypted sessions at the load balancer level.`;

      return answerText;
    }

    if (singleTopic.id === "nat_vpn_gateways") {
      return `### 🟡 Exam Answer (10 Marks Weightage — Structured Enterprise Architecture Format)\n\n**Question Topic:** How NAT Gateways and Virtual Private Network (VPN) Gateways Extend VPC Patterns for Enterprise Networks\n\n---\n\n### 1. 📌 Overview & Definition in AWS VPC\nAn **AWS Virtual Private Cloud (VPC)** isolates workloads in logically defined virtual networks. To scale this pattern for enterprise networks, **NAT Gateways** and **VPN Gateways** extend connectivity safely:\n- **NAT Gateway (Network Address Translation):** A managed AWS service deployed in public subnets enabling private subnet instances to initiate outbound internet traffic while blocking unsolicited inbound connections.\n- **VPN Gateway (Virtual Private Network / Site-to-Site VPN):** A secure gateway attached to the VPC that establishes encrypted IPsec VPN tunnels between corporate on-premises data centers and AWS.\n\n---\n\n### 2. 🛡️ Respective Functions for Private Subnets\n1. **Private Subnet Isolation:** Private subnets host sensitive application servers and databases without direct public IP addresses.\n2. **NAT Gateway Function:** Routes outbound requests (software updates, security patches, API calls) from private subnets through a public Elastic IP without exposing internal nodes to inbound internet threats.\n3. **VPN Gateway Function:** Bridges private subnets with corporate internal branch offices, enabling secure hybrid communication between on-premises mainframes and cloud microservices.\n\n---\n\n### 3. 🔄 Enterprise Architecture Integration & Routing\n1. **Public Ingress Tier:** Internet Gateways (IGW) and Application Load Balancers handle incoming external web traffic.\n2. **Outbound Internet Path:** Route tables in private subnets direct 0.0.0.0/0 traffic to the NAT Gateway.\n3. **Hybrid On-Premises Path:** Route tables direct corporate destination CIDR blocks through the Virtual Private Gateway (VGW) across encrypted IPsec tunnels.\n\n---\n\n### 4. 📊 Key Enterprise Benefits\n- **Security & Compliance:** Complete isolation of backend databases from the public internet.\n- **Hybrid Cloud Continuity:** Seamless integration between corporate data centers and AWS cloud infrastructure.\n- **High Availability:** Multi-AZ NAT Gateway deployment guarantees fault-tolerant outbound internet connectivity.`;
    }

    if (singleTopic.id === "types_of_cloud") {
      return `### 🟡 Exam Answer (6 Marks Weightage — Structured 2-Page A4 Format)\n\n**Question Topic:** Types of Cloud Deployment & Service Models in AWS\n\n---\n\n### 1. 📌 Overview & Definition\nTypes of Cloud are categorized into **Cloud Deployment Models** (Public, Private, Hybrid, Community) and **Cloud Service Models** (IaaS, PaaS, SaaS).\n\n---\n\n### 2. 🌐 AWS Cloud Deployment Models\n1. **Public Cloud:** Multi-tenant infrastructure shared over the public internet (Amazon EC2, S3).\n2. **Private Cloud:** Dedicated single-tenant infrastructure (AWS Outposts, Dedicated Hosts).\n3. **Hybrid Cloud:** Connected infrastructure bridging on-premises data centers with AWS (AWS Direct Connect).\n4. **Community Cloud:** Infrastructure shared across organizations with common mandates (AWS GovCloud).\n\n---\n\n### 3. 🛠️ Cloud Service Models (SPI Framework)\n1. **IaaS:** Raw compute and network building blocks (Amazon EC2, VPC).\n2. **PaaS:** Managed execution runtime and environment (AWS Elastic Beanstalk, RDS).\n3. **SaaS:** Complete turnkey web software applications (Amazon QuickSight).`;
    }

    // Default single topic fallback using catalog points
    return `### 🟢 Exam Answer (2 Marks Weightage — 4 Key Points)\n\n**Question Topic:** ${singleTopic.title}\n\n**Answer (4 Key Points):**\n` + singleTopic.points.map((pt, i) => `${i + 1}. ${pt}`).join("\n");
  }

  // DYNAMIC DOCUMENT CONTEXT EXTRACTOR (When no catalog topic matched)
  const docName = activeDocument?.title || "AWS Lecture Notes";
  const sectionsList: any[] = activeDocument?.sections || [];
  const queryLower = prompt.toLowerCase();
  const keywords = queryLower
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((w: string) => w.length > 2 && !["explain", "marks", "mark", "ans", "answer", "sheet", "page"].includes(w));

  let matchedSections = sectionsList.filter((s: any) => {
    const text = (s.title + " " + (s.subtitle || "") + " " + s.contentMarkdown).toLowerCase();
    return keywords.some((kw: string) => text.includes(kw));
  });

  if (matchedSections.length === 0 && sectionsList.length > 0) {
    matchedSections = sectionsList.slice(0, 5);
  }

  const topicName = keywords.length > 0 
    ? keywords.map(w => w.toUpperCase()).join(" ") + " in AWS Cloud"
    : "AWS Cloud Concepts & Architecture";

  const extractedContent = matchedSections.slice(0, 4).map((s: any) => 
    `#### 📌 Section: ${s.title}\n${s.contentMarkdown.slice(0, 900)}`
  ).join("\n\n");

  if (is2Marks) {
    return `### 🟢 Exam Answer (2 Marks Weightage — 4 Key Points)

**Question Topic:** ${topicName} (Retrieved from "${docName}")

**Answer (4 Key Points):**
1. **Definition:** ${matchedSections[0]?.title || topicName} represents a key operational component in AWS Cloud infrastructure designed to enhance system performance, reliability, and security.
2. **Core Functionality:** Operating within the cloud ecosystem, it provides automated orchestration, utility billing, and seamless multi-AZ redundancy.
3. **Primary Benefit:** Eliminates legacy manual administration overhead, reducing operational costs and ensuring enterprise data availability.
4. **AWS Service Context:** Integrates directly with core AWS services including EC2 compute, VPC networking, and S3 storage.`;
  }

  return `### 🟡 Exam Answer (6 Marks Weightage — Structured 2-Page A4 Format)

**Question Topic:** ${topicName} (Retrieved from "${docName}")

---

### 1. 📌 Overview & Definition
Based on your uploaded study document **"${docName}"**, **${topicName}** forms a critical study topic in the AWS curriculum. It provides software-defined, scalable solutions designed to solve traditional data center constraints.

---

### 2. 📖 Core Explanations & Lecture Notes Context

${extractedContent}

---

### 3. 🔄 Step-by-Step Operational Workflow
1. **Initialization:** The cloud administrator or automated script triggers resource provisioning via the AWS API.
2. **Configuration & Security:** Security Groups and IAM permissions enforce least-privilege boundary rules.
3. **Execution & Processing:** Workloads execute across isolated compute nodes with automated load management.
4. **Monitoring & Persistence:** Health logs are monitored via CloudWatch while persistent data is stored safely in RDS or S3.

---

### 4. 📊 Key Summary & Examination Takeaways
- **Scalability:** Scale infrastructure on-demand without long-term hardware contracts.
- **Fault Tolerance:** Automated failover mechanisms keep services running through hardware outages.
- **Cost Efficiency:** Utility pay-as-you-go pricing optimizes IT budgets.`;
}

  // Technical Documentation PDF endpoints
  app.get(["/api/documentation/pdf", "/api/documentation/download", "/documentation.pdf"], (req, res) => {
    const pdfPath = path.join(process.cwd(), "public", "CourseNotesHub-Technical-Documentation.pdf");
    if (fs.existsSync(pdfPath)) {
      const isDownload = req.path.includes("download");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        isDownload 
          ? 'attachment; filename="CourseNotesHub-Technical-Documentation.pdf"'
          : 'inline; filename="CourseNotesHub-Technical-Documentation.pdf"'
      );
      res.sendFile(pdfPath);
    } else {
      res.status(404).json({ error: "Documentation PDF not found. Please run build to generate." });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for dev / static serving for prod
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn("[SERVER] Vite dev server middleware not available, falling back to static build:", (viteErr as any)?.message || viteErr);
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.send("Course Notes Hub is starting up. Please refresh shortly.");
        }
      });
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.send("Course Notes Hub is starting up. Please refresh shortly.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);

    // Initialize ChromaDB Cloud vector database in background
    initChroma().then(async (ready) => {
      if (ready) {
        const status = await getChromaStatus();
        console.log(`[ChromaDB] Ready with ${status.vectorCount} indexed vector chunks in database "${status.database}"`);
        // If empty, auto-seed initial documents and announcements into ChromaDB
        if (status.vectorCount === 0 && (serverDocuments.length > 0 || serverAnnouncements.length > 0)) {
          console.log(`[ChromaDB] Auto-indexing initial course notes and announcements...`);
          await indexAllDocumentsToChroma(serverDocuments);
          await indexAllAnnouncementsToChroma(serverAnnouncements);
        }
      }
    }).catch((err) => {
      console.warn("[ChromaDB] Background startup notice:", err?.message);
    });
  });
}

// Global crash resilience for production containers
process.on("uncaughtException", (err) => {
  console.error("[SERVER] Process uncaught exception (shielded):", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[SERVER] Process unhandled promise rejection (shielded):", reason);
});

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
