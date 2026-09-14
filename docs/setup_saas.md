# SaaS Deployment Guide

## Prerequisites
- Oracle Cloud VM (หรือ VM ผู้ให้บริการอื่น) พร้อม SSH access
- Domain name จริง หรือใช้ nip.io/DuckDNS ฟรี (เช่น `1.2.3.4.nip.io`)
- Security List / Firewall เปิด:
  - TCP 80 (HTTP, สำหรับ Let's Encrypt challenge)
  - TCP 443 (HTTPS)
  - UDP 514 (Syslog)
  - TCP 22 (SSH)

## Deployment Steps

### 1. Provision VM
สร้าง VM (Oracle Cloud หรืออื่นๆ) แล้ว SSH เข้าไป:
```bash
ssh -i <your-ssh-key> opc@<VM_IP>
```

ติดตั้ง Docker:
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

### 2. Clone Repository
```bash
git clone https://github.com/passapol146990/Demo-Log-Management.git
cd Demo-Log-Management
```

### 3. ตั้งค่า .env
```bash
cp .env.example .env
```
แก้ `DOMAIN` ใน `.env` เป็น domain จริง หรือ `<VM_IP>.nip.io` สำหรับทดสอบฟรี:
```
DOMAIN=1.2.3.4.nip.io
```

Reverse proxy config อยู่ที่ `deploy/Caddyfile` ในโปรเจกต์แล้ว ไม่ต้องสร้างเอง

### 4. เปิด Firewall
เปิด inbound port 80, 443, 514 (ตัวอย่าง Oracle Cloud):
Networking → Virtual Cloud Networks → Security Lists → เพิ่ม inbound rules สำหรับ TCP 80, TCP 443, UDP 514, TCP 22

### 5. Start Services
รันด้วย override file `docker-compose.saas.yml` เพื่อเปิด Caddy reverse proxy:
```bash
docker compose -f docker-compose.yml -f docker-compose.saas.yml up -d
```

### 6. รอ Caddy ออก Certificate อัตโนมัติ
Caddy จะขอ certificate จาก Let's Encrypt อัตโนมัติเมื่อ DNS ของ `DOMAIN` ชี้มาที่ VM แล้ว เช็ค progress ด้วย:
```bash
docker compose logs -f caddy
```
รอจนเห็น log ประมาณ `certificate obtained successfully`

### 7. Verify Deployment
```bash
curl https://<DOMAIN>/api/auth/me
docker compose ps
```

### 8. Test External Syslog
```bash
echo "<134>1 2024-01-15T10:30:00.000Z fw01 firewall - - - msg='TEST'" | nc -u <VM_IP> 514
```

## Notes
- `docker-compose.yml` เป็น base config ใช้ได้ทั้ง Appliance (local, `docker compose up -d`) และ SaaS
- `docker-compose.saas.yml` เป็น override เฉพาะ SaaS mode: เพิ่ม Caddy service และปิด direct port exposure ของ backend (เข้าผ่าน Caddy เท่านั้น)
- ทดสอบ local ด้วย self-signed cert ได้โดยตั้ง `DOMAIN=localhost` (Caddyfile มี `tls internal` fallback ให้)
