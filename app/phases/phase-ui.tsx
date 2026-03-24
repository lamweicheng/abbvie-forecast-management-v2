import type { ReactNode } from "react";

const toneClassNames = {
  slate: "border-slate-400 bg-slate-100 text-slate-800",
  sky: "border-sky-300 bg-sky-50 text-sky-900",
  amber: "border-amber-300 bg-amber-50 text-amber-900",
  emerald: "border-emerald-300 bg-emerald-50 text-emerald-900"
} as const;

export const powerInputClassName =
  "w-full rounded-sm border border-slate-500 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-700 focus:outline-none disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500";

export const powerTextAreaClassName =
  "w-full rounded-sm border border-slate-500 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-700 focus:outline-none disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500";

export const powerFileClassName =
  "block w-full rounded-sm border border-dashed border-slate-500 bg-white px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-sm file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white disabled:cursor-not-allowed disabled:bg-slate-100";

export const powerGhostButtonClassName =
  "rounded-sm border border-slate-500 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50";

export const powerPrimaryButtonClassName =
  "rounded-sm border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";

export const powerSuccessButtonClassName =
  "rounded-sm border border-emerald-700 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";

export const powerWarningButtonClassName =
  "rounded-sm border border-amber-400 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50";

export function PowerPanel({
  title,
  description,
  children,
  tone = "slate"
}: {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: keyof typeof toneClassNames;
}) {
  const headerToneClassName = tone === "emerald"
    ? "bg-[#6f8571]"
    : tone === "sky"
      ? "bg-[#708596]"
      : tone === "amber"
        ? "bg-[#8c7a5b]"
        : "bg-[#6d7782]";

  return (
    <section className="overflow-hidden border border-slate-400 bg-white">
      <div className={["border-b border-slate-400 px-5 py-3 text-white", headerToneClassName].join(" ")}>
        <h2 className="text-center text-xl font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-center text-sm leading-5 text-white/95">{description}</p> : null}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export function PowerField({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-semibold text-slate-800">{label}</label>
        {hint ? <div className="mt-1 text-xs leading-5 text-slate-700">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function PowerInfoStrip({
  children,
  tone = "slate"
}: {
  children: ReactNode;
  tone?: keyof typeof toneClassNames;
}) {
  return (
    <div className={["border px-4 py-3 text-sm leading-6", toneClassNames[tone]].join(" ")}>
      {children}
    </div>
  );
}

export function PowerMetric({
  label,
  value,
  tone = "slate"
}: {
  label: string;
  value: ReactNode;
  tone?: keyof typeof toneClassNames;
}) {
  return (
    <div className={["border px-4 py-3", toneClassNames[tone]].join(" ")}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

export function PowerCommandBar({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-5 mt-6 border-t border-slate-300 bg-[#eeeeee] px-5 py-4">
      <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  );
}

export function PowerPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}