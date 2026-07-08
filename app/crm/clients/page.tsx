"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, Search, Filter, ChevronDown, Eye, Edit,
  FileText, Briefcase, Receipt, RefreshCw,
  Users, UserCheck, UserX, AlertCircle, CheckCircle2, Ban,
  Sparkles, Building2, Mail, Phone, CalendarDays, X,
  TrendingUp, Clock3, ShieldCheck,
} from "lucide-react";
import { clientsApi } from "@/lib/api/clients";
import type { Client, ClientStatus, Industry } from "@/types/client";

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Lead:        "bg-sky-50 text-[#0070B8] ring-sky-100",
  Active:      "bg-emerald-50 text-emerald-700 ring-emerald-100",
  Inactive:    "bg-slate-100 text-slate-600 ring-slate-200",
  Completed:   "bg-violet-50 text-violet-700 ring-violet-100",
  Blacklisted: "bg-red-50 text-red-700 ring-red-100",
};


function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>
      {status}
    </span>
  );
}

function getClientHealth(client: Client) {
  let score = 50;
  if (client.status === "Active") score += 28;
  if (client.status === "Completed") score += 18;
  if (client.status === "Inactive") score -= 12;
  if (client.status === "Blacklisted") score -= 38;
  if (client.primaryEmail) score += 6;
  if (client.mobile || client.whatsapp) score += 6;
  if (client.industry) score += 4;
  if (client.website) score += 4;
  if (client.createdAt) {
    const ageDays = Math.floor((Date.now() - new Date(client.createdAt).getTime()) / 86400000);
    if (ageDays > 180 && client.status === "Inactive") score -= 8;
    if (ageDays < 45 && client.status === "Active") score += 4;
  }
  const value = Math.max(8, Math.min(98, score));
  if (value >= 78) return { score: value, label: "Healthy", className: "text-emerald-700 bg-emerald-50 ring-emerald-100", bar: "bg-emerald-500" };
  if (value >= 56) return { score: value, label: "Stable", className: "text-sky-700 bg-sky-50 ring-sky-100", bar: "bg-[#0070B8]" };
  if (value >= 38) return { score: value, label: "Needs Care", className: "text-amber-700 bg-amber-50 ring-amber-100", bar: "bg-amber-500" };
  return { score: value, label: "At Risk", className: "text-red-700 bg-red-50 ring-red-100", bar: "bg-red-500" };
}

function HealthBadge({ client }: { client: Client }) {
  const health = getClientHealth(client);

  return (
    <div className="min-w-[116px]">
      <div className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${health.className}`}>
        <span>{health.score}</span>
        <span>{health.label}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${health.bar}`} style={{ width: `${health.score}%` }} />
      </div>
    </div>
  );
}

