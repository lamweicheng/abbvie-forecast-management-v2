"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BASE_CYCLES } from "../../../lib/cycles";
import {
  purchaseOrderAcknowledgementFileName,
  purchaseOrderFolderName,
  purchaseOrderRoute,
  purchaseOrderSubmissionFileName
} from "../../../lib/purchaseOrders";
import { useSessionCycles } from "../../SessionDataProvider";

function mergeById<T extends { id: string }>(base: T[], upsertsById: Record<string, T>) {
  const merged: T[] = base.map((r) => upsertsById[r.id] ?? r);
  const extra = Object.values(upsertsById).filter((r) => !base.some((b) => b.id === r.id));
  return [...merged, ...extra];
}

export default function PurchaseOrderFolderPage({ params }: { params: { cycleId: string } }) {
  const { cyclesById } = useSessionCycles();
  const allCycles = useMemo(() => mergeById(BASE_CYCLES, cyclesById), [cyclesById]);
  const cycle = useMemo(() => allCycles.find((entry) => entry.id === params.cycleId), [allCycles, params.cycleId]);

  const rows = [
    cycle?.poEmailSentDate
      ? {
          name: purchaseOrderSubmissionFileName(cycle),
          modified: cycle.poEmailSentDate
        }
      : null,
    cycle?.poAcknowledgementReceived === "Yes" && cycle.poAcknowledgedDate
      ? {
          name: purchaseOrderAcknowledgementFileName(cycle),
          modified: cycle.poAcknowledgedDate
        }
      : null
  ].filter(Boolean) as { name: string; modified: string }[];

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="text-sm text-slate-600">Documents</div>
            <h1 className="text-3xl font-semibold text-slate-900">{purchaseOrderFolderName(cycle)}</h1>
          </div>
          <Link href={cycle ? purchaseOrderRoute(cycle.id) : "/"} className="text-sm font-medium text-[#0f8b8d] hover:underline">
            Back to PO management
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="border border-slate-200 bg-slate-50 px-6 py-20 text-center text-slate-700">
            <div className="text-2xl font-semibold text-slate-900">This PO folder is empty</div>
            <div className="mt-3 text-sm text-slate-500">Submission and acknowledgement artifacts will appear here after the PO workflow is updated.</div>
          </div>
        ) : (
          <div className="overflow-hidden border border-slate-200 bg-white">
            <div className="grid grid-cols-[minmax(0,2fr)_180px] border-b border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600">
              <div>Name</div>
              <div>Modified</div>
            </div>
            {rows.map((row, index) => (
              <div
                key={row.name}
                className={`grid grid-cols-[minmax(0,2fr)_180px] px-6 py-4 text-sm text-slate-700 ${index < rows.length - 1 ? "border-b border-slate-200" : ""}`}
              >
                <div className="font-medium text-slate-900">{row.name}</div>
                <div>{row.modified}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}