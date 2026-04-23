import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();
const html = readFileSync("src/index.html", "utf-8");

const app = new Elysia()
  .use(swagger())
  .get("/", () => new Response(html, { headers: { "Content-Type": "text/html" } }))

  .get("/inventory", async ({ query }) => {
      const { low_stock } = query;
      const products = await prisma.product.findMany({
        where: low_stock === "true" ? { quantity: { lte: 10 } } : undefined,
        orderBy: { name: "asc" },
      });
      return products;
    },
    { query: t.Object({ low_stock: t.Optional(t.String()) }), detail: { summary: "ดึงรายการสินค้าทั้งหมด", tags: ["Inventory"] } }
  )

  .post("/inventory", async ({ body, set }) => {
      const existing = await prisma.product.findUnique({ where: { sku: body.sku } });
      if (existing) { set.status = 409; return { error: `SKU "${body.sku}" มีในระบบแล้ว` }; }
      const product = await prisma.product.create({ data: { name: body.name, sku: body.sku, quantity: body.quantity ?? 0, zone: body.zone } });
      set.status = 201;
      return product;
    },
    { body: t.Object({ name: t.String({ minLength: 1 }), sku: t.String({ minLength: 1 }), zone: t.String({ minLength: 1 }), quantity: t.Optional(t.Number({ minimum: 0 })) }), detail: { summary: "เพิ่มสินค้าใหม่", tags: ["Inventory"] } }
  )

  .patch("/inventory/:id/adjust", async ({ params, body, set }) => {
      const product = await prisma.product.findUnique({ where: { id: params.id } });
      if (!product) { set.status = 404; return { error: "ไม่พบสินค้า" }; }
      const newQuantity = product.quantity + body.change;
      if (newQuantity < 0) { set.status = 400; return { error: `สต็อกไม่พอ (มีอยู่ ${product.quantity} ชิ้น)` }; }
      return await prisma.product.update({ where: { id: params.id }, data: { quantity: newQuantity } });
    },
    { params: t.Object({ id: t.String() }), body: t.Object({ change: t.Number() }), detail: { summary: "ปรับจำนวนสต็อก", tags: ["Inventory"] } }
  )

  .delete("/inventory/:id", async ({ params, set }) => {
      const product = await prisma.product.findUnique({ where: { id: params.id } });
      if (!product) { set.status = 404; return { error: "ไม่พบสินค้า" }; }
      if (product.quantity > 0) { set.status = 400; return { error: "ไม่สามารถลบสินค้าที่ยังมีอยู่ในสต็อกได้" }; }
      await prisma.product.delete({ where: { id: params.id } });
      return { message: `ลบสินค้า "${product.name}" เรียบร้อยแล้ว` };
    },
    { params: t.Object({ id: t.String() }), detail: { summary: "ลบสินค้า", tags: ["Inventory"] } }
  )

  .listen(3000);

console.log("Inventory API is running at http://localhost:3000");
console.log("Swagger UI: http://localhost:3000/swagger");