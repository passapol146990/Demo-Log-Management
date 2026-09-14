"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function TimelineChart({ data }: { data: { time: string; count: number }[] }) {
  const chartData = data.map((d) => ({ ...d, label: new Date(d.time).toLocaleString() }));
  return (
    <div className="bg-zinc-800 p-4 rounded">
      <h3 className="text-gray-400 mb-4">Timeline</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 12 }} />
          <YAxis stroke="#9ca3af" allowDecimals={false} />
          <Tooltip contentStyle={{ backgroundColor: "#27272a", border: "none" }} />
          <Line type="monotone" dataKey="count" stroke="#3b82f6" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
