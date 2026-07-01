"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useSession } from "@/lib/session";
import { MONTHS, ROLE_LABELS } from "@/lib/types";

type Plant = { id: number; name: string };
type ReconStatus = {
  reconciliation: Array<{
    entity: string;
    rows: Array<{ status: "MATCH" | "MINOR" | "MISMATCH" | "MISSING" }>;
  }>;
};

export default function GeneratePPTPage() {
  const session = useSession();
  const isPlantUser = session.role === "PLANT_USER";
  const [month, setMonth] = useState(1);
  // Plant User only sees their own plant PPT; the consolidated MBR is a finance-only artefact.
  const [includeConsolidated, setIncludeConsolidated] = useState(!isPlantUser);
  const [includePlantWise, setIncludePlantWise] = useState(true);
  const [healthSafety, setHealthSafety] = useState(
    "Zero LTI for the month. ZLD plant safety drill conducted Mar 12. Continued PPE compliance audit underway.",
  );
  const [businessContext, setBusinessContext] = useState(
    "Revenue tracking ~6% below budget driven by lower ZLD realisation rate at Ankleshwar. OCW volumes stable; service contract reprofiling pulled spend forward.",
  );
  const [legalUpdate, setLegalUpdate] = useState(
    "No material legal updates. CPCB consent renewal application filed for Dahej (in progress).",
  );

  const [reconStatus, setReconStatus] = useState<ReconStatus | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [generated, setGenerated] = useState(false);

  // For Plant User the list of plants included in the PPT collapses to just their plant.
  const plantsToInclude = isPlantUser
    ? plants.filter((p) => p.id === session.plantId)
    : plants;

  useEffect(() => {
    fetch(`/api/reconciliation?year=2026&month=${month}`)
      .then((r) => r.json())
      .then(setReconStatus);
    fetch("/api/plants").then((r) => r.json()).then(setPlants);
    setGenerated(false);
  }, [month]);

  // Reconciliation considered complete when no MISMATCH
  const reconReady =
    reconStatus?.reconciliation.every((rec) =>
      rec.rows.every((r) => r.status === "MATCH" || r.status === "MINOR" || r.status === "MISSING"),
    ) ?? false;
  const hasMismatch =
    reconStatus?.reconciliation.some((rec) =>
      rec.rows.some((r) => r.status === "MISMATCH"),
    ) ?? false;

  const generate = async () => {
    // Mock — just write an audit row and show success
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userRole: ROLE_LABELS[session.role!] ?? "Unknown",
        userName: session.userName,
        action: "PPT_GENERATED",
        details: `Generated ${MONTHS[month-1]} 2026 MBR (consolidated: ${includeConsolidated}, plant-wise: ${includePlantWise})`,
      }),
    });
    setGenerated(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Generate MBR PPT</h1>
        <p className="mt-1 text-sm text-slate-500">
          Combine reconciled financials with narrative commentary into the standard 38-slide MBR deck.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700">Reconciliation status</div>
              <div className="flex items-center gap-2">
                <label className="label !mb-0">Month</label>
                <select className="select py-1" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {[1,2,3].map((m) => <option key={m} value={m}>{MONTHS[m-1]} 2026</option>)}
                </select>
              </div>
            </div>
            <div className="card-body">
              {hasMismatch ? (
                <div className="rounded-md bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800">
                  <strong>Reconciliation incomplete.</strong> One or more entity totals diverge from
                  the consolidated upload. Resolve mismatches on the Reconciliation page before
                  generating the MBR.
                </div>
              ) : (
                <div className="rounded-md bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
                  <strong>All entities reconciled.</strong> You can proceed to generate the {MONTHS[month-1]} 2026 MBR.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header text-sm font-semibold text-slate-700">Commentary inputs</div>
            <div className="card-body space-y-4">
              <div>
                <label className="label">Health &amp; Safety update</label>
                <textarea
                  className="input min-h-[70px]"
                  value={healthSafety}
                  onChange={(e) => setHealthSafety(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Business context &amp; key highlights</label>
                <textarea
                  className="input min-h-[90px]"
                  value={businessContext}
                  onChange={(e) => setBusinessContext(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Legal updates</label>
                <textarea
                  className="input min-h-[70px]"
                  value={legalUpdate}
                  onChange={(e) => setLegalUpdate(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500">
                AI-generated commentary will draft the executive summary and variance notes — these
                manual inputs add the narrative the AI doesn't have context for.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header text-sm font-semibold text-slate-700">Output</div>
            <div className="card-body space-y-3 text-sm">
              {/* Consolidated MBR is a finance-team artefact — hidden for Plant Users */}
              {!isPlantUser && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={includeConsolidated}
                    onChange={(e) => setIncludeConsolidated(e.target.checked)}
                  />
                  Consolidated MBR PPT
                  <span className="ml-1 text-xs text-slate-400">(38 slides)</span>
                </label>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={includePlantWise}
                  onChange={(e) => setIncludePlantWise(e.target.checked)}
                />
                {isPlantUser ? `Plant PPT — ${session.plantName ?? "your plant"}` : "Plant-wise PPTs"}
                {!isPlantUser && (
                  <span className="ml-1 text-xs text-slate-400">({plantsToInclude.length} files)</span>
                )}
              </label>
              <button
                className="btn-primary w-full mt-2"
                onClick={generate}
                disabled={hasMismatch}
              >
                Generate PPT
              </button>
              {hasMismatch && (
                <p className="text-xs text-rose-600 mt-2">
                  Cannot generate while reconciliation has mismatches.
                </p>
              )}
            </div>
          </div>

          {generated && (
            <div className="card border-emerald-300 bg-emerald-50">
              <div className="card-body">
                <div className="text-sm font-semibold text-emerald-800">
                  PPT generated successfully
                </div>
                <p className="mt-1 text-xs text-emerald-700">
                  Demo only — files are mocked.
                </p>
                <div className="mt-3 space-y-2">
                  {includeConsolidated && !isPlantUser && (
                    <a className="block rounded border border-emerald-300 bg-white px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-100" href="#" onClick={(e) => e.preventDefault()}>
                      📄 Consolidated MBR - {MONTHS[month-1]} 2026.pptx
                    </a>
                  )}
                  {includePlantWise && plantsToInclude.map((p) => (
                    <a key={p.id} className="block rounded border border-emerald-300 bg-white px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-100" href="#" onClick={(e) => e.preventDefault()}>
                      📄 {p.name} - {MONTHS[month-1]} 2026.pptx
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
