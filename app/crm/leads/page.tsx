"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowUpRight, Bell, Calendar, CheckCircle2, ChevronDown, Clock, Eye, FileText, Globe, Mail,
  MapPin, MessageCircle, Phone, Plus, RefreshCw, Search, Snowflake, Target, Trash2, TrendingUp, UserCheck, UserPlus, X,
  Sparkles,
} from "lucide-react";
import type { Client, Industry, LeadSource } from "@/types/client";
import LeadQuotationSection from "@/components/leads/LeadQuotationSection";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { clientsApi } from "@/lib/api/clients";
import { notesApi } from "@/lib/api/notes";
import { remindersApi, REMINDER_TYPE_FROM_API, REMINDER_TYPE_TO_API } from "@/lib/api/reminders";
import { activityApi } from "@/lib/api/activity";

const INDUSTRIES: Industry[] = [
  "IT Services", "Digital Marketing", "Manufacturing", "Healthcare",
  "Education", "Retail", "Construction", "Mining", "Logistics",
  "Real Estate", "Finance", "Other",
];

const LEAD_SOURCES: LeadSource[] = [
  "Website", "Referral", "Facebook", "Instagram", "LinkedIn", "Google Ads",
  "Direct Call", "Cold Call", "Email", "Social Media", "Existing Client", "Other",
];

const CURRENT_USER = "Sangram";

const USER_LIST = [
  "Sangram",
  "Aarohi Patel",
  "Rahul Sharma",
  "Meera Joshi",
  "Vikram Singh",
];

type LeadStage = "New" | "Hot" | "Cold" | "Lost" | "Won" | "Quotation Sent";

const PRESET_TAGS = [
  "Hot Lead", "Warm Lead", "Cold Lead", "High Priority",
  "VIP", "Enterprise", "SME",
  "ERP", "Website", "Digital Marketing",
  "Referral", "Recurring Client",
];

type LeadRecord = Client & {
  leadStage: LeadStage;
};

const LEAD_STAGES: LeadStage[] = ["New", "Hot", "Cold", "Lost", "Won", "Quotation Sent"];

const LEAD_STAGE_COLORS: Record<LeadStage, string> = {
  New: "bg-slate-100 text-slate-700",
  Hot: "bg-red-100 text-red-700",
  Cold: "bg-cyan-100 text-cyan-700",
  Lost: "bg-zinc-100 text-zinc-600",
  Won: "bg-emerald-100 text-emerald-700",
  "Quotation Sent": "bg-amber-100 text-amber-700",
};

const DEV_SERVICES = [
  "Web Design",
  "Web Development",
  "Mobile App (Android)",
  "Mobile App (iOS)",
  "E-Commerce Development",
  "Custom Software Development",
  "API Development / Integration",
  "WordPress Development",
  "ERP Development",
  "UI/UX Design",
  "Landing Page Design",
  "Website Maintenance",
  "Domain & Hosting",
  "Other",
];

const DM_SERVICES = [
  "SEO (On-Page)",
  "SEO (Off-Page)",
  "Google Ads (PPC)",
  "Facebook Ads",
  "Instagram Marketing",
  "Social Media Management",
  "Content Marketing",
  "Email Marketing",
  "WhatsApp Marketing",
  "Video Marketing",
  "YouTube Marketing",
  "Google My Business",
  "Online Reputation Management",
  "Influencer Marketing",
  "Other",
];

type LeadNote = {
  id: string;
  text: string;
  createdAt: string;
  createdBy?: { id: string; name: string } | null;
};

type ActivityEntry = {
  id: string;
  user: string;
  action: string;
  description: string;
  createdAt: string;
};

type LeadReminder = {
  id: string;
  type: "Call" | "Meeting" | "Follow-up";
  title: string;
  scheduledAt: string;
  note: string;
  isDone?: boolean;
};


type StatTone = "blue" | "indigo" | "amber" | "red" | "sky" | "emerald" | "violet" | "zinc";

const STAT_TONE_STYLES: Record<StatTone, { iconBg: string; iconText: string; ring: string; border: string; bar: string }> = {
  blue:    { iconBg: "bg-blue-100",    iconText: "text-blue-600",    ring: "ring-blue-100",    border: "border-blue-300",    bar: "bg-blue-500" },
  indigo:  { iconBg: "bg-indigo-100",  iconText: "text-indigo-600",  ring: "ring-indigo-100",  border: "border-indigo-300",  bar: "bg-indigo-500" },
  amber:   { iconBg: "bg-amber-100",   iconText: "text-amber-600",   ring: "ring-amber-100",   border: "border-amber-300",   bar: "bg-amber-500" },
  red:     { iconBg: "bg-red-100",     iconText: "text-red-600",     ring: "ring-red-100",     border: "border-red-300",     bar: "bg-red-500" },
  sky:     { iconBg: "bg-sky-100",     iconText: "text-sky-600",     ring: "ring-sky-100",     border: "border-sky-300",     bar: "bg-sky-500" },
  emerald: { iconBg: "bg-emerald-100", iconText: "text-emerald-600", ring: "ring-emerald-100", border: "border-emerald-300", bar: "bg-emerald-500" },
  violet:  { iconBg: "bg-violet-100",  iconText: "text-violet-600",  ring: "ring-violet-100",  border: "border-violet-300",  bar: "bg-violet-500" },
  zinc:    { iconBg: "bg-zinc-100",    iconText: "text-zinc-600",    ring: "ring-zinc-200",    border: "border-zinc-300",    bar: "bg-zinc-500" },
};

