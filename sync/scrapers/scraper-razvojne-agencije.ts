/**
 * Scraper: SERDA, REDAH, NERDA, ZEDA razvojne agencije
 * Legal: Publicly available government/agency websites.
 *
 * SERDA - Razvojna agencija Sarajevskog kantona: https://www.serda.ba
 * REDAH - Razvojna agencija za Hercegovinu: https://www.redah.ba
 * NERDA - Sjevernoistočna razvojna agencija (Tuzla): https://www.nerda.ba
 * ZEDA - Zeničko-dobojska razvojna agencija: https://www.zeda.ba
 */

import { fetchHtml, extractLinks, extractLinksWithText, stripTags, cleanHtml, parseDate, parseValue, extractBestDescription } from "./fetch-html";
import type { ScrapedOpportunity, ScraperResult } from "./types";

interface AgencyConfig {
  name: string;
  baseUrl: string;
  grantsPath: string;
  location: string;
  linkPattern: RegExp;
}

const AGENCIES: AgencyConfig[] = [
  {
    name: "SERDA - Razvojna agencija Sarajevskog kantona",
    baseUrl: "https://www.serda.ba",
    grantsPath: "/javni-pozivi",
    location: "Kanton Sarajevo",
    linkPattern: /poziv|grant|subvencij/i,
  },
  {
    name: "REDAH - Razvojna agencija za Hercegovinu",
    baseUrl: "https://www.redah.ba",
    grantsPath: "/javni-pozivi",
    location: "Hercegovina",
    linkPattern: /poziv|grant|subvencij/i,
  },
  {
    name: "NERDA - Sjeveroistočna razvojna agencija",
    baseUrl: "https://www.nerda.ba",
    grantsPath: "/javni-pozivi-i-konkursi",
    location: "Tuzlanski Kanton",
    linkPattern: /poziv|konkurs|grant|poticaj/i,
  },
  {
    name: "ZEDA - Zeničko-dobojska razvojna agencija",
    baseUrl: "https://www.zeda.ba",
    grantsPath: "/javni-pozivi",
    location: "Zeničko-dobojski Kanton",
    linkPattern: /poziv|konkurs|grant|poticaj/i,
  },
];

/** Map registry sourceId → agency name */
const SOURCE_ID_MAP: Record<string, string> = {
  "serda": "SERDA - Razvojna agencija Sarajevskog kantona",
  "redah": "REDAH - Razvojna agencija za Hercegovinu",
  "nerda": "NERDA - Sjeveroistočna razvojna agencija",
  "zeda": "ZEDA - Zeničko-dobojska razvojna agencija",
};

/** Scrape a SINGLE agency by registry sourceId */
export async function scrapeSingleAgency(sourceId: string): Promise<ScraperResult> {
  const agencyName = SOURCE_ID_MAP[sourceId];
  const agency = AGENCIES.find((a) => a.name === agencyName);
  if (!agency) {
    return { source: sourceId, items: [], error: `Unknown agency sourceId: ${sourceId}` };
  }
  return scrapeAgency(agency);
}

export async function scrapeRazvojneAgencije(): Promise<ScraperResult[]> {
  const results: ScraperResult[] = [];

  for (const agency of AGENCIES) {
    const result = await scrapeAgency(agency);
    results.push(result);
  }

  return results;
}

async function scrapeAgency(agency: AgencyConfig): Promise<ScraperResult> {
  const items: ScrapedOpportunity[] = [];
  const source = new URL(agency.baseUrl).hostname;

  try {
    const url = `${agency.baseUrl}${agency.grantsPath}`;
    const html = await fetchHtml(url);
    if (!html) return { source, items: [], error: "Stranica nedostupna" };

    let links = extractLinks(html, agency.baseUrl, agency.linkPattern);
    if (links.length === 0) {
      links = extractLinksWithText(html, agency.baseUrl, agency.linkPattern);
    }
    links = links.slice(0, 15);

    for (const link of links) {
      try {
        const pageHtml = await fetchHtml(link);
        if (!pageHtml) continue;

        const title = extractTitle(pageHtml);
        if (!title || title.length < 10) continue;

        items.push({
          external_id: `${source}:${Buffer.from(link).toString("base64").slice(0, 32)}`,
          title,
          issuer: agency.name,
          category: "Poticaji i grantovi",
          description: extractDescription(pageHtml) ?? extractBestDescription(pageHtml),
          requirements: null,
          value: extractValue(pageHtml),
          deadline: extractDeadline(pageHtml),
          location: agency.location,
          source_url: link,
          eligibility_signals: [],
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

function extractTitle(html: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]).slice(0, 200);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? stripTags(title[1]).replace(/\s*[-|].*$/, "").trim().slice(0, 200) : "";
}

function extractDescription(html: string): string | null {
  const clean = cleanHtml(html);
  const content = clean.match(/<(?:div|article)[^>]*class="[^"]*(?:content|entry|post)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article)>/i);
  if (content) {
    const text = stripTags(content[1]).slice(0, 1000);
    if (text.length > 80) return text;
  }
  return null;
}

function extractValue(html: string): number | null {
  const match = html.match(/(\d[\d.,\s]*)\s*(?:KM|EUR|BAM)/i);
  return match ? parseValue(match[1]) : null;
}

function extractDeadline(html: string): string | null {
  const match = html.match(/rok[^:]*:\s*([^<\n]+)/i);
  return match ? parseDate(match[1]) : null;
}
