"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import BackButton from "../components/BackButton";
import { useSessionData } from "../SessionDataProvider";
import { BASE_CYCLES, type ForecastCycleRow } from "../../lib/cycles";
import { PILLARS } from "../../lib/constants";
import { BASE_SETUPS, formatProductsLabel } from "../../lib/setups";
import { purchaseOrderRoute } from "../../lib/purchaseOrders";

type CalendarTab = "forecast" | "po";

function mergeById<T extends { id: string }>(base: T[], upsertsById: Record<string, T>) {
  const merged: T[] = base.map((r) => upsertsById[r.id] ?? r);
  const extra = Object.values(upsertsById).filter((r) => !base.some((b) => b.id === r.id));
  return [...merged, ...extra];
}

function parseIsoDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isoDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function daysUntilDue(dueIso: string, todayIso: string) {
  const dueDate = parseIsoDate(dueIso);
  const todayDate = parseIsoDate(todayIso);
  if (!dueDate || !todayDate) return null;
  const diff = dueDate.getTime() - todayDate.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function dueDateForTab(cycle: ForecastCycleRow, tab: CalendarTab) {
  return tab === "po" ? cycle.poSubmissionDue || cycle.tpmSubmissionDue : cycle.tpmSubmissionDue;
}

function destinationForTab(cycle: ForecastCycleRow, tab: CalendarTab) {
  return tab === "po" ? purchaseOrderRoute(cycle.id) : `/phases/${cycle.phaseId}?cycle=${encodeURIComponent(cycle.id)}`;
}

function isResolvedForTab(cycle: ForecastCycleRow, tab: CalendarTab) {
  if (tab === "po") return Boolean(cycle.closed || cycle.poSubmittedViaOutlook || cycle.poEmailSentDate);
  return cycle.closed;
}

function statusTone(cycle: ForecastCycleRow, todayIso: string, tab: CalendarTab) {
  if (isResolvedForTab(cycle, tab)) return "slate";

  const dueIso = dueDateForTab(cycle, tab);
  const daysRemaining = daysUntilDue(dueIso, todayIso);
  if (daysRemaining === null) return "emerald";
  if (daysRemaining < 0) return "rose";
  if (daysRemaining < 7) return "amber";
  return "emerald";
}

function badgeClassName(tone: "slate" | "emerald" | "amber" | "rose") {
  if (tone === "slate") return "bg-slate-200 text-slate-800";
  if (tone === "emerald") return "bg-emerald-100 text-emerald-900";
  if (tone === "amber") return "bg-amber-100 text-amber-900";
  return "bg-rose-600 text-white";
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export default function CalendarPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#efefef] py-6" />}>
      <CalendarPageContent />
    </Suspense>
  );
}

