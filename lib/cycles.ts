import type { SetupRow, Recurrence, TpmSubmissionScheduleRule, PoSubmissionScheduleRule, Weekday } from "./setups";
import { DEFAULT_INITIATION_SCHEDULE, DEFAULT_PO_SUBMISSION_SCHEDULE, DEFAULT_PREPARATION_DUE_SCHEDULE, DEFAULT_REVIEW_DUE_SCHEDULE } from "./setups";
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
  poSubmissionDue?: string; // YYYY-MM-DD

  sentToTpm?: boolean;
  sentToTpmDate?: string; // YYYY-MM-DD
  tpmConfirmedDate?: string; // YYYY-MM-DD
  tpmOutcome?: "approved" | "changes_requested";
  tpmChangeRequest?: string;
  poTrackedByAutomation?: boolean;
  poAutomationCapturedAt?: string; // YYYY-MM-DD
  poAutomationMailbox?: string;
  poAutomationEmailSubject?: string;
  poAutomationAttachmentSaved?: boolean;
  poSubmittedViaOutlook?: boolean;
  poEmailSentDate?: string; // YYYY-MM-DD
  poAcknowledgementReceived?: "Yes" | "No";
  poAcknowledgedDate?: string; // YYYY-MM-DD
  poOriginalRequestedDateSame?: "Yes" | "No" | "Mixed";
  poAcknowledgementComments?: string;
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

