import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const admin = createAdminClient();

    const { data: opp } = await admin
      .from("opportunities")
      .select("id, title, issuer, requirements, description, eligibility_signals, deadline, type")
      .eq("id", id)
      .single();

    if (!opp) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Generate checklist from requirements and eligibility signals
    const items: { label: string; category: string }[] = [];

    // Parse requirements into checklist items
    if (opp.requirements) {
      const lines = opp.requirements
        .split(/[;\n\r•\-\d+\.\)]+/)
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 10);
      for (const line of lines) {
        items.push({ label: line, category: "Uvjeti" });
      }
    }

    // Parse eligibility signals
    if (opp.eligibility_signals && opp.eligibility_signals.length > 0) {
      for (const signal of opp.eligibility_signals) {
        items.push({ label: signal, category: "Kvalifikacije" });
      }
    }

    // Default checklist items for grants
    if (items.length === 0) {
      items.push(
        { label: "Provjeriti da li je firma registrirana u odgovarajućem registru", category: "Dokumentacija" },
        { label: "Pripremiti aktuelni izvod iz sudskog registra", category: "Dokumentacija" },
        { label: "Pripremiti uvjerenje o poreznoj registraciji (ID broj)", category: "Dokumentacija" },
        { label: "Pribaviti uvjerenje o izmirenim poreznim obavezama", category: "Dokumentacija" },
        { label: "Pripremiti bilans stanja i uspjeha za prethodnu godinu", category: "Finansije" },
        { label: "Provjeriti da nema blokade računa u banci", category: "Finansije" },
      );

      if (opp.type === "poticaj") {
        items.push(
          { label: "Pripremiti biznis plan ili opis projekta", category: "Prijava" },
          { label: "Definirati budžet projekta sa detaljnom specifikacijom", category: "Prijava" },
          { label: "Pripremiti izjavu o državnoj pomoći", category: "Prijava" },
        );
      }
    }

    // Always add deadline item
    if (opp.deadline) {
      items.unshift({
        label: `Predati prijavu do: ${new Date(opp.deadline).toLocaleDateString("bs-BA", { day: "numeric", month: "long", year: "numeric" })}`,
        category: "Rokovi",
      });
    }

    return NextResponse.json({
      opportunity_id: opp.id,
      opportunity_title: opp.title,
      issuer: opp.issuer,
      items,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
