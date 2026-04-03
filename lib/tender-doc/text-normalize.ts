export function normalizeForMatch(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function quoteMatchesPage(quote: string, pageText: string): boolean {
  const q = normalizeForMatch(quote);
  const p = normalizeForMatch(pageText);
  return q.length >= 12 && p.includes(q);
}
