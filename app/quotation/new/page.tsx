"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, PlusCircle, MinusCircle, ChevronRight, Save, Search, X,
  GripVertical, Info, Trash2, Calendar,
} from "lucide-react";
import { quotationsApi, type QuotationStatus } from "@/lib/api/quotations";
import { clientsApi } from "@/lib/api/clients";
import type { Client } from "@/types/client";
import type { ScopeItem, PricingRow, TimelinePhase, TimelineUnit } from "@/lib/quotationStore";

// ─── Types ────────────────────────────────────────────────────────────────────

const STATUSES: QuotationStatus[] = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];

const EMPTY = {
  clientId:      "",
  clientName:    "",
  clientAddress: "",
  subject:       "",
  date:          new Date().toISOString().split("T")[0],
  status:        "DRAFT" as QuotationStatus,
  introParagraph:
    "We are pleased to submit our quotation for your kind consideration. We look forward to a successful collaboration.",
  note:            "",
  scope:           [{ title: "", details: [""] }] as ScopeItem[],
  pricing:         [{ description: "", cost: 0 }] as PricingRow[],
  timeline:        [] as TimelinePhase[],
  paymentTerms:    ["50% advance on project kick-off", "50% balance on delivery"],
  termsConditions: ["Validity: 30 days from quotation date"],
};

const TIMELINE_UNITS: TimelineUnit[] = ["Days", "Weeks", "Months"];
const UNIT_TO_DAYS: Record<TimelineUnit, number> = { Days: 1, Weeks: 7, Months: 30 };
const UNIT_TO_API: Record<TimelineUnit, "DAYS" | "WEEKS" | "MONTHS"> = { Days: "DAYS", Weeks: "WEEKS", Months: "MONTHS" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function buildAddress(c: Client): string {
  const a = c.billingAddress;
  if (!a) return "";
  return [a.line1, a.line2, a.city, a.state && a.pincode ? `${a.state} – ${a.pincode}` : (a.state || a.pincode)]
    .filter(Boolean).join(", ");
}

// ─── Client Picker ────────────────────────────────────────────────────────────

function ClientPicker({
  value, onSelect,
}: {
  value: { id: string; name: string } | null;
  onSelect: (c: Client) => void;
}) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<Client[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await clientsApi.list({ search: query, limit: 8 });
        setResults(r.data);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const fi = "w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white";

  if (value?.id) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 border border-indigo-300 bg-indigo-50 rounded-lg">
        <span className="text-sm font-medium text-indigo-800 flex-1">{value.name}</span>
        <button onClick={() => onSelect({ companyName: "", id: undefined } as Client)}
          className="text-indigo-400 hover:text-indigo-700 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className={`${fi} pl-9`}
          placeholder="Search client by name…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && (query.trim() || results.length > 0) && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {loading && <p className="px-4 py-3 text-xs text-slate-400">Searching…</p>}
          {!loading && results.length === 0 && query.trim() && (
            <p className="px-4 py-3 text-xs text-slate-400">No clients found</p>
          )}
          {results.map(c => (
            <button key={c.id} type="button"
              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-0"
              onClick={() => { onSelect(c); setQuery(""); setOpen(false); }}>
              <p className="text-sm font-semibold text-slate-800">{c.companyName}</p>
              <p className="text-xs text-slate-500">{c.primaryEmail} · {c.mobile}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function Section({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h3>
      {action}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewQuotationPage() {
  const router = useRouter();
  const [form, setForm]     = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  const totalAmount = form.pricing.reduce((s, r) => s + (Number(r.cost) || 0), 0);
  const totalDurationDays = form.timeline.reduce((s, p) => s + (Number(p.duration) || 0) * UNIT_TO_DAYS[p.unit], 0);

  const fi  = "w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white";
  const fi1 = " px-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white";
  const lb  = "block text-xs font-semibold text-slate-600 mb-1";

  // ── Client selection ──
  const handleClientSelect = (c: Client) => {
    if (!c.id) {
      setForm(f => ({ ...f, clientId: "", clientName: "", clientAddress: "" }));
      return;
    }
    setForm(f => ({
      ...f,
      clientId:      c.id ?? "",
      clientName:    c.companyName,
      clientAddress: buildAddress(c),
    }));
    setErrors(e => ({ ...e, clientId: "" }));
  };

  // ── Validate ──
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.clientId)           e.clientId   = "Please select a client";
    if (!form.subject.trim())     e.subject    = "Subject is required";
    if (!form.date)               e.date       = "Date is required";
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

      await quotationsApi.create({
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
      });
      router.push("/quotation");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to save quotation");
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
          <h1 className="text-2xl font-bold text-slate-900">Create Quotation</h1>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Quotation"}
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

          {/* Client picker */}
          <div className="sm:col-span-2">
            <label className={lb}>Client <span className="text-red-500">*</span></label>
            <ClientPicker
              value={form.clientId ? { id: form.clientId, name: form.clientName } : null}
              onSelect={handleClientSelect}
            />
            {errors.clientId && <p className="text-xs text-red-500 mt-1">{errors.clientId}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className={lb}>Client / Company Name</label>
            <input className={fi} placeholder="Auto-filled from client selection"
              value={form.clientName}
              onChange={e => setForm({ ...form, clientName: e.target.value })} />
          </div>

          <div className="sm:col-span-2">
            <label className={lb}>Client Address</label>
            <textarea rows={2} className={fi} placeholder="Auto-filled from client selection"
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
          action={
            <button onClick={addScope}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
              <PlusCircle className="w-3.5 h-3.5" /> Add Section
            </button>
          }
        />
        <div className="space-y-4">
          {form.scope.map((s, si) => (
            <div key={si} className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50">
              <div className="flex gap-2">
                <input className={`${fi} flex-1`} placeholder="Section title (e.g. UI/UX Design)"
                  value={s.title} onChange={e => updScopeTitle(si, e.target.value)} />
                {form.scope.length > 1 && (
                  <button onClick={() => remScope(si)} className="text-red-400 hover:text-red-600 transition-colors">
                    <MinusCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-2 pl-2">
                {s.details.map((d, di) => (
                  <div key={di} className="flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input className={`${fi} flex-1`} placeholder="Detail point"
                      value={d} onChange={e => updScopeDetail(si, di, e.target.value)} />
                    {s.details.length > 1 && (
                      <button onClick={() => remScopeDetail(si, di)} className="text-red-400 hover:text-red-600 transition-colors">
                        <MinusCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => addScopeDetail(si)}
                className="ml-6 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
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
          action={
            <button onClick={addPricing}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
              <PlusCircle className="w-3.5 h-3.5" /> Add Row
            </button>
          }
        />
        {errors.pricing && <p className="text-xs text-red-500 mb-3">{errors.pricing}</p>}
        <div className="flex gap-2 mb-1 px-1">
          <p className="flex-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</p>
          <p className="w-24 text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">Amount (₹)</p>
          <div className="w-4 shrink-0" />
        </div>
        <div className="space-y-2">
          {form.pricing.map((p, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input className={`${fi} flex-1`} placeholder="e.g. UI/UX Design"
                value={p.description} onChange={e => updPricing(i, "description", e.target.value)} />
              <input type="number" className={`${fi1} w-24 shrink-0`} placeholder="0"
                value={p.cost || ""} onChange={e => updPricing(i, "cost", e.target.value)} />
              {form.pricing.length > 1 ? (
                <button onClick={() => remPricing(i)} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                  <MinusCircle className="w-4 h-4" />
                </button>
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
          {saving ? "Saving…" : "Save Quotation"}
        </button>
      </div>
    </div>
  );
}
