"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface CompetitorSignalChartProps {
  data: Array<{
    name: string;
    signal_score: number;
    wins: number;
    recent_wins_90d: number;
  }>;
}

export function CompetitorSignalChart({ data }: CompetitorSignalChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm font-medium text-slate-400">Nema podataka za prikaz.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#475569", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            fontSize: "12px",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
          }}
          formatter={(value, name, item) => {
            if (name === "signal_score") {
              return [
                String(value ?? "—"),
                `Signal · ${item.payload.wins} pobjeda · ${item.payload.recent_wins_90d} u 90 dana`,
              ];
            }
            return [String(value ?? "—"), name];
          }}
        />
        <Bar dataKey="signal_score" fill="#7c3aed" radius={[0, 8, 8, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
