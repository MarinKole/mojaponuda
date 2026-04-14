import { describe, expect, it } from "vitest";
import {
  applyLegalUpdateQualityFilter,
  filterLegalUpdates,
} from "../sync/scrapers/legal-quality-filter";

describe("Legal quality filter", () => {
  it("rejects navigation-heavy garbage from legal sources", () => {
    const verdict = applyLegalUpdateQualityFilter({
      type: "zakon",
      title:
        "Jezik Bosanski Hrvatski Srpski Službena glasila Službeni glasnik BiH Službeni dio Oglasni dio Službeni glasnik BiH Međunarodni ugovori Detaljniji odabir Službene novine Federacije BiH Službeni dio O",
      summary:
        "Mato Tadić: Privredno pravo prema programu pravosudnog ispita - 3. izmijenjeno i dopunjeno izdanje",
      source: "Službeni glasnik FBiH",
      source_url: "http://www.sluzbenenovine.ba/",
    });

    expect(verdict.passed).toBe(false);
    expect(verdict.reason).toBeTruthy();
  });

  it("accepts a real procurement law update", () => {
    const verdict = applyLegalUpdateQualityFilter({
      type: "izmjena",
      title:
        "Zakon o izmjenama i dopunama Zakona o javnim nabavkama Bosne i Hercegovine",
      summary:
        "Izmjene uređuju postupke javnih nabavki, rokove žalbe i pravila za ugovorne organe i ponuđače.",
      source: "Agencija za javne nabavke BiH",
      source_url: "https://www.javnenabavke.gov.ba/legislation",
    });

    expect(verdict.passed).toBe(true);
  });

  it("filters mixed batches and keeps only relevant legal updates", () => {
    const batch = filterLegalUpdates([
      {
        type: "zakon" as const,
        title:
          "Jezik Bosanski Hrvatski Srpski Službena glasila Službeni glasnik BiH",
        summary:
          "Mato Tadić: Privredno pravo prema programu pravosudnog ispita - 3. izmijenjeno i dopunjeno izdanje",
        source: "Službeni glasnik FBiH",
        source_url: "http://www.sluzbenenovine.ba/",
      },
      {
        type: "zakon" as const,
        title: "Pravilnik o postupku dodjele ugovora o javnim nabavkama",
        summary:
          "Pravilnik detaljno uređuje postupak dodjele ugovora, rad ugovornih organa i pregled ponuda.",
        source: "Agencija za javne nabavke BiH",
        source_url: "https://www.javnenabavke.gov.ba/legislation",
      },
    ]);

    expect(batch.filtered).toHaveLength(1);
    expect(batch.rejected).toHaveLength(1);
    expect(batch.filtered[0]?.title).toContain("Pravilnik");
  });
});
