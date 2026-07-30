"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2, ChevronLeft, ChevronRight, Download, Eye, FileText,
  Loader2, Plus, ReceiptText, RefreshCw, Search, WalletCards, X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import {
  receiptsApi, type CreateReceiptPayload, type PaymentMode, type ReceiptListItem,
} from "@/lib/api/receipts";
import { invoicesApi } from "@/lib/api/invoices";
import type { Invoice } from "@/types/invoice";

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "INR";
const money = (value: string | number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: CURRENCY, maximumFractionDigits: 2,
}).format(Number(value) || 0);
const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  : "—";
const mode = (value: string) => value.replaceAll("_", " ");
const invoiceId = (receipt: ReceiptListItem) => receipt.invoiceId ?? receipt.invoice?.id;
const clientId = (receipt: ReceiptListItem) => receipt.clientId ?? receipt.client?.id;

function clientDocumentCode(clientName?: string) {
  const words = (clientName ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  const compact = (words[0] ?? "CL").replace(/[^a-z0-9]/gi, "");
  return (compact.slice(0, 2) || "CL").padEnd(2, "L").toUpperCase();
}

function receiptNumberFor(clientName: string | undefined, paymentDate: string, receipts: ReceiptListItem[]) {
  const datePart = paymentDate.replaceAll("-", "");
  const serials = receipts
    .filter((receipt) => receipt.date?.slice(0, 10) === paymentDate)
    .map((receipt) => {
      const match = receipt.receiptNumber?.match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    });
  const nextSerial = Math.max(0, ...serials) + 1;
  return `GO/${clientDocumentCode(clientName)}/RCP/${datePart}/${String(nextSerial).padStart(3, "0")}`;
}

function displayedReceiptNumber(receipt: ReceiptListItem) {
  return receipt.receiptNumber;
}

function amountInWords(value: string | number) {
  const amount = Math.round((Number(value) || 0) * 100) / 100;
  const whole = Math.floor(amount);
  const paise = Math.round((amount - whole) * 100);
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const belowThousand = (number: number): string => {
    if (number < 20) return ones[number];
    if (number < 100) return `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${ones[number % 10]}` : ""}`;
    return `${ones[Math.floor(number / 100)]} Hundred${number % 100 ? ` ${belowThousand(number % 100)}` : ""}`;
  };
  const parts: string[] = [];
  let remaining = whole;
  for (const [unit, size] of [["Crore", 10_000_000], ["Lakh", 100_000], ["Thousand", 1_000]] as const) {
    const count = Math.floor(remaining / size);
    if (count) {
      parts.push(`${belowThousand(count)} ${unit}`);
      remaining %= size;
    }
  }
  if (remaining) parts.push(belowThousand(remaining));
  const rupees = parts.join(" ") || "Zero";
  return `Indian Rupees ${rupees}${paise ? ` and ${belowThousand(paise)} Paise` : ""} Only`;
}

async function downloadReceipt(receipt: ReceiptListItem) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const letterhead = new Image();
  letterhead.src = "/letterhead.jpg";
  await new Promise<void>((resolve) => {
    letterhead.onload = () => resolve();
    letterhead.onerror = () => resolve();
  });
  const stamp = new Image();
  stamp.src = "/goanny_stamp.png";
  await new Promise<void>((resolve) => {
    stamp.onload = () => resolve();
    stamp.onerror = () => resolve();
  });
  if (letterhead.naturalWidth) doc.addImage(letterhead, "JPEG", 0, 0, 210, 297, "receipt-letterhead", "FAST");

  const left = 18;
  const right = 192;
  const width = right - left;
  const clientName = receipt.client?.companyName || "Client details not available";
  const invoiceNumber = receipt.invoice?.invoiceNumber || "Not available";
  const pdfAmount = `INR ${(Number(receipt.amount) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;

  // Formal voucher title band
  doc.setFillColor(0, 85, 145);
  doc.roundedRect(left, 45, width, 15, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PAYMENT RECEIPT", 105, 55, { align: "center" });

  // Receipt identification
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(left, 66, width, 25, 1.5, 1.5, "FD");
  doc.setDrawColor(226, 232, 240);
  doc.line(76, 66, 76, 91);
  doc.line(134, 66, 134, 91);
  const meta = [
    [23, "RECEIPT NO.", displayedReceiptNumber(receipt)],
    [84, "RECEIPT DATE", formatDate(receipt.date)],
    [143, "PAYMENT MODE", mode(receipt.paymentMode)],
  ] as const;
  meta.forEach(([x, label, value], index) => {
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, x, 75);
    doc.setFontSize(index === 0 ? 7.5 : 11);
    doc.setTextColor(15, 23, 42);
    doc.text(value, x, 84, { maxWidth: index === 0 ? 49 : 48 });
  });

  // Standard receipt acknowledgement
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(left, 98, width, 54, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text("Received with thanks from", 23, 109);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(clientName, 23, 119);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`the sum of ${amountInWords(receipt.amount)},`, 23, 129, { maxWidth: 164 });
  doc.setDrawColor(226, 232, 240);
  doc.line(23, 135, 187, 135);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("PAYMENT AGAINST INVOICE", 23, 144);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(invoiceNumber, 187, 144, { align: "right" });
  if (receipt.client?.clientCode) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Client Code: ${receipt.client.clientCode}`, right - 5, 119, { align: "right" });
  }

  // Clear, printable amount panel
  doc.setFillColor(235, 247, 255);
  doc.setDrawColor(56, 189, 248);
  doc.roundedRect(left, 160, width, 32, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(3, 105, 161);
  doc.text("TOTAL AMOUNT RECEIVED", 25, 172);
  doc.setFontSize(21);
  doc.setTextColor(3, 58, 102);
  doc.text(pdfAmount, right - 7, 181, { align: "right" });

  // Transaction particulars table
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(left, 200, width, receipt.notes ? 48 : 36, 1.5, 1.5, "FD");
  doc.setDrawColor(226, 232, 240);
  doc.line(18, 218, 192, 218);
  doc.line(105, 200, 105, 218);
  const details = [
    [23, "TRANSACTION REFERENCE", receipt.referenceNumber || "Not provided"],
    [110, "PAYMENT STATUS", "RECEIVED"],
  ] as const;
  details.forEach(([x, label, value], index) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, x, 207);
    doc.setFontSize(10);
    doc.setTextColor(index ? 5 : 15, index ? 150 : 23, index ? 105 : 42);
    doc.text(value, x, 214);
  });
  if (receipt.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("REMARKS", 23, 226);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(doc.splitTextToSize(receipt.notes, 160).slice(0, 2), 23, 234);
  }

  // Acknowledgement and authorization
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Payment received and accounted for. Thank you for your business.", left, 256);
  const signatoryCenter = 164;
  // Derive the PDF height from the image's actual pixel dimensions. This keeps
  // the signature and circular stamp at their exact original aspect ratio.
  if (stamp.naturalWidth && stamp.naturalHeight) {
    const stampWidth = 32;
    const stampHeight = stampWidth * (stamp.naturalHeight / stamp.naturalWidth);
    doc.addImage(
      stamp,
      "PNG",
      signatoryCenter - stampWidth / 2,
      231,
      stampWidth,
      stampHeight,
      "receipt-stamp",
      "NONE",
    );
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Goanny Technologies Pvt. Ltd.", signatoryCenter, 256, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Authorized Signatory", signatoryCenter, 262, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("This is a system-generated receipt.", 105, 278, { align: "center" });
  doc.save(`${displayedReceiptNumber(receipt).replaceAll("/", "-")}.pdf`);
}

function CreateReceiptModal({ receipts, onClose, onCreated }: { receipts: ReceiptListItem[]; onClose: () => void; onCreated: () => Promise<void> }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceIdValue, setInvoiceIdValue] = useState("");
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    paymentMode: "UPI" as PaymentMode,
    referenceNumber: "",
    notes: "",
  });

  useEffect(() => {
    let active = true;
    invoicesApi.list({ page: 1, limit: 100 })
      .then((result) => {
        if (active) setInvoices((result.invoices ?? []).filter((invoice) => Number(invoice.due) > 0));
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load outstanding invoices");
      })
      .finally(() => {
        if (active) setLoadingInvoices(false);
      });
    return () => { active = false; };
  }, []);

  const selectedInvoice = invoices.find((invoice) => invoice.id === invoiceIdValue);
  const selectedClientId = selectedInvoice?.clientId ?? selectedInvoice?.client?.id;
  const generatedReceiptNumber = selectedInvoice && form.date
    ? receiptNumberFor(selectedInvoice.client?.companyName, form.date, receipts)
    : "";
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const amount = Number(form.amount);
    if (!selectedInvoice || !selectedClientId) {
      setError("Select an invoice with a related client.");
      return;
    }
    if (!form.date) {
      setError("Select the payment date.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid receipt amount greater than zero.");
      return;
    }
    if (amount > Number(selectedInvoice.due)) {
      setError(`Receipt amount cannot exceed the outstanding balance of ${money(selectedInvoice.due)}.`);
      return;
    }
    const payload: CreateReceiptPayload = {
      clientId: selectedClientId,
      invoiceId: selectedInvoice.id,
      date: form.date,
      amount,
      paymentMode: form.paymentMode,
      referenceNumber: form.referenceNumber.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    setSaving(true);
    try {
      await receiptsApi.create(payload);
      await onCreated();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create receipt");
    } finally {
      setSaving(false);
    }
  };
  const field = "mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">Finance / Receipts</p><h2 className="mt-1 text-xl font-black text-slate-950">Create Payment Receipt</h2><p className="mt-1 text-xs text-slate-500">Record a payment against an outstanding client invoice.</p></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-5">
          {error ? <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}
          <label className="block text-xs font-bold text-slate-600">Related invoice
            <select value={invoiceIdValue} disabled={loadingInvoices} onChange={(event) => { setInvoiceIdValue(event.target.value); setForm((current) => ({ ...current, amount: "" })); }} className={field}>
              <option value="">{loadingInvoices ? "Loading invoices..." : "Select outstanding invoice"}</option>
              {invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} — {invoice.client?.companyName || "Client"} — Due {money(invoice.due)}</option>)}
            </select>
          </label>
          {selectedInvoice ? (
            <div className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-3">
              <div><p className="text-[10px] font-bold uppercase text-emerald-700">Client</p><p className="mt-1 text-sm font-black text-slate-900">{selectedInvoice.client?.companyName || "—"}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-emerald-700">Invoice</p><p className="mt-1 text-sm font-black text-slate-900">{selectedInvoice.invoiceNumber}</p></div>
              <div><p className="text-[10px] font-bold uppercase text-emerald-700">Available balance</p><p className="mt-1 text-sm font-black text-emerald-900">{money(selectedInvoice.due)}</p></div>
            </div>
          ) : null}
          <label className="block text-xs font-bold text-slate-600">Receipt number
            <input readOnly value={generatedReceiptNumber} className={`${field} cursor-not-allowed bg-slate-100 font-bold text-blue-700`} placeholder="Generated after selecting an invoice" />
            <span className="mt-1 block text-[10px] font-medium text-slate-400">Format: GO / client initials / RCP / payment date / daily serial</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">Payment date<input type="date" required value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className={field} /></label>
            <label className="text-xs font-bold text-slate-600">Amount received<input type="number" required min="0.01" step="0.01" max={selectedInvoice ? Number(selectedInvoice.due) : undefined} value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className={field} placeholder="0.00" /></label>
            <label className="text-xs font-bold text-slate-600">Payment mode<select value={form.paymentMode} onChange={(event) => setForm((current) => ({ ...current, paymentMode: event.target.value as PaymentMode }))} className={field}>{(["UPI", "BANK_TRANSFER", "CASH", "CHEQUE", "CARD", "OTHER"] as PaymentMode[]).map((item) => <option key={item} value={item}>{mode(item)}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600">Transaction reference<input value={form.referenceNumber} onChange={(event) => setForm((current) => ({ ...current, referenceNumber: event.target.value }))} className={field} placeholder="UTR, cheque or reference no." /></label>
          </div>
          <label className="block text-xs font-bold text-slate-600">Remarks<textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="mt-1 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" placeholder="Optional payment remarks" /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-white">Cancel</button>
          <button type="submit" disabled={saving || loadingInvoices} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />} Create Receipt</button>
        </div>
      </form>
    </div>
  );
}

function ReceiptModal({ receipt, onClose }: { receipt: ReceiptListItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 p-5">
          <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Finance / Receipts</p><h2 className="mt-1 text-xl font-black text-slate-950">Receipt Details</h2></div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-5 p-6">
          <div className="rounded-xl bg-[#005591] px-4 py-3 text-center"><p className="text-lg font-black tracking-[0.12em] text-white">PAYMENT RECEIPT</p></div>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid bg-slate-50 sm:grid-cols-3">
              {[["Receipt No.", displayedReceiptNumber(receipt)], ["Receipt Date", formatDate(receipt.date)], ["Payment Mode", mode(receipt.paymentMode)]].map(([label, value]) => <div key={label} className="border-b border-slate-200 p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-black text-slate-800">{value}</p></div>)}
            </div>
            <div className="grid border-t border-slate-200 sm:grid-cols-2">
              <div className="p-4 sm:border-r sm:border-slate-200"><p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Received From</p><p className="mt-1 text-base font-black text-slate-900">{receipt.client?.companyName || "Client details not available"}</p><p className="mt-1 text-xs text-slate-500">{receipt.client?.clientCode ? `Client Code: ${receipt.client.clientCode}` : "Client code not available"}</p></div>
              <div className="p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Payment Against</p><p className="mt-1 text-base font-black text-slate-900">{receipt.invoice?.invoiceNumber ? `Invoice ${receipt.invoice.invoiceNumber}` : "Invoice details not available"}</p></div>
            </div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-6 text-center"><p className="text-xs font-black uppercase tracking-wider text-sky-700">Amount Received</p><p className="mt-2 text-3xl font-black text-sky-950">{money(receipt.amount)}</p><p className="mx-auto mt-2 max-w-xl text-xs font-semibold text-slate-600">{amountInWords(receipt.amount)}</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Transaction Reference", receipt.referenceNumber || "Not provided"],
              ["Payment Status", "Received"],
            ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div>)}
          </div>
          {receipt.notes ? <div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Remarks</p><p className="mt-1 text-sm text-slate-700">{receipt.notes}</p></div> : null}
          <p className="text-center text-xs text-slate-500">We acknowledge with thanks the receipt of the payment detailed above.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <button onClick={() => void downloadReceipt(receipt)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700"><Download className="h-4 w-4" /> Download</button>
            {invoiceId(receipt) ? <Link href={`/invoice?invoiceId=${invoiceId(receipt)}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100"><FileText className="h-4 w-4" /> View invoice</Link> : null}
            {clientId(receipt) ? <Link href={`/crm/clients/${clientId(receipt)}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-50 px-4 py-3 text-sm font-black text-violet-700 hover:bg-violet-100"><Building2 className="h-4 w-4" /> View client</Link> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReceiptPage() {
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([]);
  const [selected, setSelected] = useState<ReceiptListItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await receiptsApi.list({ page, limit: 20 });
      setReceipts(result.receipts ?? []);
      setPagination({ total: result.pagination?.total ?? 0, pages: Math.max(1, result.pagination?.pages ?? 1) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load receipts");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return receipts;
    return receipts.filter((receipt) => [
      displayedReceiptNumber(receipt), receipt.receiptNumber, receipt.referenceNumber, receipt.invoice?.invoiceNumber,
      receipt.client?.companyName, receipt.client?.clientCode,
    ].some((value) => value?.toLowerCase().includes(term)));
  }, [receipts, search]);
  const pageTotal = receipts.reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0);

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600">Finance / Receipts</p><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Payment Receipts</h1><p className="mt-1 text-xs text-slate-500">View, download, and trace every payment to its invoice and client.</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
          <button onClick={() => setCreating(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-md shadow-emerald-200 hover:bg-emerald-700">
            <Plus className="h-4 w-4" /> Create Receipt
          </button>
          <Link href="/invoice/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-md shadow-blue-200 hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Create Invoice
          </Link>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Total receipts", pagination.total, ReceiptText, "bg-blue-50 text-blue-700"], ["Page collection", money(pageTotal), WalletCards, "bg-emerald-50 text-emerald-700"], ["Linked records", receipts.filter((r) => invoiceId(r) && clientId(r)).length, FileText, "bg-violet-50 text-violet-700"]].map(([label, value, Icon, tone]) => {
          const CardIcon = Icon as typeof ReceiptText;
          return <div key={String(label)} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div><p className="text-xs font-bold text-slate-500">{String(label)}</p><p className="mt-2 text-xl font-black text-slate-950">{String(value)}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><CardIcon className="h-5 w-5" /></span></div>;
        })}
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black text-slate-950">All Receipts</h2><p className="text-xs text-slate-500">{pagination.total.toLocaleString("en-IN")} payment records</p></div><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Receipt, invoice or client" className="h-9 w-64 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100" /></div></div>
        {error ? <div className="m-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}
        <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-sm"><thead className="bg-slate-50 text-left text-[10px] uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-4 py-3">Receipt</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Mode / reference</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-center">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? Array.from({ length: 5 }).map((_, row) => <tr key={row}>{Array.from({ length: 7 }).map((__, cell) => <td key={cell} className="px-4 py-4"><div className="h-4 animate-pulse rounded bg-slate-100" /></td>)}</tr>) : visible.length ? visible.map((receipt) => <tr key={receipt.id} className="hover:bg-emerald-50/40">
              <td className="whitespace-nowrap px-4 py-3 text-xs font-black text-emerald-700">{displayedReceiptNumber(receipt)}</td>
              <td className="px-4 py-3">{clientId(receipt) ? <Link href={`/crm/clients/${clientId(receipt)}`} className="font-bold text-slate-800 hover:text-violet-700">{receipt.client?.companyName || "View client"}</Link> : "—"}<p className="text-[10px] text-slate-400">{receipt.client?.clientCode}</p></td>
              <td className="px-4 py-3">{invoiceId(receipt) ? <Link href={`/invoice?invoiceId=${invoiceId(receipt)}`} className="font-bold text-blue-700 hover:underline">{receipt.invoice?.invoiceNumber || "View invoice"}</Link> : "—"}</td>
              <td className="px-4 py-3 text-slate-600">{formatDate(receipt.date)}</td>
              <td className="px-4 py-3"><p className="font-bold text-slate-700">{mode(receipt.paymentMode)}</p><p className="text-[10px] text-slate-400">{receipt.referenceNumber || "No reference"}</p></td>
              <td className="px-4 py-3 text-right font-black text-emerald-700">{money(receipt.amount)}</td>
              <td className="px-4 py-3"><div className="flex justify-center gap-1"><button onClick={() => setSelected(receipt)} title="View receipt" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Eye className="h-4 w-4" /></button><button onClick={() => void downloadReceipt(receipt)} title="Download receipt" className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"><Download className="h-4 w-4" /></button></div></td>
            </tr>) : <tr><td colSpan={7} className="py-16 text-center"><ReceiptText className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-bold text-slate-700">No receipts found</p><p className="mt-1 text-xs text-slate-400">Receipts created from invoices will appear here.</p></td></tr>}
          </tbody></table></div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><p className="text-xs font-semibold text-slate-500">Page {page} of {pagination.pages}</p><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button disabled={page >= pagination.pages || loading} onClick={() => setPage((value) => Math.min(pagination.pages, value + 1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
      </section>
      {selected ? <ReceiptModal receipt={selected} onClose={() => setSelected(null)} /> : null}
      {creating ? <CreateReceiptModal receipts={receipts} onClose={() => setCreating(false)} onCreated={load} /> : null}
      {loading && !receipts.length ? <span className="sr-only"><Loader2 className="animate-spin" /> Loading receipts</span> : null}
    </div>
  );
}
