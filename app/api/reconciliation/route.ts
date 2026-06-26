import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { computeWaterfall } from "@/lib/waterfall";

// GET: returns reconciliation for the given month.
// Plant-level metrics are summed per entity, converted to kEUR, and compared
// against consolidated entries.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? 2026);
  const month = Number(url.searchParams.get("month") ?? 1);

  const [plants, consol, settings, resolutions] = await Promise.all([
    prisma.plant.findMany({
      orderBy: { id: "asc" },
      include: {
        lineItems: {
          orderBy: { order: "asc" },
          include: {
            values: {
              where: { year, month, version: "ACTUAL" },
            },
          },
        },
      },
    }),
    prisma.consolidatedData.findMany({ where: { year, month } }),
    prisma.settings.findFirst(),
    prisma.reconResolution.findMany({ where: { year, month } }),
  ]);

  const fx = settings?.fxRateInrPerEur ?? 90;

  type PlantTotals = {
    plantId: number;
    plantName: string;
    entity: string;
    revenueMINR: number | null;
    ebitdaMINR: number | null;
    capexMINR: number | null;
    ebitMINR: number | null;
    wcMINR: number | null;
  };

  const perPlant: PlantTotals[] = plants.map((p) => {
    const raw = p.lineItems.map((li) => ({
      id: li.id,
      order: li.order,
      name: li.name,
      category: li.category,
      function: li.function,
      isCalculated: li.isCalculated,
      isRemovable: li.isRemovable,
      storedValue: li.values[0]?.value ?? null,
      remarks: li.values[0]?.remarks ?? null,
    }));
    const w = computeWaterfall(raw, p.revenueFactor);
    const pick = (cat: string) => w.find((i) => i.category === cat)?.value ?? null;
    return {
      plantId: p.id,
      plantName: p.name,
      entity: p.entity,
      revenueMINR: pick("REVENUE"),
      ebitdaMINR: pick("EBITDA"),
      capexMINR: pick("CAPEX"),
      ebitMINR: pick("EBIT"),
      wcMINR: pick("WC"),
    };
  });

  // Group by entity
  const entityMap: Record<
    string,
    {
      entity: string;
      plants: PlantTotals[];
      revenueMINR: number;
      ebitdaMINR: number;
      capexMINR: number;
      ebitMINR: number;
      wcMINR: number;
    }
  > = {};
  for (const p of perPlant) {
    entityMap[p.entity] ||= {
      entity: p.entity,
      plants: [],
      revenueMINR: 0,
      ebitdaMINR: 0,
      capexMINR: 0,
      ebitMINR: 0,
      wcMINR: 0,
    };
    const e = entityMap[p.entity];
    e.plants.push(p);
    e.revenueMINR += p.revenueMINR ?? 0;
    e.ebitdaMINR += p.ebitdaMINR ?? 0;
    e.capexMINR += p.capexMINR ?? 0;
    e.ebitMINR += p.ebitMINR ?? 0;
    e.wcMINR += p.wcMINR ?? 0;
  }

  // Compare to consolidated. mINR -> kEUR via fx: kEUR = mINR * 1000 / fx
  const toKEUR = (mInr: number) => (mInr * 1000) / fx;

  const reconciliation = Object.values(entityMap).map((e) => {
    const con = consol.find((c) => c.entity === e.entity);
    const rows = [
      {
        metric: "Revenue",
        plantKEUR: toKEUR(e.revenueMINR),
        consolKEUR: con?.revenue ?? null,
      },
      {
        metric: "EBITDA",
        plantKEUR: toKEUR(e.ebitdaMINR),
        consolKEUR: con?.ebitda ?? null,
      },
      {
        metric: "CapEx",
        plantKEUR: toKEUR(e.capexMINR),
        consolKEUR: con?.capex ?? null,
      },
      {
        metric: "EBIT",
        plantKEUR: toKEUR(e.ebitMINR),
        consolKEUR: con?.ebit ?? null,
      },
      {
        metric: "Working Capital",
        plantKEUR: toKEUR(e.wcMINR),
        consolKEUR: con?.workingCapital ?? null,
      },
    ];

    const detail = rows.map((r) => {
      const diff =
        r.consolKEUR != null ? r.plantKEUR - r.consolKEUR : null;
      const denom = Math.max(Math.abs(r.plantKEUR), Math.abs(r.consolKEUR ?? 0));
      const pct = denom > 0 && diff != null ? (Math.abs(diff) / denom) * 100 : 0;
      // Tight thresholds because consolidated reporting is precise:
      // ≤2% = MATCH, ≤4% = MINOR diff (within rounding), >4% = MISMATCH that needs explaining.
      const rawStatus =
        r.consolKEUR == null
          ? "MISSING"
          : pct <= 2
            ? "MATCH"
            : pct <= 4
              ? "MINOR"
              : "MISMATCH";
      const resolution = resolutions.find(
        (x) => x.entity === e.entity && x.metric === r.metric,
      );
      // If the row was previously marked MISMATCH/MINOR and the finance team has
      // recorded a resolution, present it as RESOLVED.
      const status =
        resolution && (rawStatus === "MISMATCH" || rawStatus === "MINOR")
          ? "RESOLVED"
          : rawStatus;
      return {
        ...r,
        diff,
        pct,
        status,
        resolution: resolution
          ? {
              remarks: resolution.remarks,
              resolvedBy: resolution.resolvedBy,
              resolvedAt: resolution.resolvedAt,
            }
          : null,
      };
    });

    return {
      entity: e.entity,
      plants: e.plants.map((p) => ({
        plantName: p.plantName,
        revenueMINR: p.revenueMINR,
        ebitdaMINR: p.ebitdaMINR,
        capexMINR: p.capexMINR,
        ebitMINR: p.ebitMINR,
        wcMINR: p.wcMINR,
      })),
      rows: detail,
    };
  });

  return NextResponse.json({
    year,
    month,
    fx,
    consolidated: consol,
    reconciliation,
  });
}
