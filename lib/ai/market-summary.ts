import { getOpenAIClient } from "@/lib/openai";
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
  const topAuthority = overview.topAuthorities[0]?.name ?? "više naručilaca";
  const topWinner = overview.topWinners[0]?.name ?? "više ponuđača";

  return {
    title: "Brzi tržišni sažetak",
    source: "fallback",
    sentences: [
      `Na tržištu je trenutno otvoreno ${overview.activeTenderCount} tendera procijenjene vrijednosti ${formatKM(overview.activeTenderValue)}, dok je u ${new Date().getFullYear()}. već dodijeljeno ${formatKM(overview.yearAwardValue)} ugovora.`,
      `Najviše vrijednosti trenutno prolazi kroz kategoriju ${topCategory}, a među naručiocima se najviše ističe ${topAuthority}.`,
      `Na strani ponuđača trenutno najjači trag ostavlja ${topWinner}, dok plan nabavki za narednih 90 dana pokazuje ${overview.plannedCount90d} najavljenih prilika vrijednih ${formatKM(overview.plannedValue90d)}.`,
      `Konkurentski pritisak u zadnjih 90 dana pokazuje prosjek od ${overview.avgBidders90d ?? "—"} ponuđača po ugovoru i prosječni popust od ${overview.avgDiscount90d !== null ? `${overview.avgDiscount90d}%` : "—"}.`,
    ],
  };
}

export async function generateMarketSummary(
  overview: MarketOverviewResult
): Promise<MarketSummaryResult> {
  const fallback = buildFallbackSummary(overview);

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "market_summary",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              sentences: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 4,
              },
            },
            required: ["title", "sentences"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Ti si senior tržišni analitičar za javne nabavke u Bosni i Hercegovini. Piši na bosanskom/hrvatskom. Daj kratak, direktan i profesionalan sažetak za direktore i nabavkare. Izbjegavaj hype, generičke fraze i tehnički žargon. Koristi isključivo podatke koje si dobio.",
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction:
              "Napiši naslov i 3 do 4 kratke rečenice koje objašnjavaju šta je trenutno najvažnije na tržištu, gdje je najveća vrijednost, kakav je konkurentski pritisak i šta dolazi uskoro.",
            market: {
              activeTenderCount: overview.activeTenderCount,
              activeTenderValue: overview.activeTenderValue,
              yearAwardValue: overview.yearAwardValue,
              plannedCount90d: overview.plannedCount90d,
              plannedValue90d: overview.plannedValue90d,
              avgDiscount90d: overview.avgDiscount90d,
              avgBidders90d: overview.avgBidders90d,
              avgAwardValue90d: overview.avgAwardValue90d,
              topCategories: overview.categoryData.slice(0, 3),
              topProcedures: overview.procedureData.slice(0, 3),
              topAuthorities: overview.topAuthorities.slice(0, 3),
              topWinners: overview.topWinners.slice(0, 3),
              monthlyAwards: overview.monthlyAwards,
              upcomingPlans: overview.upcomingPlans.slice(0, 3),
            },
          }),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as { title: string; sentences: string[] };

    if (!parsed.title || !Array.isArray(parsed.sentences) || parsed.sentences.length === 0) {
      return fallback;
    }

    return {
      title: parsed.title,
      sentences: parsed.sentences.slice(0, 4),
      source: "ai",
    };
  } catch {
    return fallback;
  }
}
