"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MarketMonthlyInsight } from "@/lib/market-intelligence";

interface MonthlyAwardsChartProps {
  data: MarketMonthlyInsight[];
}

function formatKM(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${value.toFixed(0)} KM`;
}

export function MonthlyAwardsChart({ data }: MonthlyAwardsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm font-medium text-slate-400">Nema podataka za prikaz.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <YAxis
          yAxisId="right"
          orientation="right"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          tickFormatter={(value: number) => formatKM(value)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            fontSize: "12px",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
          }}
          formatter={(value, name) => [
            name === "count" ? String(value ?? "—") : formatKM(Number(value) || 0),
            name === "count" ? "Broj ugovora" : "Vrijednost",
          ]}
        />
        <Area yAxisId="right" type="monotone" dataKey="total_value" stroke="#2563eb" fill="#dbeafe" fillOpacity={0.85} />
        <Bar yAxisId="left" dataKey="count" barSize={18} fill="#0f172a" radius={[6, 6, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="total_value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: "#2563eb" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
