import type { ForecastCycleRow } from "./cycles";

export type PurchaseOrderStatus = "Not Submitted" | "Submitted - Not Acknowledged" | "Submitted - Acknowledged";
export type PurchaseOrderAutomationStatus = "Automated" | "Manual Required";

type PurchaseOrderCycleLike = Pick<
  ForecastCycleRow,
  "poSubmittedViaOutlook" | "poEmailSentDate" | "poAcknowledgementReceived"
>;

type PurchaseOrderAutomationCycleLike = Pick<
  ForecastCycleRow,
  "poTrackedByAutomation" | "poAutomationCapturedAt"
>;

export function getPurchaseOrderStatus(cycle: PurchaseOrderCycleLike): PurchaseOrderStatus {
  const wasSubmitted = Boolean(cycle.poSubmittedViaOutlook || cycle.poEmailSentDate);

  if (!wasSubmitted) return "Not Submitted";
  if (cycle.poAcknowledgementReceived === "Yes") return "Submitted - Acknowledged";
  return "Submitted - Not Acknowledged";
}

export function getPurchaseOrderAutomationStatus(cycle: PurchaseOrderAutomationCycleLike): PurchaseOrderAutomationStatus {
  return cycle.poTrackedByAutomation && cycle.poAutomationCapturedAt ? "Automated" : "Manual Required";
}

type PurchaseOrderFolderCycleLike = Pick<ForecastCycleRow, "label" | "tpm" | "cycleStart">;

export function purchaseOrderRoute(cycleId: string) {
  return `/po/${encodeURIComponent(cycleId)}`;
}

export function purchaseOrderFolderRoute(cycleId: string) {
  return `/po-folders/${encodeURIComponent(cycleId)}`;
}

export function purchaseOrderFolderName(cycle?: PurchaseOrderFolderCycleLike) {
  const tpm = cycle?.tpm?.trim() || "TPM";
  return `${tpm} PO Folder (${purchaseOrderPeriodToken(cycle)})`;
}

export function purchaseOrderSubmissionFileName(cycle?: PurchaseOrderFolderCycleLike) {
  const tpm = cycle?.tpm?.trim() || "TPM";
  return `${tpm}_PO_Submission_${purchaseOrderPeriodToken(cycle)}`;
}

export function purchaseOrderAcknowledgementFileName(cycle?: PurchaseOrderFolderCycleLike) {
  const tpm = cycle?.tpm?.trim() || "TPM";
  return `${tpm}_PO_Acknowledgement_${purchaseOrderPeriodToken(cycle)}`;
}

function purchaseOrderPeriodToken(cycle?: PurchaseOrderFolderCycleLike) {
  if (cycle?.cycleStart) {
    const [year, month] = cycle.cycleStart.split("-");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthLabel = monthNames[Math.max(0, Number(month) - 1)] ?? "Period";
    return `${monthLabel}_${year}`;
  }

  const label = cycle?.label?.split(" - ")[0]?.trim();
  return label ? label.replace(/\s+/g, "_") : "Period";
}