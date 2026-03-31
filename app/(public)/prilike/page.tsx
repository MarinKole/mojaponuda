import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OpportunityCard } from "@/components/public/opportunity-card";
import { PublicCta } from "@/components/public/public-cta";
import { OPPORTUNITY_CATEGORIES } from "@/lib/opportunity-categories";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Javne prilike u BiH — Tenderi i poticaji | MojaPonuda.ba",
  description: "Pregledajte aktivne javne nabavke, grantove i poticaje u Bosni i Hercegovini. Filtrirajte po kategoriji, roku i vrijednosti.",
  alternates: { canonical: "https://mojaponuda.ba/prilike" },
};

export const revalidate = 3600; // 1h ISR

export default async function PrilikePage() {
  const supabase = await createClient();

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, slug, type, title, issuer, category, value, deadline, location, ai_summary, ai_difficulty")
    .eq("published", true)
    .eq("status", "active")
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(30);

  const tenders = (opportunities ?? []).filter((o) => o.type === "tender");
  const poticaji = (opportunities ?? []).filter((o) => o.type === "poticaj");

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="mb-12 text-center">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Javne prilike u BiH
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Aktivni tenderi, grantovi i poticaji za firme u Bosni i Hercegovini.
            Svakodnevno ažurirano.
          </p>
          <PublicCta
            text="Pratite prilike prilagođene vašoj firmi"
            href="/signup"
            className="mt-6"
          />
        </div>

        {/* Category navigation */}
        <section className="mb-12">
          <h2 className="font-heading text-xl font-bold text-slate-900 mb-4">
            Pretraži po kategoriji
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {OPPORTUNITY_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/prilike/kategorija/${cat.slug}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-blue-200 hover:bg-blue-50 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                  {cat.title}
                </span>
                <ArrowRight className="size-3.5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </section>

        {poticaji.length > 0 && (
          <section className="mb-12">
            <h2 className="font-heading text-2xl font-bold text-slate-900 mb-6">
              Poticaji i grantovi
            </h2>
            <div className="space-y-4">
              {poticaji.map((o) => (
                <OpportunityCard key={o.id} opportunity={o} />
              ))}
            </div>
          </section>
        )}

        {tenders.length > 0 && (
          <section className="mb-12">
            <h2 className="font-heading text-2xl font-bold text-slate-900 mb-6">
              Javne nabavke
            </h2>
            <div className="space-y-4">
              {tenders.map((o) => (
                <OpportunityCard key={o.id} opportunity={o} />
              ))}
            </div>
          </section>
        )}

        {(opportunities ?? []).length === 0 && (
          <div className="text-center py-20 text-slate-500">
            Prilike se ažuriraju svakodnevno. Provjerite ponovo uskoro.
          </div>
        )}
      </div>
    </main>
  );
}
