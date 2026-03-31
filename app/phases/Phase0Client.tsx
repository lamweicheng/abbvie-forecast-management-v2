"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { APPROVER_OPTIONS, ASSIGNEE_OPTIONS } from "../../lib/constants";
import type { ForecastCycleRow } from "../../lib/cycles";
import { BASE_CYCLES } from "../../lib/cycles";
import { useSessionCycles, useSessionData } from "../SessionDataProvider";
import {
  BASE_SETUPS,
  DEFAULT_PREPARATION_DUE_SCHEDULE,
  DEFAULT_REVIEW_DUE_SCHEDULE,
  DEFAULT_TPM_SUBMISSION_SCHEDULE,
  type Recurrence,
  type SetupRow,
  type TpmSubmissionScheduleRule
} from "../../lib/setups";
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

  const defaultPreparationRule = setup?.preparationDueSchedule ?? DEFAULT_PREPARATION_DUE_SCHEDULE;
  const defaultReviewRule = setup?.reviewDueSchedule ?? DEFAULT_REVIEW_DUE_SCHEDULE;
  const defaultSubmissionRule = setup?.tpmSubmissionSchedule ?? DEFAULT_TPM_SUBMISSION_SCHEDULE;
  const reviewDueRuleLabel = setup?.reviewDueSameAsPreparation
    ? "Same as preparation due"
    : describeRule(defaultReviewRule, setup?.recurrence ?? "Monthly");
  const additionalApproverOptions = useMemo(() => {
    return Array.from(
      new Set(
        [
          ...(setup?.additionalApprovers ?? []),
          ...BASE_SETUPS.flatMap((entry) => entry.additionalApprovers ?? []),
          ...Object.values(setupsById).flatMap((entry) => entry.additionalApprovers ?? [])
        ].filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [setup?.additionalApprovers, setupsById]);

  const [assigneeInput, setAssigneeInput] = useState<string>("");
  const [assignees, setAssignees] = useState<string[]>(existing?.assignees ?? []);
  const [approverInput, setApproverInput] = useState<string>("");
  const [approvers, setApprovers] = useState<string[]>(existing?.approvers ?? []);
  const [additionalApproverInput, setAdditionalApproverInput] = useState<string>("");
  const [additionalApprovers, setAdditionalApprovers] = useState<string[]>(existing?.additionalApprovers ?? setup?.additionalApprovers ?? []);
  const [emManagerComments, setEmManagerComments] = useState<string>(existing?.emManagerComments ?? "");
  const [gspForecastDue, setGspForecastDue] = useState<string>(existing?.gspForecastDue ?? todayIso());
  const [approverReviewDue, setApproverReviewDue] = useState<string>(existing?.approverReviewDue ?? todayIso());
  const [tpmSubmissionDue, setTpmSubmissionDue] = useState<string>(existing?.tpmSubmissionDue ?? todayIso());

  useEffect(() => {
    // When switching between instances, reset local edits.
    setAssigneeInput("");
    setApproverInput("");
    setAdditionalApproverInput("");
    setAssignees(existing?.assignees ?? []);
    setApprovers(existing?.approvers ?? []);
    setAdditionalApprovers(existing?.additionalApprovers ?? setup?.additionalApprovers ?? []);
    setEmManagerComments(existing?.emManagerComments ?? "");
    setGspForecastDue(existing?.gspForecastDue ?? todayIso());
    setApproverReviewDue(existing?.approverReviewDue ?? todayIso());
    setTpmSubmissionDue(existing?.tpmSubmissionDue ?? todayIso());
  }, [
    cycleId,
    existing?.id,
    existing?.assignees,
    existing?.approvers,
    existing?.additionalApprovers,
    existing?.emManagerComments,
    existing?.gspForecastDue,
    existing?.approverReviewDue,
    existing?.tpmSubmissionDue,
    setup?.additionalApprovers
  ]);

  const persist = (nextPhaseId: ForecastCycleRow["phaseId"]) => {
    if (preview) return;
    if (!cycleId) return;
    if (!existing) return;
    upsertCycle({
      ...existing,
      requestedBy: existing.requestedBy ?? "EM Manager A",
      requestedDate: existing.requestedDate ?? todayIso(),
      emManagerComments: emManagerComments || undefined,
      assignees: assignees.length ? assignees : undefined,
      approvers: approvers.length ? approvers : undefined,
      additionalApprovers: additionalApprovers.length ? additionalApprovers : undefined,
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

  const addAdditionalApprover = () => {
    const next = additionalApproverInput.trim();
    if (!next) return;
    setAdditionalApprovers((prev) => (prev.includes(next) ? prev : [...prev, next]));
    setAdditionalApproverInput("");
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
        <div className="grid gap-5 md:grid-cols-3">
          <PowerField label="GSP Planner(s)">
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
              <p className="text-sm text-slate-500">No GSP Planner(s) selected.</p>
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

          <PowerField label="EM Manager(s)">
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
              <p className="text-sm text-slate-500">No EM Manager(s) selected.</p>
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

          <PowerField label="Additional Approver(s)">
            <div className="flex items-center gap-2">
              <input
                className={powerInputClassName}
                placeholder="Type to search and add"
                value={additionalApproverInput}
                onChange={(e) => setAdditionalApproverInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAdditionalApprover();
                  }
                }}
                disabled={!cycleId || preview}
                list="additional-approver-options"
              />
              <button
                type="button"
                className={powerGhostButtonClassName}
                onClick={addAdditionalApprover}
                disabled={!cycleId || preview}
              >
                Add
              </button>
              <datalist id="additional-approver-options">
                {additionalApproverOptions.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>

            {additionalApprovers.length === 0 ? (
              <p className="text-sm text-slate-500">No Additional Approver(s) selected.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {additionalApprovers.map((name) => (
                  <PowerPill key={name}>
                    {name}
                    <button
                      type="button"
                      className="text-slate-500 hover:text-slate-900"
                      onClick={() => setAdditionalApprovers((prev) => prev.filter((p) => p !== name))}
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
          <PowerField label="Preparation due">
            <input
              type="date"
              className={powerInputClassName}
              value={gspForecastDue}
              onChange={(e) => setGspForecastDue(e.target.value)}
              disabled={!cycleId || preview}
            />
          </PowerField>
          <PowerField label="Review due">
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

      </PowerPanel>

      <PowerPanel
        title="Notes"
        tone="slate"
      >
        <PowerField label="Comments" hint="These notes will guide the Forecast Preparer when the instance is initiated.">
          <textarea
            className={powerTextAreaClassName}
            rows={4}
            placeholder="Add any notes for the GSP Planner(s)."
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
