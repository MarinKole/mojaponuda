import { NextResponse } from "next/server";
import {
  buildProfileCpvSeeds,
  buildProfileKeywordSeeds,
  derivePrimaryIndustry,
  getProfileOptionLabel,
  sanitizeSearchKeywords,
  type ParsedCompanyProfile,
} from "@/lib/company-profile";
import { getOpenAIClient } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";
import {
  buildRecommendationContext,
  scoreTenderRecommendation,
} from "@/lib/tender-recommendations";

export const maxDuration = 30;

interface PreviewTender {
  id: string;
  title: string;
  deadline: string | null;
  estimated_value: number | null;
  contracting_authority: string | null;
}

interface PreviewTenderCandidate {
  id: string;
  title: string;
  deadline: string | null;
  estimated_value: number | null;
  contracting_authority: string | null;
  contracting_authority_jib: string | null;
  contract_type: string | null;
  raw_description: string | null;
  cpv_code: string | null;
  authority_city?: string | null;
  authority_municipality?: string | null;
  authority_canton?: string | null;
  authority_entity?: string | null;
}

interface PreviewSignalResponse {
  keywords?: string[];
  cpv_codes?: string[];
}

const PREVIEW_SIGNAL_SYSTEM_PROMPT = `Ti si ekspert za javne nabavke u Bosni i Hercegovini.
Tvoj zadatak je da iz vrlo ranog onboarding unosa izvedeš sigurne i precizne pojmove za početni pregled tendera.

Vrati isključivo JSON objekat sa poljima:
- keywords: niz kratkih i preciznih pojmova koji se stvarno pojavljuju u tenderima
- cpv_codes: niz CPV kodova kada ima dovoljno osnova da ih predložiš

Pravila:
- Nemoj vraćati opšte onboarding kategorije ni njihove nazive.
- Nemoj vraćati preširoke riječi kao što su oprema, mreže, usluge, radovi, sistemi.
- Prednost daj konkretnim frazama robe, usluge ili radova.
- Smiješ dodati bliske sinonime i povezane pojmove samo ako su vjerovatni za isti profil.
- Ako input nije dovoljno jasan, vrati manji broj sigurnih i užih pojmova.
- Ne izmišljaj CPV kodove ako nema dovoljno signala.`;

function buildPreviewProfileSummary(profile: ParsedCompanyProfile, regions: string[]): string {
  const focusIndustry = derivePrimaryIndustry(profile.offeringCategories, profile.primaryIndustry);

  return [
    focusIndustry ? `Fokus firme: ${getProfileOptionLabel(focusIndustry)}` : null,
    profile.offeringCategories.length > 0
      ? `Ponuda firme: ${profile.offeringCategories.map((item) => getProfileOptionLabel(item)).join(", ")}`
      : null,
    profile.preferredTenderTypes.length > 0
      ? `Vrste tendera: ${profile.preferredTenderTypes
          .map((item) => getProfileOptionLabel(item))
          .join(", ")}`
      : null,
    regions.length > 0 ? `Regije rada: ${regions.join(", ")}` : "Regije rada: cijela Bosna i Hercegovina",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

async function mediatePreviewSignals(
  profile: ParsedCompanyProfile,
  regions: string[]
): Promise<{ keywords: string[]; cpvCodes: string[] }> {
  const keywordSeeds = buildProfileKeywordSeeds(profile);
  const cpvSeeds = buildProfileCpvSeeds(profile);

  if (!process.env.OPENAI_API_KEY) {
    return {
      keywords: keywordSeeds,
      cpvCodes: cpvSeeds,
    };
  }

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: PREVIEW_SIGNAL_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            "Rani onboarding profil:",
            buildPreviewProfileSummary(profile, regions),
            "",
            `Početni sigurni seed pojmovi: ${keywordSeeds.join(", ") || "nema"}`,
          ].join("\n"),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return {
        keywords: keywordSeeds,
        cpvCodes: cpvSeeds,
      };
    }

    const parsed = JSON.parse(content) as PreviewSignalResponse;
    const aiKeywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((item): item is string => typeof item === "string")
      : [];
    const aiCpvCodes = Array.isArray(parsed.cpv_codes)
      ? parsed.cpv_codes.filter((item): item is string => typeof item === "string")
      : [];

    return {
      keywords: sanitizeSearchKeywords([...keywordSeeds, ...aiKeywords]).slice(0, 18),
      cpvCodes: [...new Set([...cpvSeeds, ...aiCpvCodes.map((code) => code.trim())].filter((code) => code.length >= 5))].slice(0, 18),
    };
  } catch (error) {
    console.error("[PREVIEW] Signal mediation error:", error);
    return {
      keywords: keywordSeeds,
      cpvCodes: cpvSeeds,
    };
  }
}

