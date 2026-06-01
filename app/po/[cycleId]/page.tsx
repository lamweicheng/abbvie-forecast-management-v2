"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../../components/BackButton";
import { BASE_CYCLES, type ForecastCycleRow } from "../../../lib/cycles";
import { formatProductsLabel } from "../../../lib/setups";
import {
  getPurchaseOrderAutomationStatus,
  getPurchaseOrderStatus,
  purchaseOrderFolderRoute
} from "../../../lib/purchaseOrders";
import { useSessionCycles } from "../../SessionDataProvider";
import {
  PowerCommandBar,
  PowerField,
  PowerInfoStrip,
  PowerPanel,
  powerGhostButtonClassName,
  powerInputClassName,
  powerPrimaryButtonClassName
} from "../../phases/phase-ui";

function mergeById<T extends { id: string }>(base: T[], upsertsById: Record<string, T>) {
  const merged: T[] = base.map((r) => upsertsById[r.id] ?? r);
  const extra = Object.values(upsertsById).filter((r) => !base.some((b) => b.id === r.id));
  return [...merged, ...extra];
}

function periodLabelFromCycle(cycle?: ForecastCycleRow) {
  const raw = cycle?.label ?? "";
  const period = raw.split(" - ")[0]?.trim();
  if (period) return period;
  if (cycle?.cycleStart && cycle?.cycleEnd) return `${cycle.cycleStart} - ${cycle.cycleEnd}`;
  return "—";
}

