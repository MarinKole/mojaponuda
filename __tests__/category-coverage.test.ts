/**
 * Guard test: garantuje da sistemski keyword/CPV retrieval pokriva SVAKU
 * postojeću i buduću kategoriju iz OFFERING_CATEGORY_OPTIONS — ne samo
 * IT, medicinu i građevinu koje koristimo u dev testingu.
 *
 * Ako neko doda novu kategoriju u OFFERING_CATEGORY_OPTIONS a zaboravi
 * upisati seed riječi u OFFERING_CATEGORY_KEYWORDS ili CPV kodove u
 * OFFERING_CATEGORY_CPV_CODES, ovaj test puca i CI zaustavlja deploy.
 *
 * Ovo sprečava regresiju tipa "IT firme dobijaju 60 preporuka a
 * medicinska 0 jer je warm script ili seed tablica bila nepotpuna".
 */
import { describe, it, expect } from "vitest";
import {
  OFFERING_CATEGORY_OPTIONS,
  buildBroadRetrievalCpvPrefixes,
  buildProfileKeywordSeeds,
  type ParsedCompanyProfile,
} from "@/lib/company-profile";

const CATEGORY_CASES: Array<[string, string]> = OFFERING_CATEGORY_OPTIONS.map(
  (opt) => [opt.id, opt.label]
);

function profileWithOnlyCategory(categoryId: string): ParsedCompanyProfile {
  const opt = OFFERING_CATEGORY_OPTIONS.find((o) => o.id === categoryId);
  return {
    primaryIndustry: opt?.focusId ?? null,
    offeringCategories: [categoryId],
    specializationIds: [],
    preferredTenderTypes: [],
    companyDescription: null,
    legacyIndustryText: null,
    manualKeywords: [],
  };
}

describe("OFFERING_CATEGORY_OPTIONS retrieval coverage", () => {
  it("has at least one offering category defined", () => {
    expect(OFFERING_CATEGORY_OPTIONS.length).toBeGreaterThan(0);
  });

  it.each(CATEGORY_CASES)(
    "category %s (%s) produces non-empty keyword seeds",
    (id: string) => {
      const profile = profileWithOnlyCategory(id);
      const keywords = buildProfileKeywordSeeds(profile);
      expect(keywords.length).toBeGreaterThan(0);
    }
  );

  it.each(CATEGORY_CASES)(
    "category %s (%s) produces non-empty CPV retrieval prefixes",
    (id: string) => {
      const profile = profileWithOnlyCategory(id);
      const prefixes = buildBroadRetrievalCpvPrefixes(profile);
      expect(prefixes.length).toBeGreaterThan(0);
    }
  );
});
