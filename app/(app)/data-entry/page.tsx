"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MONTHS,
  ROLE_LABELS,
  VERSION_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type Version,
  type Status,
} from "@/lib/types";
import { useSession, canApprove } from "@/lib/session";
import {
  computeWaterfall,
  formatMINR,
  pctAchieved,
  variance,
  varianceColor,
  directionFor,
} from "@/lib/waterfall";
import clsx from "clsx";

type Plant = {
  id: number;
  name: string;
  entity: string;
  business: string;
  volumeUnit: string;
  rateUnit: string;
  revenueFactor: number;
};

type ItemRow = {
  id: number;
  order: number;
  name: string;
  category: string;
  function: string | null;
  isCalculated: boolean;
  isRemovable: boolean;
  budget: number | null;
  selected: number | null;
  remarks: string | null;
};

type LoadedData = {
  plant: Plant;
  items: ItemRow[];
  submission: { status: Status };
};

const SECTION_BREAKS: Record<string, string> = {
  OPEX: "Operating Expenses",
  STAFF: "Manpower",
  SGA: "SG&A",
  DEPRECIATION: "Below EBITDA",
  CAPEX: "Cash Flow Items",
};

export default function DataEntryPage() {
  const session = useSession();
  const { role, plantId: sessionPlantId, plantName, userName } = session;

  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantId, setPlantId] = useState<number | null>(null);
  const [year] = useState(2026);
  const [month, setMonth] = useState(1);
  // Plant User only ever works on Budget. Finance Team / leadership see all versions.
  const [version, setVersion] = useState<Version>(
    role === "PLANT_USER" ? "BUDGET" : "ACTUAL",
  );

  // Versions visible in the dropdown depend on role.
  const versionsForRole: Version[] =
    role === "PLANT_USER"
      ? ["BUDGET"]
      : ["BUDGET", "FLASH1", "FORECAST2", "FLASH2", "ACTUAL"];

  // If the role changes such that the current version is no longer visible,
  // snap back to the first allowed version.
  useEffect(() => {
    if (!versionsForRole.includes(version)) {
      setVersion(versionsForRole[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);
  const [data, setData] = useState<LoadedData | null>(null);
  const [edits, setEdits] = useState<Record<number, { value?: string; remarks?: string }>>({});
  const [funcEdits, setFuncEdits] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Add line item modal state
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFunc, setNewFunc] = useState("COS");

  // SAP upload (mocked) state
  const [uploadState, setUploadState] = useState<"idle" | "processing" | "done">("idle");
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load plants
  useEffect(() => {
    fetch("/api/plants").then((r) => r.json()).then((data) => {
      setPlants(data);
      if (sessionPlantId && data.find((p: Plant) => p.id === sessionPlantId)) {
        setPlantId(sessionPlantId);
      } else if (data[0]) {
        setPlantId(data[0].id);
      }
    });
  }, [sessionPlantId]);

  const load = useCallback(() => {
    if (!plantId) return;
    setBusy(true);
    setEdits({});
    setFuncEdits({});
    fetch(`/api/plants/${plantId}/data?year=${year}&month=${month}&version=${version}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setBusy(false));
  }, [plantId, year, month, version]);

  useEffect(() => {
    load();
  }, [load]);

  const status: Status = (data?.submission.status as Status) ?? "DRAFT";
  // Finance Team owns Actuals + all forecast versions; can also adjust Budget
  // after approval if needed. Only fully LOCKED versions are off-limits.
  // Plant User enters Budget for their plant — but only while it's in flight
  // (Draft or Rejected). Once Pending / Approved / Locked it's read-only for them.
  // Plant Head + Senior Mgmt are always read-only.
  const writable: boolean = (() => {
    if (!data) return false;
    if (role === "FINANCE_TEAM") return status !== "LOCKED";
    if (role === "PLANT_USER") {
      return version === "BUDGET" && (status === "DRAFT" || status === "REJECTED");
    }
    return false;
  })();
  const isBudgetEntry = version === "BUDGET";

  // Calculate the waterfall using the edited values
  const computed = useMemo(() => {
    if (!data) return [];
    const items = data.items.map((it) => {
      const editVal = edits[it.id]?.value;
      const stored = editVal !== undefined ? (editVal === "" ? null : Number(editVal)) : it.selected;
      return {
        id: it.id,
        order: it.order,
        name: it.name,
        category: it.category,
        function: funcEdits[it.id] ?? it.function,
        isCalculated: it.isCalculated,
        isRemovable: it.isRemovable,
        storedValue: stored,
        remarks: edits[it.id]?.remarks ?? it.remarks,
      };
    });
    return computeWaterfall(items, data.plant.revenueFactor);
  }, [data, edits, funcEdits]);

  // Budget waterfall is computed from item.budget (stored BUDGET values)
  const computedBudget = useMemo(() => {
    if (!data) return [];
    const items = data.items.map((it) => ({
      id: it.id,
      order: it.order,
      name: it.name,
      category: it.category,
      function: it.function,
      isCalculated: it.isCalculated,
      isRemovable: it.isRemovable,
      storedValue: it.budget,
      remarks: null,
    }));
    return computeWaterfall(items, data.plant.revenueFactor);
  }, [data]);

  if (!data && !busy) {
    return <div className="text-slate-500">No data.</div>;
  }

  const onChangeValue = (id: number, v: string) => {
    setEdits((e) => ({ ...e, [id]: { ...e[id], value: v } }));
  };
  const onChangeRemarks = (id: number, v: string) => {
    setEdits((e) => ({ ...e, [id]: { ...e[id], remarks: v } }));
  };
  const onChangeFunc = (id: number, v: string) => {
    setFuncEdits((e) => ({ ...e, [id]: v }));
  };

  const save = async () => {
    if (!data || !plantId) return;
    setSaving(true);
    setMsg(null);
    const updates: Array<{ lineItemId: number; value: number | null; remarks?: string; functionTag?: string }> = [];
    for (const it of data.items) {
      const e = edits[it.id] ?? {};
      const fnEdit = funcEdits[it.id];
      if (e.value !== undefined || e.remarks !== undefined || fnEdit !== undefined) {
        if (it.isCalculated && e.remarks === undefined && fnEdit === undefined) continue;
        updates.push({
          lineItemId: it.id,
          value: e.value === undefined || it.isCalculated ? it.selected : e.value === "" ? null : Number(e.value),
          remarks: e.remarks ?? it.remarks ?? "",
          functionTag: fnEdit,
        });
      }
    }
    if (updates.length === 0) {
      setMsg("Nothing changed.");
      setSaving(false);
      return;
    }
    const res = await fetch("/api/values", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year, month, version, updates,
        userRole: ROLE_LABELS[role!] ?? "Unknown",
        userName, plantName: data.plant.name,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Saved.");
      load();
    } else {
      setMsg("Save failed.");
    }
  };

  const submitForApproval = async () => {
    if (!data || !plantId) return;
    setSubmitting(true);
    await save();
    await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plantId, year, month, version, action: "SUBMIT",
        userRole: ROLE_LABELS[role!] ?? "Unknown",
        userName,
      }),
    });
    setSubmitting(false);
    setMsg("Submitted for approval.");
    load();
  };

  const approve = async () => {
    if (!data || !plantId) return;
    await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plantId, year, month, version, action: "APPROVE",
        userRole: ROLE_LABELS[role!] ?? "Unknown", userName,
      }),
    });
    load();
  };

  const addLine = async () => {
    if (!plantId || !newName.trim()) return;
    await fetch("/api/line-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plantId, name: newName.trim(), function: newFunc,
        userRole: ROLE_LABELS[role!] ?? "Unknown", userName,
        plantName: data?.plant.name,
      }),
    });
    setNewName("");
    setShowAdd(false);
    load();
  };

  const removeLine = async (id: number) => {
    if (!confirm("Remove this line item across all months/versions?")) return;
    await fetch(`/api/line-items/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userRole: ROLE_LABELS[role!] ?? "Unknown", userName,
        plantName: data?.plant.name,
      }),
    });
    load();
  };

  // Mocked SAP upload — in production this would parse the uploaded XLSX, map GL
  // codes to our P&L categories, and POST the values. For the demo it shows a
  // 2-second processing spinner and the existing seeded actuals stay in place
  // (so users see numbers "appear" in the editable fields).
  const onUploadSap = async (file: File) => {
    setUploadFileName(file.name);
    setUploadState("processing");
    setUploadToast(null);
    // Simulate parsing latency
    await new Promise((r) => setTimeout(r, 2000));
    // Audit-log the (mock) extraction
    if (data) {
      await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRole: ROLE_LABELS[role!] ?? "Unknown",
          userName,
          plantName: data.plant.name,
          action: "SAP_UPLOAD",
          details: `Auto-populated ${MONTHS[month-1]} ${year} Actuals from ${file.name}`,
        }),
      });
    }
    const itemCount = data?.items.filter((i) => !i.isCalculated).length ?? 0;
    setUploadState("done");
    setUploadToast(`${itemCount} line items auto-populated from SAP data. Please review.`);
    load(); // refresh seeded data so values show up in inputs
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Plant Data Entry</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter monthly P&amp;L data across budget, flash forecast and actual versions.
          </p>
        </div>
        {data && (
          <span className={clsx("pill", STATUS_COLORS[status])}>
            {STATUS_LABELS[status]}
          </span>
        )}
      </div>

      {/* Approval flow legend */}
      <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <div className="font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
          Approval flow
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span><strong className="text-slate-800">Budget</strong>: Plant User &rarr; Plant Head approves &rarr; Finance Team can adjust</span>
          <span className="text-slate-300">|</span>
          <span><strong className="text-slate-800">Actual</strong>: Finance Team enters &rarr; Senior Management signs off</span>
          <span className="text-slate-300">|</span>
          <span><strong className="text-slate-800">Flash 1 / Flash 2 / Forecast 2</strong>: Finance Team enters &rarr; Senior Management reviews</span>
        </div>
      </div>

      <div className="card">
        <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="label">Plant</label>
            <select
              className="select w-full"
              value={plantId ?? ""}
              onChange={(e) => setPlantId(Number(e.target.value))}
              disabled={role === "PLANT_USER" || role === "PLANT_HEAD"}
            >
              {plants.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Month</label>
            <select
              className="select w-full"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {[1,2,3].map((m) => (
                <option key={m} value={m}>{MONTHS[m-1]} 2026</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Version</label>
            <select
              className="select w-full"
              value={version}
              onChange={(e) => setVersion(e.target.value as Version)}
              disabled={versionsForRole.length === 1}
            >
              {versionsForRole.map((v) => (
                <option key={v} value={v}>{VERSION_LABELS[v]}</option>
              ))}
            </select>
            {role === "PLANT_USER" && (
              <p className="mt-1 text-[10px] text-slate-500">
                Plant users enter Budget only. Flash &amp; Actuals are managed by Finance.
              </p>
            )}
          </div>
          <div className="flex items-end justify-end gap-2 text-xs text-slate-500">
            {!writable && data && (
              <span>
                {role === "FINANCE_TEAM" || role === "PLANT_USER"
                  ? "Read-only — this version is locked or already approved."
                  : "Read-only access for this role."}
              </span>
            )}
          </div>
        </div>
        {msg && (
          <div className="border-t border-slate-100 px-6 py-3 text-sm text-slate-600">
            {msg}
          </div>
        )}
      </div>

      {/* SAP upload — only visible to Finance Team entering Actuals */}
      {data && role === "FINANCE_TEAM" && version === "ACTUAL" && writable && (
        <div className="rounded-md border border-veolia-200 bg-veolia-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-veolia-800">
                Auto-populate Actuals from SAP
              </div>
              <div className="text-xs text-veolia-700 mt-0.5">
                Upload the monthly SAP trial-balance file. GL codes are mapped to the P&amp;L
                categories and the Actual column is pre-filled for you to review.
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadSap(f);
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
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload SAP Data
                </button>
              )}
            </div>
          </div>
          {uploadToast && uploadState === "done" && (
            <div className="mt-3 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              ✓ {uploadToast}
            </div>
          )}
        </div>
      )}

      {data && (
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-700">
                {data.plant.name} · {data.plant.business}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                Entity {data.plant.entity} · Volume in {data.plant.volumeUnit} · Rate in {data.plant.rateUnit} · Amounts in mINR
              </div>
            </div>
          </div>

          <table className="w-full table-tight">
            <thead>
              <tr>
                <th className="w-[28%]">Line Item</th>
                <th className="w-[8%]">Function</th>
                {!isBudgetEntry && <th className="w-[10%] !text-right">Budget</th>}
                <th className="w-[12%] !text-right">{VERSION_LABELS[version]}</th>
                {!isBudgetEntry && <th className="w-[8%] !text-right">% Ach.</th>}
                {!isBudgetEntry && <th className="w-[10%] !text-right">Variance</th>}
                <th>Remarks</th>
                {writable && <th className="w-[6%]"></th>}
              </tr>
            </thead>
            <tbody>
              {data.items.map((it, idx) => {
                const cBudget = computedBudget[idx];
                const cSel = computed[idx];
                const showBudgetVal = cBudget?.value;
                const showSelVal = cSel?.value;
                const pa = !isBudgetEntry ? pctAchieved(showSelVal, showBudgetVal) : null;
                const vr = !isBudgetEntry ? variance(showSelVal, showBudgetVal) : null;
                const dir = directionFor(it.category);
                const editValue = edits[it.id]?.value;
                const editRemarks = edits[it.id]?.remarks;

                const isSection = SECTION_BREAKS[it.category] && (idx === 0 || data.items[idx-1]?.category !== it.category);
                // Inserting a header row before this row
                const headerRow = isSection && SECTION_BREAKS[it.category];

                const isSubtotal = it.isCalculated;
                const isGrand = it.category === "EBITDA" || it.category === "EBIT";
                const rowClass = clsx({
                  "row-subtotal": isSubtotal && !isGrand,
                  "row-grand": isGrand,
                });

                const isUnitRow = it.category === "VOLUME" || it.category === "RATE";

                // The "Add expense line" trigger row goes right after the LAST OPEX row
                // (i.e. just before the first TOTAL_OPEX subtotal).
                const isLastOpex =
                  it.category === "OPEX" && data.items[idx + 1]?.category !== "OPEX";

                return (
                  <>
                    {headerRow && (
                      <tr key={`hdr-${it.id}`}>
                        <td colSpan={writable ? 8 : 7} className="row-section">{headerRow}</td>
                      </tr>
                    )}
                    <tr key={it.id} className={rowClass}>
                      <td className="font-medium text-slate-700">
                        {it.name}
                        {isUnitRow && (
                          <span className="ml-1 text-xs text-slate-400">
                            ({it.category === "VOLUME" ? data.plant.volumeUnit : data.plant.rateUnit})
                          </span>
                        )}
                      </td>
                      <td>
                        {it.function && (
                          it.category === "OPEX" && writable ? (
                            <select
                              className="select py-1 text-xs"
                              value={funcEdits[it.id] ?? it.function ?? "COS"}
                              onChange={(e) => onChangeFunc(it.id, e.target.value)}
                            >
                              <option value="COS">COS</option>
                              <option value="SELLING">Selling</option>
                              <option value="GA">G&amp;A</option>
                            </select>
                          ) : (
                            <span className={clsx(
                              "pill text-[10px]",
                              (funcEdits[it.id] ?? it.function) === "GA"
                                ? "bg-veolia-50 text-veolia-700"
                                : "bg-slate-100 text-slate-600",
                            )}>
                              {funcEdits[it.id] ?? it.function}
                            </span>
                          )
                        )}
                      </td>
                      {!isBudgetEntry && (
                        <td className="numeric text-slate-600">
                          {isUnitRow
                            ? showBudgetVal != null ? showBudgetVal.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"
                            : formatMINR(showBudgetVal)}
                        </td>
                      )}
                      <td className="numeric">
                        {it.isCalculated || !writable ? (
                          <span className={clsx({ "font-semibold": isSubtotal })}>
                            {isUnitRow
                              ? showSelVal != null ? showSelVal.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"
                              : formatMINR(showSelVal)}
                          </span>
                        ) : (
                          <input
                            className="input-sm w-full"
                            type="number"
                            step={isUnitRow ? "1" : "0.001"}
                            value={editValue !== undefined ? editValue : (it.selected ?? "")}
                            onChange={(e) => onChangeValue(it.id, e.target.value)}
                            placeholder={isUnitRow ? "0" : "0.00"}
                          />
                        )}
                      </td>
                      {!isBudgetEntry && (
                        <td className={clsx("numeric", varianceColor(pa, dir))}>
                          {pa != null ? pa.toFixed(1) + "%" : "—"}
                        </td>
                      )}
                      {!isBudgetEntry && (
                        <td className={clsx("numeric", varianceColor(pa, dir))}>
                          {vr != null ? formatMINR(vr, { sign: true }) : "—"}
                        </td>
                      )}
                      <td>
                        {writable && !it.isCalculated ? (
                          <input
                            className="input-sm w-full text-left"
                            value={editRemarks !== undefined ? editRemarks : (it.remarks ?? "")}
                            onChange={(e) => onChangeRemarks(it.id, e.target.value)}
                            placeholder=""
                          />
                        ) : (
                          <span className="text-xs text-slate-500">{it.remarks ?? ""}</span>
                        )}
                      </td>
                      {writable && (
                        <td>
                          {it.isRemovable && (
                            <button
                              className="text-xs text-rose-600 hover:underline"
                              onClick={() => removeLine(it.id)}
                              title="Remove line"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                    {isLastOpex && writable && (
                      <tr key={`addopex-${it.id}`}>
                        <td colSpan={writable ? 8 : 7} className="border-t border-dashed border-slate-200 bg-slate-50 px-3 py-2">
                          {showAdd ? (
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <label className="label">Expense line name</label>
                                <input
                                  className="input"
                                  placeholder="e.g. Effluent Treatment Chemicals"
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  autoFocus
                                />
                              </div>
                              <div className="w-40">
                                <label className="label">Function</label>
                                <select className="select w-full" value={newFunc} onChange={(e) => setNewFunc(e.target.value)}>
                                  <option value="COS">COS</option>
                                  <option value="SELLING">Selling</option>
                                  <option value="GA">G&amp;A</option>
                                </select>
                              </div>
                              <button className="btn-primary" onClick={addLine}>Add</button>
                              <button className="btn-secondary" onClick={() => { setShowAdd(false); setNewName(""); }}>Cancel</button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="text-xs font-medium text-veolia-700 hover:underline"
                              onClick={() => setShowAdd(true)}
                            >
                              + Add expense line
                            </button>
                          )}
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

      {/* Bottom action bar — always shown when there's data, content varies by status */}
      {data && (
        <div className="card border-t-2 border-t-veolia-600">
          <div className="card-body flex items-center justify-between gap-4">
            <div className="text-sm">
              {status === "DRAFT" && (
                <div className="text-slate-600">
                  Working draft. When ready, submit to <strong className="text-slate-800">{approverFor(version)}</strong> for review.
                </div>
              )}
              {status === "PENDING" && (
                <div className="text-amber-700">
                  Submitted &mdash; waiting for <strong>{approverFor(version)}</strong> to approve.
                  {role === "PLANT_USER" && " You can no longer edit until it's approved or sent back."}
                </div>
              )}
              {status === "APPROVED" && (
                <div className="text-emerald-700">
                  Approved.{role === "FINANCE_TEAM" && " Finance Team can still amend if needed."}
                </div>
              )}
              {status === "REJECTED" && (
                <div className="text-rose-700">
                  Returned with comments. Address the feedback and resubmit to <strong>{approverFor(version)}</strong>.
                </div>
              )}
              {status === "LOCKED" && (
                <div className="text-slate-600">
                  Locked &mdash; this version is finalised and cannot be edited.
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Save Draft — only when editable */}
              <button
                className="btn-secondary"
                onClick={save}
                disabled={!writable || saving}
              >
                {saving ? "Saving…" : "Save Draft"}
              </button>

              {/* Submit for Approval — three visual states */}
              {status === "PENDING" ? (
                <button
                  className="inline-flex items-center justify-center rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-500 cursor-not-allowed"
                  disabled
                  title="Already submitted — waiting for approval"
                >
                  ✓ Submitted to {approverFor(version)}
                </button>
              ) : status === "APPROVED" ? (
                <button
                  className="inline-flex items-center justify-center rounded-md bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700 cursor-not-allowed"
                  disabled
                >
                  ✓ Approved
                </button>
              ) : status === "LOCKED" ? null : (
                <button
                  className="btn-primary"
                  onClick={submitForApproval}
                  disabled={!writable || submitting}
                  title={!writable ? "Not allowed for your role" : ""}
                >
                  {submitting ? "Submitting…" : `Submit to ${approverFor(version)}`}
                </button>
              )}

              {/* Approve — only for approvers when status is PENDING */}
              {status === "PENDING" && canApprove(role) && (
                <button className="btn-primary" onClick={approve}>
                  Approve as {ROLE_LABELS[role!]}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Who approves a submission for a given version?
// Per the agreed flow:
//   BUDGET     → reviewed by Plant Head
//   ACTUAL     → reviewed by Senior Management (final MBR sign-off)
//   FLASH 1/2, FORECAST 2 → Finance-driven revisions, reviewed by Senior Management
function approverFor(version: Version): string {
  if (version === "BUDGET") return "Plant Head";
  return "Senior Management";
}
