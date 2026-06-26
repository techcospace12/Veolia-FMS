import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type LI = {
  name: string;
  category: string;
  function?: string;
  isCalculated?: boolean;
  isRemovable?: boolean;
};

type Vals = {
  jan?: number | null;
  feb?: number | null;
  mar?: number | null;
};
type ItemSeed = LI & {
  budget?: Vals;
  actual?: Vals;
  flash1?: Vals;
  remarks?: { jan?: string; feb?: string; mar?: string };
};

// ============= ANKLESHWAR (ZLD) — Hazardous Waste, DIPL entity =============
// Source: HZ Waste Business sheet "2026#Ankleshwar (ZLD+Steam)" rows 6-31
// Volumes in tons, rate INR/ton. All amounts mINR.
const ankleshwar: ItemSeed[] = [
  {
    name: "Volumes",
    category: "VOLUME",
    budget: { jan: 17250, feb: 17250, mar: 17250 },
    actual: { jan: 18747, feb: 20563, mar: 19790 },
    flash1: { jan: 17800, feb: 18500, mar: 19200 },
  },
  {
    name: "Rate",
    category: "RATE",
    budget: { jan: 5196.365, feb: 5196.365, mar: 5196.365 },
    actual: { jan: 4859.96, feb: 4433.14, mar: 4374.88 },
    flash1: { jan: 5100, feb: 5050, mar: 5000 },
  },
  {
    name: "Revenue",
    category: "REVENUE",
    isCalculated: true,
  },
  {
    name: "Power",
    category: "OPEX",
    function: "COS",
    budget: { jan: 14.628, feb: 14.628, mar: 14.628 },
    actual: { jan: 15.419, feb: 16.052, mar: 13.888 },
    flash1: { jan: 14.9, feb: 15.2, mar: 14.0 },
  },
  {
    name: "Coal",
    category: "OPEX",
    function: "COS",
    budget: { jan: 20.75, feb: 20.75, mar: 20.75 },
    actual: { jan: 28.245, feb: 24.455, mar: 18.481 },
    remarks: { jan: "Higher coal consumption due to lower steam yield" },
  },
  {
    name: "Transportation Exp.",
    category: "OPEX",
    function: "COS",
    budget: { jan: 2.552, feb: 2.552, mar: 2.552 },
    actual: { jan: 7.879, feb: 6.332, mar: 6.549 },
    remarks: { jan: "Diesel price rise; longer haul distances for waste pickup" },
  },
  {
    name: "Loading / Unloading",
    category: "OPEX",
    function: "COS",
    budget: { jan: 1.0, feb: 1.0, mar: 1.0 },
    actual: { jan: 0.975, feb: 0.763, mar: 0.878 },
  },
  {
    name: "O&M",
    category: "OPEX",
    function: "COS",
    budget: { jan: 9.708, feb: 9.708, mar: 9.708 },
    actual: { jan: 4.841, feb: 7.371, mar: 2.974 },
  },
  {
    name: "Other Manufacturing Exp.",
    category: "OPEX",
    function: "COS",
    budget: { jan: 10.631, feb: 10.631, mar: 10.631 },
    actual: { jan: 19.754, feb: 11.862, mar: 17.73 },
    remarks: { jan: "Higher consumables usage; one-off ash disposal" },
  },
  {
    name: "Landfill Costs",
    category: "OPEX",
    function: "COS",
    budget: { jan: 0, feb: 0, mar: 0 },
    actual: { jan: 0, feb: 0, mar: 0 },
  },
  {
    name: "Steam Cost",
    category: "OPEX",
    function: "COS",
    budget: { jan: 0, feb: 0, mar: 0 },
    actual: { jan: 0, feb: 0, mar: 0 },
  },
  { name: "Total Opex", category: "TOTAL_OPEX", isCalculated: true },
  { name: "Profit before manpower", category: "PROFIT_BEFORE_MP", isCalculated: true },
  {
    name: "Staff Salary",
    category: "STAFF",
    function: "COS",
    budget: { jan: 15.496, feb: 15.496, mar: 15.496 },
    actual: { jan: 8.713, feb: 7.809, mar: 9.052 },
  },
  {
    name: "Contractual Labour + Security",
    category: "STAFF",
    function: "COS",
    budget: { jan: 0, feb: 0, mar: 0 },
    actual: { jan: 4.432, feb: 5.585, mar: 4.458 },
  },
  { name: "Total Staff Cost", category: "TOTAL_STAFF", isCalculated: true },
  { name: "Profit before SG&A", category: "PROFIT_BEFORE_SGA", isCalculated: true },
  {
    name: "SG&A Expenses",
    category: "SGA",
    function: "GA",
    budget: { jan: 5.594, feb: 5.594, mar: 5.594 },
    actual: { jan: 1.3, feb: 0.217, mar: 0.339 },
  },
  {
    name: "Corporate Cost (HO recharge)",
    category: "CORPORATE",
    function: "GA",
    budget: { jan: 0, feb: 0, mar: 0 },
    actual: { jan: 5.47, feb: 4.888, mar: 4.343 },
    remarks: { jan: "HO allocation arrived after budget cycle" },
  },
  { name: "EBITDA", category: "EBITDA", isCalculated: true },
  {
    name: "Depreciation",
    category: "DEPRECIATION",
    budget: { jan: 6.5, feb: 6.5, mar: 6.5 },
    actual: { jan: 6.2, feb: 6.2, mar: 6.2 },
  },
  { name: "EBIT", category: "EBIT", isCalculated: true },
  {
    name: "Capex",
    category: "CAPEX",
    budget: { jan: 3.2, feb: 3.2, mar: 3.2 },
    actual: { jan: 1.1, feb: 4.5, mar: 2.8 },
  },
  {
    name: "Working Capital Change",
    category: "WC",
    budget: { jan: 1.5, feb: 1.5, mar: 1.5 },
    actual: { jan: 2.8, feb: -0.4, mar: 1.9 },
  },
];

