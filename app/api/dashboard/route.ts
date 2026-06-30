import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { computeWaterfall } from "@/lib/waterfall";

export const dynamic = "force-dynamic";

// Aggregate per-plant summary for the dashboard.
// Query: ?year=2026&month=3&compareVersion=BUDGET
// Returns headline metrics in two flavours:
//   - MTD = the selected month only
//   - YTD = sum across months 1..selectedMonth
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? 2026);
  const month = Number(url.searchParams.get("month") ?? 1);
  const compareVersion = url.searchParams.get("compareVersion") ?? "BUDGET";

  const monthsYtd = Array.from({ length: month }, (_, i) => i + 1);

  const plants = await prisma.plant.findMany({
    orderBy: { id: "asc" },
    include: {
      lineItems: {
        orderBy: { order: "asc" },
        include: {
          values: {
            where: {
              year,
              month: { in: monthsYtd },
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
    budget: number | null;        // MTD budget (selected month)
    actual: number | null;        // MTD actual (selected month)
    budgetYtd: number | null;
    actualYtd: number | null;
    remarks: string | null;
  };

  type FuncSum = {
    function: string;
    budget: number;       // MTD
    actual: number;
    budgetYtd: number;
    actualYtd: number;
  };

  type Pair = { budget: number | null; actual: number | null };
  type Summary = {
    revenue: Pair;
    opex: Pair;
    ebitda: Pair;
    ebit: Pair;
    capex: Pair;
  };

  const result = plants.map((p) => {
    // For a given target month, build raw items by picking the matching MonthlyValue.
    const buildItemsFor = (
      m: number,
      kind: "ACTUAL" | "COMPARE",
    ) =>
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
            (v) =>
              v.month === m &&
              v.version === (kind === "ACTUAL" ? "ACTUAL" : compareVersion),
          )?.value ?? null,
        remarks:
          li.values.find((v) => v.month === m && v.version === "ACTUAL")?.remarks ?? null,
      }));

    // MTD waterfalls (selected month only)
    const budgetItemsMtd = computeWaterfall(buildItemsFor(month, "COMPARE"), p.revenueFactor);
    const actualItemsMtd = computeWaterfall(buildItemsFor(month, "ACTUAL"), p.revenueFactor);

    // YTD: compute the waterfall per month, then sum the value field across months
    // (this gives correct totals because each waterfall row only depends on stored
    // inputs for that month).
    const ytdCompare = monthsYtd.map((m) =>
      computeWaterfall(buildItemsFor(m, "COMPARE"), p.revenueFactor),
    );
    const ytdActual = monthsYtd.map((m) =>
      computeWaterfall(buildItemsFor(m, "ACTUAL"), p.revenueFactor),
    );

    const sumByIdx = (perMonth: ReturnType<typeof computeWaterfall>[]) => {
      const len = perMonth[0]?.length ?? 0;
      const out: Array<number | null> = [];
      for (let i = 0; i < len; i++) {
        let total = 0;
        let any = false;
        for (const month of perMonth) {
          const v = month[i]?.value;
          if (v != null) {
            total += v;
            any = true;
          }
        }
        out.push(any ? total : null);
      }
      return out;
    };
    const budgetYtdVals = sumByIdx(ytdCompare);
    const actualYtdVals = sumByIdx(ytdActual);

    const pick = (cat: string, items: ReturnType<typeof computeWaterfall>) =>
      items.find((i) => i.category === cat)?.value ?? null;

    const pickYtd = (cat: string, yvals: Array<number | null>) => {
      const idx = budgetItemsMtd.findIndex((i) => i.category === cat);
      return idx >= 0 ? yvals[idx] : null;
    };

    // Per-line breakdown (used in expanded plant detail).
    const lines: LineDetail[] = budgetItemsMtd.map((bi, idx) => ({
      name: bi.name,
      category: bi.category,
      function: bi.function,
      budget: bi.value,
      actual: actualItemsMtd[idx]?.value ?? null,
      budgetYtd: budgetYtdVals[idx],
      actualYtd: actualYtdVals[idx],
      remarks: actualItemsMtd[idx]?.remarks ?? null,
    }));

    // Functional rollup — both MTD and YTD
    const fns: Record<string, FuncSum> = {
      COS: { function: "COS", budget: 0, actual: 0, budgetYtd: 0, actualYtd: 0 },
      SELLING: { function: "SELLING", budget: 0, actual: 0, budgetYtd: 0, actualYtd: 0 },
      GA: { function: "GA", budget: 0, actual: 0, budgetYtd: 0, actualYtd: 0 },
    };
    for (const li of p.lineItems) {
      if (!li.function) continue;
      const fn = fns[li.function];
      if (!fn) continue;
      for (const v of li.values) {
        const isCompare = v.version === compareVersion;
        const isActual = v.version === "ACTUAL";
        if (!isCompare && !isActual) continue;
        const amount = v.value ?? 0;
        if (v.month === month) {
          if (isCompare) fn.budget += amount;
          else fn.actual += amount;
        }
        if (monthsYtd.includes(v.month)) {
          if (isCompare) fn.budgetYtd += amount;
          else fn.actualYtd += amount;
        }
      }
    }

    const summaryMtd: Summary = {
      revenue: { budget: pick("REVENUE", budgetItemsMtd), actual: pick("REVENUE", actualItemsMtd) },
      opex: { budget: pick("TOTAL_OPEX", budgetItemsMtd), actual: pick("TOTAL_OPEX", actualItemsMtd) },
      ebitda: { budget: pick("EBITDA", budgetItemsMtd), actual: pick("EBITDA", actualItemsMtd) },
      ebit: { budget: pick("EBIT", budgetItemsMtd), actual: pick("EBIT", actualItemsMtd) },
      capex: { budget: pick("CAPEX", budgetItemsMtd), actual: pick("CAPEX", actualItemsMtd) },
    };
    const summaryYtd: Summary = {
      revenue: { budget: pickYtd("REVENUE", budgetYtdVals), actual: pickYtd("REVENUE", actualYtdVals) },
      opex: { budget: pickYtd("TOTAL_OPEX", budgetYtdVals), actual: pickYtd("TOTAL_OPEX", actualYtdVals) },
      ebitda: { budget: pickYtd("EBITDA", budgetYtdVals), actual: pickYtd("EBITDA", actualYtdVals) },
      ebit: { budget: pickYtd("EBIT", budgetYtdVals), actual: pickYtd("EBIT", actualYtdVals) },
      capex: { budget: pickYtd("CAPEX", budgetYtdVals), actual: pickYtd("CAPEX", actualYtdVals) },
    };

    return {
      plant: {
        id: p.id,
        name: p.name,
        entity: p.entity,
        business: p.business,
        volumeUnit: p.volumeUnit,
      },
      summary: summaryMtd,        // kept for backward compatibility
      summaryMtd,
      summaryYtd,
      lines,
      functional: Object.values(fns),
    };
  });

  return NextResponse.json({
    year,
    month,
    monthsYtd,
    compareVersion,
    plants: result,
  });
}
