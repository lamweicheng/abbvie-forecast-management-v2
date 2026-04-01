"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ForecastCycleRow } from "../../lib/cycles";
import { BASE_CYCLES } from "../../lib/cycles";
import { forecastFolderName, forecastFolderRoute } from "../../lib/forecastFolders";
import { useSessionCycles } from "../SessionDataProvider";
import {
  PowerCommandBar,
  PowerField,
  PowerInfoStrip,
  PowerPanel,
  powerFileClassName,
  powerGhostButtonClassName,
  powerPrimaryButtonClassName,
  powerTextAreaClassName
} from "./phase-ui";

export function Phase1Client({ cycleId, preview = false }: { cycleId?: string; preview?: boolean }) {
  const router = useRouter();
  const { cyclesById, upsertCycle } = useSessionCycles();
  const [showFeedback, setShowFeedback] = useState(false);

  const cycle = useMemo<ForecastCycleRow | undefined>(() => {
    if (!cycleId) return undefined;
    return cyclesById[cycleId] ?? BASE_CYCLES.find((c) => c.id === cycleId);
  }, [cycleId, cyclesById]);

  const [comments, setComments] = useState<string>("");
  const [alignedToLatestPlanVolumes, setAlignedToLatestPlanVolumes] = useState<string>("");
  const hasReviewFeedback = Boolean(cycle?.approverCommentsToAssignees?.trim() || cycle?.tpmChangeRequest?.trim());

  useEffect(() => {
    setComments(cycle?.assigneeComments ?? "");
    if (typeof cycle?.alignedToLatestPlanVolumes === "boolean") {
      setAlignedToLatestPlanVolumes(cycle.alignedToLatestPlanVolumes ? "Yes" : "No");
      return;
    }
    setAlignedToLatestPlanVolumes("");
  }, [cycle?.alignedToLatestPlanVolumes, cycleId, cycle?.assigneeComments]);

  const saveDraft = () => {
    if (preview) return;
    if (!cycleId) return;
    if (!cycle) return;
    const next: ForecastCycleRow = {
      ...cycle,
      assigneeComments: comments || undefined,
      alignedToLatestPlanVolumes:
        alignedToLatestPlanVolumes === ""
          ? undefined
          : alignedToLatestPlanVolumes === "Yes",
      phaseId: 1
    };
    upsertCycle(next);
    router.push("/");
  };

  return (
    <section className="space-y-5">
      {cycle?.tpmOutcome === "changes_requested" && cycle?.tpmChangeRequest?.trim() ? (
        <PowerInfoStrip tone="amber">
          <div className="font-semibold">TPM requested changes</div>
          <p className="mt-1">{cycle.tpmChangeRequest}</p>
          <p className="mt-1 text-xs">Update the forecast and re-submit to continue through EM Manager review and approval.</p>
        </PowerInfoStrip>
      ) : null}

      <PowerPanel
        title="Forecast preparation"
        tone="sky"
      >
        <div className="flex justify-end">
          {hasReviewFeedback ? (
            <button
              type="button"
              onClick={() => {
                if (preview) return;
                setShowFeedback((prev) => !prev);
              }}
              className={powerGhostButtonClassName}
              disabled={preview}
            >
              {showFeedback ? "Hide Feedback" : "Show Feedback"}
            </button>
          ) : null}
        </div>

        {showFeedback && hasReviewFeedback ? (
          <div className="mt-4">
            <PowerInfoStrip tone="amber">
              <div className="font-semibold">Feedback</div>
              <p className="mt-1">{cycle?.approverCommentsToAssignees?.trim() || cycle?.tpmChangeRequest?.trim()}</p>
            </PowerInfoStrip>
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <PowerField label="Upload prepared forecast file" hint="Upload the working forecast artifact for approval.">
              <div className="space-y-3">
                <input type="file" className={powerFileClassName} disabled={preview} />
                {cycleId ? (
                  <div className="text-sm text-slate-600">
                    Stored in in-progress folder:{" "}
                    <a
                      href={forecastFolderRoute(cycleId, "draft")}
                      className="font-medium text-slate-900 underline underline-offset-2"
                    >
                      {forecastFolderName(cycle, "draft")}
                    </a>
                  </div>
                ) : null}
              </div>
            </PowerField>

            <PowerField label="Upload Reference Files" hint="Optional supporting files for EM Manager(s) and Additional Approver(s).">
              <input type="file" className={powerFileClassName} disabled={preview} multiple />
            </PowerField>

            <PowerField label="Have this forecast draft aligned with the latest S&OP or LRP or Plan Volumes?">
              <select
                className={powerTextAreaClassName.replace("min-h-[140px]", "")}
                value={alignedToLatestPlanVolumes}
                onChange={(e) => setAlignedToLatestPlanVolumes(e.target.value)}
                disabled={preview}
              >
                <option value="">Select an option</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </PowerField>
          </div>

          <PowerField label="Comments" hint="Add context for EM Manager(s) and Additional Approver(s) before submitting to Phase 3.">
            <textarea
              className={powerTextAreaClassName}
              rows={6}
              placeholder="Add any notes for EM Manager(s) and Additional Approver(s) to review."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={preview}
            />
          </PowerField>
        </div>

        <PowerCommandBar>
          <button
            className={powerGhostButtonClassName}
            type="button"
            disabled={preview || !cycleId}
            onClick={saveDraft}
          >
            Save draft
          </button>
          <button
            className={powerPrimaryButtonClassName}
            type="button"
            disabled={preview}
            onClick={() => {
              if (preview) return;
              if (!cycleId) {
                router.push("/phases/2");
                return;
              }

              if (!cycle) return;

              const next: ForecastCycleRow = {
                ...cycle,
                assigneeComments: comments || undefined,
                alignedToLatestPlanVolumes:
                  alignedToLatestPlanVolumes === ""
                    ? undefined
                    : alignedToLatestPlanVolumes === "Yes",
                phaseId: 2
              };

              upsertCycle(next);
              router.push(`/phases/2?cycle=${encodeURIComponent(cycleId)}`);
            }}
          >
            Submit for Phase 3 review
          </button>
        </PowerCommandBar>
      </PowerPanel>
    </section>
  );
}
