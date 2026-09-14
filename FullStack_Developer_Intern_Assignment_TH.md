# ข้อสอบภาคปฏิบัติ Full-Stack Developer (Intern)

## โจทย์

พัฒนา **“Demo ระบบ Log Management”** ที่รองรับแหล่งข้อมูลหลากหลาย และติดตั้งได้ทั้งแบบ **Hardware Appliance** (ติดตั้งในเครื่อง/VM เดียว) และแบบ **SaaS/Cloud** (มี URL ให้ทดสอบจากภายนอก)

- **กำหนดส่ง + สัมภาษณ์เดโม:** ภายในวันที่ 10 วันหลังจากเห็น Assignment นี้แล้ว โดยนักศึกษาต้องเป็นผู้นัดหมาย
- **รูปแบบงาน:** ทำเดี่ยว
- **เทคโนโลยี:** ผู้เข้าสอบเลือก Tech Stack ได้เอง (Open Source/Cloud Native แนะนำ)

---

## 1) วัตถุประสงค์ (Objectives)

1. ประเมินความสามารถด้าน Full-Stack:
   - ออกแบบสถาปัตยกรรม
   - เขียน Backend/API
   - Frontend/UI
   - Data Pipeline
   - DevOps/Deployment
2. ประเมินการจัดการข้อมูลที่เป็นเหตุการณ์ (event/log) จากหลายแหล่ง:
   - Normalize
   - Index
   - Search
   - Visualize
   - Alert
3. ประเมินความเข้าใจด้านความปลอดภัย:
   - AuthN/AuthZ
   - TLS
   - Multi-tenant แยกข้อมูลลูกค้า

---

## 2) ขอบเขตงาน (Scope & Must-have)

### 2.1 แหล่งข้อมูลที่ต้องรองรับ

อย่างน้อย **4 แหล่งจริง** + ส่วนที่เหลือใช้ sample/simulator ได้

- Firewall / Network (เช่น Syslog UDP/TCP 514 หรือ HTTP Ingest)
- API (รับ JSON ผ่าน REST/HTTP POST)
- CrowdStrike (อนุญาตให้ใช้ sample JSON/CSV สังเคราะห์)
- AWS (เช่น CloudTrail/ALB/NLB – ใช้ไฟล์ตัวอย่างได้)
- Microsoft 365 (Unified Audit Log – ใช้ sample JSON)
- Microsoft AD/Windows Security (EventID 4624/4625 ฯลฯ – ใช้ sample ได้)

> **หมายเหตุ:** ไม่บังคับเชื่อมต่อของจริงทุกแหล่ง ขอให้มีอย่างน้อย 4 แหล่งที่ยิงเข้าได้จริง (เช่น Syslog + HTTP API + ไฟล์ JSON batch + สคริปต์ส่งจำลอง) และทำ Schema Normalize รวมศูนย์ก่อนเก็บ

### 2.2 ฟีเจอร์ขั้นต่ำ (Functional)

- **Ingestion:** รับ log หลายรูปแบบ (Syslog / HTTP JSON / File batch) และรองรับอย่างน้อย 2 โปรโตคอล
- **Normalization:** แปลง log ทุกชนิดเข้าสู่ Schema กลาง (ตัวอย่าง schema ดูหัวข้อ 3)
- **Storage & Query:** จัดเก็บแบบค้นหาได้ (เช่น OpenSearch/ClickHouse/Postgres+GIN/ฯลฯ)
- **Dashboard:** มีหน้า UI แสดงสรุป (Top IP/User/EventType, Timeline, Filter ตามช่วงเวลา/tenant)
- **Alert:** ขั้นต่ำ 1 กฎ ตั้งเงื่อนไขง่าย ๆ (เช่น ล็อกอินล้มเหลวซ้ำ ๆ จาก IP เดิมภายใน 5 นาที) แล้วแสดงในหน้า Alert หรือส่ง Webhook/Email
- **AuthN/AuthZ:** มีผู้ใช้อย่างน้อย 2 บทบาท (Admin/Viewer) และแยกข้อมูลเป็น tenant ได้ (parameter หรือ header/claim)
- **Deployment 2 โหมด:**
  - Appliance: รันได้บนเครื่องเดียว/VM เดียว (แนะนำ Docker Compose)
  - SaaS/Cloud: รันบนคลาวด์สาธารณะ (เช่น VM/Container มี URL ให้กรรมการเข้าใช้งาน)
- **TLS:** เปิดใช้งาน HTTPS อย่างน้อยในโหมด SaaS (Self-signed รับได้ถ้าอธิบายขั้นตอนชัดเจน)
- **Retention:** กำหนดเก็บข้อมูลขั้นต่ำ 7 วัน (ลบ/rollover/partition อย่างใดอย่างหนึ่ง)

