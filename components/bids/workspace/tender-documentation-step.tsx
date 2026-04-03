"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2, Sparkles } from "lucide-react";
import type { BidTenderSourceDocument } from "@/types/database";

type OcrPage = { pageNumber: number; text: string };

function isPdfFile(file: File): boolean {
  return file.type.toLowerCase().includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
}

async function clientOcrPdf(file: File): Promise<OcrPage[]> {
  const [{ getDocument }, tesseract] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("tesseract.js"),
  ]);

  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const maxPages = Math.min(pdf.numPages, 25);

  const worker = await tesseract.createWorker("eng");
  const pages: OcrPage[] = [];

  try {
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas nije dostupan za OCR.");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Ne mogu napraviti sliku za OCR."))), "image/png");
      });
      const result = await worker.recognize(blob);
      const text = (result.data.text || "").replace(/\s+/g, " ").trim();
      pages.push({ pageNumber: i, text });
    }
  } finally {
    await worker.terminate();
  }

  return pages;
}

interface TenderDocumentationStepProps {
  bidId: string;
  tenderTitle: string;
  sourceDocument: BidTenderSourceDocument | null;
}

export function TenderDocumentationStep({
  bidId,
  tenderTitle,
  sourceDocument,
}: TenderDocumentationStepProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFile = useCallback(() => {
    setError(null);
    inputRef.current?.click();
  }, []);

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      setBusy(true);
      setError(null);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/bids/${bidId}/tender-documentation`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 409 && data?.code === "OCR_REQUIRED" && isPdfFile(file)) {
            // Seamless OCR flow for scanned PDFs.
            const ocrPages = await clientOcrPdf(file);
            const res2 = await fetch(`/api/bids/${bidId}/tender-documentation-text`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                source_document_id: data.source_document_id,
                pages: ocrPages,
              }),
            });
            const data2 = await res2.json().catch(() => ({}));
            if (!res2.ok) {
              throw new Error(data2.error || "OCR analiza nije uspjela.");
            }
          } else {
            throw new Error(data.error || "Obrada dokumenta nije uspjela.");
          }
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Greška pri slanju.");
      } finally {
        setBusy(false);
      }
    },
    [bidId, router]
  );

  if (sourceDocument) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/90 px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tenderska dokumentacija
            </p>
            <p className="truncate text-sm font-medium text-slate-800" title={sourceDocument.name}>
              {sourceDocument.name}
            </p>
            <p className="text-xs text-slate-500">
              Lista zahtjeva ispod izvučena je iz ovog dokumenta. Možete učitati novu verziju —
              lista će se zamijeniti.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={onFile}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 font-semibold"
              disabled={busy}
              onClick={pickFile}
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileUp className="mr-2 size-4" />}
              Nova verzija
            </Button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-blue-100/80 bg-gradient-to-br from-blue-50/90 via-white to-white p-6 shadow-sm ring-1 ring-blue-500/5">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <Sparkles className="size-6" />
          </div>
          <div className="min-w-0 space-y-2">
            <h3 className="font-heading text-lg font-bold text-slate-900 leading-snug">
              Učitajte tendersku dokumentaciju
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">
              Za tender <span className="font-medium text-slate-800">{tenderTitle}</span> sistem će iz
              vašeg PDF-a, DOCX-a ili ZIP arhive izvući samo ono što je stvarno traženo — s referencom na
              stranicu, bez generičkih stavki.
            </p>
            <p className="text-xs text-slate-500">
              Podržano: PDF (s tekstom ili OCR), DOCX, ZIP s više PDF/DOCX datoteka. Stari .doc nije
              podržan — sačuvajte kao PDF ili DOCX.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={onFile}
          />
          <Button
            type="button"
            className="h-11 rounded-xl bg-blue-600 px-6 font-bold shadow-md shadow-blue-600/25 hover:bg-blue-700"
            disabled={busy}
            onClick={pickFile}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Analiziram dokumentaciju…
              </>
            ) : (
              <>
                <FileUp className="mr-2 size-4" />
                Odaberi datoteku
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
