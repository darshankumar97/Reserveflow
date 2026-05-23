import { PrismaClient, ReservationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const warehouse = await prisma.warehouse.upsert({
    where: { code: "WH-MAIN" },
    update: {},
    create: {
      code: "WH-MAIN",
      name: "Main Distribution Center",
    },
  });

  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: "MED-001" },
      update: {},
      create: {
        sku: "MED-001",
        name: "Surgical Gloves (Box)",
        description: "Latex-free, size M",
      },
    }),
    prisma.product.upsert({
      where: { sku: "MED-002" },
      update: {},
      create: {
        sku: "MED-002",
        name: "IV Fluid 500ml",
        description: "Sodium chloride 0.9%",
      },
    }),
    prisma.product.upsert({
      where: { sku: "MED-003" },
      update: {},
      create: {
        sku: "MED-003",
        name: "N95 Respirator",
        description: "NIOSH approved",
      },
    }),
  ]);

  for (const [index, product] of products.entries()) {
    const stock = [500, 200, 80][index] ?? 100;
    const reserved = [120, 45, 30][index] ?? 0;

    await prisma.inventory.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: warehouse.id,
          productId: product.id,
        },
      },
      update: {
        totalQuantity: stock,
        reservedQuantity: reserved,
      },
      create: {
        warehouseId: warehouse.id,
        productId: product.id,
        totalQuantity: stock,
        reservedQuantity: reserved,
      },
    });
  }

  await prisma.reservation.deleteMany();

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.reservation.createMany({
    data: [
      {
        warehouseId: warehouse.id,
        productId: products[0]!.id,
        quantity: 50,
        status: ReservationStatus.CONFIRMED,
        reference: "ORD-1001",
        expiresAt,
        confirmedAt: new Date(),
      },
      {
        warehouseId: warehouse.id,
        productId: products[0]!.id,
        quantity: 70,
        status: ReservationStatus.PENDING,
        reference: "ORD-1002",
        expiresAt,
      },
      {
        warehouseId: warehouse.id,
        productId: products[1]!.id,
        quantity: 45,
        status: ReservationStatus.CONFIRMED,
        reference: "ORD-1003",
        expiresAt,
        confirmedAt: new Date(),
      },
      {
        warehouseId: warehouse.id,
        productId: products[2]!.id,
        quantity: 30,
        status: ReservationStatus.PENDING,
        reference: "ORD-1004",
        expiresAt,
      },
    ],
  });

  console.log(
    `Seeded warehouse, ${products.length} products, inventory, and reservations.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
