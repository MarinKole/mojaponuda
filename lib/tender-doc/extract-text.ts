import AdmZip from "adm-zip";
import mammoth from "mammoth";

export type ExtractedPage = {
  pageNumber: number;
  text: string;
};

async function extractPdfPages(buffer: Buffer): Promise<ExtractedPage[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  const pages: ExtractedPage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const strings = textContent.items
      .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
      .filter(Boolean);
    const text = strings.join(" ").replace(/\s+/g, " ").trim();
    pages.push({ pageNumber: i, text });
  }

  return pages;
}

async function extractDocxPages(buffer: Buffer): Promise<ExtractedPage[]> {
  const { value } = await mammoth.extractRawText({ buffer });
  const text = value.replace(/\s+/g, " ").trim();
  return [{ pageNumber: 1, text }];
}

function isPdfMime(mime: string, name: string): boolean {
  return mime.includes("pdf") || name.toLowerCase().endsWith(".pdf");
}

function isDocxMime(mime: string, name: string): boolean {
  return (
    mime.includes("wordprocessingml") ||
    mime.includes("officedocument") ||
    name.toLowerCase().endsWith(".docx")
  );
}

function isZipMime(mime: string, name: string): boolean {
  return mime.includes("zip") || name.toLowerCase().endsWith(".zip");
}

export type ExtractedBundle = {
  pages: ExtractedPage[];
  labelsByPage?: Map<number, string>;
};

export async function extractDocumentText(params: {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}): Promise<ExtractedBundle> {
  const { buffer, mimeType, filename } = params;
  const mime = (mimeType || "").toLowerCase();
  const name = filename || "";

  if (isZipMime(mime, name)) {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries().filter((e) => !e.isDirectory);
    const pages: ExtractedPage[] = [];
    let pageOffset = 0;

    for (const entry of entries) {
      const entryName = entry.entryName.toLowerCase();
      const data = entry.getData();
      if (entryName.endsWith(".pdf")) {
        const part = await extractPdfPages(data);
        for (const p of part) {
          pages.push({
            pageNumber: pageOffset + p.pageNumber,
            text: `[${entry.entryName}, str. ${p.pageNumber}]\n${p.text}`,
          });
        }
        pageOffset += part.length;
      } else if (entryName.endsWith(".docx")) {
        const part = await extractDocxPages(data);
        pageOffset += 1;
        pages.push({
          pageNumber: pageOffset,
          text: `[${entry.entryName}]\n${part[0]?.text ?? ""}`,
        });
      }
    }

    if (!pages.length) {
      throw new Error(
        "ZIP ne sadrži podržane datoteke (PDF ili DOCX). Raspakirajte ili dodajte PDF/DOCX."
      );
    }

    return { pages };
  }

  if (isPdfMime(mime, name)) {
    return { pages: await extractPdfPages(buffer) };
  }

  if (isDocxMime(mime, name)) {
    return { pages: await extractDocxPages(buffer) };
  }

  if (mime.includes("msword") || name.toLowerCase().endsWith(".doc")) {
    throw new Error(
      "Stari format .doc nije podržan. Sačuvajte dokument kao PDF ili DOCX pa ga ponovo učitajte."
    );
  }

  throw new Error("Podržani formati: PDF, DOCX ili ZIP s PDF/DOCX datotekama.");
}

export function buildPageTextForPrompt(pages: ExtractedPage[], maxChars = 140_000): string {
  const chunks: string[] = [];
  let total = 0;
  for (const { pageNumber, text } of pages) {
    const block = `--- STRANICA ${pageNumber} ---\n${text}\n`;
    if (total + block.length > maxChars) {
      chunks.push(
        "\n[... ostatak dokumenta izostavljen zbog veličine; koristi samo gore navedene stranice za zaključke ...]\n"
      );
      break;
    }
    chunks.push(block);
    total += block.length;
  }
  return chunks.join("\n");
}
