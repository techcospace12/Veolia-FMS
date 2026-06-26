import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const log = await prisma.auditLog.create({
    data: {
      userRole: body.userRole ?? "Unknown",
      userName: body.userName ?? null,
      plantName: body.plantName ?? null,
      action: body.action ?? "ACTION",
      details: body.details ?? null,
    },
  });
  return NextResponse.json(log);
}
