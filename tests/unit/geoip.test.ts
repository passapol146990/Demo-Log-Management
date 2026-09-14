const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  (global as any).fetch = mockFetch;
  delete process.env.REDIS_URL;
  jest.resetModules();
});

function loadGeoip() {
  return require("@/lib/geoip") as typeof import("@/lib/geoip");
}

const ipApiSuccess = (overrides: Partial<Record<string, unknown>> = {}) => ({
  status: "success",
  country: "United States",
  city: "Ashburn",
  lat: 39.03,
  lon: -77.5,
  timezone: "America/New_York",
  ...overrides,
});

describe("lookupGeoIP", () => {
  test("returns GeoIPData for a known public IP (8.8.8.8 -> US)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ipApiSuccess(),
    });

    const { lookupGeoIP } = loadGeoip();
    const result = await lookupGeoIP("8.8.8.8");

    expect(result).toEqual({
      country: "United States",
      city: "Ashburn",
      latitude: 39.03,
      longitude: -77.5,
      timezone: "America/New_York",
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain("8.8.8.8");
  });

  test("returns null for private/reserved IPs without calling the network", async () => {
    const { lookupGeoIP } = loadGeoip();
    const result = await lookupGeoIP("10.0.0.5");
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("returns null for empty IP", async () => {
    const { lookupGeoIP } = loadGeoip();
    const result = await lookupGeoIP("");
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("returns null when the API responds with status=fail", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: "fail" }) });
    const { lookupGeoIP } = loadGeoip();
    const result = await lookupGeoIP("203.0.113.5");
    expect(result).toBeNull();
  });

  test("returns null and does not throw on network error", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    const { lookupGeoIP } = loadGeoip();
    await expect(lookupGeoIP("203.0.113.6")).resolves.toBeNull();
  });

  test("returns null on non-ok HTTP response", async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) });
    const { lookupGeoIP } = loadGeoip();
    const result = await lookupGeoIP("203.0.113.7");
    expect(result).toBeNull();
  });

  test("caches result so a second lookup within TTL does not refetch", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ipApiSuccess() });
    const { lookupGeoIP } = loadGeoip();

    const first = await lookupGeoIP("203.0.113.8");
    const second = await lookupGeoIP("203.0.113.8");

    expect(first).toEqual(second);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("cache expires after TTL and triggers a new fetch", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    mockFetch.mockResolvedValue({ ok: true, json: async () => ipApiSuccess() });
    const { lookupGeoIP } = loadGeoip();

    await lookupGeoIP("203.0.113.9");
    jest.setSystemTime(new Date("2026-01-01T00:06:00.000Z")); // > 5min TTL
    await lookupGeoIP("203.0.113.9");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  test("does not cache a failed lookup", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "fail" }) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ipApiSuccess() });
    const { lookupGeoIP } = loadGeoip();

    const first = await lookupGeoIP("203.0.113.10");
    const second = await lookupGeoIP("203.0.113.10");

    expect(first).toBeNull();
    expect(second).not.toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
