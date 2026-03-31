/**
 * Scraper: Zakon o javnim nabavkama BiH + izmjene + vijesti
 * Sources:
 *   - Agencija za javne nabavke BiH: https://www.javnenabavke.gov.ba
 *   - Službeni glasnik FBiH: http://www.sluzbenenovine.ba
 *   - Parlament BiH: https://www.parlament.ba
 *   - Vijeće ministara BiH: https://www.vijeceministara.gov.ba
 * Legal: Official government sources, publicly available.
 */

import { fetchHtml, extractLinks, extractLinksWithText, stripTags, parseDate } from "./fetch-html";

export interface ScrapedLegalUpdate {
  external_id: string;
  type: "zakon" | "izmjena" | "vijest";
  title: string;
  summary: string | null;
  source: string;
  source_url: string;
  published_date: string | null;
  relevance_tags: string[];
}

export interface LegalScraperResult {
  source: string;
  items: ScrapedLegalUpdate[];
  error?: string;
}

const AJN_BASE = "https://www.javnenabavke.gov.ba";
const AJN_NEWS_URL = `${AJN_BASE}/bs/novosti`;
const AJN_LAWS_URL = `${AJN_BASE}/bs/zakonodavstvo`;
// Fallback URLs in case /bs/ prefix causes 404
const AJN_LAWS_FALLBACKS = [
  `${AJN_BASE}/legislation`,
  `${AJN_BASE}/bs/legislation`,
  `${AJN_BASE}/zakonodavstvo`,
];
const AJN_NEWS_FALLBACKS = [
  `${AJN_BASE}/news`,
  `${AJN_BASE}/bs/news`,
];
const GLASNIK_BASE = "http://www.sluzbenenovine.ba";
const PARLAMENT_BASE = "https://www.parlament.ba";
const VIJECE_BASE = "https://www.vijeceministara.gov.ba";

/** Scrape a SINGLE legal source by registry sourceId */
export async function scrapeSingleLegalSource(sourceId: string): Promise<LegalScraperResult> {
  switch (sourceId) {
    case "ajn-news": return scrapeAjnNews();
    case "ajn-laws": return scrapeAjnLaws();
    case "glasnik-fbih": return scrapeSluzbenGlasnik();
    case "parlament-bih": return scrapeParlament();
    case "vijece-ministara": return scrapeVijeceMinistara();
    default: return { source: sourceId, items: [], error: `Unknown legal sourceId: ${sourceId}` };
  }
}

export async function scrapeLegalUpdates(): Promise<LegalScraperResult[]> {
  const results = await Promise.allSettled([
    scrapeAjnNews(),
    scrapeAjnLaws(),
    scrapeSluzbenGlasnik(),
    scrapeParlament(),
    scrapeVijeceMinistara(),
  ]);

  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { source: "unknown", items: [], error: String(r.reason) }
  );
}

/**
 * Seed entries: The base Zakon o javnim nabavkama BiH and known amendments.
 * These are always returned so they get inserted on first run.
 * Subsequent runs skip them via external_id deduplication.
 */
