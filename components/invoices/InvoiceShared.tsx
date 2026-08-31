"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Download, Edit3, Loader2, Mail, Receipt, Send, X } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { clientsApi } from "@/lib/api/clients";
import { activityApi } from "@/lib/api/activity";
import type { CreateReceiptPayload, PaymentMode } from "@/lib/api/receipts";
import { invoicesApi } from "@/lib/api/invoices";
import type { Invoice, InvoiceStatus } from "@/types/invoice";

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "INR";

export const STATUS_OPTIONS: InvoiceStatus[] = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];

export const STATUS_STYLE: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-50 text-blue-700",
  PARTIALLY_PAID: "bg-amber-50 text-amber-700",
  PAID: "bg-emerald-50 text-emerald-700",
  OVERDUE: "bg-red-50 text-red-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

export const money = (value: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export const date = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export const statusLabel = (status: InvoiceStatus) => status.replaceAll("_", " ");

const longDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : "Not applicable";

const dateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

async function buildInvoicePdf(invoice: Invoice): Promise<jsPDF> {
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
  return doc;
}

export async function downloadInvoice(invoice: Invoice) {
  const doc = await buildInvoicePdf(invoice);
  doc.save(`${invoice.invoiceNumber}.pdf`);
}

export async function getInvoicePdfAttachment(invoice: Invoice): Promise<{ filename: string; base64: string }> {
  const doc = await buildInvoicePdf(invoice);
  const dataUri = doc.output("datauristring");
  return { filename: `${invoice.invoiceNumber}.pdf`, base64: dataUri.slice(dataUri.indexOf(",") + 1) };
}

export function EditInvoiceModal({
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

export function AddReceiptModal({
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

export function SendInvoiceEmailModal({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(`Invoice ${invoice.invoiceNumber} | Goanny Ai Tech`);
  const [message, setMessage] = useState(
    `Dear Sir/Madam,\n\nGreetings from Goanny AI Tech.\n\nWith regard to the attached invoice, please find the details of the billed amount for the services rendered.\n\nInvoice Number: ${invoice.invoiceNumber}\nInvoice Date: ${longDate(invoice.date)}\nDue Date: ${longDate(invoice.dueDate)}\nTotal Amount: ${money(invoice.amount)}\nBalance Due: ${money(invoice.due)}\n\nPlease review the attached invoice and process the payment at your earliest convenience. If you have any questions or require further clarification, please feel free to contact us.\n\nWe look forward to working with you.\n\nRegards,\nAccounts Team\nGoanny AI Tech\naccounts@goannyaitech.com\nwww.goannyaitech.com`,
  );
  const [loadingClient, setLoadingClient] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let active = true;
    if (!invoice.client?.id) { setLoadingClient(false); return; }
    clientsApi.get(invoice.client.id)
      .then((client) => { if (active) setTo(client.primaryEmail || client.secondaryEmail || ""); })
      .catch(() => {})
      .finally(() => { if (active) setLoadingClient(false); });
    return () => { active = false; };
  }, [invoice.client?.id]);

  useEffect(() => {
    if (!invoice.client?.id) return;
    activityApi.create(invoice.client.id, "Email Started", `Opened send-email form for Invoice ${invoice.invoiceNumber}`).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    if (!sent && invoice.client?.id) {
      activityApi.create(invoice.client.id, "Email Closed", `Closed send-email form for Invoice ${invoice.invoiceNumber} without sending`).catch(() => {});
    }
    onClose();
  };

  const send = async () => {
    if (!to.trim()) { setError("Recipient email is required"); return; }
    setSending(true);
    setError("");
    try {
      const { filename, base64 } = await getInvoicePdfAttachment(invoice);
      await invoicesApi.sendEmail(invoice.id, {
        to: to.trim(),
        cc: cc.trim() ? cc.split(",").map((email) => email.trim()).filter(Boolean) : undefined,
        subject,
        message,
        attachmentFilename: filename,
        attachmentBase64: base64,
      });
      setSent(true);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send email");
    } finally {
      setSending(false);
    }
  };

  const field = "mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={handleClose}>
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Send by email</p><h2 className="mt-1 text-xl font-black text-slate-950">{invoice.invoiceNumber}</h2></div>
          <button onClick={handleClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        {sent ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="font-bold text-slate-800">Email sent to {to}</p>
            <button onClick={onClose} className="mt-2 rounded-xl bg-slate-900 px-5 py-2 text-sm font-black text-white">Done</button>
          </div>
        ) : (
          <>
            <div className="space-y-4 p-6">
              {invoice.emailHistory?.length ? (
                <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
                  <p className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Sent {invoice.emailHistory.length} time{invoice.emailHistory.length > 1 ? "s" : ""}
                  </p>
                  <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto">
                    {invoice.emailHistory.map((entry, index) => (
                      <li key={index} className="flex items-center justify-between gap-2">
                        <span className="truncate">{entry.to}</span>
                        <span className="shrink-0 text-blue-500">{dateTime(entry.sentAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {error ? <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div> : null}
              <label className="text-xs font-bold text-slate-600">To
                <input type="email" value={to} onChange={(event) => setTo(event.target.value)} disabled={loadingClient} className={field} placeholder="client@example.com" />
              </label>
              <label className="text-xs font-bold text-slate-600">Cc <span className="font-normal text-slate-400">(optional, comma separated)</span>
                <input value={cc} onChange={(event) => setCc(event.target.value)} className={field} placeholder="finance@example.com" />
              </label>
              <label className="text-xs font-bold text-slate-600">Subject
                <input value={subject} onChange={(event) => setSubject(event.target.value)} className={field} />
              </label>
              <label className="text-xs font-bold text-slate-600">Message
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 min-h-32 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button onClick={handleClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
              <button disabled={sending || loadingClient} onClick={() => void send()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-black text-white disabled:opacity-60">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {invoice.lastEmail ? "Resend Email" : "Send Email"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function InvoiceModal({
  invoice,
  loading,
  onClose,
}: {
  invoice: Invoice | null;
  loading: boolean;
  onClose: () => void;
}) {
  const [emailing, setEmailing] = useState(false);
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
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
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
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={() => void downloadInvoice(invoice)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700">
                <Download className="h-4 w-4" /> Download Invoice PDF
              </button>
              <button onClick={() => setEmailing(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 hover:bg-blue-100">
                <Mail className="h-4 w-4" /> {invoice.lastEmail ? "Resend Email" : "Send by Email"}
              </button>
            </div>
            {invoice.lastEmail ? (
              <p className="text-center text-xs font-semibold text-slate-500">
                Last sent to {invoice.lastEmail.to} on {dateTime(invoice.lastEmail.sentAt)}
              </p>
            ) : null}
          </div>
        )}
      </div>
      {emailing && invoice ? <SendInvoiceEmailModal invoice={invoice} onClose={() => setEmailing(false)} /> : null}
    </div>
  );
}
