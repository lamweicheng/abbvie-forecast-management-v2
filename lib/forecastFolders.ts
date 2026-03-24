import { formatProductsLabel } from "./setups";

type ForecastFolderCycleLike = {
  label?: string;
  tpm?: string;
  products?: string[];
};

export function forecastFolderRoute(cycleId: string) {
  return `/forecast-folders/${encodeURIComponent(cycleId)}`;
}

export function forecastFolderName(cycle?: ForecastFolderCycleLike) {
  const tpm = cycle?.tpm?.trim() || "Unknown TPM";
  const productsLabel = formatProductsLabel(cycle?.products ?? []) || "Unknown Product";
  return `${tpm} _ ${productsLabel}`;
}

export function forecastArtifactFileName(cycle?: ForecastFolderCycleLike) {
  const label = cycle?.label?.trim() || "Forecast";
  return `${label} package.xlsx`;
}