import Link from "next/link";
import {
  Activity,
  BarChart3,
  CalendarClock,
  CircleAlert,
  CreditCard,
  Database,
  FileSearch,
  Gauge,
  RefreshCcw,
  ShieldCheck,
  Target,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ActivationCohortChart,
  DailyMomentumChart,
  PlanMixChart,
  ProductUsageBars,
} from "@/components/admin/admin-dashboard-charts";
import type { AdminDashboardData, AdminDashboardRow, AdminSyncStatusItem } from "@/lib/admin-dashboard";
import { cn } from "@/lib/utils";

interface AdminDashboardShellRefinedProps {
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

function getSyncEndpointLabel(endpoint: string): string {
  switch (endpoint) {
    case "MorningSync4AM":
      return "Jutarnji glavni sync";
    case "ProcurementNotices":
      return "Tenderi";
    case "ContractingAuthorities":
      return "Ugovorni organi";
    case "ContractingAuthorityMaintenance4AM":
      return "Održavanje organa";
    case "TenderAreaMaintenance4AM":
      return "Geo održavanje tendera";
    case "Awards":
      return "Dodjele ugovora";
    case "PlannedProcurements":
      return "Planirane nabavke";
    case "Suppliers":
      return "Dobavljači";
    default:
      return endpoint;
  }
}

function getFreshnessLabel(freshness: AdminSyncStatusItem["freshness"]): string {
  switch (freshness) {
    case "healthy":
      return "Uredno";
    case "warning":
      return "Provjeriti";
    case "stale":
      return "Kasni";
    default:
      return "Nema podataka";
  }
}

function getSyncIssueText(item: AdminSyncStatusItem): string {
  switch (item.freshness) {
    case "warning":
      return "Posljednji prolaz postoji, ali nije dovoljno svjež za jutarnji pregled.";
    case "stale":
      return "Sync je zastario i vjerovatno traži provjeru cron-a ili ingest-a.";
    case "unknown":
      return "Za ovaj job nema zabilježenog prolaza u sync log-u.";
    default:
      return "Job je prošao uredno i podaci djeluju svježe.";
  }
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
  href,
}: {
  title: string;
  value: string;
  meta: string;
  icon: typeof Activity;
  tone: "blue" | "emerald" | "violet" | "amber" | "rose" | "slate";
  href?: string;
}) {
  const toneMap: Record<typeof tone, string> = {
    blue: "from-blue-600/12 via-cyan-500/10 to-white border-blue-200/70 text-blue-700",
    emerald: "from-emerald-600/12 via-teal-500/10 to-white border-emerald-200/70 text-emerald-700",
    violet: "from-violet-600/12 via-fuchsia-500/10 to-white border-violet-200/70 text-violet-700",
    amber: "from-amber-500/12 via-orange-400/10 to-white border-amber-200/70 text-amber-700",
    rose: "from-rose-500/12 via-pink-400/10 to-white border-rose-200/70 text-rose-700",
    slate: "from-slate-400/10 via-slate-300/8 to-white border-slate-200/70 text-slate-700",
  };

  const content = (
    <Card
      className={cn(
        "overflow-hidden border bg-[linear-gradient(135deg,var(--tw-gradient-stops))] shadow-[0_18px_48px_-30px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-34px_rgba(15,23,42,0.3)]",
        toneMap[tone],
        href ? "cursor-pointer" : ""
      )}
    >
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

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
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
          <p className="text-sm font-semibold text-slate-900">{getSyncEndpointLabel(item.endpoint)}</p>
          <p className="mt-1 text-xs text-slate-500">{item.endpoint}</p>
          <p className="mt-1 text-xs text-slate-500">Zadnji prolaz: {formatDateTime(item.ranAt)}</p>
        </div>
        <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getFreshnessTone(item.freshness))}>
          {getFreshnessLabel(item.freshness)}
        </Badge>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{getSyncIssueText(item)}</p>
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
              <p className="mt-1 text-xs text-slate-500">{row.contactEmail ?? row.contactPhone ?? row.onboardingStatus}</p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getHealthTone(row.healthStatus))}>
                {row.healthStatus}
              </Badge>
              <p className="mt-2 text-xs text-slate-500">{row.planName}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getSubscriptionTone(row.subscriptionStatus))}>
              {row.subscriptionStatus}
            </Badge>
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
  href,
}: {
  title: string;
  value: number;
  tone: "emerald" | "amber" | "rose";
  hint: string;
  href: string;
}) {
  const toneMap = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <Link href={href} className="block">
      <div className={cn("rounded-2xl border px-4 py-4 transition hover:-translate-y-0.5", toneMap[tone])}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{title}</p>
        <p className="mt-2 text-3xl font-bold">{value}</p>
        <p className="mt-1 text-xs opacity-80">{hint}</p>
      </div>
    </Link>
  );
}

