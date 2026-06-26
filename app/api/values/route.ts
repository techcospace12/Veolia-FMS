import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Bulk upsert monthly values.
// Body: {
//   year, month, version,
//   userRole, userName, plantName,
//   updates: [{ lineItemId, value, remarks, functionTag }]
// }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { year, month, version, updates, userRole, userName, plantName } = body;
  if (!year || !month || !version || !Array.isArray(updates)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  for (const u of updates) {
    if (u.functionTag !== undefined) {
      await prisma.lineItem.update({
        where: { id: u.lineItemId },
        data: { function: u.functionTag },
      });
    }
    await prisma.monthlyValue.upsert({
      where: {
        lineItemId_year_month_version: {
          lineItemId: u.lineItemId,
          year,
          month,
          version,
        },
      },
      update: {
        value: u.value === null || u.value === undefined ? null : Number(u.value),
        remarks: u.remarks ?? null,
      },
      create: {
        lineItemId: u.lineItemId,
        year,
        month,
        version,
        value: u.value === null || u.value === undefined ? null : Number(u.value),
        remarks: u.remarks ?? null,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userRole: userRole ?? "Unknown",
      userName: userName ?? null,
      plantName: plantName ?? null,
      action: "VALUES_SAVED",
      details: `Saved ${updates.length} line items · ${version} · ${year}-${String(month).padStart(2, "0")}`,
    },
  });

  return NextResponse.json({ ok: true });
}
