"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function TopNChart({ title, data }: { title: string; data: { key: string; count: number }[] }) {
  return (
    <div className="bg-zinc-800 p-4 rounded">
      <h3 className="text-gray-400 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
          <XAxis type="number" stroke="#9ca3af" allowDecimals={false} />
          <YAxis type="category" dataKey="key" stroke="#9ca3af" width={100} />
          <Tooltip contentStyle={{ backgroundColor: "#27272a", border: "none" }} />
          <Bar dataKey="count" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
