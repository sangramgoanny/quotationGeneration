"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, PlusCircle, MinusCircle, ChevronRight, Save,
  GripVertical, Info, Trash2, Calendar,
} from "lucide-react";
import {
  quotationsApi,
  type QuotationStatus,
  type CreateQuotationPayload,
} from "@/lib/api/quotations";
import type { ScopeItem, PricingRow, TimelinePhase, TimelineUnit } from "@/lib/quotationStore";

// ─── Types ────────────────────────────────────────────────────────────────────

const STATUSES: QuotationStatus[] = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];

const TIMELINE_UNITS: TimelineUnit[] = ["Days", "Weeks", "Months"];
const UNIT_TO_DAYS: Record<TimelineUnit, number> = { Days: 1, Weeks: 7, Months: 30 };
const UNIT_TO_API: Record<TimelineUnit, "DAYS" | "WEEKS" | "MONTHS"> = { Days: "DAYS", Weeks: "WEEKS", Months: "MONTHS" };
const API_TO_UNIT: Record<string, TimelineUnit> = { DAYS: "Days", WEEKS: "Weeks", MONTHS: "Months" };

interface FormState {
  quotationNumber: string;
  clientId:        string;
  clientName:      string;
  clientAddress:   string;
  subject:         string;
  date:            string;
  status:          QuotationStatus;
  introParagraph:  string;
  note:            string;
  scope:           ScopeItem[];
  pricing:         PricingRow[];
  timeline:        TimelinePhase[];
  paymentTerms:    string[];
  termsConditions: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function Section({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h3>
      {action}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditQuotationPage() {
  const router      = useRouter();
  const { id }      = useParams<{ id: string }>();
  const [form, setForm]         = useState<FormState | null>(null);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    quotationsApi.get(id)
      .then(q => {
        setForm({
          quotationNumber: q.quotationNumber,
          clientId:        q.clientId ?? "",
          clientName:      q.clientName ?? q.client?.companyName ?? "",
          clientAddress:   q.clientAddress ?? "",
          subject:         q.subject,
          date:            (q.date ?? "").split("T")[0],
          status:          q.status,
          introParagraph:  q.introParagraph ?? "",
          note:            q.note ?? "",
          scope:    (q.scope ?? []).map(s => ({ title: s.title, details: s.details ?? [] })),
          pricing:  (q.pricing ?? []).map(p => ({ description: p.description, cost: Number(p.cost) || 0 })),
          timeline: (
            (q as unknown as { timeline?: Array<{ phase: string; description?: string; duration: number; unit: string }> }).timeline ?? []
          ).map(p => ({
            phase:       p.phase,
            description: p.description ?? "",
            duration:    Number(p.duration) || 0,
            unit:        API_TO_UNIT[p.unit] ?? "Days",
          })),
          paymentTerms:    (q.paymentTerms ?? []).map(t => t.term),
          termsConditions: (q.termsConditions ?? []).map(t => t.term),
        });
      })
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <p className="text-sm font-medium">Quotation not found.</p>
      <button onClick={() => router.push("/quotation")} className="text-xs text-indigo-600 hover:underline">← Back to list</button>
    </div>
  );

  if (!form) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const totalAmount = form.pricing.reduce((s, r) => s + (Number(r.cost) || 0), 0);
  const totalDurationDays = form.timeline.reduce((s, p) => s + (Number(p.duration) || 0) * UNIT_TO_DAYS[p.unit], 0);

  const fi  = "w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white";
  const fi1 = "px-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white";
  const lb  = "block text-xs font-semibold text-slate-600 mb-1";

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.clientName.trim()) e.clientName = "Client name is required";
    if (!form.subject.trim())    e.subject    = "Subject is required";
    if (!form.date)              e.date       = "Date is required";
    if (form.pricing.some(p => !p.description.trim())) e.pricing = "Each pricing row needs a description";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setApiError("");
    try {
      const validPricing = form.pricing
        .filter(p => p.description.trim())
        .map((p, i) => ({ description: p.description, cost: Number(p.cost) || 0, sortOrder: i }));

      const validTimeline = form.timeline
        .filter(p => p.phase.trim())
        .map((p, i) => ({
          phase:       p.phase,
          description: p.description,
          duration:    Number(p.duration) || 0,
          unit:        UNIT_TO_API[p.unit],
          sortOrder:   i,
        }));

      // timeline isn't in CreateQuotationPayload's declared type yet — sent via a widened payload type.
      const payload: Partial<CreateQuotationPayload> & { timeline?: typeof validTimeline } = {
        clientId:        form.clientId,
        clientName:      form.clientName.trim(),
        clientAddress:   form.clientAddress.trim(),
        subject:         form.subject.trim(),
        date:            form.date,
        totalAmount:     validPricing.reduce((s, p) => s + p.cost, 0),
        introParagraph:  form.introParagraph.trim(),
        note:            form.note.trim(),
        scope: form.scope
          .filter(s => s.title.trim())
          .map((s, i) => ({ title: s.title, details: s.details.filter(Boolean), sortOrder: i })),
        pricing: validPricing,
        timeline: validTimeline,
        paymentTerms: form.paymentTerms
          .filter(Boolean)
          .map((t, i) => ({ term: t, sortOrder: i })),
        termsConditions: form.termsConditions
          .filter(Boolean)
          .map((t, i) => ({ term: t, sortOrder: i })),
      };

      await quotationsApi.update(id, payload);
      router.push("/quotation");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // ── Scope helpers ──
  const updScopeTitle  = (i: number, v: string) => { const s = [...form.scope]; s[i] = { ...s[i], title: v }; setForm({ ...form, scope: s }); };
  const addScopeDetail = (i: number)             => { const s = [...form.scope]; s[i] = { ...s[i], details: [...s[i].details, ""] }; setForm({ ...form, scope: s }); };
  const updScopeDetail = (si: number, di: number, v: string) => { const s = [...form.scope]; s[si].details[di] = v; setForm({ ...form, scope: s }); };
  const remScopeDetail = (si: number, di: number) => { const s = [...form.scope]; s[si].details = s[si].details.filter((_,j) => j !== di); setForm({ ...form, scope: s }); };
  const addScope       = () => setForm({ ...form, scope: [...form.scope, { title: "", details: [""] }] });
  const remScope       = (i: number) => setForm({ ...form, scope: form.scope.filter((_,j) => j !== i) });

  // ── Pricing helpers ──
  const updPricing = (i: number, field: keyof PricingRow, v: string) => {
    const p = [...form.pricing]; p[i] = { ...p[i], [field]: field === "cost" ? Number(v) || 0 : v }; setForm({ ...form, pricing: p });
  };
  const addPricing = () => setForm({ ...form, pricing: [...form.pricing, { description: "", cost: 0 }] });
  const remPricing = (i: number) => setForm({ ...form, pricing: form.pricing.filter((_,j) => j !== i) });

  // ── Timeline helpers ──
  const updPhase = (i: number, field: keyof TimelinePhase, v: string) => {
    const t = [...form.timeline];
    t[i] = { ...t[i], [field]: field === "duration" ? Number(v) || 0 : v };
    setForm({ ...form, timeline: t });
  };
  const addPhase = () => setForm({ ...form, timeline: [...form.timeline, { phase: "", description: "", duration: 1, unit: "Days" }] });
  const remPhase = (i: number) => setForm({ ...form, timeline: form.timeline.filter((_,j) => j !== i) });

  // ── List helpers ──
  const updList = (key: "paymentTerms" | "termsConditions", i: number, v: string) => {
    const a = [...form[key]]; a[i] = v; setForm({ ...form, [key]: a });
  };
  const addList = (key: "paymentTerms" | "termsConditions") => setForm({ ...form, [key]: [...form[key], ""] });
  const remList = (key: "paymentTerms" | "termsConditions", i: number) => setForm({ ...form, [key]: form[key].filter((_,j) => j !== i) });

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">

      {/* Page header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Edit Quotation</h1>
          <p className="text-xs font-mono text-slate-500 mt-0.5">{form.quotationNumber}</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* API error */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{apiError}</div>
      )}

      {/* ── Basic Info ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <Section title="Basic Information" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="sm:col-span-2">
            <label className={lb}>Client / Company Name <span className="text-red-500">*</span></label>
            <input className={fi} placeholder="e.g. Acme Corp Pvt. Ltd."
              value={form.clientName}
              onChange={e => { setForm({ ...form, clientName: e.target.value }); setErrors({ ...errors, clientName: "" }); }} />
            {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className={lb}>Client Address</label>
            <textarea rows={2} className={fi} placeholder="e.g. 301, Tech Park, Baner, Pune – 411045"
              value={form.clientAddress}
              onChange={e => setForm({ ...form, clientAddress: e.target.value })} />
          </div>

          <div className="sm:col-span-2">
            <label className={lb}>Subject <span className="text-red-500">*</span></label>
            <input className={fi} placeholder="e.g. Website Development Proposal"
              value={form.subject}
              onChange={e => { setForm({ ...form, subject: e.target.value }); setErrors({ ...errors, subject: "" }); }} />
            {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
          </div>

          <div>
            <label className={lb}>Date <span className="text-red-500">*</span></label>
            <input type="date" className={fi} value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>

          <div>
            <label className={lb}>Status</label>
            <select className={fi} value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value as QuotationStatus })}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Introduction ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <Section title="Introduction Paragraph" />
        <textarea rows={4} className={fi} value={form.introParagraph}
          onChange={e => setForm({ ...form, introParagraph: e.target.value })} />
      </div>

      {/* ── Scope of Work ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <Section title="Scope of Work"
          action={<button onClick={addScope} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"><PlusCircle className="w-3.5 h-3.5" /> Add Section</button>}
        />
        <div className="space-y-4">
          {form.scope.map((s, si) => (
            <div key={si} className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50">
              <div className="flex gap-2">
                <input className={`${fi} flex-1`} placeholder="Section title"
                  value={s.title} onChange={e => updScopeTitle(si, e.target.value)} />
                {form.scope.length > 1 && (
                  <button onClick={() => remScope(si)} className="text-red-400 hover:text-red-600 transition-colors"><MinusCircle className="w-4 h-4" /></button>
                )}
              </div>
              <div className="space-y-2 pl-2">
                {s.details.map((d, di) => (
                  <div key={di} className="flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input className={`${fi} flex-1`} placeholder="Detail point"
                      value={d} onChange={e => updScopeDetail(si, di, e.target.value)} />
                    {s.details.length > 1 && (
                      <button onClick={() => remScopeDetail(si, di)} className="text-red-400 hover:text-red-600 transition-colors"><MinusCircle className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => addScopeDetail(si)} className="ml-6 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
                <PlusCircle className="w-3 h-3" /> Add detail
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Timeline</h3>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <button onClick={addPhase}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
            <PlusCircle className="w-3.5 h-3.5" /> Add Phase
          </button>
        </div>

        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 mb-4">
          <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
          <p className="text-xs text-indigo-700">Add project phases and durations to show the estimated timeline for this proposal.</p>
        </div>

        {form.timeline.length > 0 && (
          <div className="flex gap-2 mb-1.5 px-1">
            <div className="w-4 shrink-0" />
            <p className="flex-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Phase / Milestone</p>
            <p className="flex-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Description (optional)</p>
            <p className="w-16 text-[11px] font-semibold text-slate-500 uppercase tracking-wide shrink-0">Duration</p>
            <p className="w-20 text-[11px] font-semibold text-slate-500 uppercase tracking-wide shrink-0">Unit</p>
            <div className="w-7 shrink-0" />
          </div>
        )}
        <div className="space-y-2">
          {form.timeline.map((p, i) => (
            <div key={i} className="flex gap-2 items-center">
              <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
              <input className={`${fi} flex-1`} placeholder="e.g. UI/UX Design"
                value={p.phase} onChange={e => updPhase(i, "phase", e.target.value)} />
              <input className={`${fi} flex-1`} placeholder="Optional details"
                value={p.description} onChange={e => updPhase(i, "description", e.target.value)} />
              <input type="number" min={0} className={`${fi1} w-16 shrink-0`} placeholder="0"
                value={p.duration || ""} onChange={e => updPhase(i, "duration", e.target.value)} />
              <select className={`${fi1} w-20 shrink-0`} value={p.unit}
                onChange={e => updPhase(i, "unit", e.target.value)}>
                {TIMELINE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button onClick={() => remPhase(i)} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button onClick={addPhase}
          className="mt-3 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
          <PlusCircle className="w-3.5 h-3.5" /> Add Phase
        </button>

        {totalDurationDays > 0 && (
          <div className="mt-4 flex justify-end">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-2 flex items-center gap-3">
              <span className="text-sm text-slate-600">Total Duration</span>
              <span className="text-base font-bold text-indigo-700">{totalDurationDays} Days</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Pricing ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <Section title="Pricing"
          action={<button onClick={addPricing} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"><PlusCircle className="w-3.5 h-3.5" /> Add Row</button>}
        />
        {errors.pricing && <p className="text-xs text-red-500 mb-3">{errors.pricing}</p>}
        <div className="flex gap-2 mb-1 px-1">
          <p className="flex-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</p>
          <p className="w-20 text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">Amount (₹)</p>
          <div className="w-4 shrink-0" />
        </div>
        <div className="space-y-2">
          {form.pricing.map((p, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input className={`${fi} flex-1`} placeholder="e.g. UI/UX Design"
                value={p.description} onChange={e => updPricing(i, "description", e.target.value)} />
              <input type="number" className={`${fi1} w-30 shrink-0`} placeholder="0"
                value={p.cost || ""} onChange={e => updPricing(i, "cost", e.target.value)} />
              {form.pricing.length > 1 ? (
                <button onClick={() => remPricing(i)} className="text-red-400 hover:text-red-600 transition-colors shrink-0"><MinusCircle className="w-4 h-4" /></button>
              ) : <div className="w-4 shrink-0" />}
            </div>
          ))}
        </div>
        {totalAmount > 0 && (
          <div className="mt-4 flex justify-end">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-2 flex items-center gap-3">
              <span className="text-sm text-slate-600">Total</span>
              <span className="text-base font-bold text-indigo-700">{fmtAmt(totalAmount)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Payment Terms ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <Section title="Payment Terms"
          action={<button onClick={() => addList("paymentTerms")} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"><PlusCircle className="w-3.5 h-3.5" /> Add</button>}
        />
        <div className="space-y-2">
          {form.paymentTerms.map((t, i) => (
            <div key={i} className="flex gap-2">
              <input className={`${fi} flex-1`} placeholder="e.g. 50% advance on kick-off"
                value={t} onChange={e => updList("paymentTerms", i, e.target.value)} />
              {form.paymentTerms.length > 1 && (
                <button onClick={() => remList("paymentTerms", i)} className="text-red-400 hover:text-red-600 transition-colors"><MinusCircle className="w-4 h-4" /></button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Terms & Conditions ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <Section title="Terms & Conditions"
          action={<button onClick={() => addList("termsConditions")} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"><PlusCircle className="w-3.5 h-3.5" /> Add</button>}
        />
        <div className="space-y-2">
          {form.termsConditions.map((t, i) => (
            <div key={i} className="flex gap-2">
              <input className={`${fi} flex-1`} placeholder="e.g. Validity: 30 days"
                value={t} onChange={e => updList("termsConditions", i, e.target.value)} />
              {form.termsConditions.length > 1 && (
                <button onClick={() => remList("termsConditions", i)} className="text-red-400 hover:text-red-600 transition-colors"><MinusCircle className="w-4 h-4" /></button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Note ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <Section title="Note (optional)" />
        <textarea rows={3} className={fi} placeholder="Any special notes or disclaimers..."
          value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
      </div>

      {/* Bottom save bar */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <button onClick={() => router.back()}
          className="px-5 py-2.5 border border-slate-300 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
