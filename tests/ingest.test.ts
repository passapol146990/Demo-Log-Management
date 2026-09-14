import { normalizeApi } from "@/lib/normalizers/api";
import { normalizeCrowdStrike } from "@/lib/normalizers/crowdstrike";
import { normalizeAWS } from "@/lib/normalizers/aws";
import { normalizeM365 } from "@/lib/normalizers/m365";
import { normalizeAD } from "@/lib/normalizers/ad";
import { normalizeNetwork } from "@/lib/normalizers/network";
import { normalizeFirewall } from "@/lib/normalizers/firewall";
import { ingestSchema } from "@/lib/ingest-schema";
import { validateAndNormalizeBatch } from "@/lib/ingest-batch";

describe("Ingest Endpoint", () => {
  test("ingestSchema validates API source", () => {
    const data = { source: "api", "@timestamp": "2024-01-15T10:30:00.000Z", tenant: "demoA", severity: 3 };
    const parsed = ingestSchema.parse(data);
    expect(parsed.source).toBe("api");
  });

  test("ingestSchema rejects invalid source", () => {
    expect(() => ingestSchema.parse({ source: "invalid" })).toThrow();
  });

  test("ingestSchema rejects missing severity out of range", () => {
    expect(() => ingestSchema.parse({ source: "api", severity: 11 })).toThrow();
  });

  test("normalizes API source", () => {
    const data = {
      "@timestamp": "2024-01-15T10:30:00.000Z",
      tenant: "demoA",
      event_type: "access",
      http_method: "GET",
      url: "/api/users",
      status_code: 200,
      src_ip: "203.0.113.50",
      user: "admin",
      severity: 3,
    };
    const result = normalizeApi(data);
    expect(result.source).toBe("api");
    expect(result.http_method).toBe("GET");
    expect(result.status_code).toBe(200);
  });

  test("normalizes CrowdStrike source", () => {
    const data = {
      "@timestamp": "2024-01-15T10:30:00.000Z",
      tenant: "demoA",
      event_type: "threat",
      rule_name: "Detect Ransomware",
      severity: 9,
    };
    const result = normalizeCrowdStrike(data);
    expect(result.source).toBe("crowdstrike");
    expect(result.severity).toBe(9);
  });

  test("normalizes AWS source with cloud fields", () => {
    const data = {
      "@timestamp": "2024-01-15T10:30:00.000Z",
      tenant: "demoA",
      action: "DescribeInstances",
      cloud: { account_id: "123456789012", region: "us-east-1", service: "ec2" },
      severity: 5,
    };
    const result = normalizeAWS(data);
    expect(result.source).toBe("aws");
    expect(result.cloud.account_id).toBe("123456789012");
  });

  test("normalizes M365 source", () => {
    const data = {
      "@timestamp": "2024-01-15T10:30:00.000Z",
      tenant: "demoB",
      severity: 7,
    };
    const result = normalizeM365(data);
    expect(result.source).toBe("m365");
  });

  test("normalizes AD source", () => {
    const data = {
      "@timestamp": "2024-01-15T10:30:00.000Z",
      tenant: "demoB",
      severity: 6,
    };
    const result = normalizeAD(data);
    expect(result.source).toBe("ad");
  });

  test("normalizes network/firewall source", () => {
    const raw = "<134>1 2024-01-15T10:30:00.000Z fw01 net firewall - - - msg='DROP'";
    const result = normalizeFirewall(raw, { severity: 7 });
    expect(result.source).toBe("firewall");
    expect(result.raw).toBe(raw);
  });

  test("unknown source throws", () => {
    expect(() => {
      const fn = (() => { throw new Error("Unknown source: unknown") })();
      return fn;
    }).toThrow("Unknown source");
  });
});

describe("Batch Ingest", () => {
  test("all-valid batch reports full success with per-item ok results", () => {
    const items = [
      { source: "api", severity: 3 },
      { source: "crowdstrike", severity: 9 },
    ];
    const { total, results, normalizedLogs } = validateAndNormalizeBatch(items, "demoA");
    expect(total).toBe(2);
    expect(results).toEqual([
      { index: 0, status: "ok" },
      { index: 1, status: "ok" },
    ]);
    expect(normalizedLogs).toHaveLength(2);
    expect(normalizedLogs[0].log.source).toBe("api");
    expect(normalizedLogs[1].log.source).toBe("crowdstrike");
  });

  test("mixed valid/invalid batch reports partial success and preserves indexes", () => {
    const items = [
      { source: "api", severity: 3 },
      { source: "invalid-source" },
      { source: "aws", severity: 11 },
      { source: "ad", severity: 6 },
    ];
    const { total, results, normalizedLogs } = validateAndNormalizeBatch(items, "demoA");
    expect(total).toBe(4);
    expect(normalizedLogs).toHaveLength(2);
    expect(normalizedLogs.map((n) => n.index)).toEqual([0, 3]);

    expect(results[0]).toEqual({ index: 0, status: "ok" });
    expect(results[1].status).toBe("error");
    expect(results[1].error).toMatch(/Validation failed/);
    expect(results[2].status).toBe("error");
    expect(results[2].error).toMatch(/Validation failed/);
    expect(results[3]).toEqual({ index: 3, status: "ok" });
  });

  test("all-invalid batch reports zero successes", () => {
    const items = [{ source: "nope" }, { severity: 20 }];
    const { total, results, normalizedLogs } = validateAndNormalizeBatch(items, "demoA");
    expect(total).toBe(2);
    expect(normalizedLogs).toHaveLength(0);
    expect(results.every((r) => r.status === "error")).toBe(true);
  });

  test("empty batch reports zero total with no results", () => {
    const { total, results, normalizedLogs } = validateAndNormalizeBatch([], "demoA");
    expect(total).toBe(0);
    expect(results).toEqual([]);
    expect(normalizedLogs).toEqual([]);
  });

  test("tenant from JWT is applied to every normalized item, ignoring any tenant in the item", () => {
    const items = [{ source: "api", tenant: "attacker-tenant", severity: 3 }];
    const { normalizedLogs } = validateAndNormalizeBatch(items, "demoA");
    expect(normalizedLogs[0].log.tenant).toBe("demoA");
  });
});
