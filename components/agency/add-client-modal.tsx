"use client";

import { useState } from "react";
import { X, Building2, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { RegionMultiSelect } from "@/components/ui/region-multi-select";
import { PRIMARY_INDUSTRY_OPTIONS } from "@/lib/company-profile";

interface AddClientModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "info" | "profile" | "crm";

export function AddClientModal({ onClose, onSuccess }: AddClientModalProps) {
  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic company info
  const [companyName, setCompanyName] = useState("");
  const [companyJib, setCompanyJib] = useState("");
  const [companyPdv, setCompanyPdv] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyContactEmail, setCompanyContactEmail] = useState("");
  const [companyContactPhone, setCompanyContactPhone] = useState("");

  // Step 2: Tender profile (same as onboarding)
  const [industry, setIndustry] = useState("");
  const [keywords, setKeywords] = useState("");
  const [operatingRegions, setOperatingRegions] = useState<string[]>([]);
  const [cpvCodes, setCpvCodes] = useState("");

  // Step 3: CRM data
  const [crmStage, setCrmStage] = useState("active");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit() {
    if (!companyName || !companyJib) {
      setError("Naziv i JIB firme su obavezni.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/agency/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          companyJib: companyJib.replace(/\s/g, ""),
          companyPdv,
          companyAddress,
          companyContactEmail,
          companyContactPhone,
          industry: industry || null,
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          cpvCodes: cpvCodes
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          operatingRegions,
          crmStage,
          monthlyFee: monthlyFee ? Number(monthlyFee) : null,
          contractStart: contractStart || null,
          contractEnd: contractEnd || null,
          notes: notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Greška pri dodavanju klijenta.");
        return;
      }
      onSuccess();
    } catch {
      setError("Greška pri komunikaciji sa serverom.");
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { id: "info", label: "Podaci o firmi" },
    { id: "profile", label: "Tender profil" },
    { id: "crm", label: "CRM detalji" },
  ] as const;

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900">Novi klijent</h2>
              <p className="text-xs text-slate-500">{steps[currentStepIndex].label}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="size-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex border-b border-slate-100 px-6 py-3">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => {
                  if (i < currentStepIndex || companyName) setStep(s.id);
                }}
                className={`text-xs font-semibold transition-colors ${
                  s.id === step ? "text-blue-600" : i < currentStepIndex ? "text-slate-700 hover:text-blue-600" : "text-slate-400"
                }`}
              >
                {i + 1}. {s.label}
              </button>
              {i < steps.length - 1 && (
                <ChevronRight className="mx-2 size-3 text-slate-300" />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === "info" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Naziv firme *" value={companyName} onChange={setCompanyName} placeholder="npr. AKOS d.o.o." />
                <Field label="JIB (identifikacijski broj) *" value={companyJib} onChange={setCompanyJib} placeholder="4200..." />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="PDV broj" value={companyPdv} onChange={setCompanyPdv} placeholder="200..." />
                <Field label="Adresa" value={companyAddress} onChange={setCompanyAddress} placeholder="Ul. Bosanska 1, Sarajevo" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email kontakt" value={companyContactEmail} onChange={setCompanyContactEmail} placeholder="info@kompanija.ba" type="email" />
                <Field label="Telefon" value={companyContactPhone} onChange={setCompanyContactPhone} placeholder="+387 33..." />
              </div>
            </div>
          )}

          {step === "profile" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Ovi podaci se koriste za preporuke tendera, analitiku tržišta i pregled konkurencije — identično kao za direktne naloge.
              </p>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Djelatnost</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Odaberi djelatnost...</option>
                  {PRIMARY_INDUSTRY_OPTIONS.map((o: { id: string; label: string }) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Ključne riječi (odvojene zarezom)</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="npr. pejzažna arhitektura, hortikultura, klupe"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">CPV kodovi (odvojeni zarezom)</label>
                <input
                  type="text"
                  value={cpvCodes}
                  onChange={(e) => setCpvCodes(e.target.value)}
                  placeholder="npr. 45112700, 77310000"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Lokacija (općine / kantoni)</label>
                <RegionMultiSelect
                  selectedRegions={operatingRegions}
                  onChange={setOperatingRegions}
                />
              </div>
            </div>
          )}

          {step === "crm" && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Faza saradnje</label>
                <select
                  value={crmStage}
                  onChange={(e) => setCrmStage(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="lead">Potencijalni klijent</option>
                  <option value="onboarding">Onboarding u toku</option>
                  <option value="active">Aktivan klijent</option>
                  <option value="paused">Pauziran</option>
                  <option value="churned">Otkazan</option>
                </select>
              </div>
              <Field
                label="Miesečna naknada (KM)"
                value={monthlyFee}
                onChange={setMonthlyFee}
                placeholder="npr. 149"
                type="number"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Početak ugovora" value={contractStart} onChange={setContractStart} type="date" />
                <Field label="Kraj ugovora" value={contractEnd} onChange={setContractEnd} type="date" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Bilješka</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Interne napomene o klijentu..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <button
            onClick={() => {
              if (step === "profile") setStep("info");
              else if (step === "crm") setStep("profile");
              else onClose();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="size-4" />
            {step === "info" ? "Odustani" : "Nazad"}
          </button>

          {step !== "crm" ? (
            <button
              onClick={() => {
                if (step === "info") {
                  if (!companyName || !companyJib) {
                    setError("Naziv i JIB firme su obavezni.");
                    return;
                  }
                  setError(null);
                  setStep("profile");
                } else {
                  setStep("crm");
                }
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Dalje
              <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Spremi klijenta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  );
}