const SEED_LAWS: ScrapedLegalUpdate[] = [
  {
    external_id: "zjn-bih-39-14",
    type: "zakon",
    title: "Zakon o javnim nabavkama BiH (Službeni glasnik BiH, br. 39/14)",
    summary: "Osnovni zakon koji regulira postupke javnih nabavki u Bosni i Hercegovini. Primjenjuje se na sve ugovorne organe na državnom, entitetskom, kantonalnom i općinskom nivou.",
    source: "Agencija za javne nabavke BiH",
    source_url: "https://www.javnenabavke.gov.ba/legislation",
    published_date: "2014-05-19",
    relevance_tags: ["zakon", "javne-nabavke", "osnovni-zakon"],
  },
  {
    external_id: "zjn-bih-izmjena-59-22",
    type: "izmjena",
    title: "Zakon o izmjenama i dopunama Zakona o javnim nabavkama (Službeni glasnik BiH, br. 59/22)",
    summary: "Izmjene i dopune Zakona o javnim nabavkama iz 2022. godine. Donosi promjene u postupcima nabavki i pragovima.",
    source: "Agencija za javne nabavke BiH",
    source_url: "https://www.javnenabavke.gov.ba/legislation",
    published_date: "2022-09-09",
    relevance_tags: ["izmjena", "javne-nabavke", "zakon"],
  },
  {
    external_id: "zjn-bih-pravilnik-90-14",
    type: "zakon",
    title: "Pravilnik o postupku dodjele ugovora o javnim nabavkama (Službeni glasnik BiH, br. 90/14)",
    summary: "Podzakonski akt koji detaljno regulira postupke dodjele ugovora, uključujući otvoreni, ograničeni, pregovarački postupak i konkurentski zahtjev za dostavljanje ponuda.",
    source: "Agencija za javne nabavke BiH",
    source_url: "https://www.javnenabavke.gov.ba/legislation",
    published_date: "2014-11-10",
    relevance_tags: ["pravilnik", "javne-nabavke", "postupak"],
  },
  {
    external_id: "zjn-bih-uputstvo-zalbe",
    type: "zakon",
    title: "Uputstvo o načinu vođenja postupka žalbe (Službeni glasnik BiH, br. 90/14)",
    summary: "Regulira postupak žalbe u vezi sa postupcima javnih nabavki pred Uredom za razmatranje žalbi BiH.",
    source: "Agencija za javne nabavke BiH",
    source_url: "https://www.javnenabavke.gov.ba/legislation",
    published_date: "2014-11-10",
    relevance_tags: ["uputstvo", "javne-nabavke", "žalba"],
  },
];

async function scrapeAjnNews(): Promise<LegalScraperResult> {
  const items: ScrapedLegalUpdate[] = [];
  const source = "javnenabavke.gov.ba";

  try {
    const html = await fetchHtml(AJN_NEWS_URL);
    if (!html) return { source, items: [], error: "Nedostupno" };

    // Try URL pattern first, then anchor text matching
    let links = extractLinks(html, AJN_BASE, /novost|vijest|obavijest/i).slice(0, 10);
    if (links.length === 0) {
      links = extractLinksWithText(html, AJN_BASE, /novost|vijest|obavijest|nabavk|zakon/i).slice(0, 10);
    }

    for (const link of links) {
      try {
        const pageHtml = await fetchHtml(link);
        if (!pageHtml) continue;

        const title = extractTitle(pageHtml);
        if (!title || title.length < 10) continue;

        const dateMatch = pageHtml.match(/(\d{1,2}[./]\d{1,2}[./]\d{4})/);
        const published_date = dateMatch ? parseDate(dateMatch[1]) : null;

        // Only include if recent (within 180 days)
        if (published_date) {
          const age = Date.now() - new Date(published_date).getTime();
          if (age > 180 * 24 * 60 * 60 * 1000) continue;
        }

        items.push({
          external_id: `ajn-news:${Buffer.from(link).toString("base64").slice(0, 32)}`,
          type: "vijest",
          title,
          summary: extractSummary(pageHtml),
          source: "Agencija za javne nabavke BiH",
          source_url: link,
          published_date,
          relevance_tags: extractTags(title + " " + (extractSummary(pageHtml) ?? "")),
        });
      } catch {
        // skip
      }
    }
  } catch (err) {
    return { source, items, error: String(err) };
  }

  return { source, items };
}

