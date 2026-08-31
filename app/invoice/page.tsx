"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  Download,
  Edit3,
  Eye,
  FileText,
  Mail,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";
import { invoicesApi } from "@/lib/api/invoices";
import { receiptsApi, type CreateReceiptPayload } from "@/lib/api/receipts";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
import { usePermissions } from "@/lib/rbac/usePermissions";
import {
  STATUS_OPTIONS,
  STATUS_STYLE,
  money,
  date,
  statusLabel,
  downloadInvoice,
  EditInvoiceModal,
  AddReceiptModal,
  InvoiceModal,
  SendInvoiceEmailModal,
} from "@/components/invoices/InvoiceShared";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [receipting, setReceipting] = useState<Invoice | null>(null);
  const [emailingInvoice, setEmailingInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState("");
  const { can, loading: permissionsLoading } = usePermissions();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await invoicesApi.list({ status, search: debouncedSearch || undefined, page, limit: 20 });
      setInvoices(result.invoices ?? []);
      setPagination({ total: result.pagination.total, pages: Math.max(1, result.pagination.pages) });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load invoices");
    } finally {
      setLoading(false);
    }
  }, [page, status, debouncedSearch]);

  useEffect(() => { void load(); }, [load]);

  // Debounce the search box so we don't hit the API on every keystroke, and
  // search the full invoice list on the backend rather than just this page.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, status]);

  const totals = useMemo(() => ({
    amount: invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
    paid: invoices.reduce((sum, invoice) => sum + Number(invoice.paid || 0), 0),
    due: invoices.reduce((sum, invoice) => sum + Number(invoice.due || 0), 0),
    paidCount: invoices.filter((invoice) => invoice.status === "PAID").length,
    partiallyPaidCount: invoices.filter((invoice) => invoice.status === "PARTIALLY_PAID").length,
    overdueCount: invoices.filter((invoice) => invoice.status === "OVERDUE").length,
  }), [invoices]);

  const selectCounter = (nextStatus: InvoiceStatus | "") => {
    setStatus(nextStatus);
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const openInvoice = useCallback(async (invoice: Invoice) => {
    setSelected(invoice);
    setDetailLoading(true);
    try {
      setSelected(await invoicesApi.get(invoice.id));
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "Unable to load invoice details");
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const linkedInvoiceId = new URLSearchParams(window.location.search).get("invoiceId");
    if (!linkedInvoiceId) return;
    void openInvoice({ id: linkedInvoiceId } as Invoice);
  }, [openInvoice]);

  const download = async (invoice: Invoice) => {
    try {
      await downloadInvoice(await invoicesApi.get(invoice.id));
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download invoice");
    }
  };

  const openEmailModal = async (invoice: Invoice) => {
    try {
      setEmailingInvoice(await invoicesApi.get(invoice.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load invoice");
    }
  };

  const updateStatus = async (invoice: Invoice, nextStatus: InvoiceStatus) => {
    setStatusUpdatingId(invoice.id);
    setError("");
    try {
      await invoicesApi.update(invoice.id, { status: nextStatus });
      setInvoices((current) => current.map((item) => item.id === invoice.id ? { ...item, status: nextStatus } : item));
      if (selected?.id === invoice.id) setSelected((current) => current ? { ...current, status: nextStatus } : current);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update invoice status");
    } finally {
      setStatusUpdatingId("");
    }
  };

  const saveEdit = async (
    data: { date: string; dueDate: string | null; amount: number; paid: number; status: InvoiceStatus; notes?: string },
  ) => {
    if (!editing) return;
    if (data.amount <= 0) {
      setError("Invoice amount must be greater than zero");
      return;
    }
    if (data.paid < 0 || data.paid > data.amount) {
      setError("Amount paid must be between zero and the invoice amount");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await invoicesApi.update(editing.id, data);
      setEditing(null);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update invoice");
    } finally {
      setSaving(false);
    }
  };

  const saveReceipt = async (payload: CreateReceiptPayload) => {
    if (!receipting) return;
    if (payload.amount > Number(receipting.due)) {
      setError(`Receipt amount cannot exceed the current balance of ${money(receipting.due)}`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await receiptsApi.create(payload);
      setReceipting(null);
      await load();
      if (selected?.id === receipting.id) setSelected(await invoicesApi.get(receipting.id));
    } catch (receiptError) {
      setError(receiptError instanceof Error ? receiptError.message : "Unable to create receipt");
    } finally {
      setSaving(false);
    }
  };

  if (!permissionsLoading && !can("invoices", "view")) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-24 text-center shadow-sm">
        <AlertCircle className="h-8 w-8 text-slate-300" />
        <p className="font-bold text-slate-700">Access restricted</p>
        <p className="max-w-sm text-xs text-slate-400">Your role doesn&apos;t have permission to view invoices. Contact an administrator if you need access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Finance / Invoices</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Invoice Management</h1>
          <p className="mt-1 text-xs text-slate-500">Review balances, payment status, receipts, and invoice documents.</p>
        </div>
        {can("invoices", "create") && (
          <Link href="/invoice/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-md shadow-blue-200 hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Create Invoice
          </Link>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[
          { label: "Matching Invoices", value: pagination.total.toLocaleString("en-IN"), icon: FileText, tone: "bg-blue-50 text-blue-700", filter: "" as const },
          { label: "Invoice Amount (This Page)", value: money(totals.amount), icon: WalletCards, tone: "bg-violet-50 text-violet-700" },
          { label: "Amount Received (This Page)", value: money(totals.paid), icon: WalletCards, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Outstanding Balance (This Page)", value: money(totals.due), icon: AlertCircle, tone: "bg-red-50 text-red-700" },
          { label: "Paid Invoices (This Page)", value: totals.paidCount.toLocaleString("en-IN"), icon: CircleCheckBig, tone: "bg-emerald-50 text-emerald-700", filter: "PAID" as const },
          { label: "Partially Paid (This Page)", value: totals.partiallyPaidCount.toLocaleString("en-IN"), icon: Clock3, tone: "bg-amber-50 text-amber-700", filter: "PARTIALLY_PAID" as const },
          { label: "Overdue Invoices (This Page)", value: totals.overdueCount.toLocaleString("en-IN"), icon: AlertCircle, tone: "bg-rose-50 text-rose-700", filter: "OVERDUE" as const },
        ].map(({ label, value, icon: CardIcon, tone, ...card }) => {
          const filter = "filter" in card ? card.filter : undefined;
          const active = filter !== undefined && status === filter;
          const content = (
            <>
              <div><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-slate-950">{value}</p></div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><CardIcon className="h-5 w-5" /></span>
            </>
          );

          if (filter !== undefined) {
            return (
              <button
                type="button"
                key={label}
                onClick={() => selectCounter(filter)}
                aria-pressed={active}
                className={`flex items-center justify-between rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md ${active ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"}`}
              >
                {content}
              </button>
            );
          }

          return (
            <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {content}
            </div>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-base font-black text-slate-950">All Invoices</h2><p className="text-xs text-slate-500">{pagination.total.toLocaleString("en-IN")} invoice records</p></div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice number, client name or code" className="h-9 w-64 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
            </div>
            <select value={status} onChange={(event) => { setStatus(event.target.value as InvoiceStatus | ""); setPage(1); }} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600">
              <option value="">All status</option>
              {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}
            </select>
            <button onClick={() => void load()} aria-label="Refresh invoices" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
          </div>
        </div>
        {error ? <div className="m-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-[0.12em] text-slate-500">
              <tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Invoice date</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-center">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>{Array.from({ length: 9 }).map((__, cell) => <td className="px-4 py-4" key={cell}><div className="h-4 animate-pulse rounded bg-slate-100" /></td>)}</tr>
              )) : invoices.length ? invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-blue-50/40">
                  <td className="px-4 py-3 font-black text-blue-700">{invoice.invoiceNumber || "—"}</td>
                  <td className="px-4 py-3"><p className="font-bold text-slate-800">{invoice.client?.companyName || "—"}</p><p className="text-[10px] text-slate-400">{invoice.client?.clientCode || "No client code"}</p></td>
                  <td className="px-4 py-3 text-slate-600"><span className="inline-flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{date(invoice.date)}</span></td>
                  <td className="px-4 py-3 text-slate-600">{date(invoice.dueDate)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{money(invoice.amount)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{money(invoice.paid)}</td>
                  <td className="px-4 py-3 text-right font-black text-red-700">{money(invoice.due)}</td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={invoice.status}
                      disabled={statusUpdatingId === invoice.id}
                      onChange={(event) => void updateStatus(invoice, event.target.value as InvoiceStatus)}
                      className={`rounded-full border-0 px-2.5 py-1 text-[10px] font-black outline-none disabled:opacity-60 ${STATUS_STYLE[invoice.status]}`}
                      aria-label={`Change status for ${invoice.invoiceNumber}`}
                    >
                      {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3"><div className="flex justify-center gap-1">
                    <button onClick={() => void openInvoice(invoice)} title="View invoice" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Eye className="h-4 w-4" /></button>
                    {can("invoices", "edit") && (
                      <button onClick={() => setEditing(invoice)} title="Edit invoice" className="rounded-lg p-2 text-violet-600 hover:bg-violet-50"><Edit3 className="h-4 w-4" /></button>
                    )}
                    {can("receipts", "create") && (
                      <button onClick={() => setReceipting(invoice)} disabled={Number(invoice.due) <= 0} title={Number(invoice.due) <= 0 ? "Invoice is fully paid" : "Add receipt"} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-30"><Receipt className="h-4 w-4" /></button>
                    )}
                    {can("invoices", "download") && (
                      <button onClick={() => void download(invoice)} title="Download invoice" className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"><Download className="h-4 w-4" /></button>
                    )}
                    <button onClick={() => void openEmailModal(invoice)} title="Send invoice by email" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Mail className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              )) : <tr><td colSpan={9} className="py-16 text-center"><FileText className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-bold text-slate-700">No invoices found</p><p className="mt-1 text-xs text-slate-400">{debouncedSearch ? `No invoices match "${debouncedSearch}".` : "Create an invoice or change the selected filter."}</p></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500">Page {page} of {pagination.pages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button disabled={page >= pagination.pages || loading} onClick={() => setPage((value) => Math.min(pagination.pages, value + 1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>
      {selected || detailLoading ? <InvoiceModal invoice={selected} loading={detailLoading} onClose={() => setSelected(null)} /> : null}
      {editing ? <EditInvoiceModal invoice={editing} saving={saving} onClose={() => setEditing(null)} onSave={saveEdit} /> : null}
      {receipting ? <AddReceiptModal invoice={receipting} saving={saving} onClose={() => setReceipting(null)} onSave={saveReceipt} /> : null}
      {emailingInvoice ? <SendInvoiceEmailModal invoice={emailingInvoice} onClose={() => setEmailingInvoice(null)} /> : null}
    </div>
  );
}
