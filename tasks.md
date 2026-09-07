# Task List สำหรับ AI Agent (เรียงลำดับ ห้ามข้าม)

ทำทีละ Task เท่านั้น จบแล้วรัน acceptance test เอง commit git แล้วเขียนใน /docs/progress.md
ถ้าเจอ 🛑 CHECKPOINT ให้หยุดรอเจ้าของโปรเจกต์รีวิวก่อนไปต่อ

---

## Task 01: Project Scaffold
**ทำ:**
- สร้าง Next.js project ที่ /backend (TypeScript, App Router, Tailwind)
- สร้างโครง folder ตาม CLAUDE.md
- สร้าง docker-compose.yml เปล่า (มีแค่ service placeholder)
- สร้าง .env.example พร้อม variable ที่คาดว่าต้องใช้ (JWT_SECRET, OPENSEARCH_URL, ฯลฯ)
- Init git repo, commit แรก

**Acceptance:**
- `npm run dev` ใน /backend รันขึ้นหน้า default Next.js ได้ไม่ error
- โครง folder ตรงตาม CLAUDE.md

🛑 CHECKPOINT: ให้เจ้าของโปรเจกต์เช็คโครง repo ก่อนไปต่อ

---

## Task 02: Schema + Normalizer Functions
**ทำ:**
- เขียน TypeScript type/interface สำหรับ schema กลาง ที่ /backend/lib/schema.ts
- เขียน zod schema validate ตาม type เดียวกัน
- เขียน normalizer function แยกไฟล์ต่อ source ที่ /backend/lib/normalizers/:
  firewall.ts, api.ts, crowdstrike.ts, aws.ts, m365.ts, ad.ts, network.ts
- แต่ละ normalizer รับ raw payload คืนเป็น object ตาม schema กลาง

**Acceptance:**
- เขียน unit test ที่ /tests/normalizers.test.ts ทดสอบทุก source ด้วย sample payload จากเอกสารโจทย์ (ในไฟล์ /docs/original_assignment.md หัวข้อ 4)
- รัน test ผ่านหมดทุกเคส (`npm test`)

---

## Task 03: Auth (AuthN + AuthZ + RBAC)
**ทำ:**
- สร้าง user store (เริ่มจาก JSON/in-memory ก็ได้ ไม่ต้อง DB จริงตอนนี้) seed user 4 คน:
  admin@demoA / viewer@demoA / admin@demoB / viewer@demoB
- API `/api/auth/login` (POST) รับ email+password คืน JWT ที่มี { sub, role, tenant }
- Middleware `lib/auth.ts`: verifyToken(), requireRole(roles[])
- ทุก API ที่ต้อง auth ต้อง reject ถ้าไม่มี/token ผิด (401) และถ้า role ไม่ครบ (403)

**Acceptance:**
- curl login สำเร็จได้ token จริง
- curl endpoint ที่ป้องกันไว้โดยไม่มี token → 401
- curl ด้วย token ของ Viewer ไปยัง endpoint ที่ Admin เท่านั้น → 403
- เขียน test ครอบคลุม 3 เคสนี้ที่ /tests/auth.test.ts

🛑 CHECKPOINT: รีวิว auth flow ก่อนต่อยอด endpoint อื่นทั้งหมด

---

## Task 04: HTTP Ingest Endpoint
**ทำ:**
- API `/api/ingest` (POST, ต้อง auth): รับ JSON, ตรวจ source field, เรียก normalizer ที่ตรงกัน, validate ด้วย zod
- ตอนนี้ยังไม่ต้องเก็บ OpenSearch จริง — เก็บลง array/log ใน memory หรือ console.log ออกมาก่อนพอ (จะต่อ storage ใน Task 06)