async function scrapeAjnLaws(): Promise<LegalScraperResult> {
  const source = "javnenabavke.gov.ba/zakonodavstvo";
  // Always include seed laws (deduplication happens at DB level via external_id)
  const items: ScrapedLegalUpdate[] = [...SEED_LAWS];

  try {
    const html = await fetchHtml(AJN_LAWS_URL);
    if (!html) return { source, items, error: "Stranica nedostupna, ali sjeme zakona je uključeno" };

    // Try URL pattern first, then anchor text matching
    let links = extractLinks(html, AJN_BASE, /zakon|pravilnik|uputstvo|odluka/i).slice(0, 15);
    if (links.length === 0) {
      links = extractLinksWithText(html, AJN_BASE, /zakon|pravilnik|uputstvo|odluka|nabavk|izmjen/i).slice(0, 15);
    }

    for (const link of links) {
      try {
        const pageHtml = await fetchHtml(link);
        if (!pageHtml) continue;

        const title = extractTitle(pageHtml);
        if (!title || title.length < 10) continue;

        const type = /izmjena|dopuna|amandman|novelacija|revizija/i.test(title) ? "izmjena" : "zakon";

        const dateMatch = pageHtml.match(/(\d{1,2}[./]\d{1,2}[./]\d{4})/);
        const published_date = dateMatch ? parseDate(dateMatch[1]) : null;

        items.push({
          external_id: `ajn-law:${Buffer.from(link).toString("base64").slice(0, 32)}`,
          type,
          title,
          summary: extractSummary(pageHtml),
          source: "Agencija za javne nabavke BiH",
          source_url: link,
          published_date,
          relevance_tags: extractTags(title + " " + (extractSummary(pageHtml) ?? "")),
        });
      } catch {
        // skip
      }
    }
  } catch (err) {
    return { source, items, error: String(err) };
  }

  return { source, items };
}

async function scrapeSluzbenGlasnik(): Promise<LegalScraperResult> {
  const items: ScrapedLegalUpdate[] = [];
  const source = "sluzbenenovine.ba";

  try {
    const html = await fetchHtml(GLASNIK_BASE);
    if (!html) return { source, items: [], error: "Nedostupno" };

    // Extract links to recent gazette issues
    const links = extractLinks(html, GLASNIK_BASE, /glasnik|broj|izdanje/i).slice(0, 15);

    for (const link of links) {
      try {
        const pageHtml = await fetchHtml(link);
        if (!pageHtml) continue;

        // Look for procurement-related laws
        const procurementMatches = pageHtml.matchAll(
          /<(?:h[2-4]|div|p)[^>]*>([\s\S]*?(?:javne?\s+nabavk|nabavk|tender|konkurs|poticaj|grant)[\s\S]*?)<\/(?:h[2-4]|div|p)>/gi
        );

        for (const match of procurementMatches) {
          const text = stripTags(match[1]);
          if (text.length < 20) continue;

          // Extract law number if present
          const lawNumberMatch = text.match(/(?:broj|br\.?)\s*(\d+\/\d+)/i);
          const lawNumber = lawNumberMatch ? lawNumberMatch[1] : "";

          const title = text.slice(0, 200);
          const type = /izmjena|dopuna|amandman/i.test(title) ? "izmjena" : "zakon";

          // Try to extract date from page
          const dateMatch = pageHtml.match(/(\d{1,2}[./]\d{1,2}[./]\d{4})/);
          const published_date = dateMatch ? parseDate(dateMatch[1]) : null;

          items.push({
            external_id: `glasnik:${lawNumber || Buffer.from(link + text).toString("base64").slice(0, 32)}`,
            type,
            title: lawNumber ? `${lawNumber} - ${title}` : title,
            summary: extractSummary(pageHtml),
            source: "Službeni glasnik FBiH",
            source_url: link,
            published_date,
            relevance_tags: extractTags(title),
          });

          // Limit to avoid too many items from one page
          if (items.length >= 10) break;
        }

        if (items.length >= 10) break;
      } catch {
        // skip
      }
    }
  } catch (err) {
    return { source, items, error: String(err) };
  }

  return { source, items };
}

