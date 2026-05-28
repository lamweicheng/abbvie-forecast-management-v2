import type { ForecastCycleRow } from "./cycles";
import { getPurchaseOrderAutomationStatus, getPurchaseOrderStatus } from "./purchaseOrders";
import {
  describeTpmSubmissionScheduleSummary,
  formatContractEffectiveDates,
  formatFirmPeriod,
  formatProductsLabel,
  formatRollingForecastHorizon,
  type SetupRow
} from "./setups";

type MetricSummary = {
  label: string;
  value: string;
  detail?: string;
  tone?: "slate" | "sky" | "amber" | "emerald" | "rose";
};

type MetricTableRow = {
  metric: string;
  value: string;
  detail?: string;
};

export type MetricsDashboardData = {
  headline: MetricSummary[];
  forecastMetrics: MetricTableRow[];
  poMetrics: MetricTableRow[];
  recommendedMetrics: string[];
};

export type CentralDueRow = {
  id: string;
  instance: string;
  tpm: string;
  dueDate: string;
  currentPhase: string;
  currentPhaseId: number;
  status: string;
  overdue: boolean;
};

export type CentralExpirationRow = {
  setupId: string;
  tpm: string;
  pillar: string;
  products: string;
  endDate: string;
  daysRemaining: number;
};

export type CentralDashboardData = {
  headline: MetricSummary[];
  dueThisMonthRows: CentralDueRow[];
  dueNextThreeMonthsRows: CentralDueRow[];
  upcomingExpirations: CentralExpirationRow[];
  setupSummaryRows: CentralSetupSummaryRow[];
};

export type CentralSetupSummaryRow = {
  setupId: string;
  tpm: string;
  products: string;
  recurrence: string;
  rollingForecastHorizon: string;
  firmPeriod: string;
  bindingPeriod: string;
  tpmSubmissionDueDate: string;
  contractEffectiveDates: string;
};

function formatRatio(numerator: number, denominator: number) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function parseIsoDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

function withinRange(dateValue: string | undefined, start: Date, end: Date) {
  const date = parseIsoDate(dateValue);
  if (!date) return false;
  return date >= start && date <= end;
}

function phaseName(phaseId: number, closed: boolean) {
  if (closed) return "Completed";
  if (phaseId === 0) return "Phase 1";
  if (phaseId === 1) return "Phase 2";
  if (phaseId === 2) return "Phase 3";
  if (phaseId === 3) return "Phase 4";
  return "Phase 5";
}

function isOnOrBefore(actual?: string, due?: string) {
  if (!actual || !due) return false;
  return actual <= due;
}

function isAfter(actual?: string, due?: string) {
  if (!actual || !due) return false;
  return actual > due;
}