### 2.3 ไม่บังคับแต่ควรมี (Nice-to-have)

- Multi-tenant ที่แท้จริง (index/table แยก), RBAC ราย field/tenant
- การทำ Enrichment (เช่น reverse DNS, geoip) ขณะ ingest
- CI/CD (GitHub Actions/ฯลฯ), IaC (Terraform/Helm)
- Unit/Integration tests ขั้นต่ำ

---

## 3) Schema กลาง (แนะนำ)

สามารถปรับได้ แต่ควรครอบคลุมฟิลด์สำคัญเพื่อการค้นหา:

| Field | รายละเอียด |
|---|---|
| `@timestamp` | RFC3339 |
| `tenant` | Tenant |
| `source` | `firewall\|crowdstrike\|aws\|m365\|ad\|api\|network` |
| `vendor` | Vendor |
| `product` | Product |
| `event_type` | Event type |
| `event_subtype` | Event subtype |
| `severity` | 0–10 |
| `action` | `allow\|deny\|create\|delete\|login\|logout\|alert` |
| `src_ip` | Source IP |
| `src_port` | Source port |
| `dst_ip` | Destination IP |
| `dst_port` | Destination port |
| `protocol` | Protocol |
| `user` | User |
| `host` | Host |
| `process` | Process |
| `url` | URL |
| `http_method` | HTTP method |
| `status_code` | HTTP status code |
| `rule_name` | Rule name |
| `rule_id` | Rule ID |
| `cloud.account_id` | Cloud account ID |
| `cloud.region` | Cloud region |
| `cloud.service` | Cloud service |
| `raw` | เก็บข้อความดิบ |
| `_tags` | Array |

---

## 4) ตัวอย่าง Log (สั้นๆ สำหรับทดสอบ)

ใช้เป็น seed data หรือยิงผ่าน API ก็ได้

### 4.1 Firewall/Syslog

```text
<134>Aug 20 12:44:56 fw01 vendor=demo product=ngfw action=deny src=10.0.1.10 dst=8.8.8.8 spt=5353 dpt=53 proto=udp msg=DNS blocked
policy=Block-DNS
```

### 4.2 Network (Router Syslog)

```text
<190>Aug 20 13:01:02 r1 if=ge-0/0/1 event=link-down mac=aa:bb:cc:dd:ee:ff reason=carrier-loss
```

### 4.3 HTTP API (`POST /ingest`)

```json
{
  "tenant": "demoA",
  "source": "api",
  "event_type": "app_login_failed",
  "user": "alice",
  "ip": "203.0.113.7",
  "reason": "wrong_password",
  "@timestamp": "2025-08-20T07:20:00Z"
}
```

### 4.4 CrowdStrike (sample JSON)

```json
{
  "tenant": "demoA",
  "source": "crowdstrike",
  "event_type": "malware_detected",
  "host": "WIN10-01",
  "process": "powershell.exe",
  "severity": 8,
  "sha256": "abc...",
  "action": "quarantine",
  "@timestamp": "2025-08-20T08:00:00Z"
}
```

### 4.5 AWS CloudTrail (ย่อ)

```json
{
  "tenant": "demoB",
  "source": "aws",
  "cloud": {
    "service": "iam",
    "account_id": "123456789012",
    "region": "ap-southeast-1"
  },
  "event_type": "CreateUser",
  "user": "admin",
  "@timestamp": "2025-08-20T09:10:00Z",
  "raw": {
    "eventName": "CreateUser",
    "requestParameters": {
      "userName": "temp-user"
    }
  }
}
```

### 4.6 Microsoft 365 Audit (ย่อ)

```json
{
  "tenant": "demoB",
  "source": "m365",
  "event_type": "UserLoggedIn",
  "user": "bob@demo.local",
  "ip": "198.51.100.23",
  "status": "Success",
  "workload": "Exchange",
  "@timestamp": "2025-08-20T10:05:00Z"
}
```

### 4.7 Microsoft AD/Windows Security (ย่อ, 4625)

```json
{
  "tenant": "demoA",
  "source": "ad",
  "event_id": 4625,
  "event_type": "LogonFailed",
  "user": "demo\\eve",
  "host": "DC01",
  "ip": "203.0.113.77",
  "logon_type": 3,
  "@timestamp": "2025-08-20T11:11:11Z"
}
```

---

## 5) สถาปัตยกรรมอ้างอิง

เลือก/ปรับได้ หรือจะใช้อะไรก็ได้

- **Collector/Ingest:** Vector / Fluent Bit / Logstash / Custom (Node/Go/Python)
- **Storage/Index:** OpenSearch / ClickHouse / PostgreSQL(+JSONB/GIN) / Elasticsearch
- **Backend API:** FastAPI / Express / Go Fiber / NestJS (มี auth + ingest endpoint)
- **UI/Dashboard:** React/Vue + Chart library หรือ OpenSearch Dashboards/Grafana
- **Packaging:** Docker Compose (Appliance), + Cloud VM/Container (SaaS)

