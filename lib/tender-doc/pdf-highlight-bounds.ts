import { normalizeForMatch } from "@/lib/tender-doc/text-normalize";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Približno pozicioniranje istaknutog odlomka na PDF stranici (0–1 koordinate, ishodište gore-lijevo).
 */
export async function computePdfHighlightRegionsNormalized(
  buffer: Buffer,
  pageNumber: number,
  quote: string
): Promise<Array<{ x: number; y: number; width: number; height: number }> | null> {
  const { getDocument, Util } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  if (pageNumber < 1 || pageNumber > pdf.numPages) {
    return null;
  }
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();
  const parts: string[] = [];
  const bounds: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];

  for (const item of textContent.items) {
    if (!("str" in item) || typeof item.str !== "string" || !item.str) continue;
    const m = Util.transform(viewport.transform, item.transform);
    const x = m[4];
    const y = m[5];
    const w = item.width * viewport.scale;
    const h = Math.abs(item.height * viewport.scale) || Math.abs(m[3]) * 0.8;
    const x0 = x;
    const yTop = viewport.height - y - h;
    const x1 = x0 + w;
    const y1 = yTop + h;
    parts.push(item.str);
    bounds.push({ x0, y0: yTop, x1, y1 });
  }

  const full = parts.join("");
  const normFull = normalizeForMatch(full);
  const normQuote = normalizeForMatch(quote);
  if (normQuote.length < 8 || !normFull.includes(normQuote)) {
    return null;
  }

  // Map normalized indices to raw string indices (approximate via sliding window)
  const windowSize = Math.min(normQuote.length + 20, normFull.length);
  let startIdx = -1;
  for (let i = 0; i <= normFull.length - normQuote.length; i++) {
    if (normFull.slice(i, i + normQuote.length) === normQuote) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) {
    return null;
  }
  const endIdx = startIdx + normQuote.length;

  const charToItem: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    const s = parts[i] ?? "";
    for (let c = 0; c < s.length; c++) {
      charToItem.push(i);
    }
  }

  if (!charToItem.length) {
    return null;
  }

  const rawStart = Math.min(startIdx, charToItem.length - 1);
  const rawEnd = Math.min(endIdx - 1, charToItem.length - 1);
  const startItem = charToItem[rawStart] ?? 0;
  const endItem = charToItem[rawEnd] ?? startItem;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let k = startItem; k <= endItem; k++) {
    const b = bounds[k];
    if (!b) continue;
    minX = Math.min(minX, b.x0);
    minY = Math.min(minY, b.y0);
    maxX = Math.max(maxX, b.x1);
    maxY = Math.max(maxY, b.y1);
  }
  if (!Number.isFinite(minX)) {
    return null;
  }

  const vw = viewport.width || 1;
  const vh = viewport.height || 1;
  const pad = 4;
  return [
    {
      x: clamp01((minX - pad) / vw),
      y: clamp01((minY - pad) / vh),
      width: clamp01((maxX - minX + pad * 2) / vw),
      height: clamp01((maxY - minY + pad * 2) / vh),
    },
  ];
}
