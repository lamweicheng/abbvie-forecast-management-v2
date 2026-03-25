"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { APPROVER_OPTIONS, ASSIGNEE_OPTIONS } from "../../lib/constants";
import type { ForecastCycleRow } from "../../lib/cycles";
import { BASE_CYCLES } from "../../lib/cycles";
import { useSessionCycles, useSessionData } from "../SessionDataProvider";
import { BASE_SETUPS, DEFAULT_BUSINESS_DAYS, type Recurrence, type SetupRow, type TpmSubmissionScheduleRule } from "../../lib/setups";
import {
  PowerCommandBar,
  PowerField,
  PowerInfoStrip,
  PowerMetric,
  PowerPanel,
  PowerPill,
  powerGhostButtonClassName,
  powerInputClassName,
  powerPrimaryButtonClassName,
  powerTextAreaClassName
} from "./phase-ui";

function todayIso() {
  // Use local calendar date (not UTC) so "today" matches user expectation.
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ordinal(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n}st`;
  if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${n}rd`;
  return `${n}th`;
}

function describeRule(rule: TpmSubmissionScheduleRule, recurrence: Recurrence) {
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

  if (recurrence === "Monthly") {
    if (rule.type === "FixedCalendarDate") return `${ordinal(rule.dayOfMonth)} of each month`;
    if (rule.type === "NthWeekdayOfMonth") return `${ordinal(rule.nth)} ${rule.weekday} of each month`;
    return `Last ${rule.weekday} of each month`;
  }

  if (recurrence === "Quarterly") {
    const monthInQuarter = rule.periodMonthInQuarter ?? 3;
    const label = monthInQuarter === 1 ? "first" : monthInQuarter === 2 ? "second" : "last";
    if (rule.type === "FixedCalendarDate") return `${ordinal(rule.dayOfMonth)} of the ${label} month of each quarter`;
    if (rule.type === "NthWeekdayOfMonth") return `${ordinal(rule.nth)} ${rule.weekday} of the ${label} month of each quarter`;
    return `Last ${rule.weekday} of the ${label} month of each quarter`;
  }

  const monthOfYear = rule.periodMonthOfYear ?? 3;
  const monthName = MONTH_NAMES[monthOfYear - 1] ?? "March";
  if (rule.type === "FixedCalendarDate") return `${monthName} ${ordinal(rule.dayOfMonth)} of each year`;
  if (rule.type === "NthWeekdayOfMonth") return `${ordinal(rule.nth)} ${rule.weekday} of ${monthName} each year`;
  return `Last ${rule.weekday} of ${monthName} each year`;
}

