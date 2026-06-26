import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { computeWaterfall } from "@/lib/waterfall";

// Aggregate per-plant summary for the dashboard.
// Query: ?year=2026&month=1&compareVersion=BUDGET
// Returns: per plant: budget & actual headline metrics + functional opex.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? 2026);
  const month = Number(url.searchParams.get("month") ?? 1);
  const compareVersion = url.searchParams.get("compareVersion") ?? "BUDGET";

  const plants = await prisma.plant.findMany({
    orderBy: { id: "asc" },
    include: {
      lineItems: {
        orderBy: { order: "asc" },
        include: {
          values: {
            where: {
              year,
              month,
              version: { in: [compareVersion, "ACTUAL"] },
            },
          },
        },
      },
    },
  });

  type LineDetail = {
    name: string;
    category: string;
    function: string | null;
    budget: number | null;
    actual: number | null;
    remarks: string | null;
  };

  type FuncSum = {
    function: string;
    budget: number;
    actual: number;
  };

  const result = plants.map((p) => {
    const buildItems = (version: "ACTUAL" | "COMPARE") =>
      p.lineItems.map((li) => ({
        id: li.id,
        order: li.order,
        name: li.name,
        category: li.category,
        function: li.function,
        isCalculated: li.isCalculated,
        isRemovable: li.isRemovable,
        storedValue:
          li.values.find(
            (v) => v.version === (version === "ACTUAL" ? "ACTUAL" : compareVersion),
          )?.value ?? null,
        remarks:
          li.values.find((v) => v.version === "ACTUAL")?.remarks ?? null,
      }));

    const budgetItems = computeWaterfall(buildItems("COMPARE"), p.revenueFactor);
    const actualItems = computeWaterfall(buildItems("ACTUAL"), p.revenueFactor);

    const pick = (cat: string, items: ReturnType<typeof computeWaterfall>) =>
      items.find((i) => i.category === cat)?.value ?? null;

    const lines: LineDetail[] = budgetItems.map((bi, idx) => ({
      name: bi.name,
      category: bi.category,
      function: bi.function,
      budget: bi.value,
      actual: actualItems[idx]?.value ?? null,
      remarks: actualItems[idx]?.remarks ?? null,
    }));

    const fns: Record<string, FuncSum> = {
      COS: { function: "COS", budget: 0, actual: 0 },
      SELLING: { function: "SELLING", budget: 0, actual: 0 },
      GA: { function: "GA", budget: 0, actual: 0 },
    };
    for (const li of p.lineItems) {
      if (!li.function) continue;
      const fn = fns[li.function];
      if (!fn) continue;
      const b = li.values.find((v) => v.version === compareVersion)?.value ?? 0;
      const a = li.values.find((v) => v.version === "ACTUAL")?.value ?? 0;
      fn.budget += b;
      fn.actual += a;
    }

    return {
      plant: {
        id: p.id,
        name: p.name,
        entity: p.entity,
        business: p.business,
        volumeUnit: p.volumeUnit,
      },
      summary: {
        revenue: { budget: pick("REVENUE", budgetItems), actual: pick("REVENUE", actualItems) },
        opex: { budget: pick("TOTAL_OPEX", budgetItems), actual: pick("TOTAL_OPEX", actualItems) },
        ebitda: { budget: pick("EBITDA", budgetItems), actual: pick("EBITDA", actualItems) },
        ebit: { budget: pick("EBIT", budgetItems), actual: pick("EBIT", actualItems) },
        capex: { budget: pick("CAPEX", budgetItems), actual: pick("CAPEX", actualItems) },
      },
      lines,
      functional: Object.values(fns),
    };
  });

  return NextResponse.json({ year, month, compareVersion, plants: result });
}
