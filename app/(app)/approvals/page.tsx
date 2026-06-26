"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  MONTHS,
  ROLE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  VERSION_LABELS,
  type Status,
  type Version,
} from "@/lib/types";
import { useSession, canApprove } from "@/lib/session";
import { computeWaterfall, formatMINR, pctAchieved, variance, varianceColor, directionFor } from "@/lib/waterfall";

type Sub = {
  id: number;
  plantId: number;
  year: number;
  month: number;
  version: Version;
  status: Status;
  submittedBy: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  plant: { name: string; entity: string; business: string; volumeUnit: string; rateUnit: string; revenueFactor: number };
};

export default function ApprovalsPage() {
  const session = useSession();
  const [filter, setFilter] = useState<"PENDING" | "ALL" | "APPROVED" | "REJECTED">("PENDING");
  const [subs, setSubs] = useState<Sub[]>([]);
  const [reasonFor, setReasonFor] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(() => {
    const url = filter === "ALL" ? "/api/submissions" : `/api/submissions?status=${filter}`;
    fetch(url).then((r) => r.json()).then(setSubs);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const act = async (s: Sub, action: "APPROVE" | "REJECT", reason?: string) => {
    await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plantId: s.plantId,
        year: s.year,
        month: s.month,
        version: s.version,
        action, reason,
        userRole: ROLE_LABELS[session.role!] ?? "Unknown",
        userName: session.userName,
      }),
    });
    setReasonFor(null);
    setReason("");
    setExpandedId(null);
    load();
  };

  const allowApprove = canApprove(session.role);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Approvals</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review the full P&amp;L before approving — click <em>View</em> to inspect the submitted data.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
          {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((f) => (
            <button
              key={f}
              className={clsx("px-3 py-1 rounded", filter === f ? "bg-white shadow text-veolia-700" : "text-slate-500")}
              onClick={() => setFilter(f)}
            >
              {f === "ALL" ? "All" : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full table-tight">
          <thead>
            <tr>
              <th>Plant</th>
              <th>Entity</th>
              <th>Period</th>
              <th>Version</th>
              <th>Submitted by</th>
              <th>Submitted at</th>
              <th>Status</th>
              <th className="!text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-slate-400">No submissions.</td></tr>
            )}
            {subs.map((s) => {
              const open = expandedId === s.id;
              return (
                <>
                  <tr key={s.id} className={clsx({ "bg-slate-50": open })}>
                    <td className="font-medium text-slate-700">{s.plant.name}</td>
                    <td className="text-slate-600">{s.plant.entity}</td>
                    <td>{MONTHS[s.month-1]} {s.year}</td>
                    <td>{VERSION_LABELS[s.version]}</td>
                    <td className="text-slate-600">{s.submittedBy ?? "—"}</td>
                    <td className="text-slate-500 text-xs">
                      {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td>
                      <span className={clsx("pill", STATUS_COLORS[s.status])}>
                        {STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          className="text-xs text-veolia-700 hover:underline"
                          onClick={() => {
                            setExpandedId(open ? null : s.id);
                            setReasonFor(null);
                          }}
                        >
                          {open ? "Hide" : "View"}
                        </button>
                        {allowApprove && s.status === "PENDING" && (
                          <>
                            <button
                              className="text-xs text-emerald-700 hover:underline"
                              onClick={() => act(s, "APPROVE")}
                            >
                              Approve
                            </button>
                            <button
                              className="text-xs text-rose-700 hover:underline"
                              onClick={() => { setExpandedId(s.id); setReasonFor(s.id); }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Rejection reason input */}
                  {reasonFor === s.id && (
                    <tr key={`reason-${s.id}`}>
                      <td colSpan={8} className="bg-rose-50 border-y border-rose-100 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-rose-800">Rejection reason:</span>
                          <input
                            className="input flex-1"
                            placeholder="e.g. R&R spend looks high, please re-confirm with site engineer"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            autoFocus
                          />
                          <button className="btn-danger" onClick={() => act(s, "REJECT", reason)}>Send back</button>
                          <button className="btn-secondary" onClick={() => { setReasonFor(null); setReason(""); }}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Expanded P&L viewer */}
                  {open && (
                    <tr key={`detail-${s.id}`}>
                      <td colSpan={8} className="bg-slate-50 p-0">
                        <SubmissionDetail
                          sub={s}
                          canDecide={allowApprove && s.status === "PENDING"}
                          onApprove={() => act(s, "APPROVE")}
                          onRequestReject={() => setReasonFor(s.id)}
                        />
                      </td>
                    </tr>
                  )}

                  {/* Show rejection history at bottom of row */}
                  {!open && s.status === "REJECTED" && s.rejectionReason && (
                    <tr key={`hist-${s.id}`}>
                      <td colSpan={8} className="bg-rose-50 px-4 py-2 text-xs text-rose-800">
                        <strong>Rejection reason:</strong> {s.rejectionReason}
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
}

// ============= Read-only P&L detail =============

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
  plant: Sub["plant"];
  items: ItemRow[];
};

function SubmissionDetail({
  sub, canDecide, onApprove, onRequestReject,
}: {
  sub: Sub;
  canDecide: boolean;
  onApprove: () => void;
  onRequestReject: () => void;
}) {
  const [data, setData] = useState<LoadedData | null>(null);

  useEffect(() => {
    fetch(`/api/plants/${sub.plantId}/data?year=${sub.year}&month=${sub.month}&version=${sub.version}`)
      .then((r) => r.json())
      .then(setData);
  }, [sub.plantId, sub.year, sub.month, sub.version]);

  // Compute the waterfall (with calculated subtotals) for both Budget and selected version
  const { selectedRows, budgetRows } = useMemo(() => {
    if (!data) return { selectedRows: [], budgetRows: [] };
    const toRaw = (which: "sel" | "bud") =>
      data.items.map((it) => ({
        id: it.id,
        order: it.order,
        name: it.name,
        category: it.category,
        function: it.function,
        isCalculated: it.isCalculated,
        isRemovable: it.isRemovable,
        storedValue: which === "sel" ? it.selected : it.budget,
        remarks: it.remarks,
      }));
    return {
      selectedRows: computeWaterfall(toRaw("sel"), data.plant.revenueFactor),
      budgetRows: computeWaterfall(toRaw("bud"), data.plant.revenueFactor),
    };
  }, [data]);

  const isBudget = sub.version === "BUDGET";

  if (!data) {
    return <div className="p-6 text-sm text-slate-500">Loading P&amp;L…</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-700">
            {data.plant.name} · {VERSION_LABELS[sub.version]} · {MONTHS[sub.month-1]} {sub.year}
          </div>
          <div className="text-xs text-slate-500">
            Read-only view · all amounts in mINR
          </div>
        </div>
        {canDecide && (
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-sm" onClick={onRequestReject}>
              Reject with comments
            </button>
            <button className="btn-primary text-sm" onClick={onApprove}>
              Approve this submission
            </button>
          </div>
        )}
      </div>

      <div className="rounded-md border border-slate-200 bg-white">
        <table className="w-full table-tight text-xs">
          <thead>
            <tr>
              <th className="w-[32%]">Line Item</th>
              <th className="w-[10%]">Function</th>
              {!isBudget && <th className="w-[12%] !text-right">Budget</th>}
              <th className="w-[12%] !text-right">{VERSION_LABELS[sub.version]}</th>
              {!isBudget && <th className="w-[10%] !text-right">% Ach.</th>}
              {!isBudget && <th className="w-[12%] !text-right">Variance</th>}
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {selectedRows.map((row, idx) => {
              const bud = budgetRows[idx];
              const pa = !isBudget ? pctAchieved(row.value, bud?.value ?? null) : null;
              const vr = !isBudget ? variance(row.value, bud?.value ?? null) : null;
              const dir = directionFor(row.category);
              const isSubtotal = row.isCalculated;
              const isGrand = row.category === "EBITDA" || row.category === "EBIT";
              const isUnit = row.category === "VOLUME" || row.category === "RATE";
              const item = data.items.find((i) => i.id === row.id);
              return (
                <tr key={row.id} className={clsx({
                  "row-subtotal": isSubtotal && !isGrand,
                  "row-grand": isGrand,
                })}>
                  <td className="font-medium text-slate-700">
                    {row.name}
                    {isUnit && (
                      <span className="ml-1 text-xs text-slate-400">
                        ({row.category === "VOLUME" ? data.plant.volumeUnit : data.plant.rateUnit})
                      </span>
                    )}
                  </td>
                  <td>
                    {row.function && (
                      <span className={clsx(
                        "pill text-[10px]",
                        row.function === "GA" ? "bg-veolia-50 text-veolia-700" : "bg-slate-100 text-slate-600",
                      )}>{row.function}</span>
                    )}
                  </td>
                  {!isBudget && (
                    <td className="numeric text-slate-600">
                      {isUnit
                        ? bud?.value != null ? bud.value.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"
                        : formatMINR(bud?.value)}
                    </td>
                  )}
                  <td className="numeric">
                    <span className={clsx({ "font-semibold": isSubtotal })}>
                      {isUnit
                        ? row.value != null ? row.value.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"
                        : formatMINR(row.value)}
                    </span>
                  </td>
                  {!isBudget && (
                    <td className={clsx("numeric", varianceColor(pa, dir))}>
                      {pa != null ? pa.toFixed(1) + "%" : "—"}
                    </td>
                  )}
                  {!isBudget && (
                    <td className={clsx("numeric", varianceColor(pa, dir))}>
                      {vr != null ? formatMINR(vr, { sign: true }) : "—"}
                    </td>
                  )}
                  <td className="text-slate-500">{item?.remarks ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
