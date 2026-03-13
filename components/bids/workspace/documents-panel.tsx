"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Document } from "@/types/database";
import { getExpiryStatus, getExpiryBadgeClasses, formatExpiryText } from "@/lib/vault/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Plus, X, AlertTriangle, Paperclip } from "lucide-react";

interface AttachedDoc {
  id: string;
  document: Document;
}

interface DocumentsPanelProps {
  bidId: string;
  attachedDocs: AttachedDoc[];
  vaultDocuments: Document[];
}

export function DocumentsPanel({
  bidId,
  attachedDocs,
  vaultDocuments,
}: DocumentsPanelProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  const attachedIds = new Set(attachedDocs.map((d) => d.document.id));
  const availableDocs = vaultDocuments.filter((d) => !attachedIds.has(d.id));

  async function handleAttach(documentId: string) {
    await fetch(`/api/bids/${bidId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: documentId }),
    });
    setAddOpen(false);
    router.refresh();
  }

  async function handleRemove(bidDocId: string) {
    await fetch(`/api/bids/${bidId}/documents/${bidDocId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6 rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-slate-900">
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Paperclip className="size-5" />
          </div>
          <h3 className="font-heading font-bold text-lg">
            Dokumenti
          </h3>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="rounded-xl font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary shadow-sm">
          <Plus className="mr-2 size-3.5" />
          Dodaj
        </Button>
      </div>

      {/* Lista priloženih dokumenata */}
      <div className="flex-1 space-y-3">
        {attachedDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <Paperclip className="size-8 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-900">Nema priloženih dokumenata</p>
            <p className="text-xs text-slate-500 max-w-[180px] mt-1">
              Priložite dokumente iz trezora koji nisu vezani za specifične stavke.
            </p>
          </div>
        ) : (
          attachedDocs.map((ad) => {
            const expiryStatus = getExpiryStatus(ad.document.expires_at);
            const badgeClasses = getExpiryBadgeClasses(expiryStatus);
            const expiryText = formatExpiryText(ad.document.expires_at);

            return (
              <div
                key={ad.id}
                className="group relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-all hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 mb-0.5">{ad.document.name}</p>
                  <div className="flex items-center gap-2">
                    {ad.document.type && (
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        {ad.document.type}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${badgeClasses}`}
                    >
                      {expiryStatus === "danger" && (
                        <AlertTriangle className="size-2.5" />
                      )}
                      {expiryText}
                    </span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 size-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  onClick={() => handleRemove(ad.id)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Dodaj iz Trezora */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="border-slate-100 bg-white sm:max-w-md p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-slate-900">Dodaj iz Trezora</DialogTitle>
            <DialogDescription className="text-slate-500">
              Odaberite dokument koji želite priložiti uz ovu ponudu.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
            {availableDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <FileText className="size-8 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-900">
                  {vaultDocuments.length === 0
                    ? "Trezor je prazan"
                    : "Svi dokumenti su već priloženi"}
                </p>
              </div>
            ) : (
              availableDocs.map((doc) => {
                const es = getExpiryStatus(doc.expires_at);
                const bc = getExpiryBadgeClasses(es);
                return (
                  <button
                    key={doc.id}
                    onClick={() => handleAttach(doc.id)}
                    className="group flex w-full items-center gap-4 rounded-xl border border-slate-100 bg-white p-3 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 group-hover:text-indigo-900">{doc.name}</p>
                      {doc.type && (
                        <p className="text-xs text-slate-500">{doc.type}</p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${bc}`}>
                      {formatExpiryText(doc.expires_at)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
