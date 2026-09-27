import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const SLIDES_DIR = path.join(process.cwd(), "data", "slides");

/**
 * Parses .pptx presentation files using server/pptx_renderer.py to preserve 100% of native slide structure, shapes, positions, fonts, colors, and embedded images.
 */
export async function convertPptxToSlides(docId, pptxPath) {
  const docSlideDir = path.join(SLIDES_DIR, docId);
  if (!fs.existsSync(docSlideDir)) {
    try {
      fs.mkdirSync(docSlideDir, { recursive: true });
    } catch {}
  }

  // 1. Check if SVG slide images already exist
  const existingImages = fs.readdirSync(docSlideDir).filter(f => /\.(svg|png|webp|jpg|jpeg)$/i.test(f) && !f.includes("media"));
  if (existingImages.length > 0) {
    const sorted = existingImages.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, "") || "0", 10);
      const numB = parseInt(b.replace(/\D/g, "") || "0", 10);
      return numA - numB;
    });
    const mapping = {};
    sorted.forEach((_, idx) => {
      mapping[idx + 1] = `/api/slide/${docId}/${idx + 1}`;
    });
    return mapping;
  }

  // 2. Render PPTX via python OpenXML renderer
  if (pptxPath && fs.existsSync(pptxPath)) {
    try {
      const scriptPath = path.join(process.cwd(), "server", "pptx_renderer.py");
      execSync(`python3 "${scriptPath}" "${pptxPath}" "${docSlideDir}"`, { stdio: "inherit", timeout: 30000 });

      const generated = fs.readdirSync(docSlideDir).filter(f => /\.(svg|png|webp|jpg|jpeg)$/i.test(f) && !f.includes("media"));
      if (generated.length > 0) {
        const sorted = generated.sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, "") || "0", 10);
          const numB = parseInt(b.replace(/\D/g, "") || "0", 10);
          return numA - numB;
        });

        const mapping = {};
        sorted.forEach((_, idx) => {
          mapping[idx + 1] = `/api/slide/${docId}/${idx + 1}`;
        });
        return mapping;
      }
    } catch (err) {
      console.warn("[Python PPTX Renderer error]:", err);
    }
  }

  return {};
}
