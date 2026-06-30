"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { MONTHS, ROLE_LABELS } from "@/lib/types";
import { useSession } from "@/lib/session";
import { formatMINR, formatNumber } from "@/lib/waterfall";

type Recon = {
  year: number;
  month: number;
  fx: number;
  consolidated: Array<{
    entity: string;
    year: number;
    month: number;
    revenue: number | null;
    ebitda: number | null;
    capex: number | null;
    ebit: number | null;
    workingCapital: number | null;
  }>;
  reconciliation: Array<{
    entity: string;
    plants: Array<{
      plantName: string;
      revenueMINR: number | null;
      ebitdaMINR: number | null;
      capexMINR: number | null;
      ebitMINR: number | null;
      wcMINR: number | null;
    }>;
    rows: Array<{
      metric: string;
      plantKEUR: number;
      consolKEUR: number | null;
      diff: number | null;
      pct: number;
      status: "MATCH" | "MINOR" | "MISMATCH" | "MISSING" | "RESOLVED";
      resolution: { remarks: string; resolvedBy: string | null; resolvedAt: string } | null;
    }>;
  }>;
};

export default function ReconciliationPage() {
  const session = useSession();
  const [month, setMonth] = useState(1);
  const [data, setData] = useState<Recon | null>(null);
  const [fxInput, setFxInput] = useState("90");
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});

  const load = useCallback(() => {
    fetch(`/api/reconciliation?year=2026&month=${month}`)
      .then((r) => r.json())
      .then((d: Recon) => {
        setData(d);
        setFxInput(String(d.fx));
        setEdits({});
      });
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const onChangeConsol = (entity: string, field: string, v: string) => {
    setEdits((e) => ({ ...e, [entity]: { ...(e[entity] ?? {}), [field]: v } }));
  };

  const saveEntity = async (entity: string) => {
    const editsForEntity = edits[entity] ?? {};
    const existing = data?.consolidated.find((c) => c.entity === entity);
    const num = (k: string) =>
      editsForEntity[k] !== undefined
        ? editsForEntity[k] === "" ? null : Number(editsForEntity[k])
        : (existing as unknown as Record<string, number | null>)?.[k] ?? null;
    await fetch("/api/consolidated", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity,
        year: 2026,
        month,
        revenue: num("revenue"),
        ebitda: num("ebitda"),
        capex: num("capex"),
        ebit: num("ebit"),
        workingCapital: num("workingCapital"),
        fxRate: Number(fxInput),
        userRole: ROLE_LABELS[session.role!] ?? "Unknown",
        userName: session.userName,
      }),
    });
    load();
  };

  const statusBadge = (s: string) => {
    if (s === "MATCH") return "bg-emerald-100 text-emerald-800";
    if (s === "MINOR") return "bg-amber-100 text-amber-800";
    if (s === "MISMATCH") return "bg-rose-100 text-rose-800";
    if (s === "RESOLVED") return "bg-orange-100 text-orange-800";
    return "bg-slate-100 text-slate-600";
  };
  const statusLabel = (s: string) =>
    s === "MATCH" ? "Match"
      : s === "MINOR" ? "Minor diff"
      : s === "MISMATCH" ? "Mismatch"
      : s === "RESOLVED" ? "Resolved"
      : "Missing";

  const [resolveEdits, setResolveEdits] = useState<Record<string, string>>({});
  const keyFor = (entity: string, metric: string) => `${entity}::${metric}`;

  const saveResolution = async (entity: string, metric: string) => {
    const k = keyFor(entity, metric);
    const remarks = resolveEdits[k]?.trim();
    if (!remarks) return;
    await fetch("/api/reconciliation/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity, year: 2026, month, metric, remarks,
        userRole: ROLE_LABELS[session.role!] ?? "Unknown",
        userName: session.userName,
      }),
    });
    setResolveEdits((e) => { const next = { ...e }; delete next[k]; return next; });
    load();
  };

  const reopen = async (entity: string, metric: string) => {
    await fetch("/api/reconciliation/resolve", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity, year: 2026, month, metric,
        userRole: ROLE_LABELS[session.role!] ?? "Unknown",
        userName: session.userName,
      }),
    });
    load();
  };

  // Entry mode toggle + mocked consolidated-file upload
  const [entryMode, setEntryMode] = useState<"upload" | "manual">("upload");
  const [uploadState, setUploadState] = useState<"idle" | "processing" | "done">("idle");
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const consolFileInput = useRef<HTMLInputElement>(null);

  const onUploadConsolidated = async (file: File) => {
    setUploadFileName(file.name);
    setUploadState("processing");
    setUploadToast(null);
    await new Promise((r) => setTimeout(r, 2000));
    // The seed already contains the consolidated values for the demo. Just refresh
    // so they're visible, and write an audit row to record the "upload".
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userRole: ROLE_LABELS[session.role!] ?? "Unknown",
        userName: session.userName,
        action: "CONSOL_UPLOAD",
        details: `Auto-populated consolidated values for ${MONTHS[month-1]} 2026 from ${file.name}`,
      }),
    });
    const entityCount = data?.reconciliation.length ?? 0;
    setUploadState("done");
    setUploadToast(`Consolidated values populated for ${entityCount} entities. Mismatches are flagged below.`);
    load();
    if (consolFileInput.current) consolFileInput.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reconciliation</h1>
          <p className="mt-1 text-sm text-slate-500">
            Plant totals (rolled up by legal entity, converted to kEUR) compared against the consolidated upload.
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
            <label className="label">FX Rate (INR / EUR)</label>
            <input
              className="input w-32"
              type="number"
              step="0.01"
              value={fxInput}
              onChange={(e) => setFxInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Upload bar + mode toggle */}
      <div className="rounded-md border border-veolia-200 bg-veolia-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-veolia-800">
                Consolidated entity data
              </div>
              <div className="inline-flex rounded-md border border-veolia-200 bg-white p-0.5 text-[10px]">
                <button
                  onClick={() => setEntryMode("upload")}
                  className={clsx("px-2 py-0.5 rounded", entryMode === "upload" ? "bg-veolia-600 text-white" : "text-veolia-700")}
                >
                  Upload file
                </button>
                <button
                  onClick={() => setEntryMode("manual")}
                  className={clsx("px-2 py-0.5 rounded", entryMode === "manual" ? "bg-veolia-600 text-white" : "text-veolia-700")}
                >
                  Manual entry
                </button>
              </div>
            </div>
            <div className="text-xs text-veolia-700 mt-0.5">
              {entryMode === "upload"
                ? "Upload the Vector / consolidation export. Values are auto-populated and compared against the plant rollups."
                : "Type the consolidated kEUR values for each entity directly."}
            </div>
          </div>
          {entryMode === "upload" && (
            <div className="shrink-0 flex items-center gap-2">
              <input
                ref={consolFileInput}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadConsolidated(f);
                }}
              />
              {uploadState === "processing" ? (
                <div className="flex items-center gap-2 text-sm text-veolia-800">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Processing {uploadFileName ?? ""}…
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={() => consolFileInput.current?.click()}
                >
                  Upload Consolidated Data
                </button>
              )}
            </div>
          )}
        </div>
        {uploadToast && uploadState === "done" && (
          <div className="mt-3 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            ✓ {uploadToast}
          </div>
        )}
      </div>

      {data?.reconciliation.map((rec) => {
        const editsRow = edits[rec.entity] ?? {};
        const existing = data.consolidated.find((c) => c.entity === rec.entity);
        const v = (k: string) =>
          editsRow[k] !== undefined
            ? editsRow[k]
            : (existing as unknown as Record<string, number | null> | undefined)?.[k] ?? "";

        return (
          <div className="card" key={rec.entity}>
            <div className="card-header flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-700">Entity: {rec.entity}</div>
                <div className="text-xs text-slate-500">
                  Plants: {rec.plants.map((p) => p.plantName).join(", ")}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Plant rollup */}
              <div className="p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Plant Rollup (mINR)
                </div>
                <table className="w-full table-tight text-xs">
                  <thead>
                    <tr>
                      <th>Plant</th>
                      <th className="!text-right">Revenue</th>
                      <th className="!text-right">EBITDA</th>
                      <th className="!text-right">EBIT</th>
                      <th className="!text-right">CapEx</th>
                      <th className="!text-right">WC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rec.plants.map((p) => (
                      <tr key={p.plantName}>
                        <td>{p.plantName}</td>
                        <td className="numeric">{formatMINR(p.revenueMINR)}</td>
                        <td className="numeric">{formatMINR(p.ebitdaMINR)}</td>
                        <td className="numeric">{formatMINR(p.ebitMINR)}</td>
                        <td className="numeric">{formatMINR(p.capexMINR)}</td>
                        <td className="numeric">{formatMINR(p.wcMINR)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Consolidated input — only in manual mode */}
              {entryMode === "manual" ? (
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Consolidated Values (kEUR)
                    </div>
                    <button className="btn-secondary text-xs px-3 py-1" onClick={() => saveEntity(rec.entity)}>
                      Save
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {([
                      ["revenue", "Revenue"],
                      ["ebitda", "EBITDA"],
                      ["ebit", "EBIT"],
                      ["capex", "CapEx"],
                      ["workingCapital", "Working Capital"],
                    ] as const).map(([k, label]) => (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <label className="text-slate-600">{label}</label>
                        <input
                          className="input-sm w-28"
                          type="number"
                          step="0.01"
                          value={v(k) as string | number}
                          onChange={(e) => onChangeConsol(rec.entity, k, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Consolidated Values (kEUR) — from uploaded file
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {([
                      ["revenue", "Revenue"],
                      ["ebitda", "EBITDA"],
                      ["ebit", "EBIT"],
                      ["capex", "CapEx"],
                      ["workingCapital", "Working Capital"],
                    ] as const).map(([k, label]) => {
                      const val = (existing as unknown as Record<string, number | null> | undefined)?.[k];
                      return (
                        <div key={k} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                          <label className="text-slate-600">{label}</label>
                          <span className="font-medium text-slate-800">
                            {val != null ? formatNumber(val, 1) : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200">
              <table className="w-full table-tight text-xs">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="!text-right">Plant Total (kEUR)</th>
                    <th className="!text-right">Consolidated (kEUR)</th>
                    <th className="!text-right">Difference</th>
                    <th className="!text-right">%</th>
                    <th>Status</th>
                    <th>Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {rec.rows.map((r) => {
                    const k = keyFor(rec.entity, r.metric);
                    const draft = resolveEdits[k];
                    const showInput = draft !== undefined;
                    return (
                      <>
                        <tr key={r.metric}>
                          <td className="font-medium text-slate-700">{r.metric}</td>
                          <td className="numeric">{formatNumber(r.plantKEUR, 1)}</td>
                          <td className="numeric">{r.consolKEUR != null ? formatNumber(r.consolKEUR, 1) : "—"}</td>
                          <td className="numeric">{r.diff != null ? formatNumber(r.diff, 1) : "—"}</td>
                          <td className="numeric">{r.consolKEUR != null ? r.pct.toFixed(1) + "%" : "—"}</td>
                          <td>
                            <span className={clsx("pill", statusBadge(r.status))}>
                              {statusLabel(r.status)}
                            </span>
                          </td>
                          <td>
                            {r.status === "MISMATCH" && !showInput && (
                              <button
                                className="text-xs text-rose-700 hover:underline"
                                onClick={() => setResolveEdits((e) => ({ ...e, [k]: "" }))}
                              >
                                Add resolution
                              </button>
                            )}
                            {r.status === "RESOLVED" && r.resolution && (
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-orange-800 italic">
                                  &ldquo;{r.resolution.remarks}&rdquo;
                                </span>
                                <button
                                  className="text-[10px] text-slate-500 hover:underline"
                                  onClick={() => reopen(rec.entity, r.metric)}
                                  title="Re-open this mismatch"
                                >
                                  re-open
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {showInput && (
                          <tr key={`${r.metric}-resolve`}>
                            <td colSpan={7} className="bg-orange-50 px-4 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-orange-900 whitespace-nowrap">
                                  Resolution for {r.metric}:
                                </span>
                                <input
                                  className="input flex-1"
                                  placeholder="e.g. Intercompany elimination not yet posted at group; awaiting Paris adjustment"
                                  value={draft}
                                  onChange={(e) => setResolveEdits((s) => ({ ...s, [k]: e.target.value }))}
                                  autoFocus
                                />
                                <button
                                  className="btn-primary text-xs"
                                  onClick={() => saveResolution(rec.entity, r.metric)}
                                  disabled={!draft.trim()}
                                >
                                  Mark resolved
                                </button>
                                <button
                                  className="btn-secondary text-xs"
                                  onClick={() => setResolveEdits((e) => { const next = { ...e }; delete next[k]; return next; })}
                                >
                                  Cancel
                                </button>
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
          </div>
        );
      })}
    </div>
  );
}
