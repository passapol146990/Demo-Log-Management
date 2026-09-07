"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface LogEntry {
  "@timestamp": string;
  tenant: string;
  source: string;
  severity: number;
  action: string;
  user: string;
  src_ip: string;
  host: string;
  event_type: string;
}

export default function DashboardPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1");
    if (!token) return;
    fetch("/api/search?keyword=&from=&to=", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const hits = data.hits?.hits?.map((h: any) => h._source) || [];
        setLogs(hits);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const severityData = logs.reduce((acc: any, log: LogEntry) => {
    const key = String(log.severity);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(severityData).map(([severity, count]) => ({ severity, count }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-zinc-800 p-4 rounded">
              <h3 className="text-gray-400 mb-2">Total Logs</h3>
              <p className="text-3xl font-bold">{logs.length}</p>
            </div>
            <div className="bg-zinc-800 p-4 rounded">
              <h3 className="text-gray-400 mb-2">Sources</h3>
              <p className="text-3xl font-bold">{new Set(logs.map(l => l.source)).size}</p>
            </div>
          </div>
          <div className="bg-zinc-800 p-4 rounded mb-8">
            <h3 className="text-gray-400 mb-4">Severity Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="severity" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-zinc-800 p-4 rounded">
            <h3 className="text-gray-400 mb-4">Recent Logs</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400">
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Source</th>
                  <th className="text-left p-2">Severity</th>
                  <th className="text-left p-2">Action</th>
                  <th className="text-left p-2">User</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 10).map((log, i) => (
                  <tr key={i} className="border-t border-zinc-700">
                    <td className="p-2">{new Date(log["@timestamp"]).toLocaleString()}</td>
                    <td className="p-2">{log.source}</td>
                    <td className="p-2">{log.severity}</td>
                    <td className="p-2">{log.action}</td>
                    <td className="p-2">{log.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
