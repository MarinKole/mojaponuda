import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckout } from "@/lib/lemonsqueezy";
import { PLANS, type PlanTier } from "@/lib/plans";

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const planId = body.planId as PlanTier;

    if (!planId || !PLANS[planId]) {
      return NextResponse.json(
        { error: "Nevažeći plan." },
        { status: 400 }
      );
    }

    const plan = PLANS[planId];
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const variantId = plan.lemonSqueezyVariantId;

    if (!storeId || !variantId) {
      console.error("Missing configuration:", { storeId, variantId, planId });
      return NextResponse.json(
        { error: "Konfiguracija naplate nije pronađena." },
        { status: 500 }
      );
    }

    const checkoutUrl = await createCheckout({
      storeId,
      variantId,
      userEmail: user.email ?? "",
      userId: user.id,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    console.error("Checkout error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Checkout greška: ${message}` },
      { status: 500 }
    );
  }
}
