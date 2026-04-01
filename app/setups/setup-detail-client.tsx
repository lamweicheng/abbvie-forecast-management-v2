"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { PHASES } from "../../lib/phases";
import { forecastFolderRoute } from "../../lib/forecastFolders";
import {
  BASE_SETUPS,
  DEFAULT_INITIATION_SCHEDULE,
  DEFAULT_PREPARATION_DUE_SCHEDULE,
  DEFAULT_REVIEW_DUE_SCHEDULE,
  formatProductsLabel,
  type Recurrence,
  type TpmSubmissionScheduleRule
} from "../../lib/setups";
import { BASE_CYCLES, type ForecastCycleRow } from "../../lib/cycles";
import { useSessionData } from "../SessionDataProvider";

function mergeById<T extends { id: string }>(base: T[], upsertsById: Record<string, T>) {
  const merged: T[] = base.map((r) => upsertsById[r.id] ?? r);
  const extra = Object.values(upsertsById).filter((r) => !base.some((b) => b.id === r.id));
  return [...merged, ...extra];
}

function phaseLabel(phaseId: ForecastCycleRow["phaseId"]) {
  const phase = PHASES.find((p) => p.id === phaseId);
  return phase ? phase.name : `Phase ${phaseId + 1}`;
}

function currentPhaseBadge(row: ForecastCycleRow) {
  const completed = Boolean(row.closed && row.forecastPdfHref);
  if (completed) {
    return {
      label: "Completed",
      detail: "Forecast folder available",
      cls: "border-emerald-300 bg-emerald-50 text-emerald-900"
    };
  }

  const phase = phaseLabel(row.phaseId);
  return {
    label: `Phase ${row.phaseId + 1}`,
    detail: phase,
    cls: "border-slate-300 bg-slate-50 text-slate-900"
  };
}

const MONTH_NAMES = [
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
  "December"
];