export default function PurchaseOrderPage({ params }: { params: { cycleId: string } }) {
  const router = useRouter();
  const { cyclesById, upsertCycle } = useSessionCycles();

  const allCycles = useMemo(() => mergeById(BASE_CYCLES, cyclesById), [cyclesById]);
  const cycle = useMemo(() => allCycles.find((entry) => entry.id === params.cycleId), [allCycles, params.cycleId]);

  const [poSubmittedViaOutlook, setPoSubmittedViaOutlook] = useState(false);
  const [poEmailSentDate, setPoEmailSentDate] = useState("");
  const [poAcknowledgementReceived, setPoAcknowledgementReceived] = useState<"" | "Yes" | "No">("");
  const [poAcknowledgedDate, setPoAcknowledgedDate] = useState("");
  const [poOriginalRequestedDateSame, setPoOriginalRequestedDateSame] = useState<"" | "Yes" | "No" | "Mixed">("");
  const [poAcknowledgementComments, setPoAcknowledgementComments] = useState("");
  const [poTrackedByAutomation, setPoTrackedByAutomation] = useState(false);
  const [poAutomationCapturedAt, setPoAutomationCapturedAt] = useState("");
  const [poAutomationMailbox, setPoAutomationMailbox] = useState("");
  const [poAutomationEmailSubject, setPoAutomationEmailSubject] = useState("");
  const [poAutomationAttachmentSaved, setPoAutomationAttachmentSaved] = useState(false);

  useEffect(() => {
    const automationFound = Boolean(cycle?.poTrackedByAutomation && cycle?.poAutomationCapturedAt);

    setPoSubmittedViaOutlook(Boolean(cycle?.poSubmittedViaOutlook || automationFound));
    setPoEmailSentDate(cycle?.poEmailSentDate ?? cycle?.poAutomationCapturedAt ?? "");
    setPoAcknowledgementReceived(cycle?.poAcknowledgementReceived ?? "");
    setPoAcknowledgedDate(cycle?.poAcknowledgedDate ?? "");
    setPoOriginalRequestedDateSame(cycle?.poOriginalRequestedDateSame ?? "");
    setPoAcknowledgementComments(cycle?.poAcknowledgementComments ?? "");
    setPoTrackedByAutomation(Boolean(cycle?.poTrackedByAutomation));
    setPoAutomationCapturedAt(cycle?.poAutomationCapturedAt ?? "");
    setPoAutomationMailbox(cycle?.poAutomationMailbox ?? "");
    setPoAutomationEmailSubject(cycle?.poAutomationEmailSubject ?? "");
    setPoAutomationAttachmentSaved(Boolean(cycle?.poAutomationAttachmentSaved));
  }, [cycle]);

  if (!cycle) {
    return (
      <main className="min-h-screen bg-[#efefef] py-6">
        <div className="mx-auto max-w-[1600px] px-4">
          <div className="border border-slate-400 bg-white p-6 text-slate-900">PO record not found.</div>
        </div>
      </main>
    );
  }

  const status = getPurchaseOrderStatus({
    poSubmittedViaOutlook,
    poEmailSentDate,
    poAcknowledgementReceived: poAcknowledgementReceived || undefined
  });
  const statusClassName = status === "Submitted - Acknowledged"
    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
    : status === "Submitted - Not Acknowledged"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-rose-300 bg-rose-50 text-rose-900";
  const automationStatus = getPurchaseOrderAutomationStatus({
    poTrackedByAutomation,
    poAutomationCapturedAt: poAutomationCapturedAt || undefined
  });
  const automationFound = automationStatus === "Automated";

  const persist = () => {
    upsertCycle({
      ...cycle,
      poTrackedByAutomation,
      poAutomationCapturedAt: poAutomationCapturedAt || undefined,
      poAutomationMailbox: poAutomationMailbox || undefined,
      poAutomationEmailSubject: poAutomationEmailSubject || undefined,
      poAutomationAttachmentSaved,
      poSubmittedViaOutlook: automationFound ? true : poSubmittedViaOutlook,
      poEmailSentDate: automationFound ? (poAutomationCapturedAt || poEmailSentDate || undefined) : (poEmailSentDate || undefined),
      poAcknowledgementReceived: poAcknowledgementReceived || undefined,
      poAcknowledgedDate: poAcknowledgementReceived === "Yes" && poAcknowledgedDate ? poAcknowledgedDate : undefined,
      poOriginalRequestedDateSame: poAcknowledgementReceived === "Yes" && poOriginalRequestedDateSame
        ? poOriginalRequestedDateSame
        : undefined,
      poAcknowledgementComments: poAcknowledgementReceived === "Yes" && poAcknowledgementComments.trim()
        ? poAcknowledgementComments.trim()
        : undefined
    });
  };

  return (
    <main className="min-h-screen bg-[#efefef] py-6">
      <div className="mx-auto max-w-[1600px] px-4 space-y-4">
        <header>
          <div className="border border-slate-500 bg-[#3a3a3a] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center rounded-sm border border-white px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                ← Home
              </Link>
              <BackButton />
            </div>
          </div>
        </header>

        <div className="border border-slate-400 bg-white px-4 py-3 text-base text-slate-700">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="border border-slate-400 bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              {cycle.id}
            </span>
            <span className="text-sm"><span className="font-medium text-slate-700">Period</span> <span className="font-semibold text-slate-900">{periodLabelFromCycle(cycle)}</span></span>
            <span className="text-sm"><span className="font-medium text-slate-700">Pillar</span> <span className="font-semibold text-slate-900">{cycle.pillar}</span></span>
            <span className="text-sm"><span className="font-medium text-slate-700">TPM</span> <span className="font-semibold text-slate-900">{cycle.tpm || "—"}</span></span>
            <span className="text-sm"><span className="font-medium text-slate-700">Products</span> <span className="font-semibold text-slate-900">{formatProductsLabel(cycle.products) || "—"}</span></span>
          </div>
        </div>

        <PowerPanel title="PO Management" tone="sky">
          <div className="space-y-5">
            <div className={["border px-4 py-3 text-sm leading-6", statusClassName].join(" ")}>
              Current PO Status: <span className="font-semibold">{status}</span>
            </div>

            <section className="space-y-4 border border-slate-300 bg-slate-50 px-4 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">PO Submission to TPM</h2>
              </div>

              {automationStatus === "Automated" ? (
                <PowerInfoStrip tone="emerald">
                  Shared mailbox tracking found a matching PO email. The submission checkbox and sent date below are populated automatically.
                </PowerInfoStrip>
              ) : (
                <PowerInfoStrip tone="amber">
                  No automated PO email was found. Please resend the email to po-submissions@abbvie.example. Otherwise, enter the PO submission manually below.
                </PowerInfoStrip>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Email captured</div>
                  <div className="mt-2 font-semibold text-slate-900">{poAutomationCapturedAt || "Not detected"}</div>
                </div>
                <div className="border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Attachment saved to folder</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                    <span>{poAutomationAttachmentSaved ? "Yes" : "No"}</span>
                    {poAutomationAttachmentSaved ? (
                      <Link
                        href={purchaseOrderFolderRoute(cycle.id)}
                        className="text-sm font-medium text-slate-900 underline underline-offset-2"
                      >
                        Folder link
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>

              {poAutomationEmailSubject || poAutomationMailbox ? (
                <div className="border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Detected email subject line</div>
                  <div className="mt-2 space-y-1">
                    <div className="font-medium text-slate-900">{poAutomationEmailSubject || "No subject captured"}</div>
                    {poAutomationMailbox ? <div className="text-xs text-slate-500">Shared mailbox: {poAutomationMailbox}</div> : null}
                  </div>
                </div>
              ) : null}

              <PowerField label="Submission confirmation">
                <label className="flex items-center gap-3 text-sm text-slate-900">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-400"
                    checked={poSubmittedViaOutlook}
                    onChange={(e) => setPoSubmittedViaOutlook(e.target.checked)}
                    disabled={automationFound}
                  />
                  I have sent the PO to TPM via Outlook
                </label>
              </PowerField>

              <PowerField label="Date email was sent">
                <input
                  type="date"
                  className={powerInputClassName}
                  value={poEmailSentDate}
                  onChange={(e) => setPoEmailSentDate(e.target.value)}
                  disabled={automationFound}
                />
              </PowerField>
            </section>

            <section className="space-y-4 border border-slate-300 bg-slate-50 px-4 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">TPM Acknowledgement of Purchase Order (PO)</h2>
              </div>

              <PowerField label="Received TPM acknowledgment via email/meeting">
                <select
                  className={powerInputClassName}
                  value={poAcknowledgementReceived}
                  onChange={(e) => {
                    const nextValue = e.target.value as "" | "Yes" | "No";
                    setPoAcknowledgementReceived(nextValue);
                    if (nextValue !== "Yes") {
                      setPoAcknowledgedDate("");
                      setPoOriginalRequestedDateSame("");
                      setPoAcknowledgementComments("");
                    }
                  }}
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </PowerField>

              <PowerField label="Date TPM acknowledged">
                <input
                  type="date"
                  className={powerInputClassName}
                  value={poAcknowledgedDate}
                  onChange={(e) => setPoAcknowledgedDate(e.target.value)}
                  disabled={poAcknowledgementReceived !== "Yes"}
                />
              </PowerField>

              <PowerField label="Are the original requested delivery dates the same?">
                <select
                  className={powerInputClassName}
                  value={poOriginalRequestedDateSame}
                  onChange={(e) => setPoOriginalRequestedDateSame(e.target.value as "" | "Yes" | "No" | "Mixed")}
                  disabled={poAcknowledgementReceived !== "Yes"}
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </PowerField>

              <PowerField label="Comments">
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Please add any additional details as needed. If you responded No or Mixed on the original requested delivery date field, please explain the new requested delivery dates.</p>
                  <textarea
                    className={[powerInputClassName, "min-h-28 resize-y"].join(" ")}
                    value={poAcknowledgementComments}
                    onChange={(e) => setPoAcknowledgementComments(e.target.value)}
                    disabled={poAcknowledgementReceived !== "Yes"}
                  />
                </div>
              </PowerField>
            </section>
          </div>

          <PowerCommandBar>
            <button
              type="button"
              className={powerGhostButtonClassName}
              onClick={() => {
                persist();
                router.push(`/setups/${encodeURIComponent(cycle.setupId)}`);
              }}
            >
              Save draft
            </button>
            <button
              type="button"
              className={powerPrimaryButtonClassName}
              onClick={() => {
                persist();
                router.push(`/setups/${encodeURIComponent(cycle.setupId)}`);
              }}
            >
              Update PO status
            </button>
          </PowerCommandBar>
        </PowerPanel>
      </div>
    </main>
  );
}