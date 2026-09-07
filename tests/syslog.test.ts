import { parseSyslogToNormalized, parseSyslog } from "@/lib/syslog";
import { normalizeFirewall } from "@/lib/normalizers/firewall";

describe("Syslog Ingestion", () => {
  test("parses RFC 5424 syslog format", () => {
    const raw = '<134>1 2024-01-15T10:30:00.000Z fw01 firewall - - - msg="DROP" src=192.168.1.100 dst=10.0.0.5 proto=tcp dport=443 sport=54321';
    const result = parseSyslogToNormalized(raw);
    expect(result.source).toBe("firewall");
    expect(result.severity).toBe(5);
    expect(result.action).toBe("DROP");
    expect(result.src_ip).toBe("192.168.1.100");
    expect(result.dst_ip).toBe("10.0.0.5");
    expect(result.protocol).toBe("tcp");
    expect(result.src_port).toBe(54321);
    expect(result.dst_port).toBe(443);
  });

  test("returns raw for unparseable syslog", () => {
    const raw = "invalid syslog message";
    const result = parseSyslogToNormalized(raw);
    expect(result.source).toBe("network");
    expect(result.raw).toBe(raw);
  });

  test("parseSyslog extracts fields", () => {
    const raw = '<134>1 2024-01-15T10:30:00.000Z fw01 firewall - - - test message';
    const result = parseSyslog(raw);
    expect(result).not.toBeNull();
    expect(result?.hostname).toBe("fw01");
    expect(result?.appname).toBe("firewall");
    expect(result?.priority).toBe(134);
  });

  test("syslog normalizer produces valid output for firewall source", () => {
    const raw = '<134>1 2024-01-15T10:30:00.000Z fw01 firewall - - - msg="DROP" src=10.0.0.1 dst=10.0.0.2 proto=tcp dport=80';
    const result = normalizeFirewall(raw, { severity: 7 });
    expect(result.source).toBe("firewall");
    expect(result.raw).toBe(raw);
    expect(result._tags).toContain("firewall");
  });
});
