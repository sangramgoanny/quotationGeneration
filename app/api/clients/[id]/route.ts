import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { rowToClient } from "@/utils/case";

// ── Spec payload → Supabase row (partial — only fields present in body) ───────

const STATUS_MAP: Record<string, string> = {
  LEAD: "LEAD", ACTIVE: "ACTIVE", INACTIVE: "INACTIVE",
  COMPLETED: "COMPLETED", BLACKLISTED: "BLACKLISTED",
  Lead: "LEAD", Active: "ACTIVE", Inactive: "INACTIVE",
  Completed: "COMPLETED", Blacklisted: "BLACKLISTED",
};
const TYPE_MAP: Record<string, string> = { COMPANY: "Company", INDIVIDUAL: "Individual" };
const INDUSTRY_MAP: Record<string, string> = {
  IT_SERVICES: "IT Services", DIGITAL_MARKETING: "Digital Marketing",
  MANUFACTURING: "Manufacturing", HEALTHCARE: "Healthcare",
  EDUCATION: "Education", RETAIL: "Retail", CONSTRUCTION: "Construction",
  MINING: "Mining", LOGISTICS: "Logistics", REAL_ESTATE: "Real Estate",
  FINANCE: "Finance", OTHER: "Other",
};
const LEAD_SOURCE_MAP: Record<string, string> = {
  WEBSITE: "Website", REFERRAL: "Referral", FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram", LINKEDIN: "LinkedIn", GOOGLE_ADS: "Google Ads",
  DIRECT_CALL: "Direct Call", EXISTING_CLIENT: "Existing Client",
  COLD_CALL: "Direct Call", EMAIL: "Other", SOCIAL_MEDIA: "Other", OTHER: "Other",
};
const PAYMENT_TERMS_MAP: Record<string, string> = {
  ADVANCE: "Advance Payment", ADVANCE_PAYMENT: "Advance Payment",
  NET_15: "Net 15", NET_30: "Net 30", NET_45: "Net 45", NET_60: "Net 60",
};

