"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { authFetch } from "@/hooks/useAuthFetch";
import { SearchResponse } from "@/lib/types/log";
import SearchFilters, { SearchFilterValues } from "@/components/dashboard/SearchFilters";
import LogsTable from "@/components/dashboard/LogsTable";

const PAGE_SIZE = 25;

const EMPTY_FILTERS: SearchFilterValues = {
  keyword: "",
  source: "",
  user: "",
  src_ip: "",
  severityMin: "",
  from: "",
  to: "",
};

async function fetchSearchResults(f: SearchFilterValues, pageIndex: number): Promise<SearchResponse> {
  const params = new URLSearchParams({
    keyword: f.keyword,
    source: f.source,
    user: f.user,
    src_ip: f.src_ip,
    from: f.from,
    to: f.to,
    size: String(PAGE_SIZE),
    page: String(pageIndex),
  });
  if (f.severityMin) params.set("severity_min", f.severityMin);

  const res = await authFetch(`/api/search?${params}`);
  if (!res.ok) throw new Error("Search request failed");
  return res.json();
}

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilterValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);

  const {
    data,
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: ["search", appliedFilters, page],
    queryFn: () => fetchSearchResults(appliedFilters, page),
  });

  const logs = useMemo(() => data?.hits?.map((h) => h._source) || [], [data]);
  const total = data?.total?.value ?? 0;
  const error = isError ? "Failed to load logs. Please try again." : "";

  const handleSearch = () => {
    setAppliedFilters(filters);
    setPage(0);
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(0);
  };

  const goToPage = (next: number) => {
    setPage(next);
  };

  const activeCount = useMemo(
    () => Object.values(appliedFilters).filter((v) => v !== "").length,
    [appliedFilters]
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Log Search</h1>
        {!loading && (
          <span className="text-xs text-gray-500">
            {total.toLocaleString()} result{total === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <SearchFilters
        values={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
        loading={loading}
        activeCount={activeCount}
      />

      <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
        {error && <p className="p-4 text-sm text-red-400">{error}</p>}
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="w-6 h-6 border-2 border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <LogsTable logs={logs} />
            {total > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-700 text-sm text-gray-400">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {total.toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 0}
                    className="p-1.5 rounded border border-zinc-700 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page + 1 >= totalPages}
                    className="p-1.5 rounded border border-zinc-700 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
