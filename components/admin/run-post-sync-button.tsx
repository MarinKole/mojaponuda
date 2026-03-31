"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface SyncResult {
  opportunities_processed: number;
  opportunities_published: number;
  duration_ms: number;
}

export function RunPostSyncButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleSync() {
    setIsLoading(true);
    
    try {
      const res = await fetch("/api/admin/trigger-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Greška pri pokretanju scrapera.");
      }

      const result = data as SyncResult;
      
      toast({
        title: "Scraper uspješno pokrenut",
        description: `Obrađeno: ${result.opportunities_processed} prilike, Objavljeno: ${result.opportunities_published}. Trajanje: ${Math.round(result.duration_ms / 1000)}s`,
      });

      // Refresh the page to show updated data
      window.location.reload();
    } catch (err) {
      console.error("Sync error:", err);
      const message = err instanceof Error ? err.message : "Greška pri pokretanju scrapera.";
      
      toast({
        variant: "destructive",
        title: "Greška",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      onClick={handleSync}
      disabled={isLoading}
      className="rounded-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Pokrećem scraper...
        </>
      ) : (
        <>
          <Play className="mr-2 size-4" />
          Pokreni scraper
        </>
      )}
    </Button>
  );
}
