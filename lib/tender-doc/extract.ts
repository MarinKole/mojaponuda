// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

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
 * Extract text from a PDF buffer using pdf-parse (Node.js native, no worker needed).
 * Adds [Stranica X] markers per page for AI page reference extraction.
 */
export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<ExtractionResult> {
  const pages: ExtractedPage[] = [];
  let pageIndex = 0;

  const data = await pdfParse(Buffer.from(buffer), {
    // Custom page renderer to capture per-page text with markers
    pagerender: async function (pageData: { getTextContent: () => Promise<{ items: Array<{ str?: string }> }> }) {
      pageIndex++;
      const textContent = await pageData.getTextContent();
      const text = textContent.items
        .map((item) => item.str || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      pages.push({ pageNumber: pageIndex, text });
      return `[Stranica ${pageIndex}]\n${text}`;
    },
  });

  return {
    pages,
    fullText: data.text,
    pageCount: data.numpages,
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