// ============= OCW (Nagpur Water) — Municipal Water, OCW entity =============
// Source: Nagpur Municipal Water sheet "OCW_2026" rows 4-24
// Volume in KLD, rate INR/KL/day. Revenue factor = 31 / 1e6.
// In source sheet, expenses are stored negative — we store as positive magnitudes.
const ocw: ItemSeed[] = [
  {
    name: "Volumes",
    category: "VOLUME",
    budget: { jan: 536000, feb: 536000, mar: 536000 },
    actual: { jan: 536000, feb: 536000, mar: 536000 },
    flash1: { jan: 540000, feb: 540000, mar: 540000 },
  },
  {
    name: "Rate",
    category: "RATE",
    budget: { jan: 11.32, feb: 11.32, mar: 11.32 },
    actual: { jan: 11.32, feb: 11.32, mar: 11.32 },
    flash1: { jan: 11.5, feb: 11.5, mar: 11.5 },
  },
  {
    name: "Revenue",
    category: "REVENUE",
    isCalculated: true,
  },
  {
    name: "Energy (fuel, gas, coal)",
    category: "OPEX",
    function: "COS",
    budget: { jan: 0.624, feb: 0.624, mar: 0.624 },
    actual: { jan: 0, feb: 0, mar: 0 },
  },
  {
    name: "Purchases",
    category: "OPEX",
    function: "COS",
    budget: { jan: 9.673, feb: 9.673, mar: 9.673 },
    actual: { jan: 11.0, feb: 1.7, mar: 5.8 },
  },
  {
    name: "Sub-contracting (incl. manpower)",
    category: "OPEX",
    function: "COS",
    budget: { jan: 28.797, feb: 28.797, mar: 28.797 },
    actual: { jan: 48.6, feb: 64.1, mar: 81.0 },
    remarks: { jan: "Higher mobilisation for line restoration work" },
  },
  {
    name: "NRW Reduction",
    category: "OPEX",
    function: "COS",
    budget: { jan: 4.11, feb: 4.11, mar: 4.11 },
    actual: { jan: 0, feb: 0, mar: 0 },
  },
  {
    name: "Insurance",
    category: "OPEX",
    function: "GA",
    budget: { jan: 1.915, feb: 1.915, mar: 1.915 },
    actual: { jan: 1.7, feb: 1.7, mar: 1.9 },
  },
  {
    name: "Service contracts",
    category: "OPEX",
    function: "COS",
    budget: { jan: 34.402, feb: 31.073, mar: 34.402 },
    actual: { jan: 34.4, feb: 31.0, mar: 34.5 },
  },
  {
    name: "R&R - Spending",
    category: "OPEX",
    function: "COS",
    budget: { jan: 27.5, feb: 27.5, mar: 27.5 },
    actual: { jan: 0.4, feb: 43.9, mar: 85.4 },
    remarks: { mar: "Catch-up on deferred R&R schedule" },
  },
  {
    name: "Other operating expenses",
    category: "OPEX",
    function: "COS",
    budget: { jan: 41.337, feb: 41.337, mar: 41.337 },
    actual: { jan: 30.1, feb: 30.7, mar: 12.6 },
  },
  { name: "Total Opex", category: "TOTAL_OPEX", isCalculated: true },
  { name: "Profit before manpower", category: "PROFIT_BEFORE_MP", isCalculated: true },
  {
    name: "Staff costs (On-roll)",
    category: "STAFF",
    function: "COS",
    budget: { jan: 20.55, feb: 20.55, mar: 20.55 },
    actual: { jan: 19.5, feb: 15.5, mar: 18.5 },
  },
  { name: "Total Staff Cost", category: "TOTAL_STAFF", isCalculated: true },
  { name: "Profit before SG&A", category: "PROFIT_BEFORE_SGA", isCalculated: true },
  {
    name: "SG&A Expenses",
    category: "SGA",
    function: "GA",
    budget: { jan: 0, feb: 0, mar: 0 },
    actual: { jan: 0, feb: 0, mar: 0 },
  },
  {
    name: "Corporate Cost (HO recharge)",
    category: "CORPORATE",
    function: "GA",
    budget: { jan: 0, feb: 0, mar: 0 },
    actual: { jan: 0, feb: 0, mar: 0 },
  },
  { name: "EBITDA", category: "EBITDA", isCalculated: true },
  {
    name: "Depreciation",
    category: "DEPRECIATION",
    budget: { jan: 14.0, feb: 14.0, mar: 14.0 },
    actual: { jan: 13.8, feb: 13.8, mar: 13.8 },
  },
  { name: "EBIT", category: "EBIT", isCalculated: true },
  {
    name: "Capex",
    category: "CAPEX",
    budget: { jan: 8.0, feb: 8.0, mar: 8.0 },
    actual: { jan: 2.1, feb: 6.4, mar: 12.7 },
  },
  {
    name: "Working Capital Change",
    category: "WC",
    budget: { jan: 4.0, feb: 4.0, mar: 4.0 },
    actual: { jan: 5.2, feb: 3.1, mar: 6.4 },
  },
];

