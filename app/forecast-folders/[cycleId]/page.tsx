"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { BASE_CYCLES } from "../../../lib/cycles";
import {
  forecastConfirmationFileName,
  forecastDraftFileName,
  forecastArtifactFileName,
  forecastFolderName,
  forecastReferenceFileName
} from "../../../lib/forecastFolders";
import { useSessionCycles } from "../../SessionDataProvider";

export default function ForecastFolderPage({
  params
}: {
  params: { cycleId: string };
}) {
  const { cyclesById } = useSessionCycles();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "draft" ? "draft" : "final";

  const cycle = useMemo(() => {
    return cyclesById[params.cycleId] ?? BASE_CYCLES.find((entry) => entry.id === params.cycleId);
  }, [cyclesById, params.cycleId]);

  const folderName = forecastFolderName(cycle, mode);
  const artifactName = forecastArtifactFileName(cycle);
  const draftArtifactName = forecastDraftFileName(cycle);
  const confirmationFileName = forecastConfirmationFileName(cycle);
  const referenceFileName = forecastReferenceFileName(cycle);
  const modifiedDate = cycle?.tpmConfirmedDate ?? cycle?.sentToTpmDate ?? cycle?.approverReviewDue ?? cycle?.tpmSubmissionDue ?? "—";
  const workflowHref = cycle ? `/phases/${cycle.phaseId}?cycle=${encodeURIComponent(cycle.id)}` : "/";
  const isDraftFolder = mode === "draft";
  const hasFinalArtifacts = Boolean(cycle?.closed);
  const draftRows = [
    {
      name: draftArtifactName,
      type: "Excel workbook",
      modified: cycle?.gspForecastDue ?? modifiedDate,
      modifiedBy: cycle?.assignees?.[0] ?? "GSP Planner"
    },
    {
      name: referenceFileName,
      type: "Reference file",
      modified: cycle?.gspForecastDue ?? modifiedDate,
      modifiedBy: cycle?.assignees?.[0] ?? "GSP Planner"
    }
  ];
  const finalRows = hasFinalArtifacts
    ? [
        {
          name: artifactName,
          type: "Excel workbook",
          modified: modifiedDate,
          modifiedBy: cycle?.tpm || "EM Manager"
        },
        {
          name: confirmationFileName,
          type: "Email message",
          modified: modifiedDate,
          modifiedBy: cycle?.tpm || "TPM"
        }
      ]
    : [];
  const rows = isDraftFolder ? draftRows : finalRows;

  return (
    <main className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-52 border-r border-slate-200 bg-[#fbfbfb] lg:block">
          <div className="border-b border-slate-200 px-6 py-6">
            <div className="flex h-14 w-14 items-center justify-center bg-[#0f8b8d] text-2xl font-semibold text-white">VV</div>
          </div>
          <nav className="space-y-2 px-6 py-4 text-[15px] text-slate-700">
            <div className="py-2">Home</div>
            <div className="py-2 font-semibold text-slate-900">Documents</div>
            <div className="py-2">Notebook</div>
            <div className="py-2">Pages</div>
            <div className="py-2">Site contents</div>
            <div className="py-2">Recycle bin</div>
            <div className="py-2 text-[#0f8b8d]">Edit</div>
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-4xl font-semibold text-slate-900">VOT - Virtual Operating Team Site</div>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-600">
                <span>Following</span>
                <span>Site access</span>
              </div>
            </div>
          </header>

          <div className="px-4 py-4 lg:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
              <div className="flex flex-wrap items-center gap-2 text-[16px]">
                <span>Documents</span>
                <span>›</span>
                <span className="font-semibold">Forecast</span>
                <span>›</span>
                <span className="font-semibold text-slate-900">{folderName}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={workflowHref} className="text-[#0f8b8d] hover:underline">
                  Back to workflow
                </Link>
                <Link href="/" className="text-[#0f8b8d] hover:underline">
                  Home
                </Link>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="rounded-full border border-[#0f8b8d] px-4 py-2 font-semibold text-[#0f8b8d]">All Documents</div>
                <div className="rounded-full border border-slate-300 px-4 py-2 text-slate-700">Add view</div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
                <span>Share</span>
                <span>Copy link</span>
                <span>Forms</span>
                <span>Download</span>
                <span>Edit in grid view</span>
                <span>Export to Excel</span>
                <span>Automate</span>
                <div className="rounded bg-[#0f8b8d] px-4 py-2 font-semibold text-white">Create or upload</div>
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center text-center text-slate-700">
                <div className="text-3xl font-semibold text-slate-900">This folder is empty</div>
                <div className="mt-4 text-base text-slate-500">
                  {isDraftFolder
                    ? "Draft forecast files will appear here after Phase 2 uploads."
                    : "Finalized forecast files and TPM confirmation email will appear here after Phase 5."}
                </div>
              </div>
            ) : (
              <div className="mt-4 overflow-hidden border border-slate-200 bg-white">
                <div className="grid grid-cols-[minmax(0,2fr)_180px_180px_180px] border-b border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600">
                  <div>Name</div>
                  <div>Modified</div>
                  <div>Modified By</div>
                  <div>Type</div>
                </div>
                {rows.map((row, index) => (
                  <div
                    key={row.name}
                    className={`grid grid-cols-[minmax(0,2fr)_180px_180px_180px] px-6 py-4 text-sm text-slate-700 ${index < rows.length - 1 ? "border-b border-slate-200" : ""}`}
                  >
                    <div className="font-medium text-slate-900">{row.name}</div>
                    <div>{row.modified}</div>
                    <div>{row.modifiedBy}</div>
                    <div>{row.type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}