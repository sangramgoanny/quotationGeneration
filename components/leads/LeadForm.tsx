"use client";

import React, { useState, useRef, useCallback, ChangeEvent } from "react";
import {
  User, Building2, Mail, Phone, MapPin, FileText, Briefcase,
  Globe, Landmark, Users, Upload, StickyNote, Tag, X, Plus,
  Facebook, Instagram, Linkedin, Twitter, Youtube, Search,
  CheckCircle2, AlertCircle, ChevronRight, Layers, Save,
} from "lucide-react";
import type {
  Client, ClientType, Industry, LeadSource,
  PaymentTerms, DocumentType, ContactPerson, Address,
} from "@/types/client";
import { emptyClient, emptyAddress, emptyBankDetails } from "@/types/client";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialData?: Partial<Client>;
  isLoading?: boolean;
  onSubmit: (lead: Client) => void;
  onCancel: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES: Industry[] = [
  "IT Services", "Digital Marketing", "Manufacturing", "Healthcare",
  "Education", "Retail", "Construction", "Mining", "Logistics",
  "Real Estate", "Finance", "Other",
];

const LEAD_SOURCES: LeadSource[] = [
  "Website", "Referral", "Facebook", "Instagram", "LinkedIn", "Google Ads",
  "Direct Call", "Cold Call", "Email", "Social Media", "Existing Client", "Other",
];

const PAYMENT_TERMS: PaymentTerms[] = [
  "Advance Payment", "Net 15", "Net 30", "Net 45", "Net 60",
];

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

