"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, PlusCircle, MinusCircle, ChevronRight, Save,
} from "lucide-react";
import {
  agreementsApi,
  type AgreementStatus,
} from "@/lib/api/agreements";
import type { ScopeItem, PricingRow } from "@/lib/quotationStore";

// ─── Types ────────────────────────────────────────────────────────────────────

const STATUSES: AgreementStatus[] = ["DRAFT", "SENT", "SIGNED", "ACTIVE", "EXPIRED", "TERMINATED"];

interface FormState {
  agreementNumber: string;
  clientId:        string;
  clientName:      string;
  clientAddress:   string;
  subject:         string;
  startDate:       string;
  endDate:         string;
  status:          AgreementStatus;
  introParagraph:  string;
  note:            string;
  scope:           ScopeItem[];
  pricing:         PricingRow[];
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

export default function EditAgreementPage() {
  const router      = useRouter();
  const { id }      = useParams<{ id: string }>();
  const [form, setForm]         = useState<FormState | null>(null);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    agreementsApi.get(id)
      .then(a => {
        setForm({
          agreementNumber: a.agreementNumber,
          clientId:        a.clientId ?? "",
          clientName:      a.clientName ?? a.client?.companyName ?? "",
          clientAddress:   a.clientAddress ?? "",
          subject:         a.subject,
          startDate:       (a.startDate ?? "").split("T")[0],
          endDate:         (a.endDate ?? "").split("T")[0],
          status:          a.status,
          introParagraph:  a.introParagraph ?? "",
          note:            a.note ?? "",
          scope:    (a.scope ?? []).map(s => ({ title: s.title, details: s.details ?? [] })),
          pricing:  (a.pricing ?? []).map(p => ({ description: p.description, cost: Number(p.cost) || 0 })),
          paymentTerms:    (a.paymentTerms ?? []).map(t => t.term),
          termsConditions: (a.termsConditions ?? []).map(t => t.term),
        });
      })
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <p className="text-sm font-medium">Agreement not found.</p>
      <button onClick={() => router.push("/contract")} className="text-xs text-indigo-600 hover:underline">← Back to list</button>
    </div>
  );

  if (!form) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const totalAmount = form.pricing.reduce((s, r) => s + (Number(r.cost) || 0), 0);

  const fi  = "w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white";
  const fi1 = "px-3 py-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white";
  const lb  = "block text-xs font-semibold text-slate-600 mb-1";

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.clientName.trim()) e.clientName = "Client name is required";
    if (!form.subject.trim())    e.subject    = "Subject is required";
    if (!form.startDate)         e.startDate  = "Start date is required";
    if (!form.endDate)           e.endDate    = "End date is required";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = "End date cannot be before start date";
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

      await agreementsApi.update(id, {
        clientId:        form.clientId,
        clientName:      form.clientName.trim(),
        clientAddress:   form.clientAddress.trim(),
        subject:         form.subject.trim(),
        startDate:       form.startDate,
        endDate:         form.endDate,
        totalAmount:     validPricing.reduce((s, p) => s + p.cost, 0),
        introParagraph:  form.introParagraph.trim(),
        note:            form.note.trim(),
        scope: form.scope
          .filter(s => s.title.trim())
          .map((s, i) => ({ title: s.title, details: s.details.filter(Boolean), sortOrder: i })),
        pricing: validPricing,
        paymentTerms: form.paymentTerms
          .filter(Boolean)
          .map((t, i) => ({ term: t, sortOrder: i })),
        termsConditions: form.termsConditions
          .filter(Boolean)
          .map((t, i) => ({ term: t, sortOrder: i })),
      });
      router.push("/contract");
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
          <h1 className="text-2xl font-bold text-slate-900">Edit Agreement</h1>
          <p className="text-xs font-mono text-slate-500 mt-0.5">{form.agreementNumber}</p>
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
            <input className={fi} placeholder="e.g. Annual Digital Marketing Retainer"
              value={form.subject}
              onChange={e => { setForm({ ...form, subject: e.target.value }); setErrors({ ...errors, subject: "" }); }} />
            {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
          </div>

          <div>
            <label className={lb}>Start Date <span className="text-red-500">*</span></label>
            <input type="date" className={fi} value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })} />
            {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
          </div>

          <div>
            <label className={lb}>End Date <span className="text-red-500">*</span></label>
            <input type="date" className={fi} value={form.endDate}
              onChange={e => setForm({ ...form, endDate: e.target.value })} />
            {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
          </div>

          <div>
            <label className={lb}>Status</label>
            <select className={fi} value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value as AgreementStatus })}>
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
              <input className={`${fi} flex-1`} placeholder="e.g. Retainer Fee"
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
              <input className={`${fi} flex-1`} placeholder="e.g. Validity: 12 months"
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
