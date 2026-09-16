import type { GeoIPData } from "@/lib/geoip";
import type { RDNSData } from "@/lib/rdns";

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
  raw: string;
  _tags: string[];
  src_ip_geo?: GeoIPData;
  dst_ip_geo?: GeoIPData;
  src_ip_hostname?: RDNSData;
  dst_ip_hostname?: RDNSData;
  enriched_at?: string;
}

export interface SearchResponse {
  hits: { _source: LogEntry }[];
  total: { value: number; relation: string };
}

export const LOG_SOURCES = ["firewall", "api", "crowdstrike", "aws", "m365", "ad", "network"] as const;
export type LogSource = (typeof LOG_SOURCES)[number];
