import { Resolver } from "dns/promises";
import { cacheGet, cacheSet } from "@/lib/cache";

export interface RDNSData {
  hostname: string;
  provider: string;
}

const CACHE_TTL_SECONDS = 10 * 60;
const CACHE_PREFIX = "rdns:";
const LOOKUP_TIMEOUT_MS = 1500;
const DNS_SERVERS = ["1.1.1.1", "8.8.8.8"];

const PRIVATE_IP_REGEX =
  /^(10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.|::1$|f[cd][0-9a-f]{2}:)/i;

function isPrivateOrInvalidIP(ip: string): boolean {
  if (!ip) return true;
  return PRIVATE_IP_REGEX.test(ip);
}

function detectProvider(hostname: string): string {
  const lower = hostname.toLowerCase();
  if (lower.includes("amazonaws")) return "AWS";
  if (lower.includes("googleusercontent") || lower.includes("google")) return "Google";
  if (lower.includes("azure") || lower.includes("microsoft")) return "Microsoft";
  if (lower.includes("cloudflare")) return "Cloudflare";
  if (lower.includes("akamai")) return "Akamai";
  if (lower.includes("digitalocean")) return "DigitalOcean";
  if (lower.includes("ovh")) return "OVH";
  return "Unknown";
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("DNS lookup timed out")), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function fetchRDNS(ip: string): Promise<RDNSData | null> {
  try {
    const resolver = new Resolver();
    resolver.setServers(DNS_SERVERS);
    const hostnames = await withTimeout(resolver.reverse(ip), LOOKUP_TIMEOUT_MS);
    const hostname = hostnames[0];
    if (!hostname) return null;

    return { hostname, provider: detectProvider(hostname) };
  } catch {
    return null;
  }
}

export async function lookupRDNS(ip: string): Promise<RDNSData | null> {
  if (isPrivateOrInvalidIP(ip)) return null;

  const cacheKey = `${CACHE_PREFIX}${ip}`;
  const cached = await cacheGet<RDNSData>(cacheKey);
  if (cached) return cached;

  const result = await fetchRDNS(ip);
  if (result) await cacheSet(cacheKey, result, CACHE_TTL_SECONDS);
  return result;
}
