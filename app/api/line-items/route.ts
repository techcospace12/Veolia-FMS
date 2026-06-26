import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Add a custom OPEX line item to a plant
// Body: { plantId, name, function }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { plantId, name, function: fn, userRole, userName, plantName } = body;
  if (!plantId || !name) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Insert after last OPEX row (before TOTAL_OPEX)
  const items = await prisma.lineItem.findMany({
    where: { plantId },
    orderBy: { order: "asc" },
  });
  const totalOpexIdx = items.findIndex((i) => i.category === "TOTAL_OPEX");
  const insertOrder = totalOpexIdx >= 0 ? items[totalOpexIdx].order : items.length;

  // Bump order for rows at and after insertOrder
  await prisma.lineItem.updateMany({
    where: { plantId, order: { gte: insertOrder } },
    data: { order: { increment: 1 } },
  });

  const li = await prisma.lineItem.create({
    data: {
      plantId,
      order: insertOrder,
      name,
      category: "OPEX",
      function: fn ?? "COS",
      isCalculated: false,
      isRemovable: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userRole: userRole ?? "Unknown",
      userName: userName ?? null,
      plantName: plantName ?? null,
      action: "LINE_ITEM_ADDED",
      details: `Added expense line '${name}'`,
    },
  });

  return NextResponse.json(li);
}
