"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { AdminCrmAccount, AdminCrmPriority, AdminCrmStage } from "@/lib/admin-dashboard";
import { cn } from "@/lib/utils";

interface AdminCrmDirectoryProps {
  accounts: AdminCrmAccount[];
}

const stageOptions: Array<{ value: AdminCrmStage | "all"; label: string }> = [
  { value: "all", label: "Svi računi" },
  { value: "Novi lead", label: "Novi lead" },
  { value: "Aktivacija", label: "Aktivacija" },
  { value: "Retention", label: "Retention" },
  { value: "Ekspanzija", label: "Ekspanzija" },
  { value: "Stabilan račun", label: "Stabilni" },
];

const priorityOptions: Array<{ value: AdminCrmPriority | "all"; label: string }> = [
  { value: "all", label: "Svi prioriteti" },
  { value: "visok", label: "Visok" },
  { value: "srednji", label: "Srednji" },
  { value: "nizak", label: "Nizak" },
];

function getPriorityTone(priority: AdminCrmPriority): string {
  switch (priority) {
    case "visok":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "srednji":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getStageTone(stage: AdminCrmStage): string {
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

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("bs-BA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminCrmDirectory({ accounts }: AdminCrmDirectoryProps) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<AdminCrmStage | "all">("all");
  const [priority, setPriority] = useState<AdminCrmPriority | "all">("all");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return accounts.filter((account) => {
      if (stage !== "all" && account.outreachStage !== stage) {
        return false;
      }

      if (priority !== "all" && account.outreachPriority !== priority) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        account.email,
        account.contactEmail,
        account.contactPhone,
        account.companyName,
        account.primaryIndustryLabel,
        account.regionsLabel,
        account.commercialSignal,
        account.outreachReason,
        account.nextAction,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [accounts, priority, query, stage]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,220px))]">
        <label className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Pretraga</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Firma, email, telefon, industrija..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          />
        </label>
        <label className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">CRM stage</span>
          <select
            value={stage}
            onChange={(event) => setStage(event.target.value as AdminCrmStage | "all")}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          >
            {stageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Prioritet</span>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as AdminCrmPriority | "all")}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
        Prikazano računa: <span className="font-semibold text-slate-900">{filtered.length}</span> od ukupno <span className="font-semibold text-slate-900">{accounts.length}</span>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-[0_20px_45px_-34px_rgba(15,23,42,0.24)]">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
              <th className="px-4 py-3 font-semibold">Račun</th>
              <th className="px-4 py-3 font-semibold">Kontakt</th>
              <th className="px-4 py-3 font-semibold">Firma</th>
              <th className="px-4 py-3 font-semibold">CRM stage</th>
              <th className="px-4 py-3 font-semibold">Sljedeći korak</th>
              <th className="px-4 py-3 font-semibold">Aktivnost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((account) => (
              <tr key={account.userId} className="align-top">
                <td className="px-4 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">{account.email}</p>
                    <p className="mt-1 text-xs text-slate-500">Registrovan: {formatDateTime(account.createdAt)}</p>
                    <p className="mt-1 text-xs text-slate-500">Zadnji sign-in: {formatDateTime(account.lastSignInAt)}</p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-1 text-xs text-slate-600">
                    <p>{account.contactEmail ?? "Bez kontakt emaila"}</p>
                    <p>{account.contactPhone ?? "Bez telefona"}</p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-slate-900">{account.companyName ?? "—"}</p>
                    <p className="mt-1 text-xs text-slate-500">{account.primaryIndustryLabel ?? "Industrija nije precizirana"}</p>
                    <p className="mt-1 text-xs text-slate-500">Regije: {account.regionsLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">Plan: {account.planName}</p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-2">
                    <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getStageTone(account.outreachStage))}>
                      {account.outreachStage}
                    </Badge>
                    <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getPriorityTone(account.outreachPriority))}>
                      {account.outreachPriority}
                    </Badge>
                    <p className="text-xs text-slate-500">{account.outreachReason}</p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-900">{account.nextAction}</p>
                    <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {account.commercialSignal}
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-1 text-xs text-slate-600">
                    <p>Status: {account.subscriptionStatus}</p>
                    <p>Health: {account.healthStatus} · {account.healthScore}/100</p>
                    <p>Zadnja aktivnost: {formatDateTime(account.lastActivityAt)}</p>
                    <p>Obnova: {formatDateTime(account.subscriptionEndsAt)}</p>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
