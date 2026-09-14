import { deleteOldLogs } from "@/lib/opensearch";

const RETENTION_DAYS = Number(process.env.LOG_RETENTION_DAYS) || 7;
const INTERVAL_MS = 24 * 60 * 60 * 1000;

async function runRetentionCleanup() {
  try {
    await deleteOldLogs(RETENTION_DAYS);
    console.log(`Retention: deleted logs older than ${RETENTION_DAYS} days`);
  } catch (error) {
    console.error("Retention cleanup failed:", error);
  }
}

console.log(`Retention worker started (retention=${RETENTION_DAYS} days, interval=24h)`);

if (typeof setInterval !== "undefined") {
  setInterval(runRetentionCleanup, INTERVAL_MS);
}

runRetentionCleanup();
