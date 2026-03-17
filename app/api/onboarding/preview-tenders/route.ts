import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildProfileKeywordSeeds,
  getPreferredContractTypes,
  getProfileOptionLabel,
  sanitizeSearchKeywords,
  type ParsedCompanyProfile,
} from "@/lib/company-profile";
import { buildRegionSearchTerms, getRegionSelectionLabels } from "@/lib/constants/regions";

interface PreviewTender {
  id: string;
  title: string;
  deadline: string | null;
  estimated_value: number | null;
  contracting_authority: string | null;
  reasons: string[];
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  try {
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

    const profile: ParsedCompanyProfile = {
      primaryIndustry: null,
      offeringCategories,
      preferredTenderTypes,
      companyDescription: null,
      legacyIndustryText: null,
    };

    const keywordSeeds = sanitizeSearchKeywords(buildProfileKeywordSeeds(profile)).slice(0, 12);
    const contractTypes = getPreferredContractTypes(preferredTenderTypes);
    const regionTerms = buildRegionSearchTerms(regions);
    const regionLabels = getRegionSelectionLabels(regions);

    if (keywordSeeds.length === 0) {
      return NextResponse.json({
        tenders: [],
        summary: "Odaberite barem jednu djelatnost da pokažemo prve tendere.",
      });
    }

    let query = supabase
      .from("tenders")
      .select("id, title, deadline, estimated_value, contracting_authority, contract_type, raw_description")
      .gt("deadline", new Date().toISOString());

    if (contractTypes.length > 0 && contractTypes.length < 3) {
      query = query.in("contract_type", contractTypes);
    }

    const keywordConditions = keywordSeeds
      .map((keyword) => `title.ilike.%${keyword}%,raw_description.ilike.%${keyword}%`)
      .join(",");

    if (keywordConditions) {
      query = query.or(keywordConditions);
    }

    const { data, error } = await query.order("deadline", { ascending: true }).limit(36);

    if (error) {
      throw error;
    }

    const tenders = (data ?? [])
      .map((tender) => {
        const haystack = [
          tender.title,
          tender.contracting_authority,
          tender.contract_type,
          tender.raw_description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const reasons: string[] = [];
        let score = 0;

        if (keywordSeeds.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
          reasons.push(
            offeringCategories.length > 0
              ? `Poklapa se s djelatnošću: ${offeringCategories
                  .slice(0, 2)
                  .map((item: string) => getProfileOptionLabel(item))
                  .join(", ")}`
              : "Poklapa se s vašom djelatnošću"
          );
          score += 2;
        }

        const contractMatch =
          contractTypes.length === 0 ||
          (tender.contract_type ? contractTypes.includes(tender.contract_type) : false);

        if (contractMatch) {
          reasons.push(
            contractTypes.length > 0
              ? `Odgovara tipu tendera: ${contractTypes.join(", ")}`
              : "Otvoren je za tip tendera koji većina firmi prati"
          );
          score += 1;
        }

        const regionMatch =
          regionTerms.length === 0 || regionTerms.some((term) => haystack.includes(term.toLowerCase()));

        if (regionMatch) {
          reasons.push(
            regionLabels.length > 0
              ? `Odgovara području rada: ${regionLabels.slice(0, 2).join(", ")}`
              : "Niste ograničili lokaciju, pa prikazujemo cijelu BiH"
          );
          score += 1;
        }

        return {
          id: tender.id,
          title: tender.title,
          deadline: tender.deadline,
          estimated_value: tender.estimated_value,
          contracting_authority: tender.contracting_authority,
          reasons: [...new Set(reasons)].slice(0, 3),
          score,
          regionMatch,
        };
      })
      .filter((tender) => tender.score > 0)
      .filter((tender) => (regionTerms.length > 0 ? tender.regionMatch : true))
      .sort((a, b) => b.score - a.score || new Date(a.deadline ?? 0).getTime() - new Date(b.deadline ?? 0).getTime())
      .slice(0, 6)
      .map(({ score, regionMatch, ...tender }) => tender satisfies PreviewTender);

    const summary =
      tenders.length > 0
        ? `Na osnovu osnovnih podataka izdvojili smo ${tenders.length} tendera koji najviše liče na ono što radite.`
        : "Za ovaj osnovni unos još nema dovoljno jasnih poklapanja. U sljedećem koraku dopunite profil i dobit ćete preciznije preporuke.";

    return NextResponse.json({ tenders, summary });
  } catch (error) {
    console.error("Preview tenders error:", error);
    return NextResponse.json(
      { error: "Nismo uspjeli pripremiti početni pregled tendera." },
      { status: 500 }
    );
  }
}
