"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BackButton from "../components/BackButton";
import { useSessionData } from "../SessionDataProvider";
import { BASE_CYCLES } from "../../lib/cycles";
import { BASE_SETUPS } from "../../lib/setups";
import { PILLARS } from "../../lib/constants";
import {
  buildCentralDashboard,
  type CentralDueRow,
  type CentralExpirationRow,
  type CentralLeadershipRow,
  type CentralSetupSummaryRow,
  type CentralTpmAttentionRow,
  type MetricSummary
} from "../../lib/metrics";

function mergeById<T extends { id: string }>(base: T[], upsertsById: Record<string, T>) {
  const merged: T[] = base.map((r) => upsertsById[r.id] ?? r);
  const extra = Object.values(upsertsById).filter((r) => !base.some((b) => b.id === r.id));
  return [...merged, ...extra];
}

export default function CentralPage() {
  const { setupsById, cyclesById } = useSessionData();
  const [pillar, setPillar] = useState<string>("All");

  const allSetups = useMemo(() => mergeById(BASE_SETUPS, setupsById), [setupsById]);
  const allCycles = useMemo(() => mergeById(BASE_CYCLES, cyclesById), [cyclesById]);
  const dashboard = useMemo(() => buildCentralDashboard(allCycles, allSetups, pillar), [allCycles, allSetups, pillar]);

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
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/85">Central View</div>
                <h1 className="mt-2 text-3xl font-semibold">Central Forecast and PO Overview</h1>
                <p className="mt-2 max-w-4xl text-sm text-white/90">
                  A central or pillar lead view of due forecasts, PO follow-up, current phase distribution, upcoming contract expirations, and on-time submission performance.
                </p>
              </div>

              <div className="min-w-[220px] space-y-1">
                <label className="block text-sm font-semibold text-white">Pillar</label>
                <select
                  className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900"
                  value={pillar}
                  onChange={(e) => setPillar(e.target.value)}
                >
                  <option value="All">All</option>
                  {PILLARS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6 bg-[#f4f4f4] px-5 py-5">
            <section className="grid gap-4 xl:grid-cols-2">
              <LeadershipOnTimeTable
                title="Forecast On-Time Submission %"
                description=""
                rows={dashboard.leadershipRows}
              />
              <LeadershipOnTimeTable
                title="PO On-Time Submission %"
                description=""
                rows={dashboard.poLeadershipRows}
              />
            </section>

            <section>
              <TpmAttentionPanel rows={dashboard.tpmAttentionRows} />
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {dashboard.headline.map((metric) => (
                <MetricCard key={metric.label} metric={metric} />
              ))}
            </section>

            <section>
              <DueThisMonthTable rows={dashboard.dueThisMonthRows} />
            </section>

            <section>
              <DueTable title="Forecasts Due In Next 3 Months" emptyMessage="No forecast instances are due in the next 3 months for the current pillar filter." rows={dashboard.dueNextThreeMonthsRows} />
            </section>

            <UpcomingExpirationsTable rows={dashboard.upcomingExpirations} />

            <SetupSummaryTable rows={dashboard.setupSummaryRows} />
          </div>
        </section>
      </div>
    </main>
  );
}

function toneClassName(tone: "slate" | "emerald" | "amber" | "rose") {
  if (tone === "slate") return "border-slate-300 bg-slate-50 text-slate-800";
  if (tone === "emerald") return "border-emerald-300 bg-emerald-50 text-emerald-950";
  if (tone === "amber") return "border-amber-300 bg-amber-50 text-amber-950";
  return "border-rose-300 bg-rose-50 text-rose-950";
}

function LeadershipOnTimeTable({
  title,
  description,
  rows
}: {
  title: string;
  description: string;
  rows: CentralLeadershipRow[];
}) {
  return (
    <section className="overflow-hidden border border-slate-300 bg-white">
      <div className="border-b border-slate-300 bg-slate-100 px-4 py-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-10 text-sm text-slate-500">No TPM submission data is available for the current pillar filter.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-[#d9d9d9] text-slate-800">
              <tr>
                <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">TPM</th>
                <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">Forecast Cadence</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">On-Time Submission %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.tpm} className={index < rows.length - 1 ? "border-b border-slate-200" : ""}>
                  <td className="px-4 py-4 text-sm font-medium text-slate-900">
                    {row.setupId ? (
                      <Link href={`/setups/${encodeURIComponent(row.setupId)}`} className="underline underline-offset-2 hover:text-slate-700">
                        {row.tpm}
                      </Link>
                    ) : (
                      row.tpm
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{row.forecastCadence}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {row.setupId ? (
                      <Link href={`/setups/${encodeURIComponent(row.setupId)}`} className="inline-flex">
                        <span className={["inline-flex rounded-sm border px-2.5 py-1 font-semibold", toneClassName(row.tone)].join(" ")}>
                          {row.onTimeSubmissionPercent}
                        </span>
                      </Link>
                    ) : (
                      <span className={["inline-flex rounded-sm border px-2.5 py-1 font-semibold", toneClassName(row.tone)].join(" ")}>
                        {row.onTimeSubmissionPercent}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TpmAttentionPanel({ rows }: { rows: CentralTpmAttentionRow[] }) {
  return (
    <section className="overflow-hidden border border-slate-300 bg-white">
      <div className="border-b border-slate-300 bg-slate-100 px-4 py-3">
        <h2 className="text-lg font-semibold text-slate-900">TPMs Needing Attention</h2>
        <p className="mt-1 text-sm text-slate-600">The shortest list leaders need for quick escalation and drill-down.</p>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-10 text-sm text-slate-500">No TPMs are currently flagged for overdue forecasts, pending PO acknowledgements, or upcoming contract expirations.</div>
      ) : (
        <div className="divide-y divide-slate-200">
          {rows.map((row) => (
            <div key={`${row.tpm}-${row.setupId}`} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={["inline-flex rounded-sm border px-2 py-1 text-xs font-semibold", toneClassName(row.tone)].join(" ")}>
                    {row.tone === "emerald" ? "Green" : row.tone === "amber" ? "Orange" : "Red"}
                  </span>
                  <span className="text-base font-semibold text-slate-900">{row.tpm}</span>
                </div>
                <div className="mt-1 text-sm text-slate-700">{row.issueSummary}</div>
                <div className="mt-1 text-sm text-slate-500">{row.products || "No products listed"}</div>
              </div>
              {row.setupId ? (
                <Link
                  href={`/setups/${encodeURIComponent(row.setupId)}`}
                  className="inline-flex shrink-0 items-center rounded-sm border border-slate-400 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  View details
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MetricCard({ metric }: { metric: MetricSummary }) {
  const toneClassName = metric.tone === "emerald"
    ? "border-emerald-300 bg-emerald-50"
    : metric.tone === "amber"
      ? "border-amber-300 bg-amber-50"
      : metric.tone === "rose"
        ? "border-rose-300 bg-rose-50"
        : metric.tone === "sky"
          ? "border-sky-300 bg-sky-50"
          : "border-slate-300 bg-white";

  return (
    <div className={["border px-4 py-4", toneClassName].join(" ")}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-950">{metric.value}</div>
      {metric.detail ? <div className="mt-2 text-sm text-slate-600">{metric.detail}</div> : null}
    </div>
  );
}

function DueThisMonthTable({ rows }: { rows: CentralDueRow[] }) {
  return <DueTable title="Forecasts Due This Month" emptyMessage="No forecast instances are due this month for the current pillar filter." rows={rows} />;
}

function DueTable({
  title,
  emptyMessage,
  rows
}: {
  title: string;
  emptyMessage: string;
  rows: CentralDueRow[];
}) {
  return (
    <section className="overflow-hidden border border-slate-300 bg-white">
      <div className="border-b border-slate-300 bg-slate-100 px-4 py-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-10 text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-[#d9d9d9] text-slate-800">
              <tr>
                <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">Instance</th>
                <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">TPM</th>
                <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">Due Date</th>
                <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">Current Phase</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className={[
                  index < rows.length - 1 ? "border-b border-slate-200" : "",
                  row.overdue ? "bg-rose-50" : ""
                ].join(" ")}>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.instance}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.tpm}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.dueDate}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.currentPhase}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <span
                      className={[
                        "inline-flex rounded-sm border px-2 py-1 text-xs font-semibold",
                        row.overdue
                          ? "border-rose-300 bg-rose-50 text-rose-900"
                          : row.status === "Completed"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                            : "border-sky-300 bg-sky-50 text-sky-900"
                      ].join(" ")}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function UpcomingExpirationsTable({ rows }: { rows: CentralExpirationRow[] }) {
  return (
    <section className="overflow-hidden border border-slate-300 bg-white">
      <div className="border-b border-slate-300 bg-slate-100 px-4 py-3">
        <h2 className="text-lg font-semibold text-slate-900">Upcoming Contract Expiration Dates</h2>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-10 text-sm text-slate-500">No contract expirations are coming up in the next 90 days for the current pillar filter.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-[#d9d9d9] text-slate-800">
              <tr>
                <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">Setup</th>
                <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">TPM</th>
                <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">Products</th>
                <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">End Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Days Remaining</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.setupId} className={index < rows.length - 1 ? "border-b border-slate-200" : ""}>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.setupId}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.tpm}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.products || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.endDate}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.daysRemaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SetupSummaryTable({ rows }: { rows: CentralSetupSummaryRow[] }) {
  return (
    <section className="overflow-hidden border border-slate-300 bg-white">
      <div className="border-b border-slate-300 bg-slate-100 px-4 py-3">
        <h2 className="text-lg font-semibold text-slate-900">Pre-Cycle Setup Summary</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-[#d9d9d9] text-slate-800">
            <tr>
              <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">TPM</th>
              <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">Product(s)</th>
              <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">Forecast Cadence</th>
              <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">Rolling Forecast Horizon</th>
              <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">Firm Period</th>
              <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">Binding Period</th>
              <th className="border-r border-slate-300 px-4 py-3 text-left text-sm font-semibold">TPM Submission Due Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Contract Effective Dates</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.setupId} className={index < rows.length - 1 ? "border-b border-slate-200" : ""}>
                <td className="px-4 py-4 text-sm font-medium text-slate-900">{row.tpm}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{row.products || "—"}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{row.recurrence}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{row.rollingForecastHorizon}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{row.firmPeriod}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{row.bindingPeriod}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{row.tpmSubmissionDueDate}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{row.contractEffectiveDates}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}