function StatCard({
  label, value, icon: Icon, tone, onClick, active, external,
}: {
  label: string; value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: StatTone; onClick?: () => void; active?: boolean; external?: boolean;
}) {
  const s = STAT_TONE_STYLES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full text-left bg-white rounded-[20px] p-4 flex items-center gap-3 overflow-hidden
                  border shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition-all duration-300
                  ${active ? `${s.border} ring-4 ${s.ring} -translate-y-0.5 shadow-[0_24px_55px_rgba(37,99,235,0.14)]` : "border-slate-200 hover:border-sky-200 hover:shadow-[0_24px_55px_rgba(15,23,42,0.10)] hover:-translate-y-0.5"}`}
    >
      <div className={`absolute top-0 left-0 h-1 w-full ${s.bar} transition-opacity ${active ? "opacity-100" : "opacity-0 group-hover:opacity-70"}`} />
      <div className="pointer-events-none absolute -right-10 -top-12 h-24 w-24 rounded-full bg-sky-100/50 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />

      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${s.iconBg} ${s.iconText} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-2xl font-black text-slate-950 leading-tight tracking-tight">{value}</p>
        <p className="text-xs font-semibold text-slate-500 truncate">{label}</p>
      </div>

      {external ? (
        <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
      ) : active ? (
        <span className={`w-2 h-2 rounded-full shrink-0 ${s.bar}`} />
      ) : null}
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-[22px] p-5 animate-pulse shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="flex gap-3">
        <div className="h-12 w-12 bg-slate-100 rounded-2xl" />
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-100 rounded w-2/3 mt-3" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-6">
        <div className="h-10 bg-slate-100 rounded-2xl" />
        <div className="h-10 bg-slate-100 rounded-2xl" />
        <div className="h-10 bg-slate-100 rounded-2xl" />
      </div>
    </div>
  );
}

function formatDate(date?: string) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(date?: string) {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function phoneForUrl(phone?: string) {
  return String(phone ?? "").replace(/[^\d]/g, "");
}

const LEAD_STAGE_FROM_API: Record<string, LeadStage> = {
  NEW: "New", HOT: "Hot", WARM: "Cold", COLD: "Cold",
  QUOTATION_SENT: "Quotation Sent", WON: "Won", LOST: "Lost",
};

const CLIENT_TYPE_FROM_API: Record<string, string> = {
  COMPANY: "Company", INDIVIDUAL: "Individual",
};

const STATUS_FROM_API: Record<string, string> = {
  LEAD: "Lead", ACTIVE: "Active", INACTIVE: "Inactive",
  COMPLETED: "Completed", BLACKLISTED: "Blacklisted",
};

const INDUSTRY_FROM_API: Record<string, string> = {
  IT_SERVICES: "IT Services", DIGITAL_MARKETING: "Digital Marketing",
  MANUFACTURING: "Manufacturing", HEALTHCARE: "Healthcare",
  EDUCATION: "Education", RETAIL: "Retail", CONSTRUCTION: "Construction",
  MINING: "Mining", LOGISTICS: "Logistics", REAL_ESTATE: "Real Estate",
  FINANCE: "Finance", OTHER: "Other",
};

const LEAD_SOURCE_FROM_API: Record<string, string> = {
  WEBSITE: "Website", REFERRAL: "Referral", FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram", LINKEDIN: "LinkedIn", GOOGLE_ADS: "Google Ads",
  DIRECT_CALL: "Direct Call", EXISTING_CLIENT: "Existing Client",
  COLD_CALL: "Cold Call", EMAIL: "Email", SOCIAL_MEDIA: "Social Media", OTHER: "Other",
};

const s = (v: unknown) => (v == null ? "" : String(v));

function mapApiLead(raw: Record<string, unknown>): LeadRecord {
  const leadStageRaw = s(raw.leadStage).toUpperCase();
  const leadStage: LeadStage = LEAD_STAGE_FROM_API[leadStageRaw] ?? "New";

  // Billing: support both nested object and flat fields (billingLine1, billingCity…)
  const billing = (raw.billingAddress ?? raw.billing_address) as Record<string, unknown> | undefined;

  const PAYMENT_TERMS_FROM_API: Record<string, string> = {
    ADVANCE: "Advance Payment", ADVANCE_PAYMENT: "Advance Payment",
    NET_15: "Net 15", NET_30: "Net 30", NET_45: "Net 45", NET_60: "Net 60",
  };

  return {
    id:                   s(raw.id),
    clientCode:           s(raw.clientCode ?? raw.client_code),
    clientType:           (CLIENT_TYPE_FROM_API[s(raw.clientType).toUpperCase()] ?? "Company") as Client["clientType"],
    status:               (STATUS_FROM_API[s(raw.status).toUpperCase()] ?? "Lead") as Client["status"],
    leadStage,
    companyName:          s(raw.companyName ?? raw.company_name),
    contactPersonName:    s(raw.contactPersonName ?? raw.contact_person_name),
    designation:          s(raw.designation),
    industry:             (INDUSTRY_FROM_API[s(raw.industry).toUpperCase()] ?? s(raw.industry) ?? "") as Client["industry"],
    businessType:         s(raw.businessType ?? raw.business_type),
    companySize:          s(raw.companySize ?? raw.company_size),
    primaryEmail:         s(raw.primaryEmail ?? raw.primary_email),
    secondaryEmail:       s(raw.secondaryEmail ?? raw.secondary_email),
    mobile:               s(raw.mobile),
    alternateMobile:      s(raw.alternateMobile ?? raw.alternate_mobile),
    phone:                s(raw.phone),
    whatsapp:             s(raw.whatsapp),
    website:              s(raw.website),
    billingAddress: {
      line1:   s(billing?.line1   ?? raw.billingLine1   ?? raw.billing_line1),
      line2:   s(billing?.line2   ?? raw.billingLine2   ?? raw.billing_line2),
      city:    s(billing?.city    ?? raw.billingCity    ?? raw.billing_city),
      state:   s(billing?.state   ?? raw.billingState   ?? raw.billing_state),
      country: s(billing?.country ?? raw.billingCountry ?? raw.billing_country) || "India",
      pincode: s(billing?.pincode ?? raw.billingPincode ?? raw.billing_pincode),
    },
    sameShipping:         Boolean(raw.sameShipping ?? raw.same_shipping),
    shippingAddress: {
      line1:   s(raw.shippingLine1 ?? raw.shipping_line1),
      line2:   s(raw.shippingLine2 ?? raw.shipping_line2),
      city:    s(raw.shippingCity  ?? raw.shipping_city),
      state:   s(raw.shippingState ?? raw.shipping_state),
      country: s(raw.shippingCountry ?? raw.shipping_country) || "India",
      pincode: s(raw.shippingPincode ?? raw.shipping_pincode),
    },
    gstRegistered:        Boolean(raw.gstRegistered ?? raw.gst_registered),
    gstNumber:            s(raw.gstNumber ?? raw.gst_number),
    panNumber:            s(raw.panNumber ?? raw.pan_number),
    tanNumber:            s(raw.tanNumber ?? raw.tan_number),
    msmeNumber:           s(raw.msmeNumber ?? raw.msme_number),
    registrationNumber:   s(raw.registrationNumber ?? raw.registration_number),
    cinNumber:            s(raw.cinNumber ?? raw.cin_number),
    yearEstablished:      s(raw.yearEstablished ?? raw.year_established),
    numberOfEmployees:    s(raw.numberOfEmployees ?? raw.number_of_employees),
    annualRevenue:        s(raw.annualRevenue ?? raw.annual_revenue),
    facebook:             s(raw.facebook),
    instagram:            s(raw.instagram),
    linkedin:             s(raw.linkedin),
    twitter:              s(raw.twitter),
    youtube:              s(raw.youtube),
    googleBusiness:       s(raw.googleBusiness ?? raw.google_business),
    accountManager:       s(raw.accountManager ?? raw.account_manager),
    leadSource:           (LEAD_SOURCE_FROM_API[s(raw.leadSource ?? raw.lead_source).toUpperCase()] ?? s(raw.leadSource ?? raw.lead_source)) as Client["leadSource"],
    paymentTerms:         (PAYMENT_TERMS_FROM_API[s(raw.paymentTerms ?? raw.payment_terms).toUpperCase()] ?? s(raw.paymentTerms ?? raw.payment_terms)) as Client["paymentTerms"],
    creditLimit:          s(raw.creditLimit ?? raw.credit_limit),
    openingBalance:       s(raw.openingBalance ?? raw.opening_balance),
    outstandingBalance:   s(raw.outstandingBalance ?? raw.outstanding_balance),
    bankDetails: {
      bankName:      s(raw.bankName          ?? raw.bank_name),
      accountHolder: s(raw.bankAccountHolder ?? raw.bank_account_holder),
      accountNumber: s(raw.bankAccountNumber ?? raw.bank_account_number),
      ifscCode:      s(raw.bankIfscCode      ?? raw.bank_ifsc_code),
      branchName:    s(raw.bankBranchName    ?? raw.bank_branch_name),
      upiId:         s(raw.bankUpiId         ?? raw.bank_upi_id),
    },
    contacts:             Array.isArray(raw.contacts) ? raw.contacts : [],
    documents:            Array.isArray(raw.documents) ? raw.documents : [],
    internalNotes:        s(raw.internalNotes ?? raw.internal_notes),
    specialInstructions:  s(raw.specialInstructions ?? raw.special_instructions),
    meetingNotes:         s(raw.meetingNotes ?? raw.meeting_notes),
    tags:                 Array.isArray(raw.tags) ? raw.tags : [],
    developmentServices:      Array.isArray(raw.developmentServices ?? raw.development_services)
      ? (raw.developmentServices ?? raw.development_services) as string[] : [],
    digitalMarketingServices: Array.isArray(raw.digitalMarketingServices ?? raw.digital_marketing_services)
      ? (raw.digitalMarketingServices ?? raw.digital_marketing_services) as string[] : [],
    createdAt:            s(raw.createdAt ?? raw.created_at),
    updatedAt:            s(raw.updatedAt ?? raw.updated_at),
  };
}

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [wonCount, setWonCount] = useState(0);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [notesByLead, setNotesByLead] = useState<Record<string, LeadNote[]>>({});
  const [remindersByLead, setRemindersByLead] = useState<Record<string, LeadReminder[]>>({});
  const [activitiesByLead, setActivitiesByLead] = useState<Record<string, ActivityEntry[]>>({});
  const [noteDraft, setNoteDraft] = useState("");
  const [reminderType, setReminderType] = useState<LeadReminder["type"]>("Follow-up");
  const [reminderAt, setReminderAt] = useState("");
  const [reminderNote, setReminderNote] = useState("");

  const [triggerCreateQuotation, setTriggerCreateQuotation] = useState(false);
  const [focusQuotationList, setFocusQuotationList] = useState(false);
  const quotationSectionRef = useRef<HTMLDivElement | null>(null);
  const [popupTagInput, setPopupTagInput] = useState("");
  const [reminderPage, setReminderPage] = useState(1);
  const REMINDERS_PER_PAGE = 5;

  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [source, setSource] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [counterFilter, setCounterFilter] = useState<"" | "New" | "Hot" | "Cold" | "Won" | "Lost" | "QuotationSent" | "FollowUpToday" | "Total">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const visibleLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const today = new Date().toDateString();
    const followUpLeadIds = counterFilter === "FollowUpToday"
      ? new Set(
          Object.entries(remindersByLead)
            .filter(([, rs]) => rs.some((r) => new Date(r.scheduledAt).toDateString() === today))
            .map(([id]) => id)
        )
      : null;

    const fromTs = fromDate ? new Date(fromDate).getTime() : null;
    const toTs = toDate ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

    return leads.filter((lead) => {
      if (lead.status !== "Lead") return false;
      if (fromTs !== null || toTs !== null) {
        const createdTs = lead.createdAt ? new Date(lead.createdAt).getTime() : NaN;
        if (Number.isNaN(createdTs)) return false;
        if (fromTs !== null && createdTs < fromTs) return false;
        if (toTs !== null && createdTs > toTs) return false;
      }
      // Counter card filter (overrides other stage/tag filters)
      if (counterFilter === "FollowUpToday") return followUpLeadIds!.has(lead.id ?? "");
      if (counterFilter === "New")   return lead.leadStage === "New";
      if (counterFilter === "Hot")   return lead.leadStage === "Hot";
      if (counterFilter === "Cold")  return lead.leadStage === "Cold";
      if (counterFilter === "Won")   return lead.leadStage === "Won";
      if (counterFilter === "Lost")  return lead.leadStage === "Lost";
      if (counterFilter === "QuotationSent") return lead.leadStage === "Quotation Sent";
      // Regular filters (when no counter active)
      if (industry && lead.industry !== industry) return false;
      if (source && lead.leadSource !== source) return false;
      if (stageFilter && lead.leadStage !== stageFilter) return false;
      if (tagFilter && !lead.tags.includes(tagFilter)) return false;
      if (assignedFilter === "unassigned" && lead.accountManager) return false;
      if (assignedFilter && assignedFilter !== "unassigned" && lead.accountManager !== assignedFilter) return false;
      if (!q) return true;
      return [
        lead.companyName, lead.clientCode, lead.contactPersonName,
        lead.primaryEmail, lead.mobile, lead.industry, lead.leadSource, lead.leadStage,
      ].some((value) => String(value ?? "").toLowerCase().includes(q));
    });
  }, [leads, search, industry, source, stageFilter, tagFilter, assignedFilter, fromDate, toDate, counterFilter, remindersByLead]);

  const totalPages = Math.max(1, Math.ceil(visibleLeads.length / pageSize));
  const pagedLeads = visibleLeads.slice((page - 1) * pageSize, page * pageSize);

  // Reset to page 1 whenever filters change
  const setSearch2 = (v: string) => { setSearch(v); setCounterFilter(""); setPage(1); };
  const setIndustry2 = (v: string) => { setIndustry(v); setCounterFilter(""); setPage(1); };
  const setSource2 = (v: string) => { setSource(v); setCounterFilter(""); setPage(1); };
  const setStageFilter2 = (v: string) => { setStageFilter(v); setCounterFilter(""); setPage(1); };
  const setTagFilter2 = (v: string) => { setTagFilter(v); setPage(1); };
  const setAssignedFilter2 = (v: string) => { setAssignedFilter(v); setCounterFilter(""); setPage(1); };
  const setFromDate2 = (v: string) => { setFromDate(v); setCounterFilter(""); setPage(1); };
  const setToDate2 = (v: string) => { setToDate(v); setCounterFilter(""); setPage(1); };

  const toggleCounter = (key: typeof counterFilter) => {
    setCounterFilter((prev) => prev === key ? "" : key);
    setPage(1);
  };

  const fetchLeads = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await clientsApi.list({ status: "LEAD", limit: 200 });
      console.log("[fetchLeads] raw API response:", JSON.stringify(result.data, null, 2));
      const mapped = (result.data as unknown as Record<string, unknown>[]).map(mapApiLead);
      console.log("[fetchLeads] mapped leads:", JSON.stringify(mapped, null, 2));
      setLeads(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const fetchWonCount = async () => {
    try {
      setWonCount(await clientsApi.getWonCount());
    } catch { /* ignore if backend unavailable */ }
  };

  useEffect(() => { fetchLeads(); fetchWonCount(); }, []);

  const handleConvert = async (lead: LeadRecord) => {
    if (!lead.id) return;
    addActivity(lead.id, "Converted to Client", `${lead.companyName || "Lead"} marked as Active client`);
    setConverting(lead.id);
    try {
      await clientsApi.update(lead.id, { status: "Active", leadStage: undefined });
    } catch { /* ignore if backend unavailable */ }
    setLeads((prev) => prev.filter((item) => item.id !== lead.id));
    setSelectedLead((prev) => (prev?.id === lead.id ? null : prev));
    setConverting(null);
    fetchWonCount();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedLead(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openLead = (lead: LeadRecord, options?: { focusQuotations?: boolean }) => {
    setSelectedLead(lead); // show popup immediately with list data
    setFocusQuotationList(Boolean(options?.focusQuotations));
    // Fetch full detail (designation, address, bank, notes, etc.)
    if (lead.id) {
      clientsApi.get(lead.id).then((full) => {
        const fullMapped = mapApiLead(full as unknown as Record<string, unknown>);
        setLeads((prev) => prev.map((l) => l.id === lead.id ? fullMapped : l));
        setSelectedLead(fullMapped);
        console.log("[openLead] full data:", JSON.stringify(fullMapped, null, 2));
      }).catch(() => {
        console.log("[openLead] list data (full fetch failed):", JSON.stringify(lead, null, 2));
      });
    }
    setTriggerCreateQuotation(false);
    setNoteDraft("");
    setReminderType("Follow-up");
    setReminderAt("");
    setReminderNote("");
    setPopupTagInput("");
    setReminderPage(1);
    if (lead.id) {
      addActivity(lead.id, "Lead Viewed", `Lead profile opened by ${CURRENT_USER}`);
      // Fetch notes and reminders from API (silently, keep existing if fails)
      notesApi.list(lead.id).then((notes) => {
        if (notes.length > 0)
          setNotesByLead((prev) => ({ ...prev, [lead.id!]: notes.map((n) => ({ id: n.id, text: n.text, createdAt: n.createdAt, createdBy: n.createdBy })) }));
      }).catch(() => {});
      remindersApi.list(lead.id).then((reminders) => {
        if (reminders.length > 0)
          setRemindersByLead((prev) => ({
            ...prev,
            [lead.id!]: reminders.map((r) => ({
              id:          r.id,
              type:        (REMINDER_TYPE_FROM_API[r.type] ?? r.type) as LeadReminder["type"],
              title:       r.title,
              scheduledAt: r.scheduledAt,
              note:        r.note,
              isDone:      r.isDone,
            })),
          }));
      }).catch(() => {});

      // Fetch activities from API
      activityApi.list(lead.id).then((logs) => {
        if (logs.length > 0)
          setActivitiesByLead((prev) => ({
            ...prev,
            [lead.id!]: logs.map((a) => ({
              id:          a.id,
              user:        a.user?.name ?? a.userName ?? "Unknown",
              action:      a.action,
              description: a.description,
              createdAt:   a.createdAt,
            })),
          }));
      }).catch(() => {});
    }
  };

  useEffect(() => {
    if (!selectedLead || !focusQuotationList) return;

    const frame = requestAnimationFrame(() => {
      quotationSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setFocusQuotationList(false);
    });

    return () => cancelAnimationFrame(frame);
  }, [selectedLead, focusQuotationList]);

  const addNote = async () => {
    if (!selectedLead?.id || !noteDraft.trim()) return;
    const text = noteDraft.trim();
    const localNote: LeadNote = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() };
    setNotesByLead((prev) => ({ ...prev, [selectedLead.id!]: [localNote, ...(prev[selectedLead.id!] ?? [])] }));
    addActivity(selectedLead.id!, "Note Added", text.slice(0, 80));
    setNoteDraft("");
    try {
      const saved = await notesApi.create(selectedLead.id!, text);
      setNotesByLead((prev) => ({
        ...prev,
        [selectedLead.id!]: (prev[selectedLead.id!] ?? []).map((n) =>
          n.id === localNote.id
            ? { id: saved.id, text: saved.text, createdAt: saved.createdAt, createdBy: saved.createdBy }
            : n
        ),
      }));
    } catch { /* keep local note */ }
  };

  const addReminder = async (type: LeadReminder["type"], scheduledAt: string, note: string) => {
    if (!selectedLead?.id || !scheduledAt) return;
    const title = type === "Follow-up" ? "Follow-up" : `${type} reminder`;
    const localReminder: LeadReminder = { id: crypto.randomUUID(), type, title, scheduledAt, note: note.trim() };
    setRemindersByLead((prev) => ({ ...prev, [selectedLead.id!]: [localReminder, ...(prev[selectedLead.id!] ?? [])] }));
    const label = type === "Follow-up" ? "Follow-up Set" : `${type} Reminder Set`;
    addActivity(selectedLead.id!, label, `${title} scheduled for ${new Date(scheduledAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`);
    try {
      const saved = await remindersApi.create(selectedLead.id!, {
        type: REMINDER_TYPE_TO_API[type] ?? "FOLLOW_UP",
        title,
        scheduledAt,
        note: note.trim(),
      });
      setRemindersByLead((prev) => ({
        ...prev,
        [selectedLead.id!]: (prev[selectedLead.id!] ?? []).map((r) => r.id === localReminder.id ? { ...r, id: saved.id } : r),
      }));
    } catch { /* keep local reminder */ }
  };

  const assignLead = (leadId: string, accountManager: string) => {
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, accountManager } : l));
    setSelectedLead((prev) => prev?.id === leadId ? { ...prev, accountManager } : prev);
    addActivity(leadId, "Lead Assigned", `Assigned to ${accountManager || "Unassigned"}`);
    clientsApi.update(leadId, { accountManager }).catch(() => { /* ignore */ });
  };

  const assignSelectedLeadToMe = () => {
    if (!selectedLead?.id) return;
    assignLead(selectedLead.id, CURRENT_USER);
  };

  const updateLeadStage = async (leadId: string, leadStage: LeadStage) => {
    addActivity(leadId, "Stage Changed", `Status updated to "${leadStage}"`);

    if (leadStage === "Won") {
      setConverting(leadId);
      addActivity(leadId, "Converted to Client", "Lead marked as Active client after winning the deal");
      try {
        await clientsApi.update(leadId, { status: "Active", leadStage: undefined });
      } catch { /* ignore if backend unavailable */ }
      setLeads((prev) => prev.filter((item) => item.id !== leadId));
      setSelectedLead((prev) => (prev?.id === leadId ? null : prev));
      setConverting(null);
      fetchWonCount();
      return;
    }

    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, leadStage } : l));
    setSelectedLead((prev) => prev?.id === leadId ? { ...prev, leadStage } : prev);
    clientsApi.update(leadId, { leadStage }).catch(() => { /* ignore */ });
  };

  const updateLeadTags = (leadId: string, tags: string[]) => {
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, tags } : l));
    setSelectedLead((prev) => prev?.id === leadId ? { ...prev, tags } : prev);
    clientsApi.update(leadId, { tags }).catch(() => { /* ignore */ });
  };

  const toggleLeadService = (
    leadId: string,
    key: "developmentServices" | "digitalMarketingServices",
    service: string
  ) => {
    const update = (lead: LeadRecord): LeadRecord => {
      const current = lead[key] ?? [];
      const added = !current.includes(service);
      const next = added ? [...current, service] : current.filter((item) => item !== service);
      return { ...lead, [key]: next };
    };

    const current = leads.find((l) => l.id === leadId);
    const added = current ? !(current[key] ?? []).includes(service) : true;
    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? update(lead) : lead)));
    setSelectedLead((prev) => (prev?.id === leadId ? update(prev) : prev));
    addActivity(leadId, "Service Updated", `${added ? "Added" : "Removed"} "${service}"`);
    const updated = update(current ?? ({ [key]: [] } as unknown as LeadRecord));
    clientsApi.update(leadId, { [key]: updated[key] }).catch(() => { /* ignore */ });
  };

  const addActivity = (leadId: string, action: string, description: string) => {
    // Add to local state immediately (optimistic)
    const localEntry: ActivityEntry = {
      id: crypto.randomUUID(),
      user: CURRENT_USER,
      action,
      description,
      createdAt: new Date().toISOString(),
    };
    setActivitiesByLead((prev) => ({
      ...prev,
      [leadId]: [localEntry, ...(prev[leadId] ?? [])],
    }));

    // POST to backend (replace local entry with server id on success)
    activityApi.create(leadId, action, description).then((saved) => {
      setActivitiesByLead((prev) => ({
        ...prev,
        [leadId]: (prev[leadId] ?? []).map((e) =>
          e.id === localEntry.id
            ? {
                id:          saved.id,
                user:        saved.user?.name ?? saved.userName ?? CURRENT_USER,
                action:      saved.action,
                description: saved.description,
                createdAt:   saved.createdAt,
              }
            : e
        ),
      }));
    }).catch(() => { /* keep local entry if API fails */ });
  };

  const markReminderDone = (remId: string) => {
    if (!selectedLead?.id) return;
    const leadId = selectedLead.id;
    // Optimistic update
    setRemindersByLead((prev) => ({
      ...prev,
      [leadId]: (prev[leadId] ?? []).map((r) => r.id === remId ? { ...r, isDone: true } : r),
    }));
    addActivity(leadId, "Reminder Done", "Reminder marked as completed");
    remindersApi.update(leadId, remId, { isDone: true }).catch(() => {
      // Revert on failure
      setRemindersByLead((prev) => ({
        ...prev,
        [leadId]: (prev[leadId] ?? []).map((r) => r.id === remId ? { ...r, isDone: false } : r),
      }));
    });
  };

  const deleteReminderItem = (remId: string) => {
    if (!selectedLead?.id) return;
    const leadId = selectedLead.id;
    const backup = remindersByLead[leadId] ?? [];
    // Optimistic remove
    setRemindersByLead((prev) => ({
      ...prev,
      [leadId]: (prev[leadId] ?? []).filter((r) => r.id !== remId),
    }));
    remindersApi.delete(leadId, remId).catch(() => {
      // Revert on failure
      setRemindersByLead((prev) => ({ ...prev, [leadId]: backup }));
    });
  };

  const selectedLeadNotes = selectedLead?.id ? notesByLead[selectedLead.id] ?? [] : [];
  const selectedLeadReminders = selectedLead?.id ? remindersByLead[selectedLead.id] ?? [] : [];
  const selectedLeadActivities = selectedLead?.id ? activitiesByLead[selectedLead.id] ?? [] : [];
  const selectedRequirementCount = selectedLead
    ? selectedLead.developmentServices.length + selectedLead.digitalMarketingServices.length
    : 0;
  const selectedPhone = phoneForUrl(selectedLead?.mobile || selectedLead?.whatsapp);
  const selectedWhatsapp = phoneForUrl(selectedLead?.whatsapp || selectedLead?.mobile);
  const whatsappText = selectedLead
    ? encodeURIComponent(`Hi ${selectedLead.contactPersonName || selectedLead.companyName}, following up regarding your enquiry with us.`)
    : "";

  const allLeads = useMemo(() => leads.filter((l) => l.status === "Lead"), [leads]);

  const totalLeads     = allLeads.length;
  const newLeads       = useMemo(() => allLeads.filter((l) => l.leadStage === "New").length,  [allLeads]);
  const hotLeads       = useMemo(() => allLeads.filter((l) => l.leadStage === "Hot").length,  [allLeads]);
  const coldLeads      = useMemo(() => allLeads.filter((l) => l.leadStage === "Cold").length, [allLeads]);
  const lostLeads      = useMemo(() => allLeads.filter((l) => l.leadStage === "Lost").length, [allLeads]);
  const quotationSentLeads = useMemo(() => allLeads.filter((l) => l.leadStage === "Quotation Sent").length, [allLeads]);
  const remindersToday = useMemo(() => {
    const today = new Date().toDateString();
    return Object.values(remindersByLead)
      .flat()
      .filter((r) => new Date(r.scheduledAt).toDateString() === today)
      .length;
  }, [remindersByLead]);

  return (
    <main className="min-h-screen bg-[#F6F8FB] p-4 space-y-6 lg:p-6">
      <section className="relative overflow-hidden rounded-[28px] border border-white bg-[#061526] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.16)] lg:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(14,165,233,0.30),transparent_28%),radial-gradient(circle_at_90%_8%,rgba(230,0,70,0.22),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.10),transparent_42%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-sky-100">
              <Sparkles className="h-3.5 w-3.5 text-[#0EA5E9]" />
              Goanny AI CRM
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white lg:text-4xl">Leads Command Center</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Track prospects, reminders, quotations, ownership, and next actions before they become active clients.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={fetchLeads}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-4 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/14"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Link
              href="/crm/leads/new"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#063A66] shadow-lg shadow-sky-950/20 transition hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" /> Add Lead
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-8">
        <StatCard label="Total Leads"     value={totalLeads}         icon={Target}      tone="blue"    onClick={() => toggleCounter("Total")}         active={counterFilter === "Total"} />
        <StatCard label="New Leads"       value={newLeads}           icon={UserPlus}    tone="indigo"  onClick={() => toggleCounter("New")}           active={counterFilter === "New"} />
        <StatCard label="Reminders Today" value={remindersToday}     icon={Clock}       tone="amber"   onClick={() => toggleCounter("FollowUpToday")} active={counterFilter === "FollowUpToday"} />
        <StatCard label="Hot Leads"       value={hotLeads}           icon={TrendingUp}  tone="red"     onClick={() => toggleCounter("Hot")}           active={counterFilter === "Hot"} />
        <StatCard label="Cold Leads"      value={coldLeads}          icon={Snowflake}   tone="sky"     onClick={() => toggleCounter("Cold")}          active={counterFilter === "Cold"} />
        <StatCard label="Won Leads"       value={wonCount}           icon={UserCheck}   tone="emerald" onClick={() => router.push("/crm/clients?status=Active")} external />
        <StatCard label="Quotation Sent"  value={quotationSentLeads} icon={FileText}    tone="violet"  onClick={() => toggleCounter("QuotationSent")} active={counterFilter === "QuotationSent"} />
        <StatCard label="Lost Leads"      value={lostLeads}          icon={AlertCircle} tone="zinc"    onClick={() => toggleCounter("Lost")}          active={counterFilter === "Lost"} />
      </div>

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">Lead Filters</h2>
            <p className="text-sm text-slate-500">Search, segment, and prioritize active prospects.</p>
          </div>
          <div className="text-xs font-semibold text-slate-400">
            {visibleLeads.length} visible of {totalLeads} leads
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.6fr)_auto_1fr_1fr_1fr_1fr_1fr_auto_auto]">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch2(e.target.value)}
              placeholder="Search leads by name, code, email, or mobile"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <DateRangePicker
            from={fromDate}
            to={toDate}
            onChange={(f, t) => { setFromDate2(f); setToDate2(t); }}
          />

          <div className="relative min-w-[150px]">
            <select
              value={industry}
              onChange={(e) => setIndustry2(e.target.value)}
              className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            >
              <option value="">All Industries</option>
              {INDUSTRIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative min-w-[150px]">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter2(e.target.value)}
              className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            >
              <option value="">All Status</option>
              {LEAD_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative min-w-[150px]">
            <select
              value={source}
              onChange={(e) => setSource2(e.target.value)}
              className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            >
              <option value="">All Sources</option>
              {LEAD_SOURCES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative min-w-[150px]">
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter2(e.target.value)}
              className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            >
              <option value="">All Assigned</option>
              <option value="unassigned">Unassigned</option>
              {USER_LIST.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative min-w-[150px]">
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter2(e.target.value)}
              className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            >
              <option value="">All Tags</option>
              {PRESET_TAGS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {(search || industry || stageFilter || source || tagFilter || assignedFilter || fromDate || toDate || counterFilter) && (
            <button
              type="button"
              onClick={() => { setSearch(""); setIndustry(""); setStageFilter(""); setSource(""); setTagFilter(""); setAssignedFilter(""); setFromDate(""); setToDate(""); setCounterFilter(""); setPage(1); }}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          )}
          <button
            type="button"
            onClick={fetchLeads}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-[24px] border border-red-200 bg-white py-16 text-center text-red-600 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold">{error}</p>
          <button onClick={fetchLeads} className="mt-4 rounded-2xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100">Retry</button>
        </section>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : visibleLeads.length === 0 ? (
        <section className="rounded-[24px] border border-slate-200 bg-white py-20 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-50 text-[#0070B8]">
            <Target className="w-8 h-8" />
          </div>
          <p className="mt-4 text-base font-black text-slate-800">No leads found</p>
          <p className="mt-1 text-sm text-slate-500">Add a new lead or adjust the current filters.</p>
          <Link href="/crm/leads/new" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#0070B8] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-100 transition hover:-translate-y-0.5 hover:bg-[#075f99]">
            <Plus className="w-4 h-4" /> Add Lead
          </Link>
        </section>
      ) : (
        <>
        <section className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          {pagedLeads.map((lead) => {
            const location = [lead.billingAddress?.city, lead.billingAddress?.state].filter(Boolean).join(", ");
            const initials = (lead.companyName || lead.contactPersonName || "LD").slice(0, 2).toUpperCase();
            const reqCount = lead.developmentServices.length + lead.digitalMarketingServices.length;
            return (
              <article
                key={lead.id}
                className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_24px_55px_rgba(15,23,42,0.10)]"
              >
                <div className="h-1 bg-gradient-to-r from-[#0070B8] via-[#0EA5E9] to-[#E60046]" />
                <div className="flex items-start gap-4 p-5 pb-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0070B8] to-[#0EA5E9] text-sm font-black text-white shadow-lg shadow-sky-100 transition duration-300 group-hover:scale-105 group-hover:rotate-3">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openLead(lead)}
                        className="text-left text-base font-black leading-snug text-slate-950 break-words transition hover:text-[#0070B8]"
                      >
                        {lead.companyName || "Unnamed Lead"}
                      </button>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ring-white ${LEAD_STAGE_COLORS[lead.leadStage]}`}>
                        {lead.leadStage}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-slate-500">
                      {[lead.contactPersonName, lead.designation].filter(Boolean).join(" · ") || "Contact pending"}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {lead.industry && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{lead.industry}</span>
                      )}
                      {lead.leadSource && (
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-[#0070B8]">{lead.leadSource}</span>
                      )}
                      {lead.clientCode && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-mono text-slate-500">{lead.clientCode}</span>
                      )}
                      {lead.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">{tag}</span>
                      ))}
                      {lead.tags.length > 3 && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">+{lead.tags.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mx-5 grid grid-cols-1 gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400"><Phone className="w-3.5 h-3.5" /></span>
                    <span className="truncate font-semibold">{lead.mobile || "-"}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400"><Mail className="w-3.5 h-3.5" /></span>
                    <span className="truncate font-semibold">{lead.primaryEmail || "-"}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400"><MapPin className="w-3.5 h-3.5" /></span>
                    <span className="truncate font-semibold">{location || lead.shippingAddress.city || "-"}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400"><Globe className="w-3.5 h-3.5" /></span>
                    {lead.website
                      ? <a href={lead.website} target="_blank" rel="noreferrer" className="truncate font-bold text-[#0070B8] hover:underline">{lead.website.replace(/^https?:\/\//, "")}</a>
                      : <span className="text-slate-400">—</span>}
                  </div>
                </div>

                <div className="mx-5 mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 text-[11px] text-slate-500">
                  <span className="rounded-full bg-slate-50 px-2.5 py-1">
                    Assigned: <span className="font-semibold text-slate-700">{lead.accountManager || "Unassigned"}</span>
                  </span>
                  <span className="rounded-full bg-slate-50 px-2.5 py-1">
                    Services: <span className="font-semibold text-slate-700">{reqCount}</span>
                  </span>
                  <span className="ml-auto flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1">
                    <Calendar className="w-3 h-3" />
                    {formatDateTime(lead.createdAt)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 px-5 py-4">
                  {lead.mobile && (
                    <a
                      href={`tel:${phoneForUrl(lead.mobile)}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100"
                    >
                      <Phone className="w-3 h-3" /> Call
                    </a>
                  )}
                  {(lead.whatsapp || lead.mobile) && (
                    <a
                      href={`https://wa.me/${phoneForUrl(lead.whatsapp || lead.mobile)}?text=${encodeURIComponent(`Hi ${lead.contactPersonName || lead.companyName}, following up regarding your enquiry with us.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[11px] font-bold text-green-700 transition hover:-translate-y-0.5 hover:bg-green-100"
                    >
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => openLead(lead)}
                    className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] font-bold text-[#0070B8] transition hover:-translate-y-0.5 hover:bg-sky-100"
                  >
                    <Eye className="w-3 h-3" /> View
                  </button>
                  <button
                    onClick={() => openLead(lead, { focusQuotations: true })}
                    className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100"
                  >
                    <FileText className="w-3 h-3" /> Quotation
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-700">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, visibleLeads.length)}</span> of <span className="font-semibold text-slate-700">{visibleLeads.length}</span> leads
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-semibold outline-none focus:border-sky-300"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">per page</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setPage(pg)}
                  className={`h-8 w-8 rounded-xl border text-xs font-bold transition-colors ${
                    pg === page
                      ? "border-[#0070B8] bg-[#0070B8] text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pg}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm"
          onClick={() => setSelectedLead(null)}>
          <section className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)] ring-1 ring-white/40"
            onClick={(e) => e.stopPropagation()}>

            {/* ── Modal Header ── */}
            <div className="relative flex shrink-0 items-center gap-4 overflow-hidden border-b border-white/10 bg-[#061526] px-6 py-5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(14,165,233,0.30),transparent_30%),radial-gradient(circle_at_88%_8%,rgba(230,0,70,0.22),transparent_26%)]" />
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/14 text-base font-black text-white ring-1 ring-white/15">
                {(selectedLead.companyName || "LD").slice(0, 2).toUpperCase()}
              </div>
              <div className="relative min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="truncate text-xl font-black text-white">{selectedLead.companyName || "Unnamed Lead"}</h2>
                  <span className="rounded-full bg-white/16 px-2.5 py-1 text-[11px] font-black text-white ring-1 ring-white/15">{selectedLead.leadStage}</span>
                  {selectedLead.clientCode && <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-mono text-white/80">{selectedLead.clientCode}</span>}
                </div>
                <p className="mt-1 truncate text-sm text-sky-100">
                  {[selectedLead.contactPersonName, selectedLead.designation, selectedLead.industry].filter(Boolean).join(" · ") || "Lead details pending"}
                </p>
              </div>
              <div className="relative flex shrink-0 items-center gap-2">
                <a href={selectedPhone ? `tel:${selectedPhone}` : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-bold transition ${selectedPhone ? "bg-white text-emerald-700 hover:-translate-y-0.5 hover:bg-emerald-50" : "bg-white/10 text-white/40 pointer-events-none"}`}>
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
                <a href={selectedWhatsapp ? `https://wa.me/${selectedWhatsapp}?text=${whatsappText}` : undefined}
                  target="_blank" rel="noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-bold transition ${selectedWhatsapp ? "bg-white text-green-700 hover:-translate-y-0.5 hover:bg-green-50" : "bg-white/10 text-white/40 pointer-events-none"}`}>
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
                <button type="button" onClick={() => handleConvert(selectedLead)} disabled={converting === selectedLead.id}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-[#0070B8] transition hover:-translate-y-0.5 hover:bg-sky-50 disabled:opacity-50">
                  <UserCheck className="w-3.5 h-3.5" /> Convert
                </button>
                <button type="button" onClick={() => setSelectedLead(null)}
                  className="rounded-2xl bg-white/10 p-2 text-white transition hover:bg-white/20">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 h-full divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

                {/* ─── LEFT COLUMN ─────────────────────────────── */}
                <div className="overflow-y-auto p-5 space-y-5">

                  {/* Contact + Lead Info row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Contact</p>
                      <p className="text-sm font-bold text-slate-900">{selectedLead.contactPersonName || "—"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{selectedLead.designation || "—"}</p>
                      <div className="mt-2 space-y-1">
                        <p className="flex items-center gap-1.5 text-xs text-slate-600"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />{selectedLead.mobile || "—"}</p>
                        <p className="flex items-center gap-1.5 text-xs text-slate-600 break-all"><Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />{selectedLead.primaryEmail || "—"}</p>
                        {selectedLead.billingAddress.city && (
                          <p className="flex items-center gap-1.5 text-xs text-slate-600"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {[selectedLead.billingAddress.city, selectedLead.billingAddress.state].filter(Boolean).join(", ")}
                          </p>
                        )}
                        {selectedLead.website && (
                          <p className="flex items-center gap-1.5 text-xs">
                            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a href={selectedLead.website} target="_blank" rel="noreferrer"
                              className="text-indigo-600 hover:underline truncate">
                              {selectedLead.website.replace(/^https?:\/\//, "")}
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Lead Info</p>
                      <div className="space-y-1.5 text-xs">
                        {[
                          ["Source", selectedLead.leadSource],
                          ["Industry", selectedLead.industry],
                          ["Size", selectedLead.companySize],
                          ["Business", selectedLead.businessType],
                          ["Created", formatDate(selectedLead.createdAt)],
                        ].map(([label, val]) => val ? (
                          <div key={label} className="flex gap-2">
                            <span className="text-slate-400 w-16 shrink-0">{label}</span>
                            <span className="font-medium text-slate-800 truncate">{val}</span>
                          </div>
                        ) : null)}
                      </div>
                    </div>
                  </div>

                  {/* Stage + Assignment inline */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Stage</p>
                      <div className="relative">
                        <select value={selectedLead.leadStage}
                          onChange={(e) => selectedLead.id && updateLeadStage(selectedLead.id, e.target.value as LeadStage)}
                          className="w-full px-3 pr-8 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white appearance-none font-semibold">
                          {LEAD_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Assigned To</p>
                        <button type="button" onClick={assignSelectedLeadToMe}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold">
                          Assign to me
                        </button>
                      </div>
                      <div className="relative">
                        <select value={selectedLead.accountManager || ""}
                          onChange={(e) => selectedLead.id && assignLead(selectedLead.id, e.target.value)}
                          className="w-full px-3 pr-8 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white appearance-none font-semibold">
                          <option value="">Unassigned</option>
                          {USER_LIST.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Written Requirement */}
                  {selectedLead.meetingNotes && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">Written Requirement</p>
                      <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{selectedLead.meetingNotes}</p>
                    </div>
                  )}

                  {/* Services */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Services Required</p>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{selectedRequirementCount} selected</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold text-indigo-500 uppercase mb-1.5">Development</p>
                        <div className="flex flex-wrap gap-1.5">
                          {DEV_SERVICES.map((s) => {
                            const on = selectedLead.developmentServices.includes(s);
                            return (
                              <button key={s} type="button"
                                onClick={() => selectedLead.id && toggleLeadService(selectedLead.id, "developmentServices", s)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors ${on ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700"}`}>
                                {on && <CheckCircle2 className="w-3 h-3" />}{s}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-violet-500 uppercase mb-1.5">Digital Marketing</p>
                        <div className="flex flex-wrap gap-1.5">
                          {DM_SERVICES.map((s) => {
                            const on = selectedLead.digitalMarketingServices.includes(s);
                            return (
                              <button key={s} type="button"
                                onClick={() => selectedLead.id && toggleLeadService(selectedLead.id, "digitalMarketingServices", s)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors ${on ? "bg-violet-600 border-violet-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700"}`}>
                                {on && <CheckCircle2 className="w-3 h-3" />}{s}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {PRESET_TAGS.map((tag) => {
                        const active = selectedLead.tags.includes(tag);
                        return (
                          <button key={tag} type="button"
                            onClick={() => {
                              if (!selectedLead.id) return;
                              const next = active ? selectedLead.tags.filter((t) => t !== tag) : [...selectedLead.tags, tag];
                              updateLeadTags(selectedLead.id, next);
                              addActivity(selectedLead.id, "Tag Updated", `${active ? "Removed" : "Added"} tag "${tag}"`);
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors ${active ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700"}`}>
                            {active && <CheckCircle2 className="w-3 h-3" />}{tag}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <input value={popupTagInput} onChange={(e) => setPopupTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();
                          const t = popupTagInput.trim();
                          if (!t || !selectedLead.id || selectedLead.tags.includes(t)) return;
                          updateLeadTags(selectedLead.id, [...selectedLead.tags, t]);
                          addActivity(selectedLead.id, "Tag Added", `Added custom tag "${t}"`);
                          setPopupTagInput("");
                        }}
                        placeholder="Custom tag, press Enter"
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                      <button type="button"
                        onClick={() => {
                          const t = popupTagInput.trim();
                          if (!t || !selectedLead.id || selectedLead.tags.includes(t)) return;
                          updateLeadTags(selectedLead.id, [...selectedLead.tags, t]);
                          addActivity(selectedLead.id, "Tag Added", `Added custom tag "${t}"`);
                          setPopupTagInput("");
                        }}
                        className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800">Add</button>
                    </div>
                    {selectedLead.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedLead.tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
                            {tag}
                            <button type="button" onClick={() => {
                              if (!selectedLead.id) return;
                              updateLeadTags(selectedLead.id, selectedLead.tags.filter((t) => t !== tag));
                              addActivity(selectedLead.id, "Tag Removed", `Removed tag "${tag}"`);
                            }} className="hover:text-indigo-900 ml-0.5"><X className="w-2.5 h-2.5" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── RIGHT COLUMN ─────────────────────────────── */}
                <div className="overflow-y-auto p-5 space-y-5 bg-slate-50/50">

                  {/* Notes */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-sm font-bold text-slate-800">Notes</h3>
                      {selectedLeadNotes.length > 0 && <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">{selectedLeadNotes.length}</span>}
                    </div>
                    <div className="flex gap-2">
                      <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Add call summary, requirement, pricing discussion..."
                        className="flex-1 min-h-[72px] resize-none px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white" />
                    </div>
                    <button type="button" onClick={addNote}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700">
                      <Plus className="w-3.5 h-3.5" /> Add Note
                    </button>
                    <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
                      {selectedLeadNotes.length === 0
                        ? <p className="text-xs text-slate-400">No notes yet.</p>
                        : selectedLeadNotes.map((note) => (
                          <div key={note.id} className="rounded-lg bg-white border border-slate-200 px-3 py-2.5">
                            <p className="text-xs text-slate-800 whitespace-pre-wrap">{note.text}</p>
                            <div className="flex items-center justify-between mt-1.5">
                              <p className="text-[10px] text-indigo-500 font-medium">{note.createdBy?.name ?? CURRENT_USER}</p>
                              <p className="text-[10px] text-slate-400">{formatDateTime(note.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Reminders */}
                  <div className="border-t border-slate-200 pt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Bell className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-slate-800">Reminders</h3>
                      {selectedLeadReminders.length > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{selectedLeadReminders.length}</span>}
                    </div>
                    <div className="flex gap-1.5 mb-2">
                      {(["Follow-up", "Call", "Meeting"] as LeadReminder["type"][]).map((t) => (
                        <button key={t} type="button" onClick={() => setReminderType(t)}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${reminderType === t
                            ? t === "Follow-up" ? "bg-amber-500 border-amber-500 text-white"
                            : t === "Call" ? "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <input type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white" />
                    <div className="mt-2 flex gap-2">
                      <input value={reminderNote} onChange={(e) => setReminderNote(e.target.value)}
                        placeholder={reminderType === "Follow-up" ? "Purpose..." : "Note..."}
                        className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white" />
                      <button type="button" onClick={() => { addReminder(reminderType, reminderAt, reminderNote); setReminderAt(""); setReminderNote(""); setReminderPage(1); }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700">Save</button>
                    </div>
                    {selectedLeadReminders.length === 0 ? (
                      <p className="mt-3 text-xs text-slate-400">No reminders yet.</p>
                    ) : (() => {
                      const now = Date.now();
                      const sortedReminders = [...selectedLeadReminders].sort((a, b) => {
                        const da = Math.abs(new Date(a.scheduledAt).getTime() - now);
                        const db = Math.abs(new Date(b.scheduledAt).getTime() - now);
                        return da - db;
                      });
                      const totalRPages = Math.ceil(sortedReminders.length / REMINDERS_PER_PAGE);
                      const paged = sortedReminders.slice((reminderPage - 1) * REMINDERS_PER_PAGE, reminderPage * REMINDERS_PER_PAGE);
                      return (
                        <>
                          <div className="mt-3 space-y-2">
                            {paged.map((r) => {
                              const badge = r.type === "Follow-up" ? "bg-amber-50 text-amber-700 border-amber-200" : r.type === "Call" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-indigo-50 text-indigo-700 border-indigo-200";
                              return (
                                <div key={r.id} className={`rounded-lg border px-3 py-2.5 flex items-start gap-2 transition-colors ${r.isDone ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-200"}`}>
                                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 mt-0.5 ${badge}`}>{r.type}</span>
                                  <div className="min-w-0 flex-1">
                                    {r.note && <p className={`text-xs font-medium truncate ${r.isDone ? "line-through text-slate-400" : "text-slate-800"}`}>{r.note}</p>}
                                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(r.scheduledAt)}</p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {!r.isDone && (
                                      <button type="button" onClick={() => markReminderDone(r.id)}
                                        title="Mark as done"
                                        className="p-1 rounded text-emerald-600 hover:bg-emerald-50">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button type="button" onClick={() => deleteReminderItem(r.id)}
                                      title="Delete"
                                      className="p-1 rounded text-red-400 hover:bg-red-50">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {totalRPages > 1 && (
                            <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              <p className="text-[10px] text-slate-400">
                                {(reminderPage - 1) * REMINDERS_PER_PAGE + 1}–{Math.min(reminderPage * REMINDERS_PER_PAGE, sortedReminders.length)} of {sortedReminders.length}
                              </p>
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => setReminderPage((p) => Math.max(1, p - 1))} disabled={reminderPage === 1}
                                  className="px-2.5 py-1 text-[10px] font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none">
                                  Prev
                                </button>
                                {Array.from({ length: totalRPages }, (_, i) => i + 1).map((pg) => (
                                  <button key={pg} type="button" onClick={() => setReminderPage(pg)}
                                    className={`w-6 h-6 text-[10px] font-semibold rounded-lg border transition-colors ${pg === reminderPage ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                                    {pg}
                                  </button>
                                ))}
                                <button type="button" onClick={() => setReminderPage((p) => Math.min(totalRPages, p + 1))} disabled={reminderPage === totalRPages}
                                  className="px-2.5 py-1 text-[10px] font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none">
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* ── Quotations + Activity (full width below columns) ── */}
              <div ref={quotationSectionRef} className="border-t border-slate-100 p-5 space-y-4 scroll-mt-4">
              {selectedLead.id && (
                <LeadQuotationSection
                  leadId={selectedLead.id}
                  leadName={selectedLead.companyName || selectedLead.contactPersonName || ""}
                  triggerCreate={triggerCreateQuotation}
                  onCreateHandled={() => setTriggerCreateQuotation(false)}
                  onActivity={(action, desc) => addActivity(selectedLead.id!, action, desc)}
                />
              )}

              {/* ── Activity Log ── */}
              <section className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">Activity</h2>
                  {selectedLeadActivities.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                      {selectedLeadActivities.length}
                    </span>
                  )}
                </div>

                {selectedLeadActivities.length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    <Bell className="w-7 h-7 mx-auto mb-2 opacity-25" />
                    <p className="text-xs">No activity yet. Actions taken on this lead will appear here.</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto pr-1">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-100" />
                    <div className="space-y-3">
                      {selectedLeadActivities.map((a, idx) => (
                        <div key={a.id} className="flex gap-3 relative">
                          {/* Dot */}
                          <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 z-10 text-[10px] font-bold ${
                            idx === 0 ? "bg-indigo-600 text-white" : "bg-white border-2 border-slate-200 text-slate-400"
                          }`}>
                            {a.user.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-xs font-semibold text-slate-800">{a.action}</p>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {new Date(a.createdAt).toLocaleString("en-IN", {
                                  day: "2-digit", month: "short", year: "numeric",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{a.description}</p>
                            <p className="text-[10px] text-indigo-500 mt-0.5 font-medium">{a.user}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  </div>
                )}
              </section>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