**Acceptance:**
- ยิง sample JSON ทั้ง 5 source ที่ไม่ใช่ syslog (api, crowdstrike, aws, m365, ad) จากไฟล์ตัวอย่างในโจทย์ ผ่าน curl → ได้ normalized object ที่ถูกต้องกลับมา/log ออกมา
- ยิง payload ผิด schema → ได้ error response ชัดเจน (400)

---

## Task 05: Syslog Ingestion (Vector)
**ทำ:**
- เขียน Vector config ที่ /ingest/vector.toml รับ syslog UDP+TCP port 514
- forward เป็น HTTP POST ไปที่ /api/ingest พร้อม source ที่ถูกต้อง (firewall/network)
- normalizer สำหรับ syslog raw string (parse key=value format ตามตัวอย่างในโจทย์)
- เพิ่ม Vector service ใน docker-compose.yml

**Acceptance:**
- `docker compose up vector` แล้วยิง `echo "<134>..." | nc -u localhost 514` ด้วย sample จากโจทย์ (ข้อ 4.1, 4.2)
- เห็นผล normalize ถูกต้องออกมาที่ backend (log หรือ response)

---

## Task 06: OpenSearch Integration
**ทำ:**
- เพิ่ม OpenSearch service ใน docker-compose.yml (single-node)
- สร้าง index mapping ตาม schema กลาง (script init ที่รันตอน startup)
- แก้ /api/ingest ให้ดันข้อมูล normalize แล้วเข้า OpenSearch จริง (ผูก tenant field ทุกครั้ง)
- API `/api/search` (GET, ต้อง auth): รับ query params (keyword, from/to time, source) → คืนผลจาก OpenSearch โดย**บังคับ filter tenant จาก JWT เท่านั้น**

**Acceptance:**
- ยิง sample ทุก source เข้าไปจริง แล้วค้นหาผ่าน /api/search เจอ
- ทดสอบ: login เป็น viewer@demoA ยิง /api/search → เห็นเฉพาะ log tenant demoA แม้พยายามใส่ query param tenant=demoB ก็ยังเห็นแต่ demoA
- ตั้ง ISM policy หรือ cron script ลบ/rollover ข้อมูลเก่ากว่า 7 วัน อธิบายไว้ใน /docs/retention.md

🛑 CHECKPOINT: รีวิว tenant isolation ให้แน่ใจว่าปลอดภัยจริงก่อนทำ UI

---

## Task 07: Dashboard UI
**ทำ:**
- หน้า Login (form, เก็บ JWT เป็น httpOnly cookie)
- Layout หลัก (sidebar, แสดง role/tenant ปัจจุบัน, ปุ่ม logout)
- หน้า Dashboard: Timeline chart, Top N (IP/User/EventType), filter by time range + source
  (ใช้ recharts หรือ chart library ที่ติดตั้งง่าย)
- หน้า Log Search: table + pagination + filter keyword

**Acceptance:**
- Login ได้จริงผ่าน browser
- Viewer เห็นเฉพาะข้อมูล tenant ตัวเอง, Admin dropdown เลือก tenant ได้ (ถ้าออกแบบให้ Admin ดูข้ามได้)
- กราฟ/ตาราง render ข้อมูลจริงจาก OpenSearch ไม่ใช่ mock data

---

## Task 08: Alerting
**ทำ:**
- เก็บ alert rule เป็น config (JSON/table) อย่างน้อย 1 rule: "login fail ซ้ำจาก IP เดิม ≥5 ครั้งใน 5 นาที"
- Worker script /backend/workers/alertChecker.ts รันทุก 1 นาที (ใช้ node-cron หรือ setInterval ใน process แยก) query OpenSearch เช็คเงื่อนไข
- Trigger แล้ว: บันทึกลง alerts index + ส่ง webhook (ใช้ webhook.site หรือ URL ที่ผู้ใช้กำหนดใน .env)
- หน้า UI แสดงประวัติ alert

**Acceptance:**
- ยิง sample login fail 5 ครั้งจาก IP เดียวกันภายใน 5 นาที → alert trigger จริง เห็นใน UI และ webhook ได้รับ payload

