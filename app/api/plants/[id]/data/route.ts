import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Returns: plant, line items, and ALL stored monthly values for the requested month
// across BUDGET + selected version (so client can compute % achieved, variance).
// Query: ?year=2026&month=1&version=ACTUAL
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const plantId = Number(params.id);
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? 2026);
  const month = Number(url.searchParams.get("month") ?? 1);
  const version = url.searchParams.get("version") ?? "ACTUAL";

  const plant = await prisma.plant.findUnique({ where: { id: plantId } });
  if (!plant) return NextResponse.json({ error: "Plant not found" }, { status: 404 });

  const lineItems = await prisma.lineItem.findMany({
    where: { plantId },
    orderBy: { order: "asc" },
    include: {
      values: {
        where: {
          year,
          month,
          version: { in: ["BUDGET", version] },
        },
      },
    },
  });

  const submission = await prisma.submission.findUnique({
    where: {
      plantId_year_month_version: { plantId, year, month, version },
    },
  });

  // Shape: items as { id, order, name, category, function, isCalculated, isRemovable,
  //   budget: number|null, selected: number|null, remarks: string|null }
  const items = lineItems.map((li) => {
    const bud = li.values.find((v) => v.version === "BUDGET");
    const sel = li.values.find((v) => v.version === version);
    return {
      id: li.id,
      order: li.order,
      name: li.name,
      category: li.category,
      function: li.function,
      isCalculated: li.isCalculated,
      isRemovable: li.isRemovable,
      budget: bud?.value ?? null,
      selected: sel?.value ?? null,
      remarks: sel?.remarks ?? null,
    };
  });

  return NextResponse.json({
    plant,
    items,
    submission: submission ?? { status: "DRAFT" },
  });
}
