"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarClock, Check, Clock3, Eye, RefreshCw, Search, TrendingUp } from "lucide-react";
import { remindersApi, REMINDER_TYPE_FROM_API, type LeadReminder, type ReminderStatus, type ReminderSummary } from "@/lib/api/reminders";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function FollowUpsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<LeadReminder[]>([]);
  const [summary, setSummary] = useState<ReminderSummary | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReminderStatus>("OPEN");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [listResult, summaryResult] = await Promise.allSettled([
        remindersApi.globalList({ search: search || undefined, status, page, limit: pageSize }),
        remindersApi.summary(),
      ]);
      if (listResult.status === "rejected") throw listResult.reason;
      setRows(listResult.value.data);
      setTotal(listResult.value.total);
      setPages(Math.max(1, listResult.value.pages));
      if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load follow-ups");
    } finally { setLoading(false); }
  }, [page, pageSize, search, status]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); }, [load]);

  const metrics = summary ?? { total: 0, open: 0, overdue: 0, dueToday: 0, upcoming: 0, completed: 0, highPriority: 0 };
  const cards = [
    ["Total", metrics.total, "ALL", "text-sky-600 bg-sky-50", CalendarClock],
    ["Overdue", metrics.overdue, "OVERDUE", "text-red-600 bg-red-50", AlertCircle],
    ["Due today", metrics.dueToday, "DUE_TODAY", "text-amber-600 bg-amber-50", Clock3],
    ["Upcoming", metrics.upcoming, "UPCOMING", "text-indigo-600 bg-indigo-50", TrendingUp],
    ["Completed", metrics.completed, "COMPLETED", "text-emerald-600 bg-emerald-50", Check],
  ] as const;
  const highPriority = useMemo(() => rows.filter((row) => row.priority === "HIGH").length, [rows]);

  const markDone = async (row: LeadReminder) => {
    try {
      const updated = await remindersApi.globalUpdate(row.id, { isDone: true });
      setRows((current) => current.map((item) => item.id === row.id ? updated : item));
      setSummary((current) => current ? { ...current, open: Math.max(0, current.open - 1), completed: current.completed + 1, overdue: current.overdue - (new Date(row.scheduledAt).getTime() < Date.now() ? 1 : 0) } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to complete follow-up"); }
  };

  const viewRecord = (row: LeadReminder) => {
    if (!row.clientId) return;
    if (row.client?.status === "LEAD") {
      router.push(`/crm/leads?open=${encodeURIComponent(row.clientId)}&returnTo=%2Fcrm%2Ffollow-ups`);
      return;
    }
    router.push(`/crm/clients/${encodeURIComponent(row.clientId)}`);
  };

  return <main className="min-h-screen space-y-5 bg-slate-100 p-4 lg:p-6">
    <header className="rounded-2xl bg-[#0b3b5a] px-5 py-4 text-white shadow-lg"><p className="text-[10px] font-black uppercase tracking-widest text-sky-200">CRM / Follow-ups</p><div className="mt-1 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black">Follow-ups</h1><p className="text-xs text-slate-200">Manage due, upcoming, and completed customer actions.</p></div><button type="button" onClick={() => void load()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-bold hover:bg-white/20"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button></div></header>
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{cards.map(([label, value, filter, tone, Icon]) => <button type="button" key={label} onClick={() => { setStatus(filter as ReminderStatus); setPage(1); }} className={`rounded-2xl border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 ${status === filter ? "border-sky-400 ring-2 ring-sky-100" : "border-slate-200"}`}><span className={`inline-flex rounded-xl p-2 ${tone}`}><Icon className="h-4 w-4" /></span><p className="mt-2 text-xl font-black text-slate-950">{value}</p><p className="text-[11px] font-bold text-slate-500">{label}</p></button>)}</section>
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search follow-ups, companies, or titles" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-sky-300 focus:bg-white" /></label><select value={status} onChange={(event) => { setStatus(event.target.value as ReminderStatus); setPage(1); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600"><option value="OPEN">Open follow-ups</option><option value="ALL">All follow-ups</option><option value="OVERDUE">Overdue</option><option value="DUE_TODAY">Due today</option><option value="UPCOMING">Upcoming</option><option value="COMPLETED">Completed</option></select></section>
    {error ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div> : null}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="divide-y divide-slate-100">{loading ? <div className="p-10 text-center text-sm text-slate-500">Loading follow-ups...</div> : rows.length ? rows.map((row) => { const overdue = !row.isDone && new Date(row.scheduledAt).getTime() < Date.now(); return <article key={row.id} className={`flex items-center gap-3 p-4 ${overdue ? "border-l-4 border-l-red-400 bg-red-50/30" : ""}`}><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${row.isDone ? "bg-emerald-50 text-emerald-600" : overdue ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}><CalendarClock className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="font-black text-slate-900">{row.title || "Follow-up"}</p><p className="mt-0.5 text-sm font-semibold text-slate-600">{row.client?.companyName || "Unnamed record"} · {REMINDER_TYPE_FROM_API[row.type]} {row.priority === "HIGH" ? "· High priority" : ""}</p><p className={`mt-1 text-xs ${overdue ? "font-bold text-red-600" : "text-slate-500"}`}>{row.note || "No note"} · <span className="font-bold">{formatDate(row.scheduledAt)}</span></p>{row.assignedUser ? <p className="mt-1 text-[11px] font-semibold text-slate-400">Assigned to {row.assignedUser.name}</p> : null}</div><div className="flex shrink-0 items-center gap-2">{row.clientId ? <button type="button" onClick={() => viewRecord(row)} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100"><Eye className="h-3.5 w-3.5" /> View {row.client?.status === "LEAD" ? "lead" : "client"}</button> : null}{row.isDone ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Completed</span> : <button type="button" onClick={() => void markDone(row)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"><Check className="h-3.5 w-3.5" /> Mark done</button>}</div></article>; }) : <div className="p-12 text-center text-sm text-slate-500">No follow-ups found.</div>}</div><footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-3 text-xs text-slate-500"><span>Showing {rows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, (page - 1) * pageSize + rows.length)} of {total} · {highPriority} high priority on this page</span><div className="flex items-center gap-2"><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-slate-200 px-2 py-1 font-semibold"><option value={20}>20 / page</option><option value={50}>50 / page</option><option value={100}>100 / page</option></select><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-1.5 font-bold disabled:opacity-40">Previous</button><span className="font-bold">{page} / {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-1.5 font-bold disabled:opacity-40">Next</button></div></footer></section>
  </main>;
}