function CalendarPageContent() {
  const searchParams = useSearchParams();
  const { setupsById, cyclesById } = useSessionData();
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => isoDate(today), [today]);
  const activeTab: CalendarTab = searchParams.get("tab") === "po" ? "po" : "forecast";
  const [pillar, setPillar] = useState<string>("All");
  const [tpm, setTpm] = useState<string>("All");
  const [product, setProduct] = useState<string>("All");
  const [visibleMonth, setVisibleMonth] = useState<Date>(startOfMonth(today));

  const allSetups = useMemo(() => mergeById(BASE_SETUPS, setupsById), [setupsById]);
  const allCycles = useMemo(() => mergeById(BASE_CYCLES, cyclesById), [cyclesById]);

  const tpmOptions = useMemo(() => {
    return Array.from(new Set(allSetups.map((setup) => setup.tpm).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [allSetups]);

  const productOptions = useMemo(() => {
    return Array.from(new Set(allSetups.flatMap((setup) => setup.products ?? []).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [allSetups]);

  const filteredCycles = useMemo(() => {
    return allCycles.filter((cycle) => {
      if (pillar !== "All" && cycle.pillar !== pillar) return false;
      if (tpm !== "All" && cycle.tpm !== tpm) return false;
      if (product !== "All" && !(cycle.products ?? []).includes(product)) return false;
      return Boolean(dueDateForTab(cycle, activeTab));
    });
  }, [activeTab, allCycles, pillar, tpm, product]);

  const monthStart = useMemo(() => startOfMonth(visibleMonth), [visibleMonth]);
  const monthEnd = useMemo(() => addMonths(monthStart, 1), [monthStart]);
  const calendarStart = useMemo(() => addDays(monthStart, -monthStart.getUTCDay()), [monthStart]);
  const visibleDays = useMemo(() => {
    return Array.from({ length: 42 }, (_, index) => addDays(calendarStart, index));
  }, [calendarStart]);

  const cyclesByDate = useMemo(() => {
    const map = new Map<string, ForecastCycleRow[]>();
    for (const cycle of filteredCycles) {
      const key = dueDateForTab(cycle, activeTab);
      if (!key) continue;
      const existing = map.get(key) ?? [];
      existing.push(cycle);
      existing.sort((a, b) => a.label.localeCompare(b.label));
      map.set(key, existing);
    }
    return map;
  }, [activeTab, filteredCycles]);

  const currentMonthCount = useMemo(() => {
    return filteredCycles.filter((cycle) => {
      const dueDate = parseIsoDate(dueDateForTab(cycle, activeTab));
      return Boolean(dueDate && dueDate >= monthStart && dueDate < monthEnd);
    }).length;
  }, [activeTab, filteredCycles, monthEnd, monthStart]);

  const pageTitle = activeTab === "po" ? "PO Due Calendar" : "Forecast Due Calendar";
  const pageDescription = activeTab === "po"
    ? "Month-to-month PO due dates with filters for Pillar, TPM, and Product."
    : "Month-to-month forecast due dates with filters for Pillar, TPM, and Product.";
  const monthSummaryLabel = activeTab === "po" ? "PO due date" : "forecast due date";
  const legendDoneLabel = activeTab === "po" ? "Gray is submitted" : "Gray is completed";
  const tileCountLabel = activeTab === "po" ? "due" : "due";

  return (
    <main className="min-h-screen bg-[#efefef] py-6">
      <div className="mx-auto max-w-[1600px] px-4 space-y-4">
        <header className="border border-slate-500 bg-[#3a3a3a] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center rounded-sm border border-white px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              ← Home
            </Link>
            <BackButton />
          </div>
        </header>

        <section className="border border-slate-400 bg-white">
          <div className="border-b border-slate-300 bg-[#708596] px-5 py-4 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/85">Calendar View</div>
                <div className="mt-3 inline-flex rounded-sm border border-white/30 bg-white/10 p-1">
                  <Link
                    href="/calendar"
                    className={[
                      "rounded-sm px-3 py-2 text-sm font-semibold transition-colors",
                      activeTab === "forecast" ? "bg-white text-slate-900" : "text-white hover:bg-white/10"
                    ].join(" ")}
                  >
                    Forecast
                  </Link>
                  <Link
                    href="/calendar?tab=po"
                    className={[
                      "rounded-sm px-3 py-2 text-sm font-semibold transition-colors",
                      activeTab === "po" ? "bg-white text-slate-900" : "text-white hover:bg-white/10"
                    ].join(" ")}
                  >
                    PO
                  </Link>
                </div>
                <h1 className="mt-3 text-3xl font-semibold">{pageTitle}</h1>
                <p className="mt-2 max-w-4xl text-sm text-white/90">
                  {pageDescription}
                </p>
              </div>

              <div className="rounded-sm border border-white/30 bg-white/10 px-4 py-3 text-sm text-white">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">Visible month</div>
                <div className="mt-1 text-lg font-semibold">{MONTH_NAMES[monthStart.getUTCMonth()]} {monthStart.getUTCFullYear()}</div>
                <div className="mt-1 text-white/85">{currentMonthCount} {monthSummaryLabel}{currentMonthCount === 1 ? "" : "s"} in view</div>
              </div>
            </div>
          </div>

          <div className="space-y-6 bg-[#f4f4f4] px-5 py-5">
            <section className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-800">Pillar</label>
                <select className="w-full rounded-sm border border-slate-400 bg-white px-3 py-2.5 text-base text-slate-900" value={pillar} onChange={(e) => setPillar(e.target.value)}>
                  <option value="All">All</option>
                  {PILLARS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-800">TPM</label>
                <select className="w-full rounded-sm border border-slate-400 bg-white px-3 py-2.5 text-base text-slate-900" value={tpm} onChange={(e) => setTpm(e.target.value)}>
                  <option value="All">All</option>
                  {tpmOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-800">Product</label>
                <select className="w-full rounded-sm border border-slate-400 bg-white px-3 py-2.5 text-base text-slate-900" value={product} onChange={(e) => setProduct(e.target.value)}>
                  <option value="All">All</option>
                  {productOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  className="rounded-sm border border-slate-400 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  onClick={() => setVisibleMonth(addMonths(monthStart, -1))}
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  className="rounded-sm border border-slate-400 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  onClick={() => setVisibleMonth(startOfMonth(today))}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="rounded-sm border border-slate-400 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  onClick={() => setVisibleMonth(addMonths(monthStart, 1))}
                >
                  Next →
                </button>
              </div>
            </section>

            <section className="border border-slate-300 bg-white px-4 py-3">
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Legend</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-slate-300" /> {legendDoneLabel}</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-emerald-300" /> Green is on track</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-amber-300" /> Amber is risk: less than 7 days till due date</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-rose-500" /> Red is overdue</span>
              </div>
            </section>

            <section className="overflow-hidden border border-slate-300 bg-white">
              <div className="grid grid-cols-7 border-b border-slate-300 bg-[#d9d9d9] text-slate-800">
                {WEEKDAY_NAMES.map((name) => (
                  <div key={name} className="border-r border-slate-300 px-3 py-2 text-center text-sm font-semibold last:border-r-0">
                    {name}
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <div className="grid min-w-[1100px] grid-cols-7">
                  {visibleDays.map((day) => {
                    const key = isoDate(day);
                    const dayCycles = cyclesByDate.get(key) ?? [];
                    const inCurrentMonth = day.getUTCMonth() === monthStart.getUTCMonth();
                    const isToday = key === todayIso;
                    const resolvedCount = dayCycles.filter((cycle) => isResolvedForTab(cycle, activeTab)).length;
                    const allResolved = dayCycles.length > 0 && resolvedCount === dayCycles.length;
                    return (
                      <div key={key} className={[
                        "min-h-[170px] border-r border-b border-slate-300 p-2 last:border-r-0",
                        isToday ? "bg-sky-50" : "bg-white"
                      ].join(" ")}>
                        <div className="flex items-center justify-between">
                          <span className={[
                            "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-semibold",
                            isToday ? "bg-sky-600 text-white" : "",
                            inCurrentMonth ? "text-slate-900" : "text-slate-400"
                          ].join(" ")}>
                            {String(day.getUTCDate()).padStart(2, "0")}
                          </span>
                          <div className="flex items-center gap-2">
                            {isToday ? (
                              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Today</span>
                            ) : null}
                            {dayCycles.length > 0 ? (
                              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                {allResolved ? `${resolvedCount} ${activeTab === "po" ? "submitted" : "completed"}` : `${dayCycles.length} ${tileCountLabel}`}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-2 space-y-1.5">
                          {dayCycles.slice(0, 3).map((cycle) => {
                            const tone = statusTone(cycle, todayIso, activeTab);
                            return (
                              <Link
                                key={cycle.id}
                                href={destinationForTab(cycle, activeTab)}
                                className={[
                                  "block rounded-sm px-2 py-1 text-xs font-medium leading-5",
                                  badgeClassName(tone)
                                ].join(" ")}
                                title={`${cycle.id} • ${cycle.tpm} • ${formatProductsLabel(cycle.products)} • ${dueDateForTab(cycle, activeTab)}`}
                              >
                                <span className="block truncate">{cycle.id} • {cycle.tpm}</span>
                                <span className="block truncate opacity-90">{formatProductsLabel(cycle.products) || cycle.label}</span>
                              </Link>
                            );
                          })}
                          {dayCycles.length > 3 ? (
                            <div className="px-2 text-xs font-semibold text-sky-700">+{dayCycles.length - 3} more</div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}