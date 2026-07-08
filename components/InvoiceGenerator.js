"use client";

import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";

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

const generateInvoiceNumber = (clientName, serial) => {
  const clientShort = clientName
    ? clientName.replace(/[^A-Za-z]/g, "").substring(0, 2).toUpperCase()
    : "CL";
  const today = new Date();
  const datePart =
    String(today.getDate()).padStart(2, "0") +
    String(today.getMonth() + 1).padStart(2, "0") +
    today.getFullYear();
  const serialPart = serial ? String(serial).padStart(3, "0") : "001";
  return `GO/${clientShort}/INV/${datePart}/${serialPart}`;
};

export default function InvoiceGenerator() {
  const [invoice, setInvoice] = useState({
    serial: "",
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

  const generatePDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");

    const img = new Image();
    img.src = "/letterhead.jpg";
    await new Promise((res) => (img.onload = res));

    const LEFT = 20;
    const RIGHT = 190;
    const CONTENT_WIDTH = 170;
    const HEADER_HEIGHT = 48;
    const FOOTER_LIMIT = 270;

    let y;

    const addBackground = () => {
      doc.addImage(img, "JPEG", 0, 0, 210, 297);
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
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Invoice No: ${generateInvoiceNumber(invoice.clientName, invoice.serial)}`,
      LEFT,
      y
    );
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formatDate(invoice.date)}`, RIGHT, y, { align: "right" });
    y += 6;

    if (invoice.dueDate) {
      doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, RIGHT, y, {
        align: "right",
      });
    }

    y += 8;

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
    const COL = { desc: LEFT, qty: 100, rate: 130, amount: 165 };
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.rect(LEFT, y, CONTENT_WIDTH, 8);
    doc.text("Description", COL.desc + 2, y + 5.5);
    doc.text("Qty", COL.qty + 2, y + 5.5);
    doc.text("Rate (INR)", COL.rate + 2, y + 5.5);
    doc.text("Amount", COL.amount + 2, y + 5.5);
    y += 8;

    // ── ITEMS TABLE ROWS ──
    doc.setFont("helvetica", "normal");
    invoice.items.forEach((item) => {
      checkPageBreak(10);
      const amt =
        (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
      doc.rect(LEFT, y, CONTENT_WIDTH, 8);
      doc.text(cleanText(item.description), COL.desc + 2, y + 5.5);
      doc.text(String(item.qty), COL.qty + 2, y + 5.5);
      doc.text(cleanText(item.rate), COL.rate + 2, y + 5.5);
      doc.text(amt.toFixed(2), COL.amount + 2, y + 5.5);
      y += 8;
    });

    y += 4;

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
    doc.text(`Amount in Words: ${numberToWords(Math.round(total))}`, LEFT, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    y += 8;
    line(LEFT, y, RIGHT, y);
    y += 8;

    // ── PAYMENT HISTORY ──
    if (invoice.payments.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Payment Received:", LEFT, y);
      y += 5;

      // table header
      doc.rect(LEFT, y, CONTENT_WIDTH, 7);
      doc.text("Date",        LEFT + 2,  y + 5);
      doc.text("Method",      LEFT + 40, y + 5);
      doc.text("Note",        LEFT + 85, y + 5);
      doc.text("Amount",      LEFT + 148, y + 5);
      y += 7;

      doc.setFont("helvetica", "normal");
      invoice.payments.forEach((p) => {
        checkPageBreak(8);
        doc.rect(LEFT, y, CONTENT_WIDTH, 7);
        doc.text(cleanText(formatDate(p.date)),  LEFT + 2,  y + 5);
        doc.text(cleanText(p.method),            LEFT + 40, y + 5);
        doc.text(cleanText(p.note),              LEFT + 85, y + 5);
        doc.text(`INR ${parseFloat(p.amount || 0).toFixed(2)}`, LEFT + 148, y + 5);
        y += 7;
      });

      y += 4;
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
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
    }

    doc.save(`Invoice-${generateInvoiceNumber(invoice.clientName, invoice.serial)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-2xl space-y-10">

        {/* TITLE */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Invoice Generator</h2>
          <p className="text-gray-500 text-sm">Create professional invoices with company letterhead</p>
        </div>

        {/* INVOICE META */}
        <div className="bg-gray-50 border rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Invoice Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Serial No</label>
              <input
                type="number"
                value={invoice.serial}
                onChange={(e) => set("serial", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
                placeholder="e.g. 1"
              />
            </div>
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
          <div className="mt-2 text-sm text-gray-600">
            Invoice No:{" "}
            <span className="font-semibold">
              {generateInvoiceNumber(invoice.clientName, invoice.serial)}
            </span>
          </div>
        </div>

        {/* FROM */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">From</h3>
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
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Bill To</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <input
                type="text"
                value={invoice.clientAddress}
                onChange={(e) => set("clientAddress", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
                placeholder="City, State"
              />
            </div>
          </div>
        </div>

        {/* LINE ITEMS */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Line Items</h3>

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

          <button
            onClick={addItem}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg"
          >
            + Add Item
          </button>
        </div>

        {/* TOTALS */}
        <div className="flex justify-end">
          <div className="space-y-2 w-full sm:w-72 text-sm">
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
            <div className="flex justify-between text-gray-500">
              <span>Tax Amount</span>
              <span>INR {taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span>
              <span>INR {total.toFixed(2)}</span>
            </div>
            <div className="text-xs text-gray-500 italic pt-1">
              {numberToWords(Math.round(total))}
            </div>
          </div>
        </div>

        {/* PAYMENTS RECEIVED */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Payments Received</h3>

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

          <button
            onClick={addPayment}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg"
          >
            + Add Payment
          </button>

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
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Bank Details</h3>
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
        <div className="space-y-2">
          <h3 className="text-lg font-semibold border-b pb-2">Notes</h3>
          <textarea
            value={invoice.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="border p-3 w-full rounded-lg min-h-[80px] focus:ring-2 focus:ring-black"
          />
        </div>

        {/* GENERATE */}
        <button
          onClick={generatePDF}
          className="w-full bg-black text-white py-4 rounded-xl text-lg shadow-lg hover:bg-gray-900"
        >
          Generate Invoice PDF
        </button>

      </div>
    </div>
  );
}
