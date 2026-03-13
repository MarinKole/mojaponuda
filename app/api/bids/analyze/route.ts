import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import type { Bid, Tender, Company, Json } from "@/types/database";
import { analyzeTender } from "@/lib/ai/tender-analysis";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }
  
  // Provjera pretplate (AI je premium feature)
  const { isSubscribed } = await getSubscriptionStatus(user.id, user.email);
  if (!isSubscribed) {
    return NextResponse.json(
      { error: "AI analiza je dostupna samo u Professional paketu." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { bid_id } = body;

  if (!bid_id) {
    return NextResponse.json(
      { error: "bid_id je obavezan." },
      { status: 400 }
    );
  }

  // Dohvati firmu
  const { data: companyData } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const company = companyData as Company | null;
  if (!company) {
    return NextResponse.json(
      { error: "Firma nije pronađena." },
      { status: 403 }
    );
  }

  // Dohvati ponudu s tenderom
  const { data: bidData } = await supabase
    .from("bids")
    .select("*, tenders(*)")
    .eq("id", bid_id)
    .single();

  const bid = bidData as unknown as (Bid & { tenders: Tender }) | null;

  if (!bid || bid.company_id !== company.id) {
    return NextResponse.json(
      { error: "Ponuda nije pronađena." },
      { status: 404 }
    );
  }

  const tender = bid.tenders;

  try {
    // Koristi dijeljenu logiku za analizu (ovo rješava i caching)
    const analysis = await analyzeTender(tender);

    // Spremi AI analizu u bids.ai_analysis (za arhivu specifičnu za ovaj bid)
    await supabase
      .from("bids")
      .update({ ai_analysis: analysis as unknown as Json })
      .eq("id", bid_id);

    // Kreiraj checklist stavke iz analize
    const existingChecklist = await supabase
      .from("bid_checklist_items")
      .select("id")
      .eq("bid_id", bid_id);

    const startOrder = (existingChecklist.data?.length ?? 0);

    const checklistRows = analysis.checklist_items.map((item, idx) => ({
      bid_id,
      title: item.name,
      description: item.description,
      status: "missing" as const,
      document_type: item.document_type, // Sada spremamo i tip dokumenta!
      risk_note: item.risk_note || null,
      sort_order: startOrder + idx,
    }));

    if (checklistRows.length > 0) {
      await supabase.from("bid_checklist_items").insert(checklistRows);
    }

    // Pozadinski upis: authority_requirement_patterns
    if (tender.contracting_authority_jib) {
      const patternRows = analysis.checklist_items.map((item) => ({
        contracting_authority_jib: tender.contracting_authority_jib!,
        document_type: item.document_type,
        tender_id: tender.id,
        is_required: item.is_required,
      }));

      // Fire-and-forget — ne blokiraj response
      (async () => {
        try {
          await supabase
            .from("authority_requirement_patterns")
            .upsert(patternRows, {
              onConflict: "contracting_authority_jib,document_type,tender_id",
            });
        } catch (err) {
          console.error("Pattern insert error:", err);
        }
      })();
    }

    return NextResponse.json({
      analysis,
      checklist_items_added: checklistRows.length,
    });
  } catch (err) {
    console.error("AI analysis error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `AI analiza nije uspjela: ${message}` },
      { status: 500 }
    );
  }
}
