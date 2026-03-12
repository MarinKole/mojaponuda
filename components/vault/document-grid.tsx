"use client";

import { useState, useMemo } from "react";
import type { Document } from "@/types/database";
import { DOCUMENT_TYPES, getExpiryStatus } from "@/lib/vault/constants";
import { DocumentCard } from "@/components/vault/document-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Database } from "lucide-react";

interface DocumentGridProps {
  documents: Document[];
}

export function DocumentGrid({ documents }: DocumentGridProps) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");

  // Dokumenti koji ističu u 30 dana
  const expiringDocs = useMemo(
    () =>
      documents.filter((doc) => {
        const status = getExpiryStatus(doc.expires_at);
        return status === "danger";
      }),
    [documents]
  );

  // Filtrirani dokumenti
  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (typeFilter !== "all" && doc.type !== typeFilter) return false;

      if (expiryFilter !== "all") {
        const status = getExpiryStatus(doc.expires_at);
        if (expiryFilter === "danger" && status !== "danger") return false;
        if (expiryFilter === "warning" && status !== "warning") return false;
        if (expiryFilter === "ok" && status !== "ok") return false;
        if (expiryFilter === "none" && status !== "none") return false;
      }

      return true;
    });
  }, [documents, typeFilter, expiryFilter]);

  return (
    <div className="space-y-6">
      {/* Banner upozorenja za dokumente koji ističu */}
      {expiringDocs.length > 0 && (
        <div className="flex items-center gap-4 border border-red-900/50 bg-red-950/20 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center bg-red-500/10">
            <AlertTriangle className="size-5 text-red-500 animate-pulse" />
          </div>
          <div>
            <p className="font-mono text-xs font-bold text-red-500">
              SYSTEM_ALERT: {expiringDocs.length === 1 ? "1_DOCUMENT_EXPIRING" : `${expiringDocs.length}_DOCUMENTS_EXPIRING`}
            </p>
            <p className="mt-1 font-mono text-[10px] text-red-400/70">
              TARGETS: {expiringDocs.map((d) => d.name.toUpperCase()).join(" | ")}
            </p>
          </div>
        </div>
      )}

      {/* Filteri */}
      <div className="flex flex-wrap gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-2">
          <label className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-500">
            FILTER_BY_TYPE
          </label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[240px] rounded-none border-slate-800 bg-[#060b17] font-mono text-xs focus:ring-0 focus:border-blue-500">
              <SelectValue placeholder="SVI_TIPOVI" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-slate-800 bg-[#060b17] font-mono text-xs">
              <SelectItem value="all" className="focus:bg-blue-500/20 focus:text-white">SVI_TIPOVI</SelectItem>
              {DOCUMENT_TYPES.map((dt) => (
                <SelectItem key={dt} value={dt} className="focus:bg-blue-500/20 focus:text-white">
                  {dt.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-500">
            FILTER_BY_STATUS
          </label>
          <Select value={expiryFilter} onValueChange={setExpiryFilter}>
            <SelectTrigger className="w-[240px] rounded-none border-slate-800 bg-[#060b17] font-mono text-xs focus:ring-0 focus:border-blue-500">
              <SelectValue placeholder="SVI_STATUSI" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-slate-800 bg-[#060b17] font-mono text-xs">
              <SelectItem value="all" className="focus:bg-blue-500/20 focus:text-white">SVI_STATUSI</SelectItem>
              <SelectItem value="danger" className="text-red-400 focus:bg-red-500/20 focus:text-red-300">CRITICAL_(&lt;30d)</SelectItem>
              <SelectItem value="warning" className="text-amber-400 focus:bg-amber-500/20 focus:text-amber-300">WARNING_(30-60d)</SelectItem>
              <SelectItem value="ok" className="text-emerald-400 focus:bg-emerald-500/20 focus:text-emerald-300">OPTIMAL_(&gt;60d)</SelectItem>
              <SelectItem value="none" className="focus:bg-blue-500/20 focus:text-white">NO_EXPIRY</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-slate-800 bg-[#020611] py-20">
          <Database className="size-8 text-slate-800 mb-4" />
          <p className="font-mono text-xs text-slate-500">
            {documents.length === 0
              ? "VAULT_EMPTY // NO_DOCUMENTS_FOUND"
              : "QUERY_RETURNED_0_RESULTS"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
