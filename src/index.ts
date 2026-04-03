// src/index.ts
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { inventoryRoutes } from "./routes/inventory";

const PORT = Number(process.env.PORT) || 3000;

const app = new Elysia()
  .use(
    cors({
      origin: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: {
          title: " Inventory Management API",
          version: "1.0.0",
          description: `
## ระบบจัดการคลังสินค้า (Inventory Management System)
สร้างด้วย **ElysiaJS** + **Bun** + **Prisma** + **Supabase**

### CRUD Operations:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /inventory | ดึงสินค้าทั้งหมด (รองรับ ?low_stock=true) |
| GET | /inventory/:id | ดึงสินค้าตาม ID |
| POST | /inventory | เพิ่มสินค้าใหม่ |
| PATCH | /inventory/:id | แก้ไขข้อมูลสินค้า |
| PATCH | /inventory/:id/adjust | ปรับจำนวนสต็อก (รับเข้า/เบิกออก) |
| DELETE | /inventory/:id | ลบสินค้า (ต้องมี quantity = 0) |
          `,
        },
        tags: [
          { name: "Inventory", description: "จัดการข้อมูลสินค้าคงคลัง" },
          { name: "Health", description: "ตรวจสอบสถานะ API" },
        ],
      },
    })
  )

  // Health Check
  .get(
    "/",
    () => ({
      status: "🟢 Online",
      service: "Inventory Management API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      docs: "/docs",
    }),
    { detail: { summary: "Health Check", tags: ["Health"] } }
  )

  .get(
    "/health",
    async () => {
      try {
        const { prisma } = await import("./lib/prisma");
        await prisma.$queryRaw`SELECT 1`;
        return {
          status: "🟢 Healthy",
          database: "🟢 Connected (Supabase)",
          timestamp: new Date().toISOString(),
        };
      } catch (e) {
        return {
          status: "🔴 Unhealthy",
          database: "🔴 Disconnected",
          error: String(e),
          timestamp: new Date().toISOString(),
        };
      }
    },
    { detail: { summary: "Database Health Check", tags: ["Health"] } }
  )

  // Routes
  .use(inventoryRoutes)

  // Global Error Handler
  .onError(({ code, error, set }) => {
    console.error(`[ERROR] ${code}:`, error);

    if (code === "VALIDATION") {
      set.status = 422;
      return {
        success: false,
        message: "ข้อมูลไม่ถูกต้อง (Validation Error)",
        errors: error.message,
      };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return { success: false, message: "ไม่พบ Endpoint ที่ร้องขอ" };
    }

    set.status = 500;
    return {
      success: false,
      message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
      error: process.env.NODE_ENV === "development" ? String(error) : undefined,
    };
  })

  .listen(PORT);

console.log(`
╔═══════════════════════════════════════════════╗
║     📦 Inventory Management API               ║
╠═══════════════════════════════════════════════╣
║  🚀 Server:  http://localhost:${PORT}             ║
║  📖 Docs:    http://localhost:${PORT}/docs         ║
║  💚 Health:  http://localhost:${PORT}/health       ║
╚═══════════════════════════════════════════════╝
`);

export type App = typeof app;