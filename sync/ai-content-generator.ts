import "server-only";
import { getOpenAIClient } from "@/lib/openai";

export interface OpportunityAiContent {
  seo_title: string;
  seo_description: string;
  ai_summary: string;
  ai_who_should_apply: string;
  ai_difficulty: "lako" | "srednje" | "tesko";
  ai_risks: string;
  ai_competition: string;
}

const SYSTEM_PROMPT = `Ti si stručnjak za javne nabavke i poslovne prilike u Bosni i Hercegovini.
Pišeš kratke, precizne i korisne analize za firme koje traže prilike.
Jezik: bosanski/hrvatski. Bez anglizama. Bez generičkih fraza.
Budi konkretan i informativan. Maksimalno 2-3 rečenice po polju.`;

/**
 * AI Review Gate: Checks if a scraped item is a legitimate business opportunity
 * before it gets published. This catches garbage that keyword filters miss.
 * 
 * Returns { approved: boolean, reason: string }
 */
export interface AiReviewResult {
  approved: boolean;
  reason: string;
}

export async function aiReviewOpportunity(
  title: string,
  issuer: string,
  description: string | null,
  requirements: string | null,
): Promise<AiReviewResult> {
  try {
    const openai = getOpenAIClient();

    const prompt = `Pregledaj ovaj podatak scraperan sa državne web stranice i odluči da li je to LEGITIMNA POSLOVNA PRILIKA (javni poziv, grant, poticaj, subvencija, konkurs) za firme/privrednike u Bosni i Hercegovini.

Naslov: ${title}
Institucija: ${issuer}
Opis: ${description?.slice(0, 400) ?? "nema"}
Uvjeti: ${requirements?.slice(0, 200) ?? "nema"}

ODBIJ ako je:
- Navigacijski element web stranice (meni, footer, breadcrumb, copyright)
- Osobna stvar (vozačka, instruktor vožnje, stručni ispit, lična licenca)
- Imenovanje/razrješenje/izbor članova odbora
- Obavijest koja NIJE javni poziv (vijest, press, saopštenje bez konkretnog poziva)
- Generički naslov bez sadržaja (samo ime ministarstva, "Javni poziv" bez detalja)
- Garbage/nonsens tekst scraperan greškom

ODOBRI ako je:
- Konkretan javni poziv za dodjelu sredstava firmama
- Grant ili poticaj za privrednike/poduzetnike/obrtnike
- Subvencija za zapošljavanje ili razvoj
- Konkurs za finansiranje projekata organizacija

Odgovori SAMO u JSON formatu:
{
  "approved": true/false,
  "reason": "kratko obrazloženje na bosanskom"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Ti si kontrolor kvalitete podataka za platformu javnih nabavki u BiH. Budi strog — bolje je propustiti legitimnu priliku nego objaviti smeće." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 150,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return { approved: true, reason: "AI review unavailable" };

    const parsed = JSON.parse(raw) as { approved: boolean; reason: string };
    return {
      approved: !!parsed.approved,
      reason: parsed.reason ?? "Bez obrazloženja",
    };
  } catch {
    // If AI review fails, allow through (fail open) but log it
    console.warn(`[AI Review] Failed for: ${title.slice(0, 50)}`);
    return { approved: true, reason: "AI review error — passed by default" };
  }
}

export async function generateOpportunityContent(
  title: string,
  issuer: string,
  description: string | null,
  requirements: string | null,
  value: number | null,
  deadline: string | null,
  type: "tender" | "poticaj"
): Promise<OpportunityAiContent | null> {
  try {
    const openai = getOpenAIClient();

    const valueStr = value ? `${(value / 1000).toFixed(0)}K KM` : "nije navedena";
    const deadlineStr = deadline ?? "nije naveden";
    const typeLabel = type === "tender" ? "javna nabavka" : "poticaj/grant";

    const prompt = `Analiziraj ovu poslovnu priliku i popuni sva polja.

Vrsta: ${typeLabel}
Naziv: ${title}
Naručilac/Institucija: ${issuer}
Vrijednost: ${valueStr}
Rok: ${deadlineStr}
Opis: ${description?.slice(0, 500) ?? "nije dostupan"}
Uvjeti: ${requirements?.slice(0, 300) ?? "nisu navedeni"}

Odgovori u JSON formatu:
{
  "seo_title": "SEO naslov do 60 znakova, konkretan",
  "seo_description": "Meta opis do 155 znakova, informativan",
  "ai_summary": "Kratki sažetak prilike u 2 rečenice",
  "ai_who_should_apply": "Koje firme trebaju aplicirati i zašto",
  "ai_difficulty": "lako|srednje|tesko",
  "ai_risks": "Glavni rizici i izazovi prijave",
  "ai_competition": "Procjena konkurencije i tržišne situacije"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as OpportunityAiContent;

    // Validate difficulty
    if (!["lako", "srednje", "tesko"].includes(parsed.ai_difficulty)) {
      parsed.ai_difficulty = "srednje";
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function generateLegalSummary(
  title: string,
  type: "zakon" | "izmjena" | "vijest",
  rawContent: string | null
): Promise<string | null> {
  if (!rawContent) return null;

  try {
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Napiši kratki sažetak (2-3 rečenice) ove pravne ${type === "vijest" ? "vijesti" : "izmjene"} za firme koje se bave javnim nabavkama:\n\nNaslov: ${title}\n\nSadržaj: ${rawContent.slice(0, 800)}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}
