"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phase0Client } from "./Phase0Client";
import { Phase1Client } from "./Phase1Client";
import { Phase2Client } from "./Phase2Client";
import {
  PowerCommandBar,
  PowerField,
  PowerInfoStrip,
  PowerPanel,
  powerFileClassName,
  powerGhostButtonClassName,
  powerInputClassName,
  powerPrimaryButtonClassName,
  powerTextAreaClassName,
  powerWarningButtonClassName
} from "./phase-ui";
import { PHASES } from "../../lib/phases";
import { BASE_CYCLES, type ForecastCycleRow } from "../../lib/cycles";
import { forecastFolderName, forecastFolderRoute } from "../../lib/forecastFolders";
import { formatProductsLabel } from "../../lib/setups";
import { useSessionCycles } from "../SessionDataProvider";

function periodLabelFromCycle(cycle?: ForecastCycleRow) {
  const raw = cycle?.label ?? "";
  const period = raw.split(" - ")[0]?.trim();
  if (period) return period;
  if (cycle?.cycleStart && cycle?.cycleEnd) return `${cycle.cycleStart} → ${cycle.cycleEnd}`;
  return "—";
}

export function PhaseScreen({
  phaseId,
  cycleId,
  phaseName,
  instruction,
  preview = false
}: {
  phaseId: number;
  cycleId?: string;
  phaseName?: string;
  instruction?: string;
  preview?: boolean;
}) {
  const { cyclesById } = useSessionCycles();
  const cycle: ForecastCycleRow | undefined = cycleId
    ? cyclesById[cycleId] ?? BASE_CYCLES.find((c) => c.id === cycleId)
    : undefined;
  const lastPhaseId = PHASES.length - 1;
  const resolvedPhaseName = phaseName ?? PHASES.find((p) => p.id === phaseId)?.name;
  const resolvedInstruction = instruction ?? PHASES.find((p) => p.id === phaseId)?.shortDescription;

  const recordBanner = cycleId ? (
    <div className="border border-slate-400 bg-white px-4 py-3 text-base text-slate-700">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="border border-slate-400 bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
          {cycleId}
        </span>
        <span className="text-sm"><span className="font-medium text-slate-700">Period</span> <span className="font-semibold text-slate-900">{periodLabelFromCycle(cycle)}</span></span>
        <span className="text-sm"><span className="font-medium text-slate-700">Pillar</span> <span className="font-semibold text-slate-900">{cycle?.pillar ?? "—"}</span></span>
        <span className="text-sm"><span className="font-medium text-slate-700">TPM</span> <span className="font-semibold text-slate-900">{cycle?.tpm || "—"}</span></span>
        <span className="text-sm"><span className="font-medium text-slate-700">Products</span> <span className="font-semibold text-slate-900">{cycle ? (formatProductsLabel(cycle.products) || "—") : "—"}</span></span>
      </div>
      {cycle?.tpmLocation ? (
        <div className="mt-3 text-sm text-slate-600">
          TPM Location: <span className="font-semibold text-slate-900">{cycle.tpmLocation}</span>
        </div>
      ) : null}
    </div>
  ) : null;

  const actualCurrentPhaseId = Math.min(cycle?.phaseId ?? phaseId, lastPhaseId);
  const hasWorkflowState = Boolean(cycleId && cycle);
  const isHistoricalPhase = hasWorkflowState && phaseId < actualCurrentPhaseId;
  const isFuturePhase = hasWorkflowState && phaseId > actualCurrentPhaseId;
  const effectivePreview = preview || isHistoricalPhase;
  const shellTone = effectivePreview
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : isFuturePhase
      ? "border-slate-200 bg-slate-100 text-slate-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-900";

  const content = (() => {
    if (phaseId === 0) {
      return <Phase0Client cycleId={cycleId} preview={effectivePreview} />;
    }

    if (phaseId === 1) {
      return <Phase1Client cycleId={cycleId} preview={effectivePreview} />;
    }

    if (phaseId === 2) {
      return <Phase2Client cycleId={cycleId} preview={effectivePreview} />;
    }

    if (phaseId === 3) {
      return <Phase3Client cycleId={cycleId} cycle={cycle} preview={effectivePreview} />;
    }

    if (phaseId === 4) {
      return <Phase4Client cycleId={cycleId} cycle={cycle} preview={effectivePreview} />;
    }

    return null;
  })();

  return (
    <div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="overflow-hidden border border-slate-400 bg-white">
        <div className="border-b border-slate-500 bg-[#3a3a3a] px-4 py-4 text-white">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/85">Forecast workflow</div>
          <div className="mt-1 text-lg font-semibold">Phase navigator</div>
        </div>

        <div className="space-y-0 bg-[#f3f3f3] p-2">
          {PHASES.map((phase, idx) => {
            const status = idx < actualCurrentPhaseId
              ? "Completed"
              : idx === actualCurrentPhaseId
                ? "Current"
                : "Locked";
            const isActive = idx === phaseId;
            const isLocked = hasWorkflowState && idx > actualCurrentPhaseId;
            const canOpen = !preview && Boolean(cycleId) && !isLocked;
            const itemClassName = [
              "group mb-2 flex w-full items-start gap-3 border px-3 py-3 text-left",
              isActive
                ? "border-slate-700 bg-white"
                : isLocked
                  ? "border-slate-300 bg-slate-100 text-slate-400"
                  : "border-slate-300 bg-white hover:bg-slate-50"
            ].join(" ");

            const inner = (
              <>
                <span
                  className={[
                    "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center border text-sm font-semibold",
                    isActive
                      ? "border-slate-700 bg-slate-700 text-white"
                      : idx < actualCurrentPhaseId
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : isLocked
                          ? "border-slate-300 bg-slate-100 text-slate-400"
                          : "border-slate-400 bg-slate-100 text-slate-700"
                  ].join(" ")}
                >
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="block text-sm font-semibold text-slate-900">{phase.name}</span>
                    <span
                      className={[
                        "border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em]",
                        status === "Current"
                          ? "border-slate-700 bg-slate-700 text-white"
                          : status === "Completed"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-slate-300 bg-slate-100 text-slate-700"
                      ].join(" ")}
                    >
                      {status}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{phase.shortDescription}</span>
                </span>
              </>
            );

            if (!canOpen) {
              return (
                <div key={phase.id} className={itemClassName} aria-disabled={isLocked}>
                  {inner}
                </div>
              );
            }

            return (
              <Link key={phase.id} href={phaseRoute(phase.id, cycleId)} className={itemClassName}>
                {inner}
              </Link>
            );
          })}
        </div>
      </aside>

      <div className="space-y-4">
        {recordBanner}

        <section className="overflow-hidden border border-slate-400 bg-white">
          <div className="border-b border-slate-300 bg-[#d9d9d9] px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-700">Phase workspace</div>
                <h1 className="mt-2 text-2xl font-semibold text-slate-950">{resolvedPhaseName}</h1>
                {resolvedInstruction ? <p className="mt-2 max-w-3xl text-sm leading-5 text-slate-700">{resolvedInstruction}</p> : null}
              </div>
              <div className={["border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]", shellTone].join(" ")}>
                {isFuturePhase ? "Locked" : effectivePreview ? "View only" : "Editable"}
              </div>
            </div>

            {effectivePreview && hasWorkflowState ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusChip label="Access" value="Read only" tone="amber" />
              </div>
            ) : null}
          </div>

          <div className="bg-[#f4f4f4] px-5 py-5">
            {isFuturePhase ? (
              <LockedPhasePanel currentPhaseId={actualCurrentPhaseId} cycleId={cycleId} />
            ) : (
              <div className="space-y-4">
                {isHistoricalPhase ? (
                  <div className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    View only
                  </div>
                ) : null}
                {cycle && cycleId && phaseId !== 0 ? <CycleInfoCard cycle={cycle} /> : null}
                {content}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function phaseRoute(phaseId: number, cycleId?: string) {
  if (!cycleId) return `/phases/${phaseId}`;
  return `/phases/${phaseId}?cycle=${encodeURIComponent(cycleId)}`;
}

function StatusChip({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "slate" | "sky" | "amber";
}) {
  const toneClassName = tone === "sky"
    ? "border-sky-200 bg-sky-50 text-sky-800"
    : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className={["border px-3 py-1.5 text-xs", toneClassName].join(" ")}>
      <span className="font-medium text-slate-700">{label}</span>{" "}
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function LockedPhasePanel({ currentPhaseId, cycleId }: { currentPhaseId: number; cycleId?: string }) {
  return (
    <div className="border border-slate-400 bg-white p-6">
      <div className="max-w-2xl space-y-3">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">Phase locked</div>
        <h2 className="text-xl font-semibold text-slate-950">Complete the current phase before moving forward.</h2>
        <p className="text-sm leading-6 text-slate-600">
          This workflow only allows users to open the active phase and any completed phases. Future phases stay locked until the current phase is submitted.
        </p>
        <div className="border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Current workflow phase: <span className="font-semibold text-slate-950">{PHASES.find((p) => p.id === currentPhaseId)?.name ?? `Phase ${currentPhaseId + 1}`}</span>
        </div>
        {cycleId ? (
          <Link
            href={phaseRoute(currentPhaseId, cycleId)}
            className="inline-flex border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Open current phase
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function CycleInfoCard({ cycle }: { cycle: ForecastCycleRow }) {
  const assigneesText = cycle.assignees?.length ? cycle.assignees.join(", ") : "—";
  const approversText = cycle.approvers?.length ? cycle.approvers.join(", ") : "—";
  const additionalApproversText = cycle.additionalApprovers?.length ? cycle.additionalApprovers.join(", ") : "—";
  const requestedBy = cycle.requestedBy || "—";
  const requestedDate = cycle.requestedDate || "—";
  const gspForecastDue = cycle.gspForecastDue || "—";
  const approverReviewDue = cycle.approverReviewDue || "—";
  const sendToTpmDue = cycle.tpmSubmissionDue || "—";

  return (
    <section className="border border-slate-400 bg-white p-5 space-y-4">
      <div className="text-sm font-semibold text-slate-900">Instance information</div>
      <div className="grid gap-3 md:grid-cols-2 text-base">
        <div className="border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <div>
            GSP Planner(s): <span className="font-medium">{assigneesText}</span>
          </div>
          <div>
            EM Manager(s): <span className="font-medium">{approversText}</span>
          </div>
          <div>
            Additional Approver(s): <span className="font-medium">{additionalApproversText}</span>
          </div>
          <div>
            Requested by: <span className="font-medium">{requestedBy}</span>
          </div>
          <div>
            Date requested: <span className="font-medium">{requestedDate}</span>
          </div>
        </div>
        <div className="border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <div>
            Forecast submission to EM due: <span className="font-medium">{gspForecastDue}</span>
          </div>
          <div>
            Review and approval due: <span className="font-medium">{approverReviewDue}</span>
          </div>
          <div>
            Send to TPM due: <span className="font-medium">{sendToTpmDue}</span>
          </div>
        </div>
      </div>

      <div className="border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <div className="mb-1 text-sm font-medium text-slate-700">Notes</div>
        {cycle.emManagerComments?.trim() ? cycle.emManagerComments : <span className="text-slate-500">—</span>}
      </div>
    </section>
  );
}

function baseCycleForPhase(cycleId: string, phaseId: ForecastCycleRow["phaseId"]): ForecastCycleRow {
  return {
    id: cycleId,
    setupId: "",
    label: "",
    cycleStart: "",
    cycleEnd: "",
    pillar: "Aseptic" as ForecastCycleRow["pillar"],
    tpm: "",
    products: [],
    tpmLocation: undefined,
    tpmPreviousCompanyName: undefined,
    tpmSubmissionDue: "",
    phaseId,
    closed: false
  };
}

function Phase3Client({
  cycleId,
  cycle,
  preview
}: {
  cycleId?: string;
  cycle?: ForecastCycleRow;
  preview?: boolean;
}) {
  const router = useRouter();
  const { upsertCycle } = useSessionCycles();

  const [sentToTpm, setSentToTpm] = useState<boolean>(Boolean(cycle?.sentToTpm));
  const [sentToTpmDate, setSentToTpmDate] = useState<string>(cycle?.sentToTpmDate ?? "");

  useEffect(() => {
    setSentToTpm(Boolean(cycle?.sentToTpm));
    setSentToTpmDate(cycle?.sentToTpmDate ?? "");
  }, [cycleId, cycle?.sentToTpm, cycle?.sentToTpmDate]);

  const persist = (nextPhaseId: ForecastCycleRow["phaseId"]) => {
    if (preview) return;
    if (!cycleId) return;
    const next: ForecastCycleRow = {
      ...(cycle ?? baseCycleForPhase(cycleId, 3)),
      id: cycleId,
      sentToTpm: sentToTpm || undefined,
      sentToTpmDate: sentToTpmDate || undefined,
      phaseId: nextPhaseId
    };
    upsertCycle(next);
  };

  return (
    <section className="space-y-5">
      <PowerPanel
        title="Submission tracking"
        tone="sky"
      >
        <div className="space-y-4">
          <PowerInfoStrip tone="slate">
            Status: <span className="font-semibold">Approved in Phase 3 and ready to send to TPM</span>
          </PowerInfoStrip>

          <div className="border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Approved forecast folder</div>
            <div className="mt-2 space-y-1">
              {cycleId ? (
                <>
                  <Link href={forecastFolderRoute(cycleId)} className="font-medium text-slate-900 underline underline-offset-2">
                    Open approved forecast folder
                  </Link>
                  <div className="text-xs text-slate-500">{forecastFolderName(cycle)}</div>
                </>
              ) : (
                <span className="text-slate-500">Forecast folder link will appear once the instance is available.</span>
              )}
            </div>
          </div>

          <div className="border border-slate-300 bg-white px-4 py-4">
            <label htmlFor="sentToTpm" className="flex items-center gap-3 text-sm text-slate-800">
              <input
                id="sentToTpm"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                disabled={preview}
                checked={sentToTpm}
                onChange={(e) => setSentToTpm(e.target.checked)}
              />
              I have sent the forecast folder link to TPM via Outlook
            </label>
          </div>

          <div className="max-w-xs">
            <PowerField label="Date email was sent">
              <input
                type="date"
                className={powerInputClassName}
                disabled={preview}
                value={sentToTpmDate}
                onChange={(e) => setSentToTpmDate(e.target.value)}
              />
            </PowerField>
          </div>
        </div>

        <PowerCommandBar>
          <button
            type="button"
            className={powerGhostButtonClassName}
            disabled={preview || !cycleId}
            onClick={() => {
              persist(3);
              router.push("/");
            }}
          >
            Save draft
          </button>
          <button
            type="button"
            className={powerPrimaryButtonClassName}
            disabled={preview}
            onClick={() => {
              if (preview) return;
              persist(4);
              if (cycleId) router.push(`/phases/4?cycle=${encodeURIComponent(cycleId)}`);
              else router.push("/phases/4");
            }}
          >
            Proceed to Phase 5
          </button>
        </PowerCommandBar>
      </PowerPanel>
    </section>
  );
}

function Phase4Client({
  cycleId,
  cycle,
  preview
}: {
  cycleId?: string;
  cycle?: ForecastCycleRow;
  preview?: boolean;
}) {
  const router = useRouter();
  const { upsertCycle } = useSessionCycles();

  const [tpmConfirmedDate, setTpmConfirmedDate] = useState<string>(cycle?.tpmConfirmedDate ?? "");
  const [tpmOutcome, setTpmOutcome] = useState<"approved" | "changes_requested">(
    cycle?.tpmOutcome ?? "approved"
  );
  const [tpmChangeRequest, setTpmChangeRequest] = useState<string>(cycle?.tpmChangeRequest ?? "");

  useEffect(() => {
    setTpmConfirmedDate(cycle?.tpmConfirmedDate ?? "");
    setTpmOutcome(cycle?.tpmOutcome ?? "approved");
    setTpmChangeRequest(cycle?.tpmChangeRequest ?? "");
  }, [cycleId, cycle?.tpmConfirmedDate, cycle?.tpmOutcome, cycle?.tpmChangeRequest]);

  const persist = (nextPhaseId: ForecastCycleRow["phaseId"]) => {
    if (preview) return;
    if (!cycleId) return;
    const next: ForecastCycleRow = {
      ...(cycle ?? baseCycleForPhase(cycleId, 4)),
      id: cycleId,
      tpmConfirmedDate: tpmConfirmedDate || undefined,
      tpmOutcome,
      tpmChangeRequest: tpmOutcome === "changes_requested" ? (tpmChangeRequest.trim() || undefined) : undefined,
      phaseId: nextPhaseId
    };
    upsertCycle(next);
  };

  return (
    <section className="space-y-5">
      <PowerPanel
        title="TPM confirmation and closeout"
        tone="emerald"
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-800">TPM outcome</div>

            <label className="flex items-center gap-3 border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800">
              <input
                type="radio"
                name="tpmOutcome"
                className="h-4 w-4 border-slate-300"
                disabled={preview}
                checked={tpmOutcome === "approved"}
                onChange={() => setTpmOutcome("approved")}
              />
              TPM approves
            </label>

            {tpmOutcome === "approved" ? (
              <div className="grid gap-4 border border-emerald-300 bg-emerald-50 p-4 lg:grid-cols-[1fr_240px]">
                <div className="space-y-4">
                  <PowerField label="Upload TPM confirmation email">
                    <input type="file" className={powerFileClassName} disabled={preview} />
                  </PowerField>
                  <PowerField label="Upload finalized forecast file">
                    <input type="file" className={powerFileClassName} disabled={preview} />
                  </PowerField>
                </div>
                <div>
                  <PowerField label="Date TPM confirmed">
                    <input
                      type="date"
                      className={powerInputClassName}
                      disabled={preview}
                      value={tpmConfirmedDate}
                      onChange={(e) => setTpmConfirmedDate(e.target.value)}
                    />
                  </PowerField>
                </div>
              </div>
            ) : null}

            <label className="flex items-center gap-3 border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800">
              <input
                type="radio"
                name="tpmOutcome"
                className="h-4 w-4 border-slate-300"
                disabled={preview}
                checked={tpmOutcome === "changes_requested"}
                onChange={() => setTpmOutcome("changes_requested")}
              />
              TPM requests changes (revert to Phase 2)
            </label>

            {tpmOutcome === "changes_requested" ? (
              <div className="border border-amber-300 bg-amber-50 p-4">
                <PowerField label="Requested changes (for assignee)" hint="This summary will be shown when the instance is routed back for updates.">
                  <textarea
                    className={powerTextAreaClassName}
                    rows={4}
                    placeholder="Summarise what TPM wants changed and why."
                    disabled={preview}
                    value={tpmChangeRequest}
                    onChange={(e) => setTpmChangeRequest(e.target.value)}
                  />
                </PowerField>
              </div>
            ) : null}
          </div>
        </div>

        <PowerCommandBar>
          <button
            type="button"
            className={powerGhostButtonClassName}
            disabled={preview || !cycleId}
            onClick={() => {
              persist(4);
              router.push("/");
            }}
          >
            Save draft
          </button>
          <button
            type="button"
            className={tpmOutcome === "approved" ? powerPrimaryButtonClassName : powerWarningButtonClassName}
            disabled={
              preview ||
              (tpmOutcome === "changes_requested" && tpmChangeRequest.trim().length === 0)
            }
            onClick={() => {
              if (preview) return;
              if (tpmOutcome === "approved") {
                if (!cycleId) return;
                upsertCycle({
                  ...(cycle ?? baseCycleForPhase(cycleId, 4)),
                  id: cycleId,
                  tpmConfirmedDate: tpmConfirmedDate || undefined,
                  tpmOutcome,
                  tpmChangeRequest: undefined,
                  phaseId: 4,
                  forecastPdfHref: forecastFolderRoute(cycleId),
                  closed: true
                });
                router.push("/");
                return;
              }

              persist(1);
              if (cycleId) router.push(`/phases/1?cycle=${encodeURIComponent(cycleId)}`);
              else router.push("/phases/1");
            }}
          >
            {tpmOutcome === "approved" ? "Close forecast instance" : "Request changes (revert to Phase 2)"}
          </button>
        </PowerCommandBar>
      </PowerPanel>
    </section>
  );
}
