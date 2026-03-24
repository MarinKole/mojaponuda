import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";

// GET /api/agency/clients - List all clients
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await getSubscriptionStatus(user.id, user.email);
  if (plan.id !== "agency") {
    return NextResponse.json({ error: "Agency plan required" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("agency_clients")
    .select(`
      id, status, crm_stage, notes, contract_start, contract_end, monthly_fee, created_at,
      companies (id, name, jib, industry, contact_email, contact_phone, operating_regions)
    `)
    .eq("agency_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data });
}

// POST /api/agency/clients - Create a new client with company profile
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await getSubscriptionStatus(user.id, user.email);
  if (plan.id !== "agency") {
    return NextResponse.json({ error: "Agency plan required" }, { status: 403 });
  }

  const body = await request.json();
  const {
    companyName,
    companyJib,
    companyPdv,
    companyAddress,
    companyContactEmail,
    companyContactPhone,
    industry,
    keywords,
    cpvCodes,
    operatingRegions,
    notes,
    crmStage,
    contractStart,
    contractEnd,
    monthlyFee,
    // If linking existing company owned by agency user
    existingCompanyId,
  } = body;

  let companyId: string;

  if (existingCompanyId) {
    // Verify agency owns or manages this company
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("id")
      .eq("id", existingCompanyId)
      .maybeSingle();

    if (!existingCompany) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    companyId = existingCompany.id;
  } else {
    if (!companyName || !companyJib) {
      return NextResponse.json({ error: "Company name and JIB are required" }, { status: 400 });
    }

    // Check if company with this JIB already exists and is already a client
    const { data: existingByJib } = await supabase
      .from("companies")
      .select("id")
      .eq("jib", companyJib)
      .maybeSingle();

    if (existingByJib) {
      // Company already exists, link it
      companyId = existingByJib.id;
    } else {
      // Create a new company row owned by the agency user
      const { data: newCompany, error: companyError } = await supabase
        .from("companies")
        .insert({
          user_id: user.id,
          name: companyName,
          jib: companyJib,
          pdv: companyPdv || null,
          address: companyAddress || null,
          contact_email: companyContactEmail || null,
          contact_phone: companyContactPhone || null,
          industry: industry || null,
          keywords: keywords || null,
          cpv_codes: cpvCodes || null,
          operating_regions: operatingRegions || null,
        })
        .select("id")
        .single();

      if (companyError) {
        return NextResponse.json({ error: companyError.message }, { status: 500 });
      }
      companyId = newCompany.id;
    }
  }

  // Check if this agency-client relationship already exists
  const { data: existingRelation } = await supabase
    .from("agency_clients")
    .select("id")
    .eq("agency_user_id", user.id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (existingRelation) {
    return NextResponse.json(
      { error: "Ovaj klijent je već dodan u vašu agenciju." },
      { status: 409 }
    );
  }

  // Create the agency_clients relationship
  const { data: agencyClient, error: relationError } = await supabase
    .from("agency_clients")
    .insert({
      agency_user_id: user.id,
      company_id: companyId,
      notes: notes || null,
      crm_stage: crmStage || "active",
      contract_start: contractStart || null,
      contract_end: contractEnd || null,
      monthly_fee: monthlyFee ? Number(monthlyFee) : null,
    })
    .select("id")
    .single();

  if (relationError) {
    return NextResponse.json({ error: relationError.message }, { status: 500 });
  }

  return NextResponse.json({ id: agencyClient.id, companyId }, { status: 201 });
}