function ClientPreviewDrawer({
  client,
  onClose,
}: {
  client: Client;
  onClose: () => void;
}) {
  const router = useRouter();
  const health = getClientHealth(client);
  const created = client.createdAt
    ? new Date(client.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-[#061526] p-6 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(14,165,233,0.30),transparent_30%),radial-gradient(circle_at_88%_8%,rgba(230,0,70,0.22),transparent_26%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/14 ring-1 ring-white/15">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-100">Client Preview</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">{client.companyName || "Unnamed Client"}</h2>
                <p className="mt-1 text-sm text-slate-300">{client.clientType || "Client"} · {client.industry || "Industry pending"}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-2xl bg-white/10 p-2 text-white transition hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-slate-950">Client Health</p>
                <p className="mt-1 text-sm text-slate-500">Derived from status and profile completeness.</p>
              </div>
              <HealthBadge client={client} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                ["Status", client.status],
                ["Created", created],
                ["Code", client.clientCode || "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <h3 className="text-sm font-black text-slate-950">Contact Details</h3>
            <div className="mt-4 space-y-3">
              {[
                [Phone, "Mobile", client.mobile || client.whatsapp || "—"],
                [Mail, "Email", client.primaryEmail || "—"],
                [Users, "Contact", client.contactPersonName || "—"],
                [Building2, "Business", client.businessType || client.companySize || "—"],
              ].map(([Icon, label, value]) => {
                const DetailIcon = Icon as React.ComponentType<{ className?: string }>;
                return (
                  <div key={String(label)} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#0070B8]">
                      <DetailIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{String(label)}</p>
                      <p className="truncate text-sm font-bold text-slate-800">{String(value)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[22px] border border-slate-200 bg-[#061526] p-5 text-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[#0EA5E9]" />
              <h3 className="text-sm font-black">AI Recommendation</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {health.score < 56
                ? "Schedule a relationship touchpoint and verify missing contact details to improve account health."
                : "Account looks stable. Review open quotations, invoices, and project opportunities for upsell timing."}
            </p>
          </section>

          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => router.push(`/crm/clients/${client.id}`)} className="rounded-2xl bg-[#0070B8] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5">
              View Profile
            </button>
            <button onClick={() => router.push(`/crm/clients/${client.id}/edit`)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50">
              Edit Client
            </button>
            <button onClick={() => router.push(`/quotation?clientId=${client.id}`)} className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-[#0070B8] transition hover:-translate-y-0.5">
              Create Quotation
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 w-full rounded-full bg-slate-100" />
        </td>
      ))}
    </tr>
  );
}

// ─── Inline action buttons ────────────────────────────────────────────────────

function ActionButtons({
  client,
}: {
  client: Client;
}) {
  const router = useRouter();

  const btn = "group/action p-2 rounded-xl transition-all duration-300 disabled:opacity-40 hover:-translate-y-0.5";

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        title="View Profile"
        onClick={() => router.push(`/crm/clients/${client.id}`)}
        className={`${btn} text-[#0070B8] hover:bg-sky-50`}
      >
        <Eye className="h-4 w-4 transition-transform group-hover/action:scale-110" />
      </button>

      <button
        title="Edit Client"
        onClick={() => router.push(`/crm/clients/${client.id}/edit`)}
        className={`${btn} text-slate-600 hover:bg-slate-100`}
      >
        <Edit className="h-4 w-4 transition-transform group-hover/action:scale-110" />
      </button>

      <button
        title="Create Quotation"
        onClick={() => router.push(`/quotation?clientId=${client.id}`)}
        className={`${btn} text-blue-600 hover:bg-blue-50`}
      >
        <FileText className="h-4 w-4 transition-transform group-hover/action:scale-110" />
      </button>

      <button
        title="Create Agreement"
        onClick={() => router.push(`/contract?clientId=${client.id}`)}
        className={`${btn} text-violet-600 hover:bg-violet-50`}
      >
        <Briefcase className="h-4 w-4 transition-transform group-hover/action:scale-110" />
      </button>

      <button
        title="Create Invoice"
        onClick={() => router.push(`/invoice?clientId=${client.id}`)}
        className={`${btn} text-emerald-600 hover:bg-emerald-50`}
      >
        <Receipt className="h-4 w-4 transition-transform group-hover/action:scale-110" />
      </button>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  onClick,
  active,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[20px] border bg-white p-5 text-left shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition-all duration-300 ${
        active ? "border-[#0070B8] ring-4 ring-sky-100 -translate-y-0.5" : "border-slate-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_24px_55px_rgba(15,23,42,0.10)]"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-24 w-24 rounded-full bg-sky-100/60 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-center gap-3">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-black tracking-tight text-slate-950">{value}</p>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
      </div>
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  return (
    <Suspense fallback={null}>
      <ClientsPageInner />
    </Suspense>
  );
}

function ClientsPageInner() {
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") ?? "Active");
  const [industryFilter, setIndustryFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [statusCounts, setStatusCounts] = useState<Record<"Active" | "Inactive" | "Completed" | "Blacklisted", number>>({
    Active: 0, Inactive: 0, Completed: 0, Blacklisted: 0,
  });

  const fetchStatusCounts = useCallback(async () => {
    const statuses: ("Active" | "Inactive" | "Completed" | "Blacklisted")[] = ["Active", "Inactive", "Completed", "Blacklisted"];
    try {
      const results = await Promise.all(statuses.map((s) => clientsApi.list({ status: s, limit: 1 })));
      setStatusCounts(
        statuses.reduce((acc, s, i) => ({ ...acc, [s]: results[i].total }), {} as Record<"Active" | "Inactive" | "Completed" | "Blacklisted", number>)
      );
    } catch { /* ignore if backend unavailable */ }
  }, []);

  useEffect(() => { fetchStatusCounts(); }, [fetchStatusCounts]);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientsApi.list({
        search:   search         || undefined,
        status:   statusFilter   || undefined,
        industry: industryFilter || undefined,
        fromDate: fromDate       || undefined,
        toDate:   toDate         || undefined,
      });
      setClients((res.data ?? []).filter((c) => String(c.status).toUpperCase() !== "LEAD"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load clients";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, industryFilter, fromDate, toDate]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const total = statusCounts.Active + statusCounts.Inactive + statusCounts.Completed + statusCounts.Blacklisted;
  const atRiskClients = clients.filter((client) => getClientHealth(client).score < 56).length;
  const healthyClients = clients.filter((client) => getClientHealth(client).score >= 78).length;
  const incompleteProfiles = clients.filter((client) => !client.primaryEmail || !(client.mobile || client.whatsapp)).length;

  const INDUSTRIES: Industry[] = [
    "IT Services","Digital Marketing","Manufacturing","Healthcare",
    "Education","Retail","Construction","Mining","Logistics",
    "Real Estate","Finance","Other",
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <section className="relative overflow-hidden rounded-[28px] border border-white bg-[#061526] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.16)] lg:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(14,165,233,0.30),transparent_28%),radial-gradient(circle_at_90%_8%,rgba(230,0,70,0.22),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.10),transparent_42%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-sky-100">
              <Sparkles className="h-3.5 w-3.5 text-[#0EA5E9]" />
              Goanny Client Hub
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white lg:text-4xl">Client Relationship Center</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Manage active accounts, agreements, invoices, quotations, and client health from one polished workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchClients}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-4 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/14"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <Link
              href="/crm/clients/new"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#063A66] shadow-lg shadow-sky-950/20 transition hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" /> Add Client
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Clients" value={total}                      icon={Users}      color="bg-sky-50 text-[#0070B8]"
          onClick={() => setStatusFilter("")}           active={statusFilter === ""} />
        <StatCard label="Active"         value={statusCounts.Active}       icon={UserCheck}  color="bg-emerald-50 text-emerald-600"
          onClick={() => setStatusFilter("Active")}      active={statusFilter === "Active"} />
        <StatCard label="Inactive"       value={statusCounts.Inactive}     icon={UserX}      color="bg-slate-100 text-slate-600"
          onClick={() => setStatusFilter("Inactive")}    active={statusFilter === "Inactive"} />
        <StatCard label="Completed"      value={statusCounts.Completed}    icon={CheckCircle2} color="bg-violet-50 text-violet-600"
          onClick={() => setStatusFilter("Completed")}   active={statusFilter === "Completed"} />
        <StatCard label="Blacklisted"    value={statusCounts.Blacklisted}  icon={Ban}        color="bg-red-50 text-red-600"
          onClick={() => setStatusFilter("Blacklisted")} active={statusFilter === "Blacklisted"} />
      </div>

      <section className="grid gap-3 xl:grid-cols-4">
        {[
          { label: "Healthy Accounts", value: healthyClients, icon: ShieldCheck, text: "Strong profile and active lifecycle", tone: "emerald" },
          { label: "Needs Attention", value: atRiskClients, icon: AlertCircle, text: "Review inactive or weak-profile clients", tone: "red" },
          { label: "Profile Gaps", value: incompleteProfiles, icon: Clock3, text: "Missing email or phone details", tone: "amber" },
          { label: "Upsell Ready", value: Math.max(0, healthyClients - statusCounts.Completed), icon: TrendingUp, text: "AI suggests relationship expansion", tone: "sky" },
        ].map((insight) => {
          const Icon = insight.icon;
          const toneClass: Record<string, string> = {
            emerald: "bg-emerald-50 text-emerald-700",
            red: "bg-red-50 text-red-700",
            amber: "bg-amber-50 text-amber-700",
            sky: "bg-sky-50 text-[#0070B8]",
          };

          return (
            <div key={insight.label} className="group rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-sky-200">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition duration-300 group-hover:scale-110 group-hover:rotate-3 ${toneClass[insight.tone]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-black tracking-tight text-slate-950">{insight.value}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">AI</span>
                  </div>
                  <p className="text-sm font-black text-slate-800">{insight.label}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{insight.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Filters ── */}
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">Client Filters</h2>
            <p className="text-sm text-slate-500">Search accounts by company, contact, industry, or lifecycle status.</p>
          </div>
          <p className="text-xs font-semibold text-slate-400">{clients.length} clients loaded</p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.5fr)_1fr_1fr_auto_auto_auto]">
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-8 pr-9 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          >
            <option value="">All Status</option>
            {(["Active","Inactive","Completed","Blacklisted"] as ClientStatus[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          >
            <option value="">All Industries</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="h-11 rounded-2xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="h-11 rounded-2xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
        />

        <button
          onClick={fetchClients}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-[#0070B8]"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">Client Directory</h2>
            <p className="text-sm text-slate-500">Click any row to preview relationship details.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-[#0070B8]">
            <Sparkles className="h-3.5 w-3.5" />
            AI health scoring enabled
          </span>
        </div>
        {error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-red-500">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-red-50">
              <AlertCircle className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold">{error}</p>
            <button onClick={fetchClients} className="flex items-center gap-1 rounded-2xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100">
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-5 py-4 text-left font-black whitespace-nowrap">Code</th>
                  <th className="px-5 py-4 text-left font-black whitespace-nowrap">Company Name</th>
                  <th className="px-5 py-4 text-left font-black whitespace-nowrap">Contact Person</th>
                  <th className="px-5 py-4 text-left font-black whitespace-nowrap">Mobile</th>
                  <th className="px-5 py-4 text-left font-black whitespace-nowrap">Email</th>
                  <th className="px-5 py-4 text-left font-black whitespace-nowrap">Industry</th>
                  <th className="px-5 py-4 text-center font-black whitespace-nowrap">Status</th>
                  <th className="px-5 py-4 text-left font-black whitespace-nowrap">Health</th>
                  <th className="px-5 py-4 text-left font-black whitespace-nowrap">Created</th>
                  <th className="px-5 py-4 text-center font-black whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-50 text-[#0070B8]">
                          <Users className="h-8 w-8" />
                        </div>
                        <p className="text-base font-black text-slate-700">No clients found</p>
                        <p className="text-sm">Try adjusting your filters or add a new client</p>
                        <Link
                          href="/crm/clients/new"
                          className="mt-2 flex items-center gap-1.5 rounded-2xl bg-[#0070B8] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-100 transition hover:-translate-y-0.5 hover:bg-[#075f99]"
                        >
                          <Plus className="h-4 w-4" /> Add First Client
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className="group transition-colors hover:bg-sky-50/45"
                    >
                      <td className="px-5 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold">{client.clientCode || "—"}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0070B8] to-[#0EA5E9] text-white shadow-lg shadow-sky-100 transition duration-300 group-hover:scale-105 group-hover:rotate-3">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                          <Link
                            href={`/crm/clients/${client.id}`}
                            className="font-black text-slate-950 transition-colors hover:text-[#0070B8]"
                          >
                            {client.companyName || "—"}
                          </Link>
                          <p className="text-xs font-semibold text-slate-400">{client.clientType || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700 whitespace-nowrap">{client.contactPersonName || "—"}</td>
                      <td className="px-5 py-4 text-slate-700 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {client.mobile || "—"}
                        </span>
                      </td>
                      <td className="max-w-[220px] truncate px-5 py-4 text-slate-700">
                        <span className="inline-flex min-w-0 items-center gap-2">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{client.primaryEmail || "—"}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{client.industry || "—"}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <StatusBadge status={client.status} />
                      </td>
                      <td className="px-5 py-4">
                        <HealthBadge client={client} />
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                          {client.createdAt
                            ? new Date(client.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                            : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <ActionButtons client={client} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedClient ? (
        <ClientPreviewDrawer
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      ) : null}
    </div>
  );
}
