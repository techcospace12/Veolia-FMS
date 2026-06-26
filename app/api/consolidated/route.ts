import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Upsert consolidated values for an entity/month.
// Body: { entity, year, month, revenue, ebitda, capex, ebit, workingCapital, fxRate?, userRole, userName }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { entity, year, month, revenue, ebitda, capex, ebit, workingCapital, fxRate, userRole, userName } = body;

  if (!entity || !year || !month) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  await prisma.consolidatedData.upsert({
    where: { entity_year_month: { entity, year, month } },
    update: {
      revenue: revenue ?? null,
      ebitda: ebitda ?? null,
      capex: capex ?? null,
      ebit: ebit ?? null,
      workingCapital: workingCapital ?? null,
    },
    create: {
      entity,
      year,
      month,
      revenue: revenue ?? null,
      ebitda: ebitda ?? null,
      capex: capex ?? null,
      ebit: ebit ?? null,
      workingCapital: workingCapital ?? null,
    },
  });

  if (fxRate != null) {
    const existing = await prisma.settings.findFirst();
    if (existing) {
      await prisma.settings.update({
        where: { id: existing.id },
        data: { fxRateInrPerEur: Number(fxRate) },
      });
    } else {
      await prisma.settings.create({ data: { fxRateInrPerEur: Number(fxRate) } });
    }
  }

  await prisma.auditLog.create({
    data: {
      userRole: userRole ?? "Unknown",
      userName: userName ?? null,
      action: "CONSOL_UPDATED",
      details: `Updated consolidated ${entity} ${year}-${String(month).padStart(2, "0")}`,
    },
  });

  return NextResponse.json({ ok: true });
}
