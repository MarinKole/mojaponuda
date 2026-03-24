import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";

// PATCH /api/agency/clients/[id] - Update client CRM info
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { crm_stage, status, notes, contract_start, contract_end, monthly_fee } = body;

  const { error } = await supabase
    .from("agency_clients")
    .update({
      ...(crm_stage !== undefined && { crm_stage }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
      ...(contract_start !== undefined && { contract_start }),
      ...(contract_end !== undefined && { contract_end }),
      ...(monthly_fee !== undefined && { monthly_fee: monthly_fee ? Number(monthly_fee) : null }),
    })
    .eq("id", id)
    .eq("agency_user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE /api/agency/clients/[id] - Remove client from agency
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("agency_clients")
    .delete()
    .eq("id", id)
    .eq("agency_user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
