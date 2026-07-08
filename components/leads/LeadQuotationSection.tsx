"use client";

import React, { useState, useEffect, useCallback } from "react";
import { jsPDF } from "jspdf";
import {
  Download, Eye, FileText, Plus, X, Trash2, ChevronDown, ChevronUp,
  User, MapPin, Hash, Calendar, IndianRupee, Loader2, Pencil,
} from "lucide-react";
import {
  quotationsApi,
  type Quotation,
  type QuotationListItem,
  type CreateQuotationPayload,
  type QuotationStatus,
} from "@/lib/api/quotations";
import { type TimelinePhase, type TimelineUnit } from "@/lib/quotationStore";

const UNIT_TO_DAYS: Record<TimelineUnit, number> = { Days: 1, Weeks: 7, Months: 30 };
const UNIT_TO_API: Record<TimelineUnit, "DAYS" | "WEEKS" | "MONTHS"> = { Days: "DAYS", Weeks: "WEEKS", Months: "MONTHS" };
const API_TO_UNIT: Record<string, TimelineUnit> = { DAYS: "Days", WEEKS: "Weeks", MONTHS: "Months" };
const totalTimelineDays = (timeline: TimelinePhase[]) =>
  timeline.reduce((s, p) => s + (Number(p.duration) || 0) * UNIT_TO_DAYS[p.unit], 0);

// ─── Status badge (matches the main /quotation list design) ──────────────────

const STATUS_COLORS: Record<QuotationStatus, string> = {
  DRAFT:    "bg-slate-100 text-slate-600",
  SENT:     "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED:  "bg-amber-100 text-amber-700",
};

const STATUSES: QuotationStatus[] = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];

function StatusBadge({ status }: { status: QuotationStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}

function StatusSelect({ status, onChange, disabled }: { status: QuotationStatus; onChange: (s: QuotationStatus) => void; disabled?: boolean }) {
  return (
    <select
      value={status}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as QuotationStatus)}
      className={`text-[11px] font-semibold rounded-full px-2 py-0.5 border-0 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${STATUS_COLORS[status]}`}
    >
      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PricingRow { description: string; cost: string }
interface ScopeService { title: string; details: string[] }

interface QuotationContract {
  clientName: string;
  quotationSerial: string;
  date: string;
  subject: string;
  introParagraph: string;
  scope: ScopeService[];
  paymentTerms: string[];
  termsConditions: string[];
  pricing: PricingRow[];
  timeline: TimelinePhase[];
  note: string;
  totalAmount: string;
}

interface SavedQuotation {
  id: string;
  quotationNumber: string;
  date: string;
  subject: string;
  totalAmount: string;
  createdAt: string;
  status: QuotationStatus;
  contractData?: QuotationContract;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COMPANY_SHORT = "GO";

function buildQuotationNumber(clientName: string, serial: string) {
  const clientShort = clientName
    ? clientName.replace(/[^A-Za-z]/g, "").substring(0, 2).toUpperCase()
    : "CL";
  const t = new Date();
  const datePart =
    String(t.getDate()).padStart(2, "0") +
    String(t.getMonth() + 1).padStart(2, "0") +
    t.getFullYear();
  const serialPart = serial ? String(serial).padStart(3, "0") : "000";
  return `${COMPANY_SHORT}${clientShort}${datePart}${serialPart}`;
}

function mapListItemToSaved(q: QuotationListItem): SavedQuotation {
  return {
    id: q.id,
    quotationNumber: q.quotationNumber,
    date: q.date,
    subject: q.subject,
    totalAmount: String(q.totalAmount ?? ""),
    createdAt: q.createdAt,
    status: q.status,
  };
}

function mapQuotationToContract(q: Quotation): QuotationContract {
  // Timeline isn't part of the API response type yet — read defensively so it activates automatically once added.
  const rawTimeline = (q as unknown as { timeline?: Array<{ phase: string; description?: string; duration: number; unit: string }> }).timeline ?? [];
  return {
    clientName: q.clientName,
    quotationSerial: "",
    date: q.date ? q.date.slice(0, 10) : "",
    subject: q.subject,
    introParagraph: q.introParagraph || "",
    scope: q.scope.map((s) => ({ title: s.title, details: s.details })),
    paymentTerms: q.paymentTerms.map((t) => t.term),
    termsConditions: q.termsConditions.map((t) => t.term),
    pricing: q.pricing.map((p) => ({ description: p.description, cost: String(p.cost) })),
    timeline: rawTimeline.map((p) => ({
      phase: p.phase,
      description: p.description ?? "",
      duration: Number(p.duration) || 0,
      unit: API_TO_UNIT[p.unit] ?? "Days",
    })),
    note: q.note || "",
    totalAmount: String(q.totalAmount ?? ""),
  };
}

function mapQuotationToSaved(q: Quotation): SavedQuotation {
  return {
    id: q.id,
    quotationNumber: q.quotationNumber,
    date: q.date,
    subject: q.subject,
    totalAmount: String(q.totalAmount ?? ""),
    createdAt: q.createdAt,
    status: q.status,
    contractData: mapQuotationToContract(q),
  };
}

function mapContractToPayload(clientId: string, contract: QuotationContract): CreateQuotationPayload & { timeline?: unknown[] } {
  return {
    clientId,
    clientName: contract.clientName,
    clientAddress: "",
    subject: contract.subject,
    date: contract.date,
    introParagraph: contract.introParagraph,
    note: contract.note,
    scope: contract.scope.map((s, i) => ({ title: s.title, details: s.details, sortOrder: i })),
    pricing: contract.pricing.map((p, i) => ({
      description: p.description,
      cost: Number(String(p.cost).replace(/,/g, "")) || 0,
      sortOrder: i,
    })),
    // Timeline isn't in CreateQuotationPayload's declared type yet — sent via a widened return type.
    timeline: contract.timeline
      .filter((p) => p.phase.trim())
      .map((p, i) => ({
        phase: p.phase,
        description: p.description,
        duration: Number(p.duration) || 0,
        unit: UNIT_TO_API[p.unit],
        sortOrder: i,
      })),
    paymentTerms: contract.paymentTerms.map((term, i) => ({ term, sortOrder: i })),
    termsConditions: contract.termsConditions.map((term, i) => ({ term, sortOrder: i })),
  };
}

const cleanText = (t?: string) =>
  t ? t.replace(/[^\x00-\x7F]/g, "").trim() : "";

const toNum = (v: string) => Number(String(v).replace(/,/g, "")) || 0;

// ─── View Modal theme (mirrors the design used on the main /quotation page) ───

const NAVY = "#1C3660";

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}
function fmtAmt(v: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(toNum(v));
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="w-1 h-4 rounded-sm shrink-0" style={{ backgroundColor: NAVY }} />
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: NAVY }}>
        {n}. {children}
      </p>
      <span className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

