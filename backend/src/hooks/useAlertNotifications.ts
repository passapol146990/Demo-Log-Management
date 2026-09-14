"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { authFetch } from "@/hooks/useAuthFetch";
import { AlertEvent, severityToastLevel } from "@/lib/types/alert";

const POLL_INTERVAL_MS = 5000;

export function useAlertNotifications() {
  const seenIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await authFetch("/api/alerts");
        if (!res.ok) return;
        const data: { alerts: AlertEvent[] } = await res.json();
        const alerts = data.alerts || [];

        if (seenIds.current === null) {
          seenIds.current = new Set(alerts.map((a) => a.id));
          return;
        }

        for (const alert of alerts) {
          if (seenIds.current.has(alert.id)) continue;
          seenIds.current.add(alert.id);
          if (cancelled) continue;
          const level = severityToastLevel(alert.severity);
          toast[level](alert.rule_name, {
            description: alert.description,
            duration: 8000,
          });
        }
      } catch {}
    };

    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
}
