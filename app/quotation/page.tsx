"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Filter, ChevronDown, Eye, FileText,
  RefreshCw, X, Calendar, IndianRupee, User, Hash, MapPin, Download, Pencil, ScrollText,
  AlertCircle, Loader2,
} from "lucide-react";
import { type QuotationRecord, type TimelinePhase, type TimelineUnit } from "@/lib/quotationStore";
import {
  quotationsApi,
  type QuotationStatus,
  type QuotationListItem,
  type Quotation,
} from "@/lib/api/quotations";

const TIMELINE_UNIT_DAYS: Record<TimelineUnit, number> = { Days: 1, Weeks: 7, Months: 30 };
const API_TO_UNIT: Record<string, TimelineUnit> = { DAYS: "Days", WEEKS: "Weeks", MONTHS: "Months" };
const totalTimelineDays = (timeline: TimelinePhase[]) =>
  timeline.reduce((s, p) => s + (Number(p.duration) || 0) * TIMELINE_UNIT_DAYS[p.unit], 0);

// Map full API Quotation → QuotationRecord (used by PDF functions)
function apiToRecord(q: Quotation): QuotationRecord {
  const pricing = (q.pricing ?? []).map(p => ({ description: p.description, cost: Number(p.cost) || 0 }));
  // Always compute total from line items; fall back to API field if pricing is empty
  const computedTotal = pricing.reduce((sum, p) => sum + p.cost, 0);
  const timeline = (q.timeline ?? []).map(p => ({
    phase:       p.phase,
    description: p.description ?? "",
    duration:    Number(p.duration) || 0,
    unit:        API_TO_UNIT[p.unit] ?? "Days",
  }));
  return {
    id:              q.id,
    quotationNumber: q.quotationNumber,
    clientName:      q.clientName ?? q.client?.companyName ?? "",
    clientAddress:   q.clientAddress ?? "",
    subject:         q.subject,
    date:            (q.date ?? "").split("T")[0],
    totalAmount:     computedTotal > 0 ? computedTotal : (Number(q.totalAmount) || 0),
    status:          q.status,
    createdAt:       (q.createdAt ?? "").split("T")[0],
    introParagraph:  q.introParagraph ?? "",
    note:            q.note ?? "",
    scope:           (q.scope ?? []).map(s => ({ title: s.title, details: s.details ?? [] })),
    pricing,
    timeline,
    paymentTerms:    (q.paymentTerms ?? []).map(t => t.term),
    termsConditions: (q.termsConditions ?? []).map(t => t.term),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
function fmt(d: string) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}
function fmtAmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

// ─── PDF Generator ───────────────────────────────────────────────────────────

async function downloadPDF(q: QuotationRecord) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF("p", "mm", "a4");

  // ── Letterhead ──
  const img = new Image();
  img.src = "/letterhead.jpg";
  await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); });
  const hasLH = img.complete && img.naturalWidth > 0;
  const addBg = () => { if (hasLH) doc.addImage(img, "JPEG", 0, 0, 210, 297); };

  // ── Stamp ──
  const stamp = new Image();
  stamp.src = "/goanny_stamp.png";
  await new Promise<void>((res) => { stamp.onload = () => res(); stamp.onerror = () => res(); });
  const hasStamp = stamp.complete && stamp.naturalWidth > 0;

  // ₹ symbol not supported in jsPDF built-in fonts — use "Rs." instead
  const pdfAmt = (n: number) =>
    "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

  // ── Layout ──
  const L = 18, R = 192, W = 174;
  const START_Y = 48;
  const FOOTER_Y = 272;
  let y = START_Y;
  addBg();

  // ── Professional colour palette ──
  const C = {
    navy:    [28,  54,  96] as [number,number,number],   // deep navy — primary accent
    tint:    [237,243,253] as [number,number,number],   // very light blue tint — table header/total
    stripe:  [248,250,252] as [number,number,number],   // near-white — alt rows
    dark:    [18,  24,  40] as [number,number,number],   // near-black — headings
    body:    [55,  65,  81] as [number,number,number],   // dark grey — body text
    label:   [107,114,128] as [number,number,number],   // mid grey — labels
    border:  [220,226,235] as [number,number,number],   // light border
    white:   [255,255,255] as [number,number,number],
    amberBg: [255,251,235] as [number,number,number],
    amber:   [217,119,  6] as [number,number,number],
  };

  // ── Helpers ──
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
    (doc.splitTextToSize(text, W - indent) as string[]).forEach(line => {
      checkBreak(gap + 1); doc.text(line, L + indent, y); y += gap;
    });
  };

  // Section header — left navy bar + bold label + inline rule starting where the text ends
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

  // ─────────────────────────────────────────────
  // 1. TITLE
  // ─────────────────────────────────────────────
  tf(true, 18); sc(C.navy);
  doc.text("QUOTATION", 105, y, { align: "center" });
  ln(4);
  sd(C.navy); doc.setLineWidth(0.5);
  doc.line(L, y, R, y);
  ln(8);

  // ─────────────────────────────────────────────
  // 2. META CARDS  (Quot No | Date — two separate rounded cards, like the View modal)
  // ─────────────────────────────────────────────
  checkBreak(16);
  const dateStr = new Date(q.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const metaGap = 4;
  const metaCardW = (W - metaGap) / 2;
  const metaCardH = 13;

  sf(C.stripe);
  doc.roundedRect(L, y, metaCardW, metaCardH, 2, 2, "F");
  tf(false, 7); sc(C.label);
  doc.text("QUOTATION NO.", L + 5, y + 5);
  tf(true, 10); sc(C.dark);
  doc.text(q.quotationNumber, L + 5, y + 10.5);

  const metaCard2X = L + metaCardW + metaGap;
  const metaCard2RightX = metaCard2X + metaCardW - 5;
  sf(C.stripe);
  doc.roundedRect(metaCard2X, y, metaCardW, metaCardH, 2, 2, "F");
  tf(false, 7); sc(C.label);
  doc.text("DATE", metaCard2RightX, y + 5, { align: "right" });
  tf(true, 10); sc(C.dark);
  doc.text(dateStr, metaCard2RightX, y + 10.5, { align: "right" });

  y += metaCardH; ln(8);

  // ─────────────────────────────────────────────
  // 3. BILL TO
  // ─────────────────────────────────────────────
  checkBreak(24);
  const addrLines = q.clientAddress
    ? (doc.splitTextToSize(q.clientAddress, W - 14) as string[])
    : [];
  const blockH = 7 + 6 + (addrLines.length > 0 ? 2 + addrLines.length * 4.5 : 0);

  // Rounded card fill first, then the navy bar flush against the left edge on top
  // (matches the modal's edge-to-edge accent strip), then a crisp border outline.
  sf(C.stripe); doc.roundedRect(L, y, W, blockH, 2.5, 2.5, "F");
  sf(C.navy); doc.roundedRect(L, y, 1.4, blockH, 0.7, 2.5, "F");
  sd(C.border); doc.setLineWidth(0.12);
  doc.roundedRect(L, y, W, blockH, 2.5, 2.5, "D");

  // Simple vector "user" glyph (head + shoulders)
  const drawUserIcon = (cx: number, cy: number) => {
    sf(C.label);
    doc.circle(cx, cy - 0.7, 0.9, "F");
    doc.ellipse(cx, cy + 1.3, 1.5, 1.0, "F");
  };
  // Simple vector "map pin" glyph (head + point)
  const drawPinIcon = (cx: number, cy: number) => {
    sf(C.label);
    doc.circle(cx, cy - 0.2, 1.0, "F");
    doc.triangle(cx - 0.6, cy + 0.3, cx + 0.6, cy + 0.3, cx, cy + 1.7, "F");
  };

  tf(true, 7); sc(C.label);
  doc.text("BILL TO", L + 8, y + 4.5);
  drawUserIcon(L + 9, y + 9.3);
  tf(true, 12); sc(C.dark);
  doc.text(q.clientName, L + 12, y + 10.5);
  if (addrLines.length > 0) {
    drawPinIcon(L + 9, y + 15.3 + (addrLines.length > 1 ? (addrLines.length - 1) * 2.25 : 0));
    tf(false, 9); sc(C.body);
    addrLines.forEach((line, i) => doc.text(line, L + 12, y + 15.5 + i * 4.5));
  }
  y += blockH; ln(8);

  // ─────────────────────────────────────────────
  // 4. SUBJECT
  // ─────────────────────────────────────────────
  checkBreak(14);
  tf(false, 7.5); sc(C.label);
  doc.text("SUBJECT", L, y); ln(5);
  tf(true, 12); sc(C.dark);
  doc.text(q.subject, L, y); ln(4);
  sd(C.border); doc.setLineWidth(0.18);
  doc.line(L, y, R, y); ln(7);

  // ─────────────────────────────────────────────
  // 5. INTRODUCTION
  // ─────────────────────────────────────────────
  if (q.introParagraph) {
    tf(true, 10); sc(C.dark);
    doc.text(`Dear ${q.clientName},`, L, y); ln(5.5);
    para(q.introParagraph, false, 10, C.body, 0, 5);
    ln(5);
  }

  // ─────────────────────────────────────────────
  // 6. SCOPE OF WORK
  // ─────────────────────────────────────────────
  if (q.scope.filter(s => s.title.trim()).length) {
    secHead("1.  SCOPE OF WORK");
    q.scope.filter(s => s.title.trim()).forEach((s, si) => {
      // Pre-measure the card so it never starts a page break mid-card.
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
        // Small filled circle bullet — matches the modal's rounded-full navy dot.
        sf(C.navy); doc.circle(L + 9, iy - 1.3, 0.6, "F");
        tf(false, 9); sc(C.body);
        lines.forEach((dl, di) => doc.text(dl, L + 12, iy + di * 4.5));
        iy += lines.length * 4.5 + 2;
      });

      y += cardH; ln(4);
    });
    ln(2);
  }

  // ─────────────────────────────────────────────
  // 7. PROJECT TIMELINE
  // ─────────────────────────────────────────────
  const validTimeline = (q.timeline ?? []).filter(p => p.phase.trim());
  if (validTimeline.length) {
    secHead("2.  PROJECT TIMELINE");

    const PW = 50, DSW = 80;
    const TROW_H = 8.5;
    const timelineStartY = y;
    const timelineStartPage = doc.getNumberOfPages();

    // Column header row — rounded top corners only (squared off where the data rows attach below)
    checkBreak(TROW_H + 2);
    sf(C.tint); doc.roundedRect(L, y, W, TROW_H, 2.5, 2.5, "F");
    doc.rect(L, y + TROW_H - 2.5, W, 2.5, "F");
    sd(C.border); doc.setLineWidth(0.15);
    doc.line(L, y + TROW_H, R, y + TROW_H); // bottom separator only — sides/top come from the outer frame
    doc.line(L + PW, y, L + PW, y + TROW_H);
    doc.line(L + PW + DSW, y, L + PW + DSW, y + TROW_H);
    tf(true, 9); sc(C.dark);
    doc.text("Phase", L + 6, y + 5.5);
    doc.text("Description", L + PW + 4, y + 5.5);
    doc.text("Duration", R - 3, y + 5.5, { align: "right" });
    y += TROW_H;

    // Data rows
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

    // Total duration row — rounded bottom corners only (squared off where it attaches to the data rows above)
    checkBreak(TROW_H + 2);
    sf(C.tint); doc.roundedRect(L, y, W, TROW_H, 2.5, 2.5, "F");
    doc.rect(L, y, W, 2.5, "F");
    sd(C.navy); doc.setLineWidth(0.2);
    doc.line(L, y, R, y); // top separator only — sides/bottom come from the outer frame
    tf(true, 10); sc(C.navy);
    doc.text("TOTAL DURATION", L + 6, y + 5.5);
    doc.text(`${totalTimelineDays(validTimeline)} Days`, R - 3, y + 5.5, { align: "right" });
    y += TROW_H;

    // Rounded outer frame — only when the table stayed on a single page.
    if (doc.getNumberOfPages() === timelineStartPage) {
      sd(C.border); doc.setLineWidth(0.3);
      doc.roundedRect(L, timelineStartY, W, y - timelineStartY, 2.5, 2.5, "D");
    }
    ln(8);
  }

  // ─────────────────────────────────────────────
  // 8. PRICING TABLE
  // ─────────────────────────────────────────────
  const validPricing = q.pricing.filter(p => p.description.trim());
  if (validPricing.length) {
    secHead("3.  COMMERCIAL OF SERVICES");

    const DW = 126, CW = W - DW;
    const ROW_H = 8.5;
    const pricingStartY = y;
    const pricingStartPage = doc.getNumberOfPages();

    // Column header row — rounded top corners only (squared off where the data rows attach below)
    checkBreak(ROW_H + 2);
    sf(C.tint); doc.roundedRect(L, y, W, ROW_H, 2.5, 2.5, "F");
    doc.rect(L, y + ROW_H - 2.5, W, 2.5, "F");
    sd(C.border); doc.setLineWidth(0.15);
    doc.line(L, y + ROW_H, R, y + ROW_H); // bottom separator only — sides/top come from the outer frame
    doc.line(L + DW, y, L + DW, y + ROW_H); // vertical divider
    tf(true, 9); sc(C.dark);
    doc.text("Description", L + 6, y + 5.5);
    doc.text("Amount (Rs.)", R - 3, y + 5.5, { align: "right" });
    y += ROW_H;

    // Data rows
    validPricing.forEach((p, i) => {
      checkBreak(ROW_H + 2);
      sf(i % 2 === 0 ? C.white : C.stripe);
      sd(C.border); doc.setLineWidth(0.1);
      doc.rect(L, y, W, ROW_H, "FD");
      sd(C.border); doc.line(L + DW, y, L + DW, y + ROW_H);
      tf(false, 9); sc(C.body);
      doc.text((doc.splitTextToSize(p.description, DW - 10) as string[])[0], L + 6, y + 5.5);
      tf(true, 9); sc(C.dark);
      doc.text(pdfAmt(p.cost), R - 3, y + 5.5, { align: "right" });
      y += ROW_H;
    });

    // Total row — rounded bottom corners only (squared off where it attaches to the data rows above)
    checkBreak(ROW_H + 2);
    sf(C.tint); doc.roundedRect(L, y, W, ROW_H, 2.5, 2.5, "F");
    doc.rect(L, y, W, 2.5, "F");
    sd(C.navy); doc.setLineWidth(0.2);
    doc.line(L, y, R, y); // top separator only — sides/bottom come from the outer frame
    sd(C.border); doc.line(L + DW, y, L + DW, y + ROW_H);
    tf(true, 10); sc(C.navy);
    doc.text("TOTAL", L + 6, y + 5.5);
    doc.text(pdfAmt(q.totalAmount), R - 3, y + 5.5, { align: "right" });
    y += ROW_H;

    // Rounded outer frame — only when the table stayed on a single page.
    if (doc.getNumberOfPages() === pricingStartPage) {
      sd(C.border); doc.setLineWidth(0.3);
      doc.roundedRect(L, pricingStartY, W, y - pricingStartY, 2.5, 2.5, "D");
    }
    ln(8);
  }

  // ─────────────────────────────────────────────
  // 9. NOTE
  // ─────────────────────────────────────────────
  if (q.note) {
    const noteLines = doc.splitTextToSize(q.note, W - 12) as string[];
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

  // ─────────────────────────────────────────────
  // 10. PAYMENT TERMS
  // ─────────────────────────────────────────────
  if (q.paymentTerms.filter(Boolean).length) {
    secHead("4.  PAYMENT TERMS");
    q.paymentTerms.filter(Boolean).forEach((t, i) => {
      checkBreak(7);
      // Outlined navy circle with number
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

  // ─────────────────────────────────────────────
  // 11. TERMS & CONDITIONS
  // ─────────────────────────────────────────────
  if (q.termsConditions.filter(Boolean).length) {
    secHead("5.  TERMS & CONDITIONS");
    q.termsConditions.filter(Boolean).forEach((t, i) => {
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

  // ─────────────────────────────────────────────
  // 12. SIGNATURE  (stamp at natural size)
  // ─────────────────────────────────────────────

  // Natural mm dimensions — scale 0.8 to reduce size slightly while keeping aspect ratio
  const stampMmW = hasStamp ? stamp.naturalWidth  * 25.4 / 96 * 0.8 : 44;
  const stampMmH = hasStamp ? stamp.naturalHeight * 25.4 / 96 * 0.8 : 34;

  checkBreak(stampMmH + 16);
  ln(5);

  // Right-align the stamp
  const stampDrawX = R - stampMmW;
  const stampCentreX = R - stampMmW / 2;

  // Stamp image at natural aspect ratio
  if (hasStamp) {
    doc.addImage(stamp, "PNG", stampDrawX, y, stampMmW, stampMmH);
  } else {
    sd(C.border); doc.setLineWidth(0.3);
    doc.line(stampDrawX, y + stampMmH - 4, R, y + stampMmH - 4);
  }
  y += stampMmH + 3;

  // "Authorised Signatory" then company name
  tf(false, 7.5); sc(C.label);
  doc.text("Authorised Signatory", stampCentreX, y, { align: "center" });
  ln(5);
  tf(true, 9); sc(C.navy);
  doc.text("Goanny Technologies Pvt. Ltd.", stampCentreX, y, { align: "center" });
  y += 6;

  // ─────────────────────────────────────────────
  // PAGE NUMBERS
  // ─────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    tf(false, 8); sc(C.label);
    doc.text(`Page ${i} of ${pages}`, 105, 288, { align: "center" });
  }

  doc.save(`${q.quotationNumber.replace(/\//g, "-")}.pdf`);
}

// ─── Agreement PDF ───────────────────────────────────────────────────────────

async function downloadAgreementPDF(q: QuotationRecord) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF("p", "mm", "a4");

  // Letterhead
  const img = new Image();
  img.src = "/letterhead.jpg";
  await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); });
  const hasLH = img.complete && img.naturalWidth > 0;
  const addBg = () => { if (hasLH) doc.addImage(img, "JPEG", 0, 0, 210, 297); };

  // Stamp
  const stamp = new Image();
  stamp.src = "/goanny_stamp.png";
  await new Promise<void>((res) => { stamp.onload = () => res(); stamp.onerror = () => res(); });
  const hasStamp = stamp.complete && stamp.naturalWidth > 0;

  const pdfAmt = (n: number) =>
    "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

  const L = 18, R = 192, W = 174;
  const START_Y = 44, FOOTER_Y = 272;
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
    doc.setFont("times", bold ? "bold" : "normal");
    doc.setFontSize(size);
  };
  const para = (text: string, bold: boolean, size: number, color: [number,number,number], indent = 0, gap = 5) => {
    tf(bold, size); sc(color);
    (doc.splitTextToSize(text, W - indent) as string[]).forEach(line => {
      checkBreak(gap + 1); doc.text(line, L + indent, y); y += gap;
    });
  };
  const secHead = (label: string) => {
    checkBreak(14); ln(4);
    sf(C.navy); doc.rect(L, y - 4.5, 3, 7, "F");
    tf(true, 10); sc(C.navy);
    doc.text(label, L + 6, y);
    ln(4);
    sd(C.border); doc.setLineWidth(0.18);
    doc.line(L, y, R, y);
    ln(5);
  };

  // ── 1. TITLE ──
  tf(true, 22); sc(C.navy);
  doc.text("SERVICE AGREEMENT", 105, y, { align: "center" });
  ln(4);
  sd(C.navy); doc.setLineWidth(0.5);
  doc.line(L, y, R, y);
  ln(8);

  // ── 2. META STRIP (Agreement No | Date) ──
  checkBreak(16);
  const agrNo = `AGR-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date(q.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  sf(C.tint); sd(C.border); doc.setLineWidth(0.15);
  doc.roundedRect(L, y, W, 13, 1.5, 1.5, "FD");
  sf(C.navy); doc.rect(L, y, 3, 13, "F");
  tf(false, 7); sc(C.label);
  doc.text("AGREEMENT NO.", L + 6, y + 4);
  doc.text("DATE", 105, y + 4, { align: "center" });
  doc.text("REF. QUOTATION NO.", R - 4, y + 4, { align: "right" });
  tf(true, 9); sc(C.dark);
  doc.text(agrNo, L + 6, y + 10);
  doc.text(dateStr, 105, y + 10, { align: "center" });
  doc.text(q.quotationNumber, R - 4, y + 10, { align: "right" });
  y += 13; ln(7);

  // ── 3. PARTIES ──
  checkBreak(22);
  const addrLines = q.clientAddress ? (doc.splitTextToSize(q.clientAddress, W - 10) as string[]) : [];
  const blockH = 7 + 6 + (addrLines.length > 0 ? 2 + addrLines.length * 4.5 : 0);
  sf(C.navy); doc.rect(L, y, 3, blockH, "F");
  sf(C.stripe); sd(C.border); doc.setLineWidth(0.12);
  doc.rect(L + 3, y, W - 3, blockH, "FD");
  tf(true, 7); sc(C.label);
  doc.text("CLIENT", L + 7, y + 4.5);
  tf(true, 12); sc(C.dark);
  doc.text(q.clientName, L + 7, y + 10.5);
  if (addrLines.length > 0) {
    tf(false, 9); sc(C.body);
    addrLines.forEach((line, i) => doc.text(line, L + 7, y + 15.5 + i * 4.5));
  }
  y += blockH; ln(7);

  // ── 4. AGREEMENT INTRO ──
  checkBreak(30);
  const agDate = new Date(q.date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  para(`This Service Agreement is made on ${agDate} between:`, false, 10, C.body, 0, 5);
  ln(1);
  para("Goanny Technologies Pvt. Ltd., 1st Floor, Inspiria Mall, Nigdi, Pune – 411044  (\"Service Provider\")", true, 10, C.dark, 0, 5);
  ln(1);
  para(`and  ${q.clientName}  ("Client").`, false, 10, C.body, 0, 5);
  ln(3);
  para("The Service Provider agrees to provide the services outlined below, and the Client agrees to compensate the Service Provider as per the agreed terms.", false, 10, C.body, 0, 5);
  ln(5);

  // ── 5. SCOPE ──
  if (q.scope.filter(s => s.title.trim()).length) {
    secHead("1.  SCOPE OF WORK");
    q.scope.filter(s => s.title.trim()).forEach((s, si) => {
      checkBreak(8);
      tf(true, 10); sc(C.dark);
      doc.text(`${si + 1}.  ${s.title}`, L + 4, y); ln(5.5);
      s.details.filter(Boolean).forEach(d => {
        checkBreak(5);
        tf(false, 9); sc(C.navy); doc.text("–", L + 9, y);
        sc(C.body);
        const dLines = doc.splitTextToSize(d, W - 16) as string[];
        dLines.forEach((dl, di) => doc.text(dl, L + 13, y + di * 4.5));
        y += dLines.length * 4.5 + 2;
      });
      ln(2);
    });
    ln(2);
  }

  // ── 6. COMMERCIAL TABLE ──
  const validPricing = q.pricing.filter(p => p.description.trim());
  if (validPricing.length) {
    secHead("2.  COMMERCIAL OF SERVICES");
    const DW = 126, CW = W - DW, ROW_H = 8.5;
    checkBreak(ROW_H + 2);
    sf(C.tint); sd(C.border); doc.setLineWidth(0.15);
    doc.rect(L, y, W, ROW_H, "FD");
    sf(C.navy); doc.rect(L, y, 3, ROW_H, "F");
    sd(C.border); doc.line(L + DW, y, L + DW, y + ROW_H);
    tf(true, 9); sc(C.dark);
    doc.text("Service Description", L + 6, y + 5.5);
    doc.text("Amount (Rs.)", R - 3, y + 5.5, { align: "right" });
    y += ROW_H;
    validPricing.forEach((p, i) => {
      checkBreak(ROW_H + 2);
      sf(i % 2 === 0 ? C.white : C.stripe); sd(C.border); doc.setLineWidth(0.1);
      doc.rect(L, y, W, ROW_H, "FD");
      sd(C.border); doc.line(L + DW, y, L + DW, y + ROW_H);
      tf(false, 9); sc(C.body);
      doc.text((doc.splitTextToSize(p.description, DW - 10) as string[])[0], L + 6, y + 5.5);
      tf(true, 9); sc(C.dark);
      doc.text(pdfAmt(p.cost), R - 3, y + 5.5, { align: "right" });
      y += ROW_H;
    });
    checkBreak(ROW_H + 2);
    sf(C.tint); sd(C.navy); doc.setLineWidth(0.2);
    doc.rect(L, y, W, ROW_H, "FD");
    sf(C.navy); doc.rect(L, y, 3, ROW_H, "F");
    sd(C.border); doc.line(L + DW, y, L + DW, y + ROW_H);
    tf(true, 10); sc(C.navy);
    doc.text("TOTAL", L + 6, y + 5.5);
    doc.text(pdfAmt(q.totalAmount), R - 3, y + 5.5, { align: "right" });
    y += ROW_H; ln(8);
  }

  // ── 7. NOTE ──
  if (q.note) {
    const noteLines = doc.splitTextToSize(q.note, W - 12) as string[];
    const noteH = 7 + noteLines.length * 4.5 + 3;
    checkBreak(noteH + 3);
    sf(C.amberBg); sd(C.amber); doc.setLineWidth(0.25);
    doc.roundedRect(L, y, W, noteH, 1.5, 1.5, "FD");
    sf(C.amber); doc.rect(L, y, 3, noteH, "F");
    tf(true, 7); sc(C.amber); doc.text("NOTE", L + 6, y + 5);
    tf(false, 9); sc(C.body);
    noteLines.forEach((nl, ni) => doc.text(nl, L + 6, y + 9.5 + ni * 4.5));
    y += noteH; ln(7);
  }

  // ── 8. PAYMENT TERMS ──
  if (q.paymentTerms.filter(Boolean).length) {
    secHead("3.  PAYMENT TERMS");
    q.paymentTerms.filter(Boolean).forEach((t, i) => {
      checkBreak(7);
      sf(C.tint); sd(C.navy); doc.setLineWidth(0.25);
      doc.circle(L + 5, y - 1.2, 2.8, "FD");
      tf(true, 7.5); sc(C.navy); doc.text(String(i + 1), L + 5, y - 0.2, { align: "center" });
      tf(false, 9.5); sc(C.body);
      const lines = doc.splitTextToSize(t, W - 14) as string[];
      lines.forEach((l, li) => doc.text(l, L + 10, y + li * 4.8));
      y += lines.length * 4.8 + 2.5;
    });
    ln(4);
  }

  // ── 9. T&C ──
  if (q.termsConditions.filter(Boolean).length) {
    secHead("4.  TERMS & CONDITIONS");
    q.termsConditions.filter(Boolean).forEach((t, i) => {
      checkBreak(7);
      sf(C.stripe); sd(C.border); doc.setLineWidth(0.2);
      doc.circle(L + 5, y - 1.2, 2.8, "FD");
      tf(true, 7.5); sc(C.label); doc.text(String(i + 1), L + 5, y - 0.2, { align: "center" });
      tf(false, 9.5); sc(C.body);
      const lines = doc.splitTextToSize(t, W - 14) as string[];
      lines.forEach((l, li) => doc.text(l, L + 10, y + li * 4.8));
      y += lines.length * 4.8 + 2.5;
    });
    ln(8);
  }

  // ── 10. DUAL SIGNATURE ──
  const stampMmW = hasStamp ? stamp.naturalWidth  * 25.4 / 96 * 0.8 : 44;
  const stampMmH = hasStamp ? stamp.naturalHeight * 25.4 / 96 * 0.8 : 34;
  checkBreak(stampMmH + 16);
  ln(5);
  const sigBaseY = y;

  // Client block — left, same dimensions & style as Goanny block
  const clientCentreX = L + stampMmW / 2;
  // Empty area with a bottom sign line (mirrors stamp area height)
  sd(C.border); doc.setLineWidth(0.3);
  doc.line(L + 4, sigBaseY + stampMmH - 3, L + stampMmW - 4, sigBaseY + stampMmH - 3);
  tf(false, 7.5); sc(C.label);
  doc.text("Client Signature", clientCentreX, sigBaseY + stampMmH + 4, { align: "center" });
  tf(true, 9); sc(C.navy);
  doc.text(q.clientName, clientCentreX, sigBaseY + stampMmH + 9, { align: "center" });

  // Goanny block — right (with stamp)
  const stampDrawX = R - stampMmW;
  const stampCentreX = R - stampMmW / 2;
  if (hasStamp) {
    doc.addImage(stamp, "PNG", stampDrawX, sigBaseY, stampMmW, stampMmH);
  } else {
    sd(C.border); doc.setLineWidth(0.3);
    doc.line(stampDrawX + 4, sigBaseY + stampMmH - 3, R - 4, sigBaseY + stampMmH - 3);
  }
  tf(false, 7.5); sc(C.label);
  doc.text("Authorised Signatory", stampCentreX, sigBaseY + stampMmH + 4, { align: "center" });
  tf(true, 9); sc(C.navy);
  doc.text("Goanny Technologies Pvt. Ltd.", stampCentreX, sigBaseY + stampMmH + 9, { align: "center" });

  y = sigBaseY + stampMmH + 14;

  // Page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    tf(false, 8); sc(C.label);
    doc.text(`Page ${i} of ${pages}`, 105, 288, { align: "center" });
  }

  doc.save(`AGR-${q.quotationNumber.replace(/\//g, "-")}.pdf`);
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

const NAVY = "#1C3660";

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

function DetailModal({ q, onClose, onStatusChange, updatingStatus }: {
  q: QuotationRecord;
  onClose: () => void;
  onStatusChange: (status: QuotationStatus) => void;
  updatingStatus: boolean;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadPDF(q);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4 rounded-t-2xl z-10">
          <div>
            <p className="font-mono text-xs text-slate-500 mb-0.5">{q.quotationNumber}</p>
            <h2 className="text-lg font-bold text-slate-900">{q.subject}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusSelect status={q.status} onChange={onStatusChange} disabled={updatingStatus} />
            <button
              onClick={handleDownload}
              disabled={downloading}
              title="Download Quotation PDF"
              style={{ backgroundColor: NAVY }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold transition-opacity"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {([
              [Hash,        "Quot. No", q.quotationNumber],
              [Calendar,    "Date",     fmt(q.date)],
              [IndianRupee, "Total",    fmtAmt(q.totalAmount)],
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
                <User className="w-4 h-4 text-slate-400" /> {q.clientName}
              </p>
              {q.clientAddress && (
                <p className="text-xs text-slate-600 leading-relaxed mt-1 flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" /> {q.clientAddress}
                </p>
              )}
            </div>
          </div>

          {q.introParagraph && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Introduction</p>
              <p className="text-sm text-slate-700 leading-relaxed">{q.introParagraph}</p>
            </div>
          )}

          {q.scope.length > 0 && (
            <div>
              <SectionTitle n={1}>Scope of Work</SectionTitle>
              <div className="space-y-2">
                {q.scope.map((s, i) => (
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

          {q.timeline && q.timeline.length > 0 && (
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
                    {q.timeline.map((p, i) => (
                      <tr key={i} className={i % 2 === 1 ? "bg-slate-50" : undefined}>
                        <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{p.phase}</td>
                        <td className="px-4 py-2.5 text-slate-600">{p.description || "—"}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700 whitespace-nowrap">{p.duration} {p.unit}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: `${NAVY}1A`, borderTop: `2px solid ${NAVY}` }}>
                      <td className="px-4 py-2.5 font-bold" style={{ color: NAVY }} colSpan={2}>TOTAL DURATION</td>
                      <td className="px-4 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: NAVY }}>{totalTimelineDays(q.timeline)} Days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {q.pricing.length > 0 && (
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
                    {q.pricing.map((p, i) => (
                      <tr key={i} className={i % 2 === 1 ? "bg-slate-50" : undefined}>
                        <td className="w-3/4 px-4 py-2.5 text-slate-700 break-words">{p.description}</td>
                        <td className="w-1/4 px-4 py-2.5 text-right font-medium text-slate-800 whitespace-nowrap">{fmtAmt(p.cost)}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: `${NAVY}1A`, borderTop: `2px solid ${NAVY}` }}>
                      <td className="w-3/4 px-4 py-2.5 font-bold" style={{ color: NAVY }}>TOTAL</td>
                      <td className="w-1/4 px-4 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: NAVY }}>{fmtAmt(q.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {q.paymentTerms.length > 0 && (
              <div>
                <SectionTitle n={4}>Payment Terms</SectionTitle>
                <ul className="space-y-1.5">
                  {q.paymentTerms.map((t, i) => (
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
            {q.termsConditions.length > 0 && (
              <div>
                <SectionTitle n={5}>Terms & Conditions</SectionTitle>
                <ul className="space-y-1">
                  {q.termsConditions.map((t, i) => (
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

          {q.note && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 mb-0.5">Note</p>
              <p className="text-xs text-amber-800">{q.note}</p>
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QuotationsPage() {
  const router = useRouter();

  // ── List state ──
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // ── Modal / action state ──
  const [selected, setSelected]       = useState<QuotationRecord | null>(null);
  const [actionId, setActionId]       = useState<string | null>(null); // row being fetched
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // ── Computed totals cache (populated when full detail is fetched) ──
  const [totalsCache, setTotalsCache] = useState<Record<string, number>>({});

  // ── Fetch list ──
  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await quotationsApi.list({
        search:   search   || undefined,
        status:   (statusFilter as QuotationStatus) || undefined,
        limit:    100,
      });
      setQuotations(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Fetch full detail then run callback (view / download) ──
  const withFullDetail = async (id: string, cb: (r: QuotationRecord) => void) => {
    setActionId(id);
    try {
      const full = await quotationsApi.get(id);
      const record = apiToRecord(full);
      // Cache the computed total so the list cell stays accurate
      if (record.totalAmount > 0) {
        setTotalsCache(prev => ({ ...prev, [id]: record.totalAmount }));
      }
      cb(record);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to load quotation detail");
    } finally {
      setActionId(null);
    }
  };

  const handleView     = (id: string) => withFullDetail(id, r => setSelected(r));
  const handleDownload = (id: string) => withFullDetail(id, r => downloadPDF(r));
  const handleAgreement= (id: string) => withFullDetail(id, r => downloadAgreementPDF(r));

  const handleStatusChange = async (id: string, status: QuotationStatus) => {
    setUpdatingStatusId(id);
    try {
      await quotationsApi.updateStatus(id, status);
      setQuotations(prev => prev.map(q => (q.id === id ? { ...q, status } : q)));
      setSelected(prev => (prev && prev.id === id ? { ...prev, status } : prev));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // ── Skeleton row ──
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-3 bg-slate-200 rounded w-full" /></td>
      ))}
    </tr>
  );

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and track all your quotations</p>
        </div>
        <Link href="/quotation/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Create Quotation
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by number, subject or client..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
        </div>
        <div className="relative">
          <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="pl-8 pr-8 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white appearance-none">
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <button onClick={() => { setSearch(""); setStatusFilter(""); }}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={fetchList} className="ml-auto text-xs underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[11px] text-slate-500 uppercase tracking-wider">
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap w-52">Quotation #</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Client</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Subject</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FileText className="w-8 h-8 opacity-50" />
                      <p className="text-sm font-medium">No quotations found</p>
                      <Link href="/quotation/new"
                        className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                        <Plus className="w-4 h-4" /> Create Quotation
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                quotations.map(q => {
                  const busy = actionId === q.id;
                  // Use cached computed total (from detail fetch) when available;
                  // fall back to the value the backend sent in the list response.
                  const displayTotal = totalsCache[q.id] ?? (Number(q.totalAmount) || 0);
                  return (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-600 w-52 whitespace-nowrap">{q.quotationNumber}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[160px] truncate whitespace-nowrap">{q.clientName}</td>
                      <td className="px-4 py-3 text-slate-800 max-w-[200px] truncate">{q.subject}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmt(q.date)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">{fmtAmt(displayTotal)}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusSelect
                          status={q.status}
                          disabled={updatingStatusId === q.id}
                          onChange={(s) => handleStatusChange(q.id, s)}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <button title="View" disabled={busy} onClick={() => handleView(q.id)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40">
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button title="Edit" onClick={() => router.push(`/quotation/${q.id}/edit`)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button title="Download Quotation PDF" disabled={busy} onClick={() => handleDownload(q.id)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40">
                            <Download className="w-4 h-4" />
                          </button>
                          <button title="Download Agreement PDF" disabled={busy} onClick={() => handleAgreement(q.id)}
                            className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-40">
                            <ScrollText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <DetailModal
          q={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(s) => handleStatusChange(selected.id, s)}
          updatingStatus={updatingStatusId === selected.id}
        />
      )}
    </div>
  );
}
