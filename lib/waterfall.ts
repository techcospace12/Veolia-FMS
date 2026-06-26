// Compute the full P&L waterfall for one (plant, year, month, version).
// Inputs are the raw line-item values; calculated rows are derived here.

import type { LineItemCategory } from "./types";

export type ComputedLineItem = {
  id: number;
  order: number;
  name: string;
  category: LineItemCategory;
  function: string | null;
  isCalculated: boolean;
  isRemovable: boolean;
  value: number | null;        // computed or stored
  storedValue: number | null;  // raw stored value (null for calculated)
  remarks: string | null;
};

type Raw = {
  id: number;
  order: number;
  name: string;
  category: string;
  function: string | null;
  isCalculated: boolean;
  isRemovable: boolean;
  storedValue: number | null;
  remarks: string | null;
};

export function computeWaterfall(
  items: Raw[],
  revenueFactor: number,
): ComputedLineItem[] {
  // Index by category for fast lookup
  const byCat: Record<string, Raw[]> = {};
  for (const it of items) {
    (byCat[it.category] ||= []).push(it);
  }

  const volumes = byCat.VOLUME?.[0]?.storedValue;
  const rate = byCat.RATE?.[0]?.storedValue;
  const revenue =
    volumes != null && rate != null ? volumes * rate * revenueFactor : null;

  const sumOf = (cat: string) => {
    const list = byCat[cat] || [];
    if (list.every((x) => x.storedValue == null)) return null;
    return list.reduce((acc, x) => acc + (x.storedValue ?? 0), 0);
  };

  const totalOpex = sumOf("OPEX");
  const profitBeforeMP =
    revenue != null && totalOpex != null ? revenue - totalOpex : null;

  const totalStaff = sumOf("STAFF");
  const profitBeforeSGA =
    profitBeforeMP != null && totalStaff != null
      ? profitBeforeMP - totalStaff
      : null;

  const sga = sumOf("SGA") ?? 0;
  const corp = sumOf("CORPORATE") ?? 0;
  const ebitda =
    profitBeforeSGA != null ? profitBeforeSGA - sga - corp : null;

  const dep = byCat.DEPRECIATION?.[0]?.storedValue ?? null;
  const ebit = ebitda != null && dep != null ? ebitda - dep : null;

  // Map the calculated values to category
  const calcMap: Partial<Record<string, number | null>> = {
    REVENUE: revenue,
    TOTAL_OPEX: totalOpex,
    PROFIT_BEFORE_MP: profitBeforeMP,
    TOTAL_STAFF: totalStaff,
    PROFIT_BEFORE_SGA: profitBeforeSGA,
    EBITDA: ebitda,
    EBIT: ebit,
  };

  return items
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((it) => {
      let value: number | null;
      if (it.isCalculated) {
        value = calcMap[it.category] ?? null;
      } else {
        value = it.storedValue;
      }
      return {
        id: it.id,
        order: it.order,
        name: it.name,
        category: it.category as LineItemCategory,
        function: it.function,
        isCalculated: it.isCalculated,
        isRemovable: it.isRemovable,
        value,
        storedValue: it.storedValue,
        remarks: it.remarks,
      };
    });
}

export function formatMINR(v: number | null | undefined, opts?: { digits?: number; sign?: boolean }) {
  if (v == null || isNaN(v)) return "—";
  const digits = opts?.digits ?? 2;
  const abs = Math.abs(v);
  const txt = abs.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  if (v < 0) return `(${txt})`;
  if (opts?.sign && v > 0) return `+${txt}`;
  return txt;
}

export function formatNumber(v: number | null | undefined, digits = 0) {
  if (v == null || isNaN(v)) return "—";
  return v.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function pctAchieved(actual: number | null, budget: number | null): number | null {
  if (actual == null || budget == null || budget === 0) return null;
  return (actual / budget) * 100;
}

export function variance(actual: number | null, budget: number | null): number | null {
  if (actual == null || budget == null) return null;
  return actual - budget;
}

// Some metrics are "higher is better" (Revenue, EBITDA, EBIT, volumes etc.) —
// beating budget is good. Cost lines (Opex, Staff, SGA, CapEx, WC, etc.) are
// "lower is better" — coming in under budget is good.
export type Direction = "higher_better" | "lower_better";

const LOWER_BETTER_CATEGORIES: Set<string> = new Set([
  "OPEX", "TOTAL_OPEX",
  "STAFF", "TOTAL_STAFF",
  "SGA", "CORPORATE",
  "DEPRECIATION", "CAPEX", "WC",
]);

export function directionFor(category: string): Direction {
  return LOWER_BETTER_CATEGORIES.has(category) ? "lower_better" : "higher_better";
}

// Common color picker.
// `pctAch` is Actual ÷ Budget × 100. When `direction === "higher_better"`,
// any value >= 100 is green; below 100, severity scales with the gap.
// For "lower_better", any value <= 100 is green; severity scales above 100.
export function varianceColor(
  pctAch: number | null,
  direction: Direction = "higher_better",
): string {
  if (pctAch == null) return "";
  const diff = pctAch - 100;
  const isGood = direction === "higher_better" ? diff >= 0 : diff <= 0;
  if (isGood) return "text-emerald-700";
  const dev = Math.abs(diff);
  if (dev <= 10) return "text-emerald-700"; // minor miss still considered green
  if (dev <= 25) return "text-amber-700";
  return "text-rose-700";
}

export function varianceBg(
  pctAch: number | null,
  direction: Direction = "higher_better",
): string {
  if (pctAch == null) return "bg-slate-50";
  const diff = pctAch - 100;
  const isGood = direction === "higher_better" ? diff >= 0 : diff <= 0;
  if (isGood) return "bg-emerald-50";
  const dev = Math.abs(diff);
  if (dev <= 10) return "bg-emerald-50";
  if (dev <= 25) return "bg-amber-50";
  return "bg-rose-50";
}
