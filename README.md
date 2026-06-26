# Veolia India FMS — POC

A working Next.js demo of the Financial Management System for Veolia India.

## Stack
- Next.js 14 (App Router) · React 18 · TypeScript
- Tailwind CSS (Veolia blue palette)
- SQLite via Prisma ORM
- File-based session (localStorage) — no real auth in POC

## Pre-loaded data (from the Excel sources)
| Plant | Entity | Business | Volume unit | Source sheet |
|---|---|---|---|---|
| Ankleshwar (ZLD) | DIPL | Hazardous Waste | Tons | `2026#Ankleshwar (ZLD+Steam)` |
| OCW (Nagpur Water) | OCW | Municipal Water | KLD | `OCW_2026` |

Both plants are seeded with **real Budget + Actual figures for Jan / Feb / Mar 2026** taken
directly from the Veolia source workbooks. A Flash 1 forecast is also seeded so the
version comparison can be demoed.

## Quick start

```bash
cd app
npm install
npm run db:reset   # creates SQLite DB and seeds the two plants + reconciliation data
npm run dev        # http://localhost:3000
```

If you want to start over: `npm run db:reset`.

## Demo walkthrough

1. **Login** — pick "Finance Team" for the power-user view (see all plants, edit anything).
   Or pick "Plant User" and a specific plant to demo the restricted view.
2. **Dashboard** — Jan 2026 vs Budget is the most interesting month. Toggle the
   *Functional view* to see expenses grouped by COS / Selling / G&A.
3. **Data Entry** — pick Plant + Month + Version. Try Ankleshwar · Jan · Actual.
   The waterfall auto-computes Revenue, Total Opex, EBITDA, EBIT as you type. The
   "Coal" row's actual is much higher than budget — surface the variance, type a
   remark, hit Save.
4. **Reconciliation** — Jan reconciles cleanly across DIPL and OCW. **Switch to
   February** — OCW Revenue and EBITDA are deliberately misaligned with the
   consolidated upload to demonstrate the mismatch flag.
5. **Approvals** — the seed leaves Feb actuals in *Pending* status for both
   plants. Login as "Plant Head" or "Finance Team" to approve / send back.
6. **Generate PPT** — when no MISMATCH exists, the button is enabled and a mock
   download list appears. Switching to Feb disables it because of the OCW mismatch.
7. **Audit Log** — every save / submit / approve / line-item change is logged.

## Roles in the POC
- **Plant User** — edits only their plant; submits for approval
- **Plant Head** — read-only on their plant + can approve
- **Finance Team** — full edit on all plants; can approve
- **Senior Management L1 / L2** — read-only on all plants

Role-based UI gating is enforced client-side (sufficient for the POC; the production
build would enforce server-side once SSO is integrated).

## Project layout
```
app/
├── app/
│   ├── (app)/          # Authenticated app shell — sidebar + topbar
│   │   ├── dashboard/
│   │   ├── plants/
│   │   ├── data-entry/
│   │   ├── reconciliation/
│   │   ├── approvals/
│   │   ├── generate-ppt/
│   │   └── audit/
│   ├── api/            # REST endpoints
│   ├── login/
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── prisma.ts       # Prisma client singleton
│   ├── session.tsx     # localStorage-backed session ctx
│   ├── types.ts        # Roles, versions, statuses
│   └── waterfall.ts    # P&L waterfall computation + formatters
└── prisma/
    ├── schema.prisma   # Plant, LineItem, MonthlyValue, Submission, AuditLog, ...
    └── seed.ts         # Two plants + Jan-Mar 2026 real data
```

## What is mocked
- Authentication (role dropdown, no password)
- PPT generation (success message + fake filenames)
- File-upload reconciliation (consolidated values entered manually)
- AI commentary (text areas with sample copy)
