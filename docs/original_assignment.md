# Original Assignment - Full-Stack Developer Intern Practical Exam

## 4. Sample Log Payloads (สำหรับทดสอบ Normalizer)

### 4.1 Firewall/Syslog Sample
```
<134>1 2024-01-15T10:30:00.000Z firewall01 example.com firewall - - - msg="DROP" src=192.168.1.100 dst=10.0.0.5 proto=tcp dport=443 sport=54321
```

### 4.2 HTTP API Sample
```json
{
  "source": "api",
  "@timestamp": "2024-01-15T10:30:00.000Z",
  "tenant": "demoA",
  "event_type": "access",
  "http_method": "GET",
  "url": "/api/users",
  "status_code": 200,
  "src_ip": "203.0.113.50",
  "user": "admin",
  "severity": 3
}
```

### 4.3 CrowdStrike Sample
```json
{
  "source": "crowdstrike",
  "@timestamp": "2024-01-15T10:30:00.000Z",
  "tenant": "demoA",
  "event_type": "threat",
  "vendor": "CrowdStrike",
  "product": "Falcon",
  "event_subtype": "alert",
  "severity": 9,
  "action": "block",
  "rule_name": "Detect Ransomware",
  "rule_id": "CR-001",
  "src_ip": "198.51.100.10",
  "user": "malicious_user",
  "host": "WORKSTATION-01"
}
```

### 4.4 AWS Sample
```json
{
  "source": "aws",
  "@timestamp": "2024-01-15T10:30:00.000Z",
  "tenant": "demoA",
  "event_type": "cloud",
  "vendor": "AWS",
  "product": "CloudTrail",
  "event_subtype": "api_call",
  "severity": 5,
  "action": "DescribeInstances",
  "cloud": {
    "account_id": "123456789012",
    "region": "us-east-1",
    "service": "ec2"
  },
  "src_ip": "10.0.0.1",
  "user": "arn:aws:iam::123456789012:user/admin"
}
```

### 4.5 M365 Sample
```json
{
  "source": "m365",
  "@timestamp": "2024-01-15T10:30:00.000Z",
  "tenant": "demoB",
  "event_type": "security",
  "vendor": "Microsoft",
  "product": "M365 Defender",
  "event_subtype": "login",
  "severity": 7,
  "action": "block",
  "user": "user@example.com",
  "host": "DESKTOP-ABC123",
  "src_ip": "203.0.113.25"
}
```

### 4.6 Active Directory Sample
```json
{
  "source": "ad",
  "@timestamp": "2024-01-15T10:30:00.000Z",
  "tenant": "demoB",
  "event_type": "authentication",
  "vendor": "Microsoft",
  "product": "Active Directory",
  "event_subtype": "login_failure",
  "severity": 6,
  "action": "failed_login",
  "user": "jdoe",
  "host": "DC01",
  "src_ip": "192.168.2.50",
  "rule_name": "Failed Login Attempt"
}
```

## 7. Acceptance Checklist
- [ ] System can ingest logs from all 6 sources
- [ ] All logs normalized to central schema
- [ ] Tenant isolation enforced via JWT
- [ ] Syslog ingestion via Vector working
- [ ] OpenSearch search returning correct results
- [ ] Dashboard displays data from OpenSearch
- [ ] Alerting triggers on defined rules
- [ ] System deployable as Appliance and SaaS
- [ ] All tests passing
- [ ] Documentation complete
