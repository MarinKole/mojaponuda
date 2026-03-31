import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { runPostSyncPipeline } from "@/sync/post-sync-pipeline";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 403 });
  }

  try {
    const result = await runPostSyncPipeline();
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
