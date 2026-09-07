import { normalizeApi } from "@/lib/normalizers/api";
import { normalizeCrowdStrike } from "@/lib/normalizers/crowdstrike";
import { normalizeAWS } from "@/lib/normalizers/aws";
import { normalizeM365 } from "@/lib/normalizers/m365";
import { normalizeAD } from "@/lib/normalizers/ad";
import { normalizeNetwork } from "@/lib/normalizers/network";
import { normalizeFirewall } from "@/lib/normalizers/firewall";
import { ingestSchema } from "@/lib/ingest-schema";

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