function parseIsoUtc(isoDate: string) {
  // ISO date in UI is YYYY-MM-DD. Parse as UTC midnight to avoid TZ drift.
  const [y, m, d] = isoDate.split("-").map((v) => Number(v));
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function diffDays(startIso: string, endIso: string) {
  const start = parseIsoUtc(startIso).getTime();
  const end = parseIsoUtc(endIso).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function isBusinessDayUtc(date: Date) {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

function diffBusinessDays(startIso: string, endIso: string) {
  if (startIso === endIso) return 0;
  const forward = endIso > startIso;
  const from = forward ? startIso : endIso;
  const to = forward ? endIso : startIso;

  const d = parseIsoUtc(from);
  const end = parseIsoUtc(to);
  let count = 0;

  // Count business days in (from, to] to align with diffDays behavior.
  while (d.getTime() < end.getTime()) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getTime() > end.getTime()) break;
    if (isBusinessDayUtc(d)) count += 1;
  }

  return forward ? count : -count;
}

export function Phase0Client({ cycleId, preview = false }: { cycleId?: string; preview?: boolean }) {
  const router = useRouter();
  const { cyclesById, upsertCycle } = useSessionCycles();
  const { setupsById } = useSessionData();

  const today = todayIso();

  const existing = useMemo<ForecastCycleRow | undefined>(() => {
    if (!cycleId) return undefined;
    return cyclesById[cycleId] ?? BASE_CYCLES.find((c) => c.id === cycleId);
  }, [cycleId, cyclesById]);

  const setup = useMemo<SetupRow | undefined>(() => {
    const setupId = existing?.setupId;
    if (!setupId) return undefined;
    return setupsById[setupId] ?? BASE_SETUPS.find((s) => s.id === setupId);
  }, [existing?.setupId, setupsById]);

  const suggestedBusinessDays = setup?.defaultBusinessDays ?? DEFAULT_BUSINESS_DAYS;

  const [assigneeInput, setAssigneeInput] = useState<string>("");
  const [assignees, setAssignees] = useState<string[]>(existing?.assignees ?? []);
  const [approverInput, setApproverInput] = useState<string>("");
  const [approvers, setApprovers] = useState<string[]>(existing?.approvers ?? []);
  const [emManagerComments, setEmManagerComments] = useState<string>(existing?.emManagerComments ?? "");
  const [gspForecastDue, setGspForecastDue] = useState<string>(existing?.gspForecastDue ?? todayIso());
  const [approverReviewDue, setApproverReviewDue] = useState<string>(existing?.approverReviewDue ?? todayIso());
  const [tpmSubmissionDue, setTpmSubmissionDue] = useState<string>(existing?.tpmSubmissionDue ?? todayIso());

  useEffect(() => {
    // When switching between instances, reset local edits.
    setAssigneeInput("");
    setApproverInput("");
    setAssignees(existing?.assignees ?? []);
    setApprovers(existing?.approvers ?? []);
    setEmManagerComments(existing?.emManagerComments ?? "");
    setGspForecastDue(existing?.gspForecastDue ?? todayIso());
    setApproverReviewDue(existing?.approverReviewDue ?? todayIso());
    setTpmSubmissionDue(existing?.tpmSubmissionDue ?? todayIso());
  }, [
    cycleId,
    existing?.id,
    existing?.assignees,
    existing?.approvers,
    existing?.emManagerComments,
    existing?.gspForecastDue,
    existing?.approverReviewDue,
    existing?.tpmSubmissionDue
  ]);

  const defaultDueDates = useMemo(() => {
    return {
      gspForecastDue: existing?.gspForecastDue ?? "",
      approverReviewDue: existing?.approverReviewDue ?? "",
      tpmSubmissionDue: existing?.tpmSubmissionDue ?? ""
    };
  }, [existing?.gspForecastDue, existing?.approverReviewDue, existing?.tpmSubmissionDue]);

  const dueDateChanges = useMemo(() => {
    const changes: Array<{ label: string; defaultValue: string; updatedValue: string }> = [];
    if (!cycleId || !existing) return changes;

    if (defaultDueDates.gspForecastDue && gspForecastDue !== defaultDueDates.gspForecastDue) {
      changes.push({
        label: "Assignee forecast due",
        defaultValue: defaultDueDates.gspForecastDue,
        updatedValue: gspForecastDue
      });
    }

    if (defaultDueDates.approverReviewDue && approverReviewDue !== defaultDueDates.approverReviewDue) {
      changes.push({
        label: "Approver review due",
        defaultValue: defaultDueDates.approverReviewDue,
        updatedValue: approverReviewDue
      });
    }

    if (defaultDueDates.tpmSubmissionDue && tpmSubmissionDue !== defaultDueDates.tpmSubmissionDue) {
      changes.push({
        label: "TPM submission due",
        defaultValue: defaultDueDates.tpmSubmissionDue,
        updatedValue: tpmSubmissionDue
      });
    }

    return changes;
  }, [cycleId, existing, defaultDueDates, gspForecastDue, approverReviewDue, tpmSubmissionDue]);

  const updatedTimeline = useMemo(() => {
    if (!gspForecastDue || !approverReviewDue || !tpmSubmissionDue) return null;
    const prepToReviewDays = diffDays(gspForecastDue, approverReviewDue);
    const reviewToTpmDays = diffDays(approverReviewDue, tpmSubmissionDue);
    const todayToPrepDays = diffDays(today, gspForecastDue);
    const todayToPrepBusinessDays = diffBusinessDays(today, gspForecastDue);
    const prepToReviewBusinessDays = diffBusinessDays(gspForecastDue, approverReviewDue);
    const reviewToTpmBusinessDays = diffBusinessDays(approverReviewDue, tpmSubmissionDue);

    const outOfOrder = prepToReviewDays < 0 || reviewToTpmDays < 0;

    return {
      prepToReviewDays,
      prepToReviewBusinessDays,
      reviewToTpmDays,
      reviewToTpmBusinessDays,
      todayToPrepDays,
      todayToPrepBusinessDays,
      outOfOrder
    };
  }, [gspForecastDue, approverReviewDue, tpmSubmissionDue, today]);

  const persist = (nextPhaseId: ForecastCycleRow["phaseId"]) => {
    if (preview) return;
    if (!cycleId) return;
    if (!existing) return;
    upsertCycle({
      ...existing,
      requestedBy: existing.requestedBy ?? "Record Creator",
      requestedDate: existing.requestedDate ?? todayIso(),
      emManagerComments: emManagerComments || undefined,
      assignees: assignees.length ? assignees : undefined,
      approvers: approvers.length ? approvers : undefined,
      gspForecastDue,
      approverReviewDue,
      tpmSubmissionDue,
      phaseId: nextPhaseId
    });
  };

  const addAssignee = () => {
    const next = assigneeInput.trim();
    if (!next) return;
    setAssignees((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setAssigneeInput("");
  };

  const addApprover = () => {
    const next = approverInput.trim();
    if (!next) return;
    setApprovers((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setApproverInput("");
  };

  return (
    <section className="space-y-5">
      {!cycleId ? (
        <PowerInfoStrip tone="amber">
          Open Phase 1 from an instance in a setup.
        </PowerInfoStrip>
      ) : null}

      {setup ? (
        <PowerInfoStrip tone="sky">
          <span className="font-semibold">TPM submission rule:</span> {describeRule(setup.tpmSubmissionSchedule, setup.recurrence)}
        </PowerInfoStrip>
      ) : null}

      <PowerPanel
        title="Ownership and routing"
        tone="sky"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <PowerField label="Assign assignee(s)" hint="Search and add forecast preparers for this instance.">
            <div className="flex items-center gap-2">
              <input
                className={powerInputClassName}
                placeholder="Type to search and add"
                value={assigneeInput}
                onChange={(e) => setAssigneeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAssignee();
                  }
                }}
                disabled={!cycleId || preview}
                list="assignee-options"
              />
              <button
                type="button"
                className={powerGhostButtonClassName}
                onClick={addAssignee}
                disabled={!cycleId || preview}
              >
                Add
              </button>
              <datalist id="assignee-options">
                {ASSIGNEE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>

            {assignees.length === 0 ? (
              <p className="text-sm text-slate-500">No assignees selected.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assignees.map((name) => (
                  <PowerPill key={name}>
                    {name}
                    <button
                      type="button"
                      className="text-slate-500 hover:text-slate-900"
                      onClick={() => setAssignees((prev) => prev.filter((p) => p !== name))}
                      disabled={!cycleId || preview}
                      aria-label={`Remove ${name}`}
                    >
                      ×
                    </button>
                  </PowerPill>
                ))}
              </div>
            )}
          </PowerField>

          <PowerField label="Approvers" hint="Define who can review and approve the submitted forecast.">
            <div className="flex items-center gap-2">
              <input
                className={powerInputClassName}
                placeholder="Type to search and add"
                value={approverInput}
                onChange={(e) => setApproverInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addApprover();
                  }
                }}
                disabled={!cycleId || preview}
                list="approver-options"
              />
              <button
                type="button"
                className={powerGhostButtonClassName}
                onClick={addApprover}
                disabled={!cycleId || preview}
              >
                Add
              </button>
              <datalist id="approver-options">
                {APPROVER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>

            {approvers.length === 0 ? (
              <p className="text-sm text-slate-500">No approvers selected.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {approvers.map((name) => (
                  <PowerPill key={name}>
                    {name}
                    <button
                      type="button"
                      className="text-slate-500 hover:text-slate-900"
                      onClick={() => setApprovers((prev) => prev.filter((p) => p !== name))}
                      disabled={!cycleId || preview}
                      aria-label={`Remove ${name}`}
                    >
                      ×
                    </button>
                  </PowerPill>
                ))}
              </div>
            )}
          </PowerField>
        </div>
      </PowerPanel>

      <PowerPanel
        title="Timeline setup"
        tone="emerald"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PowerField label="Preparation due" hint="Assignee forecast due date.">
            <input
              type="date"
              className={powerInputClassName}
              value={gspForecastDue}
              onChange={(e) => setGspForecastDue(e.target.value)}
              disabled={!cycleId || preview}
            />
          </PowerField>
          <PowerField label="Review due" hint="Approver review due date.">
            <input
              type="date"
              className={powerInputClassName}
              value={approverReviewDue}
              onChange={(e) => setApproverReviewDue(e.target.value)}
              disabled={!cycleId || preview}
            />
          </PowerField>
          <PowerField label="Submission due" hint="Send forecast to TPM by this date.">
            <input
              type="date"
              className={powerInputClassName}
              value={tpmSubmissionDue}
              onChange={(e) => setTpmSubmissionDue(e.target.value)}
              disabled={!cycleId || preview}
            />
          </PowerField>
        </div>

        {cycleId ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <PowerMetric
              label="Time to prepare"
              value={updatedTimeline ? (
                updatedTimeline.todayToPrepDays > 0 ? `${updatedTimeline.todayToPrepBusinessDays} business days` : updatedTimeline.todayToPrepDays === 0 ? "Due today" : `${Math.abs(updatedTimeline.todayToPrepBusinessDays)} overdue`
              ) : "—"}
              tone="sky"
            />
            <PowerMetric
              label="Time to review"
              value={updatedTimeline ? `${updatedTimeline.prepToReviewBusinessDays} business days` : "—"}
              tone="slate"
            />
            <PowerMetric
              label="Time to submit"
              value={updatedTimeline ? `${updatedTimeline.reviewToTpmBusinessDays} business days` : "—"}
              tone="emerald"
            />
          </div>
        ) : null}

        {cycleId ? (
          <div className="mt-5">
            <PowerInfoStrip tone="slate">
              <span className="font-semibold text-slate-900">Preparation time given:</span>{" "}
              {updatedTimeline ? (
                updatedTimeline.todayToPrepDays > 0 ? (
                  <>
                    {updatedTimeline.todayToPrepDays} days / {updatedTimeline.todayToPrepBusinessDays} business days from today to preparation due.
                  </>
                ) : updatedTimeline.todayToPrepDays === 0 ? (
                  <>0 days / 0 business days. Preparation due is today.</>
                ) : (
                  <>
                    Overdue by {Math.abs(updatedTimeline.todayToPrepDays)} days / {Math.abs(updatedTimeline.todayToPrepBusinessDays)} business days.
                  </>
                )
              ) : (
                <>—</>
              )}
            </PowerInfoStrip>
          </div>
        ) : null}

        {dueDateChanges.length ? (
          <div className="mt-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Updated due dates</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dueDateChanges.map((c) => (
                <div key={c.label} className="border border-slate-300 bg-slate-50 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">{c.label}</div>
                  <div className="mt-2 text-xs text-slate-600">Default</div>
                  <div className="text-sm font-medium text-slate-900">{c.defaultValue}</div>
                  <div className="mt-2 text-xs text-slate-600">Updated</div>
                  <div className="text-sm font-medium text-slate-900">{c.updatedValue}</div>
                </div>
              ))}
            </div>

            {updatedTimeline ? (
              <PowerInfoStrip tone={updatedTimeline.outOfOrder ? "amber" : "emerald"}>
                Preparation: <span className="font-semibold">{updatedTimeline.todayToPrepDays > 0
                  ? `${updatedTimeline.todayToPrepDays} days / ${updatedTimeline.todayToPrepBusinessDays} business days`
                  : updatedTimeline.todayToPrepDays === 0
                    ? "0 days / 0 business days"
                    : `overdue by ${Math.abs(updatedTimeline.todayToPrepDays)} days / ${Math.abs(updatedTimeline.todayToPrepBusinessDays)} business days`}</span>
                <span className="mx-2 text-slate-300">|</span>
                Review: <span className="font-semibold">{updatedTimeline.prepToReviewDays} days / {updatedTimeline.prepToReviewBusinessDays} business days</span>
                <span className="mx-2 text-slate-300">|</span>
                Submission: <span className="font-semibold">{updatedTimeline.reviewToTpmDays} days / {updatedTimeline.reviewToTpmBusinessDays} business days</span>
                {updatedTimeline.outOfOrder ? (
                  <div className="mt-2">One or more due dates are out of order. Review must be on or after preparation, and TPM submission must be on or after review.</div>
                ) : null}
              </PowerInfoStrip>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 text-xs leading-6 text-slate-500">
          Default milestone dates are auto-populated from the setup template: Preparation = {suggestedBusinessDays.preparation} business days, Review = {suggestedBusinessDays.review} business days, Submission = {suggestedBusinessDays.submission} business days. You can override these dates for this instance without changing the setup template.
        </div>
      </PowerPanel>

      <PowerPanel
        title="Manager notes"
        tone="slate"
      >
        <PowerField label="Comments" hint="These notes will guide the assignee(s) when the instance is initiated.">
          <textarea
            className={powerTextAreaClassName}
            rows={4}
            placeholder="Add any notes for the assignee(s)."
            value={emManagerComments}
            onChange={(e) => setEmManagerComments(e.target.value)}
            disabled={!cycleId || preview}
          />
        </PowerField>

        <PowerCommandBar>
          <button
            className={powerGhostButtonClassName}
            type="button"
            onClick={() => {
              if (preview) return;
              router.push("/");
            }}
          >
            Cancel
          </button>
          <button
            className={powerGhostButtonClassName}
            type="button"
            disabled={!cycleId}
            onClick={() => {
              if (preview) return;
              persist(0);
              router.push("/");
            }}
          >
            Save draft
          </button>
          <button
            className={powerPrimaryButtonClassName}
            type="button"
            disabled={!cycleId}
            onClick={() => {
              if (preview) return;
              persist(1);
              if (cycleId) router.push(`/phases/1?cycle=${encodeURIComponent(cycleId)}`);
            }}
          >
            Initiate forecast instance
          </button>
        </PowerCommandBar>
      </PowerPanel>
    </section>
  );
}
