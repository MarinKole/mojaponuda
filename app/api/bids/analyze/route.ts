import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import type { Bid, Tender, Company, Json } from "@/types/database";
import { analyzeTender } from "@/lib/ai/tender-analysis";
import { AI_TO_VAULT_TYPE_MAP } from "@/lib/vault/constants";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }
  
  // Provjera pretplate i feature-a
  const { isSubscribed, plan } = await getSubscriptionStatus(user.id, user.email);
  
  if (!isSubscribed) {
    return NextResponse.json(
      { error: "Morate imati aktivnu pretplatu za AI analizu." },
      { status: 403 }
    );
  }

  if (!plan.limits.features.advancedAnalysis) {
    return NextResponse.json(
      { 
        error: "Napredna AI analiza nije dostupna u vašem paketu.",
        code: "FEATURE_LOCKED",
        feature: "advancedAnalysis",
        upgradeRequired: true
      },
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

  // Dohvati dokumente iz trezora za automatsko uparivanje
  const { data: vaultDocs } = await supabase
    .from("documents")
    .select("id, type, expires_at")
    .eq("company_id", company.id);

  try {
    // Koristi dijeljenu logiku za analizu (ovo rješava i caching)
    const analysis = await analyzeTender(tender);

    if (!analysis.checklist_items.length) {
      return NextResponse.json(
        {
          error:
            "AI analiza nije pronašla nijednu checklist stavku. Tender vjerovatno nema dovoljno teksta za analizu ili OpenAI nije vratio upotrebljiv rezultat.",
        },
        { status: 422 }
      );
    }

    // Spremi AI analizu u bids.ai_analysis (za arhivu specifičnu za ovaj bid)
    const { error: bidUpdateError } = await supabase
      .from("bids")
      .update({ ai_analysis: analysis as unknown as Json })
      .eq("id", bid_id);

    if (bidUpdateError) {
      throw new Error(`Spremanje AI analize nije uspjelo: ${bidUpdateError.message}`);
    }

    // Kreiraj checklist stavke iz analize
    const existingChecklist = await supabase
      .from("bid_checklist_items")
      .select("id")
      .eq("bid_id", bid_id);

    if (existingChecklist.error) {
      throw new Error(`Čitanje postojeće checkliste nije uspjelo: ${existingChecklist.error.message}`);
    }

    const startOrder = (existingChecklist.data?.length ?? 0);

    const checklistRows = analysis.checklist_items.map((item, idx) => {
      let docId = null;
      let status: "missing" | "attached" = "missing";

      // Pokušaj automatskog uparivanja
      if (item.document_type && vaultDocs) {
        const targetType = AI_TO_VAULT_TYPE_MAP[item.document_type];
        if (targetType) {
          // Nađi prvi odgovarajući dokument koji nije istekao
          const match = vaultDocs.find(d => 
            d.type === targetType && 
            (!d.expires_at || new Date(d.expires_at) > new Date())
          );
          
          if (match) {
            docId = match.id;
            status = "attached";
          }
        }
      }

      return {
        bid_id,
        title: item.name,
        description: item.description,
        status: status,
        document_id: docId,
        document_type: item.document_type,
        risk_note: item.risk_note || null,
        sort_order: startOrder + idx,
      };
    });

    if (checklistRows.length > 0) {
      const { error: checklistInsertError } = await supabase
        .from("bid_checklist_items")
        .insert(checklistRows);

      if (checklistInsertError) {
        throw new Error(`Kreiranje checklist stavki nije uspjelo: ${checklistInsertError.message}`);
      }

      // Dodaj u bid_documents one koji su automatski pronađeni
      const autoAttachedDocs = checklistRows
        .filter(r => r.document_id)
        .map(r => ({
          bid_id,
          document_id: r.document_id!,
          checklist_item_name: r.title,
          is_confirmed: false // Korisnik treba potvrditi
        }));

      if (autoAttachedDocs.length > 0) {
        const { error: autoAttachError } = await supabase
          .from("bid_documents")
          .insert(autoAttachedDocs);

        if (autoAttachError) {
          throw new Error(`Automatsko povezivanje dokumenata nije uspjelo: ${autoAttachError.message}`);
        }
      }
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
      auto_attached: checklistRows.filter(r => r.document_id).length
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
