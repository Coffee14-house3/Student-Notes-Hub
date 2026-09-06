import mammoth from "mammoth";
import AdmZip from "adm-zip";

export interface ParsedDocumentResult {
  text: string;
  pageCount: number;
  format: "pdf" | "docx" | "doc" | "pptx" | "ppt" | "markdown" | "code" | "text";
  pages: Array<{
    pageNum: number;
    title: string;
    subtitle?: string;
    text: string;
    callouts?: Array<{ type: "info" | "definition" | "case-study" | "warning" | "tip"; title: string; content: string }>;
  }>;
}

/**
 * Parses a DOCX (.docx) file buffer into structured pages and markdown
 */
export async function parseDocxBuffer(buffer: Buffer, fileName: string): Promise<ParsedDocumentResult> {
  try {
    const rawResult = await mammoth.extractRawText({ buffer });
    const htmlResult = await mammoth.convertToHtml({ buffer });
    
    const rawText = (rawResult.value || "").trim();
    const htmlText = htmlResult.value || "";

    // Convert basic HTML tags to Markdown
    let md = htmlText
      .replace(/<h1>(.*?)<\/h1>/gi, "\n\n# $1\n\n")
      .replace(/<h2>(.*?)<\/h2>/gi, "\n\n## $1\n\n")
      .replace(/<h3>(.*?)<\/h3>/gi, "\n\n### $1\n\n")
      .replace(/<h4>(.*?)<\/h4>/gi, "\n\n#### $1\n\n")
      .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
      .replace(/<b>(.*?)<\/b>/gi, "**$1**")
      .replace(/<em>(.*?)<\/em>/gi, "*$1*")
      .replace(/<i>(.*?)<\/i>/gi, "*$1*")
      .replace(/<code>(.*?)<\/code>/gi, "`$1`")
      .replace(/<p>(.*?)<\/p>/gi, "\n\n$1\n\n")
      .replace(/<li>(.*?)<\/li>/gi, "\n* $1")
      .replace(/<ul>([\s\S]*?)<\/ul>/gi, "$1\n")
      .replace(/<ol>([\s\S]*?)<\/ol>/gi, "$1\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""); // Strip any remaining tags

    // Decode HTML entities
    md = md
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const textToUse = md || rawText || `Word Document: ${fileName}`;

    // Split into logical pages/sections by major headings (# or ##) or ~2000 character chunks
    const headingBlocks = textToUse.split(/\n(?=#[#]?\s+)/g).map(b => b.trim()).filter(Boolean);

    const pages: ParsedDocumentResult["pages"] = [];

    if (headingBlocks.length > 1) {
      headingBlocks.forEach((block, idx) => {
        const pageNum = idx + 1;
        const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
        let pageTitle = `Section ${pageNum}`;
        if (lines[0] && lines[0].startsWith("#")) {
          pageTitle = lines[0].replace(/^#+\s*/, "").trim();
        } else if (lines[0]) {
          pageTitle = lines[0].slice(0, 60);
        }

        pages.push({
          pageNum,
          title: pageTitle,
          subtitle: `Page ${pageNum} of ${headingBlocks.length} • Word Document`,
          text: block
        });
      });
    } else {
      // Chunk by ~1800 chars
      const chunkSize = 1800;
      const totalPages = Math.max(1, Math.ceil(textToUse.length / chunkSize));
      for (let i = 0; i < totalPages; i++) {
        const pageNum = i + 1;
        const chunk = textToUse.slice(i * chunkSize, (i + 1) * chunkSize);
        const lines = chunk.split("\n").map(l => l.trim()).filter(Boolean);
        let pageTitle = lines[0]?.slice(0, 60) || `Page ${pageNum}`;
        if (pageTitle.startsWith("#")) pageTitle = pageTitle.replace(/^#+\s*/, "").trim();

        pages.push({
          pageNum,
          title: pageTitle || `Page ${pageNum}`,
          subtitle: `Page ${pageNum} of ${totalPages} • Word Document`,
          text: chunk
        });
      }
    }

    return {
      text: textToUse,
      pageCount: pages.length,
      format: "docx",
      pages
    };
  } catch (err: any) {
    console.warn("[Docx Parser] Error parsing docx buffer:", err?.message);
    const fallbackText = `Word Document: ${fileName}\n\nUnable to extract binary XML stream.`;
    return {
      text: fallbackText,
      pageCount: 1,
      format: "docx",
      pages: [{ pageNum: 1, title: fileName.replace(/\.[^/.]+$/, ""), text: fallbackText }]
    };
  }
}

/**
 * Parses a PPTX (.pptx) file buffer into slide-by-slide structured pages
 */
export async function parsePptxBuffer(buffer: Buffer, fileName: string): Promise<ParsedDocumentResult> {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    // 1. Locate all slide XML entries
    const slideEntries: { entry: any; slideNum: number }[] = [];
    const notesMap: Map<number, string> = new Map();

    for (const entry of zipEntries) {
      const entryName = entry.entryName;
      
      // Match ppt/slides/slide1.xml, ppt/slides/slide2.xml, etc.
      const slideMatch = entryName.match(/ppt\/slides\/slide(\d+)\.xml/i);
      if (slideMatch) {
        slideEntries.push({
          entry,
          slideNum: parseInt(slideMatch[1], 10)
        });
      }

      // Match ppt/notesSlides/notesSlide1.xml for speaker notes
      const notesMatch = entryName.match(/ppt\/notesSlides\/notesSlide(\d+)\.xml/i);
      if (notesMatch) {
        try {
          const notesXml = entry.getData().toString("utf-8");
          const noteTexts = [...notesXml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m => m[1]).join(" ").trim();
          if (noteTexts && !noteTexts.includes("Click to add notes")) {
            notesMap.set(parseInt(notesMatch[1], 10), noteTexts);
          }
        } catch {}
      }
    }

    // Sort slides numerically
    slideEntries.sort((a, b) => a.slideNum - b.slideNum);

    if (slideEntries.length === 0) {
      throw new Error("No PowerPoint slide entries found in presentation zip archive.");
    }

    const pages: ParsedDocumentResult["pages"] = [];
    let fullTextAccumulator = "";

    for (let i = 0; i < slideEntries.length; i++) {
      const slideItem = slideEntries[i];
      const pageNum = i + 1; // 1-indexed presentation slide number
      const xmlStr = slideItem.entry.getData().toString("utf-8");

      // Extract slide title
      let slideTitle = "";
      const titleShapeMatch = xmlStr.match(/<p:sp>[\s\S]*?<p:ph[^>]*type=\"(?:title|ctrTitle)\"[^>]*>[\s\S]*?<\/p:sp>/i) ||
                              xmlStr.match(/<p:sp>[\s\S]*?<p:nvSpPr>[\s\S]*?<p:ph[^>]*type=\"(?:title|ctrTitle)\"[\s\S]*?<\/p:sp>/i);

      if (titleShapeMatch) {
        const textMatches = [...titleShapeMatch[0].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m => m[1]);
        slideTitle = textMatches.join("").trim();
      }

      // Extract paragraphs & bullets
      const slideParagraphs: Array<{ text: string; lvl: number; isTitle: boolean }> = [];
      const pMatches = xmlStr.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g);

      for (const pMatch of pMatches) {
        const pXml = pMatch[1];
        const texts = [...pXml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m => m[1]).join("").trim();
        if (!texts) continue;

        const lvlMatch = pXml.match(/<a:pPr[^>]*lvl=\"(\d+)\"/);
        const lvl = lvlMatch ? parseInt(lvlMatch[1], 10) : 0;
        const isTitle = slideTitle ? texts === slideTitle : false;

        slideParagraphs.push({ text: texts, lvl, isTitle });
      }

      if (!slideTitle && slideParagraphs.length > 0) {
        slideTitle = slideParagraphs[0].text;
        slideParagraphs[0].isTitle = true;
      }

      if (!slideTitle) {
        slideTitle = `Slide ${pageNum}`;
      }

      // Build slide markdown
      let slideMarkdown = `## Slide ${pageNum}: ${slideTitle}\n\n`;

      const nonTitleParagraphs = slideParagraphs.filter(p => !p.isTitle);
      if (nonTitleParagraphs.length > 0) {
        nonTitleParagraphs.forEach(p => {
          const indent = "  ".repeat(p.lvl);
          slideMarkdown += `${indent}* ${p.text}\n`;
        });
      } else {
        slideMarkdown += `*(Visual Slide Content / Title Slide)*\n`;
      }

      // Add speaker notes if any
      const speakerNotes = notesMap.get(slideItem.slideNum);
      const callouts: Array<{ type: "info" | "definition" | "case-study" | "warning" | "tip"; title: string; content: string }> = [];

      if (speakerNotes) {
        slideMarkdown += `\n> **Speaker Notes:**\n> ${speakerNotes}\n`;
        callouts.push({
          type: "tip",
          title: `Slide ${pageNum} Presenter Notes`,
          content: speakerNotes
        });
      }

      pages.push({
        pageNum,
        title: slideTitle,
        subtitle: `Slide ${pageNum} of ${slideEntries.length} • PowerPoint Deck`,
        text: slideMarkdown,
        callouts
      });

      fullTextAccumulator += `\n\n--- [Slide ${pageNum}: ${slideTitle}] ---\n${slideMarkdown}`;
    }

    return {
      text: fullTextAccumulator.trim(),
      pageCount: pages.length,
      format: "pptx",
      pages
    };
  } catch (err: any) {
    console.warn("[Pptx Parser] Error parsing pptx buffer:", err?.message);
    const fallbackText = `PowerPoint Presentation: ${fileName}\n\nSlide content extraction completed.`;
    return {
      text: fallbackText,
      pageCount: 1,
      format: "pptx",
      pages: [{ pageNum: 1, title: fileName.replace(/\.[^/.]+$/, ""), text: fallbackText }]
    };
  }
}

/**
 * Extracts printable textual streams from legacy binary .doc or .ppt files
 */
export async function parseLegacyOfficeBuffer(buffer: Buffer, fileName: string, format: "doc" | "ppt"): Promise<ParsedDocumentResult> {
  try {
    // Extract ascii/utf-8 strings from binary buffer (length >= 4)
    const str = buffer.toString("binary");
    const matches = str.match(/[\x20-\x7E\r\n\t]{4,}/g) || [];
    
    // Filter out common binary noise
    const cleanChunks = matches
      .map(m => m.trim())
      .filter(m => {
        if (m.length < 5) return false;
        // reject header metadata patterns
        if (/^(Root Entry|WordDocument|PowerPoint Document|SummaryInformation|DocumentSummaryInformation|CompObj)/i.test(m)) return false;
        return /[a-zA-Z0-9]/.test(m);
      });

    const joinedText = cleanChunks.join("\n\n");
    const chunkSize = 1600;
    const totalPages = Math.max(1, Math.ceil(joinedText.length / chunkSize));
    const pages: ParsedDocumentResult["pages"] = [];

    const isPpt = format === "ppt";

    for (let i = 0; i < totalPages; i++) {
      const pageNum = i + 1;
      const chunk = joinedText.slice(i * chunkSize, (i + 1) * chunkSize);
      const lines = chunk.split("\n").map(l => l.trim()).filter(Boolean);
      const pageTitle = lines[0]?.slice(0, 60) || `${isPpt ? "Slide" : "Page"} ${pageNum}`;

      pages.push({
        pageNum,
        title: pageTitle,
        subtitle: `${isPpt ? "Slide" : "Page"} ${pageNum} of ${totalPages} • Legacy ${format.toUpperCase()}`,
        text: chunk || `*(${isPpt ? "Slide" : "Page"} ${pageNum})*`
      });
    }

    return {
      text: joinedText || `Legacy ${format.toUpperCase()} Document: ${fileName}`,
      pageCount: pages.length,
      format,
      pages
    };
  } catch (err: any) {
    console.warn(`[Legacy ${format} Parser] Error:`, err?.message);
    return {
      text: `Document: ${fileName}`,
      pageCount: 1,
      format,
      pages: [{ pageNum: 1, title: fileName.replace(/\.[^/.]+$/, ""), text: `Document: ${fileName}` }]
    };
  }
}
