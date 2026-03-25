import { formatProductsLabel } from "./setups";

type ForecastFolderCycleLike = {
  label?: string;
  tpm?: string;
  products?: string[];
  cycleStart?: string;
  closed?: boolean;
  phaseId?: number;
};

export type ForecastFolderMode = "final" | "draft";

export function forecastFolderRoute(cycleId: string, mode: ForecastFolderMode = "final") {
  const suffix = mode === "draft" ? "?mode=draft" : "";
  return `/forecast-folders/${encodeURIComponent(cycleId)}${suffix}`;
}

export function forecastFolderName(cycle?: ForecastFolderCycleLike, mode: ForecastFolderMode = "final") {
  const tpm = cycle?.tpm?.trim() || "Unknown TPM";
  const productsLabel = formatProductsLabel(cycle?.products ?? []) || "Unknown Product";
  return `${tpm} (${productsLabel})${mode === "draft" ? " Draft" : ""}`;
}

function cyclePeriodToken(cycle?: ForecastFolderCycleLike) {
  if (cycle?.cycleStart) {
    const [year, month] = cycle.cycleStart.split("-");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthLabel = monthNames[Math.max(0, Number(month) - 1)] ?? "Period";
    return `${monthLabel}_${year}`;
  }

  const label = cycle?.label?.split(" - ")[0]?.trim();
  return label ? label.replace(/\s+/g, "_") : "Period";
}

export function forecastArtifactFileName(cycle?: ForecastFolderCycleLike) {
  const tpm = cycle?.tpm?.trim() || "TPM";
  return `${tpm}_Forecast_${cyclePeriodToken(cycle)}.xlsx`;
}

export function forecastConfirmationFileName(cycle?: ForecastFolderCycleLike) {
  const tpm = cycle?.tpm?.trim() || "TPM";
  return `${tpm}_Email_${cyclePeriodToken(cycle)}.msg`;
}

export function forecastDraftFileName(cycle?: ForecastFolderCycleLike) {
  const tpm = cycle?.tpm?.trim() || "TPM";
  return `${tpm}_Draft_${cyclePeriodToken(cycle)}.xlsx`;
}

export function forecastReferenceFileName(cycle?: ForecastFolderCycleLike) {
  const tpm = cycle?.tpm?.trim() || "TPM";
  return `${tpm}_Reference_${cyclePeriodToken(cycle)}.pdf`;
}