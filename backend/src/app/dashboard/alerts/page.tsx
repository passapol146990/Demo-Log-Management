"use client";

import { useAlerts } from "@/contexts/AlertsContext";
import { severityBadgeClass } from "@/lib/types/alert";

export default function AlertsPage() {
  const { alerts, isLive } = useAlerts();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Alerts</h1>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
          {isLive ? "Live · refreshes every 5s" : "Reconnecting..."}
        </span>
      </div>
      {alerts.length === 0 ? (
        <p className="text-gray-400">No alerts triggered yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left p-2">Severity</th>
              <th className="text-left p-2">Rule</th>
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert, i) => (
              <tr key={i} className="border-t border-zinc-700">
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${severityBadgeClass(alert.severity)}`}>
                    {alert.severity}
                  </span>
                </td>
                <td className="p-2">{alert.rule_name}</td>
                <td className="p-2">{new Date(alert.triggered_at).toLocaleString()}</td>
                <td className="p-2">{alert.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
