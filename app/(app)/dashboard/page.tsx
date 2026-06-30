"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { MONTHS, VERSION_LABELS, type Version } from "@/lib/types";

const FUNCTIONS: Array<{ key: string; label: string; short: string }> = [
  { key: "COS", label: "COS — Cost of Sales", short: "COS" },
  { key: "SELLING", label: "Selling", short: "Selling" },
  { key: "GA", label: "G&A", short: "G&A" },
];
import {
  formatMINR,
  pctAchieved,
  variance,
  varianceColor,
  varianceBg,
  directionFor,
  type Direction,
} from "@/lib/waterfall";

type Plant = {
  id: number;
  name: string;
  entity: string;
  business: string;
  volumeUnit: string;
};
type Pair = { budget: number | null; actual: number | null };
type Summary = {
  revenue: Pair;
  opex: Pair;
  ebitda: Pair;
  ebit: Pair;
  capex: Pair;
};
type Line = {
  name: string;
  category: string;
  function: string | null;
  budget: number | null;
  actual: number | null;
  budgetYtd: number | null;
  actualYtd: number | null;
  remarks: string | null;
};
type Functional = {
  function: string;
  budget: number;       // MTD
  actual: number;
  budgetYtd: number;
  actualYtd: number;
};
type PlantBlock = {
  plant: Plant;
  summary: Summary;        // legacy = MTD
  summaryMtd: Summary;
  summaryYtd: Summary;
  lines: Line[];
  functional: Functional[];
};

const CATEGORY_ORDER = [
  "VOLUME", "RATE", "REVENUE",
  "OPEX", "TOTAL_OPEX", "PROFIT_BEFORE_MP",
  "STAFF", "TOTAL_STAFF", "PROFIT_BEFORE_SGA",
  "SGA", "CORPORATE", "EBITDA",
  "DEPRECIATION", "EBIT", "CAPEX", "WC",
];

