"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Briefcase } from "lucide-react";
import { PaywallModal } from "@/components/subscription/paywall-modal";

interface StartBidButtonProps {
  tenderId: string;
  existingBidId?: string | null;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
}

export function StartBidButton({ tenderId, existingBidId, variant = "default", className }: StartBidButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ limit: number; current: number } | null>(null);

  if (existingBidId) {
    return (
      <Button 
        variant={variant} 
        onClick={() => router.push(`/dashboard/bids/${existingBidId}`)}
        className={className}
      >
        <Briefcase className="mr-2 size-4" />
        Otvori ponudu
      </Button>
    );
  }

  async function handleStart() {
    setLoading(true);
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tender_id: tenderId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.code === "LIMIT_REACHED") {
          setLimitInfo({ limit: data.limit, current: data.current });
          setShowPaywall(true);
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Greška pri kreiranju ponude.");
      }

      if (data.bid?.id) {
        router.push(`/dashboard/bids/${data.bid.id}`);
      }
    } catch (err) {
      console.error("Start bid error:", err);
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={handleStart} disabled={loading} variant={variant} className={className}>
        {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Briefcase className="mr-2 size-4" />}
        Počni pripremu ponude
      </Button>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        title="Dostigli ste limit paketa"
        description={`Vaš trenutni paket omogućava maksimalno ${limitInfo?.limit} aktivnih tendera. Trenutno imate ${limitInfo?.current}. Nadogradite paket za više prostora.`}
        limitType="tenders"
      />
    </>
  );
}

