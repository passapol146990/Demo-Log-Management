const mockReverse = jest.fn();
const mockSetServers = jest.fn();

jest.mock("dns/promises", () => ({
  Resolver: jest.fn().mockImplementation(() => ({
    setServers: mockSetServers,
    reverse: mockReverse,
  })),
}));

beforeEach(() => {
  mockReverse.mockReset();
  mockSetServers.mockReset();
  delete process.env.REDIS_URL;
  jest.resetModules();
});

function loadRdns() {
  return require("@/lib/rdns") as typeof import("@/lib/rdns");
}

describe("lookupRDNS", () => {
  test("returns hostname + provider for a known public IP (8.8.8.8 -> dns.google)", async () => {
    mockReverse.mockResolvedValue(["dns.google"]);
    const { lookupRDNS } = loadRdns();

    const result = await lookupRDNS("8.8.8.8");

    expect(result).toEqual({ hostname: "dns.google", provider: "Google" });
    expect(mockSetServers).toHaveBeenCalledWith(["1.1.1.1", "8.8.8.8"]);
  });

  test("detects AWS provider from hostname", async () => {
    mockReverse.mockResolvedValue(["ec2-1-2-3-4.compute-1.amazonaws.com"]);
    const { lookupRDNS } = loadRdns();
    const result = await lookupRDNS("203.0.113.1");
    expect(result?.provider).toBe("AWS");
  });

  test("returns Unknown provider for unrecognized hostname", async () => {
    mockReverse.mockResolvedValue(["example.org"]);
    const { lookupRDNS } = loadRdns();
    const result = await lookupRDNS("203.0.113.2");
    expect(result?.provider).toBe("Unknown");
  });

  test("returns null for private/reserved IPs without calling DNS", async () => {
    const { lookupRDNS } = loadRdns();
    const result = await lookupRDNS("192.168.1.1");
    expect(result).toBeNull();
    expect(mockReverse).not.toHaveBeenCalled();
  });

  test("returns null when reverse() rejects (NXDOMAIN etc.)", async () => {
    mockReverse.mockRejectedValue(new Error("ENOTFOUND"));
    const { lookupRDNS } = loadRdns();
    await expect(lookupRDNS("203.0.113.3")).resolves.toBeNull();
  });

  test("returns null when reverse() times out", async () => {
    mockReverse.mockImplementation(() => new Promise(() => {})); // never resolves
    const { lookupRDNS } = loadRdns();

    const promise = lookupRDNS("203.0.113.4");
    const result = await promise;
    expect(result).toBeNull();
  }, 5000);

  test("returns null when reverse() resolves with an empty array", async () => {
    mockReverse.mockResolvedValue([]);
    const { lookupRDNS } = loadRdns();
    const result = await lookupRDNS("203.0.113.11");
    expect(result).toBeNull();
  });

  test("caches result so a second lookup does not call DNS again", async () => {
    mockReverse.mockResolvedValue(["dns.google"]);
    const { lookupRDNS } = loadRdns();

    await lookupRDNS("203.0.113.5");
    await lookupRDNS("203.0.113.5");

    expect(mockReverse).toHaveBeenCalledTimes(1);
  });

  test("cache expires after TTL and triggers a new DNS lookup", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    mockReverse.mockResolvedValue(["dns.google"]);
    const { lookupRDNS } = loadRdns();

    await lookupRDNS("203.0.113.6");
    jest.setSystemTime(new Date("2026-01-01T00:11:00.000Z")); // > 10min TTL
    await lookupRDNS("203.0.113.6");

    expect(mockReverse).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