async function generatePDF(contract: QuotationContract) {
  const doc = new jsPDF("p", "mm", "a4");

  const img = new Image();
  img.src = "/letterhead.jpg";
  await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); });
  const hasLH = img.complete && img.naturalWidth > 0;
  const addBg = () => { if (hasLH) doc.addImage(img, "JPEG", 0, 0, 210, 297); };

  const stamp = new Image();
  stamp.src = "/goanny_stamp.png";
  await new Promise<void>((res) => { stamp.onload = () => res(); stamp.onerror = () => res(); });
  const hasStamp = stamp.complete && stamp.naturalWidth > 0;

  const pdfAmt = (v: string) => "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(toNum(v));

  const L = 18, R = 192, W = 174;
  const START_Y = 48;
  const FOOTER_Y = 272;
  let y = START_Y;
  addBg();

  const C = {
    navy:    [28,  54,  96] as [number,number,number],
    tint:    [237,243,253] as [number,number,number],
    stripe:  [248,250,252] as [number,number,number],
    dark:    [18,  24,  40] as [number,number,number],
    body:    [55,  65,  81] as [number,number,number],
    label:   [107,114,128] as [number,number,number],
    border:  [220,226,235] as [number,number,number],
    white:   [255,255,255] as [number,number,number],
    amberBg: [255,251,235] as [number,number,number],
    amber:   [217,119,  6] as [number,number,number],
  };

  const sc = (c: [number,number,number]) => doc.setTextColor(...c);
  const sf = (c: [number,number,number]) => doc.setFillColor(...c);
  const sd = (c: [number,number,number]) => doc.setDrawColor(...c);
  const ln = (g = 5) => { y += g; };

  const checkBreak = (need = 8) => {
    if (y + need > FOOTER_Y) { doc.addPage(); addBg(); y = START_Y; }
  };

  const tf = (bold: boolean, size: number) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
  };

  const para = (text: string, bold: boolean, size: number, color: [number,number,number], indent = 0, gap = 5) => {
    tf(bold, size); sc(color);
    (doc.splitTextToSize(cleanText(text), W - indent) as string[]).forEach(line => {
      checkBreak(gap + 1); doc.text(line, L + indent, y); y += gap;
    });
  };

  const secHead = (label: string) => {
    checkBreak(14); ln(4);
    sf(C.navy); doc.rect(L, y - 4.5, 1.4, 7, "F");
    tf(true, 10); sc(C.navy);
    doc.text(label, L + 6, y);
    const labelEndX = L + 6 + doc.getTextWidth(label);
    sd(C.border); doc.setLineWidth(0.18);
    doc.line(labelEndX + 3, y - 1.5, R, y - 1.5);
    ln(8);
  };

  const quotationNumber = buildQuotationNumber(contract.clientName, contract.quotationSerial);

  // 1. TITLE
  tf(true, 18); sc(C.navy);
  doc.text("QUOTATION", 105, y, { align: "center" });
  ln(4);
  sd(C.navy); doc.setLineWidth(0.5);
  doc.line(L, y, R, y);
  ln(8);

  // 2. META CARDS (Quot No | Date)
  checkBreak(16);
  const dateStr = new Date(contract.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const metaGap = 4;
  const metaCardW = (W - metaGap) / 2;
  const metaCardH = 13;

  sf(C.stripe); doc.roundedRect(L, y, metaCardW, metaCardH, 2, 2, "F");
  tf(false, 7); sc(C.label);
  doc.text("QUOTATION NO.", L + 5, y + 5);
  tf(true, 10); sc(C.dark);
  doc.text(quotationNumber, L + 5, y + 10.5);

  const metaCard2X = L + metaCardW + metaGap;
  const metaCard2RightX = metaCard2X + metaCardW - 5;
  sf(C.stripe); doc.roundedRect(metaCard2X, y, metaCardW, metaCardH, 2, 2, "F");
  tf(false, 7); sc(C.label);
  doc.text("DATE", metaCard2RightX, y + 5, { align: "right" });
  tf(true, 10); sc(C.dark);
  doc.text(dateStr, metaCard2RightX, y + 10.5, { align: "right" });

  y += metaCardH; ln(8);

  // 3. BILL TO
  checkBreak(24);
  const blockH = 7 + 6;
  sf(C.stripe); doc.roundedRect(L, y, W, blockH, 2.5, 2.5, "F");
  sf(C.navy); doc.roundedRect(L, y, 1.4, blockH, 0.7, 2.5, "F");
  sd(C.border); doc.setLineWidth(0.12);
  doc.roundedRect(L, y, W, blockH, 2.5, 2.5, "D");

  const drawUserIcon = (cx: number, cy: number) => {
    sf(C.label);
    doc.circle(cx, cy - 0.7, 0.9, "F");
    doc.ellipse(cx, cy + 1.3, 1.5, 1.0, "F");
  };

  tf(true, 7); sc(C.label);
  doc.text("BILL TO", L + 8, y + 4.5);
  drawUserIcon(L + 9, y + 9.3);
  tf(true, 12); sc(C.dark);
  doc.text(contract.clientName || "Client", L + 12, y + 10.5);
  y += blockH; ln(8);

  // 4. SUBJECT
  checkBreak(14);
  tf(false, 7.5); sc(C.label);
  doc.text("SUBJECT", L, y); ln(5);
  tf(true, 12); sc(C.dark);
  doc.text(contract.subject, L, y); ln(4);
  sd(C.border); doc.setLineWidth(0.18);
  doc.line(L, y, R, y); ln(7);

  // 5. INTRODUCTION
  if (contract.introParagraph) {
    tf(true, 10); sc(C.dark);
    doc.text(`Dear ${contract.clientName},`, L, y); ln(5.5);
    para(contract.introParagraph, false, 10, C.body, 0, 5);
    ln(5);
  }

  // 6. SCOPE OF WORK
  if (contract.scope.filter(s => s.title.trim()).length) {
    secHead("1.  SCOPE OF WORK");
    contract.scope.filter(s => s.title.trim()).forEach((s, si) => {
      const detailLineGroups = s.details.filter(Boolean).map(d => doc.splitTextToSize(d, W - 24) as string[]);
      const detailsH = detailLineGroups.reduce((sum, lines) => sum + lines.length * 4.5 + 2, 0);
      const cardH = 9 + detailsH + 4;
      checkBreak(cardH + 4);

      sd(C.border); doc.setLineWidth(0.15);
      doc.roundedRect(L, y, W, cardH, 2.5, 2.5, "D");

      let iy = y + 7;
      tf(true, 10); sc(C.dark);
      doc.text(`${si + 1}.  ${s.title}`, L + 5, iy);
      iy += 5.5;
      detailLineGroups.forEach(lines => {
        sf(C.navy); doc.circle(L + 9, iy - 1.3, 0.6, "F");
        tf(false, 9); sc(C.body);
        lines.forEach((dl, di) => doc.text(dl, L + 12, iy + di * 4.5));
        iy += lines.length * 4.5 + 2;
      });

      y += cardH; ln(4);
    });
    ln(2);
  }

  // 7. PROJECT TIMELINE
  const validTimeline = contract.timeline.filter(p => p.phase.trim());
  if (validTimeline.length) {
    secHead("2.  PROJECT TIMELINE");

    const PW = 50, DSW = 80;
    const TROW_H = 8.5;
    const timelineStartY = y;
    const timelineStartPage = doc.getNumberOfPages();

    checkBreak(TROW_H + 2);
    sf(C.tint); doc.roundedRect(L, y, W, TROW_H, 2.5, 2.5, "F");
    doc.rect(L, y + TROW_H - 2.5, W, 2.5, "F");
    sd(C.border); doc.setLineWidth(0.15);
    doc.line(L, y + TROW_H, R, y + TROW_H);
    doc.line(L + PW, y, L + PW, y + TROW_H);
    doc.line(L + PW + DSW, y, L + PW + DSW, y + TROW_H);
    tf(true, 9); sc(C.dark);
    doc.text("Phase", L + 6, y + 5.5);
    doc.text("Description", L + PW + 4, y + 5.5);
    doc.text("Duration", R - 3, y + 5.5, { align: "right" });
    y += TROW_H;

    validTimeline.forEach((p, i) => {
      checkBreak(TROW_H + 2);
      sf(i % 2 === 0 ? C.white : C.stripe);
      sd(C.border); doc.setLineWidth(0.1);
      doc.rect(L, y, W, TROW_H, "FD");
      doc.line(L + PW, y, L + PW, y + TROW_H);
      doc.line(L + PW + DSW, y, L + PW + DSW, y + TROW_H);
      tf(true, 9); sc(C.dark);
      doc.text((doc.splitTextToSize(p.phase, PW - 8) as string[])[0], L + 6, y + 5.5);
      tf(false, 9); sc(C.body);
      doc.text((doc.splitTextToSize(p.description || "–", DSW - 8) as string[])[0], L + PW + 4, y + 5.5);
      tf(true, 9); sc(C.dark);
      doc.text(`${p.duration} ${p.unit}`, R - 3, y + 5.5, { align: "right" });
      y += TROW_H;
    });

    checkBreak(TROW_H + 2);
    sf(C.tint); doc.roundedRect(L, y, W, TROW_H, 2.5, 2.5, "F");
    doc.rect(L, y, W, 2.5, "F");
    sd(C.navy); doc.setLineWidth(0.2);
    doc.line(L, y, R, y);
    tf(true, 10); sc(C.navy);
    doc.text("TOTAL DURATION", L + 6, y + 5.5);
    doc.text(`${totalTimelineDays(validTimeline)} Days`, R - 3, y + 5.5, { align: "right" });
    y += TROW_H;

    if (doc.getNumberOfPages() === timelineStartPage) {
      sd(C.border); doc.setLineWidth(0.3);
      doc.roundedRect(L, timelineStartY, W, y - timelineStartY, 2.5, 2.5, "D");
    }
    ln(8);
  }

  // 8. COMMERCIAL OF SERVICES
  const validPricing = contract.pricing.filter(p => p.description.trim());
  if (validPricing.length) {
    secHead("3.  COMMERCIAL OF SERVICES");

    const DW = 126;
    const ROW_H = 8.5;
    const pricingStartY = y;
    const pricingStartPage = doc.getNumberOfPages();

    checkBreak(ROW_H + 2);
    sf(C.tint); doc.roundedRect(L, y, W, ROW_H, 2.5, 2.5, "F");
    doc.rect(L, y + ROW_H - 2.5, W, 2.5, "F");
    sd(C.border); doc.setLineWidth(0.15);
    doc.line(L, y + ROW_H, R, y + ROW_H);
    doc.line(L + DW, y, L + DW, y + ROW_H);
    tf(true, 9); sc(C.dark);
    doc.text("Description", L + 6, y + 5.5);
    doc.text("Amount (Rs.)", R - 3, y + 5.5, { align: "right" });
    y += ROW_H;

    validPricing.forEach((p, i) => {
      checkBreak(ROW_H + 2);
      sf(i % 2 === 0 ? C.white : C.stripe);
      sd(C.border); doc.setLineWidth(0.1);
      doc.rect(L, y, W, ROW_H, "FD");
      doc.line(L + DW, y, L + DW, y + ROW_H);
      tf(false, 9); sc(C.body);
      doc.text((doc.splitTextToSize(p.description, DW - 10) as string[])[0], L + 6, y + 5.5);
      tf(true, 9); sc(C.dark);
      doc.text(pdfAmt(p.cost), R - 3, y + 5.5, { align: "right" });
      y += ROW_H;
    });

    checkBreak(ROW_H + 2);
    sf(C.tint); doc.roundedRect(L, y, W, ROW_H, 2.5, 2.5, "F");
    doc.rect(L, y, W, 2.5, "F");
    sd(C.navy); doc.setLineWidth(0.2);
    doc.line(L, y, R, y);
    sd(C.border); doc.line(L + DW, y, L + DW, y + ROW_H);
    tf(true, 10); sc(C.navy);
    doc.text("TOTAL", L + 6, y + 5.5);
    doc.text(pdfAmt(contract.totalAmount || String(validPricing.reduce((s, p) => s + toNum(p.cost), 0))), R - 3, y + 5.5, { align: "right" });
    y += ROW_H;

    if (doc.getNumberOfPages() === pricingStartPage) {
      sd(C.border); doc.setLineWidth(0.3);
      doc.roundedRect(L, pricingStartY, W, y - pricingStartY, 2.5, 2.5, "D");
    }
    ln(8);
  }

  // 9. NOTE
  if (contract.note) {
    const noteLines = doc.splitTextToSize(contract.note, W - 12) as string[];
    const noteH = 7 + noteLines.length * 4.5 + 3;
    checkBreak(noteH + 3);
    sf(C.amberBg); sd(C.amber); doc.setLineWidth(0.25);
    doc.roundedRect(L, y, W, noteH, 1.5, 1.5, "FD");
    sf(C.amber); doc.rect(L, y, 3, noteH, "F");
    tf(true, 7); sc(C.amber);
    doc.text("NOTE", L + 6, y + 5);
    tf(false, 9); sc(C.body);
    noteLines.forEach((nl, ni) => doc.text(nl, L + 6, y + 9.5 + ni * 4.5));
    y += noteH; ln(7);
  }

  // 10. PAYMENT TERMS
  if (contract.paymentTerms.filter(Boolean).length) {
    secHead("4.  PAYMENT TERMS");
    contract.paymentTerms.filter(Boolean).forEach((t, i) => {
      checkBreak(7);
      sf(C.tint); sd(C.navy); doc.setLineWidth(0.25);
      doc.circle(L + 5, y - 1.2, 2.8, "FD");
      tf(true, 7.5); sc(C.navy);
      doc.text(String(i + 1), L + 5, y - 0.2, { align: "center" });
      tf(false, 9.5); sc(C.body);
      const lines = doc.splitTextToSize(t, W - 14) as string[];
      lines.forEach((l, li) => doc.text(l, L + 10, y + li * 4.8));
      y += lines.length * 4.8 + 2.5;
    });
    ln(4);
  }

  // 11. TERMS & CONDITIONS
  if (contract.termsConditions.filter(Boolean).length) {
    secHead("5.  TERMS & CONDITIONS");
    contract.termsConditions.filter(Boolean).forEach((t, i) => {
      checkBreak(7);
      sf(C.stripe); sd(C.border); doc.setLineWidth(0.2);
      doc.circle(L + 5, y - 1.2, 2.8, "FD");
      tf(true, 7.5); sc(C.label);
      doc.text(String(i + 1), L + 5, y - 0.2, { align: "center" });
      tf(false, 9.5); sc(C.body);
      const lines = doc.splitTextToSize(t, W - 14) as string[];
      lines.forEach((l, li) => doc.text(l, L + 10, y + li * 4.8));
      y += lines.length * 4.8 + 2.5;
    });
    ln(6);
  }

  // 12. SIGNATURE
  const stampMmW = hasStamp ? stamp.naturalWidth  * 25.4 / 96 * 0.8 : 44;
  const stampMmH = hasStamp ? stamp.naturalHeight * 25.4 / 96 * 0.8 : 34;
  checkBreak(stampMmH + 16);
  ln(5);
  const stampDrawX = R - stampMmW;
  const stampCentreX = R - stampMmW / 2;
  if (hasStamp) {
    doc.addImage(stamp, "PNG", stampDrawX, y, stampMmW, stampMmH);
  } else {
    sd(C.border); doc.setLineWidth(0.3);
    doc.line(stampDrawX, y + stampMmH - 4, R, y + stampMmH - 4);
  }
  y += stampMmH + 3;
  tf(false, 7.5); sc(C.label);
  doc.text("Authorised Signatory", stampCentreX, y, { align: "center" });
  ln(5);
  tf(true, 9); sc(C.navy);
  doc.text("Goanny Technologies Pvt. Ltd.", stampCentreX, y, { align: "center" });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    tf(false, 8); sc(C.label);
    doc.text(`Page ${i} of ${pages}`, 105, 288, { align: "center" });
  }

  doc.save(`${quotationNumber.replace(/\//g, "-")}.pdf`);
}

