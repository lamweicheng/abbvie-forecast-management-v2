import type { SetupRow, Recurrence, TpmSubmissionScheduleRule, Weekday } from "./setups";
import { DEFAULT_INITIATION_SCHEDULE, DEFAULT_PREPARATION_DUE_SCHEDULE, DEFAULT_REVIEW_DUE_SCHEDULE } from "./setups";
import { BASE_SETUPS } from "./setups";
import { formatProductsLabel } from "./setups";
import { PILLARS } from "./constants";
import { forecastFolderRoute } from "./forecastFolders";

export type CyclePhaseId = 0 | 1 | 2 | 3 | 4;

export type ForecastCycleRow = {
  id: string;
  setupId: string;
  label: string;
  cycleStart: string; // YYYY-MM-DD
  cycleEnd: string; // YYYY-MM-DD

  pillar: (typeof PILLARS)[number];
  tpm: string;
  products: string[];
  tpmLocation?: string;
  tpmPreviousCompanyName?: string;
  bindingPeriod?: string;
  initiationSchedule?: TpmSubmissionScheduleRule;
  initiationTargetDate?: string;
  automateInstanceInitiation?: boolean;

  requestedBy?: string;
  requestedDate?: string; // YYYY-MM-DD
  emManagerComments?: string;

  assignees?: string[];
  assigneeComments?: string;
  approvers?: string[];
  additionalApprovers?: string[];

  approverCommentsToAssignees?: string;
  alignedToLatestPlanVolumes?: boolean;

  gspForecastDue?: string; // YYYY-MM-DD
  approverReviewDue?: string; // YYYY-MM-DD
  tpmSubmissionDue: string; // YYYY-MM-DD

  sentToTpm?: boolean;
  sentToTpmDate?: string; // YYYY-MM-DD
  tpmConfirmedDate?: string; // YYYY-MM-DD
  tpmOutcome?: "approved" | "changes_requested";
  tpmChangeRequest?: string;
  closeRequested?: boolean;

  phaseId: CyclePhaseId;
  forecastPdfHref?: string;
  closed: boolean;
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function iso(y: number, m: number, d: number) {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function addMonths(date: Date, n: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), daysInMonth(date.getFullYear(), date.getMonth()));
}

