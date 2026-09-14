"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/hooks/useAuthFetch";

interface ResetSystemButtonProps {
  onReset: () => void;
}

export default function ResetSystemButton({ onReset }: ResetSystemButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      const res = await authFetch("/api/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset system data");
        return;
      }
      toast.success(`Reset complete: ${data.logsDeleted} logs, ${data.alertsDeleted} alerts deleted`);
      setShowConfirm(false);
      onReset();
    } catch {
      toast.error("Failed to reset system data");
    } finally {
      setBusy(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-1.5">
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
        <span className="text-xs text-red-300">Delete ALL logs &amp; alerts across every tenant?</span>
        <button
          onClick={handleConfirm}
          disabled={busy}
          className="px-2.5 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? "Resetting..." : "Confirm"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={busy}
          className="px-2.5 py-1 bg-zinc-700 text-white text-xs rounded hover:bg-zinc-600"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      title="Delete all logs and alerts across every tenant"
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 rounded-md hover:bg-red-500/10 transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" />
      Reset System Data
    </button>
  );
}