// ─── Default contract factory ─────────────────────────────────────────────────

function defaultContract(clientName: string): QuotationContract {
  return {
    clientName,
    quotationSerial: "",
    date: new Date().toISOString().split("T")[0],
    subject: "Proposal for Digital Marketing Services",
    introParagraph:
      "We sincerely thank you for giving us the opportunity to present our services. We are pleased to submit our quotation for your kind consideration. We look forward to building a strong and successful relationship with you.",
    scope: [
      {
        title: "Social Media Optimisation (SMO)",
        details: [
          "Content Strategy & Planning",
          "Monthly Content Calendar",
          "High-Quality Post Designs",
          "Reels & Video Editing",
          "SEO-Optimized Captions & Hashtags",
        ],
      },
    ],
    paymentTerms: [
      "50% advance payment before project commencement.",
      "50% balance payment after first month completion.",
    ],
    termsConditions: [
      "Client must provide all necessary access credentials before project initiation.",
      "All payments are non-refundable once the service has commenced.",
    ],
    pricing: [{ description: "Social Media Optimisation (SMO)", cost: "" }],
    timeline: [],
    note: "",
    totalAmount: "",
  };
}

// ─── Modal: Quotation Form ─────────────────────────────────────────────────────

interface QuotationModalProps {
  leadId: string;
  initial: QuotationContract;
  existingId?: string;
  displayNumber?: string;
  onClose: () => void;
  onSaved: (q: Quotation) => void;
}

