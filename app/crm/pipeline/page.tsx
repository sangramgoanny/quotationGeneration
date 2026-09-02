"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarDays, ChevronDown, Eye, Filter, Mail, Phone, RefreshCw, Search, Target, UserRound } from "lucide-react";
import { leadsApi } from "@/lib/api/leads";
import { usersApi, type User } from "@/lib/api/users";
import { usePermissions } from "@/lib/rbac/usePermissions";
import type { Client } from "@/types/client";

const STAGES = ["New", "Hot", "Warm", "Cold", "Quotation Sent", "Won", "Lost"] as const;
type Stage = (typeof STAGES)[number];
const stageApi: Record<Stage, string> = { New: "NEW", Hot: "HOT", Warm: "WARM", Cold: "COLD", "Quotation Sent": "QUOTATION_SENT", Won: "WON", Lost: "LOST" };
const stageTone: Record<Stage, string> = {
  New: "border-slate-200 bg-slate-50", Hot: "border-rose-200 bg-rose-50", Warm: "border-amber-200 bg-amber-50",
  Cold: "border-cyan-200 bg-cyan-50", "Quotation Sent": "border-violet-200 bg-violet-50", Won: "border-emerald-200 bg-emerald-50", Lost: "border-zinc-200 bg-zinc-50",
};

function formatValue(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: process.env.NEXT_PUBLIC_CURRENCY ?? "INR", maximumFractionDigits: 0 }).format(value || 0);
}

function displayStage(value?: string): Stage {
  const normalized = String(value || "").toUpperCase();
  return STAGES.find((stage) => stageApi[stage] === normalized) ?? (STAGES.find((stage) => stage.toUpperCase() === value?.toUpperCase()) ?? "New");
}

