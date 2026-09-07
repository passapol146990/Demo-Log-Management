import { normalizeApi } from "@/lib/normalizers/api";
import { normalizeCrowdStrike } from "@/lib/normalizers/crowdstrike";
import { normalizeAWS } from "@/lib/normalizers/aws";
import { normalizeM365 } from "@/lib/normalizers/m365";
import { normalizeAD } from "@/lib/normalizers/ad";
import { normalizeNetwork } from "@/lib/normalizers/network";
import { normalizeFirewall } from "@/lib/normalizers/firewall";

describe("Normalizers", () => {
  describe("normalizeFirewall", () => {
    it("normalizes syslog firewall raw string", () => {
      const raw = '<134>1 2024-01-15T10:30:00.000Z firewall01 example.com firewall - - - msg="DROP" src=192.168.1.100 dst=10.0.0.5 proto=tcp dport=443 sport=54321';
      const result = normalizeFirewall(raw, {
        "@timestamp": "2024-01-15T10:30:00.000Z",
        tenant: "demoA",
        severity: 7,
        src_ip: "192.168.1.100",
        dst_ip: "10.0.0.5",
        protocol: "tcp",
        src_port: 54321,
        dst_port: 443,
        msg: "DROP",
      });
      expect(result.source).toBe("firewall");
      expect(result.severity).toBe(7);
      expect(result.src_ip).toBe("192.168.1.100");
      expect(result.action).toBe("DROP");
      expect(result._tags).toContain("firewall");
    });
  });

  describe("normalizeApi", () => {
    it("normalizes API log", () => {
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
      expect(result.severity).toBe(3);
    });
  });

  describe("normalizeCrowdStrike", () => {
    it("normalizes CrowdStrike log", () => {
      const data = {
        "@timestamp": "2024-01-15T10:30:00.000Z",
        tenant: "demoA",
        event_type: "threat",
        event_subtype: "alert",
        severity: 9,
        action: "block",
        rule_name: "Detect Ransomware",
        rule_id: "CR-001",
        src_ip: "198.51.100.10",
        user: "malicious_user",
        host: "WORKSTATION-01",
      };
      const result = normalizeCrowdStrike(data);
      expect(result.source).toBe("crowdstrike");
      expect(result.vendor).toBe("CrowdStrike");
      expect(result.rule_name).toBe("Detect Ransomware");
      expect(result.severity).toBe(9);
    });
  });

  describe("normalizeAWS", () => {
    it("normalizes AWS log with cloud fields", () => {
      const data = {
        "@timestamp": "2024-01-15T10:30:00.000Z",
        tenant: "demoA",
        event_type: "cloud",
        action: "DescribeInstances",
        cloud: { account_id: "123456789012", region: "us-east-1", service: "ec2" },
        src_ip: "10.0.0.1",
        user: "arn:aws:iam::123456789012:user/admin",
        severity: 5,
      };
      const result = normalizeAWS(data);
      expect(result.source).toBe("aws");
      expect(result.cloud.account_id).toBe("123456789012");
      expect(result.cloud.region).toBe("us-east-1");
      expect(result.cloud.service).toBe("ec2");
    });
  });

  describe("normalizeM365", () => {
    it("normalizes M365 log", () => {
      const data = {
        "@timestamp": "2024-01-15T10:30:00.000Z",
        tenant: "demoB",
        event_type: "security",
        event_subtype: "login",
        severity: 7,
        action: "block",
        user: "user@example.com",
        host: "DESKTOP-ABC123",
        src_ip: "203.0.113.25",
      };
      const result = normalizeM365(data);
      expect(result.source).toBe("m365");
      expect(result.tenant).toBe("demoB");
      expect(result.severity).toBe(7);
    });
  });

  describe("normalizeAD", () => {
    it("normalizes AD log", () => {
      const data = {
        "@timestamp": "2024-01-15T10:30:00.000Z",
        tenant: "demoB",
        event_type: "authentication",
        event_subtype: "login_failure",
        severity: 6,
        action: "failed_login",
        user: "jdoe",
        host: "DC01",
        src_ip: "192.168.2.50",
      };
      const result = normalizeAD(data);
      expect(result.source).toBe("ad");
      expect(result.event_subtype).toBe("login_failure");
      expect(result.user).toBe("jdoe");
    });
  });

  describe("normalizeNetwork", () => {
    it("normalizes network syslog log", () => {
      const raw = "<134>1 2024-01-15T10:30:00.000Z fw01 net network - - - msg='DROP'";
      const result = normalizeNetwork(raw, {
        "@timestamp": "2024-01-15T10:30:00.000Z",
        tenant: "demoA",
        severity: 5,
      });
      expect(result.source).toBe("network");
      expect(result.raw).toBe(raw);
      expect(result._tags).toContain("syslog");
    });
  });
});
