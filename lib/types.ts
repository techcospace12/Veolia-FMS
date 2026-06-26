export type Role =
  | "PLANT_USER"
  | "PLANT_HEAD"
  | "FINANCE_TEAM"
  | "SENIOR_MGMT_1"
  | "SENIOR_MGMT_2";

export const ROLE_LABELS: Record<Role, string> = {
  PLANT_USER: "Plant User",
  PLANT_HEAD: "Plant Head",
  FINANCE_TEAM: "Finance Team",
  SENIOR_MGMT_1: "Senior Management - L1",
  SENIOR_MGMT_2: "Senior Management - L2",
};

export const ROLE_DESC: Record<Role, string> = {
  PLANT_USER: "Enter budget & actual data for your plant",
  PLANT_HEAD: "Review and approve plant submissions",
  FINANCE_TEAM: "Full edit access — power user",
  SENIOR_MGMT_1: "Read-only consolidated view",
  SENIOR_MGMT_2: "Read-only — final approval",
};

export type Version = "BUDGET" | "FLASH1" | "FORECAST2" | "FLASH2" | "ACTUAL";

export const VERSION_LABELS: Record<Version, string> = {
  BUDGET: "Budget",
  FLASH1: "Flash 1",
  FORECAST2: "Forecast 2",
  FLASH2: "Flash 2",
  ACTUAL: "Actual",
};

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type LineItemCategory =
  | "VOLUME"
  | "RATE"
  | "REVENUE"
  | "OPEX"
  | "TOTAL_OPEX"
  | "PROFIT_BEFORE_MP"
  | "STAFF"
  | "TOTAL_STAFF"
  | "PROFIT_BEFORE_SGA"
  | "SGA"
  | "CORPORATE"
  | "EBITDA"
  | "DEPRECIATION"
  | "EBIT"
  | "CAPEX"
  | "WC";

export const SECTION_LABELS: Partial<Record<LineItemCategory, string>> = {
  VOLUME: "Volume & Rate",
  OPEX: "Operating Expenses",
  STAFF: "Manpower Costs",
  SGA: "SG&A",
};

export type FunctionTag = "COS" | "SELLING" | "GA";

export const FUNCTION_LABELS: Record<FunctionTag, string> = {
  COS: "COS — Cost of Sales",
  SELLING: "Selling",
  GA: "G&A",
};

export type Status = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "LOCKED";

export const STATUS_LABELS: Record<Status, string> = {
  DRAFT: "Draft",
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  LOCKED: "Locked",
};

export const STATUS_COLORS: Record<Status, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
  LOCKED: "bg-slate-800 text-white",
};
