# คู่มือพรีเซนต์ (สคริปต์อัดวิดีโอ)

อ้างอิงจาก `FullStack_Developer_Intern_Assignment_TH.md` หัวข้อ 2.1 และ 2.2
ทุกจุดมี **ไฟล์:บรรทัด** ให้เปิดโชว์ตรงๆ ไม่ต้องเสิร์ช

---

## เตรียมก่อนอัด

```bash
cd /home/passa/Documents/Demo-Log-Management
./dev.sh up          # หรือ ./run.sh (production mode) ก็ได้
```

เปิด browser ไปที่ `http://localhost:3000/login` — login ด้วย `admin@demoA` / `password123`

เปิด terminal ที่ 2 ไว้สำหรับยิง sample scripts (`samples/scripts/`)

---

## 2.1 แหล่งข้อมูล 6 แหล่ง (ครบเกิน 4 แหล่งขั้นต่ำ)

แต่ละแหล่ง = ไฟล์ normalizer 1 ไฟล์ + ไฟล์ sample 1 ไฟล์ ทุกแหล่งยิงเข้าได้จริงผ่าน `/api/ingest`

| # | แหล่งข้อมูล | Normalizer (โชว์โค้ด) | Sample data | วิธียิงจริง |
|---|---|---|---|---|
| 1 | **Firewall/Network** (Syslog UDP/TCP 514) | `backend/src/lib/normalizers/firewall.ts` — parse ทำที่ `ingest/vector.toml:11-41` (Vector remap) | `samples/logs/firewall_syslog.txt` | `python3 samples/scripts/2_send_syslog.py` |
| 2 | **API** (HTTP JSON) | `backend/src/lib/normalizers/api.ts` | `samples/logs/api_events.json` | `python3 samples/scripts/3_post_logs.py` |
| 3 | **CrowdStrike** (sample JSON) | `backend/src/lib/normalizers/crowdstrike.ts` | `samples/logs/crowdstrike_events.json` | เหมือนข้อ 2 |
| 4 | **AWS CloudTrail** (sample JSON) | `backend/src/lib/normalizers/aws.ts` | `samples/logs/aws_cloudtrail_events.json` | เหมือนข้อ 2 |
| 5 | **Microsoft 365** (sample JSON) | `backend/src/lib/normalizers/m365.ts` | `samples/logs/m365_audit_events.json` | เหมือนข้อ 2 |
| 6 | **AD/Windows Security** (EventID 4625) | `backend/src/lib/normalizers/ad.ts` | `samples/logs/ad_windows_events.json` | เหมือนข้อ 2 |

Router ที่เลือก normalizer ตาม `source` field: `backend/src/lib/ingest-batch.ts:11-21`
(`switch(source)` → เรียก normalizer ที่ตรงกัน)

**พูดสั้นๆ ตอนพรีเซนต์:**
> "ระบบรองรับ 6 แหล่งข้อมูล มากกว่าขั้นต่ำ 4 แหล่งที่โจทย์กำหนด ทุกแหล่งมี normalizer แยกไฟล์ที่ `backend/src/lib/normalizers/` และยิงเข้าได้จริงทุกแหล่งผ่าน `/api/ingest` — ไม่ใช่แค่ mock"

**Demo เร็วสุด (ยิงครบทุกแหล่งในคำสั่งเดียว):**
```bash
python3 samples/scripts/1_send_examples.py
```
→ แล้วเข้า `http://localhost:3000/dashboard/search` filter `source` ดูว่าแต่ละ source ขึ้นครบ

---

## 2.2 ฟีเจอร์ขั้นต่ำ (Functional) — พาชมทีละข้อ

### (1) Ingestion — รองรับ ≥2 โปรโตคอล

| โปรโตคอล | Entry point | รายละเอียด |
|---|---|---|
| **Syslog UDP/TCP :514** | `ingest/vector.toml:1-9` (`sources.syslog_udp`, `sources.syslog_tcp`) | Vector รับ → parse (`vector.toml:11-41`) → ส่งต่อเป็น HTTP ไปที่ backend (`vector.toml:43-56`, sink `http` ยิงไป `http://backend:3000/api/ingest`) |
| **HTTP JSON (REST POST)** | `backend/src/app/api/ingest/route.ts:8` — `export async function POST(...)` | รับ single object (บรรทัด 37-41) หรือ batch `{ "logs": [...] }` (บรรทัด 19-35) |
| **File batch** | endpoint เดียวกัน `backend/src/app/api/ingest/route.ts:19-35` — ส่ง `{"logs":[...]}` ทั้งไฟล์ในคำขอเดียว | ตัวอย่างคำสั่ง curl ดูใน `samples/README.md` หัวข้อ "Batch ingestion" |

