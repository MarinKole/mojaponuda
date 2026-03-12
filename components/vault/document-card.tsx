"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Document } from "@/types/database";
import {
  getExpiryStatus,
  getExpiryBadgeClasses,
  formatExpiryText,
} from "@/lib/vault/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Eye,
  Download,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface DocumentCardProps {
  document: Document;
}

export function DocumentCard({ document }: DocumentCardProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const expiryStatus = getExpiryStatus(document.expires_at);
  
  // Custom classes for the new dark theme
  const getCustomBadgeClasses = (status: string) => {
    switch (status) {
      case "danger":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      case "warning":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "ok":
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      default:
        return "text-slate-500 bg-slate-500/10 border-slate-500/20";
    }
  };
  
  const expiryBadgeClasses = getCustomBadgeClasses(expiryStatus);
  const expiryText = formatExpiryText(document.expires_at);

  async function handlePreview() {
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/documents/signed-url/${document.id}`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Preview error:", err);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDownload() {
    try {
      const res = await fetch(`/api/documents/signed-url/${document.id}`);
      const data = await res.json();
      if (data.url) {
        const link = window.document.createElement("a");
        link.href = data.url;
        link.download = document.name;
        link.click();
      }
    } catch (err) {
      console.error("Download error:", err);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${document.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteOpen(false);
        router.refresh();
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="group relative overflow-hidden border border-slate-800 bg-[#060b17] transition-colors hover:border-slate-700 hover:bg-[#0a1628]/50">
        {/* Colored left border stripe based on expiry status */}
        <div
          className={`absolute inset-y-0 left-0 w-1 ${
            expiryStatus === "danger"
              ? "bg-red-500 animate-pulse"
              : expiryStatus === "warning"
              ? "bg-amber-500"
              : expiryStatus === "ok"
              ? "bg-emerald-500"
              : "bg-slate-700"
          }`}
        />
        
        <div className="flex flex-col h-full p-4 pl-5">
          {/* Ikona i naziv */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex size-10 shrink-0 items-center justify-center border border-slate-800 bg-[#020611]">
              <FileText className="size-5 text-blue-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white mb-1" title={document.name}>
                {document.name}
              </p>
              {document.type && (
                <p className="truncate font-mono text-[9px] uppercase tracking-widest text-slate-500" title={document.type}>
                  TYPE: {document.type}
                </p>
              )}
            </div>
          </div>

          <div className="mt-auto space-y-4">
            {/* Status isteka */}
            <div
              className={`inline-flex w-full items-center gap-2 border px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest ${expiryBadgeClasses}`}
            >
              {expiryStatus === "danger" && (
                <AlertTriangle className="size-3 shrink-0" />
              )}
              <span className="truncate">{expiryText}</span>
            </div>

            {/* Akcije */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={previewLoading}
                className="flex-1 rounded-none border-slate-800 bg-[#020611] font-mono text-[10px] tracking-widest text-slate-400 hover:bg-blue-900/20 hover:text-blue-400 hover:border-blue-900/50"
              >
                {previewLoading ? (
                  <Loader2 className="mr-2 size-3 animate-spin" />
                ) : (
                  <Eye className="mr-2 size-3" />
                )}
                VIEW
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownload} 
                className="flex-1 rounded-none border-slate-800 bg-[#020611] font-mono text-[10px] tracking-widest text-slate-400 hover:bg-emerald-900/20 hover:text-emerald-400 hover:border-emerald-900/50"
              >
                <Download className="mr-2 size-3" />
                GET
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="shrink-0 rounded-none bg-red-950/30 text-red-500 hover:bg-red-900 hover:text-white"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog za potvrdu brisanja */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-none border border-slate-800 bg-[#060b17] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm text-red-500">SYSTEM_WARNING: FILE_DELETION</DialogTitle>
            <DialogDescription className="text-slate-400">
              Da li ste sigurni da želite obrisati dokument{" "}
              <strong className="text-white">{document.name}</strong>? Ova akcija se ne može poništiti i dokument će biti uklonjen iz svih povezanih ponuda.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="rounded-none border-slate-800 bg-transparent font-mono text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              ABORT
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-none font-mono text-xs"
            >
              {deleting ? (
                <Loader2 className="mr-2 size-3 animate-spin" />
              ) : null}
              CONFIRM_DELETE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
