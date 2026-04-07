export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractionResult {
  pages: ExtractedPage[];
  fullText: string;
  pageCount: number;
}

/**
 * Extract text from a PDF buffer using pdfjs-dist legacy build (Node.js compatible).
 * No native dependencies — works reliably on Vercel Lambda.
 * Adds [Stranica X] markers per page for AI page reference extraction.
 */
export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<ExtractionResult> {
  // Dynamic import of the legacy build avoids bundling issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    verbosity: 0,
  }).promise;

  const pages: ExtractedPage[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();

    // Build text preserving line structure via Y-position changes
    let lastY: number | null = null;
    let text = "";

    for (const item of textContent.items) {
      if (!("str" in item)) continue;
      const y = (item as { transform: number[] }).transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        text += "\n";
      } else if (text.length > 0 && !text.endsWith("\n")) {
        text += " ";
      }
      text += (item as { str: string }).str;
      lastY = y;
    }

    pages.push({ pageNumber: i, text: text.trim() });
  }

  // Build fullText with [Stranica X] markers prepended to each page
  const fullText = pages
    .map((p) => `[Stranica ${p.pageNumber}]\n${p.text}`)
    .join("\n\n");

  doc.destroy();

  return {
    pages,
    fullText,
    pageCount: doc.numPages,
  };
}

/**
 * Extract text from a DOCX buffer using mammoth.
 */
export async function extractTextFromDOCX(buffer: ArrayBuffer): Promise<ExtractionResult> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  const text = result.value.trim();

  return {
    pages: [{ pageNumber: 1, text }],
    fullText: text,
    pageCount: 1,
  };
}

/**
 * Extract text from a file based on its content type.
 */
export async function extractText(
  buffer: ArrayBuffer,
  contentType: string,
  fileName: string,
): Promise<ExtractionResult> {
  const lowerName = fileName.toLowerCase();

  if (contentType === "application/pdf" || lowerName.endsWith(".pdf")) {
    return extractTextFromPDF(buffer);
  }

  if (
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    return extractTextFromDOCX(buffer);
  }

  if (contentType === "application/msword" || lowerName.endsWith(".doc")) {
    try {
      return await extractTextFromDOCX(buffer);
    } catch {
      throw new Error(
        "Stari .doc format nije podržan. Molimo konvertujte dokument u .docx ili .pdf format.",
      );
    }
  }

  throw new Error(
    `Nepodržan format dokumenta: ${contentType}. Podržani formati su PDF i DOCX.`,
  );
}
