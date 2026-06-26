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
type Summary = {
  revenue: { budget: number | null; actual: number | null };
  opex: { budget: number | null; actual: number | null };
  ebitda: { budget: number | null; actual: number | null };
  ebit: { budget: number | null; actual: number | null };
  capex: { budget: number | null; actual: number | null };
};
type Line = {
  name: string;
  category: string;
  function: string | null;
  budget: number | null;
  actual: number | null;
  remarks: string | null;
};
type Functional = { function: string; budget: number; actual: number };
type PlantBlock = {
  plant: Plant;
  summary: Summary;
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

  // Aggregates across plants
  const totals = useMemo(() => {
    if (!data) return null;
    const agg = {
      revenue: { budget: 0, actual: 0 },
      ebitda: { budget: 0, actual: 0 },
      ebit: { budget: 0, actual: 0 },
      capex: { budget: 0, actual: 0 },
    };
    for (const p of data.plants) {
      for (const k of ["revenue", "ebitda", "ebit", "capex"] as const) {
        agg[k].budget += p.summary[k].budget ?? 0;
        agg[k].actual += p.summary[k].actual ?? 0;
      }
    }
    return agg;
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

      {/* Top KPI cards */}
      {totals && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Kpi label="Revenue" budget={totals.revenue.budget} actual={totals.revenue.actual} cmpLabel={VERSION_LABELS[version]} direction="higher_better" />
          <Kpi label="EBITDA" budget={totals.ebitda.budget} actual={totals.ebitda.actual} cmpLabel={VERSION_LABELS[version]} direction="higher_better" />
          <Kpi label="EBIT" budget={totals.ebit.budget} actual={totals.ebit.actual} cmpLabel={VERSION_LABELS[version]} direction="higher_better" />
          <Kpi label="CapEx" budget={totals.capex.budget} actual={totals.capex.actual} cmpLabel={VERSION_LABELS[version]} direction="lower_better" />
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
        <div className="card">
          <table className="w-full table-tight">
            <thead>
              <tr>
                <th>Plant</th>
                <th>Entity</th>
                <th className="!text-right">Revenue {VERSION_LABELS[version]}</th>
                <th className="!text-right">Revenue Actual</th>
                <th className="!text-right">EBITDA {VERSION_LABELS[version]}</th>
                <th className="!text-right">EBITDA Actual</th>
                <th className="!text-right">% Ach. vs {VERSION_LABELS[version]}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.plants.map((p) => {
                // EBITDA is "higher is better" — beat budget = green
                const ebitdaPct = pctAchieved(p.summary.ebitda.actual, p.summary.ebitda.budget);
                const ebitdaColor = varianceColor(ebitdaPct, "higher_better");
                const open = expanded === p.plant.id;
                return (
                  <>
                    <tr key={p.plant.id} className={clsx({ "bg-slate-50": open })}>
                      <td className="font-medium text-slate-700">{p.plant.name}</td>
                      <td className="text-slate-600">{p.plant.entity}</td>
                      <td className="numeric">{formatMINR(p.summary.revenue.budget)}</td>
                      <td className="numeric">{formatMINR(p.summary.revenue.actual)}</td>
                      <td className="numeric">{formatMINR(p.summary.ebitda.budget)}</td>
                      <td className="numeric">{formatMINR(p.summary.ebitda.actual)}</td>
                      <td className={clsx("numeric", ebitdaColor)}>
                        {ebitdaPct != null ? ebitdaPct.toFixed(1) + "%" : "—"}
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
                        <td colSpan={8} className="bg-slate-50 p-0">
                          <PlantNatureDetail plant={p} version={version} />
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

      {view === "function" && data && <FunctionalView plants={data.plants} version={version} />}
    </div>
  );
}

function FunctionalView({
  plants, version,
}: {
  plants: PlantBlock[];
  version: Version;
}) {
  const [openFn, setOpenFn] = useState<string | null>(null);

  // Aggregate across all plants by function
  const totals = useMemo(() => {
    return FUNCTIONS.map((f) => {
      let budget = 0;
      let actual = 0;
      const breakdown: Array<{ plant: string; budget: number; actual: number }> = [];
      for (const p of plants) {
        const fn = p.functional.find((x) => x.function === f.key);
        if (!fn) continue;
        budget += fn.budget;
        actual += fn.actual;
        breakdown.push({ plant: p.plant.name, budget: fn.budget, actual: fn.actual });
      }
      return { function: f.key, label: f.label, short: f.short, budget, actual, breakdown };
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
    <div className="card">
      <table className="w-full table-tight">
        <thead>
          <tr>
            <th>Function</th>
            <th className="!text-right">{VERSION_LABELS[version]}</th>
            <th className="!text-right">Actual</th>
            <th className="!text-right">Variance</th>
            <th className="!text-right">% Ach. vs {VERSION_LABELS[version]}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {totals.map((t) => {
            const pa = pctAchieved(t.actual, t.budget);
            const v = variance(t.actual, t.budget);
            // Functional buckets are all expense categories — lower is better.
            const color = varianceColor(pa, "lower_better");
            const open = openFn === t.function;
            const lines = lineByFn[t.function] ?? [];
            return (
              <>
                <tr key={t.function} className={clsx({ "bg-slate-50": open })}>
                  <td className="font-medium text-slate-700">{t.label}</td>
                  <td className="numeric">{formatMINR(t.budget)}</td>
                  <td className="numeric">{formatMINR(t.actual)}</td>
                  <td className={clsx("numeric", color)}>
                    {v != null ? formatMINR(v, { sign: true }) : "—"}
                  </td>
                  <td className={clsx("numeric", color)}>
                    {pa != null ? pa.toFixed(1) + "%" : "—"}
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
                    <td colSpan={6} className="bg-slate-50 p-0">
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
  label, budget, actual, cmpLabel, direction,
}: {
  label: string;
  budget: number;
  actual: number;
  cmpLabel: string;
  direction: Direction;
}) {
  const pct = pctAchieved(actual, budget);
  const v = variance(actual, budget);
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">
        {formatMINR(actual)} <span className="text-sm font-normal text-slate-400">mINR</span>
      </div>
      <div className="mt-1 text-xs text-slate-500">
        vs {cmpLabel}: {formatMINR(budget)} mINR
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className={clsx("pill", varianceBg(pct, direction), varianceColor(pct, direction))}>
          {pct != null ? pct.toFixed(1) + "%" : "—"}
        </span>
        <span className="text-xs text-slate-500">
          {v != null ? (v >= 0 ? "+" : "") + v.toFixed(1) + " mINR" : "—"}
        </span>
      </div>
    </div>
  );
}

function PlantNatureDetail({
  plant, version,
}: {
  plant: PlantBlock;
  version: Version;
}) {
  // Re-order the lines using CATEGORY_ORDER as a guide
  const lines = [...plant.lines].sort((a, b) => {
    const oa = CATEGORY_ORDER.indexOf(a.category);
    const ob = CATEGORY_ORDER.indexOf(b.category);
    return (oa < 0 ? 999 : oa) - (ob < 0 ? 999 : ob);
  });

  return (
    <div className="p-4">
      <table className="w-full table-tight text-xs">
        <thead>
          <tr>
            <th>Line</th>
            <th className="!text-right">{VERSION_LABELS[version]}</th>
            <th className="!text-right">Actual</th>
            <th className="!text-right">% Ach. vs {VERSION_LABELS[version]}</th>
            <th className="!text-right">Variance</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => {
            const pa = pctAchieved(l.actual, l.budget);
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
                <td className="numeric">
                  {isUnit ? l.budget?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "—" : formatMINR(l.budget)}
                </td>
                <td className="numeric">
                  {isUnit ? l.actual?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "—" : formatMINR(l.actual)}
                </td>
                <td className={clsx("numeric", varianceColor(pa, dir))}>
                  {pa != null ? pa.toFixed(1) + "%" : "—"}
                </td>
                <td className={clsx("numeric", varianceColor(pa, dir))}>
                  {l.actual != null && l.budget != null ? formatMINR(l.actual - l.budget, { sign: true }) : "—"}
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
