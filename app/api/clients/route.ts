import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { rowToClient } from "@/utils/case";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ── Value maps (spec → DB stored value) ──────────────────────────────────────

// Maps pass enum values through unchanged — DB uses uppercase enum values
const STATUS_MAP: Record<string, string> = {
  LEAD: "LEAD", ACTIVE: "ACTIVE", INACTIVE: "INACTIVE",
  COMPLETED: "COMPLETED", BLACKLISTED: "BLACKLISTED",
  // title-case fallbacks for legacy data
  Lead: "LEAD", Active: "ACTIVE", Inactive: "INACTIVE",
  Completed: "COMPLETED", Blacklisted: "BLACKLISTED",
};
const TYPE_MAP: Record<string, string> = {
  COMPANY: "COMPANY", INDIVIDUAL: "INDIVIDUAL",
  Company: "COMPANY", Individual: "INDIVIDUAL",
};
const INDUSTRY_MAP: Record<string, string> = {
  IT_SERVICES: "IT_SERVICES", DIGITAL_MARKETING: "DIGITAL_MARKETING",
  MANUFACTURING: "MANUFACTURING", HEALTHCARE: "HEALTHCARE",
  EDUCATION: "EDUCATION", RETAIL: "RETAIL", CONSTRUCTION: "CONSTRUCTION",
  MINING: "MINING", LOGISTICS: "LOGISTICS", REAL_ESTATE: "REAL_ESTATE",
  FINANCE: "FINANCE", OTHER: "OTHER",
};
const LEAD_SOURCE_MAP: Record<string, string> = {
  WEBSITE: "WEBSITE", REFERRAL: "REFERRAL", FACEBOOK: "FACEBOOK",
  INSTAGRAM: "INSTAGRAM", LINKEDIN: "LINKEDIN", GOOGLE_ADS: "GOOGLE_ADS",
  DIRECT_CALL: "DIRECT_CALL", EXISTING_CLIENT: "EXISTING_CLIENT",
  COLD_CALL: "COLD_CALL", EMAIL: "EMAIL", SOCIAL_MEDIA: "SOCIAL_MEDIA", OTHER: "OTHER",
};
const PAYMENT_TERMS_MAP: Record<string, string> = {
  ADVANCE: "ADVANCE", ADVANCE_PAYMENT: "ADVANCE",
  NET_15: "NET_15", NET_30: "NET_30", NET_45: "NET_45", NET_60: "NET_60",
};

// ── Spec payload → Supabase row ───────────────────────────────────────────────

