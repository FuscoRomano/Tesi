"use client";

/*
 * Donut Chart dell'intensità dell'attività motoria (minuti per fascia)
 * basato su recharts. Il foro centrale si ottiene con innerRadius.
 * È un client component perché recharts utilizza API del DOM/finestra.
 */

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ActivitySlice } from "@/types/patient";

interface ActivityDonutChartProps {
  dati: ActivitySlice[];
}

export default function ActivityDonutChart({ dati }: ActivityDonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={dati}
          dataKey="valore"
          nameKey="nome"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          stroke="none"
        >
          {dati.map((fetta) => (
            <Cell key={fetta.nome} fill={fetta.colore} />
          ))}
        </Pie>
        <Tooltip
          formatter={(valore, nome) => [`${valore} min`, nome]}
          contentStyle={{
            borderRadius: "0.5rem",
            border: "1px solid #e2e8f0",
            fontSize: "0.85rem",
          }}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: "0.8rem", color: "#475569" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