function toPreviewTender(candidate: PreviewTenderCandidate): PreviewTender {
  return {
    id: candidate.id,
    title: candidate.title,
    deadline: candidate.deadline,
    estimated_value: candidate.estimated_value,
    contracting_authority: candidate.contracting_authority,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const nowIso = new Date().toISOString();
    const body = (await request.json()) as {
      offeringCategories?: unknown[];
      preferredTenderTypes?: unknown[];
      regions?: unknown[];
    };
    const offeringCategories = Array.isArray(body.offeringCategories)
      ? body.offeringCategories.filter((item: unknown): item is string => typeof item === "string")
      : [];
    const preferredTenderTypes = Array.isArray(body.preferredTenderTypes)
      ? body.preferredTenderTypes.filter((item: unknown): item is string => typeof item === "string")
      : [];
    const regions = Array.isArray(body.regions)
      ? body.regions.filter((item: unknown): item is string => typeof item === "string")
      : [];

    console.log("[PREVIEW] Input:", { offeringCategories, preferredTenderTypes, regions });

    const previewProfile: ParsedCompanyProfile = {
      primaryIndustry: derivePrimaryIndustry(offeringCategories, null),
      offeringCategories,
      preferredTenderTypes,
      companyDescription: null,
      legacyIndustryText: null,
    };

    const mediatedSignals = await mediatePreviewSignals(previewProfile, regions);
    console.log("[PREVIEW] Mediated signals:", {
      keywords: mediatedSignals.keywords,
      cpvCodes: mediatedSignals.cpvCodes,
    });

    const recommendationContext = buildRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: previewProfile.primaryIndustry,
        offeringCategories,
        preferredTenderTypes,
        companyDescription: null,
      }),
      keywords: mediatedSignals.keywords,
      cpv_codes: mediatedSignals.cpvCodes,
      operating_regions: regions,
    });

    console.log("[PREVIEW] Recommendation context:", {
      keywords: recommendationContext.keywords.length,
      cpvPrefixes: recommendationContext.cpvPrefixes,
      preferredContractTypes: recommendationContext.preferredContractTypes,
      regionTerms: recommendationContext.regionTerms.length,
      negativeSignals: recommendationContext.negativeSignals.length,
    });

    // ── Step 1: Always fetch a broad pool of ALL active tenders ──
    const [{ data: datedRows, error: datedError }, { data: undatedRows, error: undatedError }] =
      await Promise.all([
        supabase
          .from("tenders")
          .select(
            "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, raw_description, cpv_code"
          )
          .gt("deadline", nowIso)
          .order("deadline", { ascending: true, nullsFirst: false })
          .limit(600),
        supabase
          .from("tenders")
          .select(
            "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, raw_description, cpv_code"
          )
          .is("deadline", null)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

    console.log("[PREVIEW] Broad pool fetch:", {
      datedCount: datedRows?.length ?? 0,
      datedError: datedError?.message ?? null,
      undatedCount: undatedRows?.length ?? 0,
      undatedError: undatedError?.message ?? null,
    });

    const allPoolRows = [
      ...((datedRows ?? []) as PreviewTenderCandidate[]),
      ...((undatedRows ?? []) as PreviewTenderCandidate[]),
    ];

    if (allPoolRows.length === 0) {
      console.log("[PREVIEW] No tenders in database at all");
      return NextResponse.json({
        tenders: [],
        summary:
          "Trenutno nema aktivnih tendera u bazi. Podaci se automatski sinhronizuju sa e-Nabavke portala.",
      });
    }

    // ── Step 2: Enrich with authority geo data ──
    const authorityJibs = [
      ...new Set(
        allPoolRows
          .map((tender) => tender.contracting_authority_jib)
          .filter(Boolean) as string[]
      ),
    ];

    const { data: authorityRows } =
      authorityJibs.length > 0
        ? await supabase
            .from("contracting_authorities")
            .select("jib, city, municipality, canton, entity")
            .in("jib", authorityJibs.slice(0, 500))
        : { data: [] };

    const authorityMap = new Map(
      (authorityRows ?? []).map((authority) => [authority.jib, authority])
    );

    const enrichedPool: PreviewTenderCandidate[] = allPoolRows.map((tender) => {
      const authority = tender.contracting_authority_jib
        ? authorityMap.get(tender.contracting_authority_jib)
        : null;

      return {
        ...tender,
        authority_city: authority?.city ?? null,
        authority_municipality: authority?.municipality ?? null,
        authority_canton: authority?.canton ?? null,
        authority_entity: authority?.entity ?? null,
      };
    });

    console.log("[PREVIEW] Enriched pool size:", enrichedPool.length);

    // ── Step 3: Score every tender against the profile ──
    const scored = enrichedPool
      .map((candidate) => scoreTenderRecommendation(candidate, recommendationContext))
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return (
          new Date(a.tender.deadline ?? 0).getTime() -
          new Date(b.tender.deadline ?? 0).getTime()
        );
      });

    const qualified = scored.filter((item) => item.qualifies);
    const withAnyPositive = scored.filter(
      (item) =>
        item.score > 0 ||
        item.cpvMatch ||
        item.titleMatches.length > 0 ||
        item.matchedKeywords.length > 0
    );

    console.log("[PREVIEW] Scoring results:", {
      totalScored: scored.length,
      qualified: qualified.length,
      withAnyPositive: withAnyPositive.length,
      topScores: scored.slice(0, 5).map((item) => ({
        title: item.tender.title.slice(0, 60),
        score: item.score,
        qualifies: item.qualifies,
        cpvMatch: item.cpvMatch,
        contractMatch: item.contractMatch,
        regionMatch: item.regionMatch,
        keywords: item.matchedKeywords.length,
        titleMatches: item.titleMatches.length,
        negPenalty: item.negativePenalty,
      })),
    });

    // ── Step 4: Pick the best available preview set (never empty) ──
    let previewTenders: PreviewTender[];
    let previewSummary: string;

    if (qualified.length > 0) {
      previewTenders = qualified.slice(0, 6).map((item) => toPreviewTender(item.tender));
      previewSummary = `Na osnovu osnovnih podataka izdvojili smo ${previewTenders.length} tendera koji najviše liče na ono što radite.`;
    } else if (withAnyPositive.length > 0) {
      previewTenders = withAnyPositive.slice(0, 6).map((item) => toPreviewTender(item.tender));
      previewSummary =
        "Prikazujemo širi početni pregled tendera na osnovu djelatnosti i dostupnih signala. U sljedećem koraku dodajte kontekst za preciznije preporuke.";
    } else {
      previewTenders = scored.slice(0, 6).map((item) => toPreviewTender(item.tender));
      previewSummary =
        "Prikazujemo najnovije otvorene tendere. U sljedećem koraku dopunite profil za preciznije preporuke.";
    }

    console.log("[PREVIEW] Final result:", {
      tendersReturned: previewTenders.length,
      tier: qualified.length > 0 ? "qualified" : withAnyPositive.length > 0 ? "positive" : "broadest",
    });

    return NextResponse.json({
      tenders: previewTenders,
      summary: previewSummary,
    });
  } catch (error) {
    console.error("[PREVIEW] Unhandled error:", error);
    return NextResponse.json({
      tenders: [],
      summary:
        "Početni pregled je trenutno ograničen za ovaj osnovni unos. Nastavite dalje i u sljedećem koraku ćemo izoštriti preporuke.",
    });
  }
}
