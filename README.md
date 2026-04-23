# Inventory API

REST API สำหรับระบบจัดการสินค้าคงคลัง สร้างด้วย Elysia + Bun + Prisma + Supabase

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Framework | Elysia |
| ORM | Prisma |
| Database | PostgreSQL (Supabase) |

## Features

- ดูรายการสินค้าทั้งหมด พร้อมกรองสินค้าใกล้หมดสต็อก (≤ 10 ชิ้น)
- เพิ่ม / ปรับจำนวน / ลบสินค้า
- Frontend UI พร้อมใช้งาน ที่ `/`
- Swagger UI สำหรับทดสอบ API ที่ `/swagger`

## Setup

### 1. ติดตั้ง dependencies
```bash
bun install
```

### 2. สร้างไฟล์ `.env`
```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

### 3. Push schema ขึ้นฐานข้อมูล
```bash
bunx prisma db push
```

### 4. รัน server
```bash
bun run dev
```

- Frontend: http://localhost:3000
- Swagger UI: http://localhost:3000/swagger

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /inventory | ดึงสินค้าทั้งหมด (เรียง A-Z) |
| GET | /inventory?low_stock=true | ดึงสินค้าที่เหลือ ≤ 10 ชิ้น |
| POST | /inventory | เพิ่มสินค้าใหม่ |
| PATCH | /inventory/:id/adjust | ปรับจำนวนสต็อก |
| DELETE | /inventory/:id | ลบสินค้า (quantity ต้องเป็น 0) |

## Business Rules

- SKU ต้องไม่ซ้ำกัน
- จำนวนสต็อกติดลบไม่ได้
- ลบสินค้าได้เฉพาะเมื่อ quantity = 0 เท่านั้น