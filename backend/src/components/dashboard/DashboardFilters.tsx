"use client";

import { LOG_SOURCES } from "@/lib/types/log";

interface DashboardFiltersProps {
  source: string;
  from: string;
  to: string;
  onSourceChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  loading: boolean;
}

export default function DashboardFilters({
  source,
  from,
  to,
  onSourceChange,
  onFromChange,
  onToChange,
  onApply,
  onReset,
  loading,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <select
        value={source}
        onChange={(e) => onSourceChange(e.target.value)}
        className="p-2 bg-zinc-800 text-white rounded border border-gray-600"
      >
        <option value="">All Sources</option>
        {LOG_SOURCES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <input
        type="datetime-local"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        className="p-2 bg-zinc-800 text-white rounded border border-gray-600"
      />
      <input
        type="datetime-local"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        className="p-2 bg-zinc-800 text-white rounded border border-gray-600"
      />
      <button
        onClick={onApply}
        disabled={loading}
        className="px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        Apply
      </button>
      <button
        onClick={onReset}
        disabled={loading}
        className="px-4 bg-zinc-700 text-white rounded hover:bg-zinc-600 disabled:opacity-50"
      >
        Reset
      </button>
    </div>
  );
}
