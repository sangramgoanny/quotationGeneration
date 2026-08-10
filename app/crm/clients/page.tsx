"use client";

import React, { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, Search, Filter, ChevronDown, Eye, Edit,
  FileText, Briefcase, Receipt, RefreshCw,
  Users, UserCheck, AlertCircle,
  Sparkles, Building2, Mail, Phone, CalendarDays, X,
  TrendingUp, Clock3, ShieldCheck, Upload, MoreVertical,
  WalletCards, CircleDollarSign, BadgeIndianRupee, FileClock,
  UserRoundCheck, Activity as ActivityIcon, ChevronLeft, ChevronRight, Download,
} from "lucide-react";
import { clientsApi } from "@/lib/api/clients";
import { invoicesApi } from "@/lib/api/invoices";
import { usersApi, type User as AccountUser } from "@/lib/api/users";
import type { Client, ClientStatus, Industry } from "@/types/client";
import DateRangePicker from "@/components/ui/DateRangePicker";

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Lead:        "bg-sky-50 text-[#0070B8] ring-sky-100",
  Active:      "bg-emerald-50 text-emerald-700 ring-emerald-100",
  Inactive:    "bg-slate-100 text-slate-600 ring-slate-200",
  Completed:   "bg-violet-50 text-violet-700 ring-violet-100",
  Blacklisted: "bg-red-50 text-red-700 ring-red-100",
};
const ERP_CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "INR";


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
  const reasons = [
    `Lifecycle status: ${client.status}`,
    client.primaryEmail ? "Primary email available" : "Primary email missing",
    client.mobile || client.whatsapp ? "Phone contact available" : "Phone contact missing",
    client.industry ? "Industry captured" : "Industry missing",
  ].join(" • ");
  if (value >= 80) return { score: value, label: "Healthy", className: "text-emerald-700 bg-emerald-50 ring-emerald-100", bar: "bg-emerald-500", reasons };
  if (value >= 60) return { score: value, label: "Stable", className: "text-sky-700 bg-sky-50 ring-sky-100", bar: "bg-[#0070B8]", reasons };
  if (value >= 40) return { score: value, label: "Needs Attention", className: "text-amber-700 bg-amber-50 ring-amber-100", bar: "bg-amber-500", reasons };
  return { score: value, label: "At Risk", className: "text-red-700 bg-red-50 ring-red-100", bar: "bg-red-500", reasons };
}

