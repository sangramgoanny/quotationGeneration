"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { clientsApi } from "@/lib/api/clients";
import { leadsApi } from "@/lib/api/leads";
import { activityApi, type ActivityLog } from "@/lib/api/activity";

type ActivityRow = ActivityLog & { companyName: string; status: string };

function dateLabel(value: string) {
  return value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Unknown date";
}

export default function ActivitiesPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [leadResult, clientResult] = await Promise.all([leadsApi.list({ limit: 200 }), clientsApi.list({ limit: 200 })]);
      const records = [...leadResult.data, ...clientResult.data];
      const results = await Promise.allSettled(records.filter((item) => item.id).map(async (client) => {
        const logs = await activityApi.list(client.id as string);
        return logs.map((log) => ({ ...log, companyName: client.companyName, status: client.status }));
      }));
      const failed = results.filter((result) => result.status === "rejected").length;
      setRows(results.flatMap((result) => result.status === "fulfilled" ? result.value : []));
      if (failed) setError(`${failed} record${failed === 1 ? "" : "s"} could not load activity history.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load activities");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const actions = useMemo(() => Array.from(new Set(rows.map((row) => row.action))).sort(), [rows]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => (!action || row.action === action) && (!query || [row.companyName, row.action, row.description, row.user?.name, row.userName].some((value) => String(value ?? "").toLowerCase().includes(query)))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [rows, search, action]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return <main className="min-h-screen space-y-5 bg-slate-100 p-4 lg:p-6">
    <header className="rounded-2xl bg-[#0b3b5a] px-5 py-4 text-white shadow-lg"><p className="text-[10px] font-black uppercase tracking-widest text-sky-200">CRM / Activities</p><div className="mt-1 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black">Activities</h1><p className="text-xs text-slate-200">A complete timeline of lead and client interactions.</p></div><button type="button" onClick={() => void load()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs font-bold hover:bg-white/20"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button></div></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search company, action, description or user" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-sky-300 focus:bg-white" /></label><select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600"><option value="">All activities</option>{actions.map((item) => <option key={item}>{item}</option>)}</select></div></section>
    {error ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div> : null}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="divide-y divide-slate-100">{loading ? <div className="p-10 text-center text-sm text-slate-500">Loading activities...</div> : visible.length ? visible.map((row) => <article key={row.id} className="flex gap-3 p-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Activity className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/crm/${row.status === "Lead" ? "leads" : "clients"}/${row.clientId}`} className="font-black text-slate-900 hover:text-sky-700">{row.companyName || "Unnamed record"}</Link><time className="text-xs text-slate-400">{dateLabel(row.createdAt)}</time></div><p className="mt-1 text-sm font-bold text-slate-700">{row.action}</p><p className="mt-0.5 text-sm text-slate-500">{row.description || "No description"}</p><p className="mt-2 text-[11px] font-semibold text-slate-400">By {row.user?.name || row.userName || "System"}</p></div></article>) : <div className="p-12 text-center text-sm text-slate-500">No activities found.</div>}</div><footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-3 text-xs text-slate-500"><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span><div className="flex items-center gap-2"><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-slate-200 px-2 py-1 font-semibold"><option value={10}>10 / page</option><option value={20}>20 / page</option><option value={50}>50 / page</option></select><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-1.5 font-bold disabled:opacity-40">Previous</button><span className="font-bold">{page} / {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-1.5 font-bold disabled:opacity-40">Next</button></div></footer></section>
  </main>;
}
