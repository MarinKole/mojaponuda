import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CircleAlert,
  CreditCard,
  Database,
  FileText,
  Gauge,
  RefreshCcw,
  ShieldCheck,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ActivationCohortChart,
  DailyMomentumChart,
  PlanMixChart,
  ProductUsageBars,
} from "@/components/admin/admin-dashboard-charts";
import type { AdminDashboardData, AdminDashboardRow, AdminSyncStatusItem } from "@/lib/admin-dashboard";
import { cn } from "@/lib/utils";

interface AdminDashboardShellProps {
  data: AdminDashboardData;
  adminEmail: string;
}

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

function formatCompactCurrency(value: number | null | undefined): string {
  const amount = Number(value) || 0;

  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M KM`;
  }

  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K KM`;
  }

  return `${Math.round(amount)} KM`;
}

function formatStorage(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${value}%`;
}

function getSubscriptionTone(status: string): string {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "past_due":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getFreshnessTone(freshness: AdminSyncStatusItem["freshness"]): string {
  switch (freshness) {
    case "healthy":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "stale":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getHealthTone(status: AdminDashboardRow["healthStatus"]): string {
  switch (status) {
    case "Odličan":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Pažnja":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

function getCommercialTone(signal: string): string {
  if (signal.includes("Kandidat") || signal.includes("Spreman")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (signal.includes("riziku") || signal.includes("Zastoj")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  iconTone = "text-blue-700",
}: {
  icon: typeof Activity;
  eyebrow: string;
  title: string;
  description: string;
  iconTone?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
        <div className="flex items-center gap-2">
          <Icon className={cn("size-4", iconTone)} />
          <h2 className="font-heading text-xl font-bold text-slate-950">{title}</h2>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function FocusStatCard({
  title,
  value,
  meta,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  meta: string;
  icon: typeof Activity;
  tone: "blue" | "emerald" | "violet" | "amber" | "rose" | "slate";
}) {
  const toneMap: Record<typeof tone, string> = {
    blue: "from-blue-600/12 via-cyan-500/10 to-white border-blue-200/70 text-blue-700",
    emerald: "from-emerald-600/12 via-teal-500/10 to-white border-emerald-200/70 text-emerald-700",
    violet: "from-violet-600/12 via-fuchsia-500/10 to-white border-violet-200/70 text-violet-700",
    amber: "from-amber-500/12 via-orange-400/10 to-white border-amber-200/70 text-amber-700",
    rose: "from-rose-500/12 via-pink-400/10 to-white border-rose-200/70 text-rose-700",
    slate: "from-slate-400/10 via-slate-300/8 to-white border-slate-200/70 text-slate-700",
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
        <p className="text-sm leading-6 text-slate-600">{meta}</p>
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SyncStatusCard({ item }: { item: AdminSyncStatusItem }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{item.endpoint}</p>
          <p className="mt-1 text-xs text-slate-500">Zadnji prolaz: {formatDateTime(item.ranAt)}</p>
        </div>
        <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getFreshnessTone(item.freshness))}>
          {item.freshness === "healthy"
            ? "Svježe"
            : item.freshness === "warning"
              ? "Provjeriti"
              : item.freshness === "stale"
                ? "Zastario"
                : "Nema podatka"}
        </Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Dodano</p>
          <p className="mt-1 font-semibold text-slate-900">{item.recordsAdded}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Ažurirano</p>
          <p className="mt-1 font-semibold text-slate-900">{item.recordsUpdated}</p>
        </div>
      </div>
    </div>
  );
}

function AccountsTable({ rows }: { rows: AdminDashboardRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
            <th className="px-4 py-3 font-semibold">Račun</th>
            <th className="px-4 py-3 font-semibold">Firma</th>
            <th className="px-4 py-3 font-semibold">Plan</th>
            <th className="px-4 py-3 font-semibold">Health</th>
            <th className="px-4 py-3 font-semibold">Aktivnost</th>
            <th className="px-4 py-3 font-semibold">Signal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.userId} className="align-top">
              <td className="px-4 py-4">
                <div>
                  <p className="font-semibold text-slate-900">{row.email}</p>
                  <p className="mt-1 text-xs text-slate-500">Registrovan: {formatDateTime(row.createdAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">Zadnji sign-in: {formatDateTime(row.lastSignInAt)}</p>
                </div>
              </td>
              <td className="px-4 py-4">
                <div>
                  <p className="font-medium text-slate-900">{row.companyName ?? "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.primaryIndustryLabel ?? "Profil nije preciziran"}</p>
                  <p className="mt-1 text-xs text-slate-500">Regije: {row.regionsLabel}</p>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="space-y-2">
                  <p className="font-medium text-slate-900">{row.planName}</p>
                  <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getSubscriptionTone(row.subscriptionStatus))}>
                    {row.subscriptionStatus}
                  </Badge>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="space-y-2">
                  <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getHealthTone(row.healthStatus))}>
                    {row.healthStatus}
                  </Badge>
                  <p className="text-xs text-slate-500">Score {row.healthScore}/100</p>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="space-y-1 text-xs text-slate-600">
                  <p>{row.documentsCount} dok.</p>
                  <p>{row.activeBids} aktivnih ponuda</p>
                  <p>{formatStorage(row.storageBytes)}</p>
                </div>
              </td>
              <td className="px-4 py-4">
                <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getCommercialTone(row.commercialSignal))}>
                  {row.commercialSignal}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccountList({
  rows,
  emptyLabel,
}: {
  rows: AdminDashboardRow[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.userId} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{row.companyName ?? row.email}</p>
              <p className="mt-1 text-xs text-slate-500">{row.email}</p>
              <p className="mt-1 text-xs text-slate-500">{row.documentsCount} dok. · {row.activeBids} aktivnih ponuda</p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getHealthTone(row.healthStatus))}>
                {row.healthStatus}
              </Badge>
              <p className="mt-2 text-xs text-slate-500">{row.planName}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getCommercialTone(row.commercialSignal))}>
              {row.commercialSignal}
            </Badge>
            <span className="text-xs text-slate-500">Zadnja aktivnost: {formatDateTime(row.lastActivityAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function HealthSummaryCard({
  title,
  value,
  tone,
  hint,
}: {
  title: string;
  value: number;
  tone: "emerald" | "amber" | "rose";
  hint: string;
}) {
  const toneMap = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div className={cn("rounded-2xl border px-4 py-4", toneMap[tone])}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-80">{hint}</p>
    </div>
  );
}

export function AdminDashboardShell({ data, adminEmail }: AdminDashboardShellProps) {
  const staleSyncCount = data.operations.syncStatuses.filter((item) => item.freshness === "stale").length;
  const warningSyncCount = data.operations.syncStatuses.filter((item) => item.freshness === "warning").length;
  const syncAttentionCount = staleSyncCount + warningSyncCount;

  return (
    <div className="space-y-8 pb-4">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,rgba(8,17,31,0.98)_0%,rgba(10,26,56,0.98)_46%,rgba(17,44,91,0.96)_100%)] p-8 text-white shadow-[0_45px_90px_-45px_rgba(2,6,23,0.85)]">
        <div className="flex flex-col gap-8 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div className="max-w-4xl space-y-5">
            <Badge variant="outline" className="border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">
              Privatni admin komandni centar
            </Badge>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Jutarnji pregled poslovanja, naplate i rada platforme
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Jedan ekran za rast korisnika, kvalitet aktivacije, procijenjeni prihod, zdravlje računa, korištenje proizvoda i stabilnost sync/data sloja. Ovo je interni operativni centar samo za admin račun.
              </p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3 2xl:min-w-[760px]">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Admin račun</p>
              <p className="mt-2 text-sm font-semibold text-white">{adminEmail}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Generisano</p>
              <p className="mt-2 text-sm font-semibold text-white">{formatDateTime(data.generatedAt)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Jutarnji fokus</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {data.financeAudit.renewalsNext7d} obnova · {data.customerHealth.riskAccounts} rizičnih računa · {syncAttentionCount} sync upozorenja
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <FocusStatCard title="Aktivni MRR" value={formatCompactCurrency(data.summary.estimatedActiveMrr)} meta={`${data.summary.activeSubscriptions} aktivnih pretplata`} icon={Wallet} tone="emerald" />
        <FocusStatCard title="MRR u riziku" value={formatCompactCurrency(data.summary.estimatedAtRiskMrr)} meta={`${data.summary.pastDueSubscriptions} računa traži follow-up`} icon={CircleAlert} tone="amber" />
        <FocusStatCard title="Novi korisnici" value={String(data.summary.newUsers30d)} meta="Nove registracije u zadnjih 30 dana" icon={UserPlus} tone="blue" />
        <FocusStatCard title="Završeni profili" value={String(data.summary.completedProfiles)} meta={`${formatPercent(data.funnel.profileCompletionRate)} od firmi završava onboarding`} icon={Users} tone="violet" />
        <FocusStatCard title="Aktivne ponude" value={String(data.summary.activeBids)} meta={`${data.operations.submittedBids} predanih ponuda ukupno`} icon={Target} tone="blue" />
        <FocusStatCard title="Sync upozorenja" value={String(syncAttentionCount)} meta={staleSyncCount > 0 ? `${staleSyncCount} zastarjelih endpointa` : "Nema kritičnih sync alarma"} icon={Wrench} tone={syncAttentionCount > 0 ? "rose" : "slate"} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <SectionHeader icon={TrendingUp} eyebrow="Rast i aktivacija" title="Dnevni momentum" description="Prvih 7 dana rasta: registracije, otvaranje firmi, nove aktivacije pretplate i stvarna povratna aktivnost u aplikaciji." />
          </CardHeader>
          <CardContent className="space-y-6">
            <DailyMomentumChart data={data.dailyOverview} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">Sign-in 7 dana</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{data.funnel.signedInLast7Days}</p>
              </div>
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">Firma setup</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{formatPercent(data.funnel.companySetupRate)}</p>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">Onboarding</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{formatPercent(data.funnel.profileCompletionRate)}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Paying conversion</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{formatPercent(data.funnel.payingConversionRate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <SectionHeader icon={BarChart3} eyebrow="Aktivacione kohorte" title="Registracija do naplate" description="Mjesečni presjek: koliko registracija prelazi u firmu, završen profil i prvu pretplatu." iconTone="text-violet-700" />
          </CardHeader>
          <CardContent className="space-y-6">
            <ActivationCohortChart data={data.cohorts} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <MetricRow label="Zastoji u onboardingu" value={String(data.businessSignals.onboardingStalls)} hint="Računi koji su zapeli prije punog profila" />
                <MetricRow label="Reaktivacioni targeti" value={String(data.businessSignals.reactivationTargets)} hint="Završeni profili bez aktivne pretplate" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <MetricRow label="High-intent računi" value={String(data.businessSignals.highIntentAccounts)} hint="Imaju dokumente ili aktivne bid workspaces" />
                <MetricRow label="Upgrade kandidati" value={String(data.businessSignals.upgradeCandidates)} hint="Već izlaze iz limita trenutnog plana" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <SectionHeader icon={CreditCard} eyebrow="Finansije i billing" title="Prihod, planovi i naplata" description="Procijenjeni prihod po planovima, naplata koja dolazi na obnovu i računi koji traže billing pažnju." iconTone="text-emerald-700" />
          </CardHeader>
          <CardContent className="space-y-6">
            <PlanMixChart data={data.planDistribution} />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <MetricRow label="Procijenjeni MRR" value={formatCurrency(data.revenue.estimatedActiveMrr)} hint="Aktivne pretplate mapirane na plan cijene" />
                <MetricRow label="Projicirani ARR" value={formatCurrency(data.revenue.projectedArr)} hint="MRR × 12" />
                <MetricRow label="Novi paying 30 dana" value={String(data.revenue.newPaying30d)} hint="Svježe aktivirane pretplate" />
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <MetricRow label="MRR u riziku" value={formatCurrency(data.revenue.estimatedAtRiskMrr)} hint="Past due računi koji traže follow-up" />
                <MetricRow label="Obnove u 7 dana" value={String(data.financeAudit.renewalsNext7d)} hint="Najbliži billing trenutak" />
                <MetricRow label="Potencijalna naplata 30 dana" value={formatCurrency(data.financeAudit.estimatedCollectionNext30d)} hint="Ako sve aktivne obnove prođu uredno" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <SectionHeader icon={ShieldCheck} eyebrow="Customer health" title="Zdravlje računa i komercijalni follow-up" description="Računi pod rizikom, računi spremni za ekspanziju i nova aktiviranja koja treba zadržati blizu." iconTone="text-rose-700" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <HealthSummaryCard title="Odličan" value={data.customerHealth.healthyAccounts} tone="emerald" hint="Visoka aktivnost i stabilan račun" />
              <HealthSummaryCard title="Pažnja" value={data.customerHealth.attentionAccounts} tone="amber" hint="Treba dodatni monitoring" />
              <HealthSummaryCard title="Rizik" value={data.customerHealth.riskAccounts} tone="rose" hint="Mogući churn ili billing problem" />
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">Računi pod rizikom</p>
                <AccountList rows={data.customerHealth.atRiskAccounts} emptyLabel="Nema računa sa kritičnim signalom." />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">Ekspanzija i upgrade</p>
                <AccountList rows={data.customerHealth.expansionAccounts} emptyLabel="Trenutno nema jasnih upgrade kandidata." />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">Nova aktiviranja</p>
                <AccountList rows={data.customerHealth.recentlyActivatedAccounts} emptyLabel="Nema novih aktivacija u zadnjih 30 dana." />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <SectionHeader icon={Gauge} eyebrow="Korištenje proizvoda" title="Dokumenti, ponude i stvarna upotreba" description="Koliko firme zaista koriste dokumente i bid workflow, te da li proizvod ide prema dnevnoj operativnoj upotrebi." iconTone="text-blue-700" />
          </CardHeader>
          <CardContent className="space-y-6">
            <ProductUsageBars
              companiesWithDocuments={data.productUsage.companiesWithDocuments}
              companiesWithBids={data.productUsage.companiesWithBids}
              averageDocumentsPerCompany={data.productUsage.averageDocumentsPerCompany}
              averageBidsPerCompany={data.productUsage.averageBidsPerCompany}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <MetricRow label="Firme s dokumentima" value={String(data.productUsage.companiesWithDocuments)} />
                <MetricRow label="Firme s ponudama" value={String(data.productUsage.companiesWithBids)} />
                <MetricRow label="Prosj. dokumenata" value={String(data.productUsage.averageDocumentsPerCompany)} />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <MetricRow label="Prosj. ponuda" value={String(data.productUsage.averageBidsPerCompany)} />
                <MetricRow label="Stopa predaje ponuda" value={formatPercent(data.productUsage.bidSubmissionRate)} hint="Predane / ukupno bid workspace-a" />
                <MetricRow label="Capture rate tendera" value={formatPercent(data.productUsage.tenderCaptureRate)} hint="Aktivne ponude naspram otvorenih tendera" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <SectionHeader icon={Database} eyebrow="Operativa i tržišni sloj" title="Tržišni podaci, geo kvalitet i pipeline" description="Šta se dešava u bazi tendera, geografskoj pokrivenosti i tržišnom volumenu koji hrani preporuke i intelligence modul." iconTone="text-cyan-700" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">Otvoreni tenderi</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{data.operations.openTenders}</p>
                <p className="mt-1 text-sm text-slate-600">{formatCompactCurrency(data.operations.openTenderValue)} procijenjene vrijednosti</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Planirane nabavke 90 dana</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{data.operations.plannedProcurements90d}</p>
                <p className="mt-1 text-sm text-slate-600">{formatCompactCurrency(data.operations.plannedValue90d)} pipeline vrijednosti</p>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">Tržišna realizacija 30 dana</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{formatCompactCurrency(data.operations.realizedMarketValue30d)}</p>
                <p className="mt-1 text-sm text-slate-600">{data.operations.awards30d} dodjela u zadnjih 30 dana</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Tenderi bez area label</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{data.operations.missingTenderAreas}</p>
                <p className="mt-1 text-sm text-slate-600">Geo enrichment backlog za održavanje</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">Naručioci bez geo</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{data.operations.authoritiesMissingGeo}</p>
                <p className="mt-1 text-sm text-slate-600">Registry kvalitet koji utiče na preciznost lokacije</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">Win rate zatvorenih ponuda</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{formatPercent(data.operations.winRate)}</p>
                <p className="mt-1 text-sm text-slate-600">{data.operations.wonBids} dobijenih · {data.operations.lostBids} izgubljenih</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionHeader icon={RefreshCcw} eyebrow="Tehničko zdravlje" title="Sync i maintenance sloj" description="Status jutarnjeg sync-a, maintenance endpointa i ingest pipeline-a koji puni tržišne i preporučne podatke." iconTone="text-blue-700" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.operations.syncStatuses.map((item) => (
            <SyncStatusCard key={item.endpoint} item={item} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <SectionHeader icon={Users} eyebrow="Novi računi" title="Svježe registracije i onboarding" description="Ko je nov, gdje je setup stao i koje račune vrijedi odmah pogledati dok su još svježi." />
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <AccountsTable rows={data.recentUsers} />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <SectionHeader icon={Activity} eyebrow="Najaktivniji računi" title="Računi s najvećim signalom vrijednosti" description="Firme koje su već duboko u dokumentima, ponudama i korištenju, pa ih vrijedi pratiti kao retention ili expansion prioritet." iconTone="text-emerald-700" />
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <AccountsTable rows={data.portfolioAccounts} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="border-slate-200/80 bg-white/95 shadow-[0_20px_45px_-34px_rgba(15,23,42,0.22)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-amber-700" />
              <CardTitle className="text-slate-950">Billing audit</CardTitle>
            </div>
            <CardDescription>Obnove, inactive i cancelled slika bez order history pretpostavki.</CardDescription>
          </CardHeader>
          <CardContent>
            <MetricRow label="Inactive računi" value={String(data.financeAudit.inactiveAccounts)} />
            <MetricRow label="Cancelled pretplate" value={String(data.financeAudit.cancelledSubscriptions)} />
            <MetricRow label="Obnove 30 dana" value={String(data.financeAudit.renewalsNext30d)} />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-[0_20px_45px_-34px_rgba(15,23,42,0.22)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-blue-700" />
              <CardTitle className="text-slate-950">Dokumenti i storage</CardTitle>
            </div>
            <CardDescription>Operativni signal koliko se platforma koristi kao radni alat.</CardDescription>
          </CardHeader>
          <CardContent>
            <MetricRow label="Ukupno dokumenata" value={String(data.operations.totalDocuments)} />
            <MetricRow label="Ukupan storage" value={formatStorage(data.operations.totalStorageBytes)} />
            <MetricRow label="Istek u 30 dana" value={String(data.operations.expiringDocuments30d)} />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-[0_20px_45px_-34px_rgba(15,23,42,0.22)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn("size-4", syncAttentionCount > 0 ? "text-rose-700" : "text-emerald-700")} />
              <CardTitle className="text-slate-950">Alarmi i pažnja</CardTitle>
            </div>
            <CardDescription>Najbrže stvari koje mogu tražiti reakciju danas.</CardDescription>
          </CardHeader>
          <CardContent>
            <MetricRow label="Sync upozorenja" value={String(syncAttentionCount)} hint={staleSyncCount > 0 ? `${staleSyncCount} zastarjelih` : "Bez zastarjelih endpointa"} />
            <MetricRow label="Računi pod rizikom" value={String(data.customerHealth.riskAccounts)} />
            <MetricRow label="Naplata u riziku" value={formatCompactCurrency(data.summary.estimatedAtRiskMrr)} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
