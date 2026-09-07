"use client";

import { useEffect, useState } from "react";

interface Alert {
  id: string;
  rule_name: string;
  triggered_at: string;
  description: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetch("/api/alerts")
      .then(res => res.json())
      .then(data => setAlerts(data.alerts || []))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Alerts</h1>
      {alerts.length === 0 ? (
        <p className="text-gray-400">No alerts triggered yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left p-2">Rule</th>
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert, i) => (
              <tr key={i} className="border-t border-zinc-700">
                <td className="p-2">{alert.rule_name}</td>
                <td className="p-2">{alert.triggered_at}</td>
                <td className="p-2">{alert.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