const PRESET_TAGS: { label: string; color: string }[] = [
  { label: "Hot Lead",        color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" },
  { label: "Warm Lead",       color: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" },
  { label: "Cold Lead",       color: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100" },
  { label: "High Priority",   color: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" },
  { label: "VIP",             color: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100" },
  { label: "Enterprise",      color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" },
  { label: "SME",             color: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" },
  { label: "Referral",        color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
];

const DEV_SERVICES = [
  "Web Design", "Web Development", "Mobile App (Android)", "Mobile App (iOS)",
  "E-Commerce Development", "Custom Software Development", "API Development / Integration",
  "WordPress Development", "ERP Development", "UI/UX Design",
  "Landing Page Design", "Website Maintenance", "Domain & Hosting", "Other",
];

const DM_SERVICES = [
  "SEO (On-Page)", "SEO (Off-Page)", "Google Ads (PPC)", "Facebook Ads",
  "Instagram Marketing", "Social Media Management", "Content Marketing",
  "Email Marketing", "WhatsApp Marketing", "Video Marketing",
  "YouTube Marketing", "Google My Business", "Online Reputation Management",
  "Influencer Marketing", "Other",
];

// ─── Section definitions ──────────────────────────────────────────────────────

const SECTIONS = [
  { id: "basic",     label: "Basic Info",     icon: User },
  { id: "contact",   label: "Contact Info",   icon: Mail },
  { id: "address",   label: "Address",        icon: MapPin },
  { id: "gst",       label: "GST & Tax",      icon: FileText },
  { id: "business",  label: "Business",       icon: Briefcase },
  { id: "social",    label: "Social Media",   icon: Globe },
  { id: "account",   label: "Account Info",   icon: Landmark },
  { id: "bank",      label: "Bank Details",   icon: Building2 },
  { id: "contacts",  label: "Contacts",       icon: Users },
  { id: "documents", label: "Documents",      icon: Upload },
  { id: "notes",     label: "Notes",          icon: StickyNote },
  { id: "tags",      label: "Tags",           icon: Tag },
  { id: "services",  label: "Taken Services", icon: Layers },
];

// ─── Small reusable components ────────────────────────────────────────────────

function SectionCard({
  id, num, title, icon: Icon, children,
}: {
  id: string;
  num: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
        <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
          {num}
        </span>
        <Icon className="w-4 h-4 text-indigo-600 shrink-0" />
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Grid({ cols = 2, children }: { cols?: 2 | 3; children: React.ReactNode }) {
  return (
    <div className={`grid gap-4 ${cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
      {children}
    </div>
  );
}

function Field({
  label, required, error, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = "text", error, icon,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {icon}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition bg-white ${
          icon ? "pl-9" : ""
        } ${
          error
            ? "border-red-400 focus:ring-2 focus:ring-red-200"
            : "border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        }`}
      />
    </div>
  );
}

function SelectField({
  value, onChange, options, placeholder, error,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition bg-white ${
        error
          ? "border-red-400 focus:ring-2 focus:ring-red-200"
          : "border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      }`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Textarea({
  value, onChange, placeholder, rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
    />
  );
}

// ─── Address sub-form ─────────────────────────────────────────────────────────

function AddressFields({
  value, onChange, disabled,
}: {
  value: Address;
  onChange: (v: Address) => void;
  disabled?: boolean;
}) {
  const set = (k: keyof Address, v: string) => onChange({ ...value, [k]: v });
  return (
    <div className={`space-y-3 ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      <Grid>
        <Field label="Address Line 1">
          <Input value={value.line1} onChange={(v) => set("line1", v)} placeholder="Street / Flat / Building" />
        </Field>
        <Field label="Address Line 2">
          <Input value={value.line2} onChange={(v) => set("line2", v)} placeholder="Area / Locality" />
        </Field>
      </Grid>
      <Grid cols={3}>
        <Field label="City">
          <Input value={value.city} onChange={(v) => set("city", v)} placeholder="City" />
        </Field>
        <Field label="State">
          <Input value={value.state} onChange={(v) => set("state", v)} placeholder="State" />
        </Field>
        <Field label="Country">
          <Input value={value.country} onChange={(v) => set("country", v)} placeholder="Country" />
        </Field>
      </Grid>
      <div className="w-full sm:w-1/3">
        <Field label="PIN Code">
          <Input value={value.pincode} onChange={(v) => set("pincode", v)} placeholder="PIN / ZIP" />
        </Field>
      </div>
    </div>
  );
}

// ─── Contact person card ──────────────────────────────────────────────────────

const emptyContactPerson = (): ContactPerson => ({
  name: "", designation: "", department: "", email: "",
  mobile: "", whatsapp: "", isPrimary: false,
});

function ContactPersonCard({
  contact, index, onEdit, onDelete,
}: {
  contact: ContactPerson;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
          {contact.name.charAt(0).toUpperCase() || "?"}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            {contact.name || `Contact ${index + 1}`}
            {contact.isPrimary && (
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                Primary
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500">{[contact.designation, contact.department].filter(Boolean).join(" · ")}</p>
          <p className="text-xs text-slate-500 mt-0.5">{contact.email} {contact.mobile ? `· ${contact.mobile}` : ""}</p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button type="button" onClick={onEdit} className="text-xs text-indigo-600 hover:underline">Edit</button>
        <button type="button" onClick={onDelete} className="text-xs text-red-500 hover:underline">Delete</button>
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function LeadForm({ initialData, isLoading, onSubmit, onCancel }: Props) {
  const [lead, setLead] = useState<Client>(() => ({
    ...emptyClient(),
    ...initialData,
    status: "Lead",
    billingAddress: { ...emptyAddress(), ...(initialData?.billingAddress ?? {}) },
    shippingAddress: { ...emptyAddress(), ...(initialData?.shippingAddress ?? {}) },
    bankDetails: { ...emptyBankDetails(), ...(initialData?.bankDetails ?? {}) },
    contacts: initialData?.contacts ?? [],
    documents: initialData?.documents ?? [],
    tags: initialData?.tags ?? [],
    developmentServices: initialData?.developmentServices ?? [],
    digitalMarketingServices: initialData?.digitalMarketingServices ?? [],
  }));

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [activeSection, setActiveSection] = useState("basic");

  // Contact person editing state
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
  const [contactDraft, setContactDraft] = useState<ContactPerson>(emptyContactPerson());
  const [showContactForm, setShowContactForm] = useState(false);

  // Tag input
  const [tagInput, setTagInput] = useState("");

  // Section refs for scroll
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const set = useCallback(<K extends keyof Client>(key: K, value: Client[K]) => {
    setLead((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }, []);

  const setBilling = (v: Address) => {
    set("billingAddress", v);
    if (lead.sameShipping) set("shippingAddress", v);
  };

  const setSameShipping = (checked: boolean) => {
    set("sameShipping", checked);
    if (checked) set("shippingAddress", { ...lead.billingAddress });
  };

  const setBank = (k: keyof Client["bankDetails"], v: string) => {
    set("bankDetails", { ...lead.bankDetails, [k]: v });
  };

  const toggleService = (key: "developmentServices" | "digitalMarketingServices", s: string) => {
    const cur = lead[key];
    set(key, cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  };

  // Validation
  const getFieldSection = (field: string): string => {
    const map: Record<string, string> = {
      companyName: "basic",
      primaryEmail: "contact", mobile: "contact",
      gstNumber: "gst", panNumber: "gst",
    };
    return map[field] ?? "basic";
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const validate = (): boolean => {
    const e: Partial<Record<string, string>> = {};
    if (!lead.companyName.trim()) e.companyName = "Lead name is required";
    if (!lead.mobile.trim()) e.mobile = "Mobile number is required";
    if (lead.primaryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.primaryEmail))
      e.primaryEmail = "Enter a valid email";
    if (lead.gstRegistered && lead.gstNumber && lead.gstNumber.length !== 15)
      e.gstNumber = "GST number must be 15 characters";
    if (lead.panNumber && lead.panNumber.length !== 10)
      e.panNumber = "PAN must be 10 characters";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const firstKey = Object.keys(e)[0];
      scrollToSection(getFieldSection(firstKey));
    }
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit({ ...lead, status: "Lead" });
  };

  // Contact persons
  const openAddContact = () => {
    setContactDraft(emptyContactPerson());
    setEditingContactIndex(null);
    setShowContactForm(true);
  };

  const openEditContact = (idx: number) => {
    setContactDraft({ ...lead.contacts[idx] });
    setEditingContactIndex(idx);
    setShowContactForm(true);
  };

  const saveContact = () => {
    if (!contactDraft.name.trim()) return;
    const updated = [...lead.contacts];
    if (editingContactIndex !== null) {
      updated[editingContactIndex] = contactDraft;
    } else {
      updated.push({ ...contactDraft, id: crypto.randomUUID() });
    }
    const final = contactDraft.isPrimary
      ? updated.map((c, i) => {
          const idx = editingContactIndex !== null ? editingContactIndex : updated.length - 1;
          return i === idx ? c : { ...c, isPrimary: false };
        })
      : updated;
    set("contacts", final);
    setShowContactForm(false);
  };

  const deleteContact = (idx: number) => {
    set("contacts", lead.contacts.filter((_, i) => i !== idx));
  };

  // Tags
  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t || lead.tags.includes(t)) return;
    set("tags", [...lead.tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => set("tags", lead.tags.filter((x) => x !== t));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); }
  };

  // Documents (stub - no real S3)
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const stub: import("@/types/client").ClientDocument = {
      id: crypto.randomUUID(),
      name: file.name,
      documentType: "Other",
      fileType: file.type,
      fileSize: file.size,
      s3Url: URL.createObjectURL(file),
      uploadedBy: "Current User",
      uploadedAt: new Date().toISOString(),
    };
    set("documents", [...lead.documents, stub]);
    e.target.value = "";
  };

  const deleteDocument = (id: string) => {
    set("documents", lead.documents.filter((d) => d.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sticky section nav ── */}
        <aside className="hidden md:flex flex-col w-44 shrink-0 sticky top-0 self-start pt-4 pr-2 space-y-0.5 max-h-screen overflow-y-auto">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollToSection(s.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  activeSection === s.id
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{s.label}</span>
                {activeSection === s.id && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            );
          })}
        </aside>

        {/* ── Scrollable sections ── */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-24 pr-1">

          {/* 1. Basic Info */}
          <div ref={(el) => { sectionRefs.current["basic"] = el; }}>
            <SectionCard id="basic" num={1} title="Basic Info" icon={User}>
              <div className="space-y-4">
                <Grid>
                  <Field label="Client Type">
                    <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                      {(["Company", "Individual"] as ClientType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => set("clientType", t)}
                          className={`flex-1 py-2 text-sm font-medium transition-colors ${
                            lead.clientType === t
                              ? "bg-indigo-600 text-white"
                              : "bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Company Size">
                    <SelectField value={lead.companySize} onChange={(v) => set("companySize", v)} placeholder="Select size" options={COMPANY_SIZES} />
                  </Field>
                </Grid>
                <Grid>
                  <Field label="Company / Lead Name" required error={errors.companyName}>
                    <Input value={lead.companyName} onChange={(v) => set("companyName", v)} placeholder="Enter company or lead name" error={!!errors.companyName} />
                  </Field>
                  <Field label="Primary Contact Person">
                    <Input value={lead.contactPersonName} onChange={(v) => set("contactPersonName", v)} placeholder="Primary contact name" />
                  </Field>
                </Grid>
                <Grid cols={3}>
                  <Field label="Designation">
                    <Input value={lead.designation} onChange={(v) => set("designation", v)} placeholder="Founder, CEO, Manager..." />
                  </Field>
                  <Field label="Industry">
                    <SelectField value={lead.industry} onChange={(v) => set("industry", v as Industry)} placeholder="Select industry" options={INDUSTRIES} />
                  </Field>
                  <Field label="Business Type">
                    <Input value={lead.businessType} onChange={(v) => set("businessType", v)} placeholder="e.g. SaaS, Retail, B2B..." />
                  </Field>
                </Grid>
              </div>
            </SectionCard>
          </div>

          {/* 2. Contact Info */}
          <div ref={(el) => { sectionRefs.current["contact"] = el; }}>
            <SectionCard id="contact" num={2} title="Contact Info" icon={Mail}>
              <div className="space-y-4">
                <Grid>
                  <Field label="Primary Email" error={errors.primaryEmail}>
                    <Input type="email" value={lead.primaryEmail} onChange={(v) => set("primaryEmail", v)} placeholder="lead@company.com" error={!!errors.primaryEmail} icon={<Mail className="w-3.5 h-3.5" />} />
                  </Field>
                  <Field label="Secondary Email">
                    <Input type="email" value={lead.secondaryEmail} onChange={(v) => set("secondaryEmail", v)} placeholder="Secondary email" icon={<Mail className="w-3.5 h-3.5" />} />
                  </Field>
                </Grid>
                <Grid cols={3}>
                  <Field label="Mobile" required error={errors.mobile}>
                    <Input value={lead.mobile} onChange={(v) => set("mobile", v)} placeholder="+91 98765 43210" error={!!errors.mobile} icon={<Phone className="w-3.5 h-3.5" />} />
                  </Field>
                  <Field label="Alternate Mobile">
                    <Input value={lead.alternateMobile} onChange={(v) => set("alternateMobile", v)} placeholder="Alternate mobile" icon={<Phone className="w-3.5 h-3.5" />} />
                  </Field>
                  <Field label="Phone (Landline)">
                    <Input value={lead.phone} onChange={(v) => set("phone", v)} placeholder="Office landline" icon={<Phone className="w-3.5 h-3.5" />} />
                  </Field>
                </Grid>
                <Grid>
                  <Field label="WhatsApp Number">
                    <Input value={lead.whatsapp} onChange={(v) => set("whatsapp", v)} placeholder="WhatsApp number" />
                  </Field>
                  <Field label="Website">
                    <Input value={lead.website} onChange={(v) => set("website", v)} placeholder="https://company.com" icon={<Globe className="w-3.5 h-3.5" />} />
                  </Field>
                </Grid>
              </div>
            </SectionCard>
          </div>

          {/* 3. Address */}
          <div ref={(el) => { sectionRefs.current["address"] = el; }}>
            <SectionCard id="address" num={3} title="Address" icon={MapPin}>
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Billing Address</h3>
                  <AddressFields value={lead.billingAddress} onChange={setBilling} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input type="checkbox" checked={lead.sameShipping} onChange={(e) => setSameShipping(e.target.checked)} className="w-4 h-4 rounded accent-indigo-600" />
                  <span className="text-sm text-slate-700 font-medium">Shipping address same as billing</span>
                </label>
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Shipping Address</h3>
                  <AddressFields value={lead.shippingAddress} onChange={(v) => set("shippingAddress", v)} disabled={lead.sameShipping} />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* 4. GST & Tax */}
          <div ref={(el) => { sectionRefs.current["gst"] = el; }}>
            <SectionCard id="gst" num={4} title="GST & Tax" icon={FileText}>
              <div className="space-y-4">
                <Field label="GST Registered">
                  <div className="flex rounded-lg border border-slate-300 overflow-hidden w-40">
                    {[true, false].map((v) => (
                      <button key={String(v)} type="button" onClick={() => set("gstRegistered", v)}
                        className={`flex-1 py-2 text-sm font-medium transition-colors ${
                          lead.gstRegistered === v ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}>
                        {v ? "Yes" : "No"}
                      </button>
                    ))}
                  </div>
                </Field>
                <Grid>
                  <Field label="GST Number (15 chars)" error={errors.gstNumber}>
                    <Input value={lead.gstNumber} onChange={(v) => set("gstNumber", v.toUpperCase().slice(0, 15))} placeholder="22AAAAA0000A1Z5" error={!!errors.gstNumber} />
                  </Field>
                  <Field label="PAN Number (10 chars)" error={errors.panNumber}>
                    <Input value={lead.panNumber} onChange={(v) => set("panNumber", v.toUpperCase().slice(0, 10))} placeholder="AAAAA0000A" error={!!errors.panNumber} />
                  </Field>
                </Grid>
                <Grid>
                  <Field label="TAN Number">
                    <Input value={lead.tanNumber} onChange={(v) => set("tanNumber", v.toUpperCase())} placeholder="TAN number" />
                  </Field>
                  <Field label="MSME Number">
                    <Input value={lead.msmeNumber} onChange={(v) => set("msmeNumber", v)} placeholder="MSME registration number" />
                  </Field>
                </Grid>
              </div>
            </SectionCard>
          </div>

          {/* 5. Business Info */}
          <div ref={(el) => { sectionRefs.current["business"] = el; }}>
            <SectionCard id="business" num={5} title="Business Info" icon={Briefcase}>
              <div className="space-y-4">
                <Grid>
                  <Field label="Registration Number">
                    <Input value={lead.registrationNumber} onChange={(v) => set("registrationNumber", v)} placeholder="Reg. number" />
                  </Field>
                  <Field label="CIN Number">
                    <Input value={lead.cinNumber} onChange={(v) => set("cinNumber", v.toUpperCase())} placeholder="Corporate Identity Number" />
                  </Field>
                </Grid>
                <Grid cols={3}>
                  <Field label="Year Established">
                    <Input value={lead.yearEstablished} onChange={(v) => set("yearEstablished", v)} placeholder="e.g. 2010" type="number" />
                  </Field>
                  <Field label="Number of Employees">
                    <Input value={lead.numberOfEmployees} onChange={(v) => set("numberOfEmployees", v)} placeholder="e.g. 50" type="number" />
                  </Field>
                  <Field label="Estimated Annual Revenue (₹)">
                    <Input value={lead.annualRevenue} onChange={(v) => set("annualRevenue", v)} placeholder="e.g. 5,00,000" />
                  </Field>
                </Grid>
              </div>
            </SectionCard>
          </div>

          {/* 6. Social Media */}
          <div ref={(el) => { sectionRefs.current["social"] = el; }}>
            <SectionCard id="social" num={6} title="Social Media" icon={Globe}>
              <Grid cols={2}>
                <Field label="Facebook">
                  <Input value={lead.facebook} onChange={(v) => set("facebook", v)} placeholder="https://facebook.com/..." icon={<Facebook className="w-3.5 h-3.5 text-blue-600" />} />
                </Field>
                <Field label="Instagram">
                  <Input value={lead.instagram} onChange={(v) => set("instagram", v)} placeholder="https://instagram.com/..." icon={<Instagram className="w-3.5 h-3.5 text-pink-500" />} />
                </Field>
                <Field label="LinkedIn">
                  <Input value={lead.linkedin} onChange={(v) => set("linkedin", v)} placeholder="https://linkedin.com/in/..." icon={<Linkedin className="w-3.5 h-3.5 text-blue-700" />} />
                </Field>
                <Field label="Twitter / X">
                  <Input value={lead.twitter} onChange={(v) => set("twitter", v)} placeholder="https://twitter.com/..." icon={<Twitter className="w-3.5 h-3.5 text-sky-500" />} />
                </Field>
                <Field label="YouTube">
                  <Input value={lead.youtube} onChange={(v) => set("youtube", v)} placeholder="https://youtube.com/..." icon={<Youtube className="w-3.5 h-3.5 text-red-500" />} />
                </Field>
                <Field label="Google Business">
                  <Input value={lead.googleBusiness} onChange={(v) => set("googleBusiness", v)} placeholder="Google Business profile URL" icon={<Search className="w-3.5 h-3.5 text-yellow-500" />} />
                </Field>
              </Grid>
            </SectionCard>
          </div>

          {/* 7. Account Info */}
          <div ref={(el) => { sectionRefs.current["account"] = el; }}>
            <SectionCard id="account" num={7} title="Account Info" icon={Landmark}>
              <div className="space-y-4">
                <Grid>
                  <Field label="Account Manager">
                    <Input value={lead.accountManager} onChange={(v) => set("accountManager", v)} placeholder="Manager name" />
                  </Field>
                  <Field label="Lead Source">
                    <SelectField value={lead.leadSource} onChange={(v) => set("leadSource", v as LeadSource)} placeholder="Select source" options={LEAD_SOURCES} />
                  </Field>
                </Grid>
                <Grid cols={3}>
                  <Field label="Payment Terms">
                    <SelectField value={lead.paymentTerms} onChange={(v) => set("paymentTerms", v as PaymentTerms)} placeholder="Select terms" options={PAYMENT_TERMS} />
                  </Field>
                  <Field label="Credit Limit (₹)">
                    <Input value={lead.creditLimit} onChange={(v) => set("creditLimit", v)} placeholder="0" type="number" />
                  </Field>
                  <Field label="Opening Balance (₹)">
                    <Input value={lead.openingBalance} onChange={(v) => set("openingBalance", v)} placeholder="0" type="number" />
                  </Field>
                </Grid>
              </div>
            </SectionCard>
          </div>

          {/* 8. Bank Details */}
          <div ref={(el) => { sectionRefs.current["bank"] = el; }}>
            <SectionCard id="bank" num={8} title="Bank Details" icon={Building2}>
              <div className="space-y-4">
                <Grid>
                  <Field label="Bank Name">
                    <Input value={lead.bankDetails.bankName} onChange={(v) => setBank("bankName", v)} placeholder="e.g. HDFC Bank" />
                  </Field>
                  <Field label="Account Holder Name">
                    <Input value={lead.bankDetails.accountHolder} onChange={(v) => setBank("accountHolder", v)} placeholder="Account holder" />
                  </Field>
                </Grid>
                <Grid cols={3}>
                  <Field label="Account Number">
                    <Input value={lead.bankDetails.accountNumber} onChange={(v) => setBank("accountNumber", v)} placeholder="Account number" />
                  </Field>
                  <Field label="IFSC Code">
                    <Input value={lead.bankDetails.ifscCode} onChange={(v) => setBank("ifscCode", v.toUpperCase())} placeholder="IFSC code" />
                  </Field>
                  <Field label="Branch Name">
                    <Input value={lead.bankDetails.branchName} onChange={(v) => setBank("branchName", v)} placeholder="Branch name" />
                  </Field>
                </Grid>
                <div className="w-full sm:w-1/3">
                  <Field label="UPI ID">
                    <Input value={lead.bankDetails.upiId} onChange={(v) => setBank("upiId", v)} placeholder="name@upi" />
                  </Field>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* 9. Contact Persons */}
          <div ref={(el) => { sectionRefs.current["contacts"] = el; }}>
            <SectionCard id="contacts" num={9} title="Contact Persons" icon={Users}>
              <div className="space-y-3">
                {lead.contacts.length > 0 && (
                  <div className="space-y-2">
                    {lead.contacts.map((c, i) => (
                      <ContactPersonCard key={c.id ?? i} contact={c} index={i} onEdit={() => openEditContact(i)} onDelete={() => deleteContact(i)} />
                    ))}
                  </div>
                )}

                {showContactForm ? (
                  <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50 space-y-3">
                    <p className="text-sm font-semibold text-slate-800">
                      {editingContactIndex !== null ? "Edit Contact" : "Add New Contact"}
                    </p>
                    <Grid>
                      <Field label="Name" required>
                        <Input value={contactDraft.name} onChange={(v) => setContactDraft((d) => ({ ...d, name: v }))} placeholder="Full name" />
                      </Field>
                      <Field label="Designation">
                        <Input value={contactDraft.designation} onChange={(v) => setContactDraft((d) => ({ ...d, designation: v }))} placeholder="e.g. Manager" />
                      </Field>
                    </Grid>
                    <Grid>
                      <Field label="Department">
                        <Input value={contactDraft.department} onChange={(v) => setContactDraft((d) => ({ ...d, department: v }))} placeholder="e.g. Accounts" />
                      </Field>
                      <Field label="Email">
                        <Input type="email" value={contactDraft.email} onChange={(v) => setContactDraft((d) => ({ ...d, email: v }))} placeholder="Email address" />
                      </Field>
                    </Grid>
                    <Grid>
                      <Field label="Mobile">
                        <Input value={contactDraft.mobile} onChange={(v) => setContactDraft((d) => ({ ...d, mobile: v }))} placeholder="Mobile number" />
                      </Field>
                      <Field label="WhatsApp">
                        <Input value={contactDraft.whatsapp} onChange={(v) => setContactDraft((d) => ({ ...d, whatsapp: v }))} placeholder="WhatsApp number" />
                      </Field>
                    </Grid>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={contactDraft.isPrimary} onChange={(e) => setContactDraft((d) => ({ ...d, isPrimary: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
                      <span className="text-sm text-slate-700">Primary Contact</span>
                    </label>
                    <div className="flex gap-2">
                      <button type="button" onClick={saveContact} className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">Save</button>
                      <button type="button" onClick={() => setShowContactForm(false)} className="px-4 py-1.5 bg-white text-slate-600 text-sm rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={openAddContact} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors w-full justify-center">
                    <Plus className="w-4 h-4" /> Add Contact Person
                  </button>
                )}
              </div>
            </SectionCard>
          </div>

          {/* 10. Documents */}
          <div ref={(el) => { sectionRefs.current["documents"] = el; }}>
            <SectionCard id="documents" num={10} title="Documents" icon={Upload}>
              <div className="space-y-3">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors group">
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 mb-2" />
                  <p className="text-sm font-medium text-slate-600 group-hover:text-indigo-700">Click to upload document</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG, DOCX up to 10MB</p>
                  <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.docx" onChange={handleFileSelect} />
                </label>

                {lead.documents.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2 text-left">Name</th>
                          <th className="px-4 py-2 text-left hidden sm:table-cell">Type</th>
                          <th className="px-4 py-2 text-left hidden sm:table-cell">Size</th>
                          <th className="px-4 py-2 text-left hidden md:table-cell">Uploaded</th>
                          <th className="px-4 py-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lead.documents.map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-800 font-medium truncate max-w-[180px]">{doc.name}</td>
                            <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                              <SelectField
                                value={doc.documentType}
                                onChange={(v) => set("documents", lead.documents.map((d) => d.id === doc.id ? { ...d, documentType: v as DocumentType } : d))}
                                options={["GST Certificate","PAN Card","MSME Certificate","Company Registration","Incorporation Certificate","Cancelled Cheque","Purchase Order","NDA","Signed Agreement","Other"]}
                              />
                            </td>
                            <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{formatFileSize(doc.fileSize)}</td>
                            <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{new Date(doc.uploadedAt).toLocaleDateString("en-IN")}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <a href={doc.s3Url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">Preview</a>
                                <button type="button" onClick={() => deleteDocument(doc.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          {/* 11. Notes */}
          <div ref={(el) => { sectionRefs.current["notes"] = el; }}>
            <SectionCard id="notes" num={11} title="Notes" icon={StickyNote}>
              <div className="space-y-4">
                <Field label="Meeting Notes">
                  <Textarea value={lead.meetingNotes} onChange={(v) => set("meetingNotes", v)} placeholder="Requirement discussed, budget, next steps..." rows={3} />
                </Field>
                <Field label="Special Instructions">
                  <Textarea value={lead.specialInstructions} onChange={(v) => set("specialInstructions", v)} placeholder="Special handling, preferences..." rows={3} />
                </Field>
                <Field label="Internal Notes">
                  <Textarea value={lead.internalNotes} onChange={(v) => set("internalNotes", v)} placeholder="Add call summary, requirement, pricing discussion..." rows={3} />
                </Field>
              </div>
            </SectionCard>
          </div>

          {/* 12. Tags */}
          <div ref={(el) => { sectionRefs.current["tags"] = el; }}>
            <SectionCard id="tags" num={12} title="Tags" icon={Tag}>
              <div className="space-y-3">
                <Field label="Add Tags (press Enter)">
                  <div className="flex gap-2">
                    <Input value={tagInput} onChange={setTagInput} placeholder="Type a tag and press Enter" />
                    <button type="button" onClick={() => addTag(tagInput)} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors shrink-0">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Hidden input just to capture Enter key */}
                  <input className="hidden" onKeyDown={handleTagKeyDown} readOnly value={tagInput} />
                </Field>

                <div>
                  <p className="text-xs text-slate-500 mb-2">Suggested:</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_TAGS.filter((p) => !lead.tags.includes(p.label)).map(({ label, color }) => (
                      <button key={label} type="button" onClick={() => addTag(label)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors ${color}`}>
                        + {label}
                      </button>
                    ))}
                  </div>
                </div>

                {lead.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Current tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {lead.tags.map((tag) => {
                        const preset = PRESET_TAGS.find((p) => p.label === tag);
                        return (
                          <span key={tag} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${preset ? preset.color : "bg-indigo-100 text-indigo-700 border-indigo-200"}`}>
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-70 transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          {/* 13. Taken Services */}
          <div ref={(el) => { sectionRefs.current["services"] = el; }}>
            <SectionCard id="services" num={13} title="Taken Services" icon={Layers}>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">🖥️</span>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Development Services</p>
                    {lead.developmentServices.length > 0 && (
                      <span className="ml-auto text-[11px] text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">
                        {lead.developmentServices.length} selected
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DEV_SERVICES.map((s) => {
                      const active = lead.developmentServices.includes(s);
                      return (
                        <button key={s} type="button" onClick={() => toggleService("developmentServices", s)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            active ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                          }`}>
                          {active && <CheckCircle2 className="w-3 h-3" />}
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-100" />

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">📈</span>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Digital Marketing Services</p>
                    {lead.digitalMarketingServices.length > 0 && (
                      <span className="ml-auto text-[11px] text-violet-600 font-medium bg-violet-50 px-2 py-0.5 rounded-full">
                        {lead.digitalMarketingServices.length} selected
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DM_SERVICES.map((s) => {
                      const active = lead.digitalMarketingServices.includes(s);
                      return (
                        <button key={s} type="button" onClick={() => toggleService("digitalMarketingServices", s)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            active ? "bg-violet-600 border-violet-600 text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600"
                          }`}>
                          {active && <CheckCircle2 className="w-3 h-3" />}
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

        </div>
      </div>

      {/* ── Sticky bottom bar ── */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
          {Object.keys(errors).length > 0 && (
            <div className="flex items-start gap-1.5 text-red-500 min-w-0">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <ul className="flex flex-wrap gap-x-3 gap-y-0.5 min-w-0">
                {Object.values(errors).map((msg, i) => (
                  <li key={i} className="font-medium">{msg}</li>
                ))}
              </ul>
            </div>
          )}
          {Object.keys(errors).length === 0 && lead.companyName && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready to save
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="px-5 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isLoading ? "Saving..." : "Save Lead"}
          </button>
        </div>
      </div>
    </form>
  );
}
