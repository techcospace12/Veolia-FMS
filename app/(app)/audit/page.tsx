"use client";

import { useEffect, useState } from "react";

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
  PPT_GENERATED: "bg-emerald-100 text-emerald-800",
};

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);

  useEffect(() => {
    fetch("/api/audit").then((r) => r.json()).then(setRows);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit Log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Chronological trail of who did what — supports data governance and traceability.
        </p>
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
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400">No events.</td></tr>
            )}
            {rows.map((r) => (
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