async function seedPlant(plantData: {
  name: string;
  entity: string;
  business: string;
  volumeUnit: string;
  rateUnit: string;
  revenueFactor: number;
  items: ItemSeed[];
}) {
  const plant = await prisma.plant.create({
    data: {
      name: plantData.name,
      entity: plantData.entity,
      business: plantData.business,
      volumeUnit: plantData.volumeUnit,
      rateUnit: plantData.rateUnit,
      revenueFactor: plantData.revenueFactor,
    },
  });

  for (let i = 0; i < plantData.items.length; i++) {
    const it = plantData.items[i];
    const li = await prisma.lineItem.create({
      data: {
        plantId: plant.id,
        order: i,
        name: it.name,
        category: it.category,
        function: it.function,
        isCalculated: it.isCalculated ?? false,
        isRemovable: it.isRemovable ?? false,
      },
    });

    const months: Array<["jan" | "feb" | "mar", number]> = [
      ["jan", 1],
      ["feb", 2],
      ["mar", 3],
    ];

    // Flash 1: if not explicitly seeded, derive from Budget with a category-based
    // multiplier so the version comparison demos meaningfully.
    // Revenue side trending ~3% lower, cost side ~3-5% higher — typical mid-year revision.
    const flash1Multiplier: Record<string, number> = {
      VOLUME: 0.97, RATE: 0.97, REVENUE: 0.97,
      OPEX: 1.04,
      STAFF: 1.03,
      SGA: 1.05, CORPORATE: 1.05,
      DEPRECIATION: 1.0, CAPEX: 1.0, WC: 1.0,
    };
    const derivedFlash1: Vals | undefined = (() => {
      if (it.flash1 || it.isCalculated) return it.flash1;
      if (!it.budget) return undefined;
      const m = flash1Multiplier[it.category];
      if (m === undefined) return undefined;
      const apply = (v: number | null | undefined) =>
        v == null ? v : Math.round(v * m * 1000) / 1000;
      return {
        jan: apply(it.budget.jan),
        feb: apply(it.budget.feb),
        mar: apply(it.budget.mar),
      };
    })();

    type V = "BUDGET" | "ACTUAL" | "FLASH1";
    const versions: Array<[V, Vals | undefined]> = [
      ["BUDGET", it.budget],
      ["ACTUAL", it.actual],
      ["FLASH1", derivedFlash1],
    ];

    for (const [version, bag] of versions) {
      if (!bag) continue;
      for (const [mKey, mNum] of months) {
        const v = bag[mKey];
        if (v === undefined) continue;
        const remarks =
          version === "ACTUAL" && it.remarks ? it.remarks[mKey] : undefined;
        await prisma.monthlyValue.create({
          data: {
            lineItemId: li.id,
            year: 2026,
            month: mNum,
            version,
            value: v ?? null,
            remarks: remarks ?? null,
          },
        });
      }
    }
  }

  return plant;
}

