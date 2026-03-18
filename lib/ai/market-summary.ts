import type { MarketOverviewResult } from "@/lib/market-intelligence";

export interface MarketSummaryResult {
  title: string;
  sentences: string[];
  source: "ai" | "fallback";
}

function formatKM(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${value.toFixed(0)} KM`;
}

function buildFallbackSummary(overview: MarketOverviewResult): MarketSummaryResult {
  const topCategory = overview.categoryData[0]?.category ?? "više kategorija";
  const openValueText =
    overview.activeTenderValueKnownCount > 0
      ? `Objavljena procijenjena vrijednost iznosi ${formatKM(overview.activeTenderValue)}.`
      : "Za otvorene tendere trenutno nema objavljene procijenjene vrijednosti.";
  const upcomingText =
    overview.plannedValueKnownCount > 0
      ? `${overview.plannedCount90d} nadolazećih tendera nosi najmanje ${formatKM(overview.plannedValue90d)} poznate vrijednosti.`
      : `${overview.plannedCount90d} nadolazećih tendera je trenutno bez objavljene procijenjene vrijednosti.`;
  const marketPressureText =
    overview.avgBiddersSampleCount > 0
      ? `U zadnjih 90 dana prosjek je ${overview.avgBidders90d ?? "—"} ponuđača po postupku.`
      : "Za broj ponuđača u zadnjih 90 dana nema dovoljno objavljenih podataka.";
  const pricePressureText =
    overview.avgDiscountSampleCount > 0
      ? `Prosječan popust u zadnjih 90 dana je ${overview.avgDiscount90d !== null ? `${overview.avgDiscount90d}%` : "—"}.`
      : "Za popuste u zadnjih 90 dana nema dovoljno objavljenih podataka.";

  return {
    title: "Sažetak tržišta",
    source: "fallback",
    sentences: [
      `Otvoreno je ${overview.activeTenderCount} tendera u vašem prostoru. ${openValueText}`,
      `U ${new Date().getFullYear()}. godini dodijeljeno je ${formatKM(overview.yearAwardValue)}. Najviše aktivnosti je u kategoriji ${topCategory}.`,
      `Nadolazeći tenderi: ${upcomingText}`,
      `${marketPressureText} ${pricePressureText}`,
    ],
  };
}

export async function generateMarketSummary(
  overview: MarketOverviewResult
): Promise<MarketSummaryResult> {
  return buildFallbackSummary(overview);
}