### ข้อกำหนด Appliance (ขั้นต่ำ)

- Ubuntu 22.04+
- 4 vCPU
- 8 GB RAM
- 40 GB Disk
- เปิดพอร์ตที่จำเป็น (เช่น 80/443/514)

---

## 6) การส่งมอบ (Deliverables)

### 6.1 Git Repository

ต้องมี:

```text
/docs/architecture.md
/docs/setup_appliance.md
/docs/setup_saas.md
docker-compose.yml
init/ หรือ seed scripts
.env.example
Makefile หรือ run.sh
/samples/
/backend/
/frontend/
/ingest/
/tests/
```

รายละเอียด:

- `/docs/architecture.md` — แผนภาพ + อธิบาย data flow/tenant model
- `/docs/setup_appliance.md` — ขั้นตอนติดตั้งละเอียด
- `/docs/setup_saas.md` — ขั้นตอนติดตั้งละเอียด
- `docker-compose.yml` และ/หรือ Helm chart + init/seed scripts
- `.env.example` — ค่าที่ต้องตั้ง
- `Makefile`/สคริปต์ `run.sh`
- `/samples/` — ไฟล์ log ตัวอย่าง + สคริปต์ส่ง เช่น `send_syslog.sh`, `post_logs.py`
- `/backend/`, `/frontend/`, `/ingest/` — โค้ดพร้อม README
- `/tests/` — อย่างน้อยตัวอย่าง 2–3 เคส

### 6.2 Demo Video

ความยาว **30 นาที**:

- อธิบายสถาปัตยกรรม
- เดโม `ingest → search → dashboard → alert`

### 6.3 Demo URL / Appliance

- URL เดโม (SaaS)
- และ/หรือไฟล์ OVA / วิธี Spin-up Appliance

### 6.4 API Collection

- Postman/Insomnia Collection สำหรับ API `ingest/search` (ถ้ามี)

---

## 7) ขั้นตอนที่กรรมการจะทดสอบ (Acceptance Checklist)

- เปิดระบบในโหมด Appliance ตามเอกสาร (1 คำสั่งหรือไม่กี่ขั้น)
- ส่ง Syslog ตัวอย่าง (เช่น `logger`/`nc`) แล้วเห็นใน UI ภายใน 1 นาที
- เรียก `POST /ingest` ด้วย JSON ตัวอย่าง แล้วค้นหาได้
- อัปโหลด/ชี้ไฟล์ sample AWS/M365/AD แล้วระบบ normalize ได้
- Dashboard แสดง:
  - Top N
  - Timeline
  - Filter by tenant/source/time
- สร้าง Alert rule ตัวอย่างและเห็นการแจ้งเตือน (UI/Email/Webhook)
- ทดสอบ RBAC: ผู้ใช้ Viewer เห็นเฉพาะ tenant ของตน
- โหมด SaaS เข้าใช้งานผ่าน HTTPS ได้

---

## 8) เกณฑ์การให้คะแนน (100 คะแนน)

| หมวด | รายละเอียด | คะแนน |
|---|---|---:|
| สถาปัตยกรรม & เอกสาร | ความชัดเจน, แบบแผน, เหตุผลการเลือกเทคโนโลยี | 15 |
| Ingestion | รองรับหลายแหล่ง/โปรโตคอล, ความเสถียร, การจำลอง | 20 |
| Normalization/Schema | ออกแบบ schema และ mapping ได้เหมาะสม | 10 |
| Storage & Query | ค้นหาเร็ว/ถูกต้อง, index/partition ดี | 10 |
| Dashboard/UI | ใช้งานง่าย, มีกราฟ/ตาราง/ฟิลเตอร์จำเป็น | 10 |
| Alerting | มีกฎอย่างน้อย 1 แบบ + แจ้งเตือนสำเร็จ | 10 |
| Security | AuthN/AuthZ, RBAC, TLS ขั้นต่ำ | 10 |
| Deployment | Appliance + SaaS ใช้งานได้จริง | 10 |
| Tests & DX | ตัวอย่างทดสอบ, สคริปต์/Makefile, `.env.example` | 5 |
| **รวม** | | **100** |

### คะแนนพิเศษ

**สูงสุด +10 คะแนน**

- Multi-tenant จริง (แยก index/table)
- Enrichment
- CI/CD
- IaC
- Observability (metrics/trace)
- Hardening

### เกณฑ์ผ่าน

- **ผ่านขั้นต่ำ:** 60 คะแนน
- **Strong Hire:** ≥ 85 คะแนน พร้อมอธิบายเหตุผลการออกแบบได้ชัดเจน