function LeadCard({ lead, onStageChange, onConvert, onView, onDragStart, onDragEnd }: { lead: Client; onStageChange: (lead: Client, stage: Stage) => void; onConvert: (lead: Client) => void; onView: (lead: Client) => void; onDragStart: (lead: Client) => void; onDragEnd: () => void }) {
  const stage = displayStage(lead.leadStage);
  return (
    <article draggable onDragStart={() => onDragStart(lead)} onDragEnd={onDragEnd} className="cursor-grab rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing">
      <div>
        <div className="min-w-0">
          <button type="button" onClick={() => onView(lead)} className="block max-w-full truncate text-left text-sm font-black text-slate-950 hover:text-[#0070B8]">{lead.companyName || "Unnamed lead"}</button>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">{lead.contactPersonName || "No contact person"}</p>
        </div>
        <select onClick={(event) => event.stopPropagation()} aria-label={`Update stage for ${lead.companyName}`} value={stage} onChange={(event) => onStageChange(lead, event.target.value as Stage)} className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600">
          {STAGES.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
        <span className={`rounded-full border px-2.5 py-1 ${stageTone[stage]}`}>{stage}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1">{lead.leadSource || "Source not set"}</span>
      </div>
      <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-[11px]">
        <p className="flex items-start gap-1.5 font-semibold text-slate-600" title={lead.accountManagerName || "Unassigned"}><UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="min-w-0 break-words">{lead.accountManagerName || "Unassigned"}</span></p>
        <div className="grid grid-cols-2 gap-2">
          <p className="truncate text-slate-400"><CalendarDays className="mr-1 inline h-3.5 w-3.5" />{lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "No follow-up"}</p>
          <p className="text-right font-bold text-slate-700"><Target className="mr-1 inline h-3.5 w-3.5 text-[#0070B8]" />{lead.quotationCount ?? 0} quotes</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          {stage === "Won" ? (
            <button type="button" onClick={() => onConvert(lead)} className="inline-flex min-h-8 flex-1 items-center justify-center rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-black text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300">Convert to Client</button>
          ) : <span className="text-[10px] font-semibold text-slate-400">Lead actions</span>}
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" title="View lead in pipeline" onClick={() => onView(lead)} className="rounded-lg p-1.5 text-[#0070B8] hover:bg-sky-50"><Eye className="h-3.5 w-3.5" /></button>
            {lead.primaryEmail ? <a title="Email lead" href={`mailto:${lead.primaryEmail}`} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Mail className="h-3.5 w-3.5" /></a> : null}
            {lead.mobile ? <a title="Call lead" href={`tel:${lead.mobile}`} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Phone className="h-3.5 w-3.5" /></a> : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function PipelinePage() {
  const router = useRouter();
  const { can } = usePermissions();
  // The assignable-users lookup requires leads ASSIGN/REASSIGN on the backend
  // (users.service.findAssignable). Roles without it — e.g. Sales Executive —
  // would just get a 403, so skip the call and hide the filter entirely.
  const canFilterByAssignee = can("leads", "assign") || can("leads", "reassign");
  const [leads, setLeads] = useState<Client[]>([]);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof leadsApi.pipelineSummary>> | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "">("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<Stage | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [listResult, summaryResult] = await Promise.allSettled([
        leadsApi.list({ search: search || undefined, stage: stageFilter ? stageApi[stageFilter] : undefined, accountManagerId: assigneeFilter || undefined, limit: 200 }),
        leadsApi.pipelineSummary(),
      ]);
      if (listResult.status === "rejected") throw listResult.reason;
      setLeads(listResult.value.data);
      if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
      else setError(summaryResult.reason instanceof Error ? `Pipeline totals unavailable: ${summaryResult.reason.message}` : "Pipeline totals unavailable");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load pipeline");
    } finally { setLoading(false); }
  }, [search, stageFilter, assigneeFilter]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); }, [load]);

  useEffect(() => {
    if (!canFilterByAssignee) return;
    usersApi.list({ isActive: true, assignableTo: "leads" }).then(setAssignableUsers).catch(() => { /* keep filter usable */ });
  }, [canFilterByAssignee]);

  const grouped = useMemo(() => STAGES.map((stage) => ({ stage, leads: leads.filter((lead) => displayStage(lead.leadStage) === stage), summary: summary?.stages.find((item) => item.stage === stageApi[stage]) })), [leads, summary]);
  const updateStage = async (lead: Client, stage: Stage) => {
    if (!lead.id) return;
    if (displayStage(lead.leadStage) === stage) return;
    try {
      await leadsApi.updateStage(lead.id, stageApi[stage]);
      setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, leadStage: stage } : item));
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update lead stage"); }
  };
  const handleDragStart = (lead: Client) => setDraggingId(lead.id ?? null);
  const handleDrop = async (event: DragEvent<HTMLDivElement>, stage: Stage) => {
    event.preventDefault();
    setDropStage(null);
    const lead = leads.find((item) => item.id === draggingId);
    setDraggingId(null);
    if (lead) await updateStage(lead, stage);
  };
  const convert = async (lead: Client) => {
    if (!lead.id || !window.confirm(`Convert ${lead.companyName || "this lead"} to a client?`)) return;
    try {
      await leadsApi.convert(lead.id);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to convert lead"); }
  };

  return (
    <div className="min-h-full space-y-5 bg-slate-100 p-1">
      <section className="rounded-[24px] bg-[#061526] p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">CRM / Pipeline</p><h1 className="mt-2 text-3xl font-black tracking-tight">Lead Pipeline</h1><p className="mt-2 text-sm text-slate-300">Live pipeline data from Client records with status LEAD.</p></div>
          <Link href="/crm/leads" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-[#063A66]"><Target className="h-4 w-4" /> Open Leads</Link>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Leads", summary?.totalLeads ?? "—"], ["Pipeline Value", summary ? formatValue(summary.totalPipelineValue) : "—"],
          ["Follow-ups Due", summary?.followUpsDue ?? "—"], ["Quotation Sent", summary?.quotationSent ?? "—"],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-bold text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}</p></div>)}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search leads, companies, or contacts" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100" /></label>
          <div className="relative"><Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as Stage | "")} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-8 pr-9 text-sm font-bold text-slate-600"><option value="">All stages</option>{STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /></div>
          {canFilterByAssignee && (
            <div className="relative"><UserRound className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-8 pr-9 text-sm font-bold text-slate-600"><option value="">All users</option>{assignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /></div>
          )}
          <button type="button" onClick={() => void load()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0070B8] px-4 text-sm font-bold text-white"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
        </div>
        <p className="mt-3 text-[11px] font-semibold text-slate-400">Drag a lead card to another stage, or use the stage menu on the card.</p>
      </section>
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"><AlertCircle className="mr-2 inline h-4 w-4" />{error}</div> : null}
      <section className="overflow-x-auto rounded-2xl pb-3">
        <div className="grid min-w-[1510px] grid-cols-[repeat(7,minmax(200px,1fr))] gap-3">
          {grouped.map(({ stage, leads: stageLeads, summary: stageSummary }) => <div key={stage} onDragOver={(event) => { event.preventDefault(); setDropStage(stage); }} onDragLeave={() => setDropStage(null)} onDrop={(event) => void handleDrop(event, stage)} className={`min-h-[420px] rounded-2xl border p-3 transition-colors ${dropStage === stage ? "border-sky-400 bg-sky-50 ring-2 ring-sky-200" : "border-slate-200 bg-slate-50"}`}>
            <div className="mb-3 flex items-center justify-between"><div><h2 className="text-xs font-black text-slate-800">{stage}</h2><p className="mt-1 text-[10px] font-semibold text-slate-400">{stageSummary?.count ?? stageLeads.length} leads · {stageSummary ? formatValue(stageSummary.value) : "—"}</p></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">{stageLeads.length}</span></div>
            <div className="space-y-3">{loading ? <div className="h-28 animate-pulse rounded-xl bg-slate-200" /> : stageLeads.length ? stageLeads.map((lead) => <LeadCard key={lead.id} lead={lead} onStageChange={updateStage} onConvert={convert} onView={(item) => router.push(`/crm/leads?open=${encodeURIComponent(item.id ?? "")}&returnTo=%2Fcrm%2Fpipeline`)} onDragStart={handleDragStart} onDragEnd={() => { setDraggingId(null); setDropStage(null); }} />) : <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center text-xs font-semibold text-slate-400">{draggingId ? "Drop lead here" : "No leads"}</div>}</div>
          </div>)}
        </div>
      </section>
    </div>
  );
}
