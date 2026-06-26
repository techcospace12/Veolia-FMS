import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const plants = await prisma.plant.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      entity: true,
      business: true,
      volumeUnit: true,
      rateUnit: true,
      revenueFactor: true,
    },
  });
  return NextResponse.json(plants);
}
