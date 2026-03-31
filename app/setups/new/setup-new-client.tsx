"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PILLARS, TPM_OPTIONS } from "../../../lib/constants";
import { loadProductCatalog, upsertProductToCatalog } from "../../../lib/productCatalog";
import {
  BASE_SETUPS,
  computeSetupEndDate,
  DEFAULT_PREPARATION_DUE_SCHEDULE,
  DEFAULT_REVIEW_DUE_SCHEDULE,
  DEFAULT_TPM_SUBMISSION_SCHEDULE,
  type DurationUnit,
  type EndDateMode,
  NTH_WEEKDAY_OPTIONS,
  QUARTER_MONTH_IN_PERIOD_OPTIONS,
  RECURRENCE_OPTIONS,
  WEEKDAY_OPTIONS,
  MONTH_OF_YEAR_OPTIONS,
  nextSetupId,
  type MonthOfYear,
  type QuarterMonthInPeriod,
  type NthWeekday,
  type Recurrence,
  type SetupRow,
  type TpmSubmissionScheduleRule,
  type Weekday
} from "../../../lib/setups";
import { BASE_CYCLES, generateCyclesForSetup } from "../../../lib/cycles";
import { useSessionData } from "../../SessionDataProvider";
import {
  PowerCommandBar,
  PowerField,
  PowerInfoStrip,
  PowerPanel,
  PowerPill,
  powerGhostButtonClassName,
  powerInputClassName,
  powerPrimaryButtonClassName
} from "../../phases/phase-ui";

function mergeById<T extends { id: string }>(base: T[], upsertsById: Record<string, T>) {
  const merged: T[] = base.map((r) => upsertsById[r.id] ?? r);
  const extra = Object.values(upsertsById).filter((r) => !base.some((b) => b.id === r.id));
  return [...merged, ...extra];
}

function splitList(v: string) {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function ordinal(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n}st`;
  if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${n}rd`;
  return `${n}th`;
}

function dayOfMonthLabel(day: number) {
  const d = Math.floor(day);
  return ordinal(d);
}

function recurrenceNoun(recurrence: Recurrence) {
  if (recurrence === "Monthly") return "Month";
  if (recurrence === "Quarterly") return "Quarter";
  return "Year";
}

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

function quarterMonthLabel(v: QuarterMonthInPeriod) {
  if (v === 1) return "first";
  if (v === 2) return "second";
  return "last";
}

function describeTpmSchedule(rule: TpmSubmissionScheduleRule, recurrence: Recurrence) {
  if (recurrence === "Monthly") {
    if (rule.type === "FixedCalendarDate") return `${dayOfMonthLabel(rule.dayOfMonth)} of each month`;
    if (rule.type === "NthWeekdayOfMonth") return `${ordinal(rule.nth)} ${rule.weekday} of each month`;
    return `Last ${rule.weekday} of each month`;
  }

  if (recurrence === "Quarterly") {
    const monthInQuarter = (rule.periodMonthInQuarter ?? 3) as QuarterMonthInPeriod;
    const label = quarterMonthLabel(monthInQuarter);
    if (rule.type === "FixedCalendarDate") return `${dayOfMonthLabel(rule.dayOfMonth)} of the ${label} month of each quarter`;
    if (rule.type === "NthWeekdayOfMonth") return `${ordinal(rule.nth)} ${rule.weekday} of the ${label} month of each quarter`;
    return `Last ${rule.weekday} of the ${label} month of each quarter`;
  }

  const monthOfYear = (rule.periodMonthOfYear ?? 3) as MonthOfYear;
  const monthName = MONTH_NAMES[monthOfYear - 1] ?? "March";
  if (rule.type === "FixedCalendarDate") return `${monthName} ${dayOfMonthLabel(rule.dayOfMonth)} of each year`;
  if (rule.type === "NthWeekdayOfMonth") return `${ordinal(rule.nth)} ${rule.weekday} of ${monthName} each year`;
  return `Last ${rule.weekday} of ${monthName} each year`;
}