รวมแล้วมี **3 โปรโตคอล/รูปแบบ**: Syslog (UDP+TCP), HTTP JSON เดี่ยว, File batch JSON — เกินขั้นต่ำ 2 ที่โจทย์กำหนด

**วิธีพิสูจน์สดๆ ตอนอัด:**
```bash
# Syslog
echo '<134>Aug 20 12:44:56 fw01 vendor=demo product=ngfw action=deny src=10.0.1.10 dst=8.8.8.8 msg=test' | nc -u -w1 localhost 514

# HTTP JSON เดี่ยว
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@demoA","password":"password123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s -X POST http://localhost:3000/api/ingest -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"source":"api","event_type":"app_login_failed","user":"alice","src_ip":"203.0.113.7"}'
```
→ แล้วเปิด `/dashboard/search` ค้นหา `alice` เห็นผลภายใน 1 นาที

---

### (2) Normalization — Schema กลาง

- Schema/validation รวมศูนย์: `backend/src/lib/ingest-schema.ts` (zod schema, ทุก field ตามหัวข้อ 3 ของโจทย์)
- ฟังก์ชัน normalize รวม (router): `backend/src/lib/ingest-batch.ts:11-21`
- ตัวอย่าง normalizer 1 ไฟล์ (ดูโครงสร้าง mapping): `backend/src/lib/normalizers/ad.ts` — map `event_id: 4625` → `event_subtype: "login_failure"`

**พูด:** "ทุก log ไม่ว่าจะมาจากแหล่งไหน ผ่าน normalizer ที่ map เข้า schema กลางเดียวกันก่อนบันทึก — เห็นได้จาก field ที่เหมือนกันทั้งหมดตอนค้นหาใน search page"

---

### (3) Storage & Query

- Storage engine: **OpenSearch** — client และ index logic: `backend/src/lib/opensearch.ts`
- **Multi-tenant จริง (index แยกต่อ tenant)**: `ensureTenantIndex()` ที่ `backend/src/lib/opensearch.ts:97` → สร้าง index ชื่อ `logs-<tenant>` (บรรทัด 99)
- Index template กลาง (mapping บังคับ): `initIndexTemplate()` ที่ `backend/src/lib/opensearch.ts:78-96`
- ค้นหา: `searchLogs()` ที่ `backend/src/lib/opensearch.ts:134` — target index `logs-<tenant>` เฉพาะของ user (บรรทัด 146) → **tenant isolation ทำที่ระดับ index ไม่ใช่ filter**
- Endpoint ที่เรียกใช้: `backend/src/app/api/search/route.ts:6` (`GET`)

**Demo:** เข้า `/dashboard/search` พิมพ์ keyword/filter (source, user, src_ip, severity, ช่วงเวลา) → กด enter เห็นผลทันที

---

### (4) Dashboard

หน้า: `backend/src/app/dashboard/page.tsx`
- Top N (source/user/src_ip): เรียก `topByField()` จาก `backend/src/lib/aggregations.ts:3` → component `TopNChart` (บรรทัด 114-116)
- Timeline: `timelineBuckets()` จาก `backend/src/lib/aggregations.ts:17` → component `TimelineChart` (บรรทัด 120)
- Filter by tenant/source/time: อยู่ในหน้า search `backend/src/app/dashboard/search/page.tsx` (tenant มาจาก JWT อัตโนมัติ ไม่ต้องเลือกเอง — ดูข้อ AuthZ ด้านล่าง)

**Demo:** เปิด `/dashboard` โชว์กราฟ Top Source/User/Src IP + Timeline พร้อมพูดว่าข้อมูลอัปเดตจาก log ที่เพิ่งยิงเข้าไป

---

### (5) Alert

