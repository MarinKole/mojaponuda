import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCompanyProfileComplete } from "@/lib/demo";
import { resolveAuthenticatedAppPath } from "@/lib/agency";
import { getSubscriptionStatus } from "@/lib/subscription";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Provjeri da li korisnik ima companies zapis (za email-confirmed signup)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
        const { data: existingCompany } = await supabase
          .from("companies")
          .select("id, name, jib, industry, keywords, cpv_codes, operating_regions")
          .eq("user_id", user.id)
          .maybeSingle();

        const redirectPath = resolveAuthenticatedAppPath({
          plan,
          hasCompletedCompanyProfile: isCompanyProfileComplete(existingCompany),
        });

        if (redirectPath !== "/dashboard") {
          return NextResponse.redirect(`${origin}${redirectPath}`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