function QuotationModal({ leadId, initial, existingId, displayNumber, onClose, onSaved }: QuotationModalProps) {
  const [contract, setContract] = useState<QuotationContract>(initial);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(
    (patch: Partial<QuotationContract>) => setContract((prev) => ({ ...prev, ...patch })),
    []
  );

  const quotationNumber = existingId
    ? (displayNumber ?? buildQuotationNumber(contract.clientName, contract.quotationSerial))
    : buildQuotationNumber(contract.clientName, contract.quotationSerial);

  // ── Scope helpers ──
  const addScope = () =>
    set({ scope: [...contract.scope, { title: "", details: [] }] });

  const updateScopeTitle = (i: number, value: string) => {
    const s = [...contract.scope];
    s[i] = { ...s[i], title: value };
    set({ scope: s });
  };

  const addScopeDetail = (i: number) => {
    const s = [...contract.scope];
    s[i] = { ...s[i], details: [...s[i].details, ""] };
    set({ scope: s });
  };

  const updateScopeDetail = (si: number, di: number, value: string) => {
    const s = [...contract.scope];
    const d = [...s[si].details];
    d[di] = value;
    s[si] = { ...s[si], details: d };
    set({ scope: s });
  };

  const removeScopeDetail = (si: number, di: number) => {
    const s = [...contract.scope];
    s[si] = { ...s[si], details: s[si].details.filter((_, j) => j !== di) };
    set({ scope: s });
  };

  const removeScope = (i: number) =>
    set({ scope: contract.scope.filter((_, j) => j !== i) });

  // ── Pricing helpers ──
  const addPricing = () =>
    set({ pricing: [...contract.pricing, { description: "", cost: "" }] });

  const updatePricing = (i: number, field: keyof PricingRow, value: string) => {
    const p = [...contract.pricing];
    p[i] = { ...p[i], [field]: value };
    set({ pricing: p });
  };

  const removePricing = (i: number) =>
    set({ pricing: contract.pricing.filter((_, j) => j !== i) });

  // ── Array list helpers ──
  const addListItem = (key: "paymentTerms" | "termsConditions", value = "") =>
    set({ [key]: [...contract[key], value] });

  const updateListItem = (key: "paymentTerms" | "termsConditions", i: number, value: string) => {
    const arr = [...contract[key]];
    arr[i] = value;
    set({ [key]: arr });
  };

  const removeListItem = (key: "paymentTerms" | "termsConditions", i: number) =>
    set({ [key]: contract[key].filter((_, j) => j !== i) });

  // ── Save & Download ──
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = mapContractToPayload(leadId, contract);
      const result = existingId
        ? await quotationsApi.update(existingId, payload)
        : await quotationsApi.create(payload);
      onSaved(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save quotation");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    await generatePDF(contract);
    setDownloading(false);
  };

  const inputCls =
    "border border-slate-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const labelCls = "block text-xs font-semibold text-slate-600 mb-1";

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {existingId ? "Edit Quotation" : "Create Quotation"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Quotation No: {quotationNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Client / Company Name</label>
              <input
                className={inputCls}
                value={contract.clientName}
                onChange={(e) => set({ clientName: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input
                type="date"
                className={inputCls}
                value={contract.date}
                onChange={(e) => set({ date: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Quotation Serial No.</label>
              <input
                type="number"
                className={inputCls}
                value={contract.quotationSerial}
                placeholder="e.g. 1"
                onChange={(e) => set({ quotationSerial: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div>
              <label className={labelCls}>Total Amount</label>
              <input
                className={inputCls}
                value={contract.totalAmount}
                placeholder="e.g. 15,000"
                onChange={(e) => set({ totalAmount: e.target.value })}
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className={labelCls}>Subject</label>
            <input
              className={inputCls}
              value={contract.subject}
              onChange={(e) => set({ subject: e.target.value })}
            />
          </div>

          {/* Intro */}
          <div>
            <label className={labelCls}>Introduction Paragraph</label>
            <textarea
              className={`${inputCls} min-h-[100px] resize-none`}
              value={contract.introParagraph}
              onChange={(e) => set({ introParagraph: e.target.value })}
            />
          </div>

          {/* Scope */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Scope of Work</h3>
              <button
                onClick={addScope}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
              >
                <Plus className="w-3.5 h-3.5" /> Add Service
              </button>
            </div>
            <div className="space-y-3">
              {contract.scope.map((svc, si) => (
                <div key={si} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
                  <div className="flex gap-2">
                    <input
                      className={`${inputCls} flex-1`}
                      placeholder="Service title"
                      value={svc.title}
                      onChange={(e) => updateScopeTitle(si, e.target.value)}
                    />
                    <button
                      onClick={() => removeScope(si)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {svc.details.map((detail, di) => (
                    <div key={di} className="flex gap-2 pl-3">
                      <input
                        className={`${inputCls} flex-1`}
                        placeholder="Detail"
                        value={detail}
                        onChange={(e) => updateScopeDetail(si, di, e.target.value)}
                      />
                      <button
                        onClick={() => removeScopeDetail(si, di)}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addScopeDetail(si)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 pl-3"
                  >
                    + Add detail
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Commercial / Pricing</h3>
              <button
                onClick={addPricing}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>
            <div className="space-y-2">
              {contract.pricing.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder="Service description"
                    value={row.description}
                    onChange={(e) => updatePricing(i, "description", e.target.value)}
                  />
                  <input
                    className={`${inputCls} w-32`}
                    placeholder="Cost"
                    value={row.cost}
                    onChange={(e) => updatePricing(i, "cost", e.target.value)}
                  />
                  <button
                    onClick={() => removePricing(i)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Terms */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Payment Terms</h3>
              <button
                onClick={() => addListItem("paymentTerms")}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {contract.paymentTerms.map((term, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    value={term}
                    onChange={(e) => updateListItem("paymentTerms", i, e.target.value)}
                  />
                  <button
                    onClick={() => removeListItem("paymentTerms", i)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Terms & Conditions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Terms & Conditions</h3>
              <button
                onClick={() => addListItem("termsConditions")}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {contract.termsConditions.map((term, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    value={term}
                    onChange={(e) => updateListItem("termsConditions", i, e.target.value)}
                  />
                  <button
                    onClick={() => removeListItem("termsConditions", i)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className={labelCls}>Note</label>
            <textarea
              className={`${inputCls} min-h-[80px] resize-none`}
              value={contract.note}
              onChange={(e) => set({ note: e.target.value })}
              placeholder="Any additional note..."
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-white"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-white"
              >
                <Download className="w-4 h-4" />
                {downloading ? "Generating..." : "Download PDF"}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
              >
                <FileText className="w-4 h-4" />
                {saving ? "Saving..." : "Save Quotation"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── View Modal: read-only quotation detail ────────────────────────────────────

interface ViewModalProps {
  quotation: SavedQuotation;
  onEdit: () => void;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
  onStatusChange: (status: QuotationStatus) => void;
  updatingStatus: boolean;
}

function ViewModal({ quotation, onEdit, onClose, onDownload, downloading, onStatusChange, updatingStatus }: ViewModalProps) {
  const c = quotation.contractData ?? {
    clientName: "", quotationSerial: "", date: quotation.date, subject: quotation.subject,
    introParagraph: "", scope: [], paymentTerms: [], termsConditions: [], pricing: [], timeline: [],
    note: "", totalAmount: quotation.totalAmount,
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4 rounded-t-2xl z-10">
          <div>
            <p className="font-mono text-xs text-slate-500 mb-0.5">{quotation.quotationNumber}</p>
            <h2 className="text-lg font-bold text-slate-900">{c.subject}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusSelect status={quotation.status} onChange={onStatusChange} disabled={updatingStatus} />
            <button
              onClick={onDownload}
              disabled={downloading}
              title="Download Quotation PDF"
              style={{ backgroundColor: NAVY }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold transition-opacity"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download PDF
            </button>
            <button
              onClick={onEdit}
              title="Edit Quotation"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {([
              [Hash,        "Quot. No", quotation.quotationNumber],
              [Calendar,    "Date",     fmtDate(c.date)],
              [IndianRupee, "Total",    fmtAmt(c.totalAmount)],
            ] as [React.ComponentType<{ className?: string }>, string, string][]).map(([Icon, label, value]) => (
              <div key={label} className="flex items-center gap-2.5 bg-slate-50 rounded-xl p-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${NAVY}1A`, color: NAVY }}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bill To — mirrors the PDF's accented client block */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200">
            <div className="w-1 shrink-0" style={{ backgroundColor: NAVY }} />
            <div className="flex-1 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>Bill To</p>
              <p className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" /> {c.clientName}
              </p>
            </div>
          </div>

          {c.introParagraph && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Introduction</p>
              <p className="text-sm text-slate-700 leading-relaxed">{c.introParagraph}</p>
            </div>
          )}

          {c.scope.length > 0 && (
            <div>
              <SectionTitle n={1}>Scope of Work</SectionTitle>
              <div className="space-y-2">
                {c.scope.map((s, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-3">
                    <p className="text-sm font-semibold text-slate-800 mb-1.5">{s.title}</p>
                    <ul className="space-y-1">
                      {s.details.map((d, j) => (
                        <li key={j} className="text-xs text-slate-600 flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: NAVY }} />{d}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {c.timeline.length > 0 && (
            <div>
              <SectionTitle n={2}>Project Timeline</SectionTitle>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead style={{ backgroundColor: `${NAVY}1A` }}>
                    <tr>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase" style={{ color: NAVY }}>Phase</th>
                      <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase" style={{ color: NAVY }}>Description</th>
                      <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase" style={{ color: NAVY }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {c.timeline.map((p, i) => (
                      <tr key={i} className={i % 2 === 1 ? "bg-slate-50" : undefined}>
                        <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{p.phase}</td>
                        <td className="px-4 py-2.5 text-slate-600">{p.description || "—"}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700 whitespace-nowrap">{p.duration} {p.unit}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: `${NAVY}1A`, borderTop: `2px solid ${NAVY}` }}>
                      <td className="px-4 py-2.5 font-bold" style={{ color: NAVY }} colSpan={2}>TOTAL DURATION</td>
                      <td className="px-4 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: NAVY }}>{totalTimelineDays(c.timeline)} Days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {c.pricing.length > 0 && (
            <div>
              <SectionTitle n={3}>Commercial of Services</SectionTitle>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full table-fixed text-sm">
                  <thead style={{ backgroundColor: `${NAVY}1A` }}>
                    <tr>
                      <th className="w-3/4 px-4 py-2 text-left text-[11px] font-semibold uppercase" style={{ color: NAVY }}>Description</th>
                      <th className="w-1/4 px-4 py-2 text-right text-[11px] font-semibold uppercase" style={{ color: NAVY }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {c.pricing.map((row, i) => (
                      <tr key={i} className={i % 2 === 1 ? "bg-slate-50" : undefined}>
                        <td className="w-3/4 px-4 py-2.5 text-slate-700 break-words">{row.description}</td>
                        <td className="w-1/4 px-4 py-2.5 text-right font-medium text-slate-800 whitespace-nowrap">{fmtAmt(row.cost)}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: `${NAVY}1A`, borderTop: `2px solid ${NAVY}` }}>
                      <td className="w-3/4 px-4 py-2.5 font-bold" style={{ color: NAVY }}>TOTAL</td>
                      <td className="w-1/4 px-4 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: NAVY }}>{fmtAmt(c.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {c.paymentTerms.length > 0 && (
              <div>
                <SectionTitle n={4}>Payment Terms</SectionTitle>
                <ul className="space-y-1.5">
                  {c.paymentTerms.map((t, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <span
                        className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{ backgroundColor: NAVY }}
                      >
                        {i + 1}
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {c.termsConditions.length > 0 && (
              <div>
                <SectionTitle n={5}>Terms & Conditions</SectionTitle>
                <ul className="space-y-1">
                  {c.termsConditions.map((t, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="mt-0.5 w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
                        {i + 1}
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {c.note && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 mb-0.5">Note</p>
              <p className="text-xs text-amber-800">{c.note}</p>
            </div>
          )}

          {/* Signature preview — mirrors the stamp block at the bottom of the PDF */}
          <div className="flex justify-end pt-2">
            <div className="text-center">
              <img
                src="/goanny_stamp.png"
                alt=""
                className="h-16 w-auto mx-auto mb-1 opacity-90"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              <p className="text-[10px] text-slate-400">Authorised Signatory</p>
              <p className="text-xs font-bold" style={{ color: NAVY }}>Goanny Technologies Pvt. Ltd.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

interface LeadQuotationSectionProps {
  leadId: string;
  leadName: string;
  triggerCreate?: boolean;
  onCreateHandled?: () => void;
  onActivity?: (action: string, description: string) => void;
}

export default function LeadQuotationSection({
  leadId,
  leadName,
  triggerCreate,
  onCreateHandled,
  onActivity,
}: LeadQuotationSectionProps) {
  const [quotations, setQuotations] = useState<SavedQuotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SavedQuotation | null>(null);
  const [viewTarget, setViewTarget] = useState<SavedQuotation | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await quotationsApi.listByClient(leadId, { limit: 100 });
      setQuotations(res.data.map(mapListItemToSaved));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  useEffect(() => {
    if (triggerCreate) {
      setCreateOpen(true);
      onCreateHandled?.();
    }
  }, [triggerCreate, onCreateHandled]);

  const handleSaved = (q: Quotation) => {
    const saved = mapQuotationToSaved(q);
    setQuotations((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
    });
    onActivity?.("Quotation Saved", `Quotation ${saved.quotationNumber} saved`);
  };

  const handleDelete = async (id: string) => {
    const q = quotations.find((x) => x.id === id);
    try {
      await quotationsApi.delete(id);
      setQuotations((prev) => prev.filter((x) => x.id !== id));
      if (q) onActivity?.("Quotation Deleted", `Quotation ${q.quotationNumber} deleted`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete quotation");
    }
  };

  // Fetch the full quotation (scope/pricing/terms) on demand — the list endpoint only returns summary fields.
  const ensureContract = async (q: SavedQuotation): Promise<SavedQuotation> => {
    if (q.contractData) return q;
    setDetailLoadingId(q.id);
    try {
      const full = await quotationsApi.get(q.id);
      const saved = mapQuotationToSaved(full);
      setQuotations((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
      return saved;
    } finally {
      setDetailLoadingId(null);
    }
  };

  const handleDownload = async (q: SavedQuotation) => {
    setDownloadingId(q.id);
    try {
      const full = await ensureContract(q);
      if (full.contractData) await generatePDF(full.contractData);
      onActivity?.("Quotation Downloaded", `Downloaded PDF for ${q.quotationNumber}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to load quotation for download");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleStatusChange = async (id: string, status: QuotationStatus) => {
    setUpdatingStatusId(id);
    try {
      await quotationsApi.updateStatus(id, status);
      setQuotations((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
      setViewTarget((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
      onActivity?.("Quotation Status Updated", `Quotation status changed to ${status}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const openView = async (q: SavedQuotation) => {
    try {
      const full = await ensureContract(q);
      setViewTarget(full);
      onActivity?.("Quotation Viewed", `Viewed quotation ${full.quotationNumber}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to load quotation");
    }
  };

  const openEdit = async (q: SavedQuotation) => {
    try {
      const full = await ensureContract(q);
      setViewTarget(null);
      setEditTarget(full);
      onActivity?.("Quotation Edited", `Opened ${full.quotationNumber} for editing`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to load quotation");
    }
  };

  return (
    <>
      {/* Section card */}
      <section className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Quotations</h2>
            {quotations.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                {quotations.length}
              </span>
            )}
          </div>
          <button
            onClick={() => { setCreateOpen(true); onActivity?.("Quotation Started", "Opened new quotation form"); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
          >
            <Plus className="w-3.5 h-3.5" /> Create Quotation
          </button>
        </div>

        {error ? (
          <div className="text-center py-8 text-red-600">
            <p className="text-xs font-medium">{error}</p>
          </div>
        ) : loading ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-xs">Loading quotations...</p>
          </div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No quotations yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-[11px] text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Quotation #</th>
                    <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Subject</th>
                    <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Amount</th>
                    <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-600 whitespace-nowrap">
                        {q.quotationNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-800 max-w-[200px] truncate">
                        {q.subject}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {new Date(q.date).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {q.totalAmount ? `₹ ${q.totalAmount}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusSelect
                          status={q.status}
                          disabled={updatingStatusId === q.id}
                          onChange={(s) => handleStatusChange(q.id, s)}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            title="View"
                            onClick={() => openView(q)}
                            disabled={detailLoadingId === q.id}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Download Quotation PDF"
                            onClick={() => handleDownload(q)}
                            disabled={downloadingId === q.id || detailLoadingId === q.id}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {q.status === "DRAFT" && (
                            <button
                              title="Delete"
                              onClick={() => handleDelete(q.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Create / Edit modal */}
      {(createOpen || editTarget) && (
        <QuotationModal
          leadId={leadId}
          initial={editTarget?.contractData ?? defaultContract(leadName)}
          existingId={editTarget?.id}
          displayNumber={editTarget?.quotationNumber}
          onClose={() => { setCreateOpen(false); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* View modal */}
      {viewTarget && (
        <ViewModal
          quotation={viewTarget}
          onEdit={() => openEdit(viewTarget)}
          onClose={() => setViewTarget(null)}
          onDownload={() => handleDownload(viewTarget)}
          downloading={downloadingId === viewTarget.id}
          onStatusChange={(s) => handleStatusChange(viewTarget.id, s)}
          updatingStatus={updatingStatusId === viewTarget.id}
        />
      )}
    </>
  );
}
