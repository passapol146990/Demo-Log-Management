import { cacheGet, cacheSet } from "@/lib/cache";

export interface GeoIPData {
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

const CACHE_TTL_SECONDS = 5 * 60;
const CACHE_PREFIX = "geoip:";
const LOOKUP_TIMEOUT_MS = 2000;

const PRIVATE_IP_REGEX =
  /^(10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.|::1$|f[cd][0-9a-f]{2}:)/i;

function isPrivateOrInvalidIP(ip: string): boolean {
  if (!ip) return true;
  return PRIVATE_IP_REGEX.test(ip);
}

interface IpApiResponse {
  status: "success" | "fail";
  country?: string;
  city?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
}

async function fetchGeoIP(ip: string): Promise<GeoIPData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city,lat,lon,timezone`,
      { signal: controller.signal }
    );
    if (!response.ok) return null;

    const data = (await response.json()) as IpApiResponse;
    if (data.status !== "success") return null;

    return {
      country: data.country || "",
      city: data.city || "",
      latitude: data.lat ?? 0,
      longitude: data.lon ?? 0,
      timezone: data.timezone || "",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function lookupGeoIP(ip: string): Promise<GeoIPData | null> {
  if (isPrivateOrInvalidIP(ip)) return null;

  const cacheKey = `${CACHE_PREFIX}${ip}`;
  const cached = await cacheGet<GeoIPData>(cacheKey);
  if (cached) return cached;

  const result = await fetchGeoIP(ip);
  if (result) await cacheSet(cacheKey, result, CACHE_TTL_SECONDS);
  return result;
}
