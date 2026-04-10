"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Building2, Loader2, ChevronRight, ChevronLeft, Check, MapPin } from "lucide-react";
import { RegionMultiSelect } from "@/components/ui/region-multi-select";
import {
  OFFERING_CATEGORY_GROUPS,
  OFFERING_CATEGORY_OPTIONS,
  TENDER_TYPE_OPTIONS,
  getCategorySpecializationOptions,
  getProfileOptionLabel,
  derivePrimaryIndustry,
} from "@/lib/company-profile";
import { cn } from "@/lib/utils";

interface AddClientModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "info" | "focus" | "precision" | "description" | "crm";

export function AddClientModal({ onClose, onSuccess }: AddClientModalProps) {
  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic company info
  const [companyName, setCompanyName] = useState("");
  const [companyJib, setCompanyJib] = useState("");
  const [companyPdv, setCompanyPdv] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyContactEmail, setCompanyContactEmail] = useState("");
  const [companyContactPhone, setCompanyContactPhone] = useState("");

  // Step 2: Focus — offering categories + regions (same as onboarding)
  const [offeringCategories, setOfferingCategories] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);

  // Step 3: Precision — tender types + specializations
  const [preferredTenderTypes, setPreferredTenderTypes] = useState<string[]>([]);
  const [specializationIds, setSpecializationIds] = useState<string[]>([]);

  // Step 4: Description
  const [description, setDescription] = useState("");

  // Step 5: CRM data
  const [crmStage, setCrmStage] = useState("active");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [notes, setNotes] = useState("");

  const derivedPrimaryIndustry = useMemo(
    () => derivePrimaryIndustry(offeringCategories, null),
    [offeringCategories]
  );

  const specializationSections = useMemo(
    () =>
      offeringCategories
        .map((categoryId) => {
          const options = getCategorySpecializationOptions(categoryId);
          return options.length > 0
            ? { categoryId, categoryLabel: getProfileOptionLabel(categoryId), options }
            : null;
        })
        .filter(
          (s): s is { categoryId: string; categoryLabel: string; options: ReturnType<typeof getCategorySpecializationOptions> } =>
            Boolean(s)
        ),
    [offeringCategories]
  );

  useEffect(() => {
    const allowedIds = new Set(
      offeringCategories.flatMap((cId) =>
        getCategorySpecializationOptions(cId).map((o) => o.id)
      )
    );
    setSpecializationIds((cur) => cur.filter((id) => allowedIds.has(id)));
  }, [offeringCategories]);

  function toggleSelection(value: string, items: string[], setItems: (next: string[]) => void) {
    setItems(items.includes(value) ? items.filter((i) => i !== value) : [...items, value]);
  }

  async function handleSubmit() {
    if (!companyName || !companyJib) {
      setError("Naziv i JIB firme su obavezni.");
      return;
    }
    if (offeringCategories.length === 0) {
      setError("Odaberite barem jednu djelatnost klijenta.");
      return;
    }
    setLoading(true);
    setLoadingText("Analiziram profil klijenta...");
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
          offeringCategories,
          specializationIds,
          preferredTenderTypes,
          operatingRegions: regions,
          description: description || null,
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
    { id: "info" as const, label: "Podaci o firmi" },
    { id: "focus" as const, label: "Čime se bave" },
    { id: "precision" as const, label: "Preciziranje" },
    { id: "description" as const, label: "Opis firme" },
    { id: "crm" as const, label: "CRM detalji" },
  ];

  const stepOrder: Step[] = ["info", "focus", "precision", "description", "crm"];
  const currentStepIndex = stepOrder.indexOf(step);

  function goBack() {
    if (currentStepIndex > 0) setStep(stepOrder[currentStepIndex - 1]);
    else onClose();
  }

  function goNext() {
    setError(null);
    if (step === "info") {
      if (!companyName || !companyJib) {
        setError("Naziv i JIB firme su obavezni.");
        return;
      }
      setStep("focus");
    } else if (step === "focus") {
      if (offeringCategories.length === 0) {
        setError("Odaberite barem jednu stvar koju firma klijenta radi.");
        return;
      }
      setStep("precision");
    } else if (step === "precision") {
      setStep("description");
    } else if (step === "description") {
      setStep("crm");
    }
  }

  const isLastStep = step === "crm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl">
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
        <div className="flex flex-wrap gap-1 border-b border-slate-100 px-6 py-3">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => { if (i <= currentStepIndex) { setError(null); setStep(s.id); } }}
                className={`text-xs font-semibold transition-colors ${
                  s.id === step ? "text-blue-600" : i < currentStepIndex ? "text-slate-700 hover:text-blue-600" : "text-slate-400"
                }`}
              >
                {i + 1}. {s.label}
              </button>
              {i < steps.length - 1 && <ChevronRight className="mx-1.5 size-3 text-slate-300" />}
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

          {/* Step 1: Company Info */}
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

          {/* Step 2: Focus — Offering Categories + Regions */}
          {step === "focus" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <p className="text-sm font-semibold text-slate-900">Odaberite šta firma klijenta radi</p>
                <p className="mt-1 text-sm text-slate-600">
                  Identično kao kod samostalnog onboardinga — na osnovu ovoga sistem preporučuje tendere, analitiku i konkurenciju.
                </p>
              </div>

              {OFFERING_CATEGORY_GROUPS.map((group) => {
                const groupOptions = OFFERING_CATEGORY_OPTIONS.filter((o) => group.optionIds.includes(o.id));
                return (
                  <div key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-900">{group.label}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {groupOptions.map((option) => {
                        const selected = offeringCategories.includes(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleSelection(option.id, offeringCategories, setOfferingCategories)}
                            className={cn(
                              "rounded-xl border p-3 text-left transition-all",
                              selected
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            )}
                          >
                            <p className={cn("text-xs font-semibold", selected ? "text-white" : "text-slate-900")}>{option.label}</p>
                            <p className={cn("mt-1 text-xs leading-5", selected ? "text-slate-300" : "text-slate-500")}>{option.description}</p>
                            {selected && <Check className="mt-1 size-3.5 text-blue-200" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <MapPin className="size-4 text-blue-600" />
                  <p className="text-sm font-semibold">Lokacija klijenta</p>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Općine / kantoni u kojima klijent posluje. Ako ne odaberete ništa, preporuke će pokrivati cijelu BiH.
                </p>
                <div className="mt-3">
                  <RegionMultiSelect selectedRegions={regions} onChange={setRegions} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Precision — Tender Types + Specializations */}
          {step === "precision" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <p className="text-sm font-semibold text-slate-900">Preciznije usmjerite preporuke</p>
                <p className="mt-1 text-sm text-slate-600">
                  Opcionalno. Pomažu da preporuke tačnije pogode prave tendere za klijenta.
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700">Vrste tendera</p>
                <p className="mt-1 text-sm text-slate-500">Odaberite sve što je relevantno za klijenta.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {TENDER_TYPE_OPTIONS.map((option) => {
                  const selected = preferredTenderTypes.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleSelection(option.id, preferredTenderTypes, setPreferredTenderTypes)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        selected ? "border-blue-200 bg-blue-50/80 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <p className="text-xs font-semibold text-slate-900">{option.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p>
                      {selected && <Check className="mt-1 size-3.5 text-blue-700" />}
                    </button>
                  );
                })}
              </div>

              {specializationSections.length > 0 && (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-sm font-semibold text-slate-900">Uži smjerovi po djelatnosti</p>
                  {specializationSections.map((section) => (
                    <div key={section.categoryId} className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="mb-3 text-sm font-semibold text-slate-900">{section.categoryLabel}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {section.options.map((option) => {
                          const selected = specializationIds.includes(option.id);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => toggleSelection(option.id, specializationIds, setSpecializationIds)}
                              className={cn(
                                "rounded-xl border p-3 text-left transition-all",
                                selected ? "border-blue-200 bg-blue-50/80" : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
                              )}
                            >
                              <p className="text-xs font-semibold text-slate-900">{option.label}</p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p>
                              {selected && <Check className="mt-1 size-3.5 text-blue-700" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Description */}
          {step === "description" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <p className="text-sm font-semibold text-slate-900">Opišite firmu klijenta</p>
                <p className="mt-1 text-sm text-slate-600">
                  Uključite usluge, proizvode, reference, specijalizacije — što konkretnije, to preciznije preporuke.
                </p>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Npr. Firma se bavi implementacijom poslovnog softvera, održavanjem mrežne infrastrukture, isporukom servera i obukom korisnika za javni sektor..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />

              {(offeringCategories.length > 0 || regions.length > 0) && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-sm font-semibold text-slate-900">Sažetak profila klijenta</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {derivedPrimaryIndustry && (
                      <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        {getProfileOptionLabel(derivedPrimaryIndustry)}
                      </span>
                    )}
                    {offeringCategories.map((id) => (
                      <span key={id} className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
                        {getProfileOptionLabel(id)}
                      </span>
                    ))}
                    {preferredTenderTypes.map((id) => (
                      <span key={id} className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {getProfileOptionLabel(id)}
                      </span>
                    ))}
                    {regions.length > 0 ? (
                      <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-700">
                        {regions.length} regija
                      </span>
                    ) : (
                      <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-700">
                        Cijela BiH
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: CRM */}
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
              <Field label="Mjesečna naknada (KM)" value={monthlyFee} onChange={setMonthlyFee} placeholder="npr. 149" type="number" />
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
            onClick={goBack}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="size-4" />
            {step === "info" ? "Odustani" : "Nazad"}
          </button>

          {!isLastStep ? (
            <button
              onClick={goNext}
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
              {loading ? loadingText : "Spremi klijenta"}
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
        lang={type === "date" ? "bs-BA" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  );
}
