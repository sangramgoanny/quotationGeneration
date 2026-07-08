"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";

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

const generateReceiptNumber = (clientName, serial) => {
  const clientShort = clientName
    ? clientName.replace(/[^A-Za-z]/g, "").substring(0, 2).toUpperCase()
    : "CL";
  const today = new Date();
  const datePart =
    String(today.getDate()).padStart(2, "0") +
    String(today.getMonth() + 1).padStart(2, "0") +
    today.getFullYear();
  const serialPart = serial ? String(serial).padStart(3, "0") : "001";
  return `GO/${clientShort}/RCT/${datePart}/${serialPart}`;
};

export default function ReceiptGenerator() {
  const [receipt, setReceipt] = useState({
    serial: "",
    date: new Date().toISOString().split("T")[0],
    fromName: "Goanny Technologies Pvt Ltd",
    fromAddress: "U7 - 1st Floor, Inspiria Mall, Near Bhakti Shakti, Nigdi, Pune - 411044",
    clientName: "",
    clientAddress: "",
    clientEmail: "",
    clientPhone: "",
    invoiceRef: "",
    paymentMethod: "Bank Transfer",
    items: [{ description: "", amount: "" }],
    notes: "Thank you for your payment. This is a computer-generated receipt.",
  });

  const set = (key, value) => setReceipt((prev) => ({ ...prev, [key]: value }));

  const addItem = () =>
    set("items", [...receipt.items, { description: "", amount: "" }]);

  const updateItem = (index, field, value) => {
    const updated = [...receipt.items];
    updated[index][field] = value;
    set("items", updated);
  };

  const removeItem = (index) =>
    set("items", receipt.items.filter((_, i) => i !== index));

  const total = receipt.items.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );

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

    const addBackground = () => doc.addImage(img, "JPEG", 0, 0, 210, 297);

    const newPage = () => {
      doc.addPage();
      addBackground();
      y = HEADER_HEIGHT;
    };

    const checkPageBreak = (space = 8) => {
      if (y + space > FOOTER_LIMIT) newPage();
    };

    const line = (x1, y1, x2, y2, width = 0.3) => {
      doc.setLineWidth(width);
      doc.line(x1, y1, x2, y2);
    };

    addBackground();
    y = HEADER_HEIGHT;

    // ── TITLE ──
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT RECEIPT", 105, y, { align: "center" });
    y += 5;
    line(LEFT, y, RIGHT, y);
    y += 8;

    // ── RECEIPT META ──
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Receipt No: ${generateReceiptNumber(receipt.clientName, receipt.serial)}`, LEFT, y);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formatDate(receipt.date)}`, RIGHT, y, { align: "right" });
    y += 6;

    if (receipt.invoiceRef) {
      doc.text(`Invoice Ref: ${cleanText(receipt.invoiceRef)}`, LEFT, y);
      y += 6;
    }

    y += 4;

    // ── FROM / RECEIVED FROM ──
    const MID = 110;
    const COL_WIDTH = MID - LEFT - 6;

    doc.setFont("helvetica", "bold");
    doc.text("From:",          LEFT, y);
    doc.text("Received From:", MID,  y);
    y += 5;

    doc.setFont("helvetica", "normal");
    const fromLines   = [receipt.fromName, receipt.fromAddress].filter(Boolean);
    const clientLines = [receipt.clientName, receipt.clientAddress, receipt.clientEmail, receipt.clientPhone].filter(Boolean);

    const wrapLines = (lines) =>
      lines.flatMap((ln) => doc.splitTextToSize(cleanText(ln), COL_WIDTH));

    const wrappedFrom   = wrapLines(fromLines);
    const wrappedClient = wrapLines(clientLines);
    const maxRows = Math.max(wrappedFrom.length, wrappedClient.length);

    for (let i = 0; i < maxRows; i++) {
      checkPageBreak();
      if (wrappedFrom[i])   doc.text(wrappedFrom[i],   LEFT + 2, y);
      if (wrappedClient[i]) doc.text(wrappedClient[i], MID + 2,  y);
      y += 5;
    }

    y += 5;
    line(LEFT, y, RIGHT, y);
    y += 8;

    // ── PAYMENT METHOD BADGE ──
    doc.setFont("helvetica", "bold");
    doc.text("Payment Method:", LEFT, y);
    doc.setFont("helvetica", "normal");
    doc.text(cleanText(receipt.paymentMethod), LEFT + 42, y);
    y += 10;

    // ── ITEMS TABLE ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.rect(LEFT, y, CONTENT_WIDTH, 8);
    doc.text("Description",  LEFT + 2,   y + 5.5);
    doc.text("Amount (INR)", LEFT + 148, y + 5.5);
    y += 8;

    doc.setFont("helvetica", "normal");
    receipt.items.forEach((item) => {
      checkPageBreak(9);
      doc.rect(LEFT, y, CONTENT_WIDTH, 8);
      doc.text(cleanText(item.description), LEFT + 2,   y + 5.5);
      doc.text(parseFloat(item.amount || 0).toFixed(2), LEFT + 148, y + 5.5);
      y += 8;
    });

    y += 4;

    // ── TOTAL ──
    const TOTAL_LEFT = 120;
    line(TOTAL_LEFT, y, RIGHT, y, 0.5);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Total Amount Received:", TOTAL_LEFT, y);
    doc.text(`INR ${total.toFixed(2)}`, RIGHT, y, { align: "right" });
    y += 6;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(`Amount in Words: ${numberToWords(Math.round(total))}`, LEFT, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    y += 10;
    line(LEFT, y, RIGHT, y);
    y += 8;

    // ── NOTES ──
    if (receipt.notes) {
      checkPageBreak(10);
      doc.setFont("helvetica", "bold");
      doc.text("Note:", LEFT, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      const noteLines = doc.splitTextToSize(cleanText(receipt.notes), CONTENT_WIDTH - 4);
      noteLines.forEach((ln) => {
        checkPageBreak(6);
        doc.text(ln, LEFT + 2, y);
        y += 5;
      });
      y += 5;
    }

    // ── STAMP / SIGN AREA ──
    checkPageBreak(30);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("For Goanny Technologies Pvt Ltd", RIGHT, y, { align: "right" });
    y += 18;
    line(RIGHT - 55, y, RIGHT, y, 0.3);
    y += 4;
    doc.text("Authorized Signatory", RIGHT, y, { align: "right" });

    // ── PAGE NUMBERS ──
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
    }

    doc.save(`Receipt-${generateReceiptNumber(receipt.clientName, receipt.serial)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-2xl space-y-10">

        {/* TITLE */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Receipt Generator</h2>
          <p className="text-gray-500 text-sm">Generate payment receipts with company letterhead</p>
        </div>

        {/* RECEIPT META */}
        <div className="bg-gray-50 border rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Receipt Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Serial No</label>
              <input
                type="number"
                value={receipt.serial}
                onChange={(e) => set("serial", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
                placeholder="e.g. 1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Receipt Date</label>
              <input
                type="date"
                value={receipt.date}
                onChange={(e) => set("date", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Invoice Ref (optional)</label>
              <input
                type="text"
                value={receipt.invoiceRef}
                onChange={(e) => set("invoiceRef", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
                placeholder="GO/CL/INV/..."
              />
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Receipt No:{" "}
            <span className="font-semibold">
              {generateReceiptNumber(receipt.clientName, receipt.serial)}
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
                value={receipt.fromName}
                onChange={(e) => set("fromName", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <input
                type="text"
                value={receipt.fromAddress}
                onChange={(e) => set("fromAddress", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
              />
            </div>
          </div>
        </div>

        {/* RECEIVED FROM */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Received From</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Client / Company Name</label>
              <input
                type="text"
                value={receipt.clientName}
                onChange={(e) => set("clientName", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
                placeholder="Client Name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={receipt.clientEmail}
                onChange={(e) => set("clientEmail", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
                placeholder="client@email.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <input
                type="text"
                value={receipt.clientPhone}
                onChange={(e) => set("clientPhone", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <input
                type="text"
                value={receipt.clientAddress}
                onChange={(e) => set("clientAddress", e.target.value)}
                className="border p-2 rounded-lg w-full mt-1"
                placeholder="City, State"
              />
            </div>
          </div>
        </div>

        {/* PAYMENT METHOD */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold border-b pb-2">Payment Method</h3>
          <select
            value={receipt.paymentMethod}
            onChange={(e) => set("paymentMethod", e.target.value)}
            className="border p-2 rounded-lg w-full sm:w-64"
          >
            <option>Bank Transfer</option>
            <option>Cash</option>
            <option>UPI</option>
            <option>Cheque</option>
            <option>Other</option>
          </select>
        </div>

        {/* ITEMS */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Payment For</h3>

          {receipt.items.length > 0 && (
            <div className="hidden sm:grid grid-cols-12 gap-2 text-sm font-semibold text-gray-600 px-1">
              <div className="col-span-9">Description</div>
              <div className="col-span-2">Amount (INR)</div>
            </div>
          )}

          {receipt.items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <input
                placeholder="Service / description"
                value={item.description}
                onChange={(e) => updateItem(index, "description", e.target.value)}
                className="border p-2 rounded-lg col-span-12 sm:col-span-9"
              />
              <input
                type="number"
                placeholder="Amount"
                value={item.amount}
                onChange={(e) => updateItem(index, "amount", e.target.value)}
                className="border p-2 rounded-lg col-span-10 sm:col-span-2"
              />
              <button
                onClick={() => removeItem(index)}
                className="col-span-2 sm:col-span-1 text-red-500 hover:text-red-700 font-bold text-lg"
              >
                ×
              </button>
            </div>
          ))}

          <button
            onClick={addItem}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg"
          >
            + Add Item
          </button>
        </div>

        {/* TOTAL */}
        <div className="flex justify-end">
          <div className="space-y-2 w-full sm:w-72 text-sm border-t pt-3">
            <div className="flex justify-between font-bold text-base">
              <span>Total Amount Received</span>
              <span>INR {total.toFixed(2)}</span>
            </div>
            <div className="text-xs text-gray-500 italic">
              {numberToWords(Math.round(total))}
            </div>
          </div>
        </div>

        {/* NOTES */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold border-b pb-2">Notes</h3>
          <textarea
            value={receipt.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="border p-3 w-full rounded-lg min-h-[80px] focus:ring-2 focus:ring-black"
          />
        </div>

        {/* GENERATE */}
        <button
          onClick={generatePDF}
          className="w-full bg-black text-white py-4 rounded-xl text-lg shadow-lg hover:bg-gray-900"
        >
          Generate Receipt PDF
        </button>

      </div>
    </div>
  );
}
