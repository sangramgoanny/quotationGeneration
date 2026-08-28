"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock, Check, RefreshCw, Search } from "lucide-react";
import { clientsApi } from "@/lib/api/clients";
import { leadsApi } from "@/lib/api/leads";
import { remindersApi, REMINDER_TYPE_FROM_API, type LeadReminder } from "@/lib/api/reminders";

type FollowUpRow = LeadReminder & { companyName: string; status: string };

function formatDate(value: string) { return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }

export default function FollowUpsPage() {
  const [rows, setRows] = useState<FollowUpRow[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"all" | "due" | "upcoming" | "completed">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [leadResult, clientResult] = await Promise.all([leadsApi.list({ limit: 200 }), clientsApi.list({ limit: 200 })]);
      const records = [...leadResult.data, ...clientResult.data].filter((item) => item.id);
      const results = await Promise.allSettled(records.map(async (client) => (await remindersApi.list(client.id as string)).map((reminder) => ({ ...reminder, companyName: client.companyName, status: client.status }))));
      const failed = results.filter((result) => result.status === "rejected").length;
      setRows(results.flatMap((result) => result.status === "fulfilled" ? result.value : []));
      if (failed) setError(`${failed} record${failed === 1 ? "" : "s"} could not load follow-ups.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load follow-ups"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const now = Date.now(); const query = search.trim().toLowerCase();
    return rows.filter((row) => (!query || [row.companyName, row.title, row.note, REMINDER_TYPE_FROM_API[row.type]].some((value) => String(value ?? "").toLowerCase().includes(query))) && (view === "all" || view === "completed" && row.isDone || view === "due" && !row.isDone && new Date(row.scheduledAt).getTime() <= now || view === "upcoming" && !row.isDone && new Date(row.scheduledAt).getTime() > now)).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [rows, search, view]);
  const markDone = async (row: FollowUpRow) => {
    try { await remindersApi.update(row.clientId, row.id, { isDone: true }); setRows((current) => current.map((item) => item.id === row.id ? { ...item, isDone: true } : item)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to complete follow-up"); }
  };

  return <main className="min-h-screen space-y-5 bg-slate-100 p-4 lg:p-6">
    <header className="rounded-2xl bg-[#0b3b5a] px-5 py-4 text-white shadow-lg"><p className="text-[10px] font-black uppercase tracking-widest text-sky-200">CRM / Follow-ups</p><div className="mt-1 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black">Follow-ups</h1><p className="text-xs text-slate-200">Track due, upcoming, and completed customer actions.</p></div><button type="button" onClick={() => void load()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-bold hover:bg-white/20"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button></div></header>
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search follow-ups or companies" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-sky-300 focus:bg-white" /></label><select value={view} onChange={(event) => setView(event.target.value as typeof view)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600"><option value="all">All follow-ups</option><option value="due">Due now</option><option value="upcoming">Upcoming</option><option value="completed">Completed</option></select></section>
    {error ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div> : null}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="divide-y divide-slate-100">{loading ? <div className="p-10 text-center text-sm text-slate-500">Loading follow-ups...</div> : filtered.length ? filtered.map((row) => <article key={row.id} className="flex items-center gap-3 p-4"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${row.isDone ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}><CalendarClock className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="font-black text-slate-900">{row.title || "Follow-up"}</p><p className="mt-0.5 text-sm font-semibold text-slate-600">{row.companyName || "Unnamed record"} · {REMINDER_TYPE_FROM_API[row.type]}</p><p className="mt-1 text-xs text-slate-500">{row.note || "No note"} · <span className="font-bold">{formatDate(row.scheduledAt)}</span></p></div>{row.isDone ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Completed</span> : <button type="button" onClick={() => void markDone(row)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"><Check className="h-3.5 w-3.5" /> Mark done</button>}</article>) : <div className="p-12 text-center text-sm text-slate-500">No follow-ups found.</div>}</div><footer className="border-t border-slate-100 p-3 text-xs text-slate-500">{filtered.length} follow-up{filtered.length === 1 ? "" : "s"} shown</footer></section>
  </main>;
}