function addDaysIso(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  date.setUTCDate(date.getUTCDate() + Math.floor(days));
  return formatIsoDate(date);
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

function computePoSubmissionDueDate(
  recurrence: Recurrence,
  rule: PoSubmissionScheduleRule,
  periodStart: Date,
  periodEnd: Date,
  tpmSubmissionDue: string
) {
  if (rule.type === "DaysAfterForecastSubmission") {
    return addDaysIso(tpmSubmissionDue, rule.daysAfter);
  }

  return computeScheduledDueDate(recurrence, rule, periodStart, periodEnd);
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
    const poSubmissionDue = computePoSubmissionDueDate(
      setup.recurrence,
      setup.poSubmissionSchedule ?? DEFAULT_PO_SUBMISSION_SCHEDULE,
      periodStart,
      periodEnd,
      tpmSubmissionDue
    );
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
      poSubmissionDue,
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

  const completeSeedCycle = (cycle: ForecastCycleRow) => {
    const periodLabel = cycle.label.split(" - ")[0] ?? cycle.cycleStart;
    const subjectPeriod = periodLabel.replace(/\s+/g, " ");

    Object.assign(cycle, {
      requestedBy: cycle.requestedBy ?? "Seeded historical data",
      requestedDate: cycle.requestedDate ?? cycle.cycleStart,
      emManagerComments: `Historical seeded forecast for ${subjectPeriod} completed on time.`,
      assigneeComments: "Final forecast approved and published.",
      sentToTpm: true,
      sentToTpmDate: cycle.tpmSubmissionDue,
      tpmConfirmedDate: cycle.tpmConfirmedDate ?? cycle.tpmSubmissionDue,
      tpmOutcome: "approved",
      poTrackedByAutomation: true,
      poAutomationCapturedAt: cycle.poAutomationCapturedAt ?? cycle.tpmSubmissionDue,
      poAutomationMailbox: cycle.poAutomationMailbox ?? "po-submissions@abbvie.example",
      poAutomationEmailSubject: cycle.poAutomationEmailSubject ?? `PO Submission | ${cycle.tpm} | ${cycle.products.join(", ")} | ${subjectPeriod}`,
      poAutomationAttachmentSaved: true,
      poSubmittedViaOutlook: true,
      poEmailSentDate: cycle.poEmailSentDate ?? cycle.poSubmissionDue ?? cycle.tpmSubmissionDue,
      poAcknowledgementReceived: "Yes",
      poAcknowledgedDate: cycle.poAcknowledgedDate ?? cycle.poSubmissionDue ?? cycle.tpmSubmissionDue,
      phaseId: 4,
      forecastPdfHref: cycle.forecastPdfHref ?? forecastFolderRoute(cycle.id),
      closed: true
    } satisfies Partial<ForecastCycleRow>);
  };

  // Make a few seeds feel realistic and easy to understand in the UI.
  const bySetup = (setupId: string) => cycles.filter((c) => c.setupId === setupId).sort((a, b) => a.cycleStart.localeCompare(b.cycleStart));
  const s1 = bySetup("FS-001");
  const s2 = bySetup("FS-002");
  const s3 = bySetup("FS-003");
  const s4 = bySetup("FS-004");
  const s5 = bySetup("FS-005");

  if (s1[0]) {
    Object.assign(s1[0], {
      requestedBy: "EM Manager A",
      requestedDate: "2026-01-03",
      emManagerComments: "Please align assumptions with last cycle and highlight key drivers.",
      sentToTpm: true,
      sentToTpmDate: "2026-01-24",
      tpmConfirmedDate: "2026-01-25",
      tpmOutcome: "approved",
      poTrackedByAutomation: true,
      poAutomationCapturedAt: "2026-01-25",
      poAutomationMailbox: "po-submissions@abbvie.example",
      poAutomationEmailSubject: "PO Submission | TPM A | Product A | Jan 2026",
      poAutomationAttachmentSaved: true,
      poSubmittedViaOutlook: true,
      poEmailSentDate: "2026-01-25",
      poAcknowledgementReceived: "Yes",
      poAcknowledgedDate: "2026-01-27",
      phaseId: 4,
      forecastPdfHref: forecastFolderRoute(s1[0].id),
      closed: true
    } satisfies Partial<ForecastCycleRow>);
  }

  if (s1[1]) {
    Object.assign(s1[1], {
      requestedBy: "EM Manager A",
      requestedDate: "2026-02-03",
      emManagerComments: "Forecast completed and TPM acknowledged the submitted PO.",
      assigneeComments: "Final forecast approved and published.",
      sentToTpm: true,
      sentToTpmDate: "2026-02-24",
      tpmConfirmedDate: "2026-02-25",
      tpmOutcome: "approved",
      poTrackedByAutomation: true,
      poAutomationCapturedAt: "2026-02-25",
      poAutomationMailbox: "po-submissions@abbvie.example",
      poAutomationEmailSubject: "PO Submission | TPM A | Product A | Feb 2026",
      poAutomationAttachmentSaved: true,
      poSubmittedViaOutlook: true,
      poEmailSentDate: "2026-02-25",
      poAcknowledgementReceived: "Yes",
      poAcknowledgedDate: "2026-02-27",
      phaseId: 4,
      forecastPdfHref: forecastFolderRoute(s1[1].id),
      closed: true
    } satisfies Partial<ForecastCycleRow>);
  }

  if (s1[2]) {
    Object.assign(s1[2], {
      requestedBy: "EM Manager A",
      requestedDate: "2026-03-03",
      emManagerComments: "Forecast completed and TPM acknowledged the submitted PO.",
      assigneeComments: "Final forecast approved and published.",
      sentToTpm: true,
      sentToTpmDate: "2026-03-24",
      tpmConfirmedDate: "2026-03-25",
      tpmOutcome: "approved",
      poTrackedByAutomation: true,
      poAutomationCapturedAt: "2026-03-25",
      poAutomationMailbox: "po-submissions@abbvie.example",
      poAutomationEmailSubject: "PO Submission | TPM A | Product A | Mar 2026",
      poAutomationAttachmentSaved: true,
      poSubmittedViaOutlook: true,
      poEmailSentDate: "2026-03-25",
      poAcknowledgementReceived: "Yes",
      poAcknowledgedDate: "2026-03-27",
      phaseId: 4,
      forecastPdfHref: forecastFolderRoute(s1[2].id),
      closed: true
    } satisfies Partial<ForecastCycleRow>);
  }

  if (s1[3]) {
    Object.assign(s1[3], {
      requestedBy: "EM Manager A",
      requestedDate: "2026-04-03",
      emManagerComments: "Forecast completed and TPM acknowledged the submitted PO.",
      assigneeComments: "Final forecast approved and published.",
      sentToTpm: true,
      sentToTpmDate: "2026-04-24",
      tpmConfirmedDate: "2026-04-25",
      tpmOutcome: "approved",
      poTrackedByAutomation: true,
      poAutomationCapturedAt: "2026-04-25",
      poAutomationMailbox: "po-submissions@abbvie.example",
      poAutomationEmailSubject: "PO Submission | TPM A | Product A | Apr 2026",
      poAutomationAttachmentSaved: true,
      poSubmittedViaOutlook: true,
      poEmailSentDate: "2026-04-25",
      poAcknowledgementReceived: "Yes",
      poAcknowledgedDate: "2026-04-28",
      phaseId: 4,
      forecastPdfHref: forecastFolderRoute(s1[3].id),
      closed: true
    } satisfies Partial<ForecastCycleRow>);
  }

  if (s1[4]) {
    Object.assign(s1[4], {
      requestedBy: "EM Manager A",
      requestedDate: "2026-05-03",
      emManagerComments: "Forecast completed and PO sent, but TPM acknowledgment is still pending.",
      assigneeComments: "Final forecast approved and published.",
      sentToTpm: true,
      sentToTpmDate: "2026-05-24",
      tpmConfirmedDate: "2026-05-25",
      tpmOutcome: "approved",
      poTrackedByAutomation: true,
      poAutomationCapturedAt: "2026-05-25",
      poAutomationMailbox: "po-submissions@abbvie.example",
      poAutomationEmailSubject: "PO Submission | TPM A | Product A | May 2026",
      poAutomationAttachmentSaved: true,
      poSubmittedViaOutlook: true,
      poEmailSentDate: "2026-05-25",
      poAcknowledgementReceived: "No",
      poAcknowledgedDate: undefined,
      phaseId: 4,
      forecastPdfHref: forecastFolderRoute(s1[4].id),
      closed: true
    } satisfies Partial<ForecastCycleRow>);
  }

  if (s1[5]) {
    Object.assign(s1[5], {
      requestedBy: "EM Manager A",
      requestedDate: "2026-06-02",
      emManagerComments: "Current June cycle is in progress with forecast preparation underway.",
      assigneeComments: "Current working forecast is being prepared.",
      sentToTpm: undefined,
      sentToTpmDate: undefined,
      tpmConfirmedDate: undefined,
      tpmOutcome: undefined,
      poTrackedByAutomation: undefined,
      poAutomationCapturedAt: undefined,
      poAutomationMailbox: undefined,
      poAutomationEmailSubject: undefined,
      poAutomationAttachmentSaved: undefined,
      poSubmittedViaOutlook: undefined,
      poEmailSentDate: undefined,
      poAcknowledgementReceived: undefined,
      poAcknowledgedDate: undefined,
      forecastPdfHref: undefined,
      phaseId: 1,
      closed: false
    } satisfies Partial<ForecastCycleRow>);
  }

  for (const [index, cycle] of s1.entries()) {
    if (index < 6 || !cycle) continue;

    const monthName = cycle.label.split(" ")[0] ?? "Upcoming";

    Object.assign(cycle, {
      requestedBy: "EM Manager A",
      requestedDate: cycle.cycleStart,
      emManagerComments: `${monthName} cycle is pre-seeded as a future Phase 1 example.`,
      assigneeComments: undefined,
      sentToTpm: undefined,
      sentToTpmDate: undefined,
      tpmConfirmedDate: undefined,
      tpmOutcome: undefined,
      poTrackedByAutomation: undefined,
      poAutomationCapturedAt: undefined,
      poAutomationMailbox: undefined,
      poAutomationEmailSubject: undefined,
      poAutomationAttachmentSaved: undefined,
      poSubmittedViaOutlook: undefined,
      poEmailSentDate: undefined,
      poAcknowledgementReceived: undefined,
      poAcknowledgedDate: undefined,
      forecastPdfHref: undefined,
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

  if (s3[8]) {
    Object.assign(s3[8], {
      requestedBy: "EM Manager C",
      requestedDate: "2026-03-30",
      emManagerComments: "April packaging cycle initiated.",
      assigneeComments: "Draft uploaded for TPM review.",
      sentToTpm: true,
      sentToTpmDate: "2026-04-10",
      phaseId: 3,
      closed: false
    } satisfies Partial<ForecastCycleRow>);
  }

  if (s3[9]) {
    Object.assign(s3[9], {
      requestedBy: "EM Manager C",
      requestedDate: "2026-04-29",
      emManagerComments: "May cycle awaiting EM review.",
      assigneeComments: "Packaging assumptions refreshed.",
      phaseId: 2,
      closed: false
    } satisfies Partial<ForecastCycleRow>);
  }

  if (s4[2]) {
    Object.assign(s4[2], {
      requestedBy: "EM Manager A",
      requestedDate: "2026-04-01",
      emManagerComments: "API cycle due this month.",
      sentToTpm: true,
      sentToTpmDate: "2026-04-24",
      tpmConfirmedDate: "2026-04-28",
      tpmOutcome: "approved",
      poTrackedByAutomation: true,
      poAutomationCapturedAt: "2026-04-29",
      poAutomationMailbox: "po-submissions@abbvie.example",
      poAutomationEmailSubject: "PO Submission | TPM D | Product D | Apr 2026",
      poAutomationAttachmentSaved: true,
      poSubmittedViaOutlook: true,
      poEmailSentDate: "2026-04-29",
      poAcknowledgementReceived: "No",
      phaseId: 4,
      forecastPdfHref: forecastFolderRoute(s4[2].id),
      closed: true
    } satisfies Partial<ForecastCycleRow>);
  }

  if (s4[3]) {
    Object.assign(s4[3], {
      requestedBy: "EM Manager A",
      requestedDate: "2026-05-02",
      emManagerComments: "May API cycle just opened.",
      phaseId: 1,
      closed: false
    } satisfies Partial<ForecastCycleRow>);
  }

  if (s5[2]) {
    Object.assign(s5[2], {
      requestedBy: "EM Manager B",
      requestedDate: "2026-03-31",
      emManagerComments: "Q2 BDS cycle approved and sent.",
      assigneeComments: "Quarterly forecast published.",
      sentToTpm: true,
      sentToTpmDate: "2026-06-18",
      tpmConfirmedDate: "2026-06-20",
      tpmOutcome: "approved",
      poSubmittedViaOutlook: true,
      poEmailSentDate: "2026-06-20",
      poAcknowledgementReceived: "Yes",
      poAcknowledgedDate: "2026-06-23",
      phaseId: 4,
      forecastPdfHref: forecastFolderRoute(s5[2].id),
      closed: true
    } satisfies Partial<ForecastCycleRow>);
  }

  for (const cycle of cycles) {
    if (cycle.tpmSubmissionDue <= "2026-06-30") {
      completeSeedCycle(cycle);
    }
  }

  return cycles;
}

export const BASE_CYCLES: ForecastCycleRow[] = seededCycles();
