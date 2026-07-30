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
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  WalletCards,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { invoicesApi } from "@/lib/api/invoices";
import { clientsApi } from "@/lib/api/clients";
import { receiptsApi, type CreateReceiptPayload, type PaymentMode } from "@/lib/api/receipts";
import type { Invoice, InvoiceStatus } from "@/types/invoice";

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "INR";
const STATUS_OPTIONS: InvoiceStatus[] = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];
const STATUS_STYLE: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-50 text-blue-700",
  PARTIALLY_PAID: "bg-amber-50 text-amber-700",
  PAID: "bg-emerald-50 text-emerald-700",
  OVERDUE: "bg-red-50 text-red-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

const money = (value: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const date = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const statusLabel = (status: InvoiceStatus) => status.replaceAll("_", " ");

async function downloadInvoice(invoice: Invoice) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const image = new Image();
  image.src = "/letterhead.jpg";
  await new Promise<void>((resolve) => {
    image.onload = () => resolve();
    image.onerror = () => resolve();
  });
  const stamp = new Image();
  stamp.src = "/goanny_stamp.png";
  await new Promise<void>((resolve) => {
    stamp.onload = () => resolve();
    stamp.onerror = () => resolve();
  });

  const client = invoice.client?.id
    ? await clientsApi.get(invoice.client.id).catch(() => null)
    : null;
  const clientRecord = client as (typeof client & {
    billingLine1?: string;
    billingLine2?: string;
    billingCity?: string;
    billingState?: string;
    billingCountry?: string;
    billingPincode?: string;
  }) | null;
  const left = 18;
  const right = 192;
  const width = right - left;
  const top = 45;
  const pdfMoney = (value: string | number) =>
    `INR ${(Number(value) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const addLetterhead = () => {
    if (image.naturalWidth) doc.addImage(image, "JPEG", 0, 0, 210, 297, "invoice-letterhead", "FAST");
  };
  const addLetterheadOnNewPage = () => {
    if (doc.getCurrentPageInfo().pageNumber > 1) addLetterhead();
  };
  const clientAddress = [
    clientRecord?.billingLine1 ?? client?.billingAddress?.line1,
    clientRecord?.billingLine2 ?? client?.billingAddress?.line2,
    clientRecord?.billingCity ?? client?.billingAddress?.city,
    clientRecord?.billingState ?? client?.billingAddress?.state,
    clientRecord?.billingCountry ?? client?.billingAddress?.country,
    clientRecord?.billingPincode ?? client?.billingAddress?.pincode,
  ].filter(Boolean).join(", ");

  addLetterhead();
  let y = top;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("INVOICE", 105, y, { align: "center" });
  y += 9;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(left, y, width, 20, 2, 2, "FD");
  const meta = [
    [left + 5, "INVOICE NUMBER", invoice.invoiceNumber],
    [82, "INVOICE DATE", date(invoice.date)],
    [137, "DUE DATE", date(invoice.dueDate)],
  ];
  meta.forEach(([x, label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(String(label), Number(x), y + 6);
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(value), Number(x), y + 14);
  });
  y += 28;

  const boxHeight = 49;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(left, y, 83, boxHeight, 2, 2, "S");
  doc.roundedRect(109, y, 83, boxHeight, 2, 2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 112, 184);
  doc.text("FROM", left + 4, y + 7);
  doc.text("BILL TO", 113, y + 7);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text("Goanny Technologies Pvt. Ltd.", left + 4, y + 14);
  doc.text(invoice.client?.companyName || "Client unavailable", 113, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const fromLines = doc.splitTextToSize("U-7, 1st Floor, Inspiria Mall, Nigdi, Pune, Maharashtra", 74);
  doc.text(fromLines, left + 4, y + 20);
  doc.text("Email: support@goanny.com", left + 4, y + 34);
  doc.text("Phone: +91 9376937266", left + 4, y + 39);
  const billLines = doc.splitTextToSize(clientAddress || "Billing address not available", 74);
  doc.text(billLines.slice(0, 3), 113, y + 20);
  doc.text(`Email: ${client?.primaryEmail || "—"}`, 113, y + 34);
  doc.text(`Phone: ${client?.mobile || client?.phone || "—"}`, 113, y + 39);
  doc.text(`GSTIN: ${client?.gstNumber || "Not provided"}`, 113, y + 44);
  y += boxHeight + 7;

  autoTable(doc, {
    startY: y,
    margin: { left, right: 210 - right, top, bottom: 29 },
    head: [["Particulars", "Qty", "Rate", "Amount"]],
    body: [[
      invoice.quotationId ? `Invoice charges against quotation ${invoice.quotationId}` : "Invoice charges as per agreed scope",
      "1",
      pdfMoney(invoice.amount),
      pdfMoney(invoice.amount),
    ]],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 3, lineColor: [203, 213, 225], lineWidth: 0.15, textColor: [30, 41, 59], overflow: "linebreak" },
    headStyles: { fillColor: [0, 112, 184], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 92 }, 1: { cellWidth: 16, halign: "center" }, 2: { cellWidth: 33, halign: "right" }, 3: { cellWidth: 33, halign: "right", fontStyle: "bold" } },
    rowPageBreak: "avoid",
    willDrawPage: addLetterheadOnNewPage,
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(112, y, 80, 34, 2, 2, "F");
  const totals = [
    ["Invoice amount", pdfMoney(invoice.amount)],
    ["Amount received", pdfMoney(invoice.paid)],
    ["Balance due", pdfMoney(invoice.due)],
  ];
  totals.forEach(([label, value], index) => {
    const rowY = y + 8 + index * 8;
    doc.setFont("helvetica", index === 2 ? "bold" : "normal");
    doc.setFontSize(index === 2 ? 9.5 : 8.5);
    doc.setTextColor(index === 2 ? 15 : 71, index === 2 ? 23 : 85, index === 2 ? 42 : 105);
    doc.text(label, 117, rowY);
    doc.text(value, 187, rowY, { align: "right" });
  });
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(doc.splitTextToSize(`Amount due: ${pdfMoney(invoice.due)}`, 82), left, y + 9);
  y += 42;

  if (invoice.receipts?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PAYMENT / RECEIPT HISTORY", left, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left, right: 210 - right, top, bottom: 29 },
      head: [["Receipt", "Date", "Mode", "Reference", "Amount"]],
      body: invoice.receipts.map((receipt) => [
        receipt.receiptNumber,
        date(receipt.date),
        receipt.paymentMode.replaceAll("_", " "),
        receipt.referenceNumber || "—",
        pdfMoney(receipt.amount),
      ]),
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 2.2, lineColor: [203, 213, 225], lineWidth: 0.15 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 4: { halign: "right", fontStyle: "bold" } },
      rowPageBreak: "avoid",
      willDrawPage: addLetterheadOnNewPage,
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  }

  if (invoice.notes) {
    if (y > 245) {
      doc.addPage();
      addLetterhead();
      y = top;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("TERMS & NOTES", left, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const noteLines = doc.splitTextToSize(invoice.notes, width);
    doc.text(noteLines, left, y + 6);
    y += 6 + noteLines.length * 3.2;
  }

  const stampScale = 0.65;
  const stampWidth = stamp.naturalWidth ? stamp.naturalWidth * 25.4 / 96 * stampScale : 36;
  const stampHeight = stamp.naturalHeight ? stamp.naturalHeight * 25.4 / 96 * stampScale : 20;
  const signatureBlockHeight = stampHeight + 11;
  const footerSafeLimit = 279;
  const signatureY = Math.min(y + 2, footerSafeLimit - signatureBlockHeight);
  const stampX = right - stampWidth;
  const stampCenterX = right - stampWidth / 2;
  if (stamp.naturalWidth) {
    doc.addImage(stamp, "PNG", stampX, signatureY, stampWidth, stampHeight, "invoice-stamp", "FAST");
  }
  doc.setDrawColor(148, 163, 184);
  doc.line(stampX, signatureY + stampHeight - 3, right, signatureY + stampHeight - 3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Authorised Signatory", stampCenterX, signatureY + stampHeight + 3, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text("Goanny Technologies Pvt. Ltd.", stampCenterX, signatureY + stampHeight + 8, { align: "center" });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`${invoice.invoiceNumber} · Page ${page} of ${pageCount}`, right, 282, { align: "right" });
  }
  doc.save(`${invoice.invoiceNumber}.pdf`);
}

function EditInvoiceModal({
  invoice,
  saving,
  onClose,
  onSave,
}: {
  invoice: Invoice;
  saving: boolean;
  onClose: () => void;
  onSave: (data: { date: string; dueDate: string | null; amount: number; paid: number; status: InvoiceStatus; notes?: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    date: invoice.date.slice(0, 10),
    dueDate: invoice.dueDate?.slice(0, 10) ?? "",
    amount: Number(invoice.amount),
    paid: Number(invoice.paid),
    status: invoice.status,
    notes: invoice.notes ?? "",
  });
  const field = "mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Edit invoice</p><h2 className="mt-1 text-xl font-black text-slate-950">{invoice.invoiceNumber}</h2></div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">Invoice date<input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className={field} /></label>
          <label className="text-xs font-bold text-slate-600">Due date<input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} className={field} /></label>
          <label className="text-xs font-bold text-slate-600">Invoice amount<input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: Number(event.target.value) }))} className={field} /></label>
          <label className="text-xs font-bold text-slate-600">Amount paid<input type="number" min="0" step="0.01" value={form.paid} onChange={(event) => setForm((current) => ({ ...current, paid: Number(event.target.value) }))} className={field} /></label>
          <label className="text-xs font-bold text-slate-600 sm:col-span-2">Status
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as InvoiceStatus }))} className={field}>
              {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600 sm:col-span-2">Notes<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
          <button disabled={saving} onClick={() => void onSave({ ...form, dueDate: form.dueDate || null })} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-black text-white disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />} Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function AddReceiptModal({
  invoice,
  saving,
  onClose,
  onSave,
}: {
  invoice: Invoice;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: CreateReceiptPayload) => Promise<void>;
}) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: Math.max(0, Number(invoice.due)),
    paymentMode: "BANK_TRANSFER" as PaymentMode,
    referenceNumber: "",
    notes: "",
  });
  const field = "mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Add linked receipt</p><h2 className="mt-1 text-xl font-black text-slate-950">{invoice.invoiceNumber}</h2><p className="mt-1 text-xs text-slate-500">Current balance: {money(invoice.due)}</p></div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">Receipt date<input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className={field} /></label>
          <label className="text-xs font-bold text-slate-600">Amount<input type="number" min="0.01" max={Math.max(Number(invoice.due), Number(invoice.amount))} step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: Number(event.target.value) }))} className={field} /></label>
          <label className="text-xs font-bold text-slate-600">Payment mode
            <select value={form.paymentMode} onChange={(event) => setForm((current) => ({ ...current, paymentMode: event.target.value as PaymentMode }))} className={field}>
              {(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CARD", "OTHER"] as PaymentMode[]).map((mode) => <option key={mode} value={mode}>{mode.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">Reference number<input value={form.referenceNumber} onChange={(event) => setForm((current) => ({ ...current, referenceNumber: event.target.value }))} className={field} placeholder="UTR, cheque or transaction ID" /></label>
          <label className="text-xs font-bold text-slate-600 sm:col-span-2">Notes<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
          <button disabled={saving || form.amount <= 0} onClick={() => void onSave({ ...form, clientId: invoice.client.id, invoiceId: invoice.id })} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-black text-white disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />} Save receipt
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoiceModal({
  invoice,
  loading,
  onClose,
}: {
  invoice: Invoice | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Invoice details</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{invoice?.invoiceNumber ?? "Loading invoice…"}</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close invoice">
            <X className="h-5 w-5" />
          </button>
        </div>
        {loading || !invoice ? (
          <div className="flex min-h-72 items-center justify-center">
            <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-5 p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Client", invoice.client?.companyName || "—"],
                ["Invoice date", date(invoice.date)],
                ["Due date", date(invoice.dueDate)],
                ["Status", statusLabel(invoice.status)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Client code</p>
                <p className="mt-1 font-bold text-slate-700">{invoice.client?.clientCode || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Quotation reference</p>
                <p className="mt-1 break-all font-bold text-slate-700">{invoice.quotationId || "Not linked"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Created</p>
                <p className="mt-1 font-bold text-slate-700">{date(invoice.createdAt)}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Invoice amount", money(invoice.amount), "text-slate-950"],
                ["Paid", money(invoice.paid), "text-emerald-700"],
                ["Balance due", money(invoice.due), Number(invoice.due) > 0 ? "text-red-700" : "text-slate-950"],
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold text-slate-500">{label}</p>
                  <p className={`mt-2 text-xl font-black ${tone}`}>{value}</p>
                </div>
              ))}
            </div>
            <section>
              <h3 className="text-sm font-black text-slate-900">Receipt history</h3>
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                {invoice.receipts?.length ? (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
                      <tr><th className="p-3">Receipt</th><th className="p-3">Date</th><th className="p-3">Mode</th><th className="p-3">Reference / notes</th><th className="p-3 text-right">Amount</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoice.receipts.map((receipt) => (
                        <tr key={receipt.id}>
                          <td className="p-3 font-bold text-slate-800">{receipt.receiptNumber}</td>
                          <td className="p-3 text-slate-600">{date(receipt.date)}</td>
                          <td className="p-3 text-slate-600">{receipt.paymentMode.replaceAll("_", " ")}</td>
                          <td className="p-3 text-slate-600">
                            <p>{receipt.referenceNumber || "—"}</p>
                            {receipt.notes ? <p className="mt-1 text-[10px] text-slate-400">{receipt.notes}</p> : null}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-800">{money(receipt.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="p-5 text-sm text-slate-500">No receipts recorded for this invoice.</p>}
              </div>
            </section>
            <section className="rounded-2xl bg-slate-50 p-4">
              <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">Notes</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{invoice.notes || "No notes added."}</p>
            </section>
            <button onClick={() => void downloadInvoice(invoice)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700">
              <Download className="h-4 w-4" /> Download Invoice PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [receipting, setReceipting] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await invoicesApi.list({ status, page, limit: 20 });
      setInvoices(result.invoices ?? []);
      setPagination({ total: result.pagination.total, pages: Math.max(1, result.pagination.pages) });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load invoices");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { void load(); }, [load]);

  const visibleInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return invoices;
    return invoices.filter((invoice) =>
      (invoice.invoiceNumber ?? "").toLowerCase().includes(term) ||
      invoice.client?.companyName?.toLowerCase().includes(term) ||
      invoice.client?.clientCode?.toLowerCase().includes(term)
    );
  }, [invoices, search]);

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

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Finance / Invoices</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Invoice Management</h1>
          <p className="mt-1 text-xs text-slate-500">Review balances, payment status, receipts, and invoice documents.</p>
        </div>
        <Link href="/invoice/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-md shadow-blue-200 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Create Invoice
        </Link>
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
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Invoice, client or code" className="h-9 w-60 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
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
              )) : visibleInvoices.length ? visibleInvoices.map((invoice) => (
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
                    <button onClick={() => setEditing(invoice)} title="Edit invoice" className="rounded-lg p-2 text-violet-600 hover:bg-violet-50"><Edit3 className="h-4 w-4" /></button>
                    <button onClick={() => setReceipting(invoice)} disabled={Number(invoice.due) <= 0} title={Number(invoice.due) <= 0 ? "Invoice is fully paid" : "Add receipt"} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-30"><Receipt className="h-4 w-4" /></button>
                    <button onClick={() => void download(invoice)} title="Download invoice" className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"><Download className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              )) : <tr><td colSpan={9} className="py-16 text-center"><FileText className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-bold text-slate-700">No invoices found</p><p className="mt-1 text-xs text-slate-400">Create an invoice or change the selected filter.</p></td></tr>}
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
    </div>
  );
}
