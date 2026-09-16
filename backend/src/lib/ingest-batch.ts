import { ZodError } from "zod";
import { ingestSchema } from "./ingest-schema";
import { normalizeApi } from "./normalizers/api";
import { normalizeCrowdStrike } from "./normalizers/crowdstrike";
import { normalizeAWS } from "./normalizers/aws";
import { normalizeM365 } from "./normalizers/m365";
import { normalizeAD } from "./normalizers/ad";
import { normalizeNetwork } from "./normalizers/network";
import { normalizeFirewall } from "./normalizers/firewall";

export function normalize(source: string, data: Record<string, unknown>, raw: string): Record<string, unknown> {
  switch (source) {
    case "firewall": return normalizeFirewall(raw, data);
    case "api": return normalizeApi(data);
    case "crowdstrike": return normalizeCrowdStrike(data);
    case "aws": return normalizeAWS(data);
    case "m365": return normalizeM365(data);
    case "ad": return normalizeAD(data);
    case "network": return normalizeNetwork(raw, data);
    default: throw new Error(`Unknown source: ${source}`);
  }
}

export interface BatchItemResult {
  index: number;
  status: "ok" | "error";
  error?: string;
}

export interface NormalizedBatchItem {
  index: number;
  log: Record<string, unknown>;
}

export interface BatchValidationResult {
  total: number;
  results: BatchItemResult[];
  normalizedLogs: NormalizedBatchItem[];
}

export function validateAndNormalizeBatch(items: unknown[], tenant: string): BatchValidationResult {
  const results: BatchItemResult[] = [];
  const normalizedLogs: NormalizedBatchItem[] = [];

  items.forEach((item, index) => {
    try {
      const parsed = ingestSchema.parse(item);
      const data = { ...parsed, tenant };
      const log = normalize(parsed.source, data, JSON.stringify(item));
      normalizedLogs.push({ index, log });
      results.push({ index, status: "ok" });
    } catch (error) {
      const message = error instanceof ZodError
        ? `Validation failed: ${error.errors.map((e) => `${e.path.join(".")} ${e.message}`).join("; ")}`
        : (error as Error).message;
      results.push({ index, status: "error", error: message });
    }
  });

  return { total: items.length, results, normalizedLogs };
}
