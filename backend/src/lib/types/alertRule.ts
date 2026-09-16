export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  match_field: string;
  match_value: string;
  group_by: string;
  threshold: number;
  window_minutes: number;
  cooldown_minutes?: number | null;
  severity: number;
  webhook_url?: string;
}

export const MATCH_FIELD_OPTIONS = [
  "source",
  "vendor",
  "product",
  "event_type",
  "event_subtype",
  "action",
  "protocol",
  "user",
  "host",
  "process",
  "url",
  "http_method",
  "rule_name",
  "rule_id",
  "src_ip",
  "dst_ip",
] as const;
