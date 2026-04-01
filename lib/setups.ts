import { PILLARS } from "./constants";

export type Recurrence = "Monthly" | "Quarterly" | "Yearly";

export type DurationUnit = "days" | "months";
export type EndDateMode = "ExactDate" | "RelativeOffset";

export const WEEKDAY_OPTIONS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type Weekday = (typeof WEEKDAY_OPTIONS)[number];

export const NTH_WEEKDAY_OPTIONS = [1, 2, 3, 4, 5] as const;
export type NthWeekday = (typeof NTH_WEEKDAY_OPTIONS)[number];

export const QUARTER_MONTH_IN_PERIOD_OPTIONS = [1, 2, 3] as const;
export type QuarterMonthInPeriod = (typeof QUARTER_MONTH_IN_PERIOD_OPTIONS)[number];

export const MONTH_OF_YEAR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type MonthOfYear = (typeof MONTH_OF_YEAR_OPTIONS)[number];

type TpmSubmissionScheduleAlignment = {
  // Used when recurrence is Quarterly (1=first month of the quarter, 3=last month).
  periodMonthInQuarter?: QuarterMonthInPeriod;
  // Used when recurrence is Yearly (1=January ... 12=December).
  periodMonthOfYear?: MonthOfYear;
};

export type TpmSubmissionScheduleRule =
  | ({
      type: "FixedCalendarDate";
      dayOfMonth: number;
    } & TpmSubmissionScheduleAlignment)
  | ({
      type: "NthWeekdayOfMonth";
      nth: NthWeekday;
      weekday: Weekday;
    } & TpmSubmissionScheduleAlignment)
  | ({
      type: "FollowingWeekdayAfterNthWeekdayOfMonth";
      nth: NthWeekday;
      anchorWeekday: Weekday;
      followingWeekday: Weekday;
    } & TpmSubmissionScheduleAlignment)
  | ({
      type: "LastWeekdayOfMonth";
      weekday: Weekday;
    } & TpmSubmissionScheduleAlignment);

export const DEFAULT_TPM_SUBMISSION_SCHEDULE: TpmSubmissionScheduleRule = {
  type: "FixedCalendarDate",
  dayOfMonth: 25,
  periodMonthInQuarter: 3,
  periodMonthOfYear: 3
};

export const DEFAULT_PREPARATION_DUE_SCHEDULE: TpmSubmissionScheduleRule = {
  type: "NthWeekdayOfMonth",
  nth: 3,
  weekday: "Thursday",
  periodMonthInQuarter: 3,
  periodMonthOfYear: 3
};

export const DEFAULT_REVIEW_DUE_SCHEDULE: TpmSubmissionScheduleRule = {
  type: "FollowingWeekdayAfterNthWeekdayOfMonth",
  nth: 3,
  anchorWeekday: "Thursday",
  followingWeekday: "Friday",
  periodMonthInQuarter: 3,
  periodMonthOfYear: 3
};

export const DEFAULT_INITIATION_SCHEDULE: TpmSubmissionScheduleRule = {
  type: "FixedCalendarDate",
  dayOfMonth: 1,
  periodMonthInQuarter: 1,
  periodMonthOfYear: 1
};

export type SetupRow = {
  id: string;
  pillar: (typeof PILLARS)[number];
  tpm: string;
  products: string[];
  tpmLocation?: string;
  tpmPreviousCompanyName?: string;
  bindingPeriod?: string;
  firmPeriod?: number | null;
  rollingForecastHorizon?: number | null;
  assignees: string[];
  approvers: string[];
  additionalApprovers: string[];
  recurrence: Recurrence;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  endDateMode?: EndDateMode;
  endDateOffsetValue?: number | null;
  endDateOffsetUnit?: DurationUnit;
  preparationDueSchedule: TpmSubmissionScheduleRule;
  reviewDueSchedule: TpmSubmissionScheduleRule;
  tpmSubmissionSchedule: TpmSubmissionScheduleRule;
  initiationSchedule: TpmSubmissionScheduleRule;
  automateInstanceInitiation?: boolean;
};

function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map((value) => Number(value));
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

function formatIsoDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function computeSetupEndDate(
  startDate: string,
  endDateMode: EndDateMode,
  exactEndDate: string,
  offsetValue?: number | null,
  offsetUnit?: DurationUnit
) {
  if (endDateMode === "ExactDate") return exactEndDate;
  if (!startDate) return "";
  if (!offsetValue || offsetValue < 0 || !offsetUnit) return "";

  const date = parseIsoDate(startDate);
  if (offsetUnit === "days") {
    date.setUTCDate(date.getUTCDate() + Math.floor(offsetValue));
  } else {
    date.setUTCMonth(date.getUTCMonth() + Math.floor(offsetValue));
  }

  return formatIsoDate(date);
}

export function formatProductsLabel(products: string[]) {
  return (products ?? []).filter(Boolean).join(", ");
}

export const RECURRENCE_OPTIONS: Recurrence[] = ["Monthly", "Quarterly", "Yearly"];

export const BASE_SETUPS: SetupRow[] = [
  {
    id: "FS-001",
    pillar: "Device",
    tpm: "TPM A",
    products: ["Product A"],
    tpmLocation: "North America",
    tpmPreviousCompanyName: "Company X",
    bindingPeriod: "12 months",
    firmPeriod: 3,
    rollingForecastHorizon: 12,
    assignees: ["GSP Planner A"],
    approvers: ["EM Manager A", "EM Manager B"],
    additionalApprovers: ["Pillar Lead A"],
    recurrence: "Monthly",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    endDateMode: "ExactDate",
    endDateOffsetValue: null,
    endDateOffsetUnit: "months",
    preparationDueSchedule: DEFAULT_PREPARATION_DUE_SCHEDULE,
    reviewDueSchedule: DEFAULT_REVIEW_DUE_SCHEDULE,
    tpmSubmissionSchedule: DEFAULT_TPM_SUBMISSION_SCHEDULE,
    initiationSchedule: DEFAULT_INITIATION_SCHEDULE,
    automateInstanceInitiation: false
  },
  {
    id: "FS-002",
    pillar: "Aseptic",
    tpm: "TPM B",
    products: ["Product B"],
    tpmLocation: "Europe",
    tpmPreviousCompanyName: "Company Y",
    bindingPeriod: "18 months",
    firmPeriod: 6,
    rollingForecastHorizon: 18,
    assignees: ["EM Manager", "GSP Planner B"],
    approvers: ["EM Manager B"],
    additionalApprovers: ["Pillar Lead A"],
    recurrence: "Quarterly",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    endDateMode: "RelativeOffset",
    endDateOffsetValue: 12,
    endDateOffsetUnit: "months",
    preparationDueSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 2,
      weekday: "Thursday",
      periodMonthInQuarter: 3,
      periodMonthOfYear: 3
    },
    reviewDueSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 3,
      weekday: "Thursday",
      periodMonthInQuarter: 3,
      periodMonthOfYear: 3
    },
    tpmSubmissionSchedule: DEFAULT_TPM_SUBMISSION_SCHEDULE,
    initiationSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 1,
      weekday: "Monday",
      periodMonthInQuarter: 1,
      periodMonthOfYear: 1
    },
    automateInstanceInitiation: true
  }
];

export function nextSetupId(existingIds: string[]) {
  let max = 0;
  for (const id of existingIds) {
    const match = /^FS-(\d+)$/.exec(id);
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  const next = max + 1;
  return `FS-${String(next).padStart(3, "0")}`;
}
