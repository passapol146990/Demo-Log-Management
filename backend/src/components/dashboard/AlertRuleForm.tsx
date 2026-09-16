"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authFetch } from "@/hooks/useAuthFetch";
import { AlertRule, MATCH_FIELD_OPTIONS } from "@/lib/types/alertRule";

interface AlertRuleFormProps {
  rule?: AlertRule;
  onSaved: () => void;
  onCancel: () => void;
}

const inputClass =
  "w-full p-2 bg-zinc-900 text-white text-sm rounded-md border border-zinc-700 focus:border-blue-500 focus:outline-none";

export default function AlertRuleForm({ rule, onSaved, onCancel }: AlertRuleFormProps) {
  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [matchField, setMatchField] = useState(rule?.match_field ?? "event_subtype");
  const [matchValue, setMatchValue] = useState(rule?.match_value ?? "");
  const [groupBy, setGroupBy] = useState(rule?.group_by ?? "src_ip");
  const [threshold, setThreshold] = useState(rule?.threshold ?? 5);
  const [windowMinutes, setWindowMinutes] = useState(rule?.window_minutes ?? 5);
  const [useCustomCooldown, setUseCustomCooldown] = useState(rule?.cooldown_minutes != null);
  const [cooldownMinutes, setCooldownMinutes] = useState(rule?.cooldown_minutes ?? 5);
  const [severity, setSeverity] = useState(rule?.severity ?? 5);
  const [webhookUrl, setWebhookUrl] = useState(rule?.webhook_url ?? "");
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!rule;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      name,
      description,
      enabled,
      match_field: matchField,
      match_value: matchValue,
      group_by: groupBy,
      threshold: Number(threshold),
      window_minutes: Number(windowMinutes),
      cooldown_minutes: useCustomCooldown ? Number(cooldownMinutes) : null,
      severity: Number(severity),
      webhook_url: webhookUrl.trim() || undefined,
    };
    try {
      const res = await authFetch("/api/alert-rules", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: rule!.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save rule");
        return;
      }
      toast.success(isEdit ? `Rule "${name}" updated` : `Rule "${name}" created`);
      onSaved();
    } catch {
      toast.error("Failed to save rule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900/60 border border-zinc-700 rounded-lg p-4 mb-4">
      <h4 className="text-sm font-medium text-white mb-3">{isEdit ? "Edit Rule" : "New Rule"}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Rule Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Repeated Login Failures"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Description</label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Shown in the alert message"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">When field</label>
          <select value={matchField} onChange={(e) => setMatchField(e.target.value)} className={inputClass}>
            {MATCH_FIELD_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">equals</label>
          <input
            type="text"
            required
            value={matchValue}
            onChange={(e) => setMatchValue(e.target.value)}
            placeholder="e.g. login_failure"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">group by</label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className={inputClass}>
            {MATCH_FIELD_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Severity (0-10)</label>
          <input
            type="number"
            required
            min={0}
            max={10}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Threshold (count ≥)</label>
          <input
            type="number"
            required
            min={1}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Time window (minutes)</label>
          <input
            type="number"
            required
            min={1}
            value={windowMinutes}
            onChange={(e) => setWindowMinutes(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Cooldown</label>
          <div className="flex items-center gap-2">
            <select
              value={useCustomCooldown ? "custom" : "auto"}
              onChange={(e) => setUseCustomCooldown(e.target.value === "custom")}
              className={inputClass}
            >
              <option value="auto">Auto (≥ time window)</option>
              <option value="custom">Custom (minutes)</option>
            </select>
            {useCustomCooldown && (
              <input
                type="number"
                required
                min={1}
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                className={`${inputClass} w-20 shrink-0`}
              />
            )}
          </div>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-blue-600" />
            Enabled
          </label>
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">Webhook URL (optional)</label>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://webhook.site/... (falls back to WEBHOOK_URL env)"
          className={inputClass}
        />
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Plain-language preview: <span className="text-gray-300">If {matchField} = &quot;{matchValue || "..."}&quot;
        happens ≥ {threshold} times from the same {groupBy} within {windowMinutes} minute(s), trigger a severity {severity} alert,
        then suppress repeats {useCustomCooldown ? `for ${cooldownMinutes} minute(s)` : `for at least ${windowMinutes} minute(s) (the time window)`}.</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Rule"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 bg-zinc-700 text-white text-sm rounded-md hover:bg-zinc-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
