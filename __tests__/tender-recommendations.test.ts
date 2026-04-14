import { describe, expect, it } from "vitest";
import {
  buildRecommendationContext,
  scoreTenderRecommendation,
  selectTenderRecommendations,
  type RecommendationTenderInput,
} from "@/lib/tender-recommendations";

function createTender(
  overrides: Partial<RecommendationTenderInput>
): RecommendationTenderInput {
  return {
    id: "tender-1",
    title: "Tender",
    deadline: "2026-06-01T00:00:00.000Z",
    estimated_value: null,
    contracting_authority: "Test authority",
    contracting_authority_jib: null,
    contract_type: "Usluge",
    raw_description: null,
    cpv_code: null,
    ai_analysis: null,
    authority_city: null,
    authority_municipality: null,
    authority_canton: null,
    authority_entity: null,
    ...overrides,
  };
}

describe("tender recommendations", () => {
  const context = buildRecommendationContext({
    industry: null,
    keywords: ["erp", "softver"],
    cpv_codes: [],
    operating_regions: ["Kanton Sarajevo"],
  });

  it("keeps strong business-fit tenders even when location is broad", () => {
    const scored = scoreTenderRecommendation(
      createTender({
        id: "broad-fit",
        title: "Nabavka ERP softvera za finansijsko poslovanje",
        raw_description: "Implementacija i odrÅ¾avanje ERP sistema",
      }),
      context
    );

    expect(scored.locationScope).toBe("broad");
    expect(scored.qualifies).toBe(true);
    expect(scored.titleMatches).toContain("erp");
  });

  it("ranks stronger relevance ahead of closer but weaker matches", () => {
    const ranked = selectTenderRecommendations(
      [
        createTender({
          id: "local-weaker",
          title: "OdrÅ¾avanje softvera",
          authority_city: "Sarajevo",
        }),
        createTender({
          id: "broad-stronger",
          title: "Nabavka ERP softvera i integracija poslovnih sistema",
        }),
      ],
      context
    );

    expect(ranked.map((item) => item.tender.id)).toEqual([
      "broad-stronger",
      "local-weaker",
    ]);
  });

  it("keeps broad profile signals available alongside strict keywords", () => {
    const profileContext = buildRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: "it",
        offeringCategories: ["software_licenses"],
        specializationIds: [],
        preferredTenderTypes: [],
        companyDescription: "Razvijamo poslovni softver za institucije.",
        manualKeywords: ["erp"],
      }),
      keywords: ["erp"],
      cpv_codes: [],
      operating_regions: [],
    });

    expect(profileContext.keywords).toContain("erp");
    expect(profileContext.keywords).toContain("softver");
    expect(profileContext.retrievalKeywords).toContain("software");
    expect(profileContext.cpvPrefixes).toContain("48000");
  });

  it("matches cross-variant software titles for the same profile", () => {
    const profileContext = buildRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: "it",
        offeringCategories: ["software_licenses"],
        specializationIds: [],
        preferredTenderTypes: [],
        companyDescription: "Implementacija i odrzavanje poslovnog softvera.",
        manualKeywords: [],
      }),
      keywords: [],
      cpv_codes: [],
      operating_regions: [],
    });

    const scored = scoreTenderRecommendation(
      createTender({
        id: "software-fit",
        title: "Nabavka software platforme za upravljanje dokumentima",
        raw_description: "Implementation of business software platform",
      }),
      profileContext
    );

    expect(scored.qualifies).toBe(true);
    expect(scored.titleMatches).toContain("software");
  });
});
