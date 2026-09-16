export interface AlertEvent {
  id: string;
  rule_id: string;
  rule_name: string;
  triggered_at: string;
  description: string;
  severity: number;
  tenant: string;
}

export type ToastSeverityLevel = "error" | "warning" | "success";

export function severityToastLevel(severity: number): ToastSeverityLevel {
  if (severity >= 8) return "error";
  if (severity >= 4) return "warning";
  return "success";
}

export { severityBadgeClass } from "@/lib/severity";
