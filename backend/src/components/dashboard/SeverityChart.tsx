"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function SeverityChart({ data }: { data: { severity: string; count: number }[] }) {
  return (
    <div className="bg-zinc-800 p-4 rounded">
      <h3 className="text-gray-400 mb-4">Severity Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="severity" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" allowDecimals={false} />
          <Tooltip contentStyle={{ backgroundColor: "#27272a", border: "none" }} />
          <Bar dataKey="count" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