- สร้าง/แก้กฎ: `backend/src/app/api/alert-rules/route.ts` (`POST` บรรทัด 55, `GET` บรรทัด 47)
- หน้า UI จัดการกฎ: `backend/src/app/dashboard/alert-rules/page.tsx`
- Logic ประเมินกฎ + group by + threshold ภายในหน้าต่างเวลา: `backend/src/lib/alerting.ts:80` (`evaluateRule`)
- กัน alert ซ้ำ (cooldown/dedup): `backend/src/lib/alerting.ts:90-98` เรียก `shouldEmit()` จาก `alertDedup.ts`
- ส่ง Webhook: `backend/src/lib/alerting.ts:111` เรียก `dispatchWebhook()`
- Worker ที่รันตรวจทุก 10 วิ (fixed, `ALERT_CHECK_INTERVAL_MS`): `backend/workers/alertChecker.ts` (`runAlertCheck`, วน `listTenants()` แล้วเรียก `evaluateAllRules` ทุก tenant)
- หน้า UI แสดงผล alert: `backend/src/app/dashboard/alerts/page.tsx`

**Demo (สคริปต์พร้อมใช้):**
```bash
python3 samples/scripts/4_demo_login_failure_alert.py
```
→ ส่ง 5 login failure จาก IP เดียวกัน → รอ ~10 วิ (worker cycle) → เปิด `/dashboard/alerts` เห็น alert ขึ้น หรือดู webhook.site ที่ตั้งไว้ใน `.env` (`WEBHOOK_URL`)

---

### (6) AuthN/AuthZ + Multi-tenant

- Login/JWT: `backend/src/lib/auth.ts:27` (`login`) ออก token ที่มี `role` + `tenant` (บรรทัด 32)
- Middleware บังคับ role: `requireRole()` ที่ `backend/src/lib/auth.ts:60`
- **กติกาสำคัญ:** ทุก endpoint ดึง `tenant` จาก JWT เท่านั้น (`user.tenant`) ไม่รับจาก query param ของ client — ดูตัวอย่างที่ `backend/src/app/api/ingest/route.ts:15` และ `backend/src/app/api/search/route.ts:29`
- 2 role: `admin` / `viewer` — role ใช้ตรวจใน `requireRole(request, ["admin"])` เช่น `alert-rules/route.ts:56`
- Field-level RBAC เสริม (nice-to-have): `backend/src/lib/fieldPermissions.ts:48` (`getHiddenFields`) + ใช้จริงที่ `search/route.ts:40-44` (ซ่อน field ตาม role/tenant ก่อนส่งกลับ)

**Demo:** login ด้วย viewer เทียบกับ admin → viewer เห็นแค่ tenant ตัวเอง, ไม่มีปุ่มจัดการ user/alert rules

---

### (7) Deployment 2 โหมด

- **Appliance:** `./dev.sh up` หรือ `./run.sh` (production) — ไฟล์ compose หลัก `docker-compose.yml`, production overlay `docker-compose.prod.yml`
- **SaaS/Cloud:** overlay `docker-compose.saas.yml` + reverse proxy TLS ที่ `deploy/Caddyfile` (auto-HTTPS ผ่าน `{$DOMAIN}`, self-signed สำหรับ `localhost`)
- เอกสารขั้นตอนละเอียด: `docs/setup_appliance.md`, `docs/setup_saas.md`

---

### (8) Retention

- Worker ลบ log เก่า: `backend/workers/retentionWorker.ts` — ตั้งค่า `LOG_RETENTION_DAYS` (default 7)
- ฟังก์ชันลบจริง: `deleteOldLogs()` ที่ `backend/src/lib/opensearch.ts:185` — ลบทุก index `logs-*` (บรรทัด 189)

---

## ลำดับพรีเซนต์แนะนำ (30 นาที)

1. **สถาปัตยกรรม** (5 นาที) — เปิด `docs/architecture.md` + ไดอะแกรม data flow
2. **Ingestion หลายแหล่ง** (5 นาที) — โชว์ตาราง 2.1 ด้านบน, รัน `1_send_examples.py`
3. **Syslog demo สด** (3 นาที) — `nc -u localhost 514` หรือ `2_send_syslog.py` → เห็นใน UI ภายใน 1 นาที
4. **HTTP API + Search** (3 นาที) — curl POST → search page
5. **Dashboard** (3 นาที) — Top N, Timeline, filter
6. **Alert demo** (5 นาที) — `4_demo_login_failure_alert.py` → รอ worker → เห็นผล
7. **RBAC/Multi-tenant** (3 นาที) — login 2 user ต่าง role/tenant เทียบผลลัพธ์
8. **Deployment** (3 นาที) — โชว์ `./run.sh` รันจากศูนย์คำสั่งเดียว + SaaS URL/HTTPS ถ้ามี
</content>
