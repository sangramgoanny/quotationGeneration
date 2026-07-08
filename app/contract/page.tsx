"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Filter, ChevronDown, Eye, FileText,
  RefreshCw, X, Calendar, IndianRupee, User, Hash, MapPin, Download, Pencil,
  AlertCircle, Loader2,
} from "lucide-react";
import { type AgreementRecord } from "@/lib/agreementStore";
import {
  agreementsApi,
  type AgreementStatus,
  type AgreementListItem,
  type Agreement,
} from "@/lib/api/agreements";

// Map full API Agreement → AgreementRecord (used by PDF function)
function apiToRecord(a: Agreement): AgreementRecord {
  const pricing = (a.pricing ?? []).map(p => ({ description: p.description, cost: Number(p.cost) || 0 }));
  const computedTotal = pricing.reduce((sum, p) => sum + p.cost, 0);
  return {
    id:              a.id,
    agreementNumber: a.agreementNumber,
    clientName:      a.clientName ?? a.client?.companyName ?? "",
    clientAddress:   a.clientAddress ?? "",
    quotationId:     a.quotationId,
    subject:         a.subject,
    startDate:       (a.startDate ?? "").split("T")[0],
    endDate:         (a.endDate ?? "").split("T")[0],
    totalAmount:     computedTotal > 0 ? computedTotal : (Number(a.totalAmount) || 0),
    status:          a.status,
    createdAt:       (a.createdAt ?? "").split("T")[0],
    introParagraph:  a.introParagraph ?? "",
    note:            a.note ?? "",
    scope:           (a.scope ?? []).map(s => ({ title: s.title, details: s.details ?? [] })),
    pricing,
    paymentTerms:    (a.paymentTerms ?? []).map(t => t.term),
    termsConditions: (a.termsConditions ?? []).map(t => t.term),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<AgreementStatus, string> = {
  DRAFT:      "bg-slate-100 text-slate-600",
  SENT:       "bg-blue-100 text-blue-700",
  SIGNED:     "bg-violet-100 text-violet-700",
  ACTIVE:     "bg-green-100 text-green-700",
  EXPIRED:    "bg-amber-100 text-amber-700",
  TERMINATED: "bg-red-100 text-red-700",
};
const STATUSES: AgreementStatus[] = ["DRAFT", "SENT", "SIGNED", "ACTIVE", "EXPIRED", "TERMINATED"];

function StatusBadge({ status }: { status: AgreementStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}
function fmt(d: string) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}
function fmtAmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

// ─── PDF Generator (dual signature: Client + Goanny) ──────────────────────────

async function downloadAgreementPDF(a: AgreementRecord) {
  const { jsPDF } = await import("jspdf");
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

  // ── 2. META STRIP ──
  checkBreak(16);
  const startStr = a.startDate ? new Date(a.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const endStr   = a.endDate   ? new Date(a.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  sf(C.tint); sd(C.border); doc.setLineWidth(0.15);
  doc.roundedRect(L, y, W, 13, 1.5, 1.5, "FD");
  sf(C.navy); doc.rect(L, y, 3, 13, "F");
  tf(false, 7); sc(C.label);
  doc.text("AGREEMENT NO.", L + 6, y + 4);
  doc.text("START DATE", 95, y + 4, { align: "center" });
  doc.text("END DATE", R - 4, y + 4, { align: "right" });
  tf(true, 9); sc(C.dark);
  doc.text(a.agreementNumber, L + 6, y + 10);
  doc.text(startStr, 95, y + 10, { align: "center" });
  doc.text(endStr, R - 4, y + 10, { align: "right" });
  y += 13; ln(7);

  // ── 3. PARTIES ──
  checkBreak(22);
  const addrLines = a.clientAddress ? (doc.splitTextToSize(a.clientAddress, W - 10) as string[]) : [];
  const blockH = 7 + 6 + (addrLines.length > 0 ? 2 + addrLines.length * 4.5 : 0);
  sf(C.navy); doc.rect(L, y, 3, blockH, "F");
  sf(C.stripe); sd(C.border); doc.setLineWidth(0.12);
  doc.rect(L + 3, y, W - 3, blockH, "FD");
  tf(true, 7); sc(C.label);
  doc.text("CLIENT", L + 7, y + 4.5);
  tf(true, 12); sc(C.dark);
  doc.text(a.clientName, L + 7, y + 10.5);
  if (addrLines.length > 0) {
    tf(false, 9); sc(C.body);
    addrLines.forEach((line, i) => doc.text(line, L + 7, y + 15.5 + i * 4.5));
  }
  y += blockH; ln(7);

  // ── 4. AGREEMENT INTRO ──
  checkBreak(30);
  const agDate = a.startDate ? new Date(a.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";
  para(`This Service Agreement is made on ${agDate} between:`, false, 10, C.body, 0, 5);
  ln(1);
  para("Goanny Technologies Pvt. Ltd., 1st Floor, Inspiria Mall, Nigdi, Pune – 411044  (\"Service Provider\")", true, 10, C.dark, 0, 5);
  ln(1);
  para(`and  ${a.clientName}  ("Client").`, false, 10, C.body, 0, 5);
  ln(3);
  para("The Service Provider agrees to provide the services outlined below, and the Client agrees to compensate the Service Provider as per the agreed terms.", false, 10, C.body, 0, 5);
  ln(5);

  // ── 5. SCOPE ──
  if (a.scope.filter(s => s.title.trim()).length) {
    secHead("1.  SCOPE OF WORK");
    a.scope.filter(s => s.title.trim()).forEach((s, si) => {
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
  const validPricing = a.pricing.filter(p => p.description.trim());
  if (validPricing.length) {
    secHead("2.  COMMERCIAL OF SERVICES");
    const DW = 126, ROW_H = 8.5;
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
    doc.text(pdfAmt(a.totalAmount), R - 3, y + 5.5, { align: "right" });
    y += ROW_H; ln(8);
  }

  // ── 7. NOTE ──
  if (a.note) {
    const noteLines = doc.splitTextToSize(a.note, W - 12) as string[];
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
  if (a.paymentTerms.filter(Boolean).length) {
    secHead("3.  PAYMENT TERMS");
    a.paymentTerms.filter(Boolean).forEach((t, i) => {
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
  if (a.termsConditions.filter(Boolean).length) {
    secHead("4.  TERMS & CONDITIONS");
    a.termsConditions.filter(Boolean).forEach((t, i) => {
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

  const clientCentreX = L + stampMmW / 2;
  sd(C.border); doc.setLineWidth(0.3);
  doc.line(L + 4, sigBaseY + stampMmH - 3, L + stampMmW - 4, sigBaseY + stampMmH - 3);
  tf(false, 7.5); sc(C.label);
  doc.text("Client Signature", clientCentreX, sigBaseY + stampMmH + 4, { align: "center" });
  tf(true, 9); sc(C.navy);
  doc.text(a.clientName, clientCentreX, sigBaseY + stampMmH + 9, { align: "center" });

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

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    tf(false, 8); sc(C.label);
    doc.text(`Page ${i} of ${pages}`, 105, 288, { align: "center" });
  }

  doc.save(`${a.agreementNumber.replace(/\//g, "-")}.pdf`);
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ a, onClose }: { a: AgreementRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4 rounded-t-2xl z-10">
          <div>
            <p className="font-mono text-xs text-slate-500 mb-0.5">{a.agreementNumber}</p>
            <h2 className="text-lg font-bold text-slate-900">{a.subject}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={a.status} />
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {([
              [User,        "Client",     a.clientName],
              [Hash,        "Agr. No",    a.agreementNumber],
              [Calendar,    "Start Date", fmt(a.startDate)],
              [Calendar,    "End Date",   fmt(a.endDate)],
              [IndianRupee, "Total",      fmtAmt(a.totalAmount)],
            ] as [React.ComponentType<{ className?: string }>, string, string][]).map(([Icon, label, value]) => (
              <div key={label} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
          {a.clientAddress && (
            <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Address</p>
                <p className="text-sm font-semibold text-slate-800 leading-snug">{a.clientAddress}</p>
              </div>
            </div>
          )}

          {a.introParagraph && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Introduction</p>
              <p className="text-sm text-slate-700 leading-relaxed">{a.introParagraph}</p>
            </div>
          )}

          {a.scope.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Scope of Work</p>
              <div className="space-y-2">
                {a.scope.map((s, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-3">
                    <p className="text-sm font-semibold text-slate-800 mb-1.5">{s.title}</p>
                    <ul className="space-y-1">
                      {s.details.map((d, j) => (
                        <li key={j} className="text-xs text-slate-600 flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-400 shrink-0" />{d}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {a.pricing.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pricing Breakdown</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full table-fixed text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="w-3/4 px-4 py-2 text-left text-[11px] text-slate-500 font-semibold uppercase">Description</th>
                      <th className="w-1/4 px-4 py-2 text-right text-[11px] text-slate-500 font-semibold uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {a.pricing.map((p, i) => (
                      <tr key={i}>
                        <td className="w-3/4 px-4 py-2.5 text-slate-700 break-words">{p.description}</td>
                        <td className="w-1/4 px-4 py-2.5 text-right font-medium text-slate-800 whitespace-nowrap">{fmtAmt(p.cost)}</td>
                      </tr>
                    ))}
                    <tr className="bg-indigo-50">
                      <td className="w-3/4 px-4 py-2.5 font-bold text-slate-900">Total</td>
                      <td className="w-1/4 px-4 py-2.5 text-right font-bold text-indigo-700 whitespace-nowrap">{fmtAmt(a.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {a.paymentTerms.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Payment Terms</p>
                <ul className="space-y-1">
                  {a.paymentTerms.map((t, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-green-400 shrink-0" />{t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {a.termsConditions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Terms & Conditions</p>
                <ul className="space-y-1">
                  {a.termsConditions.map((t, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0" />{t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {a.note && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 mb-0.5">Note</p>
              <p className="text-xs text-amber-800">{a.note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AgreementsPage() {
  const router = useRouter();

  // ── List state ──
  const [agreements, setAgreements] = useState<AgreementListItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // ── Modal / action state ──
  const [selected, setSelected]       = useState<AgreementRecord | null>(null);
  const [actionId, setActionId]       = useState<string | null>(null);
  const [totalsCache, setTotalsCache] = useState<Record<string, number>>({});

  // ── Fetch list ──
  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await agreementsApi.list({
        search:   search   || undefined,
        status:   (statusFilter as AgreementStatus) || undefined,
        limit:    100,
      });
      setAgreements(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agreements");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Fetch full detail then run callback (view / download) ──
  const withFullDetail = async (id: string, cb: (r: AgreementRecord) => void) => {
    setActionId(id);
    try {
      const full = await agreementsApi.get(id);
      const record = apiToRecord(full);
      if (record.totalAmount > 0) {
        setTotalsCache(prev => ({ ...prev, [id]: record.totalAmount }));
      }
      cb(record);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to load agreement detail");
    } finally {
      setActionId(null);
    }
  };

  const handleView     = (id: string) => withFullDetail(id, r => setSelected(r));
  const handleDownload = (id: string) => withFullDetail(id, r => downloadAgreementPDF(r));

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
          <h1 className="text-2xl font-bold text-slate-900">Agreements</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and track all your service agreements</p>
        </div>
        <Link href="/contract/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Create Agreement
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
                <th className="px-3 py-3 text-left font-semibold whitespace-nowrap w-52">Agreement #</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Client</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Subject</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Start</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">End</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
              ) : agreements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FileText className="w-8 h-8 opacity-50" />
                      <p className="text-sm font-medium">No agreements found</p>
                      <Link href="/contract/new"
                        className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                        <Plus className="w-4 h-4" /> Create Agreement
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                agreements.map(a => {
                  const busy = actionId === a.id;
                  const displayTotal = totalsCache[a.id] ?? (Number(a.totalAmount) || 0);
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-600 w-52 whitespace-nowrap">{a.agreementNumber}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[160px] truncate whitespace-nowrap">{a.clientName}</td>
                      <td className="px-4 py-3 text-slate-800 max-w-[200px] truncate">{a.subject}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmt(a.startDate)}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmt(a.endDate)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">{fmtAmt(displayTotal)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <button title="View" disabled={busy} onClick={() => handleView(a.id)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40">
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button title="Edit" onClick={() => router.push(`/contract/${a.id}/edit`)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button title="Download Agreement PDF" disabled={busy} onClick={() => handleDownload(a.id)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40">
                            <Download className="w-4 h-4" />
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

      {selected && <DetailModal a={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
