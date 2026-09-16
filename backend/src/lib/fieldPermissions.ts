import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const CONFIG_PATH = resolve(process.cwd(), "src", "config", "field-permissions.json");

export const ALL_LOG_FIELDS = [
  "@timestamp", "tenant", "source", "vendor", "product",
  "event_type", "event_subtype", "severity", "action",
  "src_ip", "src_port", "dst_ip", "dst_port", "protocol",
  "user", "host", "process", "url", "http_method", "status_code",
  "rule_name", "rule_id", "cloud", "raw", "_tags",
] as const;

export const FALLBACK_TENANTS = ["demoA", "demoB"];

export interface FieldPermissionEntry {
  role: string;
  tenant: string;
  hiddenFields: string[];
}

export interface FieldPermissionsConfig {
  rules: FieldPermissionEntry[];
}

let cached: FieldPermissionsConfig | null = null;

export function loadFieldPermissions(): FieldPermissionsConfig {
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    cached = JSON.parse(raw) as FieldPermissionsConfig;
    return cached;
  } catch {
    cached = { rules: [] };
    return cached;
  }
}

export function getFieldPermissions(): FieldPermissionsConfig {
  return cached || loadFieldPermissions();
}

export function saveFieldPermissions(cfg: FieldPermissionsConfig): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  cached = cfg;
}

export function getHiddenFields(role: string, tenant: string): string[] {
  const cfg = getFieldPermissions();
  const entry = cfg.rules.find(
    (r) => r.role === role && (r.tenant === tenant || r.tenant === "*")
  );
  return entry?.hiddenFields ?? [];
}

export function stripFields<T extends Record<string, unknown>>(
  doc: T,
  hiddenFields: string[]
): Partial<T> {
  if (hiddenFields.length === 0) return doc;
  const result = { ...doc };
  for (const field of hiddenFields) {
    delete result[field];
  }
  return result;
}
