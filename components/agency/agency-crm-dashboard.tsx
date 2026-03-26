"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileText,
  Plus,
  Search,
  Users,
  Circle,
} from "lucide-react";
import { AddClientModal } from "./add-client-modal";

const CRM_STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  lead: { label: "Potencijalni", color: "bg-amber-50 text-amber-700 border-amber-200" },
  onboarding: { label: "Onboarding", color: "bg-blue-50 text-blue-700 border-blue-200" },
  active: { label: "Aktivan", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  paused: { label: "Pauziran", color: "bg-slate-100 text-slate-600 border-slate-200" },
  churned: { label: "Otkazan", color: "bg-red-50 text-red-700 border-red-200" },
};

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${Math.round(value)} KM`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-Latn-BA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface AgencyClient {
  id: string;
  status: string;
  crm_stage: string;
  notes: string | null;
  contract_start: string | null;
  contract_end: string | null;
  monthly_fee: number | null;
  created_at: string;
  updated_at: string;
  company_id: string;
  companies: {
    id: string;
    name: string;
    jib: string;
    industry: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    operating_regions: string[] | null;
    keywords: string[] | null;
    cpv_codes: string[] | null;
  } | null;
}

interface AgencyCRMDashboardProps {
  clients: AgencyClient[];
  bidsByCompany: Record<string, { total: number; won: number; active: number }>;
  docsByCompany: Record<string, number>;
}

export function AgencyCRMDashboard({
  clients,
  bidsByCompany,
  docsByCompany,
}: AgencyCRMDashboardProps) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const router = useRouter();

  const filtered = clients.filter((c) => {
    const name = c.companies?.name?.toLowerCase() ?? "";
    const jib = c.companies?.jib ?? "";
    const matchesSearch =
      !search || name.includes(search.toLowerCase()) || jib.includes(search);
    const matchesStage = !stageFilter || c.crm_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">
            Klijenti
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Svaki klijent ima potpuni tender profil, preporuke i dokumente — identično kao direktni nalozi.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition-all hover:bg-blue-700"
        >
          <Plus className="size-4" />
          Dodaj klijenta
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pretraži po imenu ili JIB-u..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex gap-2">
          {[null, "lead", "onboarding", "active", "paused", "churned"].map((stage) => (
            <button
              key={stage ?? "all"}
              onClick={() => setStageFilter(stage)}
              className={`h-9 rounded-lg px-3 text-xs font-semibold transition-all ${
                stageFilter === stage
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {stage === null ? "Svi" : CRM_STAGE_CONFIG[stage].label}
            </button>
          ))}
        </div>
      </div>

      {/* Client List */}
      {filtered.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <Users className="mx-auto mb-4 size-12 text-slate-300" />
          <p className="font-semibold text-slate-700">
            {clients.length === 0 ? "Još nema klijenata" : "Nema rezultata pretrage"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {clients.length === 0
              ? "Dodajte prvog klijenta da počnete."
              : "Pokušajte drugu pretragu ili filter."}
          </p>
          {clients.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white"
            >
              <Plus className="size-4" />
              Dodaj klijenta
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/30 px-6 py-4">
            <p className="text-sm font-semibold text-slate-700">
              {filtered.length} {filtered.length === 1 ? "klijent" : "klijenata"}
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map((client) => {
              const company = client.companies;
              if (!company) return null;
              const stageConfig = CRM_STAGE_CONFIG[client.crm_stage] ?? CRM_STAGE_CONFIG.active;
              const bids = bidsByCompany[company.id];
              const docs = docsByCompany[company.id] ?? 0;
              return (
                <Link
                  key={client.id}
                  href={`/dashboard/agency/clients/${client.id}`}
                  className="group flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <Building2 className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
                        {company.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>JIB: {company.jib}</span>
                        {company.contact_email && (
                          <>
                            <span>·</span>
                            <span>{company.contact_email}</span>
                          </>
                        )}
                        {client.monthly_fee && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-emerald-700">
                              {formatCurrency(client.monthly_fee)}/mj.
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold ${stageConfig.color}`}>
                      {stageConfig.label}
                    </span>
                    {bids && (
                      <span className="text-xs text-slate-500">
                        {bids.active} aktivnih · {bids.won} dobijeno
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{docs} dok.</span>
                    <ChevronRight className="size-4 text-slate-300 transition-colors group-hover:text-blue-600" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Pipeline View */}
      {clients.length > 0 && (
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-slate-900">Pipeline</h2>
              <p className="mt-1 text-sm text-slate-500">Status svakog klijenta u procesu.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {(["lead", "onboarding", "active", "paused", "churned"] as const).map((stage) => {
              const stageClients = clients.filter((c) => c.crm_stage === stage);
              const config = CRM_STAGE_CONFIG[stage];
              return (
                <div key={stage} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {config.label}
                    </p>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${config.color}`}>
                      {stageClients.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {stageClients.slice(0, 4).map((c) => (
                      <Link
                        key={c.id}
                        href={`/dashboard/agency/clients/${c.id}`}
                        className="block rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50"
                      >
                        <p className="line-clamp-1">{c.companies?.name}</p>
                        {c.monthly_fee && (
                          <p className="mt-1 font-normal text-emerald-700">
                            {formatCurrency(c.monthly_fee)}/mj.
                          </p>
                        )}
                      </Link>
                    ))}
                    {stageClients.length > 4 && (
                      <p className="text-center text-[11px] text-slate-400">
                        +{stageClients.length - 4} više
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
