"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Briefcase } from "lucide-react";

interface StartBidButtonProps {
  tenderId: string;
  existingBidId?: string | null;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
}

export function StartBidButton({ tenderId, existingBidId, variant = "default", className }: StartBidButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
      if (data.bid?.id) {
        router.push(`/dashboard/bids/${data.bid.id}`);
      }
    } catch (err) {
      console.error("Start bid error:", err);
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleStart} disabled={loading} variant={variant} className={className}>
      {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Briefcase className="mr-2 size-4" />}
      Počni pripremu ponude
    </Button>
  );
}
