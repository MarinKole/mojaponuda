"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SubscriptionCard } from "@/components/subscription/subscription-card";
import { PricingTable } from "@/components/subscription/pricing-table";
import { type PlanTier } from "@/lib/plans";
import { useToast } from "@/components/ui/use-toast";
import type { SubscriptionStatus } from "@/lib/subscription";

export function SubscriptionClientPage({ initialStatus }: { initialStatus: SubscriptionStatus }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<PlanTier | null>(null);

  async function handleSelectPlan(planId: PlanTier) {
    if (planId === "basic") {
       // Basic is paid (50 KM), so we also need checkout unless it's the current plan
       // For now, treat all selection as "create checkout" unless it's the current plan
    }

    setLoadingPlan(planId);
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
      
      // If it's a demo user, the API returns a local URL to redirect to instead of Lemon Squeezy
      if (data.url && data.url.startsWith("/")) {
        toast({
          title: "Pretplata ažurirana",
          description: "Demo nalog: Uspješno ste promijenili paket.",
        });
        router.refresh();
      } else {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Greška",
        description: "Nismo uspjeli kreirati narudžbu. Pokušajte ponovo.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-12 pb-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">Paketi i kontrola rizika</h1>
        <p className="mt-2 text-base text-slate-500">
          Ovdje birate koliko kontrole želite prije slanja ponude i koliko tržišnih informacija želite imati prije odluke da aplicirate.
        </p>
      </div>

      <SubscriptionCard
        isActive={initialStatus.isSubscribed}
        status={initialStatus.subscription?.status ?? "inactive"}
        currentPeriodEnd={initialStatus.subscription?.current_period_end ?? null}
        hasCustomerId={!!initialStatus.subscription?.lemonsqueezy_customer_id}
        plan={initialStatus.plan}
      />

      <div>
        <h2 className="text-2xl font-heading font-bold text-slate-900 mb-6">Odaberite nivo kontrole koji vam treba</h2>
        <PricingTable 
          currentPlanId={initialStatus.plan.id}
          onSelectPlan={handleSelectPlan}
          isLoading={loadingPlan !== null}
        />
      </div>
    </div>
  );
}