export default function DashboardPage() {
  const [month, setMonth] = useState(1);
  const [version, setVersion] = useState<Version>("BUDGET");
  const [view, setView] = useState<"nature" | "function">("nature");
  const [data, setData] = useState<{ plants: PlantBlock[] } | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/dashboard?year=2026&month=${month}&compareVersion=${version}`)
      .then((r) => r.json())
      .then(setData);
  }, [month, version]);

  // Aggregates across plants — both MTD and YTD
  const totals = useMemo(() => {
    if (!data) return null;
    const mk = () => ({
      revenue: { budget: 0, actual: 0 },
      ebitda: { budget: 0, actual: 0 },
      ebit: { budget: 0, actual: 0 },
      capex: { budget: 0, actual: 0 },
    });
    const mtd = mk();
    const ytd = mk();
    for (const p of data.plants) {
      for (const k of ["revenue", "ebitda", "ebit", "capex"] as const) {
        mtd[k].budget += p.summaryMtd[k].budget ?? 0;
        mtd[k].actual += p.summaryMtd[k].actual ?? 0;
        ytd[k].budget += p.summaryYtd[k].budget ?? 0;
        ytd[k].actual += p.summaryYtd[k].actual ?? 0;
      }
    }
    return { mtd, ytd };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Budget vs Actuals</h1>
          <p className="mt-1 text-sm text-slate-500">
            All plants — consolidated and per-plant variance against the selected version.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="label">Month</label>
            <select className="select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {[1,2,3].map((m) => <option key={m} value={m}>{MONTHS[m-1]} 2026</option>)}
            </select>
          </div>
          <div>
            <label className="label">Compare against</label>
            <select className="select" value={version} onChange={(e) => setVersion(e.target.value as Version)}>
              <option value="BUDGET">{VERSION_LABELS.BUDGET}</option>
              <option value="FLASH1">{VERSION_LABELS.FLASH1}</option>
              <option value="FLASH2">{VERSION_LABELS.FLASH2}</option>
              <option value="FORECAST2">{VERSION_LABELS.FORECAST2}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top KPI cards — each shows both MTD (selected month) and YTD (Jan → selected month) */}
      {totals && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Kpi
            label="Revenue"
            cmpLabel={VERSION_LABELS[version]}
            direction="higher_better"
            mtdBudget={totals.mtd.revenue.budget} mtdActual={totals.mtd.revenue.actual}
            ytdBudget={totals.ytd.revenue.budget} ytdActual={totals.ytd.revenue.actual}
            monthLabel={MONTHS[month-1]}
          />
          <Kpi
            label="EBITDA"
            cmpLabel={VERSION_LABELS[version]}
            direction="higher_better"
            mtdBudget={totals.mtd.ebitda.budget} mtdActual={totals.mtd.ebitda.actual}
            ytdBudget={totals.ytd.ebitda.budget} ytdActual={totals.ytd.ebitda.actual}
            monthLabel={MONTHS[month-1]}
          />
          <Kpi
            label="EBIT"
            cmpLabel={VERSION_LABELS[version]}
            direction="higher_better"
            mtdBudget={totals.mtd.ebit.budget} mtdActual={totals.mtd.ebit.actual}
            ytdBudget={totals.ytd.ebit.budget} ytdActual={totals.ytd.ebit.actual}
            monthLabel={MONTHS[month-1]}
          />
          <Kpi
            label="CapEx"
            cmpLabel={VERSION_LABELS[version]}
            direction="lower_better"
            mtdBudget={totals.mtd.capex.budget} mtdActual={totals.mtd.capex.actual}
            ytdBudget={totals.ytd.capex.budget} ytdActual={totals.ytd.capex.actual}
            monthLabel={MONTHS[month-1]}
          />
        </div>
      )}

      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">
          {view === "nature"
            ? `Plant performance — ${MONTHS[month-1]} 2026`
            : `Expenses by function — ${MONTHS[month-1]} 2026`}
        </div>
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-xs">
          <button
            onClick={() => setView("nature")}
            className={clsx("px-3 py-1 rounded", view === "nature" ? "bg-veolia-600 text-white" : "text-slate-500 hover:text-slate-700")}
          >
            Nature view
          </button>
          <button
            onClick={() => setView("function")}
            className={clsx("px-3 py-1 rounded", view === "function" ? "bg-veolia-600 text-white" : "text-slate-500 hover:text-slate-700")}
          >
            Functional view
          </button>
        </div>
      </div>

      {view === "nature" && (
        <div className="card overflow-x-auto">
          <table className="w-full table-tight">
            <thead>
              <tr>
                <th rowSpan={2} className="align-bottom">Plant</th>
                <th rowSpan={2} className="align-bottom">Entity</th>
                <th colSpan={2} className="!text-center border-l border-slate-200">Revenue {MONTHS[month-1]}</th>
                <th colSpan={2} className="!text-center border-l border-slate-200">Revenue YTD</th>
                <th colSpan={2} className="!text-center border-l border-slate-200">EBITDA {MONTHS[month-1]}</th>
                <th colSpan={2} className="!text-center border-l border-slate-200">EBITDA YTD</th>
                <th rowSpan={2} className="align-bottom !text-right border-l border-slate-200">% Ach. YTD vs {VERSION_LABELS[version]}</th>
                <th rowSpan={2} className="align-bottom"></th>
              </tr>
              <tr>
                <th className="!text-right border-l border-slate-200 text-[10px] font-normal text-slate-500">{VERSION_LABELS[version]}</th>
                <th className="!text-right text-[10px] font-normal text-slate-500">Actual</th>
                <th className="!text-right border-l border-slate-200 text-[10px] font-normal text-slate-500">{VERSION_LABELS[version]}</th>
                <th className="!text-right text-[10px] font-normal text-slate-500">Actual</th>
                <th className="!text-right border-l border-slate-200 text-[10px] font-normal text-slate-500">{VERSION_LABELS[version]}</th>
                <th className="!text-right text-[10px] font-normal text-slate-500">Actual</th>
                <th className="!text-right border-l border-slate-200 text-[10px] font-normal text-slate-500">{VERSION_LABELS[version]}</th>
                <th className="!text-right text-[10px] font-normal text-slate-500">Actual</th>
              </tr>
            </thead>
            <tbody>
              {data?.plants.map((p) => {
                // % Achievement on the EBITDA YTD figure — higher is better.
                const ebitdaYtdPct = pctAchieved(p.summaryYtd.ebitda.actual, p.summaryYtd.ebitda.budget);
                const ebitdaColor = varianceColor(ebitdaYtdPct, "higher_better");
                const open = expanded === p.plant.id;
                return (
                  <>
                    <tr key={p.plant.id} className={clsx({ "bg-slate-50": open })}>
                      <td className="font-medium text-slate-700">{p.plant.name}</td>
                      <td className="text-slate-600">{p.plant.entity}</td>
                      <td className="numeric border-l border-slate-100">{formatMINR(p.summaryMtd.revenue.budget)}</td>
                      <td className="numeric">{formatMINR(p.summaryMtd.revenue.actual)}</td>
                      <td className="numeric border-l border-slate-100">{formatMINR(p.summaryYtd.revenue.budget)}</td>
                      <td className="numeric">{formatMINR(p.summaryYtd.revenue.actual)}</td>
                      <td className="numeric border-l border-slate-100">{formatMINR(p.summaryMtd.ebitda.budget)}</td>
                      <td className="numeric">{formatMINR(p.summaryMtd.ebitda.actual)}</td>
                      <td className="numeric border-l border-slate-100">{formatMINR(p.summaryYtd.ebitda.budget)}</td>
                      <td className="numeric">{formatMINR(p.summaryYtd.ebitda.actual)}</td>
                      <td className={clsx("numeric border-l border-slate-100", ebitdaColor)}>
                        {ebitdaYtdPct != null ? ebitdaYtdPct.toFixed(1) + "%" : "—"}
                      </td>
                      <td>
                        <button
                          className="text-xs text-veolia-600 hover:underline"
                          onClick={() => setExpanded(open ? null : p.plant.id)}
                        >
                          {open ? "Hide" : "Expand"}
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={11} className="bg-slate-50 p-0">
                          <PlantNatureDetail plant={p} version={version} monthLabel={MONTHS[month-1]} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === "function" && data && <FunctionalView plants={data.plants} version={version} monthLabel={MONTHS[month-1]} />}
    </div>
  );
}

function FunctionalView({
  plants, version, monthLabel,
}: {
  plants: PlantBlock[];
  version: Version;
  monthLabel: string;
}) {
  const [openFn, setOpenFn] = useState<string | null>(null);

  // Aggregate across all plants by function — both MTD and YTD
  const totals = useMemo(() => {
    return FUNCTIONS.map((f) => {
      let budget = 0, actual = 0, budgetYtd = 0, actualYtd = 0;
      for (const p of plants) {
        const fn = p.functional.find((x) => x.function === f.key);
        if (!fn) continue;
        budget += fn.budget;
        actual += fn.actual;
        budgetYtd += fn.budgetYtd;
        actualYtd += fn.actualYtd;
      }
      return { function: f.key, label: f.label, short: f.short, budget, actual, budgetYtd, actualYtd };
    });
  }, [plants]);

  // Per-plant line items grouped by function (for expansion)
  const lineByFn = useMemo(() => {
    const out: Record<string, Array<{ plant: string; line: string; budget: number; actual: number }>> = {
      COS: [], SELLING: [], GA: [],
    };
    for (const p of plants) {
      for (const l of p.lines) {
        if (!l.function) continue;
        if (l.category !== "OPEX" && l.category !== "SGA" && l.category !== "CORPORATE") continue;
        const arr = out[l.function];
        if (!arr) continue;
        arr.push({
          plant: p.plant.name,
          line: l.name,
          budget: l.budget ?? 0,
          actual: l.actual ?? 0,
        });
      }
    }
    return out;
  }, [plants]);

  return (
    <div className="card overflow-x-auto">
      <table className="w-full table-tight">
        <thead>
          <tr>
            <th rowSpan={2} className="align-bottom">Function</th>
            <th colSpan={3} className="!text-center border-l border-slate-200">{monthLabel} (MTD)</th>
            <th colSpan={3} className="!text-center border-l border-slate-200">YTD</th>
            <th rowSpan={2} className="align-bottom"></th>
          </tr>
          <tr>
            <th className="!text-right border-l border-slate-200 text-[10px] font-normal text-slate-500">{VERSION_LABELS[version]}</th>
            <th className="!text-right text-[10px] font-normal text-slate-500">Actual</th>
            <th className="!text-right text-[10px] font-normal text-slate-500">% Ach.</th>
            <th className="!text-right border-l border-slate-200 text-[10px] font-normal text-slate-500">{VERSION_LABELS[version]}</th>
            <th className="!text-right text-[10px] font-normal text-slate-500">Actual</th>
            <th className="!text-right text-[10px] font-normal text-slate-500">% Ach.</th>
          </tr>
        </thead>
        <tbody>
          {totals.map((t) => {
            const paMtd = pctAchieved(t.actual, t.budget);
            const paYtd = pctAchieved(t.actualYtd, t.budgetYtd);
            // Functional buckets are all expense categories — lower is better.
            const colorMtd = varianceColor(paMtd, "lower_better");
            const colorYtd = varianceColor(paYtd, "lower_better");
            const open = openFn === t.function;
            const lines = lineByFn[t.function] ?? [];
            return (
              <>
                <tr key={t.function} className={clsx({ "bg-slate-50": open })}>
                  <td className="font-medium text-slate-700">{t.label}</td>
                  <td className="numeric border-l border-slate-100">{formatMINR(t.budget)}</td>
                  <td className="numeric">{formatMINR(t.actual)}</td>
                  <td className={clsx("numeric", colorMtd)}>
                    {paMtd != null ? paMtd.toFixed(1) + "%" : "—"}
                  </td>
                  <td className="numeric border-l border-slate-100">{formatMINR(t.budgetYtd)}</td>
                  <td className="numeric">{formatMINR(t.actualYtd)}</td>
                  <td className={clsx("numeric", colorYtd)}>
                    {paYtd != null ? paYtd.toFixed(1) + "%" : "—"}
                  </td>
                  <td>
                    {lines.length > 0 && (
                      <button
                        className="text-xs text-veolia-600 hover:underline"
                        onClick={() => setOpenFn(open ? null : t.function)}
                      >
                        {open ? "Hide" : "Expand"}
                      </button>
                    )}
                  </td>
                </tr>
                {open && (
                  <tr>
                    <td colSpan={8} className="bg-slate-50 p-0">
                      <div className="p-4">
                        <table className="w-full table-tight text-xs">
                          <thead>
                            <tr>
                              <th>Plant</th>
                              <th>Line Item</th>
                              <th className="!text-right">{VERSION_LABELS[version]}</th>
                              <th className="!text-right">Actual</th>
                              <th className="!text-right">% Ach.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lines.map((l, i) => {
                              const lpa = pctAchieved(l.actual, l.budget);
                              // These are all expense lines — lower is better
                              return (
                                <tr key={i}>
                                  <td className="text-slate-600">{l.plant}</td>
                                  <td className="font-medium text-slate-700">{l.line}</td>
                                  <td className="numeric">{formatMINR(l.budget)}</td>
                                  <td className="numeric">{formatMINR(l.actual)}</td>
                                  <td className={clsx("numeric", varianceColor(lpa, "lower_better"))}>
                                    {lpa != null ? lpa.toFixed(1) + "%" : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Kpi({
  label, cmpLabel, direction, monthLabel,
  mtdBudget, mtdActual, ytdBudget, ytdActual,
}: {
  label: string;
  cmpLabel: string;
  direction: Direction;
  monthLabel: string;
  mtdBudget: number;
  mtdActual: number;
  ytdBudget: number;
  ytdActual: number;
}) {
  const mtdPct = pctAchieved(mtdActual, mtdBudget);
  const ytdPct = pctAchieved(ytdActual, ytdBudget);
  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-[10px] uppercase tracking-wide text-slate-400">in mINR</div>
      </div>

      {/* MTD block */}
      <div className="mt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{monthLabel}</span>
          <span className="text-xl font-semibold text-slate-900">{formatMINR(mtdActual)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
          <span>vs {cmpLabel}: {formatMINR(mtdBudget)}</span>
          <span className={clsx("pill text-[10px]", varianceBg(mtdPct, direction), varianceColor(mtdPct, direction))}>
            {mtdPct != null ? mtdPct.toFixed(1) + "%" : "—"}
          </span>
        </div>
      </div>

      {/* YTD block */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">YTD</span>
          <span className="text-xl font-semibold text-slate-900">{formatMINR(ytdActual)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
          <span>vs {cmpLabel}: {formatMINR(ytdBudget)}</span>
          <span className={clsx("pill text-[10px]", varianceBg(ytdPct, direction), varianceColor(ytdPct, direction))}>
            {ytdPct != null ? ytdPct.toFixed(1) + "%" : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

function PlantNatureDetail({
  plant, version, monthLabel,
}: {
  plant: PlantBlock;
  version: Version;
  monthLabel: string;
}) {
  // Re-order the lines using CATEGORY_ORDER as a guide
  const lines = [...plant.lines].sort((a, b) => {
    const oa = CATEGORY_ORDER.indexOf(a.category);
    const ob = CATEGORY_ORDER.indexOf(b.category);
    return (oa < 0 ? 999 : oa) - (ob < 0 ? 999 : ob);
  });

  const fmt = (v: number | null, isUnit: boolean) =>
    isUnit
      ? v != null ? v.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"
      : formatMINR(v);

  return (
    <div className="p-4">
      <table className="w-full table-tight text-xs">
        <thead>
          <tr>
            <th rowSpan={2} className="align-bottom">Line</th>
            <th colSpan={3} className="!text-center border-l border-slate-200">{monthLabel} (MTD)</th>
            <th colSpan={3} className="!text-center border-l border-slate-200">YTD</th>
            <th rowSpan={2} className="align-bottom">Remarks</th>
          </tr>
          <tr>
            <th className="!text-right border-l border-slate-200">{VERSION_LABELS[version]}</th>
            <th className="!text-right">Actual</th>
            <th className="!text-right">% Ach.</th>
            <th className="!text-right border-l border-slate-200">{VERSION_LABELS[version]}</th>
            <th className="!text-right">Actual</th>
            <th className="!text-right">% Ach.</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => {
            const paMtd = pctAchieved(l.actual, l.budget);
            const paYtd = pctAchieved(l.actualYtd, l.budgetYtd);
            const dir = directionFor(l.category);
            const isSubtotal = [
              "TOTAL_OPEX",
              "PROFIT_BEFORE_MP",
              "TOTAL_STAFF",
              "PROFIT_BEFORE_SGA",
            ].includes(l.category);
            const isGrand = l.category === "EBITDA" || l.category === "EBIT";
            const isUnit = l.category === "VOLUME" || l.category === "RATE";
            return (
              <tr key={i} className={clsx({
                "row-subtotal": isSubtotal && !isGrand,
                "row-grand": isGrand,
              })}>
                <td className="font-medium text-slate-700">{l.name}</td>
                <td className="numeric border-l border-slate-100">{fmt(l.budget, isUnit)}</td>
                <td className="numeric">{fmt(l.actual, isUnit)}</td>
                <td className={clsx("numeric", varianceColor(paMtd, dir))}>
                  {paMtd != null ? paMtd.toFixed(1) + "%" : "—"}
                </td>
                <td className="numeric border-l border-slate-100">{fmt(l.budgetYtd, isUnit)}</td>
                <td className="numeric">{fmt(l.actualYtd, isUnit)}</td>
                <td className={clsx("numeric", varianceColor(paYtd, dir))}>
                  {paYtd != null ? paYtd.toFixed(1) + "%" : "—"}
                </td>
                <td className="text-slate-500">{l.remarks ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
