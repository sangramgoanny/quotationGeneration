"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, RefreshCw, Target, Trophy } from "lucide-react";
import { dashboardApi } from "@/lib/api/dashboard";
import { usePermissions } from "@/lib/rbac/usePermissions";
import type { DashboardSummary } from "@/types/dashboard";

type Preset = "month" | "quarter" | "year" | "custom";

const num = (value: string | number) => Number(value) || 0;
const money = (value: string | number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num(value));
const iso = (date: Date) =>
  [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");

function rangeFor(preset: Exclude<Preset, "custom">) {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);
  if (preset === "month") from.setDate(1);
  if (preset === "quarter") from.setMonth(Math.floor(now.getMonth() / 3) * 3, 1);
  if (preset === "year") from.setMonth(0, 1);
  return { from: iso(from), to: iso(to) };
}

const STAGE_LABELS: Record<string, string> = {
  NEW: "New", HOT: "Hot", WARM: "Warm", COLD: "Cold",
  QUOTATION_SENT: "Quotation Sent", WON: "Won", LOST: "Lost",
};
const STAGE_TONE: Record<string, string> = {
  WON: "bg-emerald-500", LOST: "bg-rose-400", QUOTATION_SENT: "bg-violet-500",
  HOT: "bg-orange-500", WARM: "bg-amber-500", COLD: "bg-cyan-500", NEW: "bg-slate-400",
};

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{hint}</p> : null}
    </div>
  );
}

export default function ReportsPage() {
  const { canView, roleName } = usePermissions();
  const [preset, setPreset] = useState<Preset>("year");
  const [range, setRange] = useState(() => rangeFor("year"));
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setPresetRange = (next: Preset) => {
    setPreset(next);
    if (next !== "custom") setRange(rangeFor(next));
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await dashboardApi.summary(range.from, range.to));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load reports");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pipeline = data?.pipeline;
  const stageByKey = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    for (const s of pipeline?.stages ?? []) map.set(s.stage, { count: s.count, value: num(s.value) });
    return map;
  }, [pipeline]);

  const won = stageByKey.get("WON")?.count ?? 0;
  const lost = stageByKey.get("LOST")?.count ?? 0;
  const maxStageCount = Math.max(1, ...(pipeline?.stages ?? []).map((s) => s.count));

  if (!canView("reports")) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-800">
        You do not have permission to view reports.
      </div>
    );
  }

  return (
    <main className="space-y-5">
      <header className="rounded-2xl bg-[#0b3b5a] px-5 py-4 text-white shadow-lg">
        <p className="text-[10px] font-black uppercase tracking-widest text-sky-200">Reports</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">Lead &amp; Pipeline Report</h1>
            <p className="text-xs text-slate-200">
              {roleName ? `${roleName} view · ` : ""}scoped to the leads you can access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-bold hover:bg-white/20"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(["month", "quarter", "year", "custom"] as Preset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPresetRange(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                preset === p ? "bg-white text-[#0b3b5a]" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {p === "month" ? "This month" : p === "quarter" ? "This quarter" : p === "year" ? "This year" : "Custom"}
            </button>
          ))}
          {preset === "custom" ? (
            <div className="flex flex-wrap gap-2">
              <input
                aria-label="From date"
                type="date"
                value={range.from}
                max={range.to}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-800"
              />
              <input
                aria-label="To date"
                type="date"
                value={range.to}
                min={range.from}
                max={iso(new Date())}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-800"
              />
            </div>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading report…</div>
      ) : pipeline ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Kpi label="Total leads" value={String(pipeline.totalLeads)} hint="created in period" />
            <Kpi label="Won" value={String(won)} />
            <Kpi label="Lost" value={String(lost)} />
            <Kpi label="Conversion" value={`${pipeline.conversionRate}%`} hint="won ÷ total" />
            <Kpi label="Pipeline value" value={money(pipeline.totalValue)} hint="quotations on these leads" />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Target className="h-4 w-4 text-slate-400" /> By stage
            </h2>
            <div className="space-y-2.5">
              {(pipeline.stages ?? []).map((s) => (
                <div key={s.stage} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs font-bold text-slate-600">{STAGE_LABELS[s.stage] ?? s.stage}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-md bg-slate-100">
                    <div
                      className={`h-full ${STAGE_TONE[s.stage] ?? "bg-slate-400"}`}
                      style={{ width: `${(s.count / maxStageCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-black text-slate-800">{s.count}</span>
                  <span className="w-28 shrink-0 text-right text-xs font-semibold text-slate-500">{money(s.value)}</span>
                </div>
              ))}
            </div>
          </section>

          {pipeline.leaderboard.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                <Trophy className="h-4 w-4 text-slate-400" /> By team member
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      <th className="py-2 pr-3">Member</th>
                      <th className="py-2 px-3 text-right">Leads</th>
                      <th className="py-2 px-3 text-right">Won</th>
                      <th className="py-2 px-3 text-right">Conv.</th>
                      <th className="py-2 pl-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipeline.leaderboard.map((row) => (
                      <tr key={row.userId} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-3 font-semibold text-slate-800">{row.userName}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{row.leads}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{row.won}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{row.conversionRate}%</td>
                        <td className="py-2 pl-3 text-right font-bold text-slate-800">{money(row.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <BarChart3 className="h-3.5 w-3.5" />
            Figures cover {range.from} to {range.to} and only the leads your role can access.
          </p>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No lead data available for this period.
        </div>
      )}
    </main>
  );
}
