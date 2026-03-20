"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardPen,
  Flame,
  Landmark,
  MapPin,
  PhoneCall,
  Radar,
  Save,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminLeadOutreachStatus,
  AdminPortalLead,
  AdminPortalLeadsData,
  AdminPortalLeadTemperature,
} from "@/lib/admin-portal-leads";
import { cn } from "@/lib/utils";

interface AdminPortalLeadsShellProps {
  data: AdminPortalLeadsData;
  adminEmail: string;
}

const statusOptions: Array<{ value: AdminLeadOutreachStatus | "all"; label: string }> = [
  { value: "all", label: "Svi statusi" },
  { value: "nije_kontaktiran", label: "Nije kontaktiran" },
  { value: "u_toku", label: "U toku" },
  { value: "kontaktiran", label: "Kontaktiran" },
  { value: "pauza", label: "Pauza" },
];

const temperatureOptions: Array<{ value: AdminPortalLeadTemperature | "all"; label: string }> = [
  { value: "all", label: "Svi leadovi" },
  { value: "Vruć lead", label: "Vruć lead" },
  { value: "Dobar lead", label: "Dobar lead" },
  { value: "Pratiti", label: "Pratiti" },
];

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("bs-BA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("bs-BA", {
    style: "currency",
    currency: "BAM",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocalValue(value: string): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function getTemperatureTone(temperature: AdminPortalLeadTemperature): string {
  switch (temperature) {
    case "Vruć lead":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "Dobar lead":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getStatusTone(status: AdminLeadOutreachStatus): string {
  switch (status) {
    case "kontaktiran":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "u_toku":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "pauza":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getStatusLabel(status: AdminLeadOutreachStatus): string {
  switch (status) {
    case "nije_kontaktiran":
      return "Nije kontaktiran";
    case "u_toku":
      return "U toku";
    case "kontaktiran":
      return "Kontaktiran";
    default:
      return "Pauza";
  }
}

function SummaryCard({
  title,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  hint: string;
  icon: typeof Flame;
  tone: "rose" | "amber" | "blue" | "slate";
}) {
  const toneMap: Record<typeof tone, string> = {
    rose: "from-rose-600/12 via-pink-500/10 to-white border-rose-200/70 text-rose-700",
    amber: "from-amber-600/12 via-orange-500/10 to-white border-amber-200/70 text-amber-700",
    blue: "from-blue-600/12 via-cyan-500/10 to-white border-blue-200/70 text-blue-700",
    slate: "from-slate-500/10 via-slate-400/8 to-white border-slate-200/70 text-slate-700",
  };

  return (
    <Card className={cn("overflow-hidden border bg-[linear-gradient(135deg,var(--tw-gradient-stops))] shadow-[0_18px_48px_-30px_rgba(15,23,42,0.28)]", toneMap[tone])}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</CardDescription>
          <CardTitle className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</CardTitle>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm">
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-600">{hint}</p>
      </CardContent>
    </Card>
  );
}

function LeadCard({
  lead,
  onLeadSaved,
}: {
  lead: AdminPortalLead;
  onLeadSaved: (lead: AdminPortalLead) => void;
}) {
  const [note, setNote] = useState(lead.note);
  const [outreachStatus, setOutreachStatus] = useState<AdminLeadOutreachStatus>(lead.outreachStatus);
  const [lastContactedAt, setLastContactedAt] = useState(toDateTimeLocalValue(lead.lastContactedAt));
  const [nextFollowUpAt, setNextFollowUpAt] = useState(toDateTimeLocalValue(lead.nextFollowUpAt));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch(`/api/admin/portal-leads/${encodeURIComponent(lead.jib)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadName: lead.companyName,
          note,
          outreachStatus,
          lastContactedAt: fromDateTimeLocalValue(lastContactedAt),
          nextFollowUpAt: fromDateTimeLocalValue(nextFollowUpAt),
        }),
      });

      const payload = (await response.json()) as
        | {
            lead?: AdminPortalLead;
            error?: string;
          }
        | undefined;

      if (!response.ok || !payload?.lead) {
        throw new Error(payload?.error ?? "Ne mogu sačuvati lead bilješku.");
      }

      onLeadSaved(payload.lead);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Greška pri snimanju.");
    } finally {
      setSaving(false);
    }
  }

  function markContactedNow() {
    const now = new Date();
    const pad = (input: number) => String(input).padStart(2, "0");
    const localValue = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setLastContactedAt(localValue);
    setOutreachStatus("kontaktiran");
  }

  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-slate-950">{lead.companyName}</CardTitle>
              <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getTemperatureTone(lead.temperature))}>
                {lead.temperature}
              </Badge>
              <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getStatusTone(lead.outreachStatus))}>
                {getStatusLabel(lead.outreachStatus)}
              </Badge>
              {lead.isTracked ? (
                <Badge variant="outline" className="rounded-full border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  Praćen
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
              <span>JIB: {lead.jib}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {lead.city ?? lead.municipality ?? "Lokacija nije dostupna"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Landmark className="size-3.5" />
                {lead.mainAuthorityName ?? "Nema dominantnog naručioca"}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Lead score</p>
            <p className="mt-1 text-3xl font-bold text-slate-950">{lead.score}</p>
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-600">{lead.recommendedAction}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Portal aktivnost</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{lead.totalWinsCount} pobjeda · {lead.totalBidsCount} postupaka</p>
            <p className="mt-1 text-xs text-slate-500">Win rate: {lead.winRate ?? 0}%</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Vrijednost</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(lead.totalWonValue)}</p>
            <p className="mt-1 text-xs text-slate-500">Zadnjih 180 dana: {formatCurrency(lead.recentWonValue180d)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Svježina</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{lead.recentAwards180d} dodjela / 180 dana</p>
            <p className="mt-1 text-xs text-slate-500">Zadnja dodjela: {formatDateTime(lead.lastAwardDate)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Pipeline</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{lead.authorityPlannedCount90d} planiranih nabavki</p>
            <p className="mt-1 text-xs text-slate-500">{formatCurrency(lead.authorityPlannedValue90d)}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Zašto je dobar kandidat</p>
              <div className="mt-3 space-y-2">
                {lead.reasons.map((reason) => (
                  <div key={reason} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Portal podaci</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm text-slate-700">
                <div>
                  <p className="font-medium text-slate-900">Dominantni naručilac</p>
                  <p className="mt-1">{lead.mainAuthorityName ?? "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">{lead.mainAuthorityLocation ?? "Lokacija naručioca nije dostupna"}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Tip postupka / ugovora</p>
                  <p className="mt-1">{lead.lastProcedureType ?? "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">{lead.lastContractType ?? "Tip ugovora nije dostupan"}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Prosjek ponuđača</p>
                  <p className="mt-1">{lead.averageBidders ?? "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">Po javno dostupnim dodjelama</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Zadnja vrijednost dodjele</p>
                  <p className="mt-1">{lead.lastWinningPrice ? formatCurrency(lead.lastWinningPrice) : "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">Na osnovu najnovije pronađene dodjele</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2">
              <ClipboardPen className="size-4 text-blue-700" />
              <p className="text-sm font-semibold text-slate-900">Admin notes i follow-up</p>
            </div>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Status outreacha</span>
              <select
                value={outreachStatus}
                onChange={(event) => setOutreachStatus(event.target.value as AdminLeadOutreachStatus)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              >
                {statusOptions.slice(1).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Zadnji kontakt</span>
                <input
                  type="datetime-local"
                  value={lastContactedAt}
                  onChange={(event) => setLastContactedAt(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Sljedeći follow-up</span>
                <input
                  type="datetime-local"
                  value={nextFollowUpAt}
                  onChange={(event) => setNextFollowUpAt(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Interne bilješke</span>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={6}
                placeholder="Zašto je vrijedan lead, kako mu se javiti, koji angle koristiti, šta provjeriti ručno..."
                className="min-h-[150px] rounded-2xl border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={markContactedNow}>
                <PhoneCall className="size-4" />
                Označi kontakt danas
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                <Save className="size-4" />
                {saving ? "Snima se..." : "Sačuvaj"}
              </Button>
              {saved ? <span className="text-xs font-medium text-emerald-600">Sačuvano</span> : null}
              {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
              <p>Posljednja izmjena: {formatDateTime(lead.noteUpdatedAt)}</p>
              <p className="mt-1">Ove bilješke su privatne i služe samo admin outreach radu.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminPortalLeadsShell({ data, adminEmail }: AdminPortalLeadsShellProps) {
  const [leads, setLeads] = useState(data.leads);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AdminLeadOutreachStatus | "all">("all");
  const [temperature, setTemperature] = useState<AdminPortalLeadTemperature | "all">("all");
  const [sortBy, setSortBy] = useState<"score" | "fresh" | "value">("score");

  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...leads]
      .filter((lead) => {
        if (status !== "all" && lead.outreachStatus !== status) {
          return false;
        }

        if (temperature !== "all" && lead.temperature !== temperature) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [
          lead.companyName,
          lead.jib,
          lead.city,
          lead.municipality,
          lead.mainAuthorityName,
          lead.mainAuthorityLocation,
          ...lead.reasons,
          lead.note,
        ]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
        if (sortBy === "fresh") {
          return new Date(b.lastAwardDate ?? 0).getTime() - new Date(a.lastAwardDate ?? 0).getTime();
        }

        if (sortBy === "value") {
          return b.totalWonValue - a.totalWonValue || b.score - a.score;
        }

        return b.score - a.score || b.recentAwards180d - a.recentAwards180d || b.totalWonValue - a.totalWonValue;
      });
  }, [leads, query, sortBy, status, temperature]);

  function handleLeadSaved(updatedLead: AdminPortalLead) {
    setLeads((current) => current.map((lead) => (lead.jib === updatedLead.jib ? updatedLead : lead)));
  }

  return (
    <div className="space-y-8 pb-4">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,rgba(8,17,31,0.98)_0%,rgba(15,35,70,0.98)_48%,rgba(14,59,95,0.95)_100%)] p-8 text-white shadow-[0_45px_90px_-45px_rgba(2,6,23,0.85)]">
        <div className="flex flex-col gap-6 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div className="max-w-4xl space-y-4">
            <Badge variant="outline" className="border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">
              Admin lead engine
            </Badge>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Najbolji portal leadovi za outreach prema firmama koje već rade javne nabavke
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Ova lista isključuje postojeće klijente i rangira firme iz javnih portal podataka prema svježini aktivnosti, pobjedama, vrijednosti, konkurentskom pritisku i pipeline signalu kod njihovih dominantnih naručilaca.
              </p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3 2xl:min-w-[760px]">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Admin račun</p>
              <p className="mt-2 text-sm font-semibold text-white">{adminEmail}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Lead lista generisana</p>
              <p className="mt-2 text-sm font-semibold text-white">{formatDateTime(data.generatedAt)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Prvo danas</p>
              <p className="mt-2 text-sm font-semibold text-white">{data.hotLeads} vrućih · {data.notContactedCount} neobrađenih · {data.pipelineLeads} sa pipeline signalom</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Vrući leadovi" value={String(leads.filter((lead) => lead.temperature === "Vruć lead").length)} hint="Najbolji kandidati za javljanje odmah" icon={Flame} tone="rose" />
        <SummaryCard title="Nije kontaktiran" value={String(leads.filter((lead) => lead.outreachStatus === "nije_kontaktiran").length)} hint="Leadovi bez ikakvog zabilježenog follow-upa" icon={PhoneCall} tone="amber" />
        <SummaryCard title="Imaju pipeline" value={String(leads.filter((lead) => lead.authorityPlannedCount90d > 0).length)} hint="Dominantni naručioci već imaju nove planirane nabavke" icon={Radar} tone="blue" />
        <SummaryCard title="Bilješke postoje" value={String(leads.filter((lead) => lead.note.trim().length > 0).length)} hint="Leadovi na kojima si već ostavio interni kontekst" icon={ClipboardPen} tone="slate" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,220px))]">
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Pretraga</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Firma, JIB, grad, naručilac, razlog, notes..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Temperatura</span>
            <select
              value={temperature}
              onChange={(event) => setTemperature(event.target.value as AdminPortalLeadTemperature | "all")}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              {temperatureOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Outreach status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as AdminLeadOutreachStatus | "all")}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Sortiranje</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as "score" | "fresh" | "value")}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              <option value="score">Najbolji score</option>
              <option value="fresh">Najsvježija aktivnost</option>
              <option value="value">Najveća vrijednost</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Prikazano leadova</p>
            <p className="mt-1">{filteredLeads.length} od {leads.length} rangiranih kandidata</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Kako se rangira</p>
            <p className="mt-1">Svježina aktivnosti, broj pobjeda, vrijednost, konkurencija i budući pipeline.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Zašto bez AI-a ovdje</p>
            <p className="mt-1">Ovaj score je deterministički i objašnjiv, pa znaš tačno zašto je lead visoko rangiran.</p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {filteredLeads.length === 0 ? (
          <Card className="border-dashed border-slate-200 bg-slate-50/70">
            <CardContent className="px-6 py-10 text-center text-sm text-slate-500">
              Nema leadova za odabrane filtere.
            </CardContent>
          </Card>
        ) : (
          filteredLeads.map((lead) => <LeadCard key={lead.jib} lead={lead} onLeadSaved={handleLeadSaved} />)
        )}
      </section>
    </div>
  );
}
