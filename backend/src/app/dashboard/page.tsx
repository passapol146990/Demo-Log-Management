"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

interface DashboardFilterValues {
  source: string;
  from: string;
  to: string;
}

async function fetchDashboardLogs(filters: DashboardFilterValues): Promise<LogEntry[]> {
  const query = new URLSearchParams({
    keyword: "",
    from: filters.from,
    to: filters.to,
    source: filters.source,
    size: "1000",
  });
  const res = await authFetch(`/api/search?${query}`);
  if (!res.ok) throw new Error("Failed to fetch logs");
  const data: SearchResponse = await res.json();
  return data.hits?.map((h) => h._source) || [];
}

async function fetchIsAdmin(): Promise<boolean> {
  const res = await authFetch("/api/auth/me");
  const data = await res.json();
  return data.user?.role === "admin";
}

export default function DashboardPage() {
  const { alerts } = useAlerts();
  const queryClient = useQueryClient();
  const [source, setSource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilterValues>({ source: "", from: "", to: "" });

  const { data: isAdmin = false } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchIsAdmin,
    staleTime: Infinity,
    refetchInterval: false,
  });

  const {
    data: logs = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["dashboard-logs", appliedFilters],
    queryFn: () => fetchDashboardLogs(appliedFilters),
  });

  const applyFilters = () => setAppliedFilters({ source, from, to });

  const resetFilters = () => {
    setSource("");
    setFrom("");
    setTo("");
    setAppliedFilters({ source: "", from: "", to: "" });
  };

  const handleSystemReset = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-logs"] });
    refetch();
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
        {isAdmin && <ResetSystemButton onReset={handleSystemReset} />}
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
