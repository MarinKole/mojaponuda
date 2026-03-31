import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  if (!adminEmails.includes(user.email?.toLowerCase() ?? "")) throw new Error("Forbidden");
  return user;
}

export async function POST() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    // Delete all opportunity follows first (FK constraint)
    await supabase.from("opportunity_follows").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Delete all page analytics referencing opportunities
    await supabase.from("page_analytics").delete().not("opportunity_id", "is", null);

    // Delete all opportunities
    const { error: oppError, count: oppCount } = await supabase
      .from("opportunities")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Delete all legal updates
    const { error: legalError, count: legalCount } = await supabase
      .from("legal_updates")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Delete scraper logs
    await supabase.from("scraper_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    if (oppError || legalError) {
      return NextResponse.json({
        error: `${oppError?.message ?? ""} ${legalError?.message ?? ""}`.trim(),
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: {
        opportunities: oppCount ?? 0,
        legal_updates: legalCount ?? 0,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
