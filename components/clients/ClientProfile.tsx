"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Edit, FileText, Receipt, Building2, Mail, Phone, Globe,
  Tag, Users, Upload, Activity, Briefcase,
  CreditCard, FolderOpen, Download, Eye,
  Trash2, Plus, Clock, AlertCircle, CheckCircle,
  XCircle, MinusCircle, Ban,
  Copy, IndianRupee, Layers3,
} from "lucide-react";
import {
  clientsApi,
  type InvoiceRecord,
  type ReceiptRecord,
  type ProjectRecord,
  type ActivityItem,
} from "@/lib/api/clients";
import { quotationsApi, type QuotationListItem, type QuotationStatus } from "@/lib/api/quotations";
import { agreementsApi, type AgreementListItem, type AgreementStatus } from "@/lib/api/agreements";
import type { Client, ClientDocument, ContactPerson } from "@/types/client";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  clientId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  Lead:        "bg-blue-100 text-blue-700",
  Active:      "bg-green-100 text-green-700",
  Inactive:    "bg-slate-100 text-slate-600",
  Completed:   "bg-purple-100 text-purple-700",
  Blacklisted: "bg-red-100 text-red-700",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  Lead:        <Clock className="w-3.5 h-3.5" />,
  Active:      <CheckCircle className="w-3.5 h-3.5" />,
  Inactive:    <MinusCircle className="w-3.5 h-3.5" />,
  Completed:   <CheckCircle className="w-3.5 h-3.5" />,
  Blacklisted: <Ban className="w-3.5 h-3.5" />,
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[status] ?? "bg-slate-100 text-slate-600"}`}>
      {STATUS_ICON[status]}
      {status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500 w-36 shrink-0">{label}</span>
      <span className="text-xs text-slate-800 font-medium break-all">{value}</span>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <span className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
      <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
      <p className="text-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d?: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function moneyValue(value?: string | number) {
  const n = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function summarizeServices(client: Client) {
  return (client.developmentServices?.length ?? 0) + (client.digitalMarketingServices?.length ?? 0);
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone = "slate",
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "slate" | "blue" | "green" | "red";
  hint?: string;
}) {
  const toneCls = {
    slate: "bg-slate-50 text-slate-700 ring-slate-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    red: "bg-red-50 text-red-700 ring-red-100",
  }[tone];

  return (
    <div className={`rounded-lg p-3 ring-1 ${toneCls}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-75">{label}</span>
      </div>
      <p className="mt-2 text-lg font-bold leading-tight">{value}</p>
      {hint && <p className="mt-1 text-[11px] opacity-70 truncate">{hint}</p>}
    </div>
  );
}

function SmallActionLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
    >
      {children}
    </Link>
  );
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type TabId =
  | "overview"
  | "contacts"
  | "documents"
  | "quotations"
  | "agreements"
  | "invoices"
  | "receipts"
  | "projects"
  | "activity";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview",   label: "Overview",   icon: Building2 },
  { id: "contacts",   label: "Contacts",   icon: Users },
  { id: "documents",  label: "Documents",  icon: Upload },
  { id: "quotations", label: "Quotations", icon: FileText },
  { id: "agreements", label: "Agreements", icon: Briefcase },
  { id: "invoices",   label: "Invoices",   icon: Receipt },
  { id: "receipts",   label: "Receipts",   icon: CreditCard },
  { id: "projects",   label: "Projects",   icon: FolderOpen },
  { id: "activity",   label: "Activity",   icon: Activity },
];

// ─── Quotations Tab ───────────────────────────────────────────────────────────

const QUOT_STATUS_COLORS: Record<QuotationStatus, string> = {
  DRAFT:    "bg-slate-100 text-slate-600",
  SENT:     "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED:  "bg-amber-100 text-amber-700",
};