function dayDifference(start?: string, end?: string) {
  if (!start || !end) return null;
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const diff = endDate.getTime() - startDate.getTime();
  if (Number.isNaN(diff)) return null;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatAverageDays(values: number[]) {
  const avg = average(values);
  if (avg === null) return "—";
  return `${avg.toFixed(1)} days`;
}

function forecastSubmitted(cycle: ForecastCycleRow) {
  return Boolean(cycle.sentToTpm || cycle.sentToTpmDate);
}

function forecastCompleted(cycle: ForecastCycleRow) {
  return Boolean(cycle.closed && cycle.forecastPdfHref);
}

export function buildMetricsDashboard(cycles: ForecastCycleRow[], setupCount: number): MetricsDashboardData {
  const totalInstances = cycles.length;
  const completedForecasts = cycles.filter(forecastCompleted).length;
  const openForecasts = totalInstances - completedForecasts;
  const forecastSubmittedCount = cycles.filter(forecastSubmitted).length;
  const onTimeForecastSubmissions = cycles.filter((cycle) => isOnOrBefore(cycle.sentToTpmDate, cycle.tpmSubmissionDue)).length;
  const lateForecastSubmissions = cycles.filter((cycle) => isAfter(cycle.sentToTpmDate, cycle.tpmSubmissionDue)).length;
  const inReviewCount = cycles.filter((cycle) => cycle.phaseId === 2 && !cycle.closed).length;
  const awaitingTpmConfirmationCount = cycles.filter((cycle) => cycle.phaseId === 4 && !cycle.closed).length;
  const tpmChangeRequestedCount = cycles.filter((cycle) => cycle.tpmOutcome === "changes_requested").length;
  const forecastLeadTimes = cycles
    .map((cycle) => dayDifference(cycle.requestedDate, cycle.sentToTpmDate))
    .filter((value): value is number => value !== null);

  const submittedPOCycles = cycles.filter((cycle) => getPurchaseOrderStatus(cycle) !== "Not Submitted");
  const poSubmittedCount = submittedPOCycles.length;
  const poNotSubmittedCount = totalInstances - poSubmittedCount;
  const poSubmittedNotAcknowledgedCount = cycles.filter(
    (cycle) => getPurchaseOrderStatus(cycle) === "Submitted - Not Acknowledged"
  ).length;
  const poSubmittedAcknowledgedCount = cycles.filter(
    (cycle) => getPurchaseOrderStatus(cycle) === "Submitted - Acknowledged"
  ).length;
  const onTimePoSubmissions = cycles.filter((cycle) => isOnOrBefore(cycle.poEmailSentDate, cycle.tpmSubmissionDue)).length;
  const latePoSubmissions = cycles.filter((cycle) => isAfter(cycle.poEmailSentDate, cycle.tpmSubmissionDue)).length;
  const autoTrackedPOs = cycles.filter(
    (cycle) => getPurchaseOrderAutomationStatus(cycle) === "Automated"
  ).length;
  const manualPOTrackingRequired = totalInstances - autoTrackedPOs;
  const poAcknowledgementTimes = cycles
    .map((cycle) => dayDifference(cycle.poEmailSentDate, cycle.poAcknowledgedDate))
    .filter((value): value is number => value !== null);
  const attachmentsSavedToFolder = cycles.filter((cycle) => cycle.poAutomationAttachmentSaved).length;

  return {
    headline: [
      {
        label: "Active setups",
        value: String(setupCount),
        detail: `${totalInstances} forecast instances in scope`,
        tone: "slate"
      },
      {
        label: "Forecast completion rate",
        value: formatRatio(completedForecasts, totalInstances),
        detail: `${completedForecasts} of ${totalInstances} forecasts completed`,
        tone: "sky"
      },
      {
        label: "On-time forecast submission",
        value: formatRatio(onTimeForecastSubmissions, forecastSubmittedCount),
        detail: `${onTimeForecastSubmissions} on time, ${lateForecastSubmissions} late`,
        tone: onTimeForecastSubmissions >= lateForecastSubmissions ? "emerald" : "amber"
      },
      {
        label: "On-time PO submission",
        value: formatRatio(onTimePoSubmissions, poSubmittedCount),
        detail: `${poSubmittedAcknowledgedCount} acknowledged, ${poSubmittedNotAcknowledgedCount} still pending`,
        tone: poSubmittedAcknowledgedCount >= poSubmittedNotAcknowledgedCount ? "emerald" : "amber"
      }
    ],
    forecastMetrics: [
      {
        metric: "Total forecast instances",
        value: String(totalInstances),
        detail: `${openForecasts} open and ${completedForecasts} completed`
      },
      {
        metric: "Forecasts submitted to TPM",
        value: String(forecastSubmittedCount),
        detail: `${formatRatio(forecastSubmittedCount, totalInstances)} of all instances have been sent to TPM`
      },
      {
        metric: "On-time forecast submission",
        value: String(onTimeForecastSubmissions),
        detail: `${lateForecastSubmissions} late against TPM due date`
      },
      {
        metric: "Forecasts currently in EM review",
        value: String(inReviewCount),
        detail: "Instances sitting in Phase 3 review"
      },
      {
        metric: "Awaiting TPM confirmation",
        value: String(awaitingTpmConfirmationCount),
        detail: "Instances sent to TPM and waiting for final outcome"
      },
      {
        metric: "Average request-to-submission cycle time",
        value: formatAverageDays(forecastLeadTimes),
        detail: "From instance request date to date sent to TPM"
      },
      {
        metric: "TPM change requests",
        value: String(tpmChangeRequestedCount),
        detail: "Forecasts that required rework after TPM feedback"
      }
    ],
    poMetrics: [
      {
        metric: "POs submitted",
        value: String(poSubmittedCount),
        detail: `${poNotSubmittedCount} not submitted yet`
      },
      {
        metric: "Submitted - Not Acknowledged",
        value: String(poSubmittedNotAcknowledgedCount),
        detail: "POs sent but still waiting on TPM response"
      },
      {
        metric: "Submitted - Acknowledged",
        value: String(poSubmittedAcknowledgedCount),
        detail: "POs acknowledged by TPM"
      },
      {
        metric: "On-time PO submission",
        value: String(onTimePoSubmissions),
        detail: `${latePoSubmissions} late against the current due date in the workflow`
      },
      {
        metric: "Automated PO tracking coverage",
        value: formatRatio(autoTrackedPOs, totalInstances),
        detail: `${autoTrackedPOs} automated, ${manualPOTrackingRequired} requiring manual entry`
      },
      {
        metric: "Attachment saved to PO folder",
        value: String(attachmentsSavedToFolder),
        detail: "PO emails where automation saved an artifact to the folder"
      },
      {
        metric: "Average days to TPM acknowledgement",
        value: formatAverageDays(poAcknowledgementTimes),
        detail: "From PO sent date to TPM acknowledgement date"
      }
    ],
    recommendedMetrics: [
      "Forecast file upload timestamp to measure preparer turnaround before review starts.",
      "EM review completed timestamp to separate review-cycle speed from TPM response time.",
      "Dedicated PO due date so PO timeliness is measured independently from the forecast submission due date.",
      "TPM acknowledgement SLA target date to flag overdue acknowledgements automatically.",
      "Automation exception reason to track why a PO email was not matched by the shared mailbox flow.",
      "Final forecast publish timestamp to measure closeout speed after TPM acknowledgement."
    ]
  };
}

export function buildCentralDashboard(
  cycles: ForecastCycleRow[],
  setups: SetupRow[],
  pillar: string,
  today: Date = new Date()
): CentralDashboardData {
  const scopedCycles = pillar === "All"
    ? cycles
    : cycles.filter((cycle) => cycle.pillar === pillar);
  const scopedSetups = pillar === "All"
    ? setups
    : setups.filter((setup) => setup.pillar === pillar);

  const thisMonthStart = startOfMonth(today);
  const thisMonthEnd = endOfMonth(today);
  const threeMonthsEnd = endOfMonth(addMonths(today, 2));
  const expirationEnd = addMonths(today, 3);

  const mapDueRow = (cycle: ForecastCycleRow) => {
      const dueDate = parseIsoDate(cycle.tpmSubmissionDue);
      const isOverdue = Boolean(dueDate && dueDate < today && !cycle.closed);

      return {
        id: cycle.id,
        instance: cycle.label,
        tpm: cycle.tpm,
        dueDate: cycle.tpmSubmissionDue,
        currentPhase: phaseName(cycle.phaseId, cycle.closed),
        currentPhaseId: cycle.phaseId,
        status: isOverdue ? "Overdue" : cycle.closed ? "Completed" : "On Track",
        overdue: isOverdue
      };
    };

  const dueThisMonthRows = scopedCycles
    .filter((cycle) => withinRange(cycle.tpmSubmissionDue, thisMonthStart, thisMonthEnd))
    .sort((a, b) => a.tpmSubmissionDue.localeCompare(b.tpmSubmissionDue))
    .map(mapDueRow);

  const dueNextThreeMonthsRows = scopedCycles
    .filter((cycle) => withinRange(cycle.tpmSubmissionDue, thisMonthStart, threeMonthsEnd))
    .sort((a, b) => a.tpmSubmissionDue.localeCompare(b.tpmSubmissionDue))
    .map(mapDueRow);

  const dueInThreeMonthsCount = dueNextThreeMonthsRows.length;
  const forecastSubmittedCount = scopedCycles.filter(forecastSubmitted).length;
  const onTimeForecastSubmissions = scopedCycles.filter((cycle) => isOnOrBefore(cycle.sentToTpmDate, cycle.tpmSubmissionDue)).length;

  const upcomingExpirations = scopedSetups
    .map((setup) => {
      const daysRemaining = dayDifference(new Date().toISOString().slice(0, 10), setup.endDate);
      return {
        setupId: setup.id,
        tpm: setup.tpm,
        pillar: setup.pillar,
        products: formatProductsLabel(setup.products),
        endDate: setup.endDate,
        daysRemaining: daysRemaining ?? 0
      };
    })
    .filter((setup) => withinRange(setup.endDate, thisMonthStart, expirationEnd) || setup.daysRemaining <= 90)
    .sort((a, b) => a.endDate.localeCompare(b.endDate));

  const setupSummaryRows = scopedSetups
    .sort((a, b) => a.tpm.localeCompare(b.tpm))
    .map((setup) => ({
      setupId: setup.id,
      tpm: setup.tpm,
      products: formatProductsLabel(setup.products),
      recurrence: setup.recurrence,
      rollingForecastHorizon: formatRollingForecastHorizon(setup.rollingForecastHorizon),
      firmPeriod: formatFirmPeriod(setup.firmPeriod),
      bindingPeriod: setup.bindingPeriod || "—",
      tpmSubmissionDueDate: describeTpmSubmissionScheduleSummary(setup.tpmSubmissionSchedule, setup.recurrence),
      contractEffectiveDates: formatContractEffectiveDates(setup.startDate, setup.endDate)
    }));

  return {
    headline: [
      {
        label: "Forecasts due this month",
        value: String(dueThisMonthRows.length),
        detail: pillar === "All" ? "Across all pillars" : `For ${pillar}`,
        tone: dueThisMonthRows.length > 0 ? "sky" : "slate"
      },
      {
        label: "Forecasts due in 3 months",
        value: String(dueInThreeMonthsCount),
        detail: "Current month through the next 2 months",
        tone: "slate"
      },
      {
        label: "Upcoming contract expirations",
        value: String(upcomingExpirations.length),
        detail: "Setups ending in the next 90 days",
        tone: upcomingExpirations.length > 0 ? "amber" : "emerald"
      },
      {
        label: "% On-Time Forecast Submission",
        value: formatRatio(onTimeForecastSubmissions, forecastSubmittedCount),
        detail: `${onTimeForecastSubmissions} on time out of ${forecastSubmittedCount} submitted`,
        tone: onTimeForecastSubmissions === forecastSubmittedCount ? "emerald" : "amber"
      }
    ],
    dueThisMonthRows,
    dueNextThreeMonthsRows,
    upcomingExpirations,
    setupSummaryRows
  };
}

export type { MetricSummary, MetricTableRow };