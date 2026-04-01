"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PILLARS } from "../lib/constants";
import { PHASES } from "../lib/phases";
import { BASE_SETUPS, formatProductsLabel, RECURRENCE_OPTIONS, type SetupRow } from "../lib/setups";
import { BASE_CYCLES, type ForecastCycleRow } from "../lib/cycles";
import { useSessionData } from "./SessionDataProvider";
import { PhaseScreen } from "./phases/PhaseScreen";

type RecurrenceFilterValue = "All" | SetupRow["recurrence"];

type SetupWithCounts = SetupRow & {
  cycleCount: number;
  openCount: number;
  completedCount: number;
};

function mergeById<T extends { id: string }>(base: T[], upsertsById: Record<string, T>) {
  const merged: T[] = base.map((r) => upsertsById[r.id] ?? r);
  const extra = Object.values(upsertsById).filter((r) => !base.some((b) => b.id === r.id));
  return [...merged, ...extra];
}

function isCycleCompleted(c: ForecastCycleRow) {
  return Boolean(c.closed && c.forecastPdfHref);
}

export function SetupsTableClient() {
  const router = useRouter();
  const { setupsById, cyclesById } = useSessionData();

  const [overviewOpen, setOverviewOpen] = useState(false);
  const [screenExamplePhaseId, setScreenExamplePhaseId] = useState<number | null>(null);

  const [pillar, setPillar] = useState<string>("All");
  const [tpm, setTpm] = useState<string>("All");
  const [product, setProduct] = useState<string>("All");
  const [recurrence, setRecurrence] = useState<RecurrenceFilterValue>("All");

  const allSetups = useMemo(() => mergeById(BASE_SETUPS, setupsById), [setupsById]);
  const allCycles = useMemo(() => mergeById(BASE_CYCLES, cyclesById), [cyclesById]);

  const setupsWithCounts = useMemo<SetupWithCounts[]>(() => {
    return allSetups
      .map((s) => {
        const cycles = allCycles.filter((c) => c.setupId === s.id);
        const completedCount = cycles.filter(isCycleCompleted).length;
        const openCount = cycles.length - completedCount;
        return { ...s, cycleCount: cycles.length, openCount, completedCount };
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [allSetups, allCycles]);

  const tpmOptions = useMemo(() => {
    return Array.from(new Set(allSetups.map((s) => s.tpm).filter(Boolean))).sort();
  }, [allSetups]);

  const productOptions = useMemo(() => {
    return Array.from(new Set(allSetups.flatMap((s) => s.products ?? []).filter(Boolean))).sort();
  }, [allSetups]);

  const filtered = useMemo(() => {
    return setupsWithCounts.filter((s) => {
      if (pillar !== "All" && s.pillar !== pillar) return false;
      if (tpm !== "All" && s.tpm !== tpm) return false;
      if (product !== "All" && !(s.products ?? []).includes(product)) return false;
      if (recurrence !== "All" && s.recurrence !== recurrence) return false;
      return true;
    });
  }, [setupsWithCounts, pillar, tpm, product, recurrence]);

  const previewCycleIdForPhase = useMemo(() => {
    const byPhase = new Map<number, string>();
    for (const c of allCycles) {
      if (!byPhase.has(c.phaseId)) byPhase.set(c.phaseId, c.id);
    }
    const fallback = allCycles[0]?.id;
    return (phaseId: number) => byPhase.get(phaseId) ?? fallback;
  }, [allCycles]);

  useEffect(() => {
    if (!overviewOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [overviewOpen]);

  return (
    <div className="space-y-0">
      <div className="flex flex-col gap-3 border-b border-slate-500 bg-[#3a3a3a] px-4 py-4 text-white lg:flex-row lg:items-center lg:justify-between">
        <div className="text-center text-3xl font-semibold tracking-tight lg:flex-1 lg:text-center">Forecast Setups</div>

        <div className="flex items-center gap-2 lg:justify-end">
          <button
            type="button"
            onClick={() => setOverviewOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-slate-200 bg-transparent text-lg font-semibold text-white hover:bg-white/10"
            aria-label="Process overview information"
            title="Process overview"
          >
            i
          </button>

          <button
            type="button"
            className="rounded-sm border border-white bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            onClick={() => router.push(`/setups/new`)}
          >
            Create New Setup
          </button>
        </div>
      </div>

      {overviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Process overview"
          onMouseDown={() => {
            setOverviewOpen(false);
            setScreenExamplePhaseId(null);
          }}
        >
          <div
            className="flex w-full max-w-4xl max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-sm border border-slate-400 bg-white shadow-sm"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-300 bg-[#3a3a3a] px-4 py-3">
              <div className="text-sm font-semibold text-white">Process overview</div>
              <button
                type="button"
                className="rounded-sm border border-slate-200 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
                onClick={() => {
                  setOverviewOpen(false);
                  setScreenExamplePhaseId(null);
                }}
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f4f4f4] p-4 overscroll-contain">
              <div className="text-sm text-slate-600 space-y-2">
                <div>
                  Setups define a recurring forecast template (Pillar, TPM, Products, default GSP Planner(s), EM Manager(s), Additional Approver(s), cadence, and TPM submission schedule rule).
                </div>
                <div>
                  Each setup generates forecast instances with default due dates automatically populated based on the TPM submission due date anchor.
                </div>
              </div>
              <ol className="space-y-2">
                {PHASES.map((stage) => (
                  <li key={stage.id}>
                    <button
                      type="button"
                      onClick={() => setScreenExamplePhaseId(stage.id)}
                      className={
                        screenExamplePhaseId === stage.id
                          ? "w-full border border-slate-500 bg-white px-3 py-2 text-left"
                          : "w-full border border-slate-300 bg-white px-3 py-2 text-left hover:bg-slate-50"
                      }
                    >
                      <div className="text-sm font-medium text-slate-900">{stage.name}</div>
                      <div className="mt-1 text-sm text-slate-600">{stage.shortDescription}</div>
                    </button>
                  </li>
                ))}
              </ol>

              {screenExamplePhaseId !== null && (
                <div className="pt-2">
                  <div className="text-sm font-semibold text-slate-900">Screen Example</div>
                  <div className="mt-2">
                    <PhaseScreen
                      phaseId={screenExamplePhaseId}
                      phaseName={PHASES.find((p) => p.id === screenExamplePhaseId)?.name}
                      cycleId={previewCycleIdForPhase(screenExamplePhaseId)}
                      preview
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-slate-300 bg-[#d9d9d9] px-4 py-4">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[10rem_12rem_12rem_12rem]">
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-800">Pillar</label>
            <select
              className="w-full rounded-sm border border-slate-500 bg-white px-3 py-2.5 text-base text-slate-900"
              value={pillar}
              onChange={(e) => setPillar(e.target.value)}
            >
              <option value="All">All</option>
              {PILLARS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-800">TPM</label>
            <select
              className="w-full rounded-sm border border-slate-500 bg-white px-3 py-2.5 text-base text-slate-900"
              value={tpm}
              onChange={(e) => setTpm(e.target.value)}
            >
              <option value="All">All</option>
              {tpmOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-800">Product</label>
            <select
              className="w-full rounded-sm border border-slate-500 bg-white px-3 py-2.5 text-base text-slate-900"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              <option value="All">All</option>
              {productOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-800">Forecast Cadence</label>
            <select
              className="w-full rounded-sm border border-slate-500 bg-white px-3 py-2.5 text-base text-slate-900"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as RecurrenceFilterValue)}
            >
              <option value="All">All</option>
              {RECURRENCE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-white">
        <table className="min-w-full border-collapse">
          <thead className="bg-[#708596] text-white">
            <tr>
              <th className="border-r border-slate-400 px-4 py-3 text-left text-sm font-semibold">Pillar</th>
              <th className="border-r border-slate-400 px-4 py-3 text-left text-sm font-semibold">TPM</th>
              <th className="border-r border-slate-400 px-4 py-3 text-left text-sm font-semibold">Products</th>
              <th className="border-r border-slate-400 px-4 py-3 text-left text-sm font-semibold">Forecast Cadence</th>
              <th className="border-r border-slate-400 px-4 py-3 text-left text-sm font-semibold">Window</th>
              <th className="border-r border-slate-400 px-4 py-3 text-right text-sm font-semibold">Instances</th>
              <th className="border-r border-slate-400 px-4 py-3 text-right text-sm font-semibold">Completed</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Open</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.id}
                className="cursor-pointer border-b-2 border-slate-400 bg-white hover:bg-slate-50"
                onClick={() => router.push(`/setups/${encodeURIComponent(s.id)}`)}
              >
                <td className="px-4 py-4 text-sm text-slate-800">{s.pillar}</td>
                <td className="px-4 py-4 text-sm text-slate-800">{s.tpm}</td>
                <td className="px-4 py-4 text-sm text-slate-800">{formatProductsLabel(s.products)}</td>
                <td className="px-4 py-4 text-sm text-slate-800">{s.recurrence}</td>
                <td className="px-4 py-4 text-sm text-slate-800">{s.startDate} - {s.endDate}</td>
                <td className="px-4 py-4 text-right text-sm text-slate-800">{s.cycleCount}</td>
                <td className="px-4 py-4 text-right text-sm text-slate-800">{s.completedCount}</td>
                <td className="px-4 py-4 text-right text-sm text-slate-800">{s.openCount}</td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={8}>
                  No setups match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