async function main() {
  // Wipe in fk-safe order
  await prisma.auditLog.deleteMany();
  await prisma.consolidatedData.deleteMany();
  await prisma.reconResolution.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.monthlyValue.deleteMany();
  await prisma.lineItem.deleteMany();
  await prisma.plant.deleteMany();
  await prisma.settings.deleteMany();

  await prisma.settings.create({ data: { fxRateInrPerEur: 90.0 } });

  const p1 = await seedPlant({
    name: "Ankleshwar (ZLD)",
    entity: "DIPL",
    business: "Hazardous Waste Treatment",
    volumeUnit: "Tons",
    rateUnit: "INR/Ton",
    revenueFactor: 1 / 1_000_000,
    items: ankleshwar,
  });

  const p2 = await seedPlant({
    name: "OCW (Nagpur Water)",
    entity: "OCW",
    business: "Municipal Water Supply",
    volumeUnit: "KLD",
    rateUnit: "INR/KL",
    revenueFactor: 31 / 1_000_000,
    items: ocw,
  });

  // Sample submissions, designed to exercise every status the UI can show.
  // (Pick whichever Plant + Month + Version combo lets you demo a particular state.)
  for (const plant of [p1, p2]) {
    // ---- BUDGET ----
    // Jan Budget — Approved by Plant Head (Plant User sees read-only with green pill)
    await prisma.submission.create({
      data: {
        plantId: plant.id, year: 2026, month: 1, version: "BUDGET",
        status: "APPROVED",
        submittedBy: "Plant User", submittedAt: new Date("2025-10-12"),
        approvedBy: "Plant Head", approvedAt: new Date("2025-10-15"),
      },
    });
    // Feb Budget — Draft (Plant User can edit freely + Submit)
    await prisma.submission.create({
      data: {
        plantId: plant.id, year: 2026, month: 2, version: "BUDGET",
        status: "DRAFT",
      },
    });
    // Mar Budget — Rejected with reason (Plant User can re-edit + resubmit)
    await prisma.submission.create({
      data: {
        plantId: plant.id, year: 2026, month: 3, version: "BUDGET",
        status: "REJECTED",
        submittedBy: "Plant User", submittedAt: new Date("2025-10-18"),
        rejectionReason: "Volumes look optimistic vs CY25 trend — please re-validate with operations",
      },
    });

    // ---- ACTUAL ----
    // Jan Actual — Approved (clean closed month)
    await prisma.submission.create({
      data: {
        plantId: plant.id, year: 2026, month: 1, version: "ACTUAL",
        status: "APPROVED",
        submittedBy: "Finance Team", submittedAt: new Date("2026-02-03"),
        approvedBy: "Senior Management", approvedAt: new Date("2026-02-05"),
      },
    });
    // Feb Actual — Pending (waiting for Senior Mgmt sign-off → great for Approve demo)
    await prisma.submission.create({
      data: {
        plantId: plant.id, year: 2026, month: 2, version: "ACTUAL",
        status: "PENDING",
        submittedBy: "Finance Team", submittedAt: new Date("2026-03-04"),
      },
    });
    // Mar Actual — Draft (Finance Team in the middle of entering)
    await prisma.submission.create({
      data: {
        plantId: plant.id, year: 2026, month: 3, version: "ACTUAL",
        status: "DRAFT",
      },
    });

    // ---- FLASH 1 (one example) ----
    await prisma.submission.create({
      data: {
        plantId: plant.id, year: 2026, month: 1, version: "FLASH1",
        status: "APPROVED",
        submittedBy: "Finance Team", submittedAt: new Date("2026-04-15"),
        approvedBy: "Senior Management", approvedAt: new Date("2026-04-18"),
      },
    });
  }

  // Consolidated data (kEUR). FX = 90 INR/EUR.
  // All entries are set to match the plant rollups (computed from this same seed),
  // EXCEPT OCW Feb — that one is deliberately broken to demonstrate the flag.
  const consol: Array<{
    entity: string;
    month: number;
    revenue: number;
    ebitda: number;
    capex: number;
    ebit: number;
    workingCapital: number;
  }> = [
    // DIPL Jan: plant -> Rev 1012.3, EBITDA -65.8, CapEx 12.2, EBIT -134.6, WC 31.1
    { entity: "DIPL", month: 1, revenue: 1012.3, ebitda: -65.8, capex: 12.2, ebit: -134.6, workingCapital: 31.1 },
    { entity: "DIPL", month: 2, revenue: 1012.9, ebitda: 64.7, capex: 50.0, ebit: -4.2, workingCapital: -4.4 },
    { entity: "DIPL", month: 3, revenue: 962.0, ebitda: 87.6, capex: 31.1, ebit: 18.7, workingCapital: 21.1 },
    // OCW Jan: deliberate mismatches on Revenue (2200 vs 2089.9 plant — ~110 kEUR gap)
    // and Working Capital (40 vs 57.8 plant). EBITDA, CapEx, EBIT match.
    { entity: "OCW", month: 1, revenue: 2200.0, ebitda: 471.0, capex: 23.3, ebit: 317.7, workingCapital: 40.0 },
    // OCW Feb: deliberate mismatch (consolidated revenue higher, EBITDA misaligned)
    { entity: "OCW", month: 2, revenue: 2300.0, ebitda: 50.0, capex: 71.1, ebit: -159.0, workingCapital: 34.4 },
    { entity: "OCW", month: 3, revenue: 2089.9, ebitda: -573.4, capex: 141.1, ebit: -726.7, workingCapital: 71.1 },
  ];
  for (const row of consol) {
    await prisma.consolidatedData.create({
      data: { ...row, year: 2026 },
    });
  }

  // Audit log seed
  await prisma.auditLog.createMany({
    data: [
      {
        userRole: "Finance Team",
        userName: "Finance Team",
        plantName: "Ankleshwar (ZLD)",
        action: "BUDGET_LOCKED",
        details: "Budget 2026 finalized and locked",
        createdAt: new Date("2025-10-20T10:00:00Z"),
      },
      {
        userRole: "Plant User",
        userName: "Plant User",
        plantName: "Ankleshwar (ZLD)",
        action: "ACTUAL_SUBMITTED",
        details: "Submitted January 2026 actuals for approval",
        createdAt: new Date("2026-02-03T11:30:00Z"),
      },
      {
        userRole: "Plant Head",
        userName: "Plant Head",
        plantName: "Ankleshwar (ZLD)",
        action: "ACTUAL_APPROVED",
        details: "Approved January 2026 actuals",
        createdAt: new Date("2026-02-05T09:15:00Z"),
      },
      {
        userRole: "Plant User",
        userName: "Plant User",
        plantName: "OCW (Nagpur Water)",
        action: "ACTUAL_SUBMITTED",
        details: "Submitted February 2026 actuals for approval",
        createdAt: new Date("2026-03-04T14:22:00Z"),
      },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
