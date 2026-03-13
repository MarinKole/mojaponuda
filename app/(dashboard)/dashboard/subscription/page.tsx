"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSubscriptionStatus, type SubscriptionStatus } from "@/lib/subscription";
import { SubscriptionCard } from "@/components/subscription/subscription-card";
import { PricingTable } from "@/components/subscription/pricing-table";
import { type PlanTier } from "@/lib/plans";
import { useToast } from "@/components/ui/use-toast";

export default function SubscriptionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    async function loadStatus() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      const s = await getSubscriptionStatus(user.id, user.email);
      setStatus(s);
      setLoading(false);
    }

    loadStatus();
  }, [router]);

  async function handleSelectPlan(planId: PlanTier) {
    if (planId === "basic") {
       // Basic is paid (50 KM), so we also need checkout unless it's the current plan
       // For now, treat all selection as "create checkout" unless it's the current plan
    }

    try {
      const res = await fetch("/api/lemonsqueezy/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Greška pri kreiranju narudžbe.");
      }
      
      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      toast({
        title: "Greška",
        description: "Nismo uspjeli kreirati narudžbu. Pokušajte ponovo.",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Učitavanje...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-12 pb-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">Upravljanje Pretplatom</h1>
        <p className="mt-2 text-base text-slate-500">
          Pregled statusa vaše licence i dostupnih funkcionalnosti.
        </p>
      </div>

      <SubscriptionCard
        isActive={status?.isSubscribed ?? false}
        status={status?.subscription?.status ?? "inactive"}
        currentPeriodEnd={status?.subscription?.current_period_end ?? null}
        hasCustomerId={!!status?.subscription?.lemonsqueezy_customer_id}
      />

      <div>
        <h2 className="text-2xl font-heading font-bold text-slate-900 mb-6">Dostupni paketi</h2>
        <PricingTable 
          currentPlanId={status?.plan.id}
          onSelectPlan={handleSelectPlan}
        />
      </div>
    </div>
  );
}