function describeTpmSchedule(rule: TpmSubmissionScheduleRule, recurrence: Recurrence) {
  const ordinal = (n: number) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n}st`;
    if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
    if (mod10 === 3 && mod100 !== 13) return `${n}rd`;
    return `${n}th`;
  };

  if (recurrence === "Monthly") {
    if (rule.type === "FixedCalendarDate") return `${ordinal(rule.dayOfMonth)} of each month`;
    if (rule.type === "NthWeekdayOfMonth") return `${ordinal(rule.nth)} ${rule.weekday} of each month`;
    if (rule.type === "FollowingWeekdayAfterNthWeekdayOfMonth") {
      return `${rule.followingWeekday} following the ${ordinal(rule.nth)} ${rule.anchorWeekday} of each month`;
    }
    return `Last ${rule.weekday} of each month`;
  }

  if (recurrence === "Quarterly") {
    const monthInQuarter = rule.periodMonthInQuarter ?? 3;
    const label = monthInQuarter === 1 ? "first" : monthInQuarter === 2 ? "second" : "last";
    if (rule.type === "FixedCalendarDate") return `${ordinal(rule.dayOfMonth)} of the ${label} month of each quarter`;
    if (rule.type === "NthWeekdayOfMonth") return `${ordinal(rule.nth)} ${rule.weekday} of the ${label} month of each quarter`;
    if (rule.type === "FollowingWeekdayAfterNthWeekdayOfMonth") {
      return `${rule.followingWeekday} following the ${ordinal(rule.nth)} ${rule.anchorWeekday} of the ${label} month of each quarter`;
    }
    return `Last ${rule.weekday} of the ${label} month of each quarter`;
  }

  const monthOfYear = rule.periodMonthOfYear ?? 3;
  const monthName = MONTH_NAMES[monthOfYear - 1] ?? "March";
  if (rule.type === "FixedCalendarDate") return `${monthName} ${ordinal(rule.dayOfMonth)} of each year`;
  if (rule.type === "NthWeekdayOfMonth") return `${ordinal(rule.nth)} ${rule.weekday} of ${monthName} each year`;
  if (rule.type === "FollowingWeekdayAfterNthWeekdayOfMonth") {
    return `${rule.followingWeekday} following the ${ordinal(rule.nth)} ${rule.anchorWeekday} of ${monthName} each year`;
  }
  return `Last ${rule.weekday} of ${monthName} each year`;
}

export function SetupDetailClient({ setupId }: { setupId: string }) {
  const router = useRouter();
  const { setupsById, cyclesById } = useSessionData();

  const allSetups = useMemo(() => mergeById(BASE_SETUPS, setupsById), [setupsById]);
  const allCycles = useMemo(() => mergeById(BASE_CYCLES, cyclesById), [cyclesById]);

  const setup = useMemo(() => allSetups.find((s) => s.id === setupId) ?? null, [allSetups, setupId]);

  const cycles = useMemo(() => {
    return allCycles
      .filter((c) => c.setupId === setupId)
      .sort((a, b) => a.cycleStart.localeCompare(b.cycleStart));
  }, [allCycles, setupId]);

  if (!setup) {
    return (
      <div className="border border-slate-300 bg-white p-6">
        <div className="text-lg font-semibold text-slate-900">Setup not found</div>
        <div className="mt-1 text-sm text-slate-600">This setup may not exist in the current session.</div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="border-b border-slate-500 bg-[#3a3a3a] px-4 py-4 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{setup.pillar} - {setup.tpm} - {formatProductsLabel(setup.products)}</h1>
            <div className="mt-3 space-y-1 text-sm text-slate-200">
              <div>
                <span className="font-medium">Forecast Cadence:</span> {setup.recurrence}
              </div>
              {setup.tpmLocation ? (
                <div>
                  <span className="font-medium">TPM Location:</span> {setup.tpmLocation}
                </div>
              ) : null}
              {setup.tpmPreviousCompanyName ? (
                <div>
                  <span className="font-medium">TPM Previous Company Name (if applicable):</span> {setup.tpmPreviousCompanyName}
                </div>
              ) : null}
              {setup.bindingPeriod ? (
                <div>
                  <span className="font-medium">Binding Period:</span> {setup.bindingPeriod}
                </div>
              ) : null}
              {typeof setup.firmPeriod === "number" ? (
                <div>
                  <span className="font-medium">Firm Period:</span> {setup.firmPeriod}
                </div>
              ) : null}
              {typeof setup.rollingForecastHorizon === "number" ? (
                <div>
                  <span className="font-medium">Rolling Forecast Horizon:</span> {setup.rollingForecastHorizon}
                </div>
              ) : null}
              <div>
                <span className="font-medium">Contract Start Date:</span> {setup.startDate}
              </div>
              <div>
                <span className="font-medium">Contract End Date:</span> {setup.endDate}
              </div>
              <div>
                <span className="font-medium">Contract end date rule:</span>{" "}
                {setup.endDateMode === "RelativeOffset" && typeof setup.endDateOffsetValue === "number"
                  ? `${setup.endDateOffsetValue} ${setup.endDateOffsetUnit ?? "days"} after contract start date`
                  : "Exact contract end date"}
              </div>
              <div>
                <span className="font-medium">Preparation due rule:</span>{" "}
                {describeTpmSchedule(setup.preparationDueSchedule ?? DEFAULT_PREPARATION_DUE_SCHEDULE, setup.recurrence)}
              </div>
              <div>
                <span className="font-medium">Review due rule:</span>{" "}
                {describeTpmSchedule(setup.reviewDueSchedule ?? DEFAULT_REVIEW_DUE_SCHEDULE, setup.recurrence)}
              </div>
              <div>
                <span className="font-medium">TPM submission rule:</span> {describeTpmSchedule(setup.tpmSubmissionSchedule, setup.recurrence)}
              </div>
              <div>
                <span className="font-medium">Automate forecast instance initiation:</span>{" "}
                {setup.automateInstanceInitiation ? "Yes" : "No"}
              </div>
              <div>
                <span className="font-medium">{setup.automateInstanceInitiation ? "Auto-initiate rule:" : "Reminder to initiate rule:"}</span>{" "}
                {describeTpmSchedule(setup.initiationSchedule ?? DEFAULT_INITIATION_SCHEDULE, setup.recurrence)}
              </div>
            </div>
          </div>

          <div className="text-sm text-slate-200">
            <div>
              <span className="font-medium">GSP Planner(s):</span> {setup.assignees.join(", ")}
            </div>
            <div className="mt-1">
              <span className="font-medium">EM Manager(s):</span> {setup.approvers.join(", ")}
            </div>
            <div className="mt-1">
              <span className="font-medium">Additional Approver(s):</span>{" "}
              {setup.additionalApprovers.length ? setup.additionalApprovers.join(", ") : "—"}
            </div>
            <div className="mt-3 max-w-md rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              If you would like to edit any field in this setup page, please contact BTS for more assistance.
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-300 bg-[#d9d9d9] px-4 py-3">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div className="border border-slate-400 bg-white px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Instances</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{cycles.length}</div>
          </div>
          <div className="border border-slate-400 bg-white px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">GSP Planner(s)</div>
            <div className="mt-1 text-sm font-medium text-slate-900">{setup.assignees.join(", ")}</div>
          </div>
          <div className="border border-slate-400 bg-white px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">EM Manager(s)</div>
            <div className="mt-1 text-sm font-medium text-slate-900">{setup.approvers.join(", ")}</div>
          </div>
          <div className="border border-slate-400 bg-white px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Additional Approver(s)</div>
            <div className="mt-1 text-sm font-medium text-slate-900">
              {setup.additionalApprovers.length ? setup.additionalApprovers.join(", ") : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white">
        <table className="min-w-full border-collapse">
          <thead className="bg-[#708596] text-white">
            <tr>
              <th className="border-r border-slate-400 px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Instance</th>
              <th className="border-r border-slate-400 px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Period</th>
              <th className="border-r border-slate-400 px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Forecast Due Date</th>
              <th className="border-r border-slate-400 px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Current Forecast Phase</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">Forecast Folder</th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((c) => (
              <tr key={c.id} className="border-b-2 border-slate-400 bg-white hover:bg-slate-50">
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-slate-900 whitespace-nowrap">{c.label}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{c.id}</div>
                </td>
                <td className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">{c.cycleStart} - {c.cycleEnd}</td>
                <td className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">{c.tpmSubmissionDue}</td>
                <td className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">
                  {(() => {
                    const b = currentPhaseBadge(c);
                    return (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className={`inline-flex w-fit rounded-sm border px-2 py-1 text-xs font-semibold ${b.cls}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/phases/${c.phaseId}?cycle=${encodeURIComponent(c.id)}`);
                          }}
                        >
                          {b.label}
                        </button>
                        <span className="text-xs text-slate-600 whitespace-nowrap">{b.detail}</span>
                      </div>
                    );
                  })()}
                </td>
                <td className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">
                  {c.closed && c.forecastPdfHref ? (
                    <Link
                      className="font-medium text-slate-900 underline"
                      href={forecastFolderRoute(c.id)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open folder
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}

            {cycles.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={5}>
                  No instances generated for this setup.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 text-xs text-slate-500">
        Click an instance row to open its phase workflow.
      </div>
    </div>
  );
}
