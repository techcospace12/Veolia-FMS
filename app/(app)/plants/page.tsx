"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Plant = {
  id: number;
  name: string;
  entity: string;
  business: string;
  volumeUnit: string;
  rateUnit: string;
};

export default function PlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  useEffect(() => {
    fetch("/api/plants").then((r) => r.json()).then(setPlants);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Plants</h1>
        <p className="mt-1 text-sm text-slate-500">
          {plants.length} plants currently configured. POC scope covers 2; the production system supports up to 15.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plants.map((p) => (
          <Link key={p.id} href="/data-entry" className="card hover:border-veolia-300 transition-colors">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{p.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{p.business}</div>
                </div>
                <span className="pill bg-veolia-50 text-veolia-700">{p.entity}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div>
                  <div className="uppercase tracking-wide">Volume unit</div>
                  <div className="text-slate-800 font-medium">{p.volumeUnit}</div>
                </div>
                <div>
                  <div className="uppercase tracking-wide">Rate unit</div>
                  <div className="text-slate-800 font-medium">{p.rateUnit}</div>
                </div>
              </div>
              <div className="mt-4 text-xs text-veolia-700">Enter data →</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
