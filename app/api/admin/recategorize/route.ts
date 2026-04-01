import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { categorizeOpportunity } from "@/lib/category-classifier";

export const maxDuration = 300;

/**
 * POST /api/admin/recategorize
 * Re-classifies all published opportunities that still have the generic
 * "Poticaji i grantovi" category using keyword-based rules.
 * Safe to run multiple times — only updates rows whose category changes.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminDb = createAdminClient();

  // Fetch all published opportunities still on the generic catch-all category
  const { data: rows, error } = await adminDb
    .from("opportunities")
    .select("id, title, issuer, description, eligibility_signals, category")
    .eq("published", true)
    .eq("category", "Poticaji i grantovi")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ updated: 0, total: 0, message: "All opportunities already have specific categories." });
  }

  let updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const newCategory = categorizeOpportunity(
      row.title,
      row.issuer,
      row.description,
      row.eligibility_signals,
    );

    // Only update if the classifier assigned something more specific
    if (newCategory !== "Poticaji i grantovi") {
      const { error: updateError } = await adminDb
        .from("opportunities")
        .update({ category: newCategory })
        .eq("id", row.id);

      if (updateError) {
        errors.push(`${row.id}: ${updateError.message}`);
      } else {
        updated++;
      }
    }
  }

  return NextResponse.json({
    updated,
    total: rows.length,
    remaining: rows.length - updated,
    errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    message: `Rekategorizovano ${updated} od ${rows.length} prilike.`,
  });
}

/** GET — returns how many are still on the generic category */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminDb = createAdminClient();
  const { count } = await adminDb
    .from("opportunities")
    .select("*", { count: "exact", head: true })
    .eq("published", true)
    .eq("category", "Poticaji i grantovi");

  return NextResponse.json({ remaining: count ?? 0 });
}