export function AdminDashboardShellRefined({ data, adminEmail }: AdminDashboardShellRefinedProps) {
  const warningSyncs = data.operations.syncStatuses.filter(
    (item) => item.freshness === "warning" || item.freshness === "stale"
  );
  const unknownSyncs = data.operations.syncStatuses.filter((item) => item.freshness === "unknown");
  const syncAttentionCount = warningSyncs.length;

  const healthExcellentRows = data.crm.accounts.filter((row) => row.healthStatus === "Odličan").slice(0, 8);
  const healthAttentionRows = data.crm.accounts.filter((row) => row.healthStatus === "Pažnja").slice(0, 8);
  const healthRiskRows = data.crm.accounts
    .filter(
      (row) =>
        row.healthStatus === "Rizik" ||
        row.subscriptionStatus === "past_due" ||
        row.commercialSignal === "Naplata u riziku"
    )
    .slice(0, 8);
  const followUpTodayRows = data.crm.accounts.filter((row) => row.outreachPriority === "visok").slice(0, 8);

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
                Prvo vidi šta traži reakciju danas, pa tek onda dublju analitiku
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Gornji dio je složen za tvoj dnevni 5-minutni pregled: naplata, CRM follow-up, sync upozorenja i data backlog. Niže ostaje detaljnija analitika za rast, korištenje i tržište.
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
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Danas prvo</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {data.financeAudit.renewalsNext7d} obnova · {data.crm.retentionQueueCount} retention · {syncAttentionCount} sync upozorenja
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <FocusStatCard
          title="Obnove 7 dana"
          value={String(data.financeAudit.renewalsNext7d)}
          meta="Računi kojima uskoro dolazi billing trenutak"
          icon={CalendarClock}
          tone="amber"
          href="#billing-prioriteti"
        />
        <FocusStatCard
          title="Naplata u riziku"
          value={formatCompactCurrency(data.summary.estimatedAtRiskMrr)}
          meta={`${data.summary.pastDueSubscriptions} past_due računa za hitan follow-up`}
          icon={CircleAlert}
          tone="rose"
          href="#billing-prioriteti"
        />
        <FocusStatCard
          title="Novi leadovi"
          value={String(data.crm.newLeadsCount)}
          meta="Registracije koje još nisu postale pravi customer setup"
          icon={UserPlus}
          tone="blue"
          href="/dashboard/admin/crm"
        />
        <FocusStatCard
          title="Aktivacija"
          value={String(data.crm.activationQueueCount)}
          meta="Računi koje treba dovesti do prve stvarne vrijednosti"
          icon={Target}
          tone="violet"
          href="/dashboard/admin/crm"
        />
        <FocusStatCard
          title="Računi pod rizikom"
          value={String(data.customerHealth.riskAccounts)}
          meta="Klik vodi na listu konkretnih računa"
          icon={ShieldCheck}
          tone="amber"
          href="#health-rizik"
        />
        <FocusStatCard
          title="Sync upozorenja"
          value={String(syncAttentionCount)}
          meta={syncAttentionCount > 0 ? "Klik vodi na listu tačnih sync jobova" : "Trenutno nema jobova za provjeru"}
          icon={Wrench}
          tone={syncAttentionCount > 0 ? "rose" : "slate"}
          href="#sync-upozorenja"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr_0.95fr]">
        <Card id="billing-prioriteti" className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <SectionHeader
              icon={CreditCard}
              eyebrow="Danas prvo"
              title="Billing i naplata koje traže akciju"
              description="Ovo su najkorisnije stvari za jutarnju provjeru: ko ulazi u obnovu, gdje je naplata pod pritiskom i koliki prihod je trenutno pod rizikom."
              iconTone="text-emerald-700"
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <MetricRow label="Obnove u 7 dana" value={String(data.financeAudit.renewalsNext7d)} hint="Najbliži billing trenutci koje vrijedi ispratiti" />
              <MetricRow label="Past due računi" value={String(data.summary.pastDueSubscriptions)} hint="Računi koji već traže kontakt" />
              <MetricRow label="MRR u riziku" value={formatCurrency(data.summary.estimatedAtRiskMrr)} hint="Procjena na osnovu mapiranih plan cijena" />
              <MetricRow label="Potencijalna naplata 30 dana" value={formatCurrency(data.financeAudit.estimatedCollectionNext30d)} hint="Ako sve aktivne obnove prođu uredno" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/dashboard/admin/crm">Otvori CRM follow-up</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card id="sync-upozorenja" className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <SectionHeader
              icon={RefreshCcw}
              eyebrow="Danas prvo"
              title="Sync upozorenja koja trebaš razumjeti"
              description="Umjesto samo broja, ovdje vidiš tačno koji jobovi kasne ili traže provjeru. Ako je broj 2, ovdje ćeš vidjeti koja su ta 2."
              iconTone="text-blue-700"
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {warningSyncs.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                Trenutno nema sync jobova sa statusom &quot;Provjeriti&quot; ili &quot;Kasni&quot;.
              </div>
            ) : (
              <div className="space-y-3">
                {warningSyncs.map((item) => (
                  <div key={item.endpoint} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{getSyncEndpointLabel(item.endpoint)}</p>
                        <p className="mt-1 text-xs text-slate-500">Zadnji prolaz: {formatDateTime(item.ranAt)}</p>
                        <p className="mt-1 text-xs text-slate-500">{getSyncIssueText(item)}</p>
                      </div>
                      <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getFreshnessTone(item.freshness))}>
                        {getFreshnessLabel(item.freshness)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {unknownSyncs.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Jobovi bez ikakvog zapisa u logu</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {unknownSyncs.map((item) => getSyncEndpointLabel(item.endpoint)).join(", ")}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="#svi-sync-jobovi">Prikaži sve sync jobove</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <SectionHeader
              icon={Database}
              eyebrow="Danas prvo"
              title="Geo i tender data backlog"
              description="Ovdje su stvari koje utiču na kvalitet preporuka i tržišnih podataka. Namjerno sam izbacio procijenjenu vrijednost otvorenih tendera jer portal taj podatak često ne daje pouzdano."
              iconTone="text-cyan-700"
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <MetricRow label="Otvoreni tenderi" value={String(data.operations.openTenders)} hint="Broj otvorenih tendera bez prikaza nepouzdanog iznosa" />
              <MetricRow label="Tenderi bez area label" value={String(data.operations.missingTenderAreas)} hint="Ukupan backlog kroz cijelu bazu, ne samo današnji sync" />
              <MetricRow label="Naručioci bez geo" value={String(data.operations.authoritiesMissingGeo)} hint="Ako je ovo visoko, geo preciznost preporuka trpi" />
              <MetricRow label="Planirane nabavke 90 dana" value={String(data.operations.plannedProcurements90d)} hint={`${formatCompactCurrency(data.operations.plannedValue90d)} planiranog volumena gdje podatak postoji`} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/tenders/geo-report">
                  <FileSearch className="size-4" />
                  Otvori geo report
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <SectionHeader
              icon={ShieldCheck}
              eyebrow="Računi"
              title="Health grupe sa klikom i konkretnim računima"
              description="Klik na karticu ispod te vodi pravo na odgovarajuću grupu. Tako odmah vidiš koji računi spadaju u Odličan, Pažnja ili Rizik."
              iconTone="text-rose-700"
            />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <HealthSummaryCard title="Odličan" value={data.customerHealth.healthyAccounts} tone="emerald" hint="Koriste proizvod stabilno i bez većeg rizika" href="#health-odlican" />
              <HealthSummaryCard title="Pažnja" value={data.customerHealth.attentionAccounts} tone="amber" hint="Vrijedi pogledati jer trebaju dodatni monitoring" href="#health-paznja" />
              <HealthSummaryCard title="Rizik" value={data.customerHealth.riskAccounts} tone="rose" hint="Billing ili churn signal koji traži reakciju" href="#health-rizik" />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div id="health-odlican" className="space-y-3 scroll-mt-24">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">Odličan</p>
                  <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    Stabilni računi
                  </Badge>
                </div>
                <AccountList rows={healthExcellentRows} emptyLabel="Trenutno nema računa u ovoj grupi." />
              </div>

              <div id="health-paznja" className="space-y-3 scroll-mt-24">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">Pažnja</p>
                  <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                    Pogledati danas
                  </Badge>
                </div>
                <AccountList rows={healthAttentionRows} emptyLabel="Trenutno nema računa u ovoj grupi." />
              </div>

              <div id="health-rizik" className="space-y-3 scroll-mt-24">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">Rizik</p>
                  <Badge variant="outline" className="rounded-full border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                    Reagovati prvo
                  </Badge>
                </div>
                <AccountList rows={healthRiskRows} emptyLabel="Trenutno nema računa u ovoj grupi." />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/dashboard/admin/crm">Otvori puni CRM pregled</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <SectionHeader
              icon={Users}
              eyebrow="Računi"
              title="Svježe registracije"
              description="Ko je nov i koga vrijedi odmah pogledati dok je još svjež u onboarding fazi."
            />
          </CardHeader>
          <CardContent>
            <AccountList rows={data.recentUsers} emptyLabel="Nema novih registracija za prikaz." />
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <SectionHeader
              icon={Activity}
              eyebrow="Računi"
              title="Follow-up danas"
              description="Visok prioritet iz CRM logike: računi koje vrijedi kontaktirati ili pratiti prvi."
              iconTone="text-emerald-700"
            />
          </CardHeader>
          <CardContent>
            <AccountList rows={followUpTodayRows} emptyLabel="Trenutno nema visoko prioritetnih računa za follow-up." />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionHeader
          icon={BarChart3}
          eyebrow="Niže: analitika"
          title="Detaljniji pogled na rast i naplatu"
          description="Ovo je sekundarni sloj: koristan kada želiš dublje gledati trendove, ali nije nužan za tvoj jutarnji 5-minutni pregled."
          iconTone="text-violet-700"
        />
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
            <CardHeader>
              <CardTitle className="text-slate-950">Dnevni momentum</CardTitle>
              <CardDescription>Registracije, firma setup, nova plaćanja i stvarna povratna aktivnost u zadnjih 7 dana.</CardDescription>
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
              <CardTitle className="text-slate-950">Planovi i prihod</CardTitle>
              <CardDescription>Procijenjeni prihod i raspored po planovima, sa billing rizikom sa strane.</CardDescription>
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
                  <MetricRow label="Obnove 30 dana" value={String(data.financeAudit.renewalsNext30d)} hint="Širi billing horizont" />
                  <MetricRow label="Inactive računi" value={String(data.financeAudit.inactiveAccounts)} hint="Bez aktivne pretplate" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          icon={Gauge}
          eyebrow="Niže: proizvod i tržište"
          title="Korištenje proizvoda i tržišni sloj"
          description="Ovo je širi kontekst: koliko se proizvod zaista koristi i kako izgleda tržišni data sloj koji hrani preporuke i intelligence."
          iconTone="text-blue-700"
        />
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
            <CardHeader>
              <CardTitle className="text-slate-950">Stvarna upotreba proizvoda</CardTitle>
              <CardDescription>Dokumenti, bid workflow i operativna dubina korištenja.</CardDescription>
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
                  <MetricRow label="Ukupan storage" value={formatStorage(data.operations.totalStorageBytes)} />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <MetricRow label="Prosj. ponuda" value={String(data.productUsage.averageBidsPerCompany)} />
                  <MetricRow label="Stopa predaje ponuda" value={formatPercent(data.productUsage.bidSubmissionRate)} hint="Predane / ukupno bid workspace-a" />
                  <MetricRow label="Capture rate tendera" value={formatPercent(data.productUsage.tenderCaptureRate)} hint="Aktivne ponude naspram otvorenih tendera" />
                  <MetricRow label="Istek dokumenata 30 dana" value={String(data.operations.expiringDocuments30d)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
            <CardHeader>
              <CardTitle className="text-slate-950">Tržište i data kvalitet</CardTitle>
              <CardDescription>Otvoreni tenderi, planirano tržište, dodjele i geo kvalitet. Vrijednost otvorenih tendera je namjerno uklonjena iz ovog pregleda.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">Otvoreni tenderi</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{data.operations.openTenders}</p>
                  <p className="mt-1 text-sm text-slate-600">Samo broj otvorenih tendera, bez nepouzdanog iznosa</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Planirane nabavke 90 dana</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{data.operations.plannedProcurements90d}</p>
                  <p className="mt-1 text-sm text-slate-600">{formatCompactCurrency(data.operations.plannedValue90d)} gdje procjena postoji</p>
                </div>
                <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">Tržišna realizacija 30 dana</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{formatCompactCurrency(data.operations.realizedMarketValue30d)}</p>
                  <p className="mt-1 text-sm text-slate-600">{data.operations.awards30d} dodjela u zadnjih 30 dana</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Tenderi bez area label</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{data.operations.missingTenderAreas}</p>
                  <p className="mt-1 text-sm text-slate-600">Ukupan neriješen geo backlog u bazi</p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">Naručioci bez geo</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{data.operations.authoritiesMissingGeo}</p>
                  <p className="mt-1 text-sm text-slate-600">Registry kvalitet koji utiče na lokaciju</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">Win rate zatvorenih ponuda</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{formatPercent(data.operations.winRate)}</p>
                  <p className="mt-1 text-sm text-slate-600">{data.operations.wonBids} dobijenih · {data.operations.lostBids} izgubljenih</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/tenders/geo-report">Otvori detaljni geo report</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="svi-sync-jobovi" className="space-y-4 scroll-mt-24">
        <SectionHeader
          icon={RefreshCcw}
          eyebrow="Niže: tehnički detalji"
          title="Svi jutarnji sync jobovi"
          description="Ovo je puni tehnički pregled. Gornji sync blok izdvaja samo ono što traži pažnju, a ovdje ostaje kompletna lista."
          iconTone="text-blue-700"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.operations.syncStatuses.map((item) => (
            <SyncStatusCard key={item.endpoint} item={item} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <CardTitle className="text-slate-950">Registracija do naplate</CardTitle>
            <CardDescription>Mjesečni presjek: koliko registracija prelazi u firmu, završen profil i prvu pretplatu.</CardDescription>
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

        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <CardTitle className="text-slate-950">Brzi finansijski audit</CardTitle>
            <CardDescription>Dodatni billing signal koji nije nužno za vrh ekrana, ali je koristan za širi pregled.</CardDescription>
          </CardHeader>
          <CardContent>
            <MetricRow label="Aktivni MRR" value={formatCurrency(data.summary.estimatedActiveMrr)} />
            <MetricRow label="Cancelled pretplate" value={String(data.financeAudit.cancelledSubscriptions)} />
            <MetricRow label="Ukupno dokumenata" value={String(data.operations.totalDocuments)} />
            <MetricRow label="Aktivne ponude" value={String(data.summary.activeBids)} />
            <MetricRow label="Završeni profili" value={String(data.summary.completedProfiles)} hint={`${formatPercent(data.funnel.profileCompletionRate)} od firmi završava onboarding`} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
