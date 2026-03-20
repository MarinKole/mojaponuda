"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AdminCohortPoint,
  AdminDailyOverviewPoint,
  AdminPlanDistributionItem,
} from "@/lib/admin-dashboard";

const DAILY_COLORS = {
  signups: "#2563eb",
  companySetups: "#06b6d4",
  newPaying: "#10b981",
};

const PLAN_COLORS = ["#2563eb", "#8b5cf6", "#f59e0b"];

function tooltipStyle() {
  return {
    backgroundColor: "#ffffff",
    border: "1px solid #dbe4f0",
    borderRadius: "14px",
    fontSize: "12px",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
  } as const;
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M KM`;
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}K KM`;
  }

  return `${Math.round(value)} KM`;
}

export function DailyMomentumChart({ data }: { data: AdminDailyOverviewPoint[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="signupsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={DAILY_COLORS.signups} stopOpacity={0.28} />
              <stop offset="95%" stopColor={DAILY_COLORS.signups} stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="companiesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={DAILY_COLORS.companySetups} stopOpacity={0.24} />
              <stop offset="95%" stopColor={DAILY_COLORS.companySetups} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle()} />
          <Area type="monotone" dataKey="signups" stroke={DAILY_COLORS.signups} fill="url(#signupsFill)" strokeWidth={2.5} />
          <Area type="monotone" dataKey="companySetups" stroke={DAILY_COLORS.companySetups} fill="url(#companiesFill)" strokeWidth={2.5} />
          <Bar dataKey="newPaying" fill={DAILY_COLORS.newPaying} radius={[6, 6, 0, 0]} maxBarSize={26} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActivationCohortChart({ data }: { data: AdminCohortPoint[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle()} />
          <Bar dataKey="signups" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={24} />
          <Bar dataKey="companySetups" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={24} />
          <Bar dataKey="onboarded" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={24} />
          <Bar dataKey="paying" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlanMixChart({ data }: { data: AdminPlanDistributionItem[] }) {
  const filtered = data.filter((item) => item.activeCount > 0 || item.pastDueCount > 0 || item.estimatedMrr > 0);
  const chartData = filtered.length > 0 ? filtered : data;

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="estimatedMrr"
              nameKey="planName"
              innerRadius={54}
              outerRadius={86}
              paddingAngle={4}
              stroke="none"
            >
              {chartData.map((item, index) => (
                <Cell key={item.planId} fill={PLAN_COLORS[index % PLAN_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle()}
              formatter={(value) => [formatCurrencyCompact(Number(value) || 0), "Procijenjeni MRR"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-3">
        {chartData.map((item, index) => (
          <div key={item.planId} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-2.5 rounded-full" style={{ backgroundColor: PLAN_COLORS[index % PLAN_COLORS.length] }} />
                <p className="text-sm font-semibold text-slate-900">{item.planName}</p>
              </div>
              <p className="text-sm font-semibold text-slate-900">{formatCurrencyCompact(item.estimatedMrr)}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500">{item.activeCount} aktivnih · {item.pastDueCount} past due</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductUsageBars({
  companiesWithDocuments,
  companiesWithBids,
  averageDocumentsPerCompany,
  averageBidsPerCompany,
}: {
  companiesWithDocuments: number;
  companiesWithBids: number;
  averageDocumentsPerCompany: number;
  averageBidsPerCompany: number;
}) {
  const data = [
    { label: "Firme s dokumentima", value: companiesWithDocuments, fill: "#2563eb" },
    { label: "Firme s ponudama", value: companiesWithBids, fill: "#8b5cf6" },
    { label: "Prosj. dokumenata", value: averageDocumentsPerCompany, fill: "#10b981" },
    { label: "Prosj. ponuda", value: averageBidsPerCompany, fill: "#f59e0b" },
  ];

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, left: 24, bottom: 8 }}>
          <CartesianGrid stroke="#e2e8f0" horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#475569", fontSize: 12 }} width={120} />
          <Tooltip contentStyle={tooltipStyle()} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