export function SetupNewClient() {
  const router = useRouter();
  const { setupsById, cyclesById, upsertSetup, upsertCycle } = useSessionData();

  const allSetups = useMemo(() => mergeById(BASE_SETUPS, setupsById), [setupsById]);
  const allCycles = useMemo(() => mergeById(BASE_CYCLES, cyclesById), [cyclesById]);

  const defaultStart = "2026-01-01";
  const defaultEnd = "2026-12-31";

  const [pillar, setPillar] = useState<SetupRow["pillar"]>(PILLARS[0]);
  const [tpm, setTpm] = useState("");
  const [products, setProducts] = useState<string[]>([]);
  const [productDraft, setProductDraft] = useState("");
  const [productCatalog, setProductCatalog] = useState<string[]>([]);
  const [tpmLocation, setTpmLocation] = useState("");
  const [tpmPreviousCompanyName, setTpmPreviousCompanyName] = useState("");
  const [bindingPeriod, setBindingPeriod] = useState("");
  const [firmPeriodRaw, setFirmPeriodRaw] = useState("");
  const [rollingForecastHorizonRaw, setRollingForecastHorizonRaw] = useState("");
  const [assigneesRaw, setAssigneesRaw] = useState("");
  const [approversRaw, setApproversRaw] = useState("");
  const [additionalApproversRaw, setAdditionalApproversRaw] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("Monthly");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [endDateMode, setEndDateMode] = useState<EndDateMode>("ExactDate");
  const [endDateOffsetValueRaw, setEndDateOffsetValueRaw] = useState("12");
  const [endDateOffsetUnit, setEndDateOffsetUnit] = useState<DurationUnit>("months");
  const [initiationReminderDaysRaw, setInitiationReminderDaysRaw] = useState("14");
  const [automateInstanceInitiation, setAutomateInstanceInitiation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseProductOptions = useMemo(() => {
    return Array.from(
      new Set(
        allSetups
          .flatMap((s) => s.products ?? [])
          .map((p) => p.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [allSetups]);

  const tpmOptions = useMemo(() => {
    return Array.from(
      new Set(
        [
          ...TPM_OPTIONS,
          ...allSetups.map((setup) => setup.tpm).filter(Boolean)
        ].map((value) => value.trim()).filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [allSetups]);

  const productSuggestions = useMemo(() => {
    const q = productDraft.trim().toLowerCase();
    if (!q) return [] as string[];
    const selectedLower = new Set(products.map((p) => p.toLowerCase()));
    return productCatalog
      .filter((p) => p.toLowerCase().includes(q))
      .filter((p) => !selectedLower.has(p.toLowerCase()))
      .slice(0, 8);
  }, [productDraft, productCatalog, products]);

  const [scheduleType, setScheduleType] = useState<TpmSubmissionScheduleRule["type"]>(
    DEFAULT_TPM_SUBMISSION_SCHEDULE.type
  );
  const [fixedDayOfMonth, setFixedDayOfMonth] = useState<number>(
    DEFAULT_TPM_SUBMISSION_SCHEDULE.type === "FixedCalendarDate" ? DEFAULT_TPM_SUBMISSION_SCHEDULE.dayOfMonth : 25
  );
  const [nth, setNth] = useState<NthWeekday>(3);
  const [nthWeekday, setNthWeekday] = useState<Weekday>("Thursday");
  const [lastWeekday, setLastWeekday] = useState<Weekday>("Thursday");
  const [periodMonthInQuarter, setPeriodMonthInQuarter] = useState<QuarterMonthInPeriod>(
    (DEFAULT_TPM_SUBMISSION_SCHEDULE.periodMonthInQuarter ?? 3) as QuarterMonthInPeriod
  );
  const [periodMonthOfYear, setPeriodMonthOfYear] = useState<MonthOfYear>(
    (DEFAULT_TPM_SUBMISSION_SCHEDULE.periodMonthOfYear ?? 3) as MonthOfYear
  );

  const [preparationScheduleType, setPreparationScheduleType] = useState<TpmSubmissionScheduleRule["type"]>(
    DEFAULT_PREPARATION_DUE_SCHEDULE.type
  );
  const [preparationFixedDayOfMonth, setPreparationFixedDayOfMonth] = useState<number>(
    DEFAULT_PREPARATION_DUE_SCHEDULE.type === "FixedCalendarDate" ? DEFAULT_PREPARATION_DUE_SCHEDULE.dayOfMonth : 17
  );
  const [preparationNth, setPreparationNth] = useState<NthWeekday>(
    DEFAULT_PREPARATION_DUE_SCHEDULE.type === "NthWeekdayOfMonth" ? DEFAULT_PREPARATION_DUE_SCHEDULE.nth : 3
  );
  const [preparationNthWeekday, setPreparationNthWeekday] = useState<Weekday>(
    DEFAULT_PREPARATION_DUE_SCHEDULE.type === "NthWeekdayOfMonth" ? DEFAULT_PREPARATION_DUE_SCHEDULE.weekday : "Friday"
  );
  const [preparationLastWeekday, setPreparationLastWeekday] = useState<Weekday>(
    DEFAULT_PREPARATION_DUE_SCHEDULE.type === "LastWeekdayOfMonth" ? DEFAULT_PREPARATION_DUE_SCHEDULE.weekday : "Thursday"
  );
  const [preparationPeriodMonthInQuarter, setPreparationPeriodMonthInQuarter] = useState<QuarterMonthInPeriod>(
    (DEFAULT_PREPARATION_DUE_SCHEDULE.periodMonthInQuarter ?? 3) as QuarterMonthInPeriod
  );
  const [preparationPeriodMonthOfYear, setPreparationPeriodMonthOfYear] = useState<MonthOfYear>(
    (DEFAULT_PREPARATION_DUE_SCHEDULE.periodMonthOfYear ?? 3) as MonthOfYear
  );

  const [reviewScheduleType, setReviewScheduleType] = useState<TpmSubmissionScheduleRule["type"]>(
    DEFAULT_REVIEW_DUE_SCHEDULE.type
  );
  const [reviewDueSameAsPreparation, setReviewDueSameAsPreparation] = useState(true);
  const [reviewFixedDayOfMonth, setReviewFixedDayOfMonth] = useState<number>(
    DEFAULT_REVIEW_DUE_SCHEDULE.type === "FixedCalendarDate" ? DEFAULT_REVIEW_DUE_SCHEDULE.dayOfMonth : 22
  );
  const [reviewNth, setReviewNth] = useState<NthWeekday>(
    DEFAULT_REVIEW_DUE_SCHEDULE.type === "NthWeekdayOfMonth" ? DEFAULT_REVIEW_DUE_SCHEDULE.nth : 3
  );
  const [reviewNthWeekday, setReviewNthWeekday] = useState<Weekday>(
    DEFAULT_REVIEW_DUE_SCHEDULE.type === "NthWeekdayOfMonth" ? DEFAULT_REVIEW_DUE_SCHEDULE.weekday : "Friday"
  );
  const [reviewLastWeekday, setReviewLastWeekday] = useState<Weekday>(
    DEFAULT_REVIEW_DUE_SCHEDULE.type === "LastWeekdayOfMonth" ? DEFAULT_REVIEW_DUE_SCHEDULE.weekday : "Thursday"
  );
  const [reviewPeriodMonthInQuarter, setReviewPeriodMonthInQuarter] = useState<QuarterMonthInPeriod>(
    (DEFAULT_REVIEW_DUE_SCHEDULE.periodMonthInQuarter ?? 3) as QuarterMonthInPeriod
  );
  const [reviewPeriodMonthOfYear, setReviewPeriodMonthOfYear] = useState<MonthOfYear>(
    (DEFAULT_REVIEW_DUE_SCHEDULE.periodMonthOfYear ?? 3) as MonthOfYear
  );

  useEffect(() => {
    // Load and merge product catalog from localStorage for future selections.
    setProductCatalog(loadProductCatalog(baseProductOptions));
  }, [baseProductOptions]);

  function addProduct(name: string) {
    const v = name.trim();
    if (!v) return;

    setProducts((prev) => {
      if (prev.some((p) => p.toLowerCase() === v.toLowerCase())) return prev;
      return [...prev, v];
    });
    setProductCatalog(upsertProductToCatalog(v, baseProductOptions));
  }

  function removeProduct(name: string) {
    setProducts((prev) => prev.filter((p) => p !== name));
  }

  const tpmSubmissionSchedule: TpmSubmissionScheduleRule = (() => {
    if (scheduleType === "FixedCalendarDate") {
      return { type: "FixedCalendarDate", dayOfMonth: fixedDayOfMonth, periodMonthInQuarter, periodMonthOfYear };
    }
    if (scheduleType === "NthWeekdayOfMonth") {
      return { type: "NthWeekdayOfMonth", nth, weekday: nthWeekday, periodMonthInQuarter, periodMonthOfYear };
    }
    return { type: "LastWeekdayOfMonth", weekday: lastWeekday, periodMonthInQuarter, periodMonthOfYear };
  })();

  const preparationDueSchedule: TpmSubmissionScheduleRule = (() => {
    if (preparationScheduleType === "FixedCalendarDate") {
      return {
        type: "FixedCalendarDate",
        dayOfMonth: preparationFixedDayOfMonth,
        periodMonthInQuarter: preparationPeriodMonthInQuarter,
        periodMonthOfYear: preparationPeriodMonthOfYear
      };
    }
    if (preparationScheduleType === "NthWeekdayOfMonth") {
      return {
        type: "NthWeekdayOfMonth",
        nth: preparationNth,
        weekday: preparationNthWeekday,
        periodMonthInQuarter: preparationPeriodMonthInQuarter,
        periodMonthOfYear: preparationPeriodMonthOfYear
      };
    }
    return {
      type: "LastWeekdayOfMonth",
      weekday: preparationLastWeekday,
      periodMonthInQuarter: preparationPeriodMonthInQuarter,
      periodMonthOfYear: preparationPeriodMonthOfYear
    };
  })();

  const reviewDueSchedule: TpmSubmissionScheduleRule = (() => {
    if (reviewDueSameAsPreparation) {
      return preparationDueSchedule;
    }
    if (reviewScheduleType === "FixedCalendarDate") {
      return {
        type: "FixedCalendarDate",
        dayOfMonth: reviewFixedDayOfMonth,
        periodMonthInQuarter: reviewPeriodMonthInQuarter,
        periodMonthOfYear: reviewPeriodMonthOfYear
      };
    }
    if (reviewScheduleType === "NthWeekdayOfMonth") {
      return {
        type: "NthWeekdayOfMonth",
        nth: reviewNth,
        weekday: reviewNthWeekday,
        periodMonthInQuarter: reviewPeriodMonthInQuarter,
        periodMonthOfYear: reviewPeriodMonthOfYear
      };
    }
    return {
      type: "LastWeekdayOfMonth",
      weekday: reviewLastWeekday,
      periodMonthInQuarter: reviewPeriodMonthInQuarter,
      periodMonthOfYear: reviewPeriodMonthOfYear
    };
  })();

  const unitLower = recurrenceNoun(recurrence).toLowerCase();
  const periodHint = recurrence === "Monthly" ? "" : ` (defaults to final month of the ${unitLower})`;
  const headerTitle = "New Setup";
  const computedEndDate = useMemo(() => {
    const parsedOffset = endDateOffsetValueRaw.trim() === "" ? null : Number(endDateOffsetValueRaw);
    return computeSetupEndDate(startDate, endDateMode, endDate, parsedOffset, endDateOffsetUnit);
  }, [endDate, endDateMode, endDateOffsetUnit, endDateOffsetValueRaw, startDate]);

  return (
    <div className="space-y-4">
      <div className="border-b border-slate-500 bg-[#3a3a3a] px-4 py-4 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{headerTitle}</h1>
            <div className="mt-2 text-sm text-slate-200">
              Configure the forecast template, due-date rules, and routing details.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
            <div className="border border-slate-500 bg-[#4a4a4a] px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">Mode</div>
              <div className="mt-1 text-sm font-semibold text-white">Create new setup</div>
            </div>
            <div className="border border-slate-500 bg-[#4a4a4a] px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">Cadence</div>
              <div className="mt-1 text-sm font-semibold text-white">{recurrence}</div>
            </div>
            <div className="border border-slate-500 bg-[#4a4a4a] px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">Products</div>
              <div className="mt-1 text-sm font-semibold text-white">{products.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 bg-[#f4f4f4] px-4 py-4">
        {error ? <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

        <PowerPanel title="Setup details" tone="sky">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <PowerField label="Pillar">
            <select
              className={powerInputClassName}
              value={pillar}
              onChange={(e) => setPillar(e.target.value as SetupRow["pillar"])}
            >
              {PILLARS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            </PowerField>

            <PowerField label="Forecast cadence">
            <select
              className={powerInputClassName}
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as Recurrence)}
            >
              {RECURRENCE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            </PowerField>

            <PowerField label="TPM name">
            <input
              className={powerInputClassName}
              value={tpm}
              onChange={(e) => setTpm(e.target.value)}
              list="setup-tpm-options"
            />
            <datalist id="setup-tpm-options">
              {tpmOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            </PowerField>

            <PowerField label="TPM previous company name">
            <input
              className={powerInputClassName}
              value={tpmPreviousCompanyName}
              onChange={(e) => setTpmPreviousCompanyName(e.target.value)}
            />
            </PowerField>

            <PowerField label="TPM location">
            <input
              className={powerInputClassName}
              value={tpmLocation}
              onChange={(e) => setTpmLocation(e.target.value)}
            />
            </PowerField>

            <PowerField label="Products">
            <input
              className={powerInputClassName}
              value={productDraft}
              onChange={(e) => setProductDraft(e.target.value)}
              list="setup-product-options"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                addProduct(productDraft);
                setProductDraft("");
              }}
            />
            <datalist id="setup-product-options">
              {productCatalog.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>

            {productSuggestions.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {productSuggestions.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="border border-slate-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                    onClick={() => {
                      addProduct(p);
                      setProductDraft("");
                    }}
                    title="Add product"
                  >
                    + {p}
                  </button>
                ))}
              </div>
            ) : null}

            {products.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {products.map((p) => (
                  <PowerPill key={p}>
                    {p}
                    <button
                      type="button"
                      className="border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
                      onClick={() => removeProduct(p)}
                      aria-label={`Remove ${p}`}
                      title="Remove"
                    >
                      ×
                    </button>
                  </PowerPill>
                ))}
              </div>
            ) : null}
            </PowerField>

            <PowerField label="Binding period">
            <input
              className={powerInputClassName}
              value={bindingPeriod}
              onChange={(e) => setBindingPeriod(e.target.value)}
            />
            </PowerField>

            <PowerField label="Firm period">
            <input
              type="number"
              min={0}
              className={powerInputClassName}
              value={firmPeriodRaw}
              onChange={(e) => setFirmPeriodRaw(e.target.value)}
              placeholder="(months)"
            />
            </PowerField>

            <PowerField label="Rolling forecast horizon">
            <input
              type="number"
              min={0}
              className={powerInputClassName}
              value={rollingForecastHorizonRaw}
              onChange={(e) => setRollingForecastHorizonRaw(e.target.value)}
              placeholder="(months)"
            />
            </PowerField>

            <PowerField label="Start date">
            <input
              type="date"
              className={powerInputClassName}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            </PowerField>

            <PowerField label="End date">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="setupEndDateMode"
                  checked={endDateMode === "ExactDate"}
                  onChange={() => setEndDateMode("ExactDate")}
                />
                Use an exact end date
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="setupEndDateMode"
                  checked={endDateMode === "RelativeOffset"}
                  onChange={() => setEndDateMode("RelativeOffset")}
                />
                Set end date relative to the start date
              </label>

              {endDateMode === "ExactDate" ? (
                <input
                  type="date"
                  className={powerInputClassName}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      className={`${powerInputClassName} w-32`}
                      value={endDateOffsetValueRaw}
                      onChange={(e) => setEndDateOffsetValueRaw(e.target.value)}
                    />
                    <select
                      className={`${powerInputClassName} w-40`}
                      value={endDateOffsetUnit}
                      onChange={(e) => setEndDateOffsetUnit(e.target.value as DurationUnit)}
                    >
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                    </select>
                    <span className="text-sm text-slate-700">after the start date</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    Calculated end date: <span className="font-semibold text-slate-900">{computedEndDate || "—"}</span>
                  </div>
                </div>
              )}
            </div>
            </PowerField>
          </div>
        </PowerPanel>

        <PowerPanel title="TPM submission scheduling rule" tone="slate">
          <div className="space-y-4">
            <PowerInfoStrip tone="slate">
              Selected default TPM submission due date: <span className="font-semibold">{describeTpmSchedule(tpmSubmissionSchedule, recurrence)}</span>
            </PowerInfoStrip>

            {recurrence === "Quarterly" ? (
              <div className="border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Quarter alignment</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span>Apply rule to</span>
                  <select
                    className={powerInputClassName}
                    value={periodMonthInQuarter}
                    onChange={(e) => setPeriodMonthInQuarter(Number(e.target.value) as QuarterMonthInPeriod)}
                  >
                    {QUARTER_MONTH_IN_PERIOD_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v === 1 ? "First month" : v === 2 ? "Second month" : "Last month"}
                      </option>
                    ))}
                  </select>
                  <span>of each quarter</span>
                </div>
              </div>
            ) : null}

            {recurrence === "Yearly" ? (
              <div className="border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Year alignment</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span>Apply rule in</span>
                  <select
                    className={powerInputClassName}
                    value={periodMonthOfYear}
                    onChange={(e) => setPeriodMonthOfYear(Number(e.target.value) as MonthOfYear)}
                  >
                    {MONTH_OF_YEAR_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {MONTH_NAMES[m - 1]}
                      </option>
                    ))}
                  </select>
                  <span>each year</span>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3">
              <label className="flex items-start gap-3 border border-slate-300 bg-white px-4 py-3">
                <input
                  type="radio"
                  name="tpmSchedule"
                  className="mt-1"
                  checked={scheduleType === "FixedCalendarDate"}
                  onChange={() => setScheduleType("FixedCalendarDate")}
                />
                <div className="flex-1 space-y-2">
                  <div className="text-sm font-semibold text-slate-800">Fixed calendar day of period</div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <span>Day of month{periodHint}</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="w-24 rounded-sm border border-slate-500 bg-white px-3 py-2 text-base text-slate-900"
                      value={fixedDayOfMonth}
                      onChange={(e) => setFixedDayOfMonth(Number(e.target.value))}
                    />
                    <span className="text-xs text-slate-700">Example: 25</span>
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 border border-slate-300 bg-white px-4 py-3">
                <input
                  type="radio"
                  name="tpmSchedule"
                  className="mt-1"
                  checked={scheduleType === "NthWeekdayOfMonth"}
                  onChange={() => setScheduleType("NthWeekdayOfMonth")}
                />
                <div className="flex-1 space-y-2">
                  <div className="text-sm font-semibold text-slate-800">Nth weekday of period</div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <span>Nth</span>
                    <select
                      className="rounded-sm border border-slate-500 bg-white px-3 py-2 text-base text-slate-900"
                      value={nth}
                      onChange={(e) => setNth(Number(e.target.value) as NthWeekday)}
                    >
                      {NTH_WEEKDAY_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <span>Weekday</span>
                    <select
                      className="rounded-sm border border-slate-500 bg-white px-3 py-2 text-base text-slate-900"
                      value={nthWeekday}
                      onChange={(e) => setNthWeekday(e.target.value as Weekday)}
                    >
                      {WEEKDAY_OPTIONS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-slate-700">Example: 3rd Thursday</span>
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 border border-slate-300 bg-white px-4 py-3">
                <input
                  type="radio"
                  name="tpmSchedule"
                  className="mt-1"
                  checked={scheduleType === "LastWeekdayOfMonth"}
                  onChange={() => setScheduleType("LastWeekdayOfMonth")}
                />
                <div className="flex-1 space-y-2">
                  <div className="text-sm font-semibold text-slate-800">Last weekday of period</div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <span>Weekday</span>
                    <select
                      className="rounded-sm border border-slate-500 bg-white px-3 py-2 text-base text-slate-900"
                      value={lastWeekday}
                      onChange={(e) => setLastWeekday(e.target.value as Weekday)}
                    >
                      {WEEKDAY_OPTIONS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-slate-700">Example: Last Thursday</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </PowerPanel>

        <PowerPanel title="Preparation and review due date rules" tone="emerald">
          <div className="space-y-4">
            <PowerInfoStrip tone="slate">
              Preparation due: <span className="font-semibold">{describeTpmSchedule(preparationDueSchedule, recurrence)}</span>
              <span className="mx-2 text-slate-300">|</span>
              Review due: <span className="font-semibold">{reviewDueSameAsPreparation ? "Same as preparation due" : describeTpmSchedule(reviewDueSchedule, recurrence)}</span>
            </PowerInfoStrip>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4 border border-slate-300 bg-white p-4">
                <div className="text-sm font-semibold text-slate-800">Preparation due rule</div>

                {recurrence === "Quarterly" ? (
                  <div className="border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Quarter alignment</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span>Apply rule to</span>
                      <select
                        className={powerInputClassName}
                        value={preparationPeriodMonthInQuarter}
                        onChange={(e) => setPreparationPeriodMonthInQuarter(Number(e.target.value) as QuarterMonthInPeriod)}
                      >
                        {QUARTER_MONTH_IN_PERIOD_OPTIONS.map((v) => (
                          <option key={v} value={v}>
                            {v === 1 ? "First month" : v === 2 ? "Second month" : "Last month"}
                          </option>
                        ))}
                      </select>
                      <span>of each quarter</span>
                    </div>
                  </div>
                ) : null}

                {recurrence === "Yearly" ? (
                  <div className="border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Year alignment</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span>Apply rule in</span>
                      <select
                        className={powerInputClassName}
                        value={preparationPeriodMonthOfYear}
                        onChange={(e) => setPreparationPeriodMonthOfYear(Number(e.target.value) as MonthOfYear)}
                      >
                        {MONTH_OF_YEAR_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {MONTH_NAMES[m - 1]}
                          </option>
                        ))}
                      </select>
                      <span>each year</span>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3">
                  <label className="flex items-start gap-3 border border-slate-300 bg-white px-4 py-3">
                    <input
                      type="radio"
                      name="preparationSchedule"
                      className="mt-1"
                      checked={preparationScheduleType === "FixedCalendarDate"}
                      onChange={() => setPreparationScheduleType("FixedCalendarDate")}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="text-sm font-semibold text-slate-800">Fixed calendar day of period</div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                        <span>Day of month{periodHint}</span>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          className="w-24 rounded-sm border border-slate-500 bg-white px-3 py-2 text-base text-slate-900"
                          value={preparationFixedDayOfMonth}
                          onChange={(e) => setPreparationFixedDayOfMonth(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 border border-slate-300 bg-white px-4 py-3">
                    <input
                      type="radio"
                      name="preparationSchedule"
                      className="mt-1"
                      checked={preparationScheduleType === "NthWeekdayOfMonth"}
                      onChange={() => setPreparationScheduleType("NthWeekdayOfMonth")}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="text-sm font-semibold text-slate-800">Nth weekday of period</div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                        <span>Nth</span>
                        <select
                          className="rounded-sm border border-slate-500 bg-white px-3 py-2 text-base text-slate-900"
                          value={preparationNth}
                          onChange={(e) => setPreparationNth(Number(e.target.value) as NthWeekday)}
                        >
                          {NTH_WEEKDAY_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                        <span>Weekday</span>
                        <select
                          className="rounded-sm border border-slate-500 bg-white px-3 py-2 text-base text-slate-900"
                          value={preparationNthWeekday}
                          onChange={(e) => setPreparationNthWeekday(e.target.value as Weekday)}
                        >
                          {WEEKDAY_OPTIONS.map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 border border-slate-300 bg-white px-4 py-3">
                    <input
                      type="radio"
                      name="preparationSchedule"
                      className="mt-1"
                      checked={preparationScheduleType === "LastWeekdayOfMonth"}
                      onChange={() => setPreparationScheduleType("LastWeekdayOfMonth")}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="text-sm font-semibold text-slate-800">Last weekday of period</div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                        <span>Weekday</span>
                        <select
                          className="rounded-sm border border-slate-500 bg-white px-3 py-2 text-base text-slate-900"
                          value={preparationLastWeekday}
                          onChange={(e) => setPreparationLastWeekday(e.target.value as Weekday)}
                        >
                          {WEEKDAY_OPTIONS.map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-4 border border-slate-300 bg-white p-4">
                <div className="text-sm font-semibold text-slate-800">Review due rule</div>

                <label className="flex items-center gap-3 border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={reviewDueSameAsPreparation}
                    onChange={(e) => setReviewDueSameAsPreparation(e.target.checked)}
                  />
                  <span>Review due is the same due date as the Preparation due date</span>
                </label>

                {reviewDueSameAsPreparation ? (
                  <div className="border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Review due will use the same rule as preparation due: <span className="font-semibold text-slate-900">{describeTpmSchedule(preparationDueSchedule, recurrence)}</span>
                  </div>
                ) : null}

                {!reviewDueSameAsPreparation && recurrence === "Quarterly" ? (
                  <div className="border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Quarter alignment</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span>Apply rule to</span>
                      <select
                        className={powerInputClassName}
                        value={reviewPeriodMonthInQuarter}
                        onChange={(e) => setReviewPeriodMonthInQuarter(Number(e.target.value) as QuarterMonthInPeriod)}
                      >
                        {QUARTER_MONTH_IN_PERIOD_OPTIONS.map((v) => (
                          <option key={v} value={v}>
                            {v === 1 ? "First month" : v === 2 ? "Second month" : "Last month"}
                          </option>
                        ))}
                      </select>
                      <span>of each quarter</span>
                    </div>
                  </div>
                ) : null}

                {!reviewDueSameAsPreparation && recurrence === "Yearly" ? (
                  <div className="border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">Year alignment</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span>Apply rule in</span>
                      <select
                        className={powerInputClassName}
                        value={reviewPeriodMonthOfYear}
                        onChange={(e) => setReviewPeriodMonthOfYear(Number(e.target.value) as MonthOfYear)}
                      >
                        {MONTH_OF_YEAR_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {MONTH_NAMES[m - 1]}
                          </option>
                        ))}
                      </select>
                      <span>each year</span>
                    </div>
                  </div>
                ) : null}

                {!reviewDueSameAsPreparation ? (
                <div className="grid gap-3">
                  <label className="flex items-start gap-3 border border-slate-300 bg-white px-4 py-3">
                    <input
                      type="radio"
                      name="reviewSchedule"
                      className="mt-1"
                      checked={reviewScheduleType === "FixedCalendarDate"}
                      onChange={() => setReviewScheduleType("FixedCalendarDate")}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="text-sm font-semibold text-slate-800">Fixed calendar day of period</div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                        <span>Day of month{periodHint}</span>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          className="w-24 rounded-sm border border-slate-500 bg-white px-3 py-2 text-base text-slate-900"
                          value={reviewFixedDayOfMonth}
                          onChange={(e) => setReviewFixedDayOfMonth(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 border border-slate-300 bg-white px-4 py-3">
                    <input
                      type="radio"
                      name="reviewSchedule"
                      className="mt-1"
                      checked={reviewScheduleType === "NthWeekdayOfMonth"}
                      onChange={() => setReviewScheduleType("NthWeekdayOfMonth")}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="text-sm font-semibold text-slate-800">Nth weekday of period</div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                        <span>Nth</span>
                        <select
                          className="rounded-sm border border-slate-500 bg-white px-3 py-2 text-base text-slate-900"
                          value={reviewNth}
                          onChange={(e) => setReviewNth(Number(e.target.value) as NthWeekday)}
                        >
                          {NTH_WEEKDAY_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                        <span>Weekday</span>
                        <select
                          className="rounded-sm border border-slate-500 bg-white px-3 py-2 text-base text-slate-900"
                          value={reviewNthWeekday}
                          onChange={(e) => setReviewNthWeekday(e.target.value as Weekday)}
                        >
                          {WEEKDAY_OPTIONS.map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 border border-slate-300 bg-white px-4 py-3">
                    <input
                      type="radio"
                      name="reviewSchedule"
                      className="mt-1"
                      checked={reviewScheduleType === "LastWeekdayOfMonth"}
                      onChange={() => setReviewScheduleType("LastWeekdayOfMonth")}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="text-sm font-semibold text-slate-800">Last weekday of period</div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                        <span>Weekday</span>
                        <select
                          className="rounded-sm border border-slate-500 bg-white px-3 py-2 text-base text-slate-900"
                          value={reviewLastWeekday}
                          onChange={(e) => setReviewLastWeekday(e.target.value as Weekday)}
                        >
                          {WEEKDAY_OPTIONS.map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </label>
                </div>
                ) : null}
              </div>
            </div>

            <div className="border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
              Preparation due, review due, and TPM submission due are each driven by explicit scheduling rules. Monthly, quarterly, and yearly setups can use fixed calendar days, nth weekdays, or last weekdays of the relevant period.
            </div>
          </div>
        </PowerPanel>

        <PowerPanel title="Routing and access" tone="slate">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <PowerField label="GSP Planner(s)" hint="Comma-separated list.">
              <input
                className={powerInputClassName}
                value={assigneesRaw}
                onChange={(e) => setAssigneesRaw(e.target.value)}
              />
            </PowerField>

            <PowerField label="EM Manager(s)" hint="Comma-separated list.">
              <input
                className={powerInputClassName}
                value={approversRaw}
                onChange={(e) => setApproversRaw(e.target.value)}
              />
            </PowerField>

            <PowerField label="Additional Approver(s)" hint="Comma-separated list.">
              <input
                className={powerInputClassName}
                value={additionalApproversRaw}
                onChange={(e) => setAdditionalApproversRaw(e.target.value)}
              />
            </PowerField>
          </div>
        </PowerPanel>

        <PowerPanel title="Forecast instance initiation" tone="sky">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <PowerField
              label="Default reminder to initiate forecast instance"
              hint="This lead time is stored in days before the cycle start date."
            >
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  className={`${powerInputClassName} w-32`}
                  value={initiationReminderDaysRaw}
                  onChange={(e) => setInitiationReminderDaysRaw(e.target.value)}
                />
                <span className="text-sm text-slate-700">days</span>
              </div>
            </PowerField>

            <PowerField
              label="Automate forecast instance initiation"
              hint="If enabled, the system auto-initiates an instance when it reaches the reminder lead time."
            >
              <select
                className={powerInputClassName}
                value={automateInstanceInitiation ? "yes" : "no"}
                onChange={(e) => setAutomateInstanceInitiation(e.target.value === "yes")}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </PowerField>
          </div>

          <PowerCommandBar>
            <button
              type="button"
              className={powerGhostButtonClassName}
              onClick={() => router.push("/")}
            >
              Cancel
            </button>
            <button
              type="button"
              className={powerPrimaryButtonClassName}
              onClick={() => {
                setError(null);

                const assignees = splitList(assigneesRaw);
                const approvers = splitList(approversRaw);
                const additionalApprovers = splitList(additionalApproversRaw);
                const parsedEndDateOffset = endDateOffsetValueRaw.trim() === "" ? null : Number(endDateOffsetValueRaw);
                const resolvedEndDate = computeSetupEndDate(
                  startDate,
                  endDateMode,
                  endDate,
                  parsedEndDateOffset,
                  endDateOffsetUnit
                );
                const parsedInitiationReminderDays =
                  initiationReminderDaysRaw.trim() === "" ? null : Number(initiationReminderDaysRaw);

                if (!tpm.trim() || products.length === 0) {
                  setError("TPM and at least one Product are required.");
                  return;
                }
                if (!startDate || !resolvedEndDate) {
                  setError("Start date and end date are required.");
                  return;
                }
                if (resolvedEndDate < startDate) {
                  setError("End date must be on/after the start date.");
                  return;
                }
                if (endDateMode === "RelativeOffset" && (parsedEndDateOffset === null || !Number.isFinite(parsedEndDateOffset))) {
                  setError("Enter a valid end date offset.");
                  return;
                }
                if (assignees.length === 0) {
                  setError("At least one GSP Planner is required.");
                  return;
                }
                if (approvers.length === 0) {
                  setError("At least one EM Manager is required.");
                  return;
                }
                if (
                  parsedInitiationReminderDays !== null &&
                  (!Number.isFinite(parsedInitiationReminderDays) || parsedInitiationReminderDays < 0)
                ) {
                  setError("Default initiation reminder must be zero or greater.");
                  return;
                }

                const id = nextSetupId(allSetups.map((s) => s.id));
                const firmPeriodParsed = firmPeriodRaw.trim() === "" ? null : Number(firmPeriodRaw);
                const rollingForecastHorizonParsed = rollingForecastHorizonRaw.trim() === "" ? null : Number(rollingForecastHorizonRaw);

                const setup: SetupRow = {
                  id,
                  pillar,
                  tpm: tpm.trim(),
                  products: products.map((p) => p.trim()).filter(Boolean),
                  tpmLocation: tpmLocation.trim() ? tpmLocation.trim() : undefined,
                  tpmPreviousCompanyName: tpmPreviousCompanyName.trim() ? tpmPreviousCompanyName.trim() : undefined,
                  bindingPeriod: bindingPeriod.trim() ? bindingPeriod.trim() : undefined,
                  firmPeriod:
                    typeof firmPeriodParsed === "number" && Number.isFinite(firmPeriodParsed)
                      ? Math.max(0, Math.floor(firmPeriodParsed))
                      : null,
                  rollingForecastHorizon:
                    typeof rollingForecastHorizonParsed === "number" && Number.isFinite(rollingForecastHorizonParsed)
                      ? Math.max(0, Math.floor(rollingForecastHorizonParsed))
                    : null,
                  assignees,
                  approvers,
                  additionalApprovers,
                  recurrence,
                  startDate,
                  endDate: resolvedEndDate,
                  endDateMode,
                  endDateOffsetValue:
                    endDateMode === "RelativeOffset" && parsedEndDateOffset !== null && Number.isFinite(parsedEndDateOffset)
                      ? Math.max(0, Math.floor(parsedEndDateOffset))
                      : null,
                  endDateOffsetUnit,
                  preparationDueSchedule,
                  reviewDueSameAsPreparation,
                  reviewDueSchedule,
                  tpmSubmissionSchedule,
                  initiationReminderDays:
                    parsedInitiationReminderDays !== null && Number.isFinite(parsedInitiationReminderDays)
                      ? Math.max(0, Math.floor(parsedInitiationReminderDays))
                      : null,
                  automateInstanceInitiation
                };

                const cycles = generateCyclesForSetup(setup, allCycles.map((c) => c.id));
                if (cycles.some((cycle) => (cycle.gspForecastDue ?? "") > (cycle.approverReviewDue ?? "") || (cycle.approverReviewDue ?? "") > cycle.tpmSubmissionDue)) {
                  setError("Preparation due, review due, and TPM submission due must stay in sequence for generated instances.");
                  return;
                }

                upsertSetup(setup);
                for (const c of cycles) upsertCycle(c);

                router.push(`/setups/${encodeURIComponent(id)}`);
              }}
            >
              Create Setup
            </button>
          </PowerCommandBar>
        </PowerPanel>
      </div>
    </div>
  );
}
