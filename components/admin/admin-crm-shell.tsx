import {
  Activity,
  Building2,
  Phone,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminCrmDirectory } from "@/components/admin/admin-crm-directory";
import type { AdminCrmAccount, AdminDashboardData } from "@/lib/admin-dashboard";
import { cn } from "@/lib/utils";

interface AdminCrmShellProps {
  data: AdminDashboardData;
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

function getStageTone(stage: AdminCrmAccount["outreachStage"]): string {
  switch (stage) {
    case "Novi lead":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "Aktivacija":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    case "Retention":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "Ekspanzija":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function getPriorityTone(priority: AdminCrmAccount["outreachPriority"]): string {
  switch (priority) {
    case "visok":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "srednji":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
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
  icon: typeof Users;
  tone: "blue" | "cyan" | "rose" | "violet" | "slate";
}) {
  const toneMap: Record<typeof tone, string> = {
    blue: "from-blue-600/12 via-cyan-500/10 to-white border-blue-200/70 text-blue-700",
    cyan: "from-cyan-600/12 via-sky-500/10 to-white border-cyan-200/70 text-cyan-700",
    rose: "from-rose-500/12 via-pink-400/10 to-white border-rose-200/70 text-rose-700",
    violet: "from-violet-600/12 via-fuchsia-500/10 to-white border-violet-200/70 text-violet-700",
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

function QueueCard({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: AdminCrmAccount[];
}) {
  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
      <CardHeader>
        <CardTitle className="text-slate-950">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
            Trenutno nema računa u ovoj CRM koloni.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.userId} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.companyName ?? row.email}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.email}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.contactEmail ?? row.contactPhone ?? "Nedostaje kontakt kanal"}</p>
                  </div>
                  <div className="space-y-2 text-right">
                    <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getStageTone(row.outreachStage))}>
                      {row.outreachStage}
                    </Badge>
                    <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getPriorityTone(row.outreachPriority))}>
                      {row.outreachPriority}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium text-slate-900">{row.nextAction}</p>
                  <p className="text-xs text-slate-500">{row.outreachReason}</p>
                  <p className="text-xs text-slate-500">Zadnja aktivnost: {formatDateTime(row.lastActivityAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminCrmShell({ data }: AdminCrmShellProps) {
  return (
    <div className="space-y-8 pb-4">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,rgba(8,17,31,0.98)_0%,rgba(14,29,61,0.98)_48%,rgba(13,56,92,0.95)_100%)] p-8 text-white shadow-[0_45px_90px_-45px_rgba(2,6,23,0.85)]">
        <div className="flex flex-col gap-6 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div className="max-w-4xl space-y-4">
            <Badge variant="outline" className="border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">
              Admin CRM
            </Badge>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                CRM za leadove, firme i outreach follow-up
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Customer-safe pregled registracija, firmi, kontakt kanala, onboarding statusa, naplate i follow-up prioriteta. Ovdje pratiš poslovne signale bez otvaranja povjerljivih dokumenata korisnika.
              </p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3 2xl:min-w-[720px]">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Ukupno CRM računa</p>
              <p className="mt-2 text-xl font-semibold text-white">{data.crm.totalAccounts}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Kontakt kanali</p>
              <p className="mt-2 text-xl font-semibold text-white">{data.crm.companiesWithContacts} firmi ima email ili telefon</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Hitni follow-up</p>
              <p className="mt-2 text-xl font-semibold text-white">{data.crm.retentionQueueCount} retention · {data.crm.activationQueueCount} aktivacija</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="Novi leadovi" value={String(data.crm.newLeadsCount)} hint="Registracije koje još nisu otvorile firmu ili ušle u pravi onboarding" icon={UserPlus} tone="blue" />
        <SummaryCard title="Aktivacija" value={String(data.crm.activationQueueCount)} hint="Računi koje treba dovesti do prvog stvarnog uspjeha ili pretplate" icon={Sparkles} tone="cyan" />
        <SummaryCard title="Retention" value={String(data.crm.retentionQueueCount)} hint="Računi s billing ili churn rizikom" icon={ShieldAlert} tone="rose" />
        <SummaryCard title="Ekspanzija" value={String(data.crm.expansionQueueCount)} hint="Računi sa signalom za upgrade i dodatni paket" icon={TrendingUp} tone="violet" />
        <SummaryCard title="Bez kontakta" value={String(data.crm.missingContactChannels)} hint="Firme bez kontaktnog emaila i telefona u CRM-u" icon={Phone} tone="slate" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-4">
        <QueueCard title="Novi leadovi" description="Prve registracije koje traže inicijalni outreach i pomoć oko company setup-a." rows={data.crm.newLeads} />
        <QueueCard title="Aktivacija" description="Postojeći računi koji su blizu prve stvarne vrijednosti, ali im treba vođenje." rows={data.crm.activationQueue} />
        <QueueCard title="Retention" description="Računi pod billing ili churn pritiskom koje treba kontaktirati prvi." rows={data.crm.retentionQueue} />
        <QueueCard title="Ekspanzija" description="Najzdraviji računi sa signalom da prerastaju postojeći plan." rows={data.crm.expansionQueue} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-blue-700" />
              <CardTitle className="text-slate-950">CRM operativni sažetak</CardTitle>
            </div>
            <CardDescription>Brzi pregled šta je važno za outreach i rast poslovanja danas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Kontakti i podaci</p>
              <p className="mt-2 text-sm text-slate-700">{data.crm.companiesWithContacts} firmi ima kontakt kanal, a {data.crm.missingContactChannels} firmi i dalje nema email ili telefon za outreach.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Komercijalni fokus</p>
              <p className="mt-2 text-sm text-slate-700">Najhitniji red je retention, zatim aktivacija profila spremnih za prvu pretplatu i ekspanzija prema jačim planovima.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Privatnost</p>
              <p className="mt-2 text-sm text-slate-700">CRM koristi samo customer-safe podatke: firma, email, telefon, plan, health, onboarding i business signal. Nema prikaza sadržaja dokumenata korisnika.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-violet-700" />
              <CardTitle className="text-slate-950">Directory računa i firmi</CardTitle>
            </div>
            <CardDescription>Pretraga i filtriranje svih customer računa za dnevni outreach i account management.</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminCrmDirectory accounts={data.crm.accounts} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
