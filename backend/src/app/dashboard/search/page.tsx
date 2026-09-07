"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface LogEntry {
  "@timestamp": string;
  tenant: string;
  source: string;
  severity: number;
  action: string;
  user: string;
  src_ip: string;
  host: string;
  raw: string;
}

export default function SearchPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const search = async () => {
    setLoading(true);
    const token = document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1");
    const params = new URLSearchParams({ keyword, from: "", to: "" });
    const res = await fetch(`/api/search?${params}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setLogs(data.hits?.hits?.map((h: any) => h._source) || []);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Log Search</h1>
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search..."
          className="flex-1 p-2 bg-zinc-800 text-white rounded border border-gray-600"
        />
        <button onClick={search} className="px-4 bg-blue-600 text-white rounded hover:bg-blue-700">
          Search
        </button>
      </div>
      {loading ? <p>Loading...</p> : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Source</th>
              <th className="text-left p-2">Severity</th>
              <th className="text-left p-2">Action</th>
              <th className="text-left p-2">IP</th>
              <th className="text-left p-2">User</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i} className="border-t border-zinc-700">
                <td className="p-2">{new Date(log["@timestamp"]).toLocaleString()}</td>
                <td className="p-2">{log.source}</td>
                <td className="p-2">{log.severity}</td>
                <td className="p-2">{log.action}</td>
                <td className="p-2">{log.src_ip}</td>
                <td className="p-2">{log.user}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
