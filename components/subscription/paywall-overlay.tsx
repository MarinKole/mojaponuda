"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, Lock, Star } from "lucide-react";

interface PaywallOverlayProps {
  usedBids: number;
  maxFreeBids: number;
}

export function PaywallOverlay({ usedBids, maxFreeBids }: PaywallOverlayProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    // Legacy checkout - redirected to subscriptions page instead
    router.push("/dashboard/subscription");
  }

  return (
    <div className="relative min-h-[400px] w-full overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
      {/* Fake content background */}
      <div className="absolute inset-0 p-6 opacity-30 blur-sm pointer-events-none select-none" aria-hidden="true">
        <div className="h-8 w-1/3 bg-slate-200 rounded-lg mb-6" />
        <div className="space-y-4">
          <div className="h-24 w-full bg-white rounded-xl border border-slate-200" />
          <div className="h-24 w-full bg-white rounded-xl border border-slate-200" />
          <div className="h-24 w-full bg-white rounded-xl border border-slate-200" />
        </div>
      </div>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-white/95 backdrop-blur-[2px]" />

      {/* CTA Card */}
      <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl ring-1 ring-slate-900/5">
          <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-5">
            <Lock className="size-7" />
          </div>

          <h3 className="font-heading text-xl font-bold tracking-tight text-slate-900">
            Dostigli ste limit besplatnih ponuda
          </h3>

          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Iskoristili ste <span className="font-bold text-slate-900">{usedBids}</span> od <span className="font-bold text-slate-900">{maxFreeBids}</span> besplatnih ponuda.
            Pređite na Pro paket za neograničen pristup i napredne alate.
          </p>

          <div className="mt-6 flex items-baseline justify-center gap-1">
            <span className="font-heading text-3xl font-extrabold text-slate-900">100 KM</span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">/ mjesečno</span>
          </div>

          <Button
            className="mt-6 w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20"
            onClick={() => router.push("/dashboard/subscription")}
          >
            <Star className="mr-2 size-4 fill-current" />
            Pogledaj pakete
          </Button>

          <p className="mt-4 text-xs text-slate-400">
            Sigurno plaćanje. Otkazivanje u bilo kojem trenutku.
          </p>
        </div>
      </div>
    </div>
  );
}
