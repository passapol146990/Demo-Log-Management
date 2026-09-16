export interface LogEntry {
  "@timestamp": string;
  tenant: string;
  source: string;
  vendor: string;
  product: string;
  event_type: string;
  event_subtype: string;
  severity: number;
  action: string;
  src_ip: string;
  src_port: number;
  dst_ip: string;
  dst_port: number;
  protocol: string;
  user: string;
  host: string;
  process: string;
  url: string;
  http_method: string;
  status_code: number;
  rule_name: string;
  rule_id: string;
  cloud: { account_id: string; region: string; service: string };
  raw: string;
  _tags: string[];
}

export function validateSeverity(v: unknown): number {
  const val = Number(v);
  if (isNaN(val) || val < 0 || val > 10) throw new Error("severity must be 0-10");
  return val;
}
