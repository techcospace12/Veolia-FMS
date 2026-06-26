import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const li = await prisma.lineItem.findUnique({ where: { id } });
  if (!li) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!li.isRemovable)
    return NextResponse.json({ error: "Not removable" }, { status: 400 });

  await prisma.monthlyValue.deleteMany({ where: { lineItemId: id } });
  await prisma.lineItem.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userRole: body.userRole ?? "Unknown",
      userName: body.userName ?? null,
      plantName: body.plantName ?? null,
      action: "LINE_ITEM_REMOVED",
      details: `Removed line '${li.name}'`,
    },
  });

  return NextResponse.json({ ok: true });
}
