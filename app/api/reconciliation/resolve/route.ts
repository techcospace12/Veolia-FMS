import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Save a resolution for one (entity, year, month, metric).
// Body: { entity, year, month, metric, remarks, userRole, userName }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { entity, year, month, metric, remarks, userRole, userName } = body;
  if (!entity || !year || !month || !metric || !remarks?.trim()) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  await prisma.reconResolution.upsert({
    where: { entity_year_month_metric: { entity, year, month, metric } },
    update: { remarks, resolvedBy: userName ?? null },
    create: { entity, year, month, metric, remarks, resolvedBy: userName ?? null },
  });

  await prisma.auditLog.create({
    data: {
      userRole: userRole ?? "Unknown",
      userName: userName ?? null,
      action: "RECON_RESOLVED",
      details: `${entity} · ${metric} · ${year}-${String(month).padStart(2, "0")}: ${remarks}`,
    },
  });

  return NextResponse.json({ ok: true });
}

// Clear a resolution (re-open the mismatch)
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { entity, year, month, metric, userRole, userName } = body;
  if (!entity || !year || !month || !metric) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  await prisma.reconResolution.deleteMany({
    where: { entity, year, month, metric },
  });
  await prisma.auditLog.create({
    data: {
      userRole: userRole ?? "Unknown",
      userName: userName ?? null,
      action: "RECON_REOPENED",
      details: `${entity} · ${metric} · ${year}-${String(month).padStart(2, "0")}`,
    },
  });
  return NextResponse.json({ ok: true });
}
