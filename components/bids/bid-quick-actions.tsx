"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BidStatus } from "@/types/database";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Edit, Loader2 } from "lucide-react";

interface BidQuickActionsProps {
  bidId: string;
  currentStatus: BidStatus;
}

export function BidQuickActions({ bidId, currentStatus }: BidQuickActionsProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);

  async function updateBidStatus(newStatus: BidStatus) {
    setUpdating(newStatus);
    try {
      await fetch(`/api/bids/${bidId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      {currentStatus !== "won" && currentStatus !== "lost" && (
        <>
          <Button
            variant="outline"
            size="sm"
            disabled={updating !== null}
            onClick={() => updateBidStatus("won")}
            className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
            title="Tender dobijen"
          >
            {updating === "won" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={updating !== null}
            onClick={() => updateBidStatus("lost")}
            className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            title="Tender nije prošao"
          >
            {updating === "lost" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
          </Button>
        </>
      )}
      <Link href={`/dashboard/bids/${bidId}`}>
        <Button variant="ghost" size="sm" className="h-8 px-2 rounded-lg text-slate-500 hover:text-primary hover:bg-blue-50">
          <Edit className="size-4 mr-1.5" />
          Uredi
        </Button>
      </Link>
    </div>
  );
}

