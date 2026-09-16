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

export const GROUP_BY_OPTIONS = MATCH_FIELD_OPTIONS;

export const DEFAULT_ALERT_RULES: Omit<AlertRule, "id">[] = [
  {
    name: "Login Failures",
    description: "Repeated login failures from the same source IP",
    enabled: true,
    match_field: "event_subtype",
    match_value: "login_failure",
    group_by: "src_ip",
    threshold: 5,
    window_minutes: 5,
    severity: 8,
  },
  {
    name: "CrowdStrike Threat Burst",
    description: "Multiple CrowdStrike threat detections on the same host",
    enabled: false,
    match_field: "source",
    match_value: "crowdstrike",
    group_by: "host",
    threshold: 3,
    window_minutes: 10,
    severity: 9,
  },
];
