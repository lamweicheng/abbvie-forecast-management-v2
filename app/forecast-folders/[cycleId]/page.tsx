"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BASE_CYCLES } from "../../../lib/cycles";
import {
  forecastArtifactFileName,
  forecastFolderName
} from "../../../lib/forecastFolders";
import { formatProductsLabel } from "../../../lib/setups";
import { useSessionCycles } from "../../SessionDataProvider";

function periodLabel(label?: string, cycleStart?: string, cycleEnd?: string) {
  const period = label?.split(" - ")[0]?.trim();
  if (period) return period;
  if (cycleStart && cycleEnd) return `${cycleStart} - ${cycleEnd}`;
  return "—";
}

export default function ForecastFolderPage({
  params
}: {
  params: { cycleId: string };
}) {
  const { cyclesById } = useSessionCycles();

  const cycle = useMemo(() => {
    return cyclesById[params.cycleId] ?? BASE_CYCLES.find((entry) => entry.id === params.cycleId);
  }, [cyclesById, params.cycleId]);

  const folderName = forecastFolderName(cycle);
  const artifactName = forecastArtifactFileName(cycle);
  const productsLabel = formatProductsLabel(cycle?.products ?? []) || "—";
  const modifiedDate = cycle?.tpmConfirmedDate ?? cycle?.sentToTpmDate ?? cycle?.approverReviewDue ?? cycle?.tpmSubmissionDue ?? "—";
  const workflowHref = cycle ? `/phases/${cycle.phaseId}?cycle=${encodeURIComponent(cycle.id)}` : "/";

  return (
    <main className="min-h-screen bg-[#eef3f8] py-6">
      <div className="mx-auto max-w-6xl space-y-4 px-4">
        <header className="overflow-hidden border border-[#35506b] bg-white">
          <div className="border-b border-[#35506b] bg-[#0f4c81] px-5 py-3 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">Mock SharePoint</div>
            <div className="mt-1 text-xl font-semibold">Forecast document library</div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#dbe7f3] px-5 py-3 text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/" className="font-medium text-[#0f4c81] underline underline-offset-2">
                Home
              </Link>
              <span>/</span>
              <span>Forecast</span>
              <span>/</span>
              <span className="font-semibold text-slate-900">{folderName}</span>
            </div>
            <Link href={workflowHref} className="border border-[#0f4c81] bg-white px-3 py-1.5 font-semibold text-[#0f4c81] hover:bg-[#f5f9fc]">
              Back to workflow
            </Link>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="overflow-hidden border border-slate-300 bg-white">
            <div className="border-b border-slate-300 bg-[#f5f8fb] px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Folder</div>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">{folderName}</h1>
              <p className="mt-2 text-sm text-slate-600">
                This is a SharePoint-style mockup for the forecast folder. The workflow links here instead of opening a single forecast file directly.
              </p>
            </div>

            <div className="px-5 py-5">
              <div className="overflow-hidden border border-slate-300">
                <div className="grid grid-cols-[minmax(0,1.8fr)_160px_140px_160px] border-b border-slate-300 bg-[#f3f6f9] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <div>Name</div>
                  <div>Type</div>
                  <div>Modified</div>
                  <div>Owner</div>
                </div>

                <div className="grid grid-cols-[minmax(0,1.8fr)_160px_140px_160px] items-center border-b border-slate-200 px-4 py-4 text-sm text-slate-700">
                  <div>
                    <div className="font-semibold text-slate-900">{artifactName}</div>
                    <div className="mt-1 text-xs text-slate-500">Final forecast package stored in the TPM product folder</div>
                  </div>
                  <div>Excel workbook</div>
                  <div>{modifiedDate}</div>
                  <div>{cycle?.tpm || "EM Manager"}</div>
                </div>

                <div className="grid grid-cols-[minmax(0,1.8fr)_160px_140px_160px] items-center px-4 py-4 text-sm text-slate-700">
                  <div>
                    <div className="font-semibold text-slate-900">TPM confirmation email.msg</div>
                    <div className="mt-1 text-xs text-slate-500">Confirmation artifact stored alongside the final forecast package</div>
                  </div>
                  <div>Email message</div>
                  <div>{modifiedDate}</div>
                  <div>{cycle?.tpm || "TPM"}</div>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="border border-slate-300 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Details</div>
              <dl className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <dt className="font-medium text-slate-500">Cycle</dt>
                  <dd className="mt-1 font-semibold text-slate-900">{cycle?.id ?? params.cycleId}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">TPM</dt>
                  <dd className="mt-1 font-semibold text-slate-900">{cycle?.tpm || "—"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Product</dt>
                  <dd className="mt-1 font-semibold text-slate-900">{productsLabel}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Period</dt>
                  <dd className="mt-1 font-semibold text-slate-900">{periodLabel(cycle?.label, cycle?.cycleStart, cycle?.cycleEnd)}</dd>
                </div>
              </dl>
            </div>

            <div className="border border-[#b9d0e6] bg-[#f5f9fc] p-5 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Why this mockup exists</div>
              <p className="mt-2 leading-6">
                The forecast workflow now treats the deliverable as a folder destination. Users open the TPM and product folder, then access the forecast package from there.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}