"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { authFetch } from "@/hooks/useAuthFetch";
import { AlertEvent, severityToastLevel } from "@/lib/types/alert";

interface AlertsContextValue {
  alerts: AlertEvent[];
  unreadCount: number;
  isLive: boolean;
  markAllRead: () => void;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

async function fetchAlerts(): Promise<AlertEvent[]> {
  const res = await authFetch("/api/alerts");
  if (!res.ok) throw new Error("Failed to fetch alerts");
  const data: { alerts: AlertEvent[] } = await res.json();
  return data.alerts || [];
}

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const seenIds = useRef<Set<string> | null>(null);

  const { data, isError, isSuccess } = useQuery({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
  });

  const alerts = data ?? [];

  useEffect(() => {
    if (!isSuccess || !data) return;

    if (seenIds.current === null) {
      seenIds.current = new Set(data.map((a) => a.id));
      setReadIds(new Set(data.map((a) => a.id)));
      return;
    }

    for (const alert of data) {
      if (seenIds.current.has(alert.id)) continue;
      seenIds.current.add(alert.id);
      const level = severityToastLevel(alert.severity);
      toast[level](alert.rule_name, {
        description: alert.description,
        duration: 8000,
      });
    }
  }, [data, isSuccess]);

  const unreadCount = alerts.filter((a) => !readIds.has(a.id)).length;
  const markAllRead = () => setReadIds(new Set(alerts.map((a) => a.id)));

  return (
    <AlertsContext.Provider value={{ alerts, unreadCount, isLive: isSuccess && !isError, markAllRead }}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts(): AlertsContextValue {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertsProvider");
  return ctx;
}