function specToRow(b: Record<string, unknown>): Record<string, unknown> {
  const s = (v: unknown) => (v != null && v !== "" ? String(v) : "");
  const n = (v: unknown) => (v != null ? String(v) : "");

  return {
    company_name:          s(b.name),
    client_type:           (TYPE_MAP[s(b.type)]         ?? s(b.type))         || "COMPANY",
    status:                (STATUS_MAP[s(b.status)]     ?? s(b.status))       || "LEAD",
    contact_person_name:   s(b.contactPerson),
    designation:           s(b.designation),
    industry:              (INDUSTRY_MAP[s(b.industry)] ?? s(b.industry))     || "",
    business_type:         s(b.businessType),
    company_size:          s(b.companySize),
    primary_email:         s(b.email),
    secondary_email:       s(b.secondaryEmail),
    mobile:                s(b.phone),
    alternate_mobile:      s(b.alternateMobile),
    whatsapp:              s(b.whatsappNumber),
    website:               s(b.website),

    billing_address: {
      line1:   s(b.address),
      line2:   s(b.billingAddress2),
      city:    s(b.city),
      state:   s(b.state),
      country: s(b.country) || "India",
      pincode: s(b.pincode),
    },
    same_shipping:         Boolean(b.sameAsBilling),
    shipping_address: {
      line1:   s(b.shippingAddress1),
      line2:   s(b.shippingAddress2),
      city:    s(b.shippingCity),
      state:   s(b.shippingState),
      country: s(b.shippingCountry),
      pincode: s(b.shippingPincode),
    },

    gst_registered:       Boolean(b.isGstRegistered),
    gst_number:           s(b.gstin),
    pan_number:           s(b.pan),
    tan_number:           s(b.tan),
    msme_number:          s(b.msmeNumber),
    registration_number:  s(b.companyRegNo),
    cin_number:           s(b.cin),
    year_established:     n(b.yearEstablished),
    number_of_employees:  n(b.numberOfEmployees),
    annual_revenue:       n(b.annualRevenue),

    facebook:             s(b.facebookUrl),
    instagram:            s(b.instagramUrl),
    linkedin:             s(b.linkedinUrl),
    twitter:              s(b.twitterUrl),
    youtube:              s(b.youtubeUrl),
    google_business:      s(b.googleBusinessUrl),

    account_manager_id:   b.accountManagerId ?? null,
    lead_source:          (LEAD_SOURCE_MAP[s(b.leadSource)]     ?? s(b.leadSource))     || "",
    payment_terms:        (PAYMENT_TERMS_MAP[s(b.paymentTerms)] ?? s(b.paymentTerms))   || "",
    credit_limit:         n(b.creditLimit),
    opening_balance:      n(b.openingBalance),
    outstanding_balance:  n(b.outstandingBalance),

    bank_details: {
      bankName:      s(b.bankName),
      accountHolder: s(b.accountHolderName),
      accountNumber: s(b.accountNumber),
      ifscCode:      s(b.ifscCode),
      branchName:    s(b.branchName),
      upiId:         s(b.upiId),
    },

    internal_notes:       s(b.internalNotes),
    special_instructions: s(b.specialInstructions),
    meeting_notes:        s(b.meetingNotes),
    tags:                 Array.isArray(b.tags)                      ? b.tags                      : [],
    contacts:             Array.isArray(b.contacts)                  ? b.contacts                  : [],
    documents:            Array.isArray(b.documents)                 ? b.documents                 : [],
    development_services:         Array.isArray(b.developmentServices)        ? b.developmentServices        : [],
    digital_marketing_services:   Array.isArray(b.digitalMarketingServices)   ? b.digitalMarketingServices   : [],
  };
}

// ── GET /api/clients ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const search           = searchParams.get("search")?.trim() ?? "";
    const status           = searchParams.get("status") ?? "";
    const type             = searchParams.get("type") ?? "";
    const industry         = searchParams.get("industry") ?? "";
    const accountManagerId = searchParams.get("accountManagerId") ?? "";
    const fromDate         = searchParams.get("fromDate") ?? "";
    const toDate           = searchParams.get("toDate") ?? "";
    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",              10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));

    const supabase = createServerClient();
    let query = supabase.from("clients").select("*", { count: "exact" });

    if (search) {
      query = query.or(
        `company_name.ilike.%${search}%,client_code.ilike.%${search}%,primary_email.ilike.%${search}%,mobile.ilike.%${search}%`
      );
    }
    if (status) {
      const dbStatus = STATUS_MAP[status.toUpperCase()] ?? status;
      query = query.eq("status", dbStatus);
    }
    if (type)             query = query.eq("client_type", type);
    if (industry)         query = query.eq("industry", industry);
    if (accountManagerId) query = query.eq("account_manager_id", accountManagerId);
    if (fromDate)         query = query.gte("created_at", fromDate);
    if (toDate)           query = query.lte("created_at", toDate);

    query = query.range((page - 1) * limit, page * limit - 1).order("created_at", { ascending: false });

    const { data, count, error } = await query;
    if (error) {
      console.error("[GET /api/clients]", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const total = count ?? 0;
    return NextResponse.json({
      success: true,
      data: {
        clients: (data ?? []).map(rowToClient),
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[GET /api/clients]", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// ── POST /api/clients ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }

    // Accept either `name` or `companyName` from the payload
    if (!body.name && body.companyName) body.name = body.companyName;
    if (!body.name || String(body.name).trim() === "") {
      return NextResponse.json({ success: false, message: "companyName is required" }, { status: 422 });
    }

    const row = specToRow(body);
    console.log("[POST /api/clients] inserting row:", JSON.stringify(row, null, 2));

    const supabase = createServerClient();
    const { data, error } = await supabase.from("clients").insert(row).select().single();

    if (error) {
      console.error("[POST /api/clients] supabase error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    console.log("[POST /api/clients] inserted:", JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true, data: rowToClient(data) }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[POST /api/clients]", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
