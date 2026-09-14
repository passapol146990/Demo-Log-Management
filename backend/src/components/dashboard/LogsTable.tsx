"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Inbox } from "lucide-react";
import { LogEntry } from "@/lib/types/log";
import { severityBadgeClass, severityLabel } from "@/lib/severity";

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-700 text-gray-300 whitespace-nowrap">
      {source}
    </span>
  );
}

function DetailRow({ log }: { log: LogEntry }) {
  const fields: [string, string | number][] = (
    [
      ["vendor", log.vendor],
      ["product", log.product],
      ["event_type", log.event_type],
      ["event_subtype", log.event_subtype],
      ["dst_ip", log.dst_ip],
      ["dst_port", log.dst_port],
      ["protocol", log.protocol],
      ["host", log.host],
      ["process", log.process],
      ["url", log.url],
      ["http_method", log.http_method],
      ["status_code", log.status_code],
      ["rule_name", log.rule_name],
      ["rule_id", log.rule_id],
    ] as [string, string | number][]
  ).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== 0);

  return (
    <tr className="bg-zinc-900/60 border-t border-zinc-700">
      <td colSpan={7} className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 mb-3">
          {fields.map(([k, v]) => (
            <div key={k}>
              <span className="text-xs text-gray-500">{k}</span>
              <p className="text-sm text-gray-200 truncate">{String(v)}</p>
            </div>
          ))}
        </div>
        {log.raw && (
          <details className="mt-2">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">Raw payload</summary>
            <pre className="mt-2 p-3 bg-black/40 rounded text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-all">
              {log.raw}
            </pre>
          </details>
        )}
      </td>
    </tr>
  );
}

export default function LogsTable({ logs, limit }: { logs: LogEntry[]; limit?: number }) {
  const rows = limit ? logs.slice(0, limit) : logs;
  const [expanded, setExpanded] = useState<number | null>(null);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <Inbox className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm">No logs match the current filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b border-zinc-700 text-xs uppercase tracking-wide">
            <th className="w-8"></th>
            <th className="text-left p-2 font-medium">Time</th>
            <th className="text-left p-2 font-medium">Source</th>
            <th className="text-left p-2 font-medium">Severity</th>
            <th className="text-left p-2 font-medium">Action</th>
            <th className="text-left p-2 font-medium">Src IP</th>
            <th className="text-left p-2 font-medium">User</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((log, i) => (
            <Fragment key={i}>
              <tr
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="border-t border-zinc-800 hover:bg-zinc-700/40 cursor-pointer transition-colors"
              >
                <td className="p-2 text-gray-500">
                  {expanded === i ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </td>
                <td className="p-2 text-gray-300 whitespace-nowrap font-mono text-xs">
                  {new Date(log["@timestamp"]).toLocaleString()}
                </td>
                <td className="p-2">
                  <SourceBadge source={log.source} />
                </td>
                <td className="p-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${severityBadgeClass(log.severity)}`}>
                    {log.severity} · {severityLabel(log.severity)}
                  </span>
                </td>
                <td className="p-2 text-gray-300">{log.action || "—"}</td>
                <td className="p-2 text-gray-300 font-mono text-xs">{log.src_ip || "—"}</td>
                <td className="p-2 text-gray-300">{log.user || "—"}</td>
              </tr>
              {expanded === i && <DetailRow log={log} />}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
