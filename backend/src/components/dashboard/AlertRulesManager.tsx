"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/hooks/useAuthFetch";
import { AlertRule } from "@/lib/types/alertRule";
import { severityBadgeClass } from "@/lib/severity";
import AlertRuleForm from "@/components/dashboard/AlertRuleForm";

async function fetchRulesList(): Promise<AlertRule[]> {
  const res = await authFetch("/api/alert-rules");
  const data = await res.json();
  return data.rules || [];
}

export default function AlertRulesManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: rules = [], isLoading: loading } = useQuery({
    queryKey: ["alert-rules"],
    queryFn: fetchRulesList,
  });

  const invalidateRules = () => queryClient.invalidateQueries({ queryKey: ["alert-rules"] });

  const handleToggleEnabled = async (rule: AlertRule) => {
    setBusyId(rule.id);
    try {
      const res = await authFetch("/api/alert-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update rule");
        return;
      }
      toast.success(`Rule "${rule.name}" ${!rule.enabled ? "enabled" : "disabled"}`);
      invalidateRules();
    } catch {
      toast.error("Failed to update rule");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (rule: AlertRule) => {
    setBusyId(rule.id);
    try {
      const res = await authFetch("/api/alert-rules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete rule");
        return;
      }
      toast.success(`Rule "${rule.name}" deleted`);
      setDeleteTarget(null);
      invalidateRules();
    } catch {
      toast.error("Failed to delete rule");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex justify-center">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
        <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500">{rules.length} rule(s)</span>
        {!showForm && !editingRule && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" />
            New Rule
          </button>
        )}
      </div>

      {showForm && (
        <AlertRuleForm
          onSaved={() => {
            setShowForm(false);
            invalidateRules();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingRule && (
        <AlertRuleForm
          rule={editingRule}
          onSaved={() => {
            setEditingRule(null);
            invalidateRules();
          }}
          onCancel={() => setEditingRule(null)}
        />
      )}

      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="border border-zinc-700 rounded-lg p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-medium text-white">{rule.name}</h4>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${severityBadgeClass(rule.severity)}`}>
                    severity {rule.severity}
                  </span>
                  {!rule.enabled && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-700 text-gray-400">Disabled</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">{rule.description}</p>
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  {rule.match_field}=&quot;{rule.match_value}&quot; · group by {rule.group_by} · ≥{rule.threshold} in{" "}
                  {rule.window_minutes}m · cooldown{" "}
                  {rule.cooldown_minutes != null ? `${rule.cooldown_minutes}m` : `${rule.window_minutes}m (auto)`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <label className="relative inline-flex items-center cursor-pointer mr-1">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    disabled={busyId === rule.id}
                    onChange={() => handleToggleEnabled(rule)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-600 peer-checked:bg-blue-600 rounded-full transition-colors peer-disabled:opacity-50" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                </label>
                <button
                  onClick={() => setEditingRule(rule)}
                  title="Edit rule"
                  className="p-1.5 rounded hover:bg-zinc-700 text-gray-400 hover:text-white"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(deleteTarget === rule.id ? null : rule.id)}
                  title="Delete rule"
                  className="p-1.5 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {deleteTarget === rule.id && (
              <div className="mt-3 pt-3 border-t border-zinc-700 flex items-center gap-3">
                <span className="text-sm text-red-300">Delete &quot;{rule.name}&quot;? This cannot be undone.</span>
                <button
                  onClick={() => handleDelete(rule)}
                  disabled={busyId === rule.id}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {busyId === rule.id ? "Deleting..." : "Confirm Delete"}
                </button>
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-3 py-1.5 bg-zinc-700 text-white text-xs rounded-md hover:bg-zinc-600"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
        {rules.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No alert rules yet</p>}
      </div>
    </div>
    </div>
  );
}
