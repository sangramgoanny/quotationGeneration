"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle, ArrowUpRight, Bell, Briefcase, Calendar, CheckCircle2, ChevronDown, ChevronUp, Clock, Eye, FileText, Globe, Mail,
  MapPin, MessageCircle, Phone, Plus, RefreshCw, Search, Target, Trash2, TrendingUp, Upload, UserCheck, UserPlus, X,
} from "lucide-react";
import type { Client, ClientDocument, DocumentType, Industry, LeadSource } from "@/types/client";
import LeadQuotationSection from "@/components/leads/LeadQuotationSection";
import DocumentsPanel from "@/components/shared/DocumentsPanel";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { clientsApi } from "@/lib/api/clients";
import { leadsApi } from "@/lib/api/leads";
import { notesApi } from "@/lib/api/notes";
import { remindersApi, REMINDER_TYPE_FROM_API, REMINDER_TYPE_TO_API } from "@/lib/api/reminders";
import { activityApi } from "@/lib/api/activity";
import { usersApi, type User } from "@/lib/api/users";
import { useAuthRbac } from "@/lib/rbac/AuthRbacProvider";

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

type LeadStage = "New" | "Hot" | "Warm" | "Cold" | "Lost" | "Won" | "Quotation Sent";
type LeadSort = "newest" | "oldest" | "company";

const PRESET_TAGS = [
  "Hot Lead", "Warm Lead", "Cold Lead", "High Priority",
  "VIP", "Enterprise", "SME",
  "ERP", "Website", "Digital Marketing",
  "Referral", "Recurring Client",
];

type LeadRecord = Client & {
  leadStage: LeadStage;
};

const LEAD_STAGES: LeadStage[] = ["New", "Hot", "Warm", "Cold", "Lost", "Won", "Quotation Sent"];

