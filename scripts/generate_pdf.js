import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

async function generateDocumentationPdf() {
  const pdfDoc = await PDFDocument.create();
  
  // Embed standard fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Palette
  const colorPrimary = rgb(0.06, 0.09, 0.16); // Slate 900
  const colorSecondary = rgb(0.85, 0.55, 0.05); // Amber 600
  const colorAccent = rgb(0.55, 0.20, 0.90); // Purple 600
  const colorText = rgb(0.15, 0.20, 0.28); // Slate 800
  const colorMuted = rgb(0.40, 0.45, 0.55); // Slate 500
  const colorCardBg = rgb(0.96, 0.97, 0.98); // Light Slate
  const colorBorder = rgb(0.88, 0.90, 0.93);
  const colorWhite = rgb(1, 1, 1);
  const colorHeaderBg = rgb(0.07, 0.11, 0.20); // Dark Navy

  const PAGE_WIDTH = 612;
  const PAGE_HEIGHT = 792;
  const MARGIN_LEFT = 46;
  const MARGIN_RIGHT = 46;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  let currentPage = null;
  let cursorY = 0;
  let pageNumber = 0;
  const allPages = [];

  function addNewPage(isCover = false) {
    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNumber++;
    allPages.push({ page: currentPage, number: pageNumber, isCover });
    cursorY = PAGE_HEIGHT - 48;

    if (!isCover) {
      // Running top header
      currentPage.drawRectangle({
        x: 0,
        y: PAGE_HEIGHT - 32,
        width: PAGE_WIDTH,
        height: 32,
        color: colorHeaderBg,
      });

      currentPage.drawText("COURSE NOTES HUB & AI TUTOR  |  TECHNICAL SPECIFICATION", {
        x: MARGIN_LEFT,
        y: PAGE_HEIGHT - 22,
        size: 8,
        font: fontBold,
        color: rgb(0.9, 0.92, 0.96),
      });

      currentPage.drawText("CONFIDENTIAL & INTERNAL", {
        x: PAGE_WIDTH - MARGIN_RIGHT - 110,
        y: PAGE_HEIGHT - 22,
        size: 7.5,
        font: fontBold,
        color: rgb(0.95, 0.70, 0.20),
      });

      cursorY = PAGE_HEIGHT - 52;
    }
    return currentPage;
  }

  function checkPageSpace(requiredHeight) {
    if (cursorY - requiredHeight < 50) {
      addNewPage(false);
    }
  }

  function drawHeading(text, level = 1) {
    const size = level === 1 ? 14 : level === 2 ? 11 : 9.5;
    const font = fontBold;
    const spacingBefore = level === 1 ? 14 : level === 2 ? 10 : 6;
    const spacingAfter = level === 1 ? 8 : level === 2 ? 5 : 3;

    checkPageSpace(size + spacingBefore + spacingAfter + 20);
    cursorY -= spacingBefore;

    if (level === 1) {
      // Accent pill on left
      currentPage.drawRectangle({
        x: MARGIN_LEFT,
        y: cursorY - 2,
        width: 3.5,
        height: size + 2,
        color: colorSecondary,
      });
      currentPage.drawText(text, {
        x: MARGIN_LEFT + 8,
        y: cursorY,
        size,
        font,
        color: colorPrimary,
      });
      cursorY -= (size + spacingAfter);

      // Thin divider
      currentPage.drawLine({
        start: { x: MARGIN_LEFT, y: cursorY + 3 },
        end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: cursorY + 3 },
        thickness: 0.75,
        color: colorBorder,
      });
      cursorY -= 4;
    } else if (level === 2) {
      currentPage.drawText(text, {
        x: MARGIN_LEFT,
        y: cursorY,
        size,
        font,
        color: colorPrimary,
      });
      cursorY -= (size + spacingAfter);
    } else {
      currentPage.drawText(text, {
        x: MARGIN_LEFT,
        y: cursorY,
        size,
        font: fontBold,
        color: rgb(0.2, 0.25, 0.35),
      });
      cursorY -= (size + spacingAfter);
    }
  }

  function wrapText(text, maxWidth, font, fontSize) {
    const rawParagraphs = String(text).replace(/\r\n/g, "\n").split("\n");
    const lines = [];

    for (const para of rawParagraphs) {
      if (!para.trim()) {
        lines.push("");
        continue;
      }
      const words = para.split(" ");
      let currentLine = "";

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (!word) continue;
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
    }
    return lines;
  }

  function drawParagraph(text, options = {}) {
    const fontSize = options.fontSize || 8.5;
    const font = options.font || fontRegular;
    const color = options.color || colorText;
    const lineSpacing = options.lineSpacing || 12;
    const maxWidth = options.maxWidth || CONTENT_WIDTH;
    const indent = options.indent || 0;

    const lines = wrapText(text, maxWidth - indent, font, fontSize);

    checkPageSpace(lines.length * lineSpacing + 4);

    for (const line of lines) {
      currentPage.drawText(line, {
        x: MARGIN_LEFT + indent,
        y: cursorY,
        size: fontSize,
        font,
        color,
      });
      cursorY -= lineSpacing;
    }
    cursorY -= (options.marginBottom || 3);
  }

  function drawBullet(title, description) {
    const fontSize = 8;
    const titleWidth = fontBold.widthOfTextAtSize(title ? `${title}: ` : "", fontSize);
    const lineSpacing = 11.5;

    const fullText = title ? `${title}: ${description}` : description;
    const lines = wrapText(fullText, CONTENT_WIDTH - 14, fontRegular, fontSize);

    checkPageSpace(lines.length * lineSpacing + 4);

    // Bullet dot
    currentPage.drawCircle({
      x: MARGIN_LEFT + 3,
      y: cursorY + 3,
      size: 1.8,
      color: colorSecondary,
    });

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (idx === 0 && title) {
        const boldPart = `${title}: `;
        currentPage.drawText(boldPart, {
          x: MARGIN_LEFT + 12,
          y: cursorY,
          size: fontSize,
          font: fontBold,
          color: colorPrimary,
        });
        const restLine = line.slice(boldPart.length);
        currentPage.drawText(restLine, {
          x: MARGIN_LEFT + 12 + titleWidth,
          y: cursorY,
          size: fontSize,
          font: fontRegular,
          color: colorText,
        });
      } else {
        currentPage.drawText(line, {
          x: MARGIN_LEFT + 12,
          y: cursorY,
          size: fontSize,
          font: fontRegular,
          color: colorText,
        });
      }
      cursorY -= lineSpacing;
    }
    cursorY -= 1.5;
  }

  function drawCallout(title, body, accentColor = colorSecondary) {
    const fontSize = 8;
    const lineSpacing = 11;
    const bodyLines = wrapText(body, CONTENT_WIDTH - 22, fontRegular, fontSize);
    const boxHeight = 18 + (bodyLines.length * lineSpacing);

    checkPageSpace(boxHeight + 8);
    cursorY -= 3;

    // Background Card
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: cursorY - boxHeight + 12,
      width: CONTENT_WIDTH,
      height: boxHeight,
      color: colorCardBg,
      borderColor: colorBorder,
      borderWidth: 1,
    });

    // Left accent strip
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: cursorY - boxHeight + 12,
      width: 3.5,
      height: boxHeight,
      color: accentColor,
    });

    // Title
    currentPage.drawText(title, {
      x: MARGIN_LEFT + 12,
      y: cursorY - 1,
      size: 8.5,
      font: fontBold,
      color: colorPrimary,
    });

    let bY = cursorY - 14;
    for (const line of bodyLines) {
      currentPage.drawText(line, {
        x: MARGIN_LEFT + 12,
        y: bY,
        size: fontSize,
        font: fontRegular,
        color: colorText,
      });
      bY -= lineSpacing;
    }

    cursorY -= (boxHeight + 6);
  }

  function drawTable(headers, rows, colWidths) {
    const rowHeight = 16;
    const totalHeight = (rows.length + 1) * rowHeight;
    checkPageSpace(totalHeight + 12);

    // Header Row Background
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: cursorY - rowHeight + 3,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: rgb(0.12, 0.16, 0.24),
    });

    let currentX = MARGIN_LEFT;
    for (let i = 0; i < headers.length; i++) {
      currentPage.drawText(headers[i], {
        x: currentX + 5,
        y: cursorY - 8,
        size: 7,
        font: fontBold,
        color: colorWhite,
      });
      currentX += colWidths[i];
    }
    cursorY -= rowHeight;

    // Data Rows
    for (let r = 0; r < rows.length; r++) {
      const isAlt = r % 2 === 1;
      if (isAlt) {
        currentPage.drawRectangle({
          x: MARGIN_LEFT,
          y: cursorY - rowHeight + 3,
          width: CONTENT_WIDTH,
          height: rowHeight,
          color: rgb(0.97, 0.98, 0.99),
        });
      }

      // Bottom border for row
      currentPage.drawLine({
        start: { x: MARGIN_LEFT, y: cursorY - rowHeight + 3 },
        end: { x: MARGIN_LEFT + CONTENT_WIDTH, y: cursorY - rowHeight + 3 },
        thickness: 0.5,
        color: colorBorder,
      });

      let cellX = MARGIN_LEFT;
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const text = String(row[c]);
        currentPage.drawText(text, {
          x: cellX + 5,
          y: cursorY - 8,
          size: 7,
          font: c === 0 ? fontBold : fontRegular,
          color: c === 0 ? colorPrimary : colorText,
        });
        cellX += colWidths[c];
      }
      cursorY -= rowHeight;
    }
    cursorY -= 8;
  }

  // ==========================================
  // PAGE 1: COVER PAGE & EXECUTIVE SUMMARY
  // ==========================================
  addNewPage(true);

  // Top decorative color block
  currentPage.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 170,
    width: PAGE_WIDTH,
    height: 170,
    color: colorHeaderBg,
  });

  currentPage.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 175,
    width: PAGE_WIDTH,
    height: 5,
    color: colorSecondary,
  });

  // Cover Page Title
  currentPage.drawText("STUDENT NOTES HUB & AI TUTOR", {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 65,
    size: 20,
    font: fontBold,
    color: colorWhite,
  });

  currentPage.drawText("Comprehensive System Architecture & Technical Specification", {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 88,
    size: 10.5,
    font: fontRegular,
    color: rgb(0.85, 0.88, 0.95),
  });

  currentPage.drawText("Full-Stack Node.js/Express * React 19 * Google Gemini 3.6 Flash * ChromaDB Cloud Vector RAG", {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 110,
    size: 8,
    font: fontBold,
    color: rgb(0.95, 0.70, 0.20),
  });

  cursorY = PAGE_HEIGHT - 195;

  // Metadata Card
  drawCallout("DOCUMENT INFORMATION & SYSTEM METADATA", 
    "Project: Interactive Course Notes Hub & Smart AI Study Tutor Platform\n" +
    "Authors: AI Engineering Team & System Architects\n" +
    "Runtime Environment: Node.js 22 (LTS) | React 19 SPA | Express Server Engine\n" +
    "Vector Database: ChromaDB Managed Cloud Client ('rag-notes-application1')\n" +
    "Primary Generative Model: Google Gemini 3.6 Flash (@google/genai SDK)\n" +
    "Document Format Compatibility: PDF (Vector/Canvas), Word (.docx), PowerPoint (.pptx), Markdown, Code (.py)\n" +
    "Synchronization Model: Continuous Background Auto-Sync (Event-Driven & Periodic Reconciliation)\n" +
    "Status: Production Ready | Fully Tested & Deployed"
  );

  cursorY -= 6;
  drawHeading("Executive Overview", 1);
  drawParagraph(
    "The Student Notes Hub & AI Tutor is an enterprise-grade academic platform engineered to bridge the gap between static lecture materials and active, personalized learning. Built on modern TypeScript, it unifies dual operational portals: a feature-packed Teacher & Instructor Studio for curriculum compilation, slide extraction, and vector database indexing, alongside an immersive Student Study Hub featuring side-by-side note reading, text-to-speech, interactive self-assessment exams, and a context-grounded AI Tutor."
  );

  drawParagraph(
    "Unlike generic LLM wrappers, this system implements a strict Retrieval-Augmented Generation (RAG) architecture. When students ask questions or generate practice exams, the engine grounds prompts against exact slide sections and page citations indexed in ChromaDB Cloud, guaranteeing factual fidelity and preventing hallucinations."
  );

  cursorY -= 4;
  drawHeading("Key Technical Capabilities", 2);
  drawBullet("High-Fidelity Dual-View Reading", "Presents original slide diagrams, equations, and figures via a hardware-accelerated PDF canvas viewer synchronized side-by-side with structured, readable markdown notes.");
  drawBullet("Continuous Automatic Vector Sync", "All course documents, revisions, and announcements automatically synchronize to ChromaDB Cloud in the background without requiring manual intervention.");
  drawBullet("Real-Time Multi-Provider AI Routing", "Prioritizes Google Gemini 3.6 Flash for sub-second responses with seamless automatic fallback to OpenRouter (Llama 3.3 70B, DeepSeek) and local semantic heuristic engines.");
  drawBullet("Automated Practice Exam Generation", "Instantly compiles balanced, 4-choice multiple-choice quizzes complete with verified answer keys, concept references, and rationale explanations.");

  // ==========================================
  // PAGE 2: ARCHITECTURE & SYSTEM DESIGN
  // ==========================================
  addNewPage(false);
  drawHeading("1. System Architecture & High-Level Design", 1);
  drawParagraph(
    "The application follows a clean full-stack decoupled architecture. The Express server acts as both the secure API gateway and the static asset distributor, running Vite in middleware mode during development and serving compiled production assets in deployment."
  );

  drawCallout("High-Level Data Flow Architecture",
    "[Client Layer: React 19 SPA]\n" +
    "  |-- Student Portal (Viewer, AI Side Panel, Audio Player, Quiz Engine, Bookmarks)\n" +
    "  |-- Teacher Studio (Document Uploader, Metadata Editor, Merge Studio, Announcements)\n" +
    "        |\n" +
    "        v [HTTP / JSON REST API with Authorization & Session State]\n" +
    "[Backend Layer: Express 4.x + Node.js 22 Engine]\n" +
    "  |-- File Parsing Engine (pdf-parse, mammoth, adm-zip for pptx XML extraction)\n" +
    "  |-- ChromaDB Auto-Sync Service (Continuous Background Reconciler & Embedding Engine)\n" +
    "  |-- Multi-Provider AI Router (Gemini 3.6 Flash -> OpenRouter -> Groq -> Local RAG)\n" +
    "  |-- Storage Engine (Persistent JSON file cache + Binary PDF stream cache)"
  );

  drawHeading("2. Technology Stack & Framework Specifications", 1);
  drawParagraph(
    "Every dependency was selected for zero-friction performance, strict type safety, and minimal container footprint:"
  );

  drawTable(
    ["Layer / Component", "Technology / Library", "Version", "Operational Role"],
    [
      ["Frontend Framework", "React + TypeScript", "19.0.1", "Single-Page Application with Concurrent React"],
      ["Styling & Tokens", "Tailwind CSS + Lucide", "v4.1.14", "Responsive dark-first UI with SVG icon set"],
      ["PDF Rendering", "PDF.js (pdfjs-dist)", "6.2.108", "Canvas rasterizer for original lecture slides"],
      ["Backend Framework", "Express.js (Node.js)", "4.21.2", "REST API, file streaming, and AI routing"],
      ["Primary AI Model", "Google Gemini 3.6 Flash", "v2.4.0", "Core RAG Tutor & structured quiz generator"],
      ["Vector Database", "ChromaDB Cloud Client", "3.5.0", "Cloud vector storage for slide embeddings"],
      ["Office Doc Parsers", "Mammoth & Adm-Zip", "1.12.2", "DOCX and PPTX slide XML deconstruction"],
      ["PDF Ingestion", "pdf-parse", "2.4.5", "Raw text, page split, and metadata extraction"]
    ],
    [95, 125, 55, 245]
  );

  drawHeading("3. Dual-Portal Deployment Architecture", 1);
  drawParagraph(
    "The application natively supports three distinct deployment configurations via environment variables or URL query routing:"
  );
  drawBullet("Unified Mode (Default)", "Both the Teacher Studio and Student Portal exist in the same instance, allowing instructors to switch portals seamlessly via header navigation or URL parameters.");
  drawBullet("Standalone Student Mode (VITE_PORTAL_MODE=student)", "Locks the interface into a secure, read-only student experience. All administrative studio endpoints and editor buttons are stripped from the DOM.");
  drawBullet("Standalone Teacher Mode (VITE_PORTAL_MODE=teacher)", "Serves only the curriculum management studio. Used in institutional setups where instructors manage notes behind internal university VPNs.");

  // ==========================================
  // PAGE 3: AUTOMATIC CHROMADB CLOUD VECTOR SYNCHRONIZATION
  // ==========================================
  addNewPage(false);
  drawHeading("4. Automatic ChromaDB Cloud Vector Synchronization Engine", 1);
  drawParagraph(
    "To deliver zero-maintenance operational reliability, the system features a Continuous Background Auto-Sync Engine. Whenever course documents or announcements are modified in any way, the backend reconciles and persists the vector space in ChromaDB Cloud without requiring manual human intervention."
  );

  drawCallout("Core Principles of the Auto-Sync Engine",
    "- 100% Background Execution: HTTP responses return immediately; embedding and upserting occur asynchronously.\n" +
    "- Debounced Batching: Rapid edits or multi-file uploads are batched (1.2s delay) to eliminate redundant API calls.\n" +
    "- Deduplication by Identity: Previous chunks for a document ID are purged prior to upsert, preventing duplicate vectors.\n" +
    "- Self-Healing Reconciliation: A 5-minute background timer verifies vector parity and recovers from network interruptions.\n" +
    "- Startup Ingestion: On server boot, all persisted files are immediately verified and indexed into ChromaDB Cloud.",
    colorAccent
  );

  drawHeading("Event-Driven Lifecycle Triggers", 2);
  drawParagraph(
    "Automatic vector synchronization is wired directly into the document lifecycle at the persistence layer:"
  );

  drawBullet("Document Uploads (POST /api/upload-document)", "Incoming PDFs, Word files, or PPTX presentations are parsed into per-page chunks and queued for immediate vector indexing.");
  drawBullet("Document Metadata Edits (PUT /api/documents/:id)", "Renaming documents, changing subject classifications, or updating unit descriptions automatically re-indexes chunks with updated semantic labels.");
  drawBullet("Publication Toggles (PUT /api/documents/:id/publish)", "Modifications to visibility flags update the collection metadata so the RAG search honors active publication rules.");
  drawBullet("Document Deletions (DELETE /api/documents/:id)", "Permanently deletes all chunk IDs associated with the target document from the cloud collection.");
  drawBullet("Document Merging & Duplication (POST /api/documents)", "Newly generated comprehensive study guides are immediately vector-embedded upon creation.");
  drawBullet("Broadcast Announcements (POST & DELETE /api/announcements)", "Exam notices and syllabus updates are indexed as high-priority vector targets available to the AI Tutor.");

  drawHeading("Dense Semantic Vector Generation (384 Dimensions)", 2);
  drawParagraph(
    "The system employs a custom 384-dimensional dense semantic embedding engine (RobustEmbeddingFunction). It uses n-gram tokenization (unigrams, bigrams, trigrams), character 3-grams for morphological robustness, dual-seed sign hashing, tanh non-linear activation, and L2 unit-norm projection. This completely eliminates ONNX/Protobuf native C++ crashes in containerized environments while delivering high-accuracy cosine similarity retrieval."
  );

  drawCallout("ChromaDB Cloud Connection Configuration",
    "Database Target: 'rag-notes-application1'\n" +
    "Tenant ID: '0f94ea0f-37ba-4909-88f1-4ee0f0e15dd7'\n" +
    "Collection Name: 'course_notes_rag'\n" +
    "Batch Size: 50 chunks per upsert pass | Cloud Protocol: HTTPS CloudClient"
  );

  // ==========================================
  // PAGE 4: AI ORCHESTRATION & PRACTICE EXAM ENGINE
  // ==========================================
  addNewPage(false);
  drawHeading("5. AI & Retrieval-Augmented Generation (RAG) Subsystem", 1);
  drawParagraph(
    "The hallmark of the platform is its grounded intelligence pipeline. Rather than dumping raw text into a single prompt, the system utilizes a multi-step semantic retrieval workflow:"
  );

  drawBullet("Step 1: Document Chunking", "When a note is ingested, the parser decomposes content into discrete slide/page sections. Each section retains its page number, topic heading, and extracted bullet text.");
  drawBullet("Step 2: Vector Embedding & Storage", "Document chunks are dispatched to ChromaDB Cloud via @chroma-core/chroma-client. Each record is assigned an embedding vector alongside metadata tags (documentId, subject, unit, pageNumber).");
  drawBullet("Step 3: Query Analysis & Similarity Search", "When a student submits a query, the backend converts the query to an embedding, executes a cosine similarity search across the active document's collection, and extracts the top 5 most relevant slide excerpts.");
  drawBullet("Step 4: Grounded Prompt Assembly", "The system constructs a strict system prompt instructing the model to act as an academic tutor, cite page numbers, and explicitly refuse to invent information outside the syllabus.");
  drawBullet("Step 5: Multi-Tier Execution & Fallback", "Requests are dispatched first to Google Gemini 3.6 Flash. If quota or network limits are encountered, the engine transparently retries against OpenRouter (Llama 3.3 70B), Groq, or the internal keyword matcher.");

  drawCallout("Grounded Prompt Template (System Instruction)",
    "You are an expert university academic tutor specialized in course materials.\n" +
    "- Ground all explanations directly on the retrieved slide excerpts.\n" +
    "- Always cite specific slide/page numbers (e.g., [Page 4 - Virtualization Models]).\n" +
    "- Format answers using clean markdown, structured bullet points, and code blocks.\n" +
    "- If the question cannot be answered from the provided notes, politely explain that the concept is not covered in the current syllabus."
  );

  drawHeading("6. Automated Quiz & Assessment Engine", 1);
  drawParagraph(
    "Students can generate customized practice exams for any uploaded lecture document. The backend leverages Gemini's structured responseMimeType: 'application/json' to enforce a strict JSON schema:"
  );

  drawTable(
    ["Field Name", "Type", "Description & Validation"],
    [
      ["id", "string", "Unique identifier formatted as `gemini-{docId}-{timestamp}-{index}`"],
      ["question", "string", "Conceptually rigorous question stem derived from lecture slides"],
      ["options", "string[]", "Exactly 4 plausible choices (1 correct, 3 realistic distractors)"],
      ["correctIndex", "number", "0-indexed pointer (0 to 3) referencing the correct option"],
      ["explanation", "string", "Comprehensive breakdown explaining why the answer is correct"],
      ["topic", "string", "The specific curriculum unit or lecture concept tested"]
    ],
    [85, 75, 360]
  );

  // ==========================================
  // PAGE 5: DOCUMENT INGESTION & UI VIEWER
  // ==========================================
  addNewPage(false);
  drawHeading("7. Multi-Format Document Ingestion Engine", 1);
  drawParagraph(
    "Instructors can upload course materials in multiple industry-standard formats. The ingestion pipeline normalizes all documents into a standardized NoteDocument schema:"
  );

  drawBullet("PDF Files (.pdf)", "Processed via pdf-parse to extract clean per-page text and headers. Raw PDF binary is preserved as a Data URL or static stream to allow high-fidelity canvas rendering in the viewer.");
  drawBullet("Word Documents (.docx, .doc)", "Parsed using Mammoth to extract raw text, table structures, and headings while preserving paragraph flow.");
  drawBullet("PowerPoint Presentations (.pptx)", "Decompressed via adm-zip to parse slide XML structures (`ppt/slides/slide{N}.xml`), extracting bullet text and slide speaker notes per slide.");
  drawBullet("Source Code Files (.py, .ts, .js, .java)", "Segmented by function and class definitions, wrapped in syntax-highlighted code blocks, and indexed for programming coursework.");

  drawHeading("8. High-Fidelity UI & Document Viewer Architecture", 1);
  drawParagraph(
    "The DocumentModalViewer component offers a desktop-grade study environment optimized for long reading sessions:"
  );

  drawBullet("Synchronized Dual View", "Displays the original presentation slide PDF on the left and enhanced, accessible AI markdown notes on the right.");
  drawBullet("Page Thumbnails & Jump Navigation", "Interactive slide drawer with instant thumbnail navigation, active page indicator, and page count status.");
  drawBullet("Embedded AI Tutor Side Panel", "A docked right-hand panel allowing students to converse with the AI tutor without ever losing their place in the lecture notes.");
  drawBullet("Text-to-Speech (TTS) Audio Player", "Integrated speech synthesis player with play, pause, playback speed control (0.75x to 2.0x), and automatic page progression.");
  drawBullet("Interactive Bookmarks & Highlights", "Students can bookmark critical slides with custom annotations, stored locally for instant retrieval across sessions.");

  drawCallout("Supported Document Operations (Teacher Studio)",
    "- Upload & Auto-Vectorize: Automatic text extraction and vector embedding generation.\n" +
    "- Document Merging: Combine multiple topic slides into comprehensive course modules.\n" +
    "- Rename & Metadata Tagging: Modify course codes, units, titles, and descriptions.\n" +
    "- Publish / Unpublish Toggle: Control student visibility for draft materials.\n" +
    "- Course Announcements: Post high-priority exam dates and syllabus updates."
  );

  // ==========================================
  // PAGE 6: REST API & DEPLOYMENT GUIDE
  // ==========================================
  addNewPage(false);
  drawHeading("9. Complete REST API Endpoint Reference", 1);

  drawTable(
    ["Method", "Endpoint", "Payload / Parameters", "Description"],
    [
      ["GET", "/api/documents", "role=student|all", "Returns list of published or all documents"],
      ["POST", "/api/upload-document", "Multipart / Base64 File", "Uploads, parses & auto-syncs to ChromaDB"],
      ["POST", "/api/documents", "{ title, subject, unit, ... }", "Creates new document & triggers auto-sync"],
      ["PUT", "/api/documents/:id", "{ title, subject, unit }", "Updates metadata & re-indexes in ChromaDB"],
      ["PUT", "/api/documents/:id/publish", "{ isPublished: boolean }", "Toggles student visibility & auto-syncs"],
      ["DELETE", "/api/documents/:id", "None", "Deletes document and purges ChromaDB vectors"],
      ["POST", "/api/documents/sync", "{ documents, overwrite }", "Batch synchronizes documents & vector database"],
      ["POST", "/api/chat", "{ prompt, activeDocument }", "Executes grounded RAG chat against vectors"],
      ["POST", "/api/generate-quiz", "{ docId, content, count }", "Compiles a 4-choice practice exam via Gemini"],
      ["GET", "/api/announcements", "None", "Returns active broadcast announcements"],
      ["POST", "/api/announcements", "{ title, content, priority }", "Posts an announcement & auto-indexes to Chroma"],
      ["GET", "/api/chroma/status", "None", "Checks ChromaDB cloud vector database health"],
      ["GET", "/api/documentation/pdf", "None", "Streams technical documentation PDF"]
    ],
    [50, 130, 145, 195]
  );

  drawHeading("10. Environment Configuration & Deployment", 1);
  drawParagraph(
    "The application is container-ready and deploys effortlessly to Cloud Run, Render, or Docker:"
  );

  drawCallout("Recommended Environment Variables (.env)",
    "GEMINI_API_KEY=your_gemini_api_key       # Google Gemini 3.6 Flash access\n" +
    "CHROMA_API_KEY=your_chroma_key           # ChromaDB Cloud authentication\n" +
    "CHROMA_TENANT=0f94ea0f-...                # Chroma tenant UUID\n" +
    "CHROMA_DATABASE=rag-notes-application1    # Chroma database target\n" +
    "OPENROUTER_API_KEY=optional_key          # Fallback LLM provider\n" +
    "GROQ_API_KEY=optional_key                # High-speed fallback provider\n" +
    "VITE_PORTAL_MODE=student|teacher          # Optional hard portal lock\n" +
    "PORT=3000                                 # Application HTTP port"
  );

  drawParagraph(
    "To build and launch the production container, execute:\n" +
    "  1. npm install --production=false\n" +
    "  2. npm run build  (generates technical PDF, compiles Vite bundle, and bundles server.ts to dist/server.cjs)\n" +
    "  3. npm start      (launches compiled server on port 3000)"
  );

  // Add Page Numbers & Footers to all pages
  const totalPages = allPages.length;
  for (const p of allPages) {
    if (!p.isCover) {
      // Bottom divider
      p.page.drawLine({
        start: { x: MARGIN_LEFT, y: 34 },
        end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: 34 },
        thickness: 0.5,
        color: colorBorder,
      });

      p.page.drawText("Course Notes Hub & AI Tutor -- Full Technical Documentation", {
        x: MARGIN_LEFT,
        y: 23,
        size: 7,
        font: fontRegular,
        color: colorMuted,
      });

      const pageStr = `Page ${p.number} of ${totalPages}`;
      const pageStrWidth = fontRegular.widthOfTextAtSize(pageStr, 7);
      p.page.drawText(pageStr, {
        x: PAGE_WIDTH - MARGIN_RIGHT - pageStrWidth,
        y: 23,
        size: 7,
        font: fontBold,
        color: colorMuted,
      });
    }
  }

  // Ensure output directory exists
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(publicDir, "CourseNotesHub-Technical-Documentation.pdf");
  fs.writeFileSync(outputPath, pdfBytes);

  console.log(`[SUCCESS] Generated PDF documentation: ${outputPath} (${pdfBytes.length} bytes, ${totalPages} pages)`);
}

generateDocumentationPdf().catch((err) => {
  console.error("Error generating documentation PDF:", err);
  process.exit(1);
});
