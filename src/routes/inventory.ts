import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";

export const inventoryRoutes = new Elysia({ prefix: "/inventory" })

  // ==========================================
  // Lab 1: ดึงข้อมูลสินค้าทั้งหมด (GET)
  // ==========================================
  .get("/", async ({ query }) => {
      const isLowStock = query.low_stock === "true";
      const products = await prisma.product.findMany({
        where: isLowStock ? { quantity: { lte: 10 } } : undefined,
        orderBy: { name: "asc" },
      });
      return { success: true, count: products.length, filter: isLowStock ? "low_stock" : "all", data: products };
    },
    { query: t.Object({ low_stock: t.Optional(t.String()) }), detail: { summary: "ดึงข้อมูลสินค้าทั้งหมด", tags: ["Inventory"] } }
  )

  // ==========================================
  // ดึงข้อมูลสินค้าตาม ID (แถมให้)
  // ==========================================
  .get("/:id", async ({ params, set }) => {
      const product = await prisma.product.findUnique({ where: { id: params.id } });
      if (!product) { set.status = 404; return { success: false, message: "ไม่พบสินค้า ID: " + params.id }; }
      return { success: true, data: product };
    },
    { params: t.Object({ id: t.String() }), detail: { summary: "ดึงข้อมูลสินค้าตาม ID", tags: ["Inventory"] } }
  )

  // ==========================================
  // Lab 2: รับเข้าสินค้าใหม่ (POST)
  // ==========================================
  .post("/", async ({ body, set }) => {
      // เช็คของซ้ำ (ดีมากครับที่ใส่มา)
      const existing = await prisma.product.findUnique({ where: { sku: body.sku } });
      if (existing) { set.status = 409; return { success: false, message: "SKU นี้มีอยู่ในระบบแล้ว" }; }
      
      const product = await prisma.product.create({
        // ไม่ต้องใช้ ?? 0 แล้ว เพราะ TypeBox จัดการให้ผ่าน default: 0
        data: { name: body.name, sku: body.sku, quantity: body.quantity, zone: body.zone },
      });
      
      set.status = 201;
      return { success: true, message: "เพิ่มสินค้าเข้าระบบสำเร็จ", data: product };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        sku: t.String({ minLength: 1 }),
        zone: t.String({ minLength: 1 }),
        // Challenge: บังคับให้เริ่มที่ 0 ถ้าไม่ส่งมา
        quantity: t.Optional(t.Numeric({ default: 0 })),
      }),
      detail: { summary: "เพิ่มสินค้าใหม่เข้าคลัง", tags: ["Inventory"] }
    }
  )

  // ==========================================
  // Lab 3: อัปเดตจำนวนสต็อก (PATCH)
  // ==========================================
  .patch("/:id/adjust", async ({ params, body, set }) => {
      const product = await prisma.product.findUnique({ where: { id: params.id } });
      if (!product) { set.status = 404; return { success: false, message: "ไม่พบสินค้า ID: " + params.id }; }
      
      const newQuantity = product.quantity + body.change;
      
      // ป้องกันเบิกของจนติดลบ (Logic นี้เขียนได้ดีมากครับ)
      if (newQuantity < 0) { 
        set.status = 400; 
        return { success: false, message: "สต็อกไม่เพียงพอ มีอยู่: " + product.quantity + " ชิ้น" }; 
      }
      
      const updated = await prisma.product.update({ 
        where: { id: params.id }, 
        data: { quantity: newQuantity } 
      });
      
      return {
        success: true,
        message: body.change >= 0 ? "รับสินค้าเข้าคลัง +" + body.change + " ชิ้น สำเร็จ" : "เบิกสินค้าออกจากคลัง " + body.change + " ชิ้น สำเร็จ",
        data: { ...updated, previous_quantity: product.quantity, change: body.change, new_quantity: newQuantity },
      };
    },
    { params: t.Object({ id: t.String() }), body: t.Object({ change: t.Numeric() }), detail: { summary: "ปรับจำนวนสต็อกสินค้า", tags: ["Inventory"] } }
  )

  // ==========================================
  // Lab 4: ลบรายการสินค้า (DELETE)
  // ==========================================
  .delete("/:id", async ({ params, set }) => {
      const product = await prisma.product.findUnique({ where: { id: params.id } });
      if (!product) { set.status = 404; return { success: false, message: "ไม่พบสินค้า ID: " + params.id }; }
      
      // Challenge: ห้ามลบถ้ามีของ
      if (product.quantity > 0) { 
        set.status = 400; 
        return { success: false, message: "ไม่สามารถลบสินค้าที่ยังมีอยู่ในสต็อกได้", hint: "สินค้านี้มีสต็อกเหลือ " + product.quantity + " ชิ้น" }; 
      }
      
      await prisma.product.delete({ where: { id: params.id } });
      return { success: true, message: "ลบสินค้า " + product.name + " ออกจากระบบสำเร็จ" };
    },
    { params: t.Object({ id: t.String() }), detail: { summary: "ลบสินค้าออกจากระบบ", tags: ["Inventory"] } }
  );