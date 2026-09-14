"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { toast } from "sonner";
import { authFetch } from "@/hooks/useAuthFetch";
import { AlertEvent, severityToastLevel } from "@/lib/types/alert";

const POLL_INTERVAL_MS = 5000;

interface AlertsContextValue {
  alerts: AlertEvent[];
  unreadCount: number;
  isLive: boolean;
  markAllRead: () => void;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const seenIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await authFetch("/api/alerts");
        if (!res.ok) return;
        const data: { alerts: AlertEvent[] } = await res.json();
        const incoming = data.alerts || [];
        if (cancelled) return;

        setAlerts(incoming);
        setIsLive(true);

        if (seenIds.current === null) {
          seenIds.current = new Set(incoming.map((a) => a.id));
          return;
        }

        let newCount = 0;
        for (const alert of incoming) {
          if (seenIds.current.has(alert.id)) continue;
          seenIds.current.add(alert.id);
          newCount += 1;
          const level = severityToastLevel(alert.severity);
          toast[level](alert.rule_name, {
            description: alert.description,
            duration: 8000,
          });
        }
        if (newCount > 0) setUnreadCount((c) => c + newCount);
      } catch {
        if (!cancelled) setIsLive(false);
      }
    };

    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const markAllRead = () => setUnreadCount(0);

  return (
    <AlertsContext.Provider value={{ alerts, unreadCount, isLive, markAllRead }}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts(): AlertsContextValue {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertsProvider");
  return ctx;
}
