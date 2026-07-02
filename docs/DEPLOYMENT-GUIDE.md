# SMART GRADING - Deployment Guide (DigitalOcean)

## Mục lục
1. [Tổng quan kiến trúc](#tổng-quan-kiến-trúc)
2. [Chuẩn bị tài khoản](#chuẩn-bị-tài-khoản)
3. [Bước 1: Tạo VPS trên DigitalOcean](#bước-1-tạo-vps-trên-digitalocean)
4. [Bước 2: Setup VPS](#bước-2-setup-vps)
5. [Bước 3: Clone Project](#bước-3-clone-project)
6. [Bước 4: Setup MongoDB Atlas](#bước-4-setup-mongodb-atlas)
7. [Bước 5: Deploy Backend](#bước-5-deploy-backend)
8. [Bước 6: Deploy Frontend](#bước-6-deploy-frontend)
9. [Quản lý và Monitor](#quản-lý-và-monitor)
10. [Troubleshooting](#troubleshooting)

---

## Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
└─────────────────────────────────────────────────────────────────┘
                    │                         │
                    ▼                         ▼
         ┌──────────────────┐       ┌──────────────────────────┐
         │   VERCEL         │       │   DIGITALOCEAN DROPLET   │
         │   (Frontend)      │       │   Ubuntu 24.04 LTS       │
         │   React + Vite   │       │                          │
         │   (Free tier)    │       │  ┌──────────────────┐    │
         └──────────────────┘       │  │ Docker Container │    │
                                   │  │                  │    │
                                   │  │ Backend          │    │
                                   │  │ Node.js + AMC    │    │
                                   │  │ + xvfb           │    │
                                   │  └──────────────────┘    │
                                   └────────────┬─────────────┘
                                                │
                                                ▼
                                   ┌─────────────────────────┐
                                   │    MongoDB Atlas         │
                                   │    (Cloud Database)     │
                                   │    Free Tier 512MB      │
                                   └─────────────────────────┘
```

---

## Chuẩn bị tài khoản

### 1.1. Danh sách tài khoản cần tạo

| Dịch vụ | Mục đích | Chi phí | Link đăng ký |
|---------|----------|---------|---------------|
| **DigitalOcean** | VPS Server | $4/tháng | https://www.digitalocean.com |
| **MongoDB Atlas** | Database | Free (512MB) | https://www.mongodb.com/atlas |
| **Vercel** | Frontend | Free | https://vercel.com |
| **Cloudinary** | File uploads | Free | https://cloudinary.com |
| **Gemini API** | AI features | Free tier | https://aistudio.google.com |

### 1.2. Credentials cần thu thập

Sau khi tạo tài khoản, bạn cần chuẩn bị:

```
[ ] MongoDB Atlas Connection String: mongodb+srv://...
[ ] Gemini API Key: AIza...
[ ] Cloudinary Cloud Name: your-cloud-name
[ ] Cloudinary API Key: 123456789012345
[ ] Cloudinary API Secret: xxxxxxxx
[ ] JWT Secret: (tự tạo, 32+ ký tự ngẫu nhiên)
```

---

## Bước 1: Tạo VPS trên DigitalOcean

### 1.1. Đăng ký DigitalOcean

1. Truy cập https://www.digitalocean.com
2. Click **Sign Up**
3. Đăng ký bằng **GitHub** hoặc **Google** (nhanh nhất)
4. Sau khi đăng nhập, DigitalOcean sẽ yêu cầu thêm thông tin thanh toán
5. **QUAN TRỌNG**: Mới đăng ký được $200 free credits trong 60 ngày!

### 1.2. Tạo Droplet (Server)

1. Click **Create** → **Droplets**

2. **Choose an image**: 
   - Tab **Ubuntu**
   - Chọn **Ubuntu 24.04 LTS** (x64)

3. **Choose a plan**:
   - Tab **Basic**
   - Chọn **$4/tháng** ($6 nếu muốn thêm swap) 
   - **Specs**: 1 vCPU, 512MB RAM, 10GB SSD

4. **Choose a datacenter region**:
   - Chọn **Singapore** (gần Việt Nam nhất, latency thấp)

5. **Authentication**:
   - Chọn **Password** (đơn giản cho người mới)
   - Hoặc chọn **SSH keys** (bảo mật hơn, khuyên dùng sau)

6. **How many droplets?** 1

7. **Hostname**: `smart-grading-server`

8. Click **Create Droplet**

### 1.3. Lấy thông tin server

Sau khi tạo xong, bạn sẽ thấy trong dashboard:

```
┌─────────────────────────────────────────────────┐
│  Droplet Name: smart-grading-server             │
│  IP Address: 123.456.78.90                      │
│  Status: Active                                 │
└─────────────────────────────────────────────────┘
```

**LƯU LẠI**:
- IP Address: `123.456.78.90`
- Root Password: (được gửi qua email)

### 1.4. Mở Firewall

DigitalOcean có built-in Cloud Firewall:

1. Go to **Networking** → **Firewalls**
2. Click **Create Firewall**
3. Đặt tên: `smart-grading-fw`
4. **Inbound Rules**:
   ```
   Type: SSH (22)    Source: Your IP (hoặc Anywhere tạm thời)
   Type: HTTP (80)   Source: Anywhere
   Type: HTTPS (443) Source: Anywhere  
   Type: Custom (5000) Source: Anywhere
   ```
5. **Apply to droplets**: Chọn `smart-grading-server`
6. Click **Create Firewall**

---

## Bước 2: Setup VPS

### 2.1. SSH vào Server

```bash
# Mở PowerShell (Windows) và chạy:
ssh root@123.456.78.90

# Nhập password root (sẽ không hiển thị khi gõ, bình thường)
```

**Lưu ý**: Lần đầu SSH vào, có thể bạn cần xác nhận fingerprint server. Gõ `yes` để tiếp tục.

### 2.2. Đổi password root (nếu cần)

```bash
passwd root
# Nhập password mới 2 lần
```

### 2.3. Update hệ thống

```bash
apt update && apt upgrade -y
```

### 2.4. Cài đặt Docker

```bash
# Cài Docker
curl -fsSL https://get.docker.com | sh

# Verify cài đặt
docker --version
# Output: Docker version 27.x.x, build ...

# Enable Docker khởi động cùng hệ thống
systemctl enable docker
```

### 2.5. Cài đặt Docker Compose

```bash
# Cài Docker Compose plugin
apt install -y docker-compose-plugin

# Verify
docker compose version
# Output: Docker Compose version v2.x.x
```

### 2.6. Tạo user deploy

```bash
# Tạo user
adduser deploy
# Nhập thông tin user mới (password, full name, etc.)

# Thêm user vào docker group
usermod -aG docker deploy

# Switch sang user deploy
su - deploy

# Verify
whoami
# Output: deploy
```

### 2.7. Cài đặt UFW Firewall (optional - đã có DigitalOcean Firewall)

```bash
# Exit về root trước
exit

# Cài UFW
apt install -y ufw

# Cho phép SSH (quan trọng!)
ufw allow 22/tcp

# Cho phép HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Cho phép Backend port
ufw allow 5000/tcp

# Enable UFW
ufw enable
# Gõ "y" để xác nhận

# Check status
ufw status
```

---

## Bước 3: Clone Project

### 3.1. Trên local machine - Push code lên GitHub

Nếu code chưa có trên GitHub:

```bash
# Mở PowerShell
cd "C:\TAILIEU\DATN\SMART GRADING"

# Kiểm tra git status
git status

# Nếu chưa có .git, init:
git init
git add .
git commit -m "Initial commit - prepare for production"

# Tạo repo trên GitHub.com (github.com/new)
# Sau đó chạy:
git remote add origin https://github.com/YOUR_USERNAME/smart-grading.git
git branch -M main
git push -u origin main
```

### 3.2. Clone lên VPS

```bash
# SSH vào VPS với user deploy
ssh deploy@123.456.78.90

# Clone repo
git clone https://github.com/YOUR_USERNAME/smart-grading.git
cd smart-grading

# Verify structure
ls -la
# Bạn sẽ thấy: server/  client/  docs/

# Test connection
cd server
git status
```

---

## Bước 4: Setup MongoDB Atlas

### 4.1. Tạo Cluster

1. Truy cập https://www.mongodb.com/atlas
2. Click **Sign Up** → Đăng ký (dùng GitHub cho nhanh)
3. Sau khi login, click **Build a Database**
4. Chọn **FREE tier** (M0 Sandbox)
5. **Provider**: AWS (mặc định)
6. **Region**: **Singapore** (sg-central-1)
7. Click **Create**
8. Đợi cluster tạo xong (~1-2 phút)

### 4.2. Tạo Database User

1. Trong cluster dashboard, click **Security** → **Database Access**
2. Click **Add New Database User**
3. **Authentication Method**: Password
4. **Username**: `smartgrading`
5. **Password**: `YourSecurePassword123` ← **LƯU LẠI**
6. **Database User Privileges**: **Read and write to any database**
7. Click **Add User**

### 4.3. Configure Network Access

1. Click **Security** → **Network Access**
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere**
4. Click **Confirm**

### 4.4. Lấy Connection String

1. Click **Deployment** → **Database**
2. Click **Connect** trên cluster của bạn
3. Chọn **Connect your application**
4. Copy connection string:

```
mongodb+srv://smartgrading:<PASSWORD>@cluster0.xxxxx.mongodb.net/smart-grading?retryWrites=true&w=majority
```

**THAY THẾ** `<PASSWORD>` bằng password bạn tạo ở bước 4.2

---

## Bước 5: Deploy Backend

### 5.1. Tạo file .env

```bash
# SSH vào VPS
ssh deploy@123.456.78.90
cd ~/smart-grading/server

# Tạo file .env
nano .env
```

### 5.2. Nội dung file .env

```env
# ============================================================
# MONGODB (MongoDB Atlas)
# ============================================================
MONGODB_URL=mongodb+srv://smartgrading:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/smart-grading?retryWrites=true&w=majority

# ============================================================
# AUTHENTICATION
# ============================================================
JWT_SECRET=smart-grading-jwt-secret-key-2024-minimum-32-chars
JWT_EXPIRES_IN=7d

# ============================================================
# AI PROVIDER (Gemini)
# ============================================================
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key-here

# ============================================================
# CLOUDINARY (File uploads)
# ============================================================
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# ============================================================
# WEBSOCKET
# ============================================================
WS_URL=ws://123.456.78.90:5000

# ============================================================
# SERVER CONFIG
# ============================================================
NODE_ENV=production
PORT=5000
```

**THAY THẾ** các giá trị:
- `YOUR_PASSWORD` → Password MongoDB Atlas
- `cluster0.xxxxx.mongodb.net` → Cluster URL thật
- `your-gemini-api-key-here` → Gemini API key
- `your-cloud-*` → Cloudinary credentials
- `123.456.78.90` → IP DigitalOcean thật

**Lưu file**: `Ctrl + O` → `Enter` → `Ctrl + X`

### 5.3. Build và chạy Docker

```bash
# Build image (sẽ mất 5-10 phút lần đầu)
docker compose -f docker-compose.prod.yml build

# Chạy container
docker compose -f docker-compose.prod.yml up -d

# Kiểm tra logs
docker compose -f docker-compose.prod.yml logs -f
```

### 5.4. Kiểm tra Backend

```bash
# Xem container đang chạy
docker ps

# Test health endpoint
curl http://localhost:5000/health

# Output mong đợi:
# {"status":"ok","timestamp":"2026-07-02T00:00:00.000Z","uptime":10}
```

### 5.5. Test từ bên ngoài

```bash
# Từ máy tính của bạn, mở trình duyệt:
http://123.456.78.90:5000/health
```

**Nếu thấy JSON response** → Backend đã chạy thành công!

### 5.6. Xem logs nếu có lỗi

```bash
# Xem logs chi tiết
docker logs smart-grading-server

# Hoặc logs realtime
docker logs -f smart-grading-server
```

---

## Bước 6: Deploy Frontend lên Vercel

### 6.1. Cập nhật Vercel config

Trên local machine, sửa file `client/web/vercel.json`:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://123.456.78.90:5000/api/:path*"
    },
    {
      "source": "/health",
      "destination": "https://123.456.78.90:5000/health"
    }
  ]
}
```

**THAY THẾ** `123.456.78.90` bằng IP DigitalOcean thật

Push lên GitHub:

```bash
cd "C:\TAILIEU\DATN\SMART GRADING"
git add client/web/vercel.json
git commit -m "feat: update vercel config for production"
git push
```

### 6.2. Deploy lên Vercel

**Cách 1: Qua Vercel Dashboard**

1. Truy cập https://vercel.com
2. Click **Add New** → **Project**
3. Import repository `smart-grading`
4. **Root Directory**: `client/web`
5. **Framework Preset**: Vite (sẽ tự detect)
6. **Build Command**: `npm run build`
7. **Environment Variables**:
   - `VITE_API_URL` = `https://123.456.78.90:5000`
8. Click **Deploy**

**Cách 2: Qua Vercel CLI**

```bash
# Cài Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd "C:\TAILIEU\DATN\SMART GRADING\client\web"
vercel --prod
```

### 6.3. Sau khi deploy

Vercel sẽ cung cấp URL như:
```
https://smart-grading-xxx.vercel.app
```

Truy cập URL này để test frontend!

---

## Quản lý và Monitor

### 7.1. Các lệnh Docker thường dùng

```bash
# SSH vào server
ssh deploy@123.456.78.90
cd ~/smart-grading

# Xem container
docker ps

# Xem logs
docker logs smart-grading-server -f

# Restart
docker compose -f docker-compose.prod.yml restart

# Stop
docker compose -f docker-compose.prod.yml down

# Rebuild và chạy
docker compose -f docker-compose.prod.yml up -d --build

# Xem resource
docker stats
```

### 7.2. Cập nhật code mới

```bash
# SSH vào server
ssh deploy@123.456.78.90
cd ~/smart-grading

# Pull code mới
git pull origin main

# Rebuild
docker compose -f docker-compose.prod.yml up -d --build
```

### 7.3. Backup Database

MongoDB Atlas free tier có automatic backups:
- **Atlas Dashboard** → **Deployment** → **Database** → **Backup**
- Click **Restores** để xem và restore backup

---

## Troubleshooting

### Lỗi thường gặp

#### 1. Backend không start được

```bash
# Xem logs
docker logs smart-grading-server

# Restart container
docker restart smart-grading-server

# Hoặc rebuild
docker compose -f docker-compose.prod.yml up -d --build
```

#### 2. MongoDB connection failed

```
Error: MongoNetworkError: connect ECONNREFUSED
```

**Giải pháp**:
1. Kiểm tra `MONGODB_URL` trong file .env
2. Kiểm tra Atlas Network Access: **Security** → **Network Access** → Allow **Anywhere**
3. Test connection từ server:
```bash
docker exec smart-grading-server ping cluster0.xxxxx.mongodb.net
```

#### 3. Container restart liên tục (Out of Memory)

```
Error: Cannot allocate memory
```

**Giải pháp**:
```bash
# Xem memory usage
docker stats

# Tăng swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Hoặc upgrade droplet lên $6 (1GB RAM)
```

#### 4. AMC không hoạt động

```bash
# Check AMC logs
docker exec smart-grading-server auto-multiple-choice --version

# Check xvfb
docker exec smart-grading-server Xvfb --version
```

#### 5. Frontend không kết nối Backend

1. Kiểm tra CORS trong backend (`server/src/app.js`)
2. Kiểm tra Vercel rewrite config
3. Kiểm tra firewall: `sudo ufw status`
4. Test trực tiếp: `curl http://123.456.78.90:5000/health`

#### 6. Lỗi khi build Docker

```bash
# Xem logs build
docker compose -f docker-compose.prod.yml build --no-cache

# Kiểm tra Docker daemon
docker version
```

### Kiểm tra nhanh

```bash
# SSH vào server
ssh deploy@123.456.78.90
cd ~/smart-grading

# 1. Check Docker
docker ps
# Output: CONTAINER ID   IMAGE          STATUS
#         abc123         smart-grading  Up 5 minutes

# 2. Check logs
docker logs smart-grading-server | tail -20

# 3. Test API
curl http://localhost:5000/health

# 4. Check ports
sudo netstat -tlnp | grep 5000
```

---

## Quick Reference

### Thông tin Server

```
┌─────────────────────────────────────────────────────────┐
│  DIGITALOCEAN DROPLET                                  │
├─────────────────────────────────────────────────────────┤
│  IP Address: 123.456.78.90                              │
│  SSH: ssh root@123.456.78.90                           │
│  User: deploy                                           │
│  Password: (đã đổi ở bước 2)                          │
│                                                          │
│  BACKEND URL: http://123.456.78.90:5000                │
│  FRONTEND: https://xxx.vercel.app                       │
│  MONGODB: mongodb+srv://...                             │
└─────────────────────────────────────────────────────────┘
```

### Reset Server (khi cần)

```bash
# 1. SSH vào VPS
ssh deploy@123.456.78.90

# 2. Stop containers
cd ~/smart-grading/server
docker compose -f docker-compose.prod.yml down

# 3. Pull code mới
cd ~/smart-grading
git pull origin main

# 4. Update .env nếu cần
nano server/.env

# 5. Rebuild và chạy
cd server
docker compose -f docker-compose.prod.yml up -d --build

# 6. Verify
curl http://localhost:5000/health
```

### Credentials Checklist

```
[ ] DigitalOcean Droplet IP: _______________
[ ] SSH Password (root): _______________
[ ] SSH Password (deploy): _______________

[ ] MongoDB Atlas:
    - Connection String: mongodb+srv://...
    - Password: _______________

[ ] Gemini API Key: _______________

[ ] Cloudinary:
    - Cloud Name: _______________
    - API Key: _______________
    - API Secret: _______________

[ ] JWT Secret: _______________

[ ] Vercel URL: https://___________.vercel.app
```

---

## Tài nguyên

- **DigitalOcean Docs**: https://docs.digitalocean.com
- **Docker Docs**: https://docs.docker.com
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **Vercel Docs**: https://vercel.com/docs

---

**Version**: 1.1.0 (DigitalOcean)
**Last Updated**: 2026-07-02
**Author**: SMART GRADING Team
