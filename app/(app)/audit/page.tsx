"use client";

import { useEffect, useMemo, useState } from "react";

type AuditRow = {
  id: number;
  userRole: string;
  userName: string | null;
  plantName: string | null;
  action: string;
  details: string | null;
  createdAt: string;
};

const ACTION_COLOR: Record<string, string> = {
  VALUES_SAVED: "bg-slate-100 text-slate-700",
  SUBMITTED_FOR_APPROVAL: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
  ACTUAL_SUBMITTED: "bg-amber-100 text-amber-800",
  ACTUAL_APPROVED: "bg-emerald-100 text-emerald-800",
  BUDGET_LOCKED: "bg-slate-800 text-white",
  LINE_ITEM_ADDED: "bg-veolia-100 text-veolia-700",
  LINE_ITEM_REMOVED: "bg-rose-100 text-rose-800",
  CONSOL_UPDATED: "bg-veolia-100 text-veolia-700",
  CONSOL_UPLOAD: "bg-veolia-100 text-veolia-700",
  SAP_UPLOAD: "bg-veolia-100 text-veolia-700",
  RECON_RESOLVED: "bg-orange-100 text-orange-800",
  RECON_REOPENED: "bg-slate-100 text-slate-700",
  PPT_GENERATED: "bg-emerald-100 text-emerald-800",
};

// Action filter buckets — each bucket maps to one or more underlying action types.
const ACTION_BUCKETS: Record<string, string[]> = {
  "All actions": [],
  "Submitted": ["SUBMITTED_FOR_APPROVAL", "ACTUAL_SUBMITTED"],
  "Approved": ["APPROVED", "ACTUAL_APPROVED"],
  "Rejected": ["REJECTED"],
  "Locked": ["BUDGET_LOCKED"],
  "Saved/Edited": ["VALUES_SAVED", "LINE_ITEM_ADDED", "LINE_ITEM_REMOVED"],
  "Uploaded": ["SAP_UPLOAD", "CONSOL_UPLOAD", "CONSOL_UPDATED"],
  "Reconciliation": ["RECON_RESOLVED", "RECON_REOPENED"],
  "PPT Generated": ["PPT_GENERATED"],
};

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [plantFilter, setPlantFilter] = useState<string>("All plants");
  const [actionFilter, setActionFilter] = useState<string>("All actions");

  useEffect(() => {
    fetch("/api/audit").then((r) => r.json()).then(setRows);
  }, []);

  // Distinct plant names seen in the log (in addition to a global "All plants")
  const plants = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.plantName) set.add(r.plantName);
    return ["All plants", ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (plantFilter !== "All plants" && r.plantName !== plantFilter) return false;
      if (actionFilter !== "All actions") {
        const bucket = ACTION_BUCKETS[actionFilter] ?? [];
        if (!bucket.includes(r.action)) return false;
      }
      return true;
    });
  }, [rows, plantFilter, actionFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit Log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Chronological trail of who did what — supports data governance and traceability.
        </p>
      </div>

      <div className="flex items-end gap-3">
        <div>
          <label className="label">Plant</label>
          <select
            className="select"
            value={plantFilter}
            onChange={(e) => setPlantFilter(e.target.value)}
          >
            {plants.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Action type</label>
          <select
            className="select"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            {Object.keys(ACTION_BUCKETS).map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-500 pb-2">
          Showing {filtered.length} of {rows.length} events
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full table-tight">
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Plant</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400">No events match the current filters.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="text-xs text-slate-500 whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleString("en-IN")}
                </td>
                <td className="text-slate-700">{r.userName ?? r.userRole}</td>
                <td className="text-slate-600">{r.plantName ?? "—"}</td>
                <td>
                  <span className={`pill ${ACTION_COLOR[r.action] ?? "bg-slate-100 text-slate-700"}`}>
                    {r.action}
                  </span>
                </td>
                <td className="text-slate-600">{r.details ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
