"use client";

import Link from "next/link";
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
  powerGhostButtonClassName,
  powerSuccessButtonClassName,
  powerTextAreaClassName,
  powerWarningButtonClassName
} from "./phase-ui";

export function Phase2Client({ cycleId, preview = false }: { cycleId?: string; preview?: boolean }) {
  const router = useRouter();
  const { cyclesById, upsertCycle } = useSessionCycles();

  const cycle = useMemo<ForecastCycleRow | undefined>(() => {
    if (!cycleId) return undefined;
    return cyclesById[cycleId] ?? BASE_CYCLES.find((c) => c.id === cycleId);
  }, [cycleId, cyclesById]);

  const [commentsToAssignees, setCommentsToAssignees] = useState<string>("");

  useEffect(() => {
    setCommentsToAssignees(cycle?.approverCommentsToAssignees ?? "");
  }, [cycleId, cycle?.approverCommentsToAssignees]);

  const saveDraft = () => {
    if (preview) return;
    if (!cycleId) return;
    if (!cycle) return;
    const next: ForecastCycleRow = {
      ...cycle,
      approverCommentsToAssignees: commentsToAssignees || undefined,
      phaseId: 2
    };
    upsertCycle(next);
    router.push("/");
  };

  return (
    <section className="space-y-5">
      {!cycleId ? (
        <PowerInfoStrip tone="amber">
          Open Phase 3 from an instance row to see details.
        </PowerInfoStrip>
      ) : null}

      <PowerPanel
        title="Approval review"
        tone="emerald"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-slate-300 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Forecast folder</div>
            <div className="mt-2 text-sm text-slate-700">
              {cycleId ? (
                <>
                  <Link href={forecastFolderRoute(cycleId)} className="font-medium text-slate-900 underline underline-offset-2">
                    Open submitted forecast folder
                  </Link>
                  <div className="mt-1 text-xs text-slate-500">{forecastFolderName(cycle)}</div>
                </>
              ) : (
                <span className="text-slate-500">Open Phase 3 from an instance row to view the forecast folder.</span>
              )}
            </div>
          </div>
          <div className="border border-slate-300 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Review due</div>
            <div className="mt-2 text-sm font-medium text-slate-900">{cycle?.approverReviewDue || "YYYY-MM-DD"}</div>
          </div>
        </div>

        <div className="mt-5 border border-slate-300 bg-slate-50 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Assignee comments</div>
          <div className="mt-2 text-sm text-slate-700">
            {cycle?.assigneeComments?.trim() ? cycle.assigneeComments : <span className="text-slate-500">—</span>}
          </div>
        </div>

        <div className="mt-5">
          <PowerField
            label="Comments to assignee(s)"
            hint="If changes are requested by the approver or TPM, follow-up conversations can happen outside this tool and the summary should be captured here."
          >
            <textarea
              className={powerTextAreaClassName}
              rows={4}
              placeholder="Summarise any required changes or rationale for approval."
              disabled={preview}
              value={commentsToAssignees}
              onChange={(e) => setCommentsToAssignees(e.target.value)}
            />
          </PowerField>
        </div>

        <PowerCommandBar>
          <button
            className={powerGhostButtonClassName}
            type="button"
            onClick={saveDraft}
            disabled={preview || !cycleId}
          >
            Save draft
          </button>
          <button
            className={powerWarningButtonClassName}
            type="button"
            onClick={() => {
              if (preview) return;
              if (cycleId) router.push(`/phases/1?cycle=${encodeURIComponent(cycleId)}`);
              else router.push("/phases/1");
            }}
            disabled={preview}
          >
            Send back to assignee(s)
          </button>
          <button
            className={powerSuccessButtonClassName}
            type="button"
            disabled={preview || !cycleId || !cycle}
            onClick={() => {
              if (preview) return;
              if (!cycleId || !cycle) return;
              upsertCycle({
                ...cycle,
                approverCommentsToAssignees: commentsToAssignees || undefined,
                phaseId: 3
              });
              router.push(`/phases/3?cycle=${encodeURIComponent(cycleId)}`);
            }}
          >
            Approve forecast
          </button>
        </PowerCommandBar>
      </PowerPanel>
    </section>
  );
}
