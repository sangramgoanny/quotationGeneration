"use client";

import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Download, FileText, Plus, ReceiptText, Save, WalletCards } from "lucide-react";
import { clientsApi } from "@/lib/api/clients";
import { invoicesApi } from "@/lib/api/invoices";

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function numberToWords(num) {
  if (num === 0) return "Zero";
  const n = Math.floor(num);

  const chunk = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + chunk(n % 100) : "");
  };

  const crore = Math.floor(n / 10000000);
  const lakh  = Math.floor((n % 10000000) / 100000);
  const thou  = Math.floor((n % 100000) / 1000);
  const rest  = n % 1000;

  let result = "";
  if (crore) result += chunk(crore) + " Crore ";
  if (lakh)  result += chunk(lakh)  + " Lakh ";
  if (thou)  result += chunk(thou)  + " Thousand ";
  if (rest)  result += chunk(rest);
  return result.trim() + " Only";
}

const cleanText = (text) =>
  text ? text.replace(/[^\x00-\x7F]/g, "").trim() : "";

const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getClientBillingDetails = (client) => {
  const billingParts = [
    client.billingLine1,
    client.billingLine2,
    client.billingCity,
    client.billingState,
    client.billingCountry,
    client.billingPincode,
  ].filter(Boolean);
  const shippingParts = [
    client.shippingLine1,
    client.shippingLine2,
    client.shippingCity,
    client.shippingState,
    client.shippingCountry,
    client.shippingPincode,
  ].filter(Boolean);
  return {
    clientName: client.companyName || "",
    clientAddress: (billingParts.length ? billingParts : shippingParts).join(", "),
    clientEmail: client.primaryEmail || client.secondaryEmail || "",
    clientPhone: client.mobile || client.phone || client.whatsapp || "",
  };
};