const LEAD_STAGE_COLORS: Record<LeadStage, string> = {
  New: "bg-slate-100 text-slate-700",
  Hot: "bg-red-100 text-red-700",
  Warm: "bg-amber-100 text-amber-700",
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

const isMailActivity = (action: string) => action.startsWith("Email");

function ActivityTimelineList({ items, emptyMessage }: { items: ActivityEntry[]; emptyMessage: string }) {
  if (!items.length) {
    return (
      <div className="text-center py-6 text-slate-400">
        <Bell className="w-7 h-7 mx-auto mb-2 opacity-25" />
        <p className="text-xs">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="max-h-80 overflow-y-auto pr-1">
      <div className="relative">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-100" />
        <div className="space-y-3">
          {items.map((a, idx) => (
            <div key={a.id} className="flex gap-3 relative">
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
  );
}

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
      className={`group relative w-full text-left bg-white rounded-2xl p-3 flex items-center gap-2.5 overflow-hidden
                  border shadow-sm transition-all duration-300
                  ${active ? `${s.border} ring-4 ${s.ring} -translate-y-0.5 shadow-[0_24px_55px_rgba(37,99,235,0.14)]` : "border-slate-200 hover:border-sky-200 hover:shadow-[0_24px_55px_rgba(15,23,42,0.10)] hover:-translate-y-0.5"}`}
    >
      <div className={`absolute top-0 left-0 h-1 w-full ${s.bar} transition-opacity ${active ? "opacity-100" : "opacity-0 group-hover:opacity-70"}`} />
      <div className="pointer-events-none absolute -right-10 -top-12 h-24 w-24 rounded-full bg-sky-100/50 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />

      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg} ${s.iconText} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-lg font-black text-slate-950 leading-tight tracking-tight">{value}</p>
        <p className="text-[10px] font-semibold text-slate-500 truncate">{label}</p>
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
  NEW: "New", HOT: "Hot",   WARM: "Warm", COLD: "Cold",
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

  const manager = (raw.accountManager ?? raw.account_manager ?? raw.accountManagerId ?? raw.account_manager_id) as Record<string, unknown> | string | null | undefined;
  const managerName = s(raw.accountManagerName ?? raw.account_manager_name);

  return {
    id:                   s(raw.id),
    clientCode:           s(raw.clientCode ?? raw.client_code),
    clientType:           (CLIENT_TYPE_FROM_API[s(raw.clientType).toUpperCase()] ?? "Company") as Client["clientType"],
    status:               (STATUS_FROM_API[s(raw.status).toUpperCase()] ?? "Lead") as Client["status"],
    leadStage,
    priority: (s(raw.priority).toLowerCase().replace(/^./, (value) => value.toUpperCase()) || "Medium") as Client["priority"],
    score: raw.score == null ? null : Number(raw.score),
    nextAction: raw.nextAction == null ? null : s(raw.nextAction),
    lostReason: raw.lostReason == null ? null : s(raw.lostReason),
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
    accountManager:       typeof manager === "object" && manager ? s(manager.id) : s(manager),
    accountManagerName:   typeof manager === "object" && manager ? s(manager.name ?? manager.email) : (managerName || undefined),
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
  const { currentUser, can } = useAuthRbac();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedLeadId = searchParams.get("open");
  const returnTo = searchParams.get("returnTo");
  const canAssignLeads = can("leads", "ASSIGN") || can("leads", "REASSIGN");
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [notesByLead, setNotesByLead] = useState<Record<string, LeadNote[]>>({});
  const [remindersByLead, setRemindersByLead] = useState<Record<string, LeadReminder[]>>({});
  const [activitiesByLead, setActivitiesByLead] = useState<Record<string, ActivityEntry[]>>({});
  const [documentsByLead, setDocumentsByLead] = useState<Record<string, ClientDocument[]>>({});
  const [docUploading, setDocUploading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [reminderType, setReminderType] = useState<LeadReminder["type"]>("Follow-up");
  const [reminderAt, setReminderAt] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  const [savingQualification, setSavingQualification] = useState(false);

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
  const [counterFilter, setCounterFilter] = useState<"" | "New" | "Hot" | "Warm" | "Cold" | "Won" | "Lost" | "QuotationSent" | "FollowUpToday" | "NeedsAction" | "Overdue" | "Unassigned" | "Total">("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [sortBy, setSortBy] = useState<LeadSort>("newest");
  const [showMoreMetrics, setShowMoreMetrics] = useState(false);
  const openedQueryLead = useRef<string | null>(null);
  const openingFromPipeline = Boolean(requestedLeadId) && !selectedLead && openedQueryLead.current !== requestedLeadId;
  const closeLead = useCallback(() => {
    setSelectedLead(null);
    if (returnTo === "/crm/follow-ups" || returnTo === "/crm/pipeline") {
      router.push(returnTo);
    }
  }, [returnTo, router]);

  // Leads with at least one reminder (of any type — Follow-up, Call, Meeting) due today.
  // A lead counts once even if it has multiple reminders due today.
  const todayFollowUpLeadIds = useMemo(() => {
    const today = new Date().toDateString();
    return new Set(
      Object.entries(remindersByLead)
        .filter(([, rs]) => rs.some((r) => new Date(r.scheduledAt).toDateString() === today))
        .map(([id]) => id)
    );
  }, [remindersByLead]);

  const visibleLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const followUpLeadIds = counterFilter === "FollowUpToday" ? todayFollowUpLeadIds : null;

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
      if (counterFilter === "Total") return true;
      if (counterFilter === "FollowUpToday") return followUpLeadIds!.has(lead.id ?? "");
      if (counterFilter === "NeedsAction") return !lead.nextFollowUpDate;
      if (counterFilter === "Overdue") return Boolean(lead.nextFollowUpDate && new Date(lead.nextFollowUpDate).getTime() < Date.now());
      if (counterFilter === "Unassigned") return !lead.accountManager;
      if (counterFilter === "New")   return lead.leadStage === "New";
      if (counterFilter === "Hot")   return lead.leadStage === "Hot";
      if (counterFilter === "Warm")  return lead.leadStage === "Warm";
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
  }, [leads, search, industry, source, stageFilter, tagFilter, assignedFilter, fromDate, toDate, counterFilter, todayFollowUpLeadIds]);

  const sortedLeads = useMemo(() => {
    return [...visibleLeads].sort((a, b) => {
      if (sortBy === "company") {
        return (a.companyName || a.contactPersonName || "").localeCompare(b.companyName || b.contactPersonName || "");
      }
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortBy === "newest" ? bTime - aTime : aTime - bTime;
    });
  }, [visibleLeads, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / pageSize));
  const pagedLeads = sortedLeads.slice((page - 1) * pageSize, page * pageSize);
  const hasActiveFilters = Boolean(search || industry || stageFilter || source || tagFilter || assignedFilter || fromDate || toDate || counterFilter);
  const activeFilterCount = [search, industry, stageFilter, source, tagFilter, assignedFilter, fromDate, toDate, counterFilter].filter(Boolean).length;
  const clearFilters = () => {
    setSearch("");
    setIndustry("");
    setStageFilter("");
    setSource("");
    setTagFilter("");
    setAssignedFilter("");
    setFromDate("");
    setToDate("");
    setCounterFilter("");
    setPage(1);
  };

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  useEffect(() => {
    const openId = requestedLeadId;
    if (!openId || selectedLead || loading || openedQueryLead.current === openId) return;
    const lead = leads.find((item) => item.id === openId);
    if (lead) {
      openedQueryLead.current = openId;
      openLead(lead);
    }
    // openLead intentionally remains out of dependencies because it is a popup action recreated on render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedLeadId, leads, selectedLead, loading]);

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
      const result = await leadsApi.list({ limit: 200 });
      const mapped = (result.data as unknown as Record<string, unknown>[]).map(mapApiLead);
      setLeads(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignableUsers = async () => {
    try {
      const users = await usersApi.list({ isActive: true, assignableTo: "leads" });
      setAssignableUsers(users);
    } catch { /* keep the dropdown usable with Unassigned only */ }
  };

  const fetchTodayReminders = async () => {
    try {
      const grouped: Record<string, LeadReminder[]> = {};
      let page = 1;
      let pages = 1;
      do {
        const res = await remindersApi.globalList({ status: "DUE_TODAY", page, limit: 200 });
        for (const r of res.data) {
          const clientId = r.clientId ?? r.client?.id;
          if (!clientId) continue;
          (grouped[clientId] ??= []).push({
            id: r.id,
            type: (REMINDER_TYPE_FROM_API[r.type] ?? r.type) as LeadReminder["type"],
            title: r.title,
            scheduledAt: r.scheduledAt,
            note: r.note,
            isDone: r.isDone,
          });
        }
        pages = res.pages || 1;
        page += 1;
      } while (page <= pages);
      // Merge without clobbering full reminder lists already loaded for opened leads.
      setRemindersByLead((prev) => {
        const next = { ...prev };
        for (const [clientId, reminders] of Object.entries(grouped)) {
          if (!next[clientId]) next[clientId] = reminders;
        }
        return next;
      });
    } catch { /* counter simply reflects opened leads if this fails */ }
  };

  useEffect(() => { fetchLeads(); fetchAssignableUsers(); fetchTodayReminders(); }, []);

  const handleConvert = async (lead: LeadRecord) => {
    if (!lead.id) return;
    setConverting(lead.id);
    setError(null);
    try {
      await leadsApi.convert(lead.id);
      addActivity(lead.id, "Converted to Client", `${lead.companyName || "Lead"} marked as Active client`);
      setLeads((prev) => prev.filter((item) => item.id !== lead.id));
      setSelectedLead((prev) => (prev?.id === lead.id ? null : prev));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to convert lead");
    } finally {
      setConverting(null);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeLead(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeLead]);

  const openLead = (lead: LeadRecord, options?: { focusQuotations?: boolean }) => {
    setSelectedLead(lead); // show popup immediately with list data
    setFocusQuotationList(Boolean(options?.focusQuotations));
    // Fetch full detail (designation, address, bank, notes, etc.)
    if (lead.id) {
      leadsApi.get(lead.id).then((full) => {
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

      // Fetch documents from API
      setDocError(null);
      leadsApi.getDocuments(lead.id).then((docs) => {
        setDocumentsByLead((prev) => ({ ...prev, [lead.id!]: docs }));
      }).catch(() => {});
    }
  };

  const handlePopupDocUpload = async (files: File[], documentType: DocumentType) => {
    if (!selectedLead?.id) return;
    const leadId = selectedLead.id;
    setDocUploading(true);
    setDocError(null);
    try {
      const uploaded = await leadsApi.uploadDocuments(leadId, files, documentType);
      setDocumentsByLead((prev) => ({ ...prev, [leadId]: [...uploaded, ...(prev[leadId] ?? [])] }));
    } catch (e) {
      setDocError(e instanceof Error ? e.message : "Failed to upload document");
    } finally {
      setDocUploading(false);
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
    const accountManagerName = assignableUsers.find((user) => user.id === accountManager)?.name;
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, accountManager, accountManagerName } : l));
    setSelectedLead((prev) => prev?.id === leadId ? { ...prev, accountManager, accountManagerName } : prev);
    addActivity(leadId, "Lead Assigned", `Assigned to ${accountManagerName || "Unassigned"}`);
    clientsApi.update(leadId, { accountManager }).catch(() => { /* ignore */ });
  };

  const assignSelectedLeadToMe = () => {
    if (!selectedLead?.id) return;
    if (currentUser?.id) assignLead(selectedLead.id, currentUser.id);
  };

  const assignedUserName = (lead: LeadRecord) =>
    lead.accountManagerName
    || assignableUsers.find((user) => user.id === lead.accountManager)?.name
    || (lead.accountManager && lead.accountManager === currentUser?.id ? currentUser.name : "")
    || "Unassigned";

  const updateLeadStage = async (leadId: string, leadStage: LeadStage) => {
    try {
      await leadsApi.updateStage(leadId, leadStage);
      addActivity(leadId, "Stage Changed", `Status updated to "${leadStage}"`);
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, leadStage } : l));
      setSelectedLead((prev) => prev?.id === leadId ? { ...prev, leadStage } : prev);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to update lead stage");
    }
  };

  const updateLeadQualification = async (leadId: string, patch: { priority?: "LOW" | "MEDIUM" | "HIGH"; score?: number; nextAction?: string | null; lostReason?: string | null }) => {
    setSavingQualification(true);
    try {
      const updated = await leadsApi.updateQualification(leadId, patch);
      const mapped = mapApiLead(updated as unknown as Record<string, unknown>);
      setLeads((prev) => prev.map((lead) => lead.id === leadId ? { ...lead, ...mapped } : lead));
      setSelectedLead((prev) => prev?.id === leadId ? { ...prev, ...mapped } : prev);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to update lead qualification");
    } finally {
      setSavingQualification(false);
    }
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
  const selectedLeadDocuments = selectedLead?.id ? documentsByLead[selectedLead.id] ?? [] : [];
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
  const warmLeads      = useMemo(() => allLeads.filter((l) => l.leadStage === "Warm").length, [allLeads]);
  const coldLeads      = useMemo(() => allLeads.filter((l) => l.leadStage === "Cold").length, [allLeads]);
  const lostLeads      = useMemo(() => allLeads.filter((l) => l.leadStage === "Lost").length, [allLeads]);
  const quotationSentLeads = useMemo(() => allLeads.filter((l) => l.leadStage === "Quotation Sent").length, [allLeads]);
  // Counts leads with a reminder due today, not raw reminder rows — a lead with both a
  // Call and a Follow-up reminder due today still counts once.
  const remindersToday = todayFollowUpLeadIds.size;
  const overdueLeads = useMemo(
    () => allLeads.filter((lead) => lead.nextFollowUpDate && new Date(lead.nextFollowUpDate).getTime() < Date.now()).length,
    [allLeads],
  );
  const needsActionLeads = useMemo(() => allLeads.filter((lead) => !lead.nextFollowUpDate).length, [allLeads]);
  const unassignedLeads = useMemo(() => allLeads.filter((lead) => !lead.accountManager).length, [allLeads]);

  return (
    <>
    <main className={`min-h-screen bg-[#F6F8FB] p-4 space-y-6 lg:p-6 ${openingFromPipeline ? "invisible" : ""}`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8">
        <StatCard label="Total Leads"     value={totalLeads}         icon={Target}      tone="blue"    onClick={() => toggleCounter("Total")}         active={counterFilter === "Total"} />
        <StatCard label="New Leads"       value={newLeads}           icon={UserPlus}    tone="indigo"  onClick={() => toggleCounter("New")}           active={counterFilter === "New"} />
        <StatCard label="Reminders Today" value={remindersToday}     icon={Clock}       tone="amber"   onClick={() => toggleCounter("FollowUpToday")} active={counterFilter === "FollowUpToday"} />
        <StatCard label="Hot Leads"       value={hotLeads}           icon={TrendingUp}  tone="red"     onClick={() => toggleCounter("Hot")}           active={counterFilter === "Hot"} />
        <StatCard label="Won Leads"       value={allLeads.filter((lead) => lead.leadStage === "Won").length} icon={UserCheck} tone="emerald" onClick={() => toggleCounter("Won")} active={counterFilter === "Won"} />
        <StatCard label="Quotation Sent"  value={quotationSentLeads} icon={FileText}    tone="violet"  onClick={() => toggleCounter("QuotationSent")} active={counterFilter === "QuotationSent"} />
        <StatCard label="Overdue Follow-ups" value={overdueLeads} icon={AlertCircle} tone="red" onClick={() => toggleCounter("Overdue")} active={counterFilter === "Overdue"} />
        <StatCard label="Needs Next Action" value={needsActionLeads} icon={Clock} tone="zinc" onClick={() => toggleCounter("NeedsAction")} active={counterFilter === "NeedsAction"} />
      </div>

      <section className="rounded-[18px] shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
        <div className="relative overflow-hidden rounded-t-[18px] bg-[#0b3b5a] px-4 py-2.5 lg:px-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(230,0,70,0.22),transparent_30%)]" />
          <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="shrink-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-100">CRM / Leads</p>
              <h1 className="mt-0.5 text-xl font-black tracking-tight text-white">Leads</h1>
              <p className="text-[11px] text-slate-200">Manage prospects before conversion.</p>
            </div>
            <div className="relative flex-1 lg:ml-4">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch2(e.target.value)} placeholder="Search company, contact, phone or email" className="h-10 w-full rounded-xl border border-white/10 bg-white/95 pl-10 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-sky-200/30" />
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href="/crm/leads/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-xs font-black text-[#063A66]"><Plus className="h-3.5 w-3.5" /> Add Lead</Link>
            </div>
          </div>
        </div>

        <div className="rounded-b-[18px] border border-t-0 border-slate-200 bg-white p-3 lg:p-4">
        <button type="button" onClick={() => setFiltersOpen((v) => !v)} className="flex w-full items-center justify-end gap-2">
          {activeFilterCount > 0 && <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black text-[#0070B8]">{activeFilterCount} active</span>}
          <span className="text-xs font-semibold text-slate-400">
            {visibleLeads.length} visible of {totalLeads} leads
          </span>
          {filtersOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>

        {filtersOpen && (
        <>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
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
              {assignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
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

          <div className="relative min-w-[150px]">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as LeadSort); setPage(1); }}
              aria-label="Sort leads"
              className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-600 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="company">Company A–Z</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              aria-label={`Clear ${activeFilterCount} active filters`}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
            >
              <X className="w-4 h-4" /> Clear{activeFilterCount > 1 ? ` (${activeFilterCount})` : ""}
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
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
          <button type="button" onClick={() => setShowMoreMetrics((value) => !value)} className="text-xs font-bold text-slate-500 hover:text-sky-700">
            {showMoreMetrics ? "Hide stage metrics" : "More stage metrics"}
          </button>
          {showMoreMetrics && (
            <>
              <button type="button" onClick={() => toggleCounter("Warm")} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${counterFilter === "Warm" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>Warm {warmLeads}</button>
              <button type="button" onClick={() => toggleCounter("Cold")} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${counterFilter === "Cold" ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-600"}`}>Cold {coldLeads}</button>
              <button type="button" onClick={() => toggleCounter("Lost")} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${counterFilter === "Lost" ? "bg-zinc-200 text-zinc-700" : "bg-slate-100 text-slate-600"}`}>Lost {lostLeads}</button>
              <button type="button" onClick={() => toggleCounter("Unassigned")} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${counterFilter === "Unassigned" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>Unassigned {unassignedLeads}</button>
            </>
          )}
        </div>
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3" aria-label="Active filters">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Active</span>
            {counterFilter && <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">View: {counterFilter === "FollowUpToday" ? "Reminders today" : counterFilter === "NeedsAction" ? "Needs next action" : counterFilter}</span>}
            {search && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Search: {search}</span>}
            {industry && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">Industry: {industry}</span>}
            {stageFilter && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Stage: {stageFilter}</span>}
            {source && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">Source: {source}</span>}
            {tagFilter && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Tag: {tagFilter}</span>}
            {assignedFilter && <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">Owner: {assignedFilter === "unassigned" ? "Unassigned" : assignableUsers.find((user) => user.id === assignedFilter)?.name || "Selected owner"}</span>}
            {(fromDate || toDate) && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Created: {fromDate || "Any"} – {toDate || "Any"}</span>}
          </div>
        )}
        </>
        )}
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
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
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
          <p className="mt-1 text-sm text-slate-500">{hasActiveFilters ? "Try clearing a filter or changing your search." : "Add your first lead to start tracking opportunities."}</p>
          {hasActiveFilters ? (
            <button type="button" onClick={clearFilters} className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              <X className="w-4 h-4" /> Clear filters
            </button>
          ) : (
            <Link href="/crm/leads/new" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#0070B8] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-100 transition hover:-translate-y-0.5 hover:bg-[#075f99]">
              <Plus className="w-4 h-4" /> Add Lead
            </Link>
          )}
        </section>
      ) : (
        <>
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {pagedLeads.map((lead) => {
            const location = [lead.billingAddress?.city, lead.billingAddress?.state].filter(Boolean).join(", ");
            const initials = (lead.companyName || lead.contactPersonName || "LD").slice(0, 2).toUpperCase();
            const reqCount = lead.developmentServices.length + lead.digitalMarketingServices.length;
            const stageColor = LEAD_STAGE_COLORS[lead.leadStage];
            const isOverdue = Boolean(lead.nextFollowUpDate && new Date(lead.nextFollowUpDate).getTime() < Date.now());

            return (
              <article
                key={lead.id}
                className="group overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_12px_32px_rgba(0,0,0,0.10)] hover:border-slate-300"
              >
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 pb-3 border-b border-slate-100">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      lead.leadStage === "Hot" ? "bg-gradient-to-br from-red-500 to-red-600" :
                      lead.leadStage === "Won" ? "bg-gradient-to-br from-emerald-500 to-emerald-600" :
                      lead.leadStage === "Cold" ? "bg-gradient-to-br from-cyan-500 to-cyan-600" :
                      "bg-gradient-to-br from-blue-500 to-indigo-600"
                    } text-sm font-black text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                      {initials}
                    </div>
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => openLead(lead)}
                          className="text-left text-lg font-bold text-slate-900 hover:text-blue-600 transition truncate"
                        >
                          {lead.companyName || "Unnamed Lead"}
                        </button>
                        <p className="text-sm text-slate-500 mt-0.5 truncate">
                          {[lead.contactPersonName, lead.designation].filter(Boolean).join(" · ") || "Contact pending"}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 flex-wrap justify-end gap-1.5">
                        <span className={`rounded-lg px-3 py-1 text-xs font-bold whitespace-nowrap ${stageColor}`}>{lead.leadStage}</span>
                        {isOverdue && <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700"><AlertCircle className="h-3 w-3" /> Overdue</span>}
                        {!lead.nextFollowUpDate && <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700"><Clock className="h-3 w-3" /> Next action</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Info Grid */}
                <div className="px-4 py-3 bg-slate-50/40 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {lead.mobile && (
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-semibold">Phone</p>
                        <p className="text-sm font-medium text-slate-800 truncate">{lead.mobile}</p>
                      </div>
                    </div>
                  )}
                  {lead.primaryEmail && (
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-semibold">Email</p>
                        <p className="text-sm font-medium text-slate-800 truncate">{lead.primaryEmail}</p>
                      </div>
                    </div>
                  )}
                  {location && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-semibold">Location</p>
                        <p className="text-sm font-medium text-slate-800 truncate">{location}</p>
                      </div>
                    </div>
                  )}
                  {lead.website && (
                    <div className="flex items-start gap-2">
                      <Globe className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-semibold">Website</p>
                        <a href={lead.website} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate">
                          {lead.website.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata Tags */}
                <div className="px-5 py-3 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                    lead.priority === "High" ? "border border-red-200 bg-red-50 text-red-700" :
                    lead.priority === "Low" ? "border border-slate-200 bg-slate-50 text-slate-600" :
                    "border border-amber-200 bg-amber-50 text-amber-700"
                  }`}>
                    {lead.priority || "Medium"} priority
                  </span>
                  {typeof lead.score === "number" && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                      Score {lead.score}/100
                    </span>
                  )}
                  {lead.industry && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 border border-indigo-100">
                      {lead.industry}
                    </span>
                  )}
                  {lead.leadSource && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                      {lead.leadSource}
                    </span>
                  )}
                  {lead.clientCode && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-700 border border-slate-200">
                      {lead.clientCode}
                    </span>
                  )}
                  {lead.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                      {tag}
                    </span>
                  ))}
                  {lead.tags.length > 2 && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      +{lead.tags.length - 2}
                    </span>
                  )}
                </div>

                {/* Assignment and Services Info */}
                <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Assigned: <span className="font-semibold text-slate-900">{assignedUserName(lead)}</span></span>
                  </div>
                  {reqCount > 0 && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">Services: <span className="font-semibold text-slate-900">{reqCount}</span></span>
                    </div>
                  )}
                  <div className="ml-auto flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatDate(lead.createdAt)}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-5 py-4 bg-slate-50/40 border-t border-slate-100 flex flex-wrap gap-2">
                  {lead.mobile && (
                    <a
                      href={`tel:${phoneForUrl(lead.mobile)}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 text-white px-3 py-2 text-xs font-bold transition-all duration-200 hover:bg-emerald-600 hover:shadow-lg hover:-translate-y-0.5"
                      title="Call lead"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                  )}
                  {(lead.whatsapp || lead.mobile) && (
                    <a
                      href={`https://wa.me/${phoneForUrl(lead.whatsapp || lead.mobile)}?text=${encodeURIComponent(`Hi ${lead.contactPersonName || lead.companyName}, following up regarding your enquiry with us.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 text-white px-3 py-2 text-xs font-bold transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:-translate-y-0.5"
                      title="Send WhatsApp message"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => openLead(lead)}
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-blue-500 text-blue-600 px-3 py-2 text-xs font-bold transition-all duration-200 hover:bg-blue-50 hover:shadow-md hover:-translate-y-0.5 ml-auto"
                    title="View lead details"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Details
                  </button>
                  <button
                    onClick={() => openLead(lead, { focusQuotations: true })}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500 text-white px-3 py-2 text-xs font-bold transition-all duration-200 hover:bg-purple-600 hover:shadow-lg hover:-translate-y-0.5"
                    title="Create or view quotation"
                  >
                    <FileText className="w-3.5 h-3.5" /> Quotation
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
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
        </>
      )}

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm"
          onClick={closeLead}>
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
                <button type="button" onClick={closeLead}
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
                        {canAssignLeads && (
                          <button type="button" onClick={assignSelectedLeadToMe}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold">
                            Assign to me
                          </button>
                        )}
                      </div>
                      {canAssignLeads ? (
                        <div className="relative">
                          <select value={selectedLead.accountManager || ""}
                            onChange={(e) => selectedLead.id && assignLead(selectedLead.id, e.target.value)}
                            className="w-full px-3 pr-8 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white appearance-none font-semibold">
                            <option value="">Unassigned</option>
                            {assignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                          {assignedUserName(selectedLead)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Qualification</p>
                        <p className="mt-0.5 text-xs text-slate-500">Keep the next sales action explicit.</p>
                      </div>
                      {savingQualification && <span className="text-[10px] font-bold text-sky-600">Saving…</span>}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="text-xs font-semibold text-slate-600">
                        Priority
                        <select
                          value={selectedLead.priority || "Medium"}
                          onChange={(event) => selectedLead.id && updateLeadQualification(selectedLead.id, { priority: event.target.value.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" })}
                          className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-sky-400"
                        >
                          <option>Low</option><option>Medium</option><option>High</option>
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-slate-600">
                        Lead score
                        <input
                          type="number" min={0} max={100} defaultValue={selectedLead.score ?? ""}
                          onBlur={(event) => {
                            const score = Number(event.target.value);
                            if (selectedLead.id && Number.isInteger(score) && score >= 0 && score <= 100) void updateLeadQualification(selectedLead.id, { score });
                          }}
                          className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-sky-400"
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-600 sm:col-span-1">
                        Next action
                        <input
                          type="text" defaultValue={selectedLead.nextAction || ""} placeholder="e.g. Schedule demo"
                          onBlur={(event) => selectedLead.id && void updateLeadQualification(selectedLead.id, { nextAction: event.target.value.trim() || null })}
                          className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-sky-400"
                        />
                      </label>
                    </div>
                    {selectedLead.leadStage === "Lost" && (
                      <label className="mt-3 block text-xs font-semibold text-slate-600">
                        Lost reason
                        <input
                          type="text" defaultValue={selectedLead.lostReason || ""} placeholder="Why was this opportunity lost?"
                          onBlur={(event) => selectedLead.id && void updateLeadQualification(selectedLead.id, { lostReason: event.target.value.trim() || null })}
                          className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-sky-400"
                        />
                      </label>
                    )}
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
                  onLeadConverted={() => {
                    setLeads((prev) => prev.filter((lead) => lead.id !== selectedLead.id));
                    closeLead();
                  }}
                />
              )}

              {/* ── Documents ── */}
              <section className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">Documents</h2>
                  {selectedLeadDocuments.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                      {selectedLeadDocuments.length}
                    </span>
                  )}
                </div>
                <DocumentsPanel
                  documents={selectedLeadDocuments}
                  loading={false}
                  uploading={docUploading}
                  error={docError}
                  onUpload={handlePopupDocUpload}
                />
              </section>

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
                <ActivityTimelineList
                  items={selectedLeadActivities.filter((a) => !isMailActivity(a.action))}
                  emptyMessage="No activity yet. Actions taken on this lead will appear here."
                />
              </section>

              {/* ── Mail Activity ── */}
              <section className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">Mail Activity</h2>
                  {selectedLeadActivities.filter((a) => isMailActivity(a.action)).length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                      {selectedLeadActivities.filter((a) => isMailActivity(a.action)).length}
                    </span>
                  )}
                </div>
                <ActivityTimelineList
                  items={selectedLeadActivities.filter((a) => isMailActivity(a.action))}
                  emptyMessage="No emails sent yet for this lead."
                />
              </section>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
    {openingFromPipeline && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" aria-label="Opening lead details">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#0070B8]" />
          <p className="mt-4 text-sm font-bold text-slate-800">Opening lead details…</p>
        </div>
      </div>
    )}
    </>
  );
}
