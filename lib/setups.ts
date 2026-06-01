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
  tpmAcknowledgementRequirement?: string;
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

function ordinal(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n}st`;
  if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${n}rd`;
  return `${n}th`;
}

const MONTH_SHORT_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatRollingForecastHorizon(months?: number | null) {
  if (typeof months !== "number") return "—";
  return `${months} ${months === 1 ? "Month" : "Months"}`;
}

export function formatFirmPeriod(months?: number | null) {
  if (typeof months !== "number") return "—";
  return `${months} ${months === 1 ? "Month" : "Months"}`;
}

export function formatContractEffectiveDates(startDate: string, endDate: string) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const startLabel = `${MONTH_SHORT_NAMES[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  const endLabel = `${MONTH_SHORT_NAMES[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
  return `${startLabel} - ${endLabel}`;
}

export function describeTpmSubmissionScheduleSummary(rule: TpmSubmissionScheduleRule, recurrence: Recurrence) {
  if (rule.type === "FixedCalendarDate") {
    if (recurrence === "Monthly") return ordinal(rule.dayOfMonth);
    return `${ordinal(rule.dayOfMonth)}`;
  }

  if (rule.type === "NthWeekdayOfMonth") {
    return `${ordinal(rule.nth)} ${rule.weekday}`;
  }

  if (rule.type === "FollowingWeekdayAfterNthWeekdayOfMonth") {
    return `${rule.followingWeekday} after ${ordinal(rule.nth)} ${rule.anchorWeekday}`;
  }

  if (rule.weekday === "Friday") return "End of Month";
  return `Last ${rule.weekday}`;
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
    tpmAcknowledgementRequirement: "Required within 5 business days",
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
    tpmAcknowledgementRequirement: "No formal acknowledgment",
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
  },
  {
    id: "FS-003",
    pillar: "Packaging",
    tpm: "TPM C",
    products: ["Product C", "Product C2"],
    tpmLocation: "Latin America",
    tpmPreviousCompanyName: "Company Z",
    bindingPeriod: "2 months",
    firmPeriod: 4,
    rollingForecastHorizon: 24,
    tpmAcknowledgementRequirement: "Email confirmation required",
    assignees: ["GSP Planner C"],
    approvers: ["EM Manager C"],
    additionalApprovers: ["Pillar Lead A"],
    recurrence: "Monthly",
    startDate: "2025-07-01",
    endDate: "2027-07-31",
    endDateMode: "ExactDate",
    preparationDueSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 2,
      weekday: "Wednesday"
    },
    reviewDueSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 2,
      weekday: "Thursday"
    },
    tpmSubmissionSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 2,
      weekday: "Thursday"
    },
    initiationSchedule: DEFAULT_INITIATION_SCHEDULE,
    automateInstanceInitiation: true
  },
  {
    id: "FS-004",
    pillar: "API",
    tpm: "TPM D",
    products: ["Product D"],
    tpmLocation: "North America",
    bindingPeriod: "1 month",
    firmPeriod: 2,
    rollingForecastHorizon: 9,
    tpmAcknowledgementRequirement: "Meeting confirmation required",
    assignees: ["GSP Planner A"],
    approvers: ["EM Manager A"],
    additionalApprovers: ["Pillar Lead A"],
    recurrence: "Monthly",
    startDate: "2026-02-01",
    endDate: "2026-09-30",
    endDateMode: "ExactDate",
    preparationDueSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 1,
      weekday: "Tuesday"
    },
    reviewDueSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 1,
      weekday: "Wednesday"
    },
    tpmSubmissionSchedule: {
      type: "LastWeekdayOfMonth",
      weekday: "Friday"
    },
    initiationSchedule: DEFAULT_INITIATION_SCHEDULE,
    automateInstanceInitiation: true
  },
  {
    id: "FS-005",
    pillar: "BDS",
    tpm: "TPM E",
    products: ["Product E"],
    tpmLocation: "Europe",
    bindingPeriod: "3 months",
    firmPeriod: 6,
    rollingForecastHorizon: 15,
    tpmAcknowledgementRequirement: "Acknowledgement email within 3 business days",
    assignees: ["GSP Planner B"],
    approvers: ["EM Manager B"],
    additionalApprovers: ["Pillar Lead A"],
    recurrence: "Quarterly",
    startDate: "2025-10-01",
    endDate: "2027-03-31",
    endDateMode: "ExactDate",
    preparationDueSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 1,
      weekday: "Thursday",
      periodMonthInQuarter: 3
    },
    reviewDueSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 2,
      weekday: "Thursday",
      periodMonthInQuarter: 3
    },
    tpmSubmissionSchedule: {
      type: "FixedCalendarDate",
      dayOfMonth: 20,
      periodMonthInQuarter: 3
    },
    initiationSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 1,
      weekday: "Monday",
      periodMonthInQuarter: 1
    },
    automateInstanceInitiation: true
  },
  {
    id: "FS-006",
    pillar: "Device",
    tpm: "TPM F",
    products: ["Product F", "Product F2"],
    tpmLocation: "Asia Pacific",
    bindingPeriod: "2 months",
    firmPeriod: 4,
    rollingForecastHorizon: 18,
    tpmAcknowledgementRequirement: "Email acknowledgement within 2 business days",
    assignees: ["GSP Planner A", "GSP Planner C"],
    approvers: ["EM Manager A"],
    additionalApprovers: ["Pillar Lead A"],
    recurrence: "Monthly",
    startDate: "2025-11-01",
    endDate: "2027-10-31",
    endDateMode: "ExactDate",
    preparationDueSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 2,
      weekday: "Tuesday"
    },
    reviewDueSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 2,
      weekday: "Wednesday"
    },
    tpmSubmissionSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 3,
      weekday: "Friday"
    },
    initiationSchedule: DEFAULT_INITIATION_SCHEDULE,
    automateInstanceInitiation: true
  },
  {
    id: "FS-007",
    pillar: "Aseptic",
    tpm: "TPM G",
    products: ["Product G"],
    tpmLocation: "Europe",
    bindingPeriod: "4 months",
    firmPeriod: 9,
    rollingForecastHorizon: 24,
    tpmAcknowledgementRequirement: "Acknowledgement required by email",
    assignees: ["GSP Planner B"],
    approvers: ["EM Manager B", "EM Manager C"],
    additionalApprovers: ["Pillar Lead A"],
    recurrence: "Quarterly",
    startDate: "2025-04-01",
    endDate: "2028-03-31",
    endDateMode: "ExactDate",
    preparationDueSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 1,
      weekday: "Wednesday",
      periodMonthInQuarter: 3
    },
    reviewDueSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 2,
      weekday: "Wednesday",
      periodMonthInQuarter: 3
    },
    tpmSubmissionSchedule: {
      type: "LastWeekdayOfMonth",
      weekday: "Thursday",
      periodMonthInQuarter: 3
    },
    initiationSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 1,
      weekday: "Monday",
      periodMonthInQuarter: 1
    },
    automateInstanceInitiation: true
  },
  {
    id: "FS-008",
    pillar: "Packaging",
    tpm: "TPM H",
    products: ["Product H"],
    tpmLocation: "North America",
    bindingPeriod: "1 month",
    firmPeriod: 3,
    rollingForecastHorizon: 12,
    tpmAcknowledgementRequirement: "No formal acknowledgment",
    assignees: ["GSP Planner C"],
    approvers: ["EM Manager C"],
    additionalApprovers: ["Pillar Lead A"],
    recurrence: "Monthly",
    startDate: "2026-01-01",
    endDate: "2026-07-31",
    endDateMode: "ExactDate",
    preparationDueSchedule: {
      type: "FixedCalendarDate",
      dayOfMonth: 10
    },
    reviewDueSchedule: {
      type: "FixedCalendarDate",
      dayOfMonth: 15
    },
    tpmSubmissionSchedule: {
      type: "FixedCalendarDate",
      dayOfMonth: 20
    },
    initiationSchedule: DEFAULT_INITIATION_SCHEDULE,
    automateInstanceInitiation: true
  },
  {
    id: "FS-009",
    pillar: "API",
    tpm: "TPM I",
    products: ["Product I", "Product I2"],
    tpmLocation: "Latin America",
    bindingPeriod: "2 months",
    firmPeriod: 5,
    rollingForecastHorizon: 15,
    tpmAcknowledgementRequirement: "Meeting or email confirmation",
    assignees: ["GSP Planner A"],
    approvers: ["EM Manager A", "EM Manager B"],
    additionalApprovers: ["Pillar Lead A"],
    recurrence: "Monthly",
    startDate: "2025-09-01",
    endDate: "2027-02-28",
    endDateMode: "ExactDate",
    preparationDueSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 1,
      weekday: "Thursday"
    },
    reviewDueSchedule: {
      type: "FollowingWeekdayAfterNthWeekdayOfMonth",
      nth: 1,
      anchorWeekday: "Thursday",
      followingWeekday: "Friday"
    },
    tpmSubmissionSchedule: {
      type: "FixedCalendarDate",
      dayOfMonth: 24
    },
    initiationSchedule: DEFAULT_INITIATION_SCHEDULE,
    automateInstanceInitiation: true
  },
  {
    id: "FS-010",
    pillar: "BDS",
    tpm: "TPM J",
    products: ["Product J"],
    tpmLocation: "Asia Pacific",
    bindingPeriod: "6 months",
    firmPeriod: 12,
    rollingForecastHorizon: 24,
    tpmAcknowledgementRequirement: "Written acknowledgement within 5 business days",
    assignees: ["GSP Planner B", "GSP Planner C"],
    approvers: ["EM Manager B"],
    additionalApprovers: ["Pillar Lead A"],
    recurrence: "Quarterly",
    startDate: "2024-10-01",
    endDate: "2027-09-30",
    endDateMode: "ExactDate",
    preparationDueSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 2,
      weekday: "Tuesday",
      periodMonthInQuarter: 3
    },
    reviewDueSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 3,
      weekday: "Tuesday",
      periodMonthInQuarter: 3
    },
    tpmSubmissionSchedule: {
      type: "FixedCalendarDate",
      dayOfMonth: 22,
      periodMonthInQuarter: 3
    },
    initiationSchedule: {
      type: "NthWeekdayOfMonth",
      nth: 1,
      weekday: "Monday",
      periodMonthInQuarter: 1
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
