# Project Brief: Log Management Demo System
## วิธีเขียนโค้ด
ไม่ต้องคอมเม้นการทำงานของโค้ด เขียนโค้ดให้สั้นกระซับ แยก components ชัดเจนแบ่ง folders แบ่งไฟล์อย่างมืออาชีพ

## เป้าหมาย
สร้างระบบ Log Management ที่รองรับหลายแหล่งข้อมูล (firewall/syslog, HTTP API, CrowdStrike, AWS, M365, AD)
ติดตั้งได้ทั้ง Appliance (docker-compose local) และ SaaS (cloud VM มี URL+HTTPS)
สำหรับข้อสอบภาคปฏิบัติ Full-Stack Developer Intern — ต้องผ่าน Acceptance Checklist ในเอกสารโจทย์ (ดู /docs/original_assignment.md)

## Tech Stack (ตายตัว ห้ามเปลี่ยนโดยไม่ถาม)
- Frontend + Backend API: Next.js 14+ (App Router), TypeScript
- Log collector (syslog): Vector
- Storage/Search: OpenSearch
- Auth: JWT (jsonwebtoken), bcrypt สำหรับ password
- Validation: zod
- Deployment: Docker Compose (ต้องรันได้ทั้ง local และ Oracle Cloud VM ด้วย config เดียวกัน ต่างแค่ .env)

## Schema กลาง (ห้ามเปลี่ยนโครงสร้าง field หลัก)
ดูรายละเอียดเต็มที่ /docs/schema.md — สรุปคือทุก log ที่เข้าระบบต้องถูก normalize เป็น object ที่มี field:
@timestamp, tenant, source, vendor, product, event_type, event_subtype, severity (0-10),
action, src_ip, src_port, dst_ip, dst_port, protocol, user, host, process, url,
http_method, status_code, rule_name, rule_id, cloud.account_id, cloud.region, cloud.service,
raw, _tags

## กติกาการทำงานของ Agent
1. **ทำทีละ task ตามไฟล์ /docs/tasks/** เรียงเลขก่อนหลัง ห้ามข้ามลำดับ
2. **ทุก task ต้องมี acceptance criteria ผ่านก่อนถือว่าเสร็จ** — รันทดสอบเองก่อนรายงานว่าเสร็จ (curl/script ทดสอบจริง ไม่ใช่แค่ compile ผ่าน)
3. **commit git ทุกครั้งที่ task เสร็จ** ด้วย message ชัดเจน เช่น `feat: implement syslog ingestion via Vector`
4. **ห้ามแก้ schema กลางหรือ tech stack เอง** ถ้าจำเป็นต้องเปลี่ยนให้หยุดแล้วถามก่อน
5. **เขียน progress ลงไฟล์ /docs/progress.md** ทุกครั้งหลังจบ task — สรุปว่าทำอะไรไป ติดปัญหาอะไรไหม เหลืออะไรบ้าง
6. **ที่ checkpoint (ระบุในแต่ละ task file) ให้หยุดรอ** ไม่ทำ task ถัดไปจนกว่าเจ้าของโปรเจกต์จะรีวิว
7. ทุก endpoint ที่ต้อง auth ต้องบังคับ tenant filter จาก JWT เท่านั้น ห้ามรับ tenant จาก query param ของ client
8. เขียน comment ในโค้ดเฉพาะจุดที่ตรรกะซับซ้อน (normalize mapping, alert condition) ไม่ต้องคอมเมนต์ทุกบรรทัด

## โครงสร้าง Repo
```
/backend        Next.js app (frontend+API รวม)
/ingest         Vector config
/docs           เอกสารทั้งหมด รวม tasks/ และ progress.md
/samples        sample log files + scripts ยิงทดสอบ
/tests          test cases
docker-compose.yml
.env.example
README.md
```

## ติดต่อ/ทรัพยากรภายนอก
- Oracle Cloud VM: IP และ SSH key อยู่ที่ [ผู้ใช้กรอกเอง — ห้าม agent เดา/สมมติ]
- ถ้า task ต้องใช้ external service (เช่น webhook สำหรับ alert) ให้ใช้ webhook.site หรือถามก่อนถ้าต้องการ credential จริง