function formatIsoDate(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayIsoUtc() {
  return formatIsoDate(new Date());
}

function weekdayToJsIndex(weekday: Weekday) {
  // JS: 0=Sunday ... 6=Saturday
  if (weekday === "Sunday") return 0;
  if (weekday === "Monday") return 1;
  if (weekday === "Tuesday") return 2;
  if (weekday === "Wednesday") return 3;
  if (weekday === "Thursday") return 4;
  if (weekday === "Friday") return 5;
  return 6;
}

function computeTpmDueDate(rule: TpmSubmissionScheduleRule, year: number, monthIndex0: number) {
  const dim = daysInMonth(year, monthIndex0);

  if (rule.type === "FixedCalendarDate") {
    const day = Math.min(Math.max(1, Math.floor(rule.dayOfMonth)), dim);
    return iso(year, monthIndex0 + 1, day);
  }

  if (rule.type === "NthWeekdayOfMonth") {
    const target = weekdayToJsIndex(rule.weekday);
    const first = new Date(Date.UTC(year, monthIndex0, 1));
    const offset = (target - first.getUTCDay() + 7) % 7;
    let day = 1 + offset + (rule.nth - 1) * 7;
    while (day > dim) day -= 7;
    day = Math.max(1, day);
    return iso(year, monthIndex0 + 1, day);
  }

  if (rule.type === "FollowingWeekdayAfterNthWeekdayOfMonth") {
    const anchorTarget = weekdayToJsIndex(rule.anchorWeekday);
    const first = new Date(Date.UTC(year, monthIndex0, 1));
    const anchorOffset = (anchorTarget - first.getUTCDay() + 7) % 7;
    let anchorDay = 1 + anchorOffset + (rule.nth - 1) * 7;
    while (anchorDay > dim) anchorDay -= 7;
    anchorDay = Math.max(1, anchorDay);

    const anchorDate = new Date(Date.UTC(year, monthIndex0, anchorDay));
    const followingTarget = weekdayToJsIndex(rule.followingWeekday);
    let followingOffset = (followingTarget - anchorDate.getUTCDay() + 7) % 7;
    if (followingOffset === 0) followingOffset = 7;
    anchorDate.setUTCDate(anchorDate.getUTCDate() + followingOffset);
    return formatIsoDate(anchorDate);
  }

  // LastWeekdayOfMonth
  const target = weekdayToJsIndex(rule.weekday);
  const last = new Date(Date.UTC(year, monthIndex0, dim));
  const offset = (last.getUTCDay() - target + 7) % 7;
  const day = dim - offset;
  return iso(year, monthIndex0 + 1, day);
}

function monthAnchorForRecurrence(
  recurrence: Recurrence,
  rule: TpmSubmissionScheduleRule,
  periodStart: Date,
  periodEnd: Date
) {
  if (recurrence === "Monthly") {
    return { year: periodEnd.getFullYear(), monthIndex0: periodEnd.getMonth() };
  }

  if (recurrence === "Quarterly") {
    const inQuarter = rule.periodMonthInQuarter ?? 3;
    const offset = Math.max(1, Math.min(3, inQuarter)) - 1;
    const anchor = new Date(periodStart.getFullYear(), periodStart.getMonth() + offset, 1);
    return { year: anchor.getFullYear(), monthIndex0: anchor.getMonth() };
  }

  // Yearly
  const monthOfYear = rule.periodMonthOfYear ?? 3;
  const desiredMonthIndex0 = Math.max(1, Math.min(12, monthOfYear)) - 1;
  let year = periodStart.getFullYear();

  // Ensure the anchor month lands within the recurrence period.
  if (desiredMonthIndex0 < periodStart.getMonth()) year += 1;

  return { year, monthIndex0: desiredMonthIndex0 };
}

function computeScheduledDueDate(
  recurrence: Recurrence,
  rule: TpmSubmissionScheduleRule,
  periodStart: Date,
  periodEnd: Date
) {
  const { year, monthIndex0 } = monthAnchorForRecurrence(recurrence, rule, periodStart, periodEnd);
  return computeTpmDueDate(rule, year, monthIndex0);
}

function monthLabel(date: Date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function quarterLabel(date: Date) {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q} ${date.getFullYear()}`;
}

function yearLabel(date: Date) {
  return String(date.getFullYear());
}

function recurrenceStepMonths(recurrence: Recurrence) {
  if (recurrence === "Monthly") return 1;
  if (recurrence === "Quarterly") return 3;
  return 12;
}

function cyclePeriodLabel(recurrence: Recurrence, periodStart: Date) {
  if (recurrence === "Monthly") return monthLabel(periodStart);
  if (recurrence === "Quarterly") return quarterLabel(periodStart);
  return yearLabel(periodStart);
}

export function formatCycleLabel(periodStart: Date, setup: Pick<SetupRow, "tpm" | "products">, recurrence: Recurrence) {
  return `${cyclePeriodLabel(recurrence, periodStart)} - ${setup.tpm} - ${formatProductsLabel(setup.products)} - Forecast`;
}

export function generateCyclesForSetup(
  setup: SetupRow,
  existingCycleIds: string[]
): ForecastCycleRow[] {
  const start = new Date(setup.startDate + "T00:00:00");
  const end = new Date(setup.endDate + "T00:00:00");

  const stepMonths = recurrenceStepMonths(setup.recurrence);
  const cycles: ForecastCycleRow[] = [];

  let cursor = startOfMonth(start);
  const existing = [...existingCycleIds];

  while (cursor <= end) {
    const periodStart = cursor;
    const periodEnd = endOfMonth(addMonths(periodStart, stepMonths - 1));

    if (periodEnd < start) {
      cursor = addMonths(cursor, stepMonths);
      continue;
    }

    if (periodStart > end) break;

    const id = nextCycleId(existing);
    existing.push(id);

    const cycleStartIso = iso(periodStart.getFullYear(), periodStart.getMonth() + 1, 1);
    const cycleEndIso = iso(periodEnd.getFullYear(), periodEnd.getMonth() + 1, periodEnd.getDate());

    const tpmSubmissionDue = computeScheduledDueDate(setup.recurrence, setup.tpmSubmissionSchedule, periodStart, periodEnd);
    const gspForecastDue = computeScheduledDueDate(
      setup.recurrence,
      setup.preparationDueSchedule ?? DEFAULT_PREPARATION_DUE_SCHEDULE,
      periodStart,
      periodEnd
    );
    const approverReviewDue = computeScheduledDueDate(
      setup.recurrence,
      setup.reviewDueSchedule ?? DEFAULT_REVIEW_DUE_SCHEDULE,
      periodStart,
      periodEnd
    );
    const initiationSchedule = setup.initiationSchedule ?? DEFAULT_INITIATION_SCHEDULE;
    const initiationTargetDate = computeScheduledDueDate(
      setup.recurrence,
      initiationSchedule,
      periodStart,
      periodEnd
    );
    const automateInstanceInitiation = Boolean(setup.automateInstanceInitiation);
    const autoInitiated = Boolean(automateInstanceInitiation && initiationTargetDate <= todayIsoUtc());

    cycles.push({
      id,
      setupId: setup.id,
      label: formatCycleLabel(periodStart, setup, setup.recurrence),
      cycleStart: cycleStartIso,
      cycleEnd: cycleEndIso,
      pillar: setup.pillar,
      tpm: setup.tpm,
      products: setup.products,
      tpmLocation: setup.tpmLocation,
      tpmPreviousCompanyName: setup.tpmPreviousCompanyName,
      bindingPeriod: setup.bindingPeriod,
      initiationSchedule,
      initiationTargetDate,
      automateInstanceInitiation,
      requestedBy: autoInitiated ? "Automated schedule" : undefined,
      requestedDate: autoInitiated ? initiationTargetDate : undefined,
      emManagerComments: autoInitiated
        ? `This instance was auto-initiated on ${initiationTargetDate} based on setup defaults.`
        : undefined,
      assignees: setup.assignees,
      approvers: setup.approvers,
      additionalApprovers: setup.additionalApprovers,
      gspForecastDue,
      approverReviewDue,
      tpmSubmissionDue,
      phaseId: autoInitiated ? 1 : 0,
      closed: false
    });

    cursor = addMonths(cursor, stepMonths);
  }

  return cycles;
}

export function nextCycleId(existingIds: string[]) {
  let max = 0;
  for (const id of existingIds) {
    const match = /^FC-(\d+)$/.exec(id);
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  const next = max + 1;
  return `FC-${String(next).padStart(3, "0")}`;
}

function seededCycles(): ForecastCycleRow[] {
  const cycles: ForecastCycleRow[] = [];
  for (const setup of BASE_SETUPS) {
    cycles.push(...generateCyclesForSetup(setup, cycles.map((c) => c.id)));
  }

  // Make a few seeds feel realistic (cover phases 1–5).
  const bySetup = (setupId: string) => cycles.filter((c) => c.setupId === setupId).sort((a, b) => a.cycleStart.localeCompare(b.cycleStart));
  const s1 = bySetup("FS-001");
  const s2 = bySetup("FS-002");

  if (s1[0]) {
    Object.assign(s1[0], {
      requestedBy: "EM Manager A",
      requestedDate: "2026-01-03",
      emManagerComments: "Please align assumptions with last cycle and highlight key drivers.",
      phaseId: 4,
      forecastPdfHref: forecastFolderRoute(s1[0].id),
      closed: true
    } satisfies Partial<ForecastCycleRow>);
  }

  if (s1[1]) {
    Object.assign(s1[1], {
      requestedBy: "EM Manager A",
      requestedDate: "2026-02-03",
      emManagerComments: "Focus on supply constraints and risks.",
      assigneeComments: "Uploaded forecast. Please review the updated assumptions.",
      phaseId: 2,
      closed: false
    } satisfies Partial<ForecastCycleRow>);
  }

  if (s1[2]) {
    Object.assign(s1[2], {
      requestedBy: "EM Manager A",
      requestedDate: "2026-03-03",
      emManagerComments: "March cycle created and queued.",
      phaseId: 0,
      closed: false
    } satisfies Partial<ForecastCycleRow>);
  }

  if (s1[3]) {
    Object.assign(s1[3], {
      requestedBy: "EM Manager A",
      requestedDate: "2026-04-03",
      emManagerComments: "April cycle scheduled.",
      phaseId: 0,
      closed: false
    } satisfies Partial<ForecastCycleRow>);
  }

  if (s1[4]) {
    Object.assign(s1[4], {
      requestedBy: "EM Manager A",
      requestedDate: "2026-05-03",
      emManagerComments: "May cycle scheduled.",
      phaseId: 0,
      closed: false
    } satisfies Partial<ForecastCycleRow>);
  }

  if (s2[0]) {
    Object.assign(s2[0], {
      requestedBy: "EM Manager A",
      requestedDate: "2026-01-05",
      emManagerComments: "Q1 kickoff.",
      phaseId: 0,
      closed: false
    } satisfies Partial<ForecastCycleRow>);
  }

  return cycles;
}

export const BASE_CYCLES: ForecastCycleRow[] = seededCycles();