🛑 CHECKPOINT: ทดสอบ alert จริงต่อหน้าเจ้าของโปรเจกต์ก่อนไป deploy

---

## Task 09: Docker Compose ครบวงจร (Appliance Mode)
**ทำ:**
- รวมทุก service ใน docker-compose.yml ให้ครบ: backend, vector, opensearch, worker (alert checker)
- ทำให้รันจบด้วยคำสั่งเดียว `docker compose up -d` (รวม seed data เริ่มต้นถ้าจำเป็น)
- เขียน Makefile/run.sh (`make up`, `make down`, `make seed`, `make test`)

**Acceptance:**
- รีสตาร์ทเครื่อง/ลบ container ทั้งหมดแล้วรันใหม่จาก `docker compose up -d` ได้ระบบใช้งานได้ครบภายในไม่กี่นาที ไม่ต้องแก้ config เพิ่ม

---

## Task 10: SaaS Deployment
**หมายเหตุ: task นี้ agent ต้องมี SSH access ไปยัง Oracle VM ที่เจ้าของโปรเจกต์เตรียมไว้ — ถ้าไม่มีให้หยุดถาม**
**ทำ:**
- Deploy docker-compose ชุดเดียวกันขึ้น VM จริง
- ตั้ง reverse proxy (Caddy แนะนำ เพราะจัดการ TLS อัตโนมัติ) ให้ได้ HTTPS ผ่าน domain ฟรี (DuckDNS/nip.io)
- ตรวจว่า syslog UDP 514 ยิงจากภายนอกเข้าถึง VM ได้จริง (ต้องเปิด Security List ของ Oracle ด้วย ไม่ใช่แค่ firewall ในเครื่อง)

**Acceptance:**
- เข้า URL จาก browser ภายนอกได้ผ่าน HTTPS (ไม่มี warning certificate ถ้าใช้ Let's Encrypt)
- ยิง syslog จากเครื่องอื่น (ไม่ใช่ VM เอง) เข้าไปที่ VM ได้จริง

🛑 CHECKPOINT: เจ้าของโปรเจกต์ทดสอบเข้าใช้งานจาก browser ตัวเองก่อนไปต่อ

---

## Task 11: เอกสาร
**ทำ:**
- /docs/architecture.md (ถ้ายังไม่ครบจาก task ก่อนๆ ให้เติมให้สมบูรณ์)
- /docs/setup_appliance.md, /docs/setup_saas.md (ทุกคำสั่งต้องรันตามได้จริงจากศูนย์)
- .env.example ครบทุก variable

**Acceptance:**
- ให้คนอื่น (หรือ agent เอง จำลองว่าไม่มีความรู้มาก่อน) รันตามเอกสารได้ระบบขึ้นจริง

---

## Task 12: Tests + Postman Collection
**ทำ:**
- รวบรวม tests ที่เขียนมาตลอด ให้ครอบคลุมอย่างน้อย: normalize, ingest, auth/RBAC (มีอยู่แล้วจาก task ก่อน)
- Export Postman/Insomnia collection: login, ingest (ทุก source), search, alerts

**Acceptance:**
- `npm test` รันผ่านทั้งหมด
- Import Postman collection แล้วยิงทุก endpoint ได้จริง

---

## Task 13: Final Acceptance Checklist Run
**ทำ:**
- ไล่ทดสอบทุกข้อใน /docs/original_assignment.md หัวข้อ 7 (Acceptance Checklist) จริงบน environment SaaS
- บันทึกผลแต่ละข้อไว้ที่ /docs/acceptance_results.md (ผ่าน/ไม่ผ่าน + หลักฐาน เช่น screenshot/log)

🛑 CHECKPOINT สุดท้าย: รีวิวผลทั้งหมดกับเจ้าของโปรเจกต์ก่อนอัดวิดีโอเดโม
