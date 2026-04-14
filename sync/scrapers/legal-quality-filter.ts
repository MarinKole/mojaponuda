export interface LegalUpdateLike {
  type: "zakon" | "izmjena" | "vijest";
  title: string;
  summary: string | null;
  source: string;
  source_url: string;
}

export interface LegalQualityFilterResult {
  passed: boolean;
  reason?: string;
}

export interface LegalFilterBatchResult<T> {
  filtered: T[];
  rejected: Array<{ item: T; reason: string }>;
}

const UI_CHROME_PHRASES = [
  "jezik bosanski hrvatski srpski",
  "sluzbena glasila",
  "sluzbeni glasnik bih",
  "sluzbeni dio",
  "oglasni dio",
  "detaljniji odabir",
  "sluzbene novine federacije bih",
];

const TITLE_GARBAGE_PATTERNS = [
  /^jezik\b/i,
  /^sluzbena glasila\b/i,
  /^sluzbeni dio\b/i,
  /^oglasni dio\b/i,
  /^detaljniji odabir\b/i,
  /^naslovna\b/i,
  /^pretraga\b/i,
];

const BOOK_AND_AD_PATTERNS = [
  /\bpravosudnog ispita\b/i,
  /\bizmijenjeno i dopunjeno izdanje\b/i,
  /\bizdanje\b/i,
  /\budzbenik\b/i,
  /\bknjiga\b/i,
  /\bautor\b/i,
];

const PROCUREMENT_SIGNAL_PATTERN =
  /\bjavn[a-z]*\s+nabavk[a-z]*\b|\bnabavk[a-z]*\b|\bugovorn[a-z]*\s+organ[a-z]*\b|\bugovor[a-z]*\b|\bponud[a-z]*\b|\bzalb[a-z]*\b|\btender[a-z]*\b|\bejn\b/i;

const LEGAL_FORM_PATTERN =
  /\bzakon[a-z]*\b|\bpravilnik[a-z]*\b|\buputstv[a-z]*\b|\buredb[a-z]*\b|\bodluk[a-z]*\b|\bizmjen[a-z]*\b|\bdopun[a-z]*\b|\bamandman[a-z]*\b|\bsmjernic[a-z]*\b/i;

function normalizeForMatch(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function countMeaningfulWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((word) => word.length >= 3)
    .length;
}

function countUiChromeMatches(text: string): number {
  return UI_CHROME_PHRASES.reduce(
    (total, phrase) => total + (text.includes(phrase) ? 1 : 0),
    0
  );
}

function looksLikeUiChrome(text: string): boolean {
  if (!text) {
    return false;
  }

  if (TITLE_GARBAGE_PATTERNS.some((pattern) => pattern.test(text))) {
    return true;
  }

  return countUiChromeMatches(text) >= 2;
}

function looksLikeBookOrAd(text: string): boolean {
  if (!text) {
    return false;
  }

  if (BOOK_AND_AD_PATTERNS.some((pattern) => pattern.test(text))) {
    return true;
  }

  return /\b[a-z]+ [a-z]+:\b/i.test(text) && /\bizdanje\b/i.test(text);
}

export function applyLegalUpdateQualityFilter(
  item: LegalUpdateLike
): LegalQualityFilterResult {
  const normalizedTitle = normalizeForMatch(item.title);
  const normalizedSummary = normalizeForMatch(item.summary);
  const combinedText = `${normalizedTitle} ${normalizedSummary}`.trim();
  const hasProcurementSignal = PROCUREMENT_SIGNAL_PATTERN.test(combinedText);
  const hasLegalForm = LEGAL_FORM_PATTERN.test(combinedText);

  if (normalizedTitle.length < 16) {
    return { passed: false, reason: "Naslov je prekratak za pravnu objavu." };
  }

  if (normalizedTitle.length > 240) {
    return { passed: false, reason: "Naslov je predug i liči na navigaciju ili spoj više blokova." };
  }

  if (countMeaningfulWords(normalizedTitle) < 4) {
    return { passed: false, reason: "Naslov nema dovoljno smislenih riječi." };
  }

  if (looksLikeUiChrome(normalizedTitle) || looksLikeUiChrome(combinedText)) {
    return { passed: false, reason: "Tekst liči na navigaciju ili chrome sa stranice izvora." };
  }

  if (looksLikeBookOrAd(normalizedTitle) || looksLikeBookOrAd(normalizedSummary)) {
    return { passed: false, reason: "Tekst liči na oglas, knjigu ili drugi nerelevantan sadržaj." };
  }

  if (!hasProcurementSignal) {
    return { passed: false, reason: "Objava nema jasan signal da se odnosi na javne nabavke." };
  }

  if (item.type !== "vijest" && !hasLegalForm) {
    return { passed: false, reason: "Objava nema jasan pravni oblik poput zakona, pravilnika ili izmjene." };
  }

  return { passed: true };
}

export function filterLegalUpdates<T extends LegalUpdateLike>(
  items: T[]
): LegalFilterBatchResult<T> {
  const filtered: T[] = [];
  const rejected: Array<{ item: T; reason: string }> = [];

  for (const item of items) {
    const verdict = applyLegalUpdateQualityFilter(item);

    if (verdict.passed) {
      filtered.push(item);
      continue;
    }

    rejected.push({
      item,
      reason: verdict.reason ?? "Objava nije prošla provjeru kvaliteta.",
    });
  }

  return { filtered, rejected };
}
