import { LogEntry } from "@/lib/types/log";
import { lookupGeoIP } from "@/lib/geoip";
import { lookupRDNS } from "@/lib/rdns";

export async function enrichLog(log: LogEntry): Promise<LogEntry> {
  const enriched: LogEntry = { ...log };
  const tasks: Promise<void>[] = [];

  if (log.src_ip) {
    tasks.push(
      lookupGeoIP(log.src_ip)
        .then((geo) => {
          if (geo) enriched.src_ip_geo = geo;
        })
        .catch(() => {})
    );
    tasks.push(
      lookupRDNS(log.src_ip)
        .then((rdns) => {
          if (rdns) enriched.src_ip_hostname = rdns;
        })
        .catch(() => {})
    );
  }

  if (log.dst_ip) {
    tasks.push(
      lookupGeoIP(log.dst_ip)
        .then((geo) => {
          if (geo) enriched.dst_ip_geo = geo;
        })
        .catch(() => {})
    );
    tasks.push(
      lookupRDNS(log.dst_ip)
        .then((rdns) => {
          if (rdns) enriched.dst_ip_hostname = rdns;
        })
        .catch(() => {})
    );
  }

  await Promise.allSettled(tasks);
  enriched.enriched_at = new Date().toISOString();
  return enriched;
}