async function scrapeParlament(): Promise<LegalScraperResult> {
  const items: ScrapedLegalUpdate[] = [];
  const source = "parlament.ba";

  try {
    const html = await fetchHtml(PARLAMENT_BASE);
    if (!html) return { source, items: [], error: "Nedostupno" };

    // Try URL pattern first, then anchor text matching
    let links = extractLinks(html, PARLAMENT_BASE, /zakon|prijedlog|amandman|izmjena/i).slice(0, 15);
    if (links.length === 0) {
      links = extractLinksWithText(html, PARLAMENT_BASE, /zakon|prijedlog|amandman|izmjena|nabavk|privred/i).slice(0, 15);
    }

    for (const link of links) {
      try {
        const pageHtml = await fetchHtml(link);
        if (!pageHtml) continue;

        const title = extractTitle(pageHtml);
        if (!title || title.length < 20) continue;

        // Focus on public procurement and business-related legislation
        if (!/nabavk|tender|privred|ekonom|poticaj|grant|konkurs/i.test(title)) continue;

        const type = /izmjena|dopuna|amandman/i.test(title) ? "izmjena" : "zakon";

        const dateMatch = pageHtml.match(/(\d{1,2}[./]\d{1,2}[./]\d{4})/);
        const published_date = dateMatch ? parseDate(dateMatch[1]) : null;

        items.push({
          external_id: `parlament:${Buffer.from(link).toString("base64").slice(0, 32)}`,
          type,
          title,
          summary: extractSummary(pageHtml),
          source: "Parlament BiH",
          source_url: link,
          published_date,
          relevance_tags: extractTags(title),
        });

        if (items.length >= 10) break;
      } catch {
        // skip
      }
    }
  } catch (err) {
    return { source, items, error: String(err) };
  }

  return { source, items };
}

async function scrapeVijeceMinistara(): Promise<LegalScraperResult> {
  const items: ScrapedLegalUpdate[] = [];
  const source = "vijeceministara.gov.ba";

  try {
    const html = await fetchHtml(VIJECE_BASE);
    if (!html) return { source, items: [], error: "Nedostupno" };

    // Try URL pattern first, then anchor text matching
    let links = extractLinks(html, VIJECE_BASE, /odluka|uredba|zaključak|regulativ/i).slice(0, 15);
    if (links.length === 0) {
      links = extractLinksWithText(html, VIJECE_BASE, /odluka|uredba|zaključak|nabavk|privred|ekonom|razvoj/i).slice(0, 15);
    }

    for (const link of links) {
      try {
        const pageHtml = await fetchHtml(link);
        if (!pageHtml) continue;

        const title = extractTitle(pageHtml);
        if (!title || title.length < 20) continue;

        // Focus on economic and procurement-related decisions
        if (!/nabavk|ekonom|privred|poticaj|grant|razvoj|investicij/i.test(title)) continue;

        const type = /izmjena|dopuna/i.test(title) ? "izmjena" : "zakon";

        const dateMatch = pageHtml.match(/(\d{1,2}[./]\d{1,2}[./]\d{4})/);
        const published_date = dateMatch ? parseDate(dateMatch[1]) : null;

        items.push({
          external_id: `vijece:${Buffer.from(link).toString("base64").slice(0, 32)}`,
          type,
          title,
          summary: extractSummary(pageHtml),
          source: "Vijeće ministara BiH",
          source_url: link,
          published_date,
          relevance_tags: extractTags(title),
        });

        if (items.length >= 10) break;
      } catch {
        // skip
      }
    }
  } catch (err) {
    return { source, items, error: String(err) };
  }

  return { source, items };
}

function extractTitle(html: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]).slice(0, 200);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? stripTags(title[1]).replace(/\s*[-|].*$/, "").trim().slice(0, 200) : "";
}

function extractSummary(html: string): string | null {
  const p = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (p) return stripTags(p[1]).slice(0, 400);
  return null;
}

function extractTags(text: string): string[] {
  const tags: string[] = [];
  if (/nabavk/i.test(text)) tags.push("javne-nabavke");
  if (/pravilnik/i.test(text)) tags.push("pravilnik");
  if (/zakon/i.test(text)) tags.push("zakon");
  if (/izmjena|dopuna|amandman|novelacija|revizija/i.test(text)) tags.push("izmjena");
  if (/tender|postupak/i.test(text)) tags.push("postupak");
  if (/žalba|prigovor/i.test(text)) tags.push("žalba");
  if (/ugovor|contract/i.test(text)) tags.push("ugovor");
  if (/odluka|decision/i.test(text)) tags.push("odluka");
  if (/uredba|regulation/i.test(text)) tags.push("uredba");
  if (/poticaj|grant|subvencij/i.test(text)) tags.push("poticaj");
  if (/ekonom|privred/i.test(text)) tags.push("ekonomija");
  if (/razvoj|development/i.test(text)) tags.push("razvoj");
  return tags;
}