function HealthBadge({ client }: { client: Client }) {
  const health = getClientHealth(client);

  return (
    <div className="min-w-[116px]" title={`Rule-based Health Score: ${health.reasons}`}>
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
              <h3 className="text-sm font-black">Rule-based Recommendation</h3>
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
      {Array.from({ length: 8 }).map((_, i) => (
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
        title="Add Activity"
        onClick={() => router.push(`/crm/clients/${client.id}?tab=activity`)}
        className={`${btn} text-amber-600 hover:bg-amber-50`}
      >
        <ActivityIcon className="h-4 w-4 transition-transform group-hover/action:scale-110" />
      </button>

      <details className="group/menu relative">
        <summary title="More actions" className={`${btn} list-none cursor-pointer text-slate-500 hover:bg-slate-100`}>
          <MoreVertical className="h-4 w-4" />
        </summary>
        <div className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl">
          {[
            ["Create Quotation", FileText, `/quotation/new?clientId=${client.id}`],
            ["Create Invoice", Receipt, `/invoice/new?clientId=${client.id}`],
            ["Create Agreement", Briefcase, `/contract?clientId=${client.id}`],
            ["Add Follow-up", Clock3, `/crm/clients/${client.id}?tab=activity`],
            ["Upload Document", Upload, `/crm/clients/${client.id}?tab=documents`],
            ["View Timeline", ActivityIcon, `/crm/clients/${client.id}?tab=activity`],
          ].map(([label, Icon, href]) => {
            const MenuIcon = Icon as React.ComponentType<{ className?: string }>;
            return (
              <button
                key={String(label)}
                type="button"
                onClick={() => router.push(String(href))}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-sky-50 hover:text-[#0070B8]"
              >
                <MenuIcon className="h-3.5 w-3.5" /> {String(label)}
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface FinancialMetric {
  label: string;
  value: number | null;
  kind: "currency" | "percentage";
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  helper: string;
}

function formatFinancialValue(value: number, kind: FinancialMetric["kind"]) {
  if (kind === "percentage") return `${value.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: ERP_CURRENCY,
    maximumFractionDigits: 0,
  }).format(value);
}

function FinancialMetricCard({ metric }: { metric: FinancialMetric }) {
  const Icon = metric.icon;
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)]" title={metric.helper}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">{metric.label}</p>
          <p className={`mt-2 text-xl font-black tracking-tight ${metric.value === null ? "text-slate-400" : "text-slate-950"}`}>
            {metric.value === null ? "Unavailable" : formatFinancialValue(metric.value, metric.kind)}
          </p>
          <p className="mt-1 text-[10px] font-semibold text-slate-400">
            {metric.value === null ? "Reporting API required" : "Selected period"}
          </p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${metric.tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
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
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [countsLoading, setCountsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [accountManagers, setAccountManagers] = useState<AccountUser[]>([]);
  const importing = false;

  // Filters
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") ?? "Active");
  const [industryFilter, setIndustryFilter] = useState<string>(searchParams.get("industry") ?? "");
  const [accountManagerFilter, setAccountManagerFilter] = useState(searchParams.get("accountManagerId") ?? "");
  const [healthFilter, setHealthFilter] = useState(searchParams.get("health") ?? "");
  const [profileFilter, setProfileFilter] = useState(searchParams.get("profile") ?? "");
  const [fromDate, setFromDate] = useState(searchParams.get("fromDate") ?? "");
  const [toDate, setToDate] = useState(searchParams.get("toDate") ?? "");
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page")) || 1));
  const [limit, setLimit] = useState(Math.max(10, Number(searchParams.get("limit")) || 20));
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [invoiceTotals, setInvoiceTotals] = useState({ revenue: 0, paid: 0, outstanding: 0 });
  const [clientFinancials, setClientFinancials] = useState<Record<string, { revenue: number; outstanding: number }>>({});
  const [financialLoading, setFinancialLoading] = useState(true);

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
    } catch { /* keep status cards unavailable if backend is offline */ }
    finally { setCountsLoading(false); }
  }, []);

  useEffect(() => { fetchStatusCounts(); }, [fetchStatusCounts]);
  useEffect(() => {
    let active = true;
    const fetchInvoiceTotals = async () => {
      setFinancialLoading(true);
      try {
        const first = await invoicesApi.list({ page: 1, limit: 100 });
        const remaining = first.pagination.pages > 1
          ? await Promise.all(Array.from({ length: first.pagination.pages - 1 }, (_, index) => invoicesApi.list({ page: index + 2, limit: 100 })))
          : [];
        const invoices = [first, ...remaining].flatMap((result) => result.invoices ?? []);
        if (active) {
          const issuedStatuses = new Set(["SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"]);
          const outstandingStatuses = new Set(["SENT", "PARTIALLY_PAID", "OVERDUE"]);
          const invoiceBalance = (invoice: typeof invoices[number]) =>
            outstandingStatuses.has(invoice.status)
              ? Math.max((Number(invoice.amount) || 0) - (Number(invoice.paid) || 0), 0)
              : 0;

          setInvoiceTotals(invoices.reduce((totals, invoice) => ({
            revenue: totals.revenue + (issuedStatuses.has(invoice.status) ? Number(invoice.amount) || 0 : 0),
            paid: totals.paid + (issuedStatuses.has(invoice.status) ? Number(invoice.paid) || 0 : 0),
            outstanding: totals.outstanding + invoiceBalance(invoice),
          }), { revenue: 0, paid: 0, outstanding: 0 }));
          setClientFinancials(invoices.reduce<Record<string, { revenue: number; outstanding: number }>>((totals, invoice) => {
            if (!issuedStatuses.has(invoice.status)) return totals;
            const invoiceClientId = invoice.clientId || invoice.client?.id;
            if (!invoiceClientId) return totals;
            const current = totals[invoiceClientId] ?? { revenue: 0, outstanding: 0 };
            totals[invoiceClientId] = {
              revenue: current.revenue + (Number(invoice.amount) || 0),
              outstanding: current.outstanding + invoiceBalance(invoice),
            };
            return totals;
          }, {}));
        }
      } catch {
        if (active) setInvoiceTotals({ revenue: 0, paid: 0, outstanding: 0 });
      } finally {
        if (active) setFinancialLoading(false);
      }
    };
    void fetchInvoiceTotals();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    usersApi.list().then(setAccountManagers).catch(() => setAccountManagers([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientsApi.list({
        search:   search         || undefined,
        status:   statusFilter   || undefined,
        industry: industryFilter || undefined,
        accountManagerId: accountManagerFilter || undefined,
        fromDate: fromDate       || undefined,
        toDate:   toDate         || undefined,
        page,
        limit,
      });
      setClients((res.data ?? []).filter((c) => String(c.status).toUpperCase() !== "LEAD"));
      setPagination({ total: res.total, pages: Math.max(1, res.pages) });
      setLastRefreshed(new Date());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load clients";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, industryFilter, accountManagerFilter, fromDate, toDate, page, limit]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (industryFilter) params.set("industry", industryFilter);
    if (accountManagerFilter) params.set("accountManagerId", accountManagerFilter);
    if (healthFilter) params.set("health", healthFilter);
    if (profileFilter) params.set("profile", profileFilter);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    if (page > 1) params.set("page", String(page));
    if (limit !== 20) params.set("limit", String(limit));
    router.replace(`/crm/clients${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  }, [search, statusFilter, industryFilter, accountManagerFilter, healthFilter, profileFilter, fromDate, toDate, page, limit, router]);

  const total = statusCounts.Active + statusCounts.Inactive + statusCounts.Completed + statusCounts.Blacklisted;
  const displayedClients = useMemo(() => clients.filter((client) => {
    const score = getClientHealth(client).score;
    if (healthFilter === "healthy" && score < 80) return false;
    if (healthFilter === "stable" && (score < 60 || score >= 80)) return false;
    if (healthFilter === "attention" && (score < 40 || score >= 60)) return false;
    if (healthFilter === "risk" && score >= 40) return false;
    if (profileFilter === "incomplete" && client.primaryEmail && (client.mobile || client.whatsapp)) return false;
    return true;
  }), [clients, healthFilter, profileFilter]);
  const atRiskClients = clients.filter((client) => getClientHealth(client).score < 60).length;
  const healthyClients = clients.filter((client) => getClientHealth(client).score >= 80).length;
  const incompleteProfiles = clients.filter((client) => !client.primaryEmail || !(client.mobile || client.whatsapp)).length;
  const portfolioRevenue = invoiceTotals.revenue;
  const totalOutstanding = invoiceTotals.outstanding;
  const collectionPercent = portfolioRevenue > 0 ? Math.min(100, Math.round((invoiceTotals.paid / portfolioRevenue) * 100)) : 0;
  const conversionRate = total > 0 ? Math.round((statusCounts.Active / total) * 100) : 0;
  const activeFilterCount = [search, statusFilter, industryFilter, accountManagerFilter, healthFilter, profileFilter, fromDate || toDate]
    .filter(Boolean).length;

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("");
    setIndustryFilter("");
    setAccountManagerFilter("");
    setHealthFilter("");
    setProfileFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const financialMetrics: FinancialMetric[] = [
    { label: "Total Client Revenue", value: null, kind: "currency", icon: TrendingUp, tone: "bg-sky-50 text-[#0070B8]", helper: "Requires confirmed revenue aggregation from the reporting API." },
    { label: "Amount Received", value: null, kind: "currency", icon: WalletCards, tone: "bg-emerald-50 text-emerald-700", helper: "Requires completed receipt/payment aggregation." },
    { label: "Outstanding Amount", value: null, kind: "currency", icon: CircleDollarSign, tone: "bg-amber-50 text-amber-700", helper: "Requires invoice and payment aggregation for the selected period." },
    { label: "Overdue Amount", value: null, kind: "currency", icon: FileClock, tone: "bg-red-50 text-red-700", helper: "Requires unpaid invoice balances with due dates before today." },
    { label: "Pending Invoice Amount", value: null, kind: "currency", icon: Receipt, tone: "bg-amber-50 text-amber-700", helper: "Requires unpaid and partially paid invoice balances." },
    { label: "Pending Quotation Value", value: null, kind: "currency", icon: FileText, tone: "bg-violet-50 text-violet-700", helper: "Requires pending quotation status aggregation." },
    { label: "Average Client Value", value: null, kind: "currency", icon: BadgeIndianRupee, tone: "bg-sky-50 text-sky-700", helper: "Requires revenue divided by clients with revenue." },
    { label: "Collection Rate", value: null, kind: "percentage", icon: UserRoundCheck, tone: "bg-emerald-50 text-emerald-700", helper: "Requires amount received divided by total invoiced." },
  ];

  const INDUSTRIES: Industry[] = [
    "IT Services","Digital Marketing","Manufacturing","Healthcare",
    "Education","Retail","Construction","Mining","Logistics",
    "Real Estate","Finance","Other",
  ];

  return (
    <div className="space-y-4 bg-[#f7f9fc] p-3 lg:p-4">
      <section className="relative overflow-visible rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="hidden" />
        <div className="relative flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
          <div className="hidden">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0070B8]">
              <Sparkles className="h-3.5 w-3.5 text-[#0EA5E9]" />
              CRM / Clients Management
            </div>
            <h1 className="mt-0.5 text-xl font-black tracking-tight text-slate-950">Clients Command Center</h1>
            <p className="hidden">
              Manage active accounts, agreements, invoices, quotations, and client health from one polished workspace.
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">
              {lastRefreshed ? `Last refreshed ${lastRefreshed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Waiting for first refresh"}
            </p>
          </div>
          <div className="flex w-full flex-nowrap items-center gap-2">
            <div className="flex min-w-[320px] flex-1 items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search company, contact, phone or email"
                  aria-label="Global client search"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <DateRangePicker from={fromDate} to={toDate} onChange={(from, to) => { setFromDate(from); setToDate(to); setPage(1); }} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={fetchClients} title="Refresh client data" className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-sky-200 hover:text-[#0070B8]">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
              <button type="button" className="hidden h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 lg:inline-flex">
                <Upload className="h-3.5 w-3.5" /> {importing ? "Importing…" : "Import Clients"}
              </button>
              <button type="button" className="hidden h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 lg:inline-flex">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              <Link href="/crm/clients/new" className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2563EB] px-4 text-xs font-black text-white shadow-md shadow-blue-200 transition hover:bg-blue-700">
                <Plus className="h-3.5 w-3.5" /> Add New Client
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {[
          { label: "Total Clients", value: total.toLocaleString("en-IN"), icon: Users, tone: "bg-blue-50 text-blue-600", note: "All client records", action: () => { setStatusFilter(""); setPage(1); } },
          { label: "Active Clients", value: statusCounts.Active.toLocaleString("en-IN"), icon: UserCheck, tone: "bg-emerald-50 text-emerald-600", note: "Currently active", action: () => { setStatusFilter("Active"); setPage(1); } },
          { label: "Total Revenue", value: financialLoading ? "—" : formatFinancialValue(portfolioRevenue, "currency"), icon: BadgeIndianRupee, tone: "bg-green-50 text-green-700", note: "Total invoiced value" },
          { label: "Outstanding", value: financialLoading ? "—" : formatFinancialValue(totalOutstanding, "currency"), icon: AlertCircle, tone: "bg-rose-50 text-rose-600", note: "Pending collection" },
          { label: "Follow-ups Due", value: "—", icon: CalendarDays, tone: "bg-violet-50 text-violet-600", note: "Awaiting activity API" },
          { label: "Conversion Rate", value: `${conversionRate}%`, icon: TrendingUp, tone: "bg-indigo-50 text-indigo-600", note: "Active / total clients" },
        ].map(({ label, value, icon: Icon, tone, note, action }) => (
          <button key={label} type="button" onClick={action} disabled={!action} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:border-blue-200 enabled:hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
              <div className="min-w-0"><p className="text-[10px] font-bold text-slate-500">{label}</p><p className="mt-0.5 truncate text-lg font-black text-slate-950">{countsLoading && label.includes("Clients") ? "—" : value}</p></div>
            </div>
            <p className="mt-2 text-[10px] font-semibold text-emerald-600">↗ {note}</p>
          </button>
        ))}
      </div>

      <section className="hidden grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Healthy Accounts", value: healthyClients, icon: ShieldCheck, text: "Rule score 80–100 on this page", tone: "emerald", action: () => setHealthFilter("healthy") },
          { label: "Needs Attention", value: atRiskClients, icon: AlertCircle, text: "Rule score below 60 on this page", tone: "red", action: () => setHealthFilter("attention") },
          { label: "Profile Gaps", value: incompleteProfiles, icon: Clock3, text: "Missing email or phone details", tone: "amber", action: () => setProfileFilter("incomplete") },
          { label: "Upsell Ready", value: null, icon: TrendingUp, text: "Revenue and engagement data required", tone: "sky", action: undefined },
          { label: "Follow-ups Due", value: null, icon: CalendarDays, text: "Follow-up summary API required", tone: "amber", action: undefined },
        ].map((insight) => {
          const Icon = insight.icon;
          const toneClass: Record<string, string> = {
            emerald: "bg-emerald-50 text-emerald-700",
            red: "bg-red-50 text-red-700",
            amber: "bg-amber-50 text-amber-700",
            sky: "bg-sky-50 text-[#0070B8]",
          };

          return (
            <button type="button" onClick={insight.action} disabled={!insight.action} key={insight.label} className="group rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-sm transition enabled:hover:border-sky-200 disabled:cursor-default">
              <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClass[insight.tone]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-black tracking-tight ${insight.value === null ? "text-slate-400" : "text-slate-950"}`}>{insight.value === null ? "—" : insight.value}</p>
                  </div>
                  <p className="text-[11px] font-black text-slate-800">{insight.label}</p>
                  <p className="hidden">{insight.text}</p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <details className="hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2 text-xs font-bold text-slate-600">
          Financial summary
          <span className="text-[10px] font-medium text-slate-400">Reporting API required · click to expand</span>
        </summary>
        <div className="border-t border-slate-100 p-3">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-950">Financial Summary</h2>
            <p className="text-sm text-slate-500">Selected-period client revenue and collection performance.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">Awaiting /api/reports/client-summary</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {financialMetrics.map((metric) => <FinancialMetricCard key={metric.label} metric={metric} />)}
        </div>
        </div>
      </details>

      {/* ── Filters ── */}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-950">Find Your Clients</h2>
            <p className="text-xs text-slate-500">Quick filters to find and manage clients.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black text-[#0070B8]">{activeFilterCount} active</span>
            <p className="text-xs font-semibold text-slate-400">{pagination.total.toLocaleString("en-IN")} records</p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Company, contact, phone or email"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
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
            onChange={(e) => { setIndustryFilter(e.target.value); setPage(1); }}
            className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
          >
            <option value="">All Industries</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select value={accountManagerFilter} onChange={(event) => { setAccountManagerFilter(event.target.value); setPage(1); }} className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-600 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100">
            <option value="">All Account Managers</option>
            {accountManagers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <select value={healthFilter} onChange={(event) => setHealthFilter(event.target.value)} className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-600 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100">
            <option value="">All Health Scores</option>
            <option value="healthy">Healthy (80–100)</option>
            <option value="stable">Stable (60–79)</option>
            <option value="attention">Needs Attention (40–59)</option>
            <option value="risk">At Risk (0–39)</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <select value={profileFilter} onChange={(event) => setProfileFilter(event.target.value)} className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-600 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100">
            <option value="">All Profile Completeness</option>
            <option value="incomplete">Incomplete Profiles</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        <button
          onClick={fetchClients}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-[#0070B8]"
        >
          <Filter className="h-3.5 w-3.5" /> Apply Filters
        </button>
        <button onClick={clearFilters} disabled={activeFilterCount === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
          <X className="h-3.5 w-3.5" /> Clear All
        </button>
      </div>
        {activeFilterCount > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            {[
              search && `Search: ${search}`,
              statusFilter && `Status: ${statusFilter}`,
              industryFilter && `Industry: ${industryFilter}`,
              accountManagerFilter && `Owner: ${accountManagers.find((user) => user.id === accountManagerFilter)?.name ?? "Selected"}`,
              healthFilter && `Health: ${healthFilter}`,
              profileFilter && "Profile: Incomplete",
              (fromDate || toDate) && `Created: ${fromDate || "…"} to ${toDate || "…"}`,
            ].filter(Boolean).map((chip) => <span key={String(chip)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{chip}</span>)}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">Client Directory</h2>
            <p className="text-xs text-slate-500">Showing {displayedClients.length} of {pagination.total.toLocaleString("en-IN")} clients · Click a row for details</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-[10px] font-black text-[#0070B8]"><ShieldCheck className="h-3.5 w-3.5" /> Live health score</span>
            <button type="button" onClick={fetchClients} title="Refresh directory" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-sky-200 hover:text-[#0070B8]"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /></button>
          </div>
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
          <div className="max-h-[calc(100vh-410px)] min-h-[280px] overflow-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 shadow-sm">
                <tr className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-5 py-3 text-left font-black whitespace-nowrap">Client</th>
                  <th className="px-5 py-3 text-left font-black whitespace-nowrap">Contact</th>
                  <th className="px-5 py-3 text-left font-black whitespace-nowrap">Industry</th>
                  <th className="px-5 py-3 text-left font-black whitespace-nowrap">Health</th>
                  <th className="px-5 py-3 text-right font-black whitespace-nowrap">Revenue</th>
                  <th className="px-5 py-3 text-right font-black whitespace-nowrap">Outstanding</th>
                  <th className="px-5 py-3 text-center font-black whitespace-nowrap">Status</th>
                  <th className="px-5 py-3 text-center font-black whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : displayedClients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
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
                  displayedClients.map((client) => (
                    <tr
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className="group transition-colors hover:bg-sky-50/45"
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0070B8] to-[#0EA5E9] text-xs font-black text-white shadow-lg shadow-sky-100 transition duration-300 group-hover:scale-105 group-hover:rotate-3">
                            {client.companyName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CL"}
                          </div>
                          <div>
                          <Link
                            href={`/crm/clients/${client.id}`}
                            className="font-black text-slate-950 transition-colors hover:text-[#0070B8]"
                          >
                            {client.companyName || "—"}
                          </Link>
                          <p className="mt-0.5 font-mono text-[10px] font-bold text-slate-400">{client.clientCode || client.clientType || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="font-bold text-slate-700">{client.contactPersonName || "—"}</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-slate-400"><Phone className="h-3 w-3" />{client.mobile || client.whatsapp || "No phone"}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{client.industry || "—"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <HealthBadge client={client} />
                      </td>
                      <td className="px-5 py-4 text-right font-black text-slate-800 whitespace-nowrap">
                        {formatFinancialValue(clientFinancials[client.id ?? ""]?.revenue ?? 0, "currency")}
                      </td>
                      <td className="px-5 py-4 text-right font-bold whitespace-nowrap">
                        <span className={(clientFinancials[client.id ?? ""]?.outstanding ?? 0) > 0 ? "text-rose-600" : "text-slate-500"}>
                          {financialLoading ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: ERP_CURRENCY, maximumFractionDigits: 0 }).format(clientFinancials[client.id ?? ""]?.outstanding ?? 0)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <StatusBadge status={client.status} />
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
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-500">
            {pagination.total === 0
              ? "No records"
              : `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, pagination.total)} of ${pagination.total.toLocaleString("en-IN")}`}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500" htmlFor="client-page-size">Rows</label>
            <select id="client-page-size" value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600">
              {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} title="Previous page" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-20 text-center text-xs font-bold text-slate-600">Page {page} of {pagination.pages}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))} disabled={page >= pagination.pages || loading} title="Next page" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      </div>
      <aside className="space-y-4 xl:sticky xl:top-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="text-sm font-black text-slate-900">Revenue Overview</h2><span className="rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-bold text-slate-500">This Month</span></div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Total invoiced</p><p className="mt-1 text-xl font-black text-slate-950">{financialLoading ? "—" : formatFinancialValue(portfolioRevenue, "currency")}</p>
          <div className="mt-5 flex items-center gap-4"><div className="relative h-24 w-24 shrink-0 rounded-full" style={{ background: `conic-gradient(#16a34a 0 ${collectionPercent}%, #f43f5e ${collectionPercent}% 100%)` }}><div className="absolute inset-4 flex items-center justify-center rounded-full bg-white text-center"><div><p className="text-[8px] text-slate-400">Outstanding</p><p className="text-[9px] font-black text-slate-800">{formatFinancialValue(totalOutstanding, "currency")}</p></div></div></div><div className="space-y-2 text-[10px] font-semibold text-slate-600"><p><span className="mr-2 inline-block h-2 w-2 rounded-sm bg-green-600" />Paid {formatFinancialValue(invoiceTotals.paid, "currency")}</p><p><span className="mr-2 inline-block h-2 w-2 rounded-sm bg-rose-500" />Due {formatFinancialValue(totalOutstanding, "currency")}</p><p><span className="mr-2 inline-block h-2 w-2 rounded-sm bg-amber-500" />Collected {collectionPercent}%</p></div></div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="text-sm font-black text-slate-900">Activity Overview</h2><span className="text-[9px] font-bold text-slate-400">This Week</span></div>
          <div className="mt-4 space-y-3">{[{ label: "Active clients", value: statusCounts.Active, icon: UserCheck, tone: "text-emerald-600 bg-emerald-50" }, { label: "Healthy accounts", value: healthyClients, icon: ShieldCheck, tone: "text-blue-600 bg-blue-50" }, { label: "Needs attention", value: atRiskClients, icon: AlertCircle, tone: "text-amber-600 bg-amber-50" }, { label: "Profile gaps", value: incompleteProfiles, icon: Clock3, tone: "text-violet-600 bg-violet-50" }].map((item) => <div key={item.label} className="flex items-center gap-3"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.tone}`}><item.icon className="h-4 w-4" /></span><span className="flex-1 text-xs font-semibold text-slate-600">{item.label}</span><strong className="text-xs text-slate-900">{item.value}</strong></div>)}</div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-sm font-black text-slate-900">Upcoming Follow-ups</h2><Link href="/crm/follow-ups" className="text-[10px] font-bold text-blue-600">View All</Link></div><div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center"><CalendarDays className="mx-auto h-5 w-5 text-slate-400" /><p className="mt-2 text-xs font-bold text-slate-600">Follow-up schedule</p><p className="mt-1 text-[10px] text-slate-400">Open follow-ups to view upcoming client activities.</p></div></section>
      </aside>
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
