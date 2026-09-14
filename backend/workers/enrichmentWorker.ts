import { findUnenrichedLogs, updateLogById } from "@/lib/opensearch";
import { enrichLog } from "@/lib/enrichment";
import { LogEntry } from "@/lib/types/log";

const INTERVAL_MS = Number(process.env.ENRICHMENT_INTERVAL_MS) || 15000;
const BATCH_SIZE = Number(process.env.ENRICHMENT_BATCH_SIZE) || 100;
const RATE_LIMIT_PER_SEC = Number(process.env.ENRICHMENT_RATE_LIMIT_PER_SEC) || 100;
const MIN_DELAY_MS = 1000 / RATE_LIMIT_PER_SEC;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface EnrichmentStats {
  processed: number;
  geoHits: number;
  rdnsHits: number;
  errors: number;
}

async function enrichOne(log: { index: string; id: string; source: Record<string, unknown> }, stats: EnrichmentStats) {
  try {
    const enriched = await enrichLog(log.source as unknown as LogEntry);
    if (enriched.src_ip_geo || enriched.dst_ip_geo) stats.geoHits += 1;
    if (enriched.src_ip_hostname || enriched.dst_ip_hostname) stats.rdnsHits += 1;

    await updateLogById(log.index, log.id, {
      src_ip_geo: enriched.src_ip_geo,
      dst_ip_geo: enriched.dst_ip_geo,
      src_ip_hostname: enriched.src_ip_hostname,
      dst_ip_hostname: enriched.dst_ip_hostname,
      enriched_at: enriched.enriched_at,
    });
    stats.processed += 1;
  } catch {
    stats.errors += 1;
  }
}

export async function runEnrichmentCycle(): Promise<EnrichmentStats> {
  const stats: EnrichmentStats = { processed: 0, geoHits: 0, rdnsHits: 0, errors: 0 };
  const started = Date.now();

  try {
    const logs = await findUnenrichedLogs(BATCH_SIZE);
    for (const log of logs) {
      const stepStart = Date.now();
      await enrichOne(log, stats);
      const elapsed = Date.now() - stepStart;
      if (elapsed < MIN_DELAY_MS) await sleep(MIN_DELAY_MS - elapsed);
    }
  } catch (error) {
    console.error("Enrichment cycle failed:", error);
  }

  const durationMs = Date.now() - started;
  if (stats.processed > 0 || stats.errors > 0) {
    console.log(
      `Enrichment: processed=${stats.processed} geoHits=${stats.geoHits} rdnsHits=${stats.rdnsHits} errors=${stats.errors} durationMs=${durationMs}`
    );
  }
  return stats;
}

let currentTimeout: NodeJS.Timeout | null = null;

function scheduleNext() {
  if (currentTimeout) clearTimeout(currentTimeout);
  currentTimeout = setTimeout(() => {
    runEnrichmentCycle().then(scheduleNext);
  }, INTERVAL_MS);
}

if (typeof setInterval !== "undefined") {
  console.log(`Enrichment worker started (interval=${INTERVAL_MS}ms, batchSize=${BATCH_SIZE}, rateLimit=${RATE_LIMIT_PER_SEC}/sec)`);
  scheduleNext();
}

runEnrichmentCycle();
