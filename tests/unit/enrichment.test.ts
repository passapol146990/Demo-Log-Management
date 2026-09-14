const mockLookupGeoIP = jest.fn();
const mockLookupRDNS = jest.fn();

jest.mock("@/lib/geoip", () => ({
  lookupGeoIP: (...args: unknown[]) => mockLookupGeoIP(...args),
}));

jest.mock("@/lib/rdns", () => ({
  lookupRDNS: (...args: unknown[]) => mockLookupRDNS(...args),
}));

import { enrichLog } from "@/lib/enrichment";
import { LogEntry } from "@/lib/types/log";

function baseLog(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    "@timestamp": "2024-01-15T10:30:00.000Z",
    tenant: "demoA",
    source: "firewall",
    vendor: "firewall",
    product: "network",
    event_type: "network",
    event_subtype: "syslog",
    severity: 5,
    action: "deny",
    src_ip: "203.0.113.7",
    src_port: 0,
    dst_ip: "198.51.100.9",
    dst_port: 22,
    protocol: "TCP",
    user: "",
    host: "",
    process: "",
    url: "",
    http_method: "",
    status_code: 0,
    rule_name: "",
    rule_id: "",
    raw: "{}",
    _tags: [],
    ...overrides,
  };
}

const geo = { country: "US", city: "Ashburn", latitude: 39.03, longitude: -77.5, timezone: "America/New_York" };
const rdns = { hostname: "example.com", provider: "Unknown" };

describe("enrichLog", () => {
  beforeEach(() => {
    mockLookupGeoIP.mockReset();
    mockLookupRDNS.mockReset();
    mockLookupGeoIP.mockResolvedValue(geo);
    mockLookupRDNS.mockResolvedValue(rdns);
  });

  test("enriches both src_ip and dst_ip with geo + rdns data", async () => {
    const log = baseLog();
    const result = await enrichLog(log);

    expect(result.src_ip_geo).toEqual(geo);
    expect(result.dst_ip_geo).toEqual(geo);
    expect(result.src_ip_hostname).toEqual(rdns);
    expect(result.dst_ip_hostname).toEqual(rdns);
    expect(result.enriched_at).toEqual(expect.any(String));
    expect(mockLookupGeoIP).toHaveBeenCalledWith("203.0.113.7");
    expect(mockLookupGeoIP).toHaveBeenCalledWith("198.51.100.9");
  });

  test("does not mutate the original log object", async () => {
    const log = baseLog();
    const result = await enrichLog(log);
    expect(log.src_ip_geo).toBeUndefined();
    expect(result).not.toBe(log);
  });

  test("skips geo/rdns lookups when src_ip and dst_ip are missing", async () => {
    const log = baseLog({ src_ip: "", dst_ip: "" });
    const result = await enrichLog(log);

    expect(mockLookupGeoIP).not.toHaveBeenCalled();
    expect(mockLookupRDNS).not.toHaveBeenCalled();
    expect(result.src_ip_geo).toBeUndefined();
    expect(result.dst_ip_geo).toBeUndefined();
    expect(result.enriched_at).toEqual(expect.any(String));
  });

  test("partial enrichment: only src_ip present", async () => {
    const log = baseLog({ dst_ip: "" });
    const result = await enrichLog(log);

    expect(result.src_ip_geo).toEqual(geo);
    expect(result.src_ip_hostname).toEqual(rdns);
    expect(result.dst_ip_geo).toBeUndefined();
    expect(result.dst_ip_hostname).toBeUndefined();
  });

  test("partial enrichment: geoip fails but rdns succeeds", async () => {
    mockLookupGeoIP.mockResolvedValue(null);
    const log = baseLog({ dst_ip: "" });
    const result = await enrichLog(log);

    expect(result.src_ip_geo).toBeUndefined();
    expect(result.src_ip_hostname).toEqual(rdns);
  });

  test("gracefully degrades when both lookups reject", async () => {
    mockLookupGeoIP.mockRejectedValue(new Error("geoip down"));
    mockLookupRDNS.mockRejectedValue(new Error("dns down"));
    const log = baseLog({ dst_ip: "" });

    const result = await enrichLog(log);

    expect(result.src_ip_geo).toBeUndefined();
    expect(result.src_ip_hostname).toBeUndefined();
    expect(result.enriched_at).toEqual(expect.any(String));
  });

  test("preserves all other log fields unchanged", async () => {
    const log = baseLog({ user: "alice", action: "deny" });
    const result = await enrichLog(log);

    expect(result.user).toBe("alice");
    expect(result.action).toBe("deny");
    expect(result.tenant).toBe("demoA");
  });
});