function specToRow(b: Record<string, unknown>): Record<string, unknown> {
  const s = (v: unknown) => (v != null && v !== "" ? String(v) : "");
  const n = (v: unknown) => (v != null ? String(v) : "");
  const row: Record<string, unknown> = {};

  if (b.name              !== undefined) row.company_name         = s(b.name);
  if (b.type              !== undefined) row.client_type          = (TYPE_MAP[s(b.type)]         ?? s(b.type))         || "Company";
  if (b.status            !== undefined) row.status               = (STATUS_MAP[s(b.status)]     ?? s(b.status))       || "Lead";
  if (b.contactPerson     !== undefined) row.contact_person_name  = s(b.contactPerson);
  if (b.designation       !== undefined) row.designation          = s(b.designation);
  if (b.industry          !== undefined) row.industry             = (INDUSTRY_MAP[s(b.industry)] ?? s(b.industry))     || "";
  if (b.businessType      !== undefined) row.business_type        = s(b.businessType);
  if (b.companySize       !== undefined) row.company_size         = s(b.companySize);
  if (b.email             !== undefined) row.primary_email        = s(b.email);
  if (b.secondaryEmail    !== undefined) row.secondary_email      = s(b.secondaryEmail);
  if (b.phone             !== undefined) row.mobile               = s(b.phone);
  if (b.alternateMobile   !== undefined) row.alternate_mobile     = s(b.alternateMobile);
  if (b.whatsappNumber    !== undefined) row.whatsapp             = s(b.whatsappNumber);
  if (b.website           !== undefined) row.website              = s(b.website);

  if (b.address !== undefined || b.billingAddress2 !== undefined || b.city !== undefined) {
    row.billing_address = {
      line1: s(b.address), line2: s(b.billingAddress2),
      city:  s(b.city),    state: s(b.state),
      country: s(b.country) || "India", pincode: s(b.pincode),
    };
  }

  if (b.sameAsBilling     !== undefined) row.same_shipping        = Boolean(b.sameAsBilling);
  if (b.shippingAddress1  !== undefined || b.shippingCity !== undefined) {
    row.shipping_address = {
      line1: s(b.shippingAddress1), line2:   s(b.shippingAddress2),
      city:  s(b.shippingCity),     state:   s(b.shippingState),
      country: s(b.shippingCountry),         pincode: s(b.shippingPincode),
    };
  }

  if (b.isGstRegistered   !== undefined) row.gst_registered       = Boolean(b.isGstRegistered);
  if (b.gstin             !== undefined) row.gst_number           = s(b.gstin);
  if (b.pan               !== undefined) row.pan_number           = s(b.pan);
  if (b.tan               !== undefined) row.tan_number           = s(b.tan);
  if (b.msmeNumber        !== undefined) row.msme_number          = s(b.msmeNumber);
  if (b.companyRegNo      !== undefined) row.registration_number  = s(b.companyRegNo);
  if (b.cin               !== undefined) row.cin_number           = s(b.cin);
  if (b.yearEstablished   !== undefined) row.year_established     = n(b.yearEstablished);
  if (b.numberOfEmployees !== undefined) row.number_of_employees  = n(b.numberOfEmployees);
  if (b.annualRevenue     !== undefined) row.annual_revenue       = n(b.annualRevenue);
  if (b.facebookUrl       !== undefined) row.facebook             = s(b.facebookUrl);
  if (b.instagramUrl      !== undefined) row.instagram            = s(b.instagramUrl);
  if (b.linkedinUrl       !== undefined) row.linkedin             = s(b.linkedinUrl);
  if (b.twitterUrl        !== undefined) row.twitter              = s(b.twitterUrl);
  if (b.youtubeUrl        !== undefined) row.youtube              = s(b.youtubeUrl);
  if (b.googleBusinessUrl !== undefined) row.google_business      = s(b.googleBusinessUrl);
  if (b.accountManagerId  !== undefined) row.account_manager_id  = b.accountManagerId ?? null;
  if (b.leadSource        !== undefined) row.lead_source          = (LEAD_SOURCE_MAP[s(b.leadSource)]     ?? s(b.leadSource))     || "";
  if (b.paymentTerms      !== undefined) row.payment_terms        = (PAYMENT_TERMS_MAP[s(b.paymentTerms)] ?? s(b.paymentTerms))   || "";
  if (b.creditLimit       !== undefined) row.credit_limit         = n(b.creditLimit);
  if (b.openingBalance    !== undefined) row.opening_balance      = n(b.openingBalance);
  if (b.outstandingBalance!== undefined) row.outstanding_balance  = n(b.outstandingBalance);

  if (b.bankName !== undefined || b.accountHolderName !== undefined || b.accountNumber !== undefined) {
    row.bank_details = {
      bankName:      s(b.bankName),       accountHolder: s(b.accountHolderName),
      accountNumber: s(b.accountNumber),  ifscCode:      s(b.ifscCode),
      branchName:    s(b.branchName),     upiId:         s(b.upiId),
    };
  }

  if (b.internalNotes        !== undefined) row.internal_notes       = s(b.internalNotes);
  if (b.specialInstructions  !== undefined) row.special_instructions = s(b.specialInstructions);
  if (b.meetingNotes         !== undefined) row.meeting_notes        = s(b.meetingNotes);
  if (Array.isArray(b.tags))                        row.tags                       = b.tags;
  if (Array.isArray(b.contacts))                    row.contacts                   = b.contacts;
  if (Array.isArray(b.documents))                   row.documents                  = b.documents;
  if (b.developmentServices      !== undefined) row.development_services       = Array.isArray(b.developmentServices)      ? b.developmentServices      : [];
  if (b.digitalMarketingServices !== undefined) row.digital_marketing_services = Array.isArray(b.digitalMarketingServices) ? b.digitalMarketingServices : [];

  return row;
}

// ─────────────────────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ── GET /api/clients/[id] ────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const supabase = createServerClient();
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json(
      { success: false, message: status === 404 ? "Client not found" : error.message },
      { status }
    );
  }

  return NextResponse.json({ success: true, data: rowToClient(data) });
}

// ── PATCH /api/clients/[id] ──────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("clients")
    .update(specToRow(body))
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json(
      { success: false, message: status === 404 ? "Client not found" : error.message },
      { status }
    );
  }

  return NextResponse.json({ success: true, data: rowToClient(data) });
}

// ── DELETE /api/clients/[id] ─────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const supabase = createServerClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json(
      { success: false, message: status === 404 ? "Client not found" : error.message },
      { status }
    );
  }

  return new NextResponse(null, { status: 204 });
}
