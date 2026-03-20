import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { getTenderAreaGapReport } from "@/lib/tender-area-report";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Morate biti prijavljeni da otvorite ovaj izvještaj." },
        { status: 401 }
      );
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json(
        { error: "Samo admin može otvoriti ovaj izvještaj." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.max(1, Math.min(100, Number(searchParams.get("pageSize") ?? "25") || 25));
    const maxScanRows = Math.max(pageSize, Number(searchParams.get("maxScanRows") ?? "5000") || 5000);
    const report = await getTenderAreaGapReport(supabase, {
      page,
      pageSize,
      maxScanRows,
    });

    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Greška pri učitavanju geo izvještaja.", message },
      { status: 500 }
    );
  }
}