function QuotStatusBadge({ status }: { status: QuotationStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${QUOT_STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}

function ClientQuotationsTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    quotationsApi.listByClient(clientId, { limit: 50 })
      .then(res => setQuotations(res.data))
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <EmptyState message={error} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{quotations.length} quotation{quotations.length !== 1 ? "s" : ""} found</p>
        <Link
          href={`/quotation/new?clientId=${clientId}&clientName=${encodeURIComponent(clientName)}`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New Quotation
        </Link>
      </div>

      {quotations.length === 0 ? (
        <EmptyState
          message="No quotations linked to this client yet"
          action={
            <SmallActionLink href={`/quotation/new?clientId=${clientId}&clientName=${encodeURIComponent(clientName)}`}>
              <Plus className="w-3.5 h-3.5" /> New Quotation
            </SmallActionLink>
          }
        />
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[11px] text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Quotation #</th>
                <th className="px-4 py-3 text-left font-semibold">Subject</th>
                <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotations.map(q => (
                <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600 whitespace-nowrap">
                    {q.quotationNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{q.subject}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap hidden sm:table-cell">
                    {q.date ? new Date(q.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                    {Number(q.totalAmount) > 0
                      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(q.totalAmount))
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <QuotStatusBadge status={q.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/quotation/${q.id}/edit`}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href={`/quotation?highlight=${q.id}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                        title="View in Quotations"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Agreements Tab ───────────────────────────────────────────────────────────

const AGR_STATUS_COLORS: Record<AgreementStatus, string> = {
  DRAFT:      "bg-slate-100 text-slate-600",
  SENT:       "bg-blue-100 text-blue-700",
  SIGNED:     "bg-violet-100 text-violet-700",
  ACTIVE:     "bg-green-100 text-green-700",
  EXPIRED:    "bg-amber-100 text-amber-700",
  TERMINATED: "bg-red-100 text-red-700",
};

function AgrStatusBadge({ status }: { status: AgreementStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${AGR_STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}

function ClientAgreementsTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [agreements, setAgreements] = useState<AgreementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    agreementsApi.listByClient(clientId, { limit: 50 })
      .then(res => setAgreements(res.data))
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <EmptyState message={error} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{agreements.length} agreement{agreements.length !== 1 ? "s" : ""} found</p>
        <Link
          href={`/contract/new?clientId=${clientId}&clientName=${encodeURIComponent(clientName)}`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New Agreement
        </Link>
      </div>

      {agreements.length === 0 ? (
        <EmptyState
          message="No agreements linked to this client yet"
          action={
            <SmallActionLink href={`/contract/new?clientId=${clientId}&clientName=${encodeURIComponent(clientName)}`}>
              <Plus className="w-3.5 h-3.5" /> New Agreement
            </SmallActionLink>
          }
        />
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[11px] text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Agreement #</th>
                <th className="px-4 py-3 text-left font-semibold">Subject</th>
                <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Start</th>
                <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">End</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agreements.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600 whitespace-nowrap">
                    {a.agreementNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{a.subject}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap hidden sm:table-cell">
                    {a.startDate ? new Date(a.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap hidden sm:table-cell">
                    {a.endDate ? new Date(a.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                    {Number(a.totalAmount) > 0
                      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(a.totalAmount))
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <AgrStatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/contract/${a.id}/edit`}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href="/contract"
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                        title="View in Agreements"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── ClientProfile ────────────────────────────────────────────────────────────

export default function ClientProfile({ clientId }: Props) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Lazy tab data
  const [contacts,   setContacts]   = useState<ContactPerson[] | null>(null);
  const [documents,  setDocuments]  = useState<ClientDocument[] | null>(null);
  const [invoices,   setInvoices]   = useState<InvoiceRecord[] | null>(null);
  const [receipts,   setReceipts]   = useState<ReceiptRecord[] | null>(null);
  const [projects,   setProjects]   = useState<ProjectRecord[] | null>(null);
  const [activity,   setActivity]   = useState<ActivityItem[] | null>(null);
  const [tabLoading, setTabLoading] = useState(false);

  // Load client
  useEffect(() => {
    setLoading(true);
    clientsApi
      .get(clientId)
      .then((data) => {
        setClient(data);
        setContacts(Array.isArray(data.contacts) ? data.contacts : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  // Lazy tab loader
  const loadTab = useCallback(
    async (tab: TabId) => {
      setActiveTab(tab);
      if (tab === "overview") return;

      const alreadyLoaded: Record<TabId, boolean> = {
        overview:   true,
        contacts:   contacts   !== null,
        documents:  documents  !== null,
        quotations: true, // ClientQuotationsTab manages its own fetch
        invoices:   invoices   !== null,
        receipts:   receipts   !== null,
        agreements: true, // ClientAgreementsTab manages its own fetch
        projects:   projects   !== null,
        activity:   activity   !== null,
      };
      if (alreadyLoaded[tab]) return;

      setTabLoading(true);
      try {
        switch (tab) {
          case "contacts":
            setContacts(Array.isArray(client?.contacts) ? client.contacts : []);
            break;
          case "documents":
            setDocuments(await clientsApi.getDocuments(clientId));
            break;
          case "invoices":
            setInvoices(await clientsApi.getInvoices(clientId));
            break;
          case "receipts":
            setReceipts(await clientsApi.getReceipts(clientId));
            break;
          case "projects":
            setProjects(await clientsApi.getProjects(clientId));
            break;
          case "activity":
            setActivity(await clientsApi.getActivity(clientId));
            break;
        }
      } catch {
        // silently ignore; show empty state in tab
      } finally {
        setTabLoading(false);
      }
    },
    [clientId, client, contacts, documents, invoices, receipts, projects, activity]
  );

  // Document upload handler
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("documentType", "Other");
    try {
      const doc = await clientsApi.uploadDocument(clientId, fd);
      setDocuments((prev) => [...(prev ?? []), doc]);
    } catch {
      const stub: ClientDocument = {
        id: crypto.randomUUID(),
        name: file.name,
        documentType: "Other",
        fileType: file.type,
        fileSize: file.size,
        s3Url: URL.createObjectURL(file),
        uploadedBy: "Current User",
        uploadedAt: new Date().toISOString(),
      };
      setDocuments((prev) => [...(prev ?? []), stub]);
    }
    e.target.value = "";
  };

  const handleDocDelete = async (docId: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      await clientsApi.deleteDocument(clientId, docId);
    } catch {
      // proceed with local removal anyway
    }
    setDocuments((prev) => (prev ?? []).filter((d) => d.id !== docId));
  };

  const copyText = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access can be blocked in non-secure contexts; the action is best-effort.
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error)
    return (
      <div className="flex flex-col items-center justify-center py-16 text-red-500 gap-2">
        <XCircle className="w-8 h-8" />
        <p className="text-sm font-medium">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); clientsApi.get(clientId).then(setClient).catch((e) => setError(e.message)).finally(() => setLoading(false)); }}
          className="text-xs text-indigo-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  if (!client) return null;

  const initials = client.companyName?.slice(0, 2).toUpperCase() ?? "??";
  const outstanding = moneyValue(client.outstandingBalance);
  const serviceCount = summarizeServices(client);
  const profileDocs = documents ?? client.documents ?? [];

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{client.companyName}</h1>
              {client.clientCode && (
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  {client.clientCode}
                </span>
              )}
              <StatusBadge status={client.status} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {[client.contactPersonName, client.designation, client.industry].filter(Boolean).join(" · ")}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {client.primaryEmail && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-100">
                  <Mail className="w-3 h-3" />
                  <a href={`mailto:${client.primaryEmail}`} className="hover:text-indigo-600">{client.primaryEmail}</a>
                  <button type="button" onClick={() => copyText(client.primaryEmail)} title="Copy email" className="text-slate-400 hover:text-indigo-600">
                    <Copy className="w-3 h-3" />
                  </button>
                </span>
              )}
              {client.mobile && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-100">
                  <Phone className="w-3 h-3" />
                  <a href={`tel:${client.mobile}`} className="hover:text-indigo-600">{client.mobile}</a>
                  <button type="button" onClick={() => copyText(client.mobile)} title="Copy mobile" className="text-slate-400 hover:text-indigo-600">
                    <Copy className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:justify-end">
            <Link
              href={`/crm/clients/${clientId}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" /> Edit
            </Link>
            <Link
              href={`/quotation?clientId=${clientId}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Quotation
            </Link>
            <Link
              href={`/invoice?clientId=${clientId}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <Receipt className="w-3.5 h-3.5" /> Invoice
            </Link>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryTile
            icon={IndianRupee}
            label="Outstanding"
            value={formatCurrency(outstanding)}
            tone={outstanding > 0 ? "red" : "green"}
            hint={client.paymentTerms || "Payment terms pending"}
          />
          <SummaryTile
            icon={Users}
            label="Contacts"
            value={String((contacts ?? client.contacts ?? []).length)}
            tone="blue"
            hint={client.contactPersonName || "Primary contact pending"}
          />
          <SummaryTile
            icon={Upload}
            label="Documents"
            value={String(profileDocs.length)}
            hint={profileDocs.length ? "Uploaded files" : "No files yet"}
          />
          <SummaryTile
            icon={Layers3}
            label="Services"
            value={String(serviceCount)}
            tone={serviceCount > 0 ? "blue" : "slate"}
            hint={serviceCount > 0 ? "Taken services" : "No services marked"}
          />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Tab bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 border-b border-slate-200 bg-slate-50">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => loadTab(t.id)}
                className={`flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === t.id
                    ? "border-indigo-600 text-indigo-700 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-5 min-h-[300px]">
          {tabLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              {/* Tab 1 - Overview */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <InfoCard title="Client Info">
                    <InfoRow label="Client Code" value={client.clientCode} />
                    <InfoRow label="Client Type" value={client.clientType} />
                    <InfoRow label="Industry" value={client.industry} />
                    <InfoRow label="Business Type" value={client.businessType} />
                    <InfoRow label="Company Size" value={client.companySize} />
                    <InfoRow label="Year Established" value={client.yearEstablished} />
                    <InfoRow label="No. of Employees" value={client.numberOfEmployees} />
                    <InfoRow label="Annual Revenue" value={client.annualRevenue ? `₹ ${client.annualRevenue}` : undefined} />
                  </InfoCard>

                  <InfoCard title="Contact Info">
                    <InfoRow label="Contact Person" value={client.contactPersonName} />
                    <InfoRow label="Designation" value={client.designation} />
                    <InfoRow label="Primary Email" value={client.primaryEmail} />
                    <InfoRow label="Secondary Email" value={client.secondaryEmail} />
                    <InfoRow label="Mobile" value={client.mobile} />
                    <InfoRow label="Alternate Mobile" value={client.alternateMobile} />
                    <InfoRow label="Phone" value={client.phone} />
                    <InfoRow label="WhatsApp" value={client.whatsapp} />
                    <InfoRow
                      label="Website"
                      value={
                        client.website ? (
                          <a href={client.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1">
                            <Globe className="w-3 h-3" /> {client.website}
                          </a>
                        ) : undefined
                      }
                    />
                  </InfoCard>

                  <InfoCard title="Billing Address">
                    {client.billingAddress && (
                      <div className="text-xs text-slate-700 space-y-0.5">
                        {client.billingAddress.line1 && <p>{client.billingAddress.line1}</p>}
                        {client.billingAddress.line2 && <p>{client.billingAddress.line2}</p>}
                        <p>
                          {[client.billingAddress.city, client.billingAddress.state].filter(Boolean).join(", ")}
                          {client.billingAddress.pincode ? ` - ${client.billingAddress.pincode}` : ""}
                        </p>
                        <p className="font-medium">{client.billingAddress.country}</p>
                      </div>
                    )}
                  </InfoCard>

                  <InfoCard title="GST & Tax">
                    <InfoRow label="GST Registered" value={client.gstRegistered ? "Yes" : "No"} />
                    <InfoRow label="GST Number" value={client.gstNumber} />
                    <InfoRow label="PAN Number" value={client.panNumber} />
                    <InfoRow label="TAN Number" value={client.tanNumber} />
                    <InfoRow label="MSME Number" value={client.msmeNumber} />
                    <InfoRow label="CIN Number" value={client.cinNumber} />
                    <InfoRow label="Reg. Number" value={client.registrationNumber} />
                  </InfoCard>

                  <InfoCard title="Account & Financials">
                    <InfoRow label="Account Manager" value={client.accountManager} />
                    <InfoRow label="Lead Source" value={client.leadSource} />
                    <InfoRow label="Payment Terms" value={client.paymentTerms} />
                    <InfoRow label="Credit Limit" value={client.creditLimit ? `₹ ${client.creditLimit}` : undefined} />
                    <InfoRow label="Opening Balance" value={client.openingBalance ? `₹ ${client.openingBalance}` : undefined} />
                    <InfoRow
                      label="Outstanding"
                      value={
                        client.outstandingBalance ? (
                          <span className={Number(client.outstandingBalance) > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
                            ₹ {client.outstandingBalance}
                          </span>
                        ) : undefined
                      }
                    />
                  </InfoCard>

                  {client.tags && client.tags.length > 0 && (
                    <InfoCard title="Tags">
                      <div className="flex flex-wrap gap-1.5">
                        {client.tags.map((t) => (
                          <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                            <Tag className="w-2.5 h-2.5" /> {t}
                          </span>
                        ))}
                      </div>
                    </InfoCard>
                  )}

                  {((client.developmentServices?.length ?? 0) > 0 || (client.digitalMarketingServices?.length ?? 0) > 0) && (
                    <InfoCard title="Taken Services">
                      <div className="space-y-4">
                        {client.developmentServices && client.developmentServices.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              🖥️ Development Services
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {client.developmentServices.map((s) => (
                                <span key={s} className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-medium">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {client.digitalMarketingServices && client.digitalMarketingServices.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              📈 Digital Marketing Services
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {client.digitalMarketingServices.map((s) => (
                                <span key={s} className="px-2.5 py-1 bg-violet-50 border border-violet-200 text-violet-700 rounded-lg text-xs font-medium">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </InfoCard>
                  )}
                </div>
              )}

              {/* Tab 2 - Contacts */}
              {activeTab === "contacts" && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Link
                      href={`/crm/clients/${clientId}/edit#contacts`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Contact
                    </Link>
                  </div>
                  {!contacts || contacts.length === 0 ? (
                    <EmptyState
                      message="No contact persons found"
                      action={
                        <SmallActionLink href={`/crm/clients/${clientId}/edit#contacts`}>
                          <Plus className="w-3.5 h-3.5" /> Add Contact
                        </SmallActionLink>
                      }
                    />
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {contacts.map((c, i) => (
                        <div key={c.id ?? i} className="border border-slate-200 rounded-lg p-4 bg-white">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-semibold text-slate-900 break-words">
                                  {c.name || `Contact ${i + 1}`}
                                </h3>
                                {c.isPrimary && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold">
                                    <CheckCircle className="w-3 h-3" /> Primary
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {[c.designation, c.department].filter(Boolean).join(" · ") || "No role details"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="flex items-start gap-2 min-w-0">
                              <Mail className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-slate-400 font-medium">Email</p>
                                <p className="text-slate-700 break-all">{c.email || "-"}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-slate-400 font-medium">Mobile</p>
                                <p className="text-slate-700 break-all">{c.mobile || "-"}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-slate-400 font-medium">WhatsApp</p>
                                <p className="text-slate-700 break-all">{c.whatsapp || "-"}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 min-w-0">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-slate-400 font-medium">Department</p>
                                <p className="text-slate-700 break-all">{c.department || "-"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3 - Documents */}
              {activeTab === "documents" && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors cursor-pointer">
                      <Upload className="w-3.5 h-3.5" /> Upload Document
                      <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.docx" onChange={handleDocUpload} />
                    </label>
                  </div>
                  {tabLoading ? (
                    <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
                  ) : (!documents || documents.length === 0) ? (
                    <EmptyState
                      message="No documents uploaded"
                      action={
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors cursor-pointer">
                          <Upload className="w-3.5 h-3.5" /> Upload Document
                          <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.docx" onChange={handleDocUpload} />
                        </label>
                      }
                    />
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full min-w-[680px] text-sm">
                        <thead className="bg-slate-50">
                          <tr className="text-xs text-slate-500 uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">Document Name</th>
                            <th className="px-4 py-3 text-left hidden sm:table-cell">Type</th>
                            <th className="px-4 py-3 text-left hidden md:table-cell">Size</th>
                            <th className="px-4 py-3 text-left hidden md:table-cell">Date</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {documents.map((doc) => (
                            <tr key={doc.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-slate-800 truncate max-w-[180px]">{doc.name}</td>
                              <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{doc.documentType}</td>
                              <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{formatFileSize(doc.fileSize)}</td>
                              <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{formatDate(doc.uploadedAt)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <a
                                    href={doc.s3Url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-slate-500 hover:text-indigo-600 transition-colors"
                                    title="Preview"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </a>
                                  <a
                                    href={doc.s3Url}
                                    download={doc.name}
                                    className="p-1 text-slate-500 hover:text-indigo-600 transition-colors"
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                  <button
                                    onClick={() => handleDocDelete(doc.id)}
                                    className="p-1 text-slate-500 hover:text-red-600 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4 - Quotations */}
              {activeTab === "quotations" && (
                <ClientQuotationsTab
                  clientId={clientId}
                  clientName={client.companyName || client.contactPersonName || ""}
                />
              )}

              {/* Tab 5 - Agreements */}
              {activeTab === "agreements" && (
                <ClientAgreementsTab
                  clientId={clientId}
                  clientName={client.companyName || client.contactPersonName || ""}
                />
              )}

              {/* Tab 6 - Invoices */}
              {activeTab === "invoices" && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Link
                      href={`/invoice?clientId=${clientId}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Invoice
                    </Link>
                  </div>
                  {!invoices || invoices.length === 0 ? (
                    <EmptyState
                      message="No invoices found"
                      action={
                        <SmallActionLink href={`/invoice?clientId=${clientId}`}>
                          <Plus className="w-3.5 h-3.5" /> New Invoice
                        </SmallActionLink>
                      }
                    />
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full min-w-[760px] text-sm">
                        <thead className="bg-slate-50">
                          <tr className="text-xs text-slate-500 uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">Invoice No.</th>
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-right">Paid</th>
                            <th className="px-4 py-3 text-right">Due</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-indigo-600">{inv.invoiceNumber}</td>
                              <td className="px-4 py-3 text-slate-600">{formatDate(inv.date)}</td>
                              <td className="px-4 py-3 text-right text-slate-800">{formatCurrency(inv.amount)}</td>
                              <td className="px-4 py-3 text-right text-green-600">{formatCurrency(inv.paid)}</td>
                              <td className="px-4 py-3 text-right text-red-600 font-medium">{formatCurrency(inv.due)}</td>
                              <td className="px-4 py-3 text-center"><StatusBadge status={inv.status} /></td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <Link href={`/invoice/${inv.id}`} className="p-1 text-slate-500 hover:text-indigo-600"><Eye className="w-4 h-4" /></Link>
                                  <button className="p-1 text-slate-500 hover:text-indigo-600"><Download className="w-4 h-4" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 7 - Receipts */}
              {activeTab === "receipts" && (
                <div className="space-y-3">
                  {!receipts || receipts.length === 0 ? (
                    <EmptyState message="No receipts found" />
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full min-w-[680px] text-sm">
                        <thead className="bg-slate-50">
                          <tr className="text-xs text-slate-500 uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">Receipt No.</th>
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-left">Payment Mode</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {receipts.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-indigo-600">{r.receiptNumber}</td>
                              <td className="px-4 py-3 text-slate-600">{formatDate(r.date)}</td>
                              <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(r.amount)}</td>
                              <td className="px-4 py-3 text-slate-600">{r.paymentMode}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <Link href={`/receipt/${r.id}`} className="p-1 text-slate-500 hover:text-indigo-600"><Eye className="w-4 h-4" /></Link>
                                  <button className="p-1 text-slate-500 hover:text-indigo-600"><Download className="w-4 h-4" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 8 - Projects */}
              {activeTab === "projects" && (
                <div className="space-y-3">
                  {!projects || projects.length === 0 ? (
                    <EmptyState message="No projects found" />
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full min-w-[700px] text-sm">
                        <thead className="bg-slate-50">
                          <tr className="text-xs text-slate-500 uppercase tracking-wider">
                            <th className="px-4 py-3 text-left">Project Name</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-left hidden sm:table-cell">Start Date</th>
                            <th className="px-4 py-3 text-left hidden sm:table-cell">End Date</th>
                            <th className="px-4 py-3 text-center">Completion</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {projects.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-slate-800">{p.projectName}</td>
                              <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                              <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{formatDate(p.startDate)}</td>
                              <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{formatDate(p.endDate)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                                    <div
                                      className="bg-indigo-600 h-1.5 rounded-full transition-all"
                                      style={{ width: `${p.completionPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-600 w-8 shrink-0">{p.completionPercent}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 9 - Activity */}
              {activeTab === "activity" && (
                <div>
                  {!activity || activity.length === 0 ? (
                    <EmptyState message="No activity found" />
                  ) : (
                    <div className="space-y-0">
                      {activity.map((item, i) => (
                        <div key={item.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold shrink-0 mt-1">
                              {item.user.charAt(0).toUpperCase()}
                            </div>
                            {i < activity.length - 1 && (
                              <div className="w-px bg-slate-200 flex-1 my-1" />
                            )}
                          </div>
                          <div className="pb-5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-800">{item.user}</span>
                              <span className="text-xs text-slate-500">{item.action}</span>
                              <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(item.createdAt)}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
