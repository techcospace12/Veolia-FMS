"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABELS, ROLE_DESC, type Role } from "@/lib/types";
import { useSession } from "@/lib/session";

type PlantOpt = { id: number; name: string };

const ROLES: Role[] = [
  "PLANT_USER",
  "PLANT_HEAD",
  "FINANCE_TEAM",
  "SENIOR_MGMT_1",
  "SENIOR_MGMT_2",
];

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useSession();
  const [role, setRole] = useState<Role>("FINANCE_TEAM");
  const [plantId, setPlantId] = useState<number | null>(null);
  const [plants, setPlants] = useState<PlantOpt[]>([]);

  useEffect(() => {
    fetch("/api/plants")
      .then((r) => r.json())
      .then((data) => {
        setPlants(data);
        if (data[0]) setPlantId(data[0].id);
      });
  }, []);

  const needsPlant = role === "PLANT_USER" || role === "PLANT_HEAD";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPlant = plants.find((p) => p.id === plantId) ?? null;
    setSession({
      role,
      userName: ROLE_LABELS[role],
      plantId: needsPlant ? plantId : null,
      plantName: needsPlant ? selectedPlant?.name ?? null : null,
    });
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-veolia-700 via-veolia-600 to-veolia-500 flex items-center justify-center p-6">
      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-xl bg-white shadow-2xl md:grid-cols-2">
        <div className="hidden bg-veolia-700 p-12 text-white md:flex md:flex-col md:justify-center">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded bg-white text-veolia-700 grid place-items-center text-lg font-bold">
              V
            </div>
            <div>
              <div className="text-xl font-semibold leading-tight">Veolia India</div>
              <div className="text-veolia-100 text-sm">Financial Management System</div>
            </div>
          </div>
          <p className="mt-8 text-sm text-veolia-100">
            Plant data collection, reconciliation, and MBR reporting.
          </p>
        </div>

        <div className="p-10">
          <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">
            Select your role to access the FMS.
          </p>

          <form className="mt-8 space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="label">Role</label>
              <select
                className="select w-full"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">{ROLE_DESC[role]}</p>
            </div>

            {needsPlant && (
              <div>
                <label className="label">Plant</label>
                <select
                  className="select w-full"
                  value={plantId ?? ""}
                  onChange={(e) => setPlantId(Number(e.target.value))}
                >
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 text-xs text-slate-400">
              POC demo — authentication is by role selection only.
            </div>

            <button type="submit" className="btn-primary w-full">
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
