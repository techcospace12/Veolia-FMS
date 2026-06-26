import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET: list submissions (optionally filtered by status / plantId)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const plantId = url.searchParams.get("plantId");
  const where: { status?: string; plantId?: number } = {};
  if (status) where.status = status;
  if (plantId) where.plantId = Number(plantId);

  const subs = await prisma.submission.findMany({
    where,
    include: { plant: true },
    orderBy: [{ year: "desc" }, { month: "desc" }, { id: "desc" }],
  });
  return NextResponse.json(subs);
}

// POST: create / update submission status
// Body: { plantId, year, month, version, action: 'SUBMIT'|'APPROVE'|'REJECT', reason?, userRole, userName }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { plantId, year, month, version, action, reason, userRole, userName } = body;
  if (!plantId || !year || !month || !version || !action) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const existing = await prisma.submission.findUnique({
    where: { plantId_year_month_version: { plantId, year, month, version } },
  });

  let status = existing?.status ?? "DRAFT";
  let data: Record<string, unknown> = {};
  let auditAction = "";
  let details = "";

  if (action === "SUBMIT") {
    status = "PENDING";
    data = { status, submittedBy: userName, submittedAt: new Date() };
    auditAction = "SUBMITTED_FOR_APPROVAL";
    details = `Submitted ${version} · ${year}-${String(month).padStart(2, "0")}`;
  } else if (action === "APPROVE") {
    status = "APPROVED";
    data = { status, approvedBy: userName, approvedAt: new Date() };
    auditAction = "APPROVED";
    details = `Approved ${version} · ${year}-${String(month).padStart(2, "0")}`;
  } else if (action === "REJECT") {
    status = "REJECTED";
    data = { status, rejectionReason: reason ?? null };
    auditAction = "REJECTED";
    details = `Rejected ${version} · ${year}-${String(month).padStart(2, "0")} · ${reason ?? ""}`;
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const plant = await prisma.plant.findUnique({ where: { id: plantId } });

  let sub;
  if (existing) {
    sub = await prisma.submission.update({
      where: {
        plantId_year_month_version: { plantId, year, month, version },
      },
      data,
    });
  } else {
    sub = await prisma.submission.create({
      data: {
        plantId,
        year,
        month,
        version,
        ...data,
      } as never,
    });
  }

  await prisma.auditLog.create({
    data: {
      userRole: userRole ?? "Unknown",
      userName: userName ?? null,
      plantName: plant?.name ?? null,
      action: auditAction,
      details,
    },
  });

  return NextResponse.json(sub);
}
