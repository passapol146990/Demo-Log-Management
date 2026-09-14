"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { LOG_SOURCES } from "@/lib/types/log";

export interface SearchFilterValues {
  keyword: string;
  source: string;
  user: string;
  src_ip: string;
  severityMin: string;
  from: string;
  to: string;
}

interface SearchFiltersProps {
  values: SearchFilterValues;
  onChange: (values: SearchFilterValues) => void;
  onSearch: () => void;
  onReset: () => void;
  loading: boolean;
  activeCount: number;
}

const inputClass =
  "w-full p-2 bg-zinc-900 text-white text-sm rounded-md border border-zinc-700 focus:border-blue-500 focus:outline-none placeholder:text-gray-500";

export default function SearchFilters({ values, onChange, onSearch, onReset, loading, activeCount }: SearchFiltersProps) {
  const [expanded, setExpanded] = useState(false);
  const set = (patch: Partial<SearchFilterValues>) => onChange({ ...values, ...patch });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-800 rounded-lg p-4 mb-6 border border-zinc-700">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={values.keyword}
            onChange={(e) => set({ keyword: e.target.value })}
            placeholder="Search raw text, user, host, action, rule, IP..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={values.source}
          onChange={(e) => set({ source: e.target.value })}
          className={`${inputClass} w-auto min-w-[140px]`}
        >
          <option value="">All Sources</option>
          {LOG_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border transition-colors ${
            expanded || activeCount > 0
              ? "bg-blue-600/10 border-blue-500 text-blue-400"
              : "bg-zinc-900 border-zinc-700 text-gray-300 hover:border-zinc-600"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeCount > 0 && (
            <span className="ml-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-zinc-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">User</label>
            <input
              type="text"
              value={values.user}
              onChange={(e) => set({ user: e.target.value })}
              placeholder="e.g. alice"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Source IP</label>
            <input
              type="text"
              value={values.src_ip}
              onChange={(e) => set({ src_ip: e.target.value })}
              placeholder="e.g. 203.0.113"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min Severity</label>
            <select value={values.severityMin} onChange={(e) => set({ severityMin: e.target.value })} className={inputClass}>
              <option value="">Any</option>
              {[8, 6, 4, 2].map((v) => (
                <option key={v} value={v}>
                  {v}+ {v >= 8 ? "(Critical)" : v >= 4 ? "(Warning)" : "(Info)"}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="datetime-local"
                value={values.from}
                onChange={(e) => set({ from: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="datetime-local"
                value={values.to}
                onChange={(e) => set({ to: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {activeCount > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
            Clear all filters
          </button>
        </div>
      )}
    </form>
  );
}
