"use client";

/*
 * Bar Chart dell'andamento del sonno (ore per giorno) basato su recharts.
 * È un client component perché recharts utilizza API del DOM/finestra.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SleepPoint } from "@/types/patient";

interface SleepBarChartProps {
  dati: SleepPoint[];
}

export default function SleepBarChart({ dati }: SleepBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={dati} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis
          dataKey="giorno"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          unit="h"
        />
        <Tooltip
          cursor={{ fill: "rgba(37, 99, 235, 0.08)" }}
          formatter={(valore) => [`${valore} h`, "Sonno"]}
          contentStyle={{
            borderRadius: "0.5rem",
            border: "1px solid #e2e8f0",
            fontSize: "0.85rem",
          }}
        />
        <Bar dataKey="ore" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