export default function InvoiceGenerator() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientLoading, setClientLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [invoice, setInvoice] = useState({
    quotationId: "",
    date: new Date().toISOString().split("T")[0],
    dueDate: "",
    fromName: "Goanny Technologies Pvt Ltd",
    fromAddress: "U7 - 1st Floor, Inspiria Mall, Near Bhakti Shakti, Nigdi, Pune - 411044",
    clientName: "",
    clientAddress: "",
    clientEmail: "",
    clientPhone: "",
    items: [{ description: "", qty: 1, rate: "" }],
    taxRate: "18",
    payments: [],
    bankName: "HDFC Bank",
    accountNumber: "",
    ifsc: "",
    accountHolder: "Goanny Technologies Pvt Ltd",
    notes:
      "Payment is due within 15 days. Late payments attract a 5% weekly charge.",
  });

  const set = (key, value) => setInvoice((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    let active = true;
    clientsApi.list({ limit: 100 })
      .then((result) => result.data ?? [])
      .then((records) => {
        if (!active) return;
        setClients(records);
        const params = new URLSearchParams(window.location.search);
        const clientId = params.get("clientId");
        const quotationId = params.get("quotationId");
        if (quotationId) setInvoice((previous) => ({ ...previous, quotationId }));
        const client = records.find((record) => record.id === clientId);
        if (client) {
          setSelectedClientId(client.id);
          clientsApi.get(client.id)
            .then((fullClient) => {
              if (active) setInvoice((previous) => ({ ...previous, ...getClientBillingDetails(fullClient) }));
            })
            .catch(() => {
              if (active) setInvoice((previous) => ({ ...previous, ...getClientBillingDetails(client) }));
            });
        }
      })
      .catch((error) => {
        if (active) setSaveError(error instanceof Error ? error.message : "Unable to load clients");
      });
    return () => { active = false; };
  }, []);

  const populateClientDetails = (client) => {
    setInvoice((previous) => ({
      ...previous,
      ...getClientBillingDetails(client),
    }));
  };

  const selectClient = async (client) => {
    setSelectedClientId(client?.id || "");
    if (!client) {
      setInvoice((previous) => ({
        ...previous,
        clientName: "",
        clientAddress: "",
        clientEmail: "",
        clientPhone: "",
      }));
      return;
    }

    setClientLoading(true);
    setSaveError("");
    try {
      const fullClient = await clientsApi.get(client.id);
      populateClientDetails(fullClient);
    } catch (error) {
      populateClientDetails(client);
      setSaveError(error instanceof Error ? error.message : "Unable to load the complete client address");
    } finally {
      setClientLoading(false);
    }
  };

  const addItem = () =>
    set("items", [...invoice.items, { description: "", qty: 1, rate: "" }]);

  const updateItem = (index, field, value) => {
    const updated = [...invoice.items];
    updated[index][field] = value;
    set("items", updated);
  };

  const removeItem = (index) =>
    set(
      "items",
      invoice.items.filter((_, i) => i !== index)
    );

  const addPayment = () =>
    set("payments", [
      ...invoice.payments,
      { date: new Date().toISOString().split("T")[0], amount: "", method: "Bank Transfer", note: "" },
    ]);

  const updatePayment = (index, field, value) => {
    const updated = [...invoice.payments];
    updated[index][field] = value;
    set("payments", updated);
  };

  const removePayment = (index) =>
    set("payments", invoice.payments.filter((_, i) => i !== index));

  const subtotal = invoice.items.reduce(
    (sum, item) =>
      sum + (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0),
    0
  );
  const taxAmount = (subtotal * (parseFloat(invoice.taxRate) || 0)) / 100;
  const total = subtotal + taxAmount;
  const totalPaid = invoice.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const balanceDue = total - totalPaid;

  const saveInvoice = async () => {
    setSaveError("");
    if (!selectedClientId) {
      setSaveError("Select a client before saving the invoice.");
      return;
    }
    if (!invoice.date) {
      setSaveError("Select an invoice date.");
      return;
    }
    if (invoice.dueDate && invoice.dueDate < invoice.date) {
      setSaveError("The due date cannot be earlier than the invoice date.");
      return;
    }
    const invalidItem = invoice.items.find(
      (item) => !item.description.trim() || Number(item.qty) <= 0 || Number(item.rate) <= 0
    );
    if (invalidItem) {
      setSaveError("Every invoice item requires a description, quantity greater than zero, and a valid rate.");
      return;
    }
    if (total <= 0) {
      setSaveError("Add at least one invoice item with a valid quantity and rate.");
      return;
    }
    if (totalPaid > total) {
      setSaveError("Recorded payments cannot exceed the invoice total.");
      return;
    }
    setSaving(true);
    try {
      const created = await invoicesApi.create({
        clientId: selectedClientId,
        quotationId: invoice.quotationId || null,
        date: invoice.date,
        dueDate: invoice.dueDate || null,
        amount: total,
        paid: totalPaid,
        status: totalPaid >= total ? "PAID" : totalPaid > 0 ? "PARTIALLY_PAID" : "DRAFT",
        notes: invoice.notes || undefined,
      });
      setSavedInvoice(created);
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = async () => {
    if (!savedInvoice?.invoiceNumber) {
      setSaveError("Save the invoice first. The invoice number is assigned by the backend.");
      return;
    }
    const doc = new jsPDF("p", "mm", "a4");

    const img = new Image();
    img.src = "/letterhead.jpg";
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
    const stamp = new Image();
    stamp.src = "/goanny_stamp.png";
    await new Promise((resolve) => {
      stamp.onload = resolve;
      stamp.onerror = resolve;
    });

    const LEFT = 20;
    const RIGHT = 190;
    const CONTENT_WIDTH = 170;
    const HEADER_HEIGHT = 48;
    const FOOTER_LIMIT = 270;

    let y;

    const addBackground = () => {
      if (img.naturalWidth) doc.addImage(img, "JPEG", 0, 0, 210, 297, "invoice-letterhead", "FAST");
    };

    const addBackgroundToAutoTablePage = () => {
      if (doc.getCurrentPageInfo().pageNumber > 1) addBackground();
    };

    const newPage = () => {
      doc.addPage();
      addBackground();
      y = HEADER_HEIGHT;
    };

    const checkPageBreak = (space = 8) => {
      if (y + space > FOOTER_LIMIT) newPage();
    };

    const line = (x1, y1, x2, y2) => {
      doc.setLineWidth(0.3);
      doc.line(x1, y1, x2, y2);
    };

    addBackground();
    y = HEADER_HEIGHT;

    // ── TITLE ──
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 105, y, { align: "center" });
    y += 5;
    line(LEFT, y, RIGHT, y);
    y += 8;

    // ── INVOICE META ──
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(186, 230, 253);
    doc.roundedRect(LEFT, y, CONTENT_WIDTH, 19, 2, 2, "FD");
    const metaColumns = [
      { x: LEFT + 5, label: "INVOICE NUMBER", value: savedInvoice.invoiceNumber },
      { x: 105, label: "INVOICE DATE", value: formatDate(invoice.date) },
      { x: 150, label: "DUE DATE", value: invoice.dueDate ? formatDate(invoice.dueDate) : "Not specified" },
    ];
    metaColumns.forEach((column) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(column.label, column.x, y + 6);
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(column.value, column.x, y + 13);
    });
    doc.setTextColor(0, 0, 0);
    y += 27;

    // ── FROM / BILL TO ──
    const MID = 110;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("From:", LEFT, y);
    doc.text("Bill To:", MID, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    const fromLines = [
      invoice.fromName,
      invoice.fromAddress,
    ].filter(Boolean);

    const billToLines = [
      invoice.clientName,
      invoice.clientAddress,
      invoice.clientEmail,
      invoice.clientPhone,
    ].filter(Boolean);

    const COL_WIDTH = MID - LEFT - 6;

    const wrapLines = (lines) =>
      lines.flatMap((ln) => doc.splitTextToSize(cleanText(ln), COL_WIDTH));

    const wrappedFrom   = wrapLines(fromLines);
    const wrappedBillTo = wrapLines(billToLines);
    const maxRows = Math.max(wrappedFrom.length, wrappedBillTo.length);

    for (let i = 0; i < maxRows; i++) {
      checkPageBreak();
      if (wrappedFrom[i])   doc.text(wrappedFrom[i],   LEFT + 2, y);
      if (wrappedBillTo[i]) doc.text(wrappedBillTo[i], MID + 2,  y);
      y += 5;
    }

    y += 6;
    line(LEFT, y, RIGHT, y);
    y += 5;

    // ── ITEMS TABLE HEADER ──
    autoTable(doc, {
      startY: y,
      margin: { left: LEFT, right: 210 - RIGHT, top: HEADER_HEIGHT, bottom: 28 },
      head: [["Description", "Qty", "Rate (INR)", "Amount (INR)"]],
      body: invoice.items.map((item) => {
        const quantity = parseFloat(item.qty) || 0;
        const rate = parseFloat(item.rate) || 0;
        return [
          cleanText(item.description) || "Service / item",
          quantity.toFixed(quantity % 1 ? 2 : 0),
          rate.toFixed(2),
          (quantity * rate).toFixed(2),
        ];
      }),
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: { top: 3, right: 2.5, bottom: 3, left: 2.5 },
        lineColor: [203, 213, 225],
        lineWidth: 0.15,
        textColor: [30, 41, 59],
        valign: "middle",
        overflow: "linebreak",
      },
      headStyles: { fillColor: [0, 112, 184], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 88 },
        1: { cellWidth: 18, halign: "center" },
        2: { cellWidth: 32, halign: "right" },
        3: { cellWidth: 32, halign: "right", fontStyle: "bold" },
      },
      rowPageBreak: "avoid",
      willDrawPage: addBackgroundToAutoTablePage,
    });

    // ── ITEMS TABLE ROWS ──
    y = doc.lastAutoTable.finalY + 7;

    // ── TOTALS ──
    const TOTAL_LEFT = 120;
    const TOTAL_RIGHT = RIGHT;
    const addTotalRow = (label, value, bold = false) => {
      checkPageBreak(7);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(label, TOTAL_LEFT, y);
      doc.text(value, TOTAL_RIGHT, y, { align: "right" });
      y += 6;
    };

    addTotalRow("Subtotal:", `INR ${subtotal.toFixed(2)}`);
    if (invoice.taxRate) {
      addTotalRow(
        `GST (${invoice.taxRate}%):`,
        `INR ${taxAmount.toFixed(2)}`
      );
    }
    line(TOTAL_LEFT, y, TOTAL_RIGHT, y);
    y += 4;
    addTotalRow("Total:", `INR ${total.toFixed(2)}`, true);

    y += 5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const amountInWords = doc.splitTextToSize(
      `Amount in Words: ${numberToWords(Math.round(total))}`,
      CONTENT_WIDTH,
    );
    doc.text(amountInWords, LEFT, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    y += Math.max(8, amountInWords.length * 4 + 4);
    line(LEFT, y, RIGHT, y);
    y += 8;

    // ── PAYMENT HISTORY ──
    if (invoice.payments.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Payment Received:", LEFT, y);
      y += 5;

      // table header
      autoTable(doc, {
        startY: y,
        margin: { left: LEFT, right: 210 - RIGHT, top: HEADER_HEIGHT, bottom: 28 },
        head: [["Date", "Payment Method", "Reference / Note", "Amount (INR)"]],
        body: invoice.payments.map((payment) => [
          formatDate(payment.date),
          cleanText(payment.method),
          cleanText(payment.note) || "-",
          (parseFloat(payment.amount) || 0).toFixed(2),
        ]),
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 8.5,
          cellPadding: 2.5,
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
          textColor: [30, 41, 59],
          overflow: "linebreak",
        },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 38 },
          2: { cellWidth: 65 },
          3: { cellWidth: 35, halign: "right", fontStyle: "bold" },
        },
        rowPageBreak: "avoid",
        willDrawPage: addBackgroundToAutoTablePage,
      });

      y = doc.lastAutoTable.finalY + 7;
      doc.setFont("helvetica", "bold");
      addTotalRow("Total Paid:",    `INR ${totalPaid.toFixed(2)}`);
      addTotalRow("Balance Due:",   `INR ${balanceDue.toFixed(2)}`, true);

      y += 4;
      line(LEFT, y, RIGHT, y);
      y += 8;
    }

    // ── BANK DETAILS ──
    const bankFields = [
      ["Bank Name", invoice.bankName],
      ["Account Holder", invoice.accountHolder],
      ["Account Number", invoice.accountNumber],
      ["IFSC Code", invoice.ifsc],
    ].filter(([, v]) => v);

    if (bankFields.length) {
      checkPageBreak(6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Bank Details:", LEFT, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      bankFields.forEach(([label, value]) => {
        checkPageBreak(6);
        doc.text(`${label}: ${cleanText(value)}`, LEFT + 2, y);
        y += 5;
      });
      y += 5;
    }

    // ── NOTES ──
    if (invoice.notes) {
      checkPageBreak(8);
      doc.setFont("helvetica", "bold");
      doc.text("Note:", LEFT, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      const noteLines = doc.splitTextToSize(cleanText(invoice.notes), CONTENT_WIDTH - 4);
      noteLines.forEach((ln) => {
        checkPageBreak(6);
        doc.text(ln, LEFT + 2, y);
        y += 5;
      });
      y += 5;
    }

    // ── PAGE NUMBERS ──
    const stampWidth = stamp.naturalWidth ? stamp.naturalWidth * 25.4 / 96 * 0.8 : 44;
    const stampHeight = stamp.naturalHeight ? stamp.naturalHeight * 25.4 / 96 * 0.8 : 25;
    checkPageBreak(stampHeight + 16);
    const stampX = RIGHT - stampWidth;
    const stampCenterX = RIGHT - stampWidth / 2;
    if (stamp.naturalWidth) {
      doc.addImage(stamp, "PNG", stampX, y, stampWidth, stampHeight, "invoice-stamp", "FAST");
    }
    doc.setDrawColor(148, 163, 184);
    doc.line(stampX, y + stampHeight - 3, RIGHT, y + stampHeight - 3);
    y += stampHeight + 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Authorised Signatory", stampCenterX, y, { align: "center" });
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Goanny Technologies Pvt. Ltd.", stampCenterX, y, { align: "center" });
    doc.setTextColor(0, 0, 0);

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Page ${i} of ${pageCount}`, RIGHT, 282, { align: "right" });
    }

    doc.save(`${savedInvoice.invoiceNumber.replace(/\//g, "-")}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-5">
      <div className="mx-auto max-w-7xl space-y-4 [&_input]:outline-none [&_input]:transition [&_input]:focus:border-blue-400 [&_input]:focus:ring-2 [&_input]:focus:ring-blue-100 [&_label]:text-xs [&_label]:font-bold [&_label]:text-slate-600 [&_select]:outline-none [&_select]:transition [&_select]:focus:border-blue-400 [&_select]:focus:ring-2 [&_select]:focus:ring-blue-100 [&_textarea]:outline-none [&_textarea]:transition [&_textarea]:focus:border-blue-400 [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-blue-100">

        {/* TITLE */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/invoice" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Finance / Invoices / New</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Create Invoice</h2>
              <p className="mt-1 text-xs text-slate-500">Build, save, and download a professional client invoice.</p>
            </div>
          </div>
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-500">Invoice number</p>
            <p className="mt-1 font-mono text-sm font-black text-blue-800">{savedInvoice?.invoiceNumber || "Assigned by backend after saving"}</p>
          </div>
        </div>

        {/* INVOICE META */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><FileText className="h-4 w-4" /></span>
            <div><h3 className="text-sm font-black text-slate-900">Invoice Details</h3><p className="text-[11px] text-slate-500">Set the invoice reference and payment timeline.</p></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Invoice Date</label>
              <input
                type="date"
                value={invoice.date}
                onChange={(e) => set("date", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <input
                type="date"
                value={invoice.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">The final daily sequence and invoice number are assigned automatically when you save.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
        {/* FROM */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Building2 className="h-4 w-4" /></span>
            <div><h3 className="text-sm font-black text-slate-900">From</h3><p className="text-[11px] text-slate-500">Your company and registered address.</p></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Company Name</label>
              <input
                type="text"
                value={invoice.fromName}
                onChange={(e) => set("fromName", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <input
                type="text"
                value={invoice.fromAddress}
                onChange={(e) => set("fromAddress", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
              />
            </div>
          </div>
        </div>

        {/* CLIENT DETAILS */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ReceiptText className="h-4 w-4" /></span>
            <div><h3 className="text-sm font-black text-slate-900">Bill To</h3><p className="text-[11px] text-slate-500">Select a client to fill their billing details.</p></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Select Client</label>
              <select
                value={selectedClientId}
                onChange={(event) => void selectClient(clients.find((client) => client.id === event.target.value))}
                disabled={clientLoading}
                className="border p-2 rounded-lg w-full mt-1 bg-white"
              >
                <option value="">{clientLoading ? "Loading client details..." : "Choose a client"}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName}{client.clientCode ? ` (${client.clientCode})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Client / Company Name</label>
              <input
                type="text"
                value={invoice.clientName}
                onChange={(e) => set("clientName", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
                placeholder="Client Name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={invoice.clientEmail}
                onChange={(e) => set("clientEmail", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
                placeholder="client@email.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input
                type="text"
                value={invoice.clientPhone}
                onChange={(e) => set("clientPhone", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <textarea
                value={invoice.clientAddress}
                onChange={(e) => set("clientAddress", e.target.value)}
                className="mt-1 min-h-[74px] w-full rounded-lg border p-2"
                placeholder="Billing address from client profile"
              />
            </div>
          </div>
        </div>
        </div>

        {/* LINE ITEMS */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><WalletCards className="h-4 w-4" /></span>
              <div><h3 className="text-sm font-black text-slate-900">Line Items</h3><p className="text-[11px] text-slate-500">Add services, quantities, and rates.</p></div>
            </div>
            <button onClick={addItem} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">
              <Plus className="h-3.5 w-3.5" /> Add Item
            </button>
          </div>

          <div className="hidden sm:grid grid-cols-12 gap-2 text-sm font-semibold text-gray-600 px-1">
            <div className="col-span-6">Description</div>
            <div className="col-span-2">Qty</div>
            <div className="col-span-2">Rate (INR)</div>
            <div className="col-span-1">Amount</div>
          </div>

          {invoice.items.map((item, index) => {
            const amt =
              (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
            return (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <input
                  placeholder="Service / Item description"
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  className="border p-2 rounded-lg col-span-12 sm:col-span-6"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.qty}
                  onChange={(e) => updateItem(index, "qty", e.target.value)}
                  className="border p-2 rounded-lg col-span-4 sm:col-span-2"
                />
                <input
                  type="number"
                  placeholder="Rate"
                  value={item.rate}
                  onChange={(e) => updateItem(index, "rate", e.target.value)}
                  className="border p-2 rounded-lg col-span-4 sm:col-span-2"
                />
                <div className="col-span-3 sm:col-span-1 text-sm font-medium text-gray-700">
                  {amt.toFixed(2)}
                </div>
                <button
                  onClick={() => removeItem(index)}
                  className="col-span-1 text-red-500 hover:text-red-700 font-bold text-lg"
                >
                  ×
                </button>
              </div>
            );
          })}

        </div>

        {/* TOTALS */}
        <div className="flex justify-end rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="w-full space-y-3 rounded-2xl bg-slate-950 p-5 text-sm text-white sm:w-96">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>INR {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span>GST (%)</span>
              <input
                type="number"
                value={invoice.taxRate}
                onChange={(e) => set("taxRate", e.target.value)}
                className="border p-1 rounded w-16 text-right"
              />
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Tax Amount</span>
              <span>INR {taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-white/15 pt-3 text-lg font-black">
              <span>Total</span>
              <span>INR {total.toFixed(2)}</span>
            </div>
            <div className="pt-1 text-xs italic text-slate-400">
              {numberToWords(Math.round(total))}
            </div>
          </div>
        </div>

        {/* PAYMENTS RECEIVED */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div><h3 className="text-sm font-black text-slate-900">Payments Received</h3><p className="text-[11px] text-slate-500">Record any advance or partial payment.</p></div>
            <button onClick={addPayment} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">
              <Plus className="h-3.5 w-3.5" /> Add Payment
            </button>
          </div>

          {invoice.payments.length > 0 && (
            <div className="hidden sm:grid grid-cols-12 gap-2 text-sm font-semibold text-gray-600 px-1">
              <div className="col-span-3">Date</div>
              <div className="col-span-3">Method</div>
              <div className="col-span-3">Note</div>
              <div className="col-span-2">Amount (INR)</div>
            </div>
          )}

          {invoice.payments.map((p, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <input
                type="date"
                value={p.date}
                onChange={(e) => updatePayment(index, "date", e.target.value)}
                className="border p-2 rounded-lg col-span-12 sm:col-span-3"
              />
              <select
                value={p.method}
                onChange={(e) => updatePayment(index, "method", e.target.value)}
                className="border p-2 rounded-lg col-span-6 sm:col-span-3"
              >
                <option>Bank Transfer</option>
                <option>Cash</option>
                <option>UPI</option>
                <option>Cheque</option>
                <option>Other</option>
              </select>
              <input
                placeholder="Note (optional)"
                value={p.note}
                onChange={(e) => updatePayment(index, "note", e.target.value)}
                className="border p-2 rounded-lg col-span-10 sm:col-span-3"
              />
              <input
                type="number"
                placeholder="Amount"
                value={p.amount}
                onChange={(e) => updatePayment(index, "amount", e.target.value)}
                className="border p-2 rounded-lg col-span-10 sm:col-span-2"
              />
              <button
                onClick={() => removePayment(index)}
                className="col-span-2 sm:col-span-1 text-red-500 hover:text-red-700 font-bold text-lg"
              >
                ×
              </button>
            </div>
          ))}

          {invoice.payments.length > 0 && (
            <div className="flex justify-end">
              <div className="space-y-2 w-full sm:w-72 text-sm border-t pt-3">
                <div className="flex justify-between text-green-700 font-medium">
                  <span>Total Paid</span>
                  <span>INR {totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-red-600">
                  <span>Balance Due</span>
                  <span>INR {balanceDue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BANK DETAILS */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3"><h3 className="text-sm font-black text-slate-900">Bank Details</h3><p className="text-[11px] text-slate-500">Payment account displayed on the PDF.</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Account Holder</label>
              <input
                type="text"
                value={invoice.accountHolder}
                onChange={(e) => set("accountHolder", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Bank Name</label>
              <input
                type="text"
                value={invoice.bankName}
                onChange={(e) => set("bankName", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Account Number</label>
              <input
                type="text"
                value={invoice.accountNumber}
                onChange={(e) => set("accountNumber", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
                placeholder="XXXXXXXXXXXXXXXXXX"
              />
            </div>
            <div>
              <label className="text-sm font-medium">IFSC Code</label>
              <input
                type="text"
                value={invoice.ifsc}
                onChange={(e) => set("ifsc", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
                placeholder="HDFC0000000"
              />
            </div>
          </div>
        </div>

        {/* NOTES */}
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3"><h3 className="text-sm font-black text-slate-900">Terms & Notes</h3><p className="text-[11px] text-slate-500">Add payment terms or customer instructions.</p></div>
          <textarea
            value={invoice.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="border p-3 w-full rounded-lg min-h-[80px] focus:ring-2 focus:ring-black"
          />
        </div>

        {/* SAVE / GENERATE */}
        {saveError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {saveError}
          </div>
        ) : null}
        {savedInvoice?.invoiceNumber ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            <span>Invoice {savedInvoice.invoiceNumber} created successfully.</span>
            <Link href={`/invoice?invoiceId=${savedInvoice.id}`} className="font-black text-blue-700 hover:underline">View invoice</Link>
          </div>
        ) : null}
        <div className="sticky bottom-3 z-20 grid gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_16px_45px_rgba(15,23,42,0.16)] backdrop-blur sm:grid-cols-2">
          <button
            type="button"
            onClick={saveInvoice}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Invoice..." : "Save Invoice"}
          </button>
          <button
            type="button"
            onClick={generatePDF}
            disabled={!savedInvoice?.invoiceNumber}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-black text-white shadow-lg hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Generate Invoice PDF
          </button>
        </div>

      </div>
    </div>
  );
}
