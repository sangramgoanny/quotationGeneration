"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, ArrowRight, Building2, CalendarDays, Check, ChevronDown, Clock3, FileText, IndianRupee, PiggyBank, Plus, RefreshCw, Target, TrendingDown, TrendingUp, Trophy, Users, WalletCards } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dashboardApi } from "@/lib/api/dashboard";
import { remindersApi } from "@/lib/api/reminders";
import { usePermissions } from "@/lib/rbac/usePermissions";
import type { DashboardExpenseCategory, DashboardFollowUp, DashboardInvoice, DashboardLeaderboardEntry, DashboardQuotation, DashboardSummary, DashboardTopClient } from "@/types/dashboard";

type Preset = "today" | "7d" | "30d" | "month" | "quarter" | "custom";
type Tab = "overview" | "finance" | "team";
const PALETTE = ["#0070B8", "#10b981", "#f59e0b", "#8b5cf6", "#E60046", "#64748b"];
const num = (value: string | number) => Number(value) || 0;
const money = (value: string | number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num(value));
const shortDate = (value?: string | null) => value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(value)) : "—";
const dateTime = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const iso = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
const tooltipStyle = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 8px 24px -8px rgba(15,23,42,.18)" };

function rangeFor(preset: Preset) {
  const now = new Date(); const to = new Date(now); const from = new Date(now);
  if (preset === "7d") from.setDate(now.getDate() - 6);
  if (preset === "30d") from.setDate(now.getDate() - 29);
  if (preset === "month") from.setDate(1);
  if (preset === "quarter") { from.setMonth(Math.floor(now.getMonth() / 3) * 3, 1); }
  return { from: iso(from), to: iso(to) };
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}
function Badge({ value }: { value: string }) {
  const tone = /OVERDUE|REJECTED|EXPIRED|HIGH/.test(value) ? "bg-red-50 text-red-700" : /PAID|ACCEPTED|WON|COMPLETED/.test(value) ? "bg-emerald-50 text-emerald-700" : /SENT|WARM|PARTIALLY/.test(value) ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700";
  return <span className={`rounded-full px-2 py-1 text-[10px] font-black ${tone}`}>{value.replaceAll("_", " ")}</span>;
}
function Delta({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value == null) return <span className="text-xs text-slate-400">No comparison</span>;
  const positive = inverse ? value <= 0 : value >= 0; const Icon = value >= 0 ? TrendingUp : TrendingDown;
  return <span className={`inline-flex items-center gap-1 text-xs font-bold ${positive ? "text-emerald-600" : "text-red-600"}`}><Icon className="h-3.5 w-3.5" />{Math.abs(value).toFixed(1)}% vs previous</span>;
}
function Skeleton() {
  return <div className="space-y-5" aria-label="Loading dashboard"><div className="h-28 animate-pulse rounded-3xl bg-slate-200" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)}</div><div className="grid gap-4 xl:grid-cols-3"><div className="h-80 animate-pulse rounded-2xl bg-slate-200 xl:col-span-2" /><div className="h-80 animate-pulse rounded-2xl bg-slate-200" /></div></div>;
}
function Empty({ children }: { children: ReactNode }) { return <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">{children}</div>; }

function Sparkline({ data, dataKey, color }: { data: DashboardSummary["trends"]; dataKey: "revenue" | "collected"; color: string }) {
  if (data.length < 2) return null;
  const rows = data.map(p => ({ date: p.date, v: num(p[dataKey]) }));
  return <div className="h-10 w-full max-w-[110px]"><ResponsiveContainer width="100%" height="100%">
    <AreaChart data={rows} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
      <defs><linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${dataKey})`} isAnimationActive={false} />
    </AreaChart>
  </ResponsiveContainer></div>;
}

function RevenueChart({ data }: { data: DashboardSummary["trends"] }) {
  if (!data.length) return <Empty>No financial trend data for this period.</Empty>;
  const rows = data.map(p => ({ date: p.date, revenue: num(p.revenue), collected: num(p.collected) }));
  const tickGap = Math.max(0, Math.ceil(rows.length / 7) - 1);
  return <div><div className="mb-3 flex gap-4 text-xs font-bold text-slate-500"><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#0070B8]" />Revenue</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />Collected</span></div>
    <div className="h-64 w-full min-w-[480px]"><ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0070B8" stopOpacity={0.28} /><stop offset="100%" stopColor="#0070B8" stopOpacity={0} /></linearGradient>
          <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.28} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={v => shortDate(v)} interval={tickGap} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => new Intl.NumberFormat("en-IN", { notation: "compact" }).format(v)} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={46} />
        <Tooltip formatter={(value, name) => [money(Number(value) || 0), name === "revenue" ? "Revenue" : "Collected"]} labelFormatter={v => shortDate(String(v))} contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="revenue" stroke="#0070B8" strokeWidth={2} fill="url(#revGrad)" />
        <Area type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2} fill="url(#colGrad)" />
      </AreaChart>
    </ResponsiveContainer></div>
  </div>;
}

function PipelineChart({ stages }: { stages: DashboardSummary["pipeline"]["stages"] }) {
  if (!stages.length) return <Empty>No leads in the pipeline.</Empty>;
  const rows = stages.map(s => ({ stage: s.stage.replaceAll("_", " "), count: s.count, value: num(s.value) }));
  return <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
    <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
      <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
      <XAxis type="number" hide />
      <YAxis type="category" dataKey="stage" width={104} tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }} axisLine={false} tickLine={false} />
      <Tooltip formatter={(value, _name, item) => [`${value} leads · ${money((item.payload as { value: number }).value)}`, "Stage"]} contentStyle={tooltipStyle} />
      <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="#0070B8" maxBarSize={18} />
    </BarChart>
  </ResponsiveContainer></div>;
}

function TopClientsChart({ clients }: { clients: DashboardTopClient[] }) {
  if (!clients.length) return <Empty>No client revenue recorded for this period.</Empty>;
  const rows = clients.map(c => ({ name: c.clientName, revenue: num(c.revenue), invoices: c.invoiceCount }));
  return <div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%">
    <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
      <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
      <XAxis type="number" hide />
      <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 11, fontWeight: 700, fill: "#334155" }} axisLine={false} tickLine={false} />
      <Tooltip formatter={(value, _name, item) => { const invoices = (item.payload as { invoices: number }).invoices; return [`${money(Number(value) || 0)} · ${invoices} invoice${invoices === 1 ? "" : "s"}`, "Revenue"]; }} contentStyle={tooltipStyle} />
      <Bar dataKey="revenue" radius={[0, 6, 6, 0]} fill="#0070B8" maxBarSize={18} />
    </BarChart>
  </ResponsiveContainer></div>;
}

function ExpenseBreakdown({ categories, total }: { categories: DashboardExpenseCategory[]; total: number }) {
  if (!categories.length) return <Empty>No expenses recorded for this period.</Empty>;
  const rows = categories.map(c => ({ name: c.category, value: num(c.amount) }));
  return <div className="flex flex-col items-center gap-5 sm:flex-row">
    <div className="h-40 w-40 shrink-0"><ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={2} stroke="none">
          {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip formatter={value => money(Number(value) || 0)} contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer></div>
    <div className="w-full space-y-2">{rows.map((r, i) => <div key={r.name} className="flex items-center justify-between text-xs"><span className="flex min-w-0 items-center gap-2 truncate font-bold text-slate-700"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />{r.name}</span><span className="shrink-0 text-slate-500">{money(r.value)} · {total ? ((r.value / total) * 100).toFixed(0) : 0}%</span></div>)}</div>
  </div>;
}

function Leaderboard({ entries }: { entries: DashboardLeaderboardEntry[] }) {
  if (!entries.length) return <Empty>No leads assigned to team members in this period.</Empty>;
  const max = Math.max(1, ...entries.map(e => num(e.value)));
  return <div className="space-y-4">{entries.map((entry, i) => <div key={entry.userId} className="flex items-center gap-3">
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{i === 0 ? <Trophy className="h-3.5 w-3.5" /> : i + 1}</span>
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs"><span className="truncate font-black text-slate-800">{entry.userName}</span><span className="shrink-0 text-slate-500">{entry.leads} leads · {entry.won} won · {entry.conversionRate.toFixed(1)}%</span></div>
      <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-[#0070B8] to-[#38BDF8]" style={{ width: `${Math.max(4, (num(entry.value) / max) * 100)}%` }} /></div>
    </div>
    <span className="shrink-0 text-xs font-black text-slate-700">{money(entry.value)}</span>
  </div>)}</div>;
}

const TABS: { key: Tab; label: string }[] = [{ key: "overview", label: "Overview" }, { key: "finance", label: "Finance" }, { key: "team", label: "Team" }];

export default function DashboardPage() {
  const { can, canView, currentUser } = usePermissions();
  const initial = rangeFor("month");
  const [preset, setPreset] = useState<Preset>("month");
  const [range, setRange] = useState(initial);
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(""); const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [completing, setCompleting] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true); setError("");
    try { setData(await dashboardApi.summary(range.from, range.to)); setUpdatedAt(new Date()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load dashboard"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [range.from, range.to]);
  useEffect(() => { void load(); }, [load]);

  const choosePreset = (value: Preset) => { setPreset(value); if (value !== "custom") setRange(rangeFor(value)); };
  const complete = async (item: DashboardFollowUp) => {
    setCompleting(item.id);
    try { await remindersApi.globalUpdate(item.id, { isDone: true }); await load(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to complete follow-up"); }
    finally { setCompleting(""); }
  };

  const showReports = canView("reports");
  const followUps = useMemo(() => data && canView("followUps") ? [...data.followUps.overdue, ...data.followUps.dueToday].sort((a,b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)) : [], [data, canView]);
  const attentionCount = (data && canView("followUps") ? data.followUps.overdueCount + data.followUps.dueTodayCount : 0) + (data && canView("invoices") ? data.invoices.overdueCount : 0) + (data && canView("quotations") ? data.quotations.expiringCount : 0);
  const name = currentUser?.name || currentUser?.email?.split("@")[0] || "there";
  const finance = data?.finance ?? { totalExpenses: 0, expensesByCategory: [], profit: 0, profitMargin: 0, expenseChange: null, profitChange: null };
  const leaderboard = data?.pipeline.leaderboard ?? [];
  const topClients = data?.invoices.topClients ?? [];
  const quick = [
    { show: can("leads","create"), label: "Add lead", href: "/crm/leads/new", icon: Target },
    { show: can("clients","create"), label: "Add client", href: "/crm/clients/new", icon: Users },
    { show: can("quotations","create"), label: "Create quotation", href: "/quotation/new", icon: FileText },
    { show: can("invoices","create"), label: "Create invoice", href: "/invoice/new", icon: WalletCards },
  ].filter(x => x.show);
  const availableTabs = TABS.filter(t => t.key === "overview" || (t.key === "finance" && (canView("invoices") || canView("quotations"))) || (t.key === "team" && canView("leads")));

  if (loading) return <Skeleton />;
  if (error && !data) return <Card className="p-8 text-center"><AlertCircle className="mx-auto h-9 w-9 text-red-500" /><h2 className="mt-3 font-black text-slate-900">Dashboard could not load</h2><p className="mt-1 text-sm text-slate-500">{error}</p><button onClick={() => void load()} className="mt-5 rounded-xl bg-[#0070B8] px-4 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-400">Try again</button></Card>;
  if (!data) return null;

  const kpis = [
    { show: canView("leads"), label: "New pipeline this period", value: money(data.pipeline.totalValue), sub: `${data.pipeline.totalLeads} leads added · ${data.pipeline.conversionRate.toFixed(1)}% conversion · full pipeline on the board`, delta: data.pipeline.valueChange, href: "/crm/pipeline", icon: Target, tone: "bg-sky-50 text-[#0070B8]" },
    { show: canView("quotations"), label: "Awaiting response", value: money(data.quotations.pendingValue), sub: `${data.quotations.pendingCount} quotations pending`, delta: data.quotations.pendingChange, href: "/quotation?status=SENT", icon: FileText, tone: "bg-violet-50 text-violet-700" },
    { show: canView("invoices"), label: "Outstanding", value: money(data.invoices.outstanding), sub: `${data.invoices.overdueCount} overdue · ${money(data.invoices.overdueValue)}`, delta: data.invoices.outstandingChange, inverse: true, href: "/invoice?status=OVERDUE", icon: IndianRupee, tone: "bg-red-50 text-red-700" },
    { show: canView("invoices"), label: "Revenue collected", value: money(data.invoices.received), sub: `of ${money(data.invoices.invoiced)} invoiced`, delta: data.invoices.receivedChange, href: "/invoice?status=PAID", icon: WalletCards, tone: "bg-emerald-50 text-emerald-700", spark: "collected" as const },
  ].filter(x => x.show);

  return <div className="space-y-5 pb-8">
    <div className="relative overflow-hidden rounded-3xl bg-[#061526] p-5 text-white shadow-xl sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(14,165,233,.32),transparent_36%),radial-gradient(circle_at_90%_20%,rgba(230,0,70,.18),transparent_28%)]" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-sky-300">Business command center</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {name}</h1>
          <p className="mt-2 text-sm text-slate-300">{attentionCount ? `${attentionCount} items need your attention.` : "Everything looks clear. Keep the momentum going."} {updatedAt ? `Updated ${updatedAt.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}.` : ""}</p>
          {showReports && canView("invoices") && <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2"><PiggyBank className="h-4 w-4 text-emerald-300" /><span className="text-xs font-bold text-slate-200">Net profit <b className={num(finance.profit) >= 0 ? "text-emerald-300" : "text-red-300"}>{money(finance.profit)}</b> · {finance.profitMargin.toFixed(1)}% margin</span></div>}
        </div>
        <div className="flex flex-wrap items-center gap-2"><div className="relative"><select aria-label="Dashboard date range" value={preset} onChange={e => choosePreset(e.target.value as Preset)} className="h-10 appearance-none rounded-xl border border-white/15 bg-white/10 pl-3 pr-9 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-sky-400"><option className="text-slate-900" value="today">Today</option><option className="text-slate-900" value="7d">Last 7 days</option><option className="text-slate-900" value="30d">Last 30 days</option><option className="text-slate-900" value="month">This month</option><option className="text-slate-900" value="quarter">This quarter</option><option className="text-slate-900" value="custom">Custom</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4" /></div><button onClick={() => void load(true)} disabled={refreshing} className="flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-bold hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>{quick.length ? <Link href={quick[0].href} className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0070B8] to-[#E60046] px-4 text-xs font-black shadow-lg focus:outline-none focus:ring-2 focus:ring-white"><Plus className="h-4 w-4" />{quick[0].label}</Link> : null}</div>
      </div>
      {preset === "custom" ? <div className="relative mt-4 flex flex-wrap gap-2"><input aria-label="From date" type="date" value={range.from} max={range.to} onChange={e => setRange(r => ({...r,from:e.target.value}))} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-800" /><input aria-label="To date" type="date" value={range.to} min={range.from} max={iso(new Date())} onChange={e => setRange(r => ({...r,to:e.target.value}))} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-800" /></div> : null}
    </div>
    {error ? <div role="alert" className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><span>{error}</span><button onClick={() => void load(true)} className="font-black underline">Retry</button></div> : null}

    {availableTabs.length > 1 && <div className="flex w-fit gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">{availableTabs.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-lg px-4 py-1.5 text-xs font-black transition ${tab === t.key ? "bg-[#0070B8] text-white shadow" : "text-slate-500 hover:bg-slate-50"}`}>{t.label}</button>)}</div>}

    {tab === "overview" && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.map(k => <Link key={k.label} href={k.href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-400"><div className="flex justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-slate-500">{k.label}</p><p className="mt-2 text-2xl font-black text-slate-950">{k.value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${k.tone}`}><k.icon className="h-5 w-5" /></span></div><p className="mt-2 text-xs text-slate-500">{k.sub}</p><div className="mt-3 flex items-end justify-between gap-2"><Delta value={k.delta} inverse={k.inverse} />{k.spark && <Sparkline data={data.trends} dataKey={k.spark} color="#10b981" />}</div></Link>)}</div>

      <div className="grid gap-4 xl:grid-cols-3">
        {(canView("invoices") || canView("leads")) && <Card className="p-5 xl:col-span-2"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-black text-slate-950">Performance</h2><p className="text-xs text-slate-500">Revenue and collections across the selected period</p></div></div><div className="overflow-x-auto">{canView("invoices") ? <RevenueChart data={data.trends} /> : <PipelineChart stages={data.pipeline.stages} />}</div></Card>}
        <Card className="p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-black text-slate-950">Needs attention</h2><p className="text-xs text-slate-500">Most urgent work first</p></div>{attentionCount > 0 && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700">{attentionCount}</span>}</div><div className="max-h-72 space-y-2 overflow-y-auto">
          {followUps.slice(0,5).map(item => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 p-3"><Clock3 className="h-4 w-4 shrink-0 text-red-600" /><Link href={`/crm/leads/${item.clientId}`} className="min-w-0 flex-1 rounded focus:outline-none focus:ring-2 focus:ring-sky-400"><p className="truncate text-xs font-black text-slate-800">{item.title}</p><p className="mt-1 truncate text-[11px] text-slate-500">{item.clientName || "Follow-up"} · {dateTime(item.scheduledAt)}</p></Link>{can("followUps","edit") && <button title="Mark complete" disabled={completing === item.id} onClick={() => void complete(item)} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"><Check className="h-4 w-4" /></button>}</div>)}
          {canView("invoices") && data.invoices.overdue.slice(0,3).map(item => <Link key={item.id} href={`/invoice?open=${item.id}`} className="flex items-center gap-3 rounded-xl border border-red-100 p-3 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-sky-400"><AlertCircle className="h-4 w-4 text-red-600" /><span className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-800">{item.invoiceNumber} · {item.clientName}</b><span className="text-[11px] text-slate-500">{money(item.due)} overdue</span></span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>)}
          {canView("quotations") && data.quotations.expiring.slice(0,2).map(item => <Link key={item.id} href={`/quotation?open=${item.id}`} className="flex items-center gap-3 rounded-xl border border-amber-100 p-3 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-sky-400"><FileText className="h-4 w-4 text-amber-600" /><span className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-800">{item.quotationNumber} · {item.clientName}</b><span className="text-[11px] text-slate-500">Expires {shortDate(item.expiresAt)}</span></span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>)}
          {canView("leads") && data.pipeline.highPriorityWithoutAction.slice(0,2).map(item => <Link key={item.id} href={`/crm/leads/${item.id}`} className="flex items-center gap-3 rounded-xl border border-amber-100 p-3 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-sky-400"><Target className="h-4 w-4 text-amber-600" /><span className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-800">{item.companyName}</b><span className="text-[11px] text-slate-500">High priority · no next action</span></span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>)}
          {!followUps.length && (!canView("invoices") || !data.invoices.overdue.length) && (!canView("quotations") || !data.quotations.expiring.length) && (!canView("leads") || !data.pipeline.highPriorityWithoutAction.length) ? <Empty>No urgent work right now.</Empty> : null}
        </div></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {canView("quotations") && <Recent title="Recent quotations" href="/quotation" empty="No quotations in this period.">{data.quotations.recent.slice(0,5).map(q => <QuotationRow key={q.id} item={q} />)}</Recent>}
        {canView("invoices") && <Recent title="Recent invoices" href="/invoice" empty="No invoices in this period.">{data.invoices.recent.slice(0,5).map(i => <InvoiceRow key={i.id} item={i} />)}</Recent>}
        {canView("followUps") && <Recent title="Upcoming follow-ups" href="/crm/follow-ups" empty="No upcoming follow-ups.">{data.followUps.upcoming.slice(0,5).map(f => <Link key={f.id} href={`/crm/leads/${f.clientId}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400"><CalendarDays className="h-4 w-4 text-[#0070B8]" /><span className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-800">{f.title}</b><span className="text-[11px] text-slate-500">{f.clientName || "Client"} · {dateTime(f.scheduledAt)}</span></span>{f.priority && <Badge value={f.priority} />}</Link>)}</Recent>}
      </div>

      {quick.length > 1 && <Card className="p-5"><h2 className="mb-4 font-black text-slate-950">Quick actions</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{quick.map(q => <Link key={q.href} href={q.href} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700 hover:border-sky-300 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-400"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-[#0070B8]"><q.icon className="h-4 w-4" /></span>{q.label}<ArrowRight className="ml-auto h-4 w-4 text-slate-400" /></Link>)}</div></Card>}
    </>}

    {tab === "finance" && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {canView("invoices") && <StatTile label="Invoiced" value={money(data.invoices.invoiced)} icon={FileText} tone="bg-sky-50 text-[#0070B8]" />}
        {canView("invoices") && <StatTile label="Collected" value={money(data.invoices.received)} delta={data.invoices.receivedChange} icon={WalletCards} tone="bg-emerald-50 text-emerald-700" />}
        {canView("invoices") && <StatTile label="Outstanding" value={money(data.invoices.outstanding)} delta={data.invoices.outstandingChange} inverse icon={IndianRupee} tone="bg-red-50 text-red-700" />}
        {showReports && <StatTile label="Net profit" value={money(finance.profit)} delta={finance.profitChange} sub={`${finance.profitMargin.toFixed(1)}% margin`} icon={PiggyBank} tone="bg-violet-50 text-violet-700" />}
      </div>

      {showReports && <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5"><div className="mb-4"><h2 className="font-black text-slate-950">Profitability</h2><p className="text-xs text-slate-500">Revenue collected vs. total expenses this period</p></div>
          <div className="mb-5 space-y-2">
            <BarRow label="Collected" value={num(data.invoices.received)} max={Math.max(num(data.invoices.received), num(finance.totalExpenses), 1)} color="#10b981" />
            <BarRow label="Expenses" value={num(finance.totalExpenses)} max={Math.max(num(data.invoices.received), num(finance.totalExpenses), 1)} color="#E60046" />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-xs font-black text-slate-600">Net profit</span><span className={`text-sm font-black ${num(finance.profit) >= 0 ? "text-emerald-700" : "text-red-700"}`}>{money(finance.profit)}</span></div>
        </Card>
        <Card className="p-5"><div className="mb-4"><h2 className="font-black text-slate-950">Expense breakdown</h2><p className="text-xs text-slate-500">By category, this period</p></div><ExpenseBreakdown categories={finance.expensesByCategory} total={num(finance.totalExpenses)} /></Card>
      </div>}

      {showReports && <Card className="p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-black text-slate-950">Top clients</h2><p className="text-xs text-slate-500">Ranked by invoiced revenue this period</p></div><Building2 className="h-4 w-4 text-slate-400" /></div><TopClientsChart clients={topClients} /></Card>}

      <div className="grid gap-4 xl:grid-cols-2">
        {canView("invoices") && <Card className="p-5"><h2 className="mb-4 font-black text-slate-950">Overdue invoices</h2><div className="space-y-1">{data.invoices.overdue.length ? data.invoices.overdue.map(item => <InvoiceRow key={item.id} item={item} />) : <Empty>Nothing overdue.</Empty>}</div></Card>}
        {canView("quotations") && <Card className="p-5"><h2 className="mb-4 font-black text-slate-950">Expiring quotations</h2><div className="space-y-1">{data.quotations.expiring.length ? data.quotations.expiring.map(item => <QuotationRow key={item.id} item={item} />) : <Empty>Nothing expiring soon.</Empty>}</div></Card>}
      </div>
    </>}

    {tab === "team" && <>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-black text-slate-950">Team leaderboard</h2><p className="text-xs text-slate-500">Ranked by lead value owned this period</p></div><Trophy className="h-4 w-4 text-amber-500" /></div><Leaderboard entries={leaderboard} /></Card>
        <Card className="p-5"><div className="mb-4"><h2 className="font-black text-slate-950">Lead pipeline (this period)</h2><p className="text-xs text-slate-500">{data.pipeline.conversionRate.toFixed(1)}% conversion rate · leads created in the selected range</p></div><PipelineChart stages={data.pipeline.stages} /></Card>
      </div>
      <Card className="p-5"><h2 className="mb-4 font-black text-slate-950">High priority, no next action</h2><div className="grid gap-3 sm:grid-cols-2">{data.pipeline.highPriorityWithoutAction.length ? data.pipeline.highPriorityWithoutAction.map(item => <Link key={item.id} href={`/crm/leads/${item.id}`} className="flex items-center gap-3 rounded-xl border border-amber-100 p-3 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-sky-400"><Target className="h-4 w-4 text-amber-600" /><span className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-800">{item.companyName}</b><span className="text-[11px] text-slate-500">High priority · no next action</span></span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>) : <Empty>Every high-priority lead has a next action.</Empty>}</div></Card>
    </>}
  </div>;
}

function StatTile({ label, value, sub, delta, inverse, icon: Icon, tone }: { label: string; value: string; sub?: string; delta?: number | null; inverse?: boolean; icon: typeof FileText; tone: string }) {
  return <Card className="p-5"><div className="flex justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span></div><p className="mt-2 text-xs text-slate-500">{sub ?? " "}</p>{delta !== undefined && <div className="mt-3"><Delta value={delta} inverse={inverse} /></div>}</Card>;
}
function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return <div><div className="mb-1 flex justify-between text-xs"><span className="font-bold text-slate-700">{label}</span><span className="text-slate-500">{money(value)}</span></div><div className="h-2.5 rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.max(2, (value / max) * 100)}%`, background: color }} /></div></div>;
}
function Recent({ title, href, empty, children }: { title: string; href: string; empty: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children : [children]; const has = items.some(Boolean);
  return <Card className="p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-black text-slate-950">{title}</h2><Link href={href} className="text-xs font-black text-[#0070B8] hover:underline">View all</Link></div><div className="space-y-1">{has ? children : <Empty>{empty}</Empty>}</div></Card>;
}
function QuotationRow({ item }: { item: DashboardQuotation }) { return <Link href={`/quotation?open=${item.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400"><FileText className="h-4 w-4 text-violet-600" /><span className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-800">{item.quotationNumber} · {item.clientName}</b><span className="text-[11px] text-slate-500">{shortDate(item.date)} · {money(item.totalAmount)}</span></span><Badge value={item.status} /></Link>; }
function InvoiceRow({ item }: { item: DashboardInvoice }) { return <Link href={`/invoice?open=${item.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400"><WalletCards className="h-4 w-4 text-emerald-600" /><span className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-800">{item.invoiceNumber} · {item.clientName}</b><span className="text-[11px] text-slate-500">Due {shortDate(item.dueDate)} · {money(item.due)}</span></span><Badge value={item.status} /></Link>; }
