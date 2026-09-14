"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/hooks/useAuthFetch";
import { LogEntry, SearchResponse } from "@/lib/types/log";
import { topByField, timelineBuckets, severityDistribution } from "@/lib/aggregations";
import { useAlerts } from "@/contexts/AlertsContext";
import StatCard from "@/components/dashboard/StatCard";
import TopNChart from "@/components/dashboard/TopNChart";
import TimelineChart from "@/components/dashboard/TimelineChart";
import SeverityChart from "@/components/dashboard/SeverityChart";
import LogsTable from "@/components/dashboard/LogsTable";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import ResetSystemButton from "@/components/dashboard/ResetSystemButton";

const AUTO_REFRESH_MS = 5000;

export default function DashboardPage() {
  const { alerts } = useAlerts();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [source, setSource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filtersRef = useRef({ source, from, to });
  useEffect(() => {
    filtersRef.current = { source, from, to };
  }, [source, from, to]);

  useEffect(() => {
    const timer = setTimeout(() => {
      authFetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => setIsAdmin(data.user?.role === "admin"))
        .catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const fetchLogs = useCallback((params: { source: string; from: string; to: string }, showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    const query = new URLSearchParams({
      keyword: "",
      from: params.from,
      to: params.to,
      source: params.source,
      size: "1000",
    });
    authFetch(`/api/search?${query}`)
      .then((res) => res.json() as Promise<SearchResponse>)
      .then((searchData) => setLogs(searchData.hits?.map((h) => h._source) || []))
      .catch(() => {})
      .finally(() => {
        if (showSpinner) setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchLogs(filtersRef.current, true);
    const timer = setInterval(() => fetchLogs(filtersRef.current, false), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchLogs]);

  const applyFilters = () => fetchLogs({ source, from, to }, true);

  const resetFilters = () => {
    setSource("");
    setFrom("");
    setTo("");
    fetchLogs({ source: "", from: "", to: "" }, true);
  };

  const topSources = topByField(logs, "source");
  const topUsers = topByField(logs, "user");
  const topSrcIps = topByField(logs, "src_ip");
  const timeline = timelineBuckets(logs);
  const severity = severityDistribution(logs);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live · refreshes every 5s
          </span>
        </div>
        {isAdmin && <ResetSystemButton onReset={() => fetchLogs(filtersRef.current, true)} />}
      </div>
      <DashboardFilters
        source={source}
        from={from}
        to={to}
        onSourceChange={setSource}
        onFromChange={setFrom}
        onToChange={setTo}
        onApply={applyFilters}
        onReset={resetFilters}
        loading={loading}
      />
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Logs" value={logs.length} />
            <StatCard label="Sources" value={new Set(logs.map((l) => l.source)).size} />
            <StatCard label="Alerts Triggered" value={alerts.length} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <TopNChart title="Top Source" data={topSources} />
            <TopNChart title="Top User" data={topUsers} />
            <TopNChart title="Top Src IP" data={topSrcIps} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <TimelineChart data={timeline} />
            <SeverityChart data={severity} />
          </div>

          <div className="bg-zinc-800 p-4 rounded">
            <h3 className="text-gray-400 mb-4">Recent Logs</h3>
            <LogsTable logs={logs} limit={10} />
          </div>
        </>
      )}
    </div>
  );
}
