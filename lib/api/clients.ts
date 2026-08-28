import { authHeader } from "@/utils/token";
import { API_BASE_URL as BASE } from "@/lib/api/config";
import { emptyClient, type Client, type ContactPerson, type ClientDocument } from "@/types/client";
import { request } from "./request";

// ─── Enum maps: frontend display value → API enum ────────────────────────────

const INDUSTRY_MAP: Record<string, string> = {
  "IT Services": "IT_SERVICES", "Digital Marketing": "DIGITAL_MARKETING",
  "Manufacturing": "MANUFACTURING", "Healthcare": "HEALTHCARE",
  "Education": "EDUCATION", "Retail": "RETAIL", "Construction": "CONSTRUCTION",
  "Mining": "MINING", "Logistics": "LOGISTICS", "Real Estate": "REAL_ESTATE",
  "Finance": "FINANCE", "Other": "OTHER",
};

const LEAD_SOURCE_MAP: Record<string, string> = {
  "Website": "WEBSITE", "Referral": "REFERRAL", "Facebook": "FACEBOOK",
  "Instagram": "INSTAGRAM", "LinkedIn": "LINKEDIN", "Google Ads": "GOOGLE_ADS",
  "Direct Call": "DIRECT_CALL", "Existing Client": "EXISTING_CLIENT",
  "Cold Call": "COLD_CALL", "Email": "EMAIL", "Social Media": "SOCIAL_MEDIA",
  "Other": "OTHER",
};

const PAYMENT_TERMS_MAP: Record<string, string> = {
  "Advance Payment": "ADVANCE", "Net 15": "NET_15", "Net 30": "NET_30",
  "Net 45": "NET_45", "Net 60": "NET_60",
};

const LEAD_STAGE_MAP: Record<string, string> = {
  "New": "NEW", "Hot": "HOT", "Warm": "WARM", "Cold": "COLD",
  "Quotation Sent": "QUOTATION_SENT", "Won": "WON", "Lost": "LOST",
};

const CLIENT_TYPE_MAP: Record<string, string> = {
  "Company": "COMPANY", "Individual": "INDIVIDUAL",
};

const STATUS_MAP: Record<string, string> = {
  "Lead": "LEAD", "Active": "ACTIVE", "Inactive": "INACTIVE",
  "Completed": "COMPLETED", "Blacklisted": "BLACKLISTED",
};

// ─── Field mapper: frontend Client → exact API payload ───────────────────────
// Field names match the API spec 1:1 (flat structure, no nesting)

function clientToSpec(c: Partial<Client> & { leadStage?: string }): Record<string, unknown> {
  const num = (v: unknown) => {
    const n = Number(String(v ?? "").replace(/,/g, ""));
    return isNaN(n) ? undefined : n || undefined;
  };
  const str = (v: unknown) => (v == null ? "" : String(v));

  const payload = {
    // ── Section 1: Basic Info ──────────────────────────────────────────────
    companyName:          str(c.companyName),
    clientType:           CLIENT_TYPE_MAP[str(c.clientType)] ?? "COMPANY",
    status:               STATUS_MAP[str(c.status)]          ?? "LEAD",
    leadStage:            c.leadStage ? (LEAD_STAGE_MAP[c.leadStage] ?? c.leadStage.toUpperCase()) : undefined,
    contactPersonName:    str(c.contactPersonName),
    designation:          str(c.designation),
    industry:             INDUSTRY_MAP[str(c.industry)] ?? (str(c.industry).toUpperCase().replace(/\s+/g, "_") || undefined),
    businessType:         str(c.businessType),
    companySize:          str(c.companySize),

    // ── Section 2: Contact Info ────────────────────────────────────────────
    primaryEmail:         str(c.primaryEmail),
    secondaryEmail:       str(c.secondaryEmail),
    mobile:               str(c.mobile),
    alternateMobile:      str(c.alternateMobile),
    phone:                str(c.phone),
    whatsapp:             str(c.whatsapp),
    website:              str(c.website),

    // ── Section 3: Address (flat fields) ──────────────────────────────────
    billingLine1:         str(c.billingAddress?.line1),
    billingLine2:         str(c.billingAddress?.line2),
    billingCity:          str(c.billingAddress?.city),
    billingState:         str(c.billingAddress?.state),
    billingCountry:       str(c.billingAddress?.country) || "India",
    billingPincode:       str(c.billingAddress?.pincode),
    sameShipping:         Boolean(c.sameShipping),
    shippingLine1:        str(c.shippingAddress?.line1),
    shippingLine2:        str(c.shippingAddress?.line2),
    shippingCity:         str(c.shippingAddress?.city),
    shippingState:        str(c.shippingAddress?.state),
    shippingCountry:      str(c.shippingAddress?.country),
    shippingPincode:      str(c.shippingAddress?.pincode),

    // ── Section 4: GST & Tax ──────────────────────────────────────────────
    gstRegistered:        Boolean(c.gstRegistered),
    gstNumber:            str(c.gstNumber),
    panNumber:            str(c.panNumber),
    tanNumber:            str(c.tanNumber),
    msmeNumber:           str(c.msmeNumber),

    // ── Section 5: Business Info ──────────────────────────────────────────
    registrationNumber:   str(c.registrationNumber),
    cinNumber:            str(c.cinNumber),
    yearEstablished:      num(c.yearEstablished),
    numberOfEmployees:    num(c.numberOfEmployees),
    annualRevenue:        num(c.annualRevenue),

    // ── Section 6: Social Media ───────────────────────────────────────────
    facebook:             str(c.facebook),
    instagram:            str(c.instagram),
    linkedin:             str(c.linkedin),
    twitter:              str(c.twitter),
    youtube:              str(c.youtube),
    googleBusiness:       str(c.googleBusiness),

    // ── Section 7: Account Info ───────────────────────────────────────────
    accountManagerId:     "accountManager" in c ? (c.accountManager || null) : undefined,
    leadSource:           LEAD_SOURCE_MAP[str(c.leadSource)]   || undefined,
    paymentTerms:         PAYMENT_TERMS_MAP[str(c.paymentTerms)] || undefined,
    creditLimit:          num(c.creditLimit),
    openingBalance:       num(c.openingBalance),
    outstandingBalance:   num(c.outstandingBalance),

    // ── Section 8: Bank Details (flat fields) ─────────────────────────────
    bankName:             str(c.bankDetails?.bankName),
    bankAccountHolder:    str(c.bankDetails?.accountHolder),
    bankAccountNumber:    str(c.bankDetails?.accountNumber),
    bankIfscCode:         str(c.bankDetails?.ifscCode),
    bankBranchName:       str(c.bankDetails?.branchName),
    bankUpiId:            str(c.bankDetails?.upiId),

    // ── Section 11: Notes ─────────────────────────────────────────────────
    internalNotes:        str(c.internalNotes),
    specialInstructions:  str(c.specialInstructions),
    meetingNotes:         str(c.meetingNotes),

    // ── Section 12: Services & Tags ───────────────────────────────────────
    tags:                        Array.isArray(c.tags)                       ? c.tags                       : [],
    developmentServices:         Array.isArray(c.developmentServices)        ? c.developmentServices        : undefined,
    digitalMarketingServices:    Array.isArray(c.digitalMarketingServices)   ? c.digitalMarketingServices   : undefined,
  };

  // The backend validates optional values when present. Do not send blank
  // strings or undefined fields; keep false, zero, and array values intact.
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== "" && value !== undefined && value !== null),
  );
}

function toEnum(value: string): string {
  return value.trim().toUpperCase().replace(/[\s\/\-()]+/g, "_").replace(/_+/g, "_").replace(/_$/, "");
}

// ─── Filter / response types ──────────────────────────────────────────────────

export interface ClientFilters {
  search?:           string;
  status?:           string;
  stage?:            string;
  industry?:         string;
  type?:             string;
  accountManagerId?: string;
  fromDate?:         string;
  toDate?:           string;
  page?:             number;
  limit?:            number;
}

export interface ClientListResponse {
  data:  Client[];
  total: number;
  page:  number;
  limit: number;
  pages: number;
}

interface RawClientListItem extends Omit<Partial<Client>, "accountManager" | "outstandingBalance" | "billingCity"> {
  accountManager?: { id: string; name?: string; email?: string } | string | null;
  billingCity?: string | null;
  outstandingBalance?: string | number;
  _count?: { quotations?: number; invoices?: number };
}

interface RawListResponse {
  success: boolean;
  data: {
    clients: RawClientListItem[];
    pagination: { total: number; page: number; limit: number; pages: number };
  };
}

const CLIENT_STATUS_DISPLAY: Record<string, Client["status"]> = {
  LEAD: "Lead",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  COMPLETED: "Completed",
  BLACKLISTED: "Blacklisted",
};

const CLIENT_TYPE_DISPLAY: Record<string, Client["clientType"]> = {
  COMPANY: "Company",
  INDIVIDUAL: "Individual",
};

const INDUSTRY_DISPLAY: Record<string, Client["industry"]> = {
  IT_SERVICES: "IT Services",
  DIGITAL_MARKETING: "Digital Marketing",
  MANUFACTURING: "Manufacturing",
  HEALTHCARE: "Healthcare",
  EDUCATION: "Education",
  RETAIL: "Retail",
  CONSTRUCTION: "Construction",
  MINING: "Mining",
  LOGISTICS: "Logistics",
  REAL_ESTATE: "Real Estate",
  FINANCE: "Finance",
  OTHER: "Other",
};

function listItemToClient(row: RawClientListItem): Client {
  const manager = row.accountManager;
  return {
    ...emptyClient(),
    ...row,
    id: row.id,
    status: CLIENT_STATUS_DISPLAY[String(row.status)] ?? row.status ?? "Lead",
    clientType: CLIENT_TYPE_DISPLAY[String(row.clientType)] ?? row.clientType ?? "Company",
    industry: INDUSTRY_DISPLAY[String(row.industry)] ?? row.industry ?? "",
    accountManager: typeof manager === "object" && manager ? manager.id : String(manager ?? ""),
    accountManagerName: typeof manager === "object" && manager ? (manager.name || manager.email) : undefined,
    billingCity: row.billingCity ?? undefined,
    outstandingBalance: String(row.outstandingBalance ?? "0"),
    quotationCount: row._count?.quotations ?? 0,
    invoiceCount: row._count?.invoices ?? 0,
  } as Client;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const clientsApi = {

  async list(filters?: ClientFilters): Promise<ClientListResponse> {
    const p = new URLSearchParams();
    if (filters?.search)           p.set("search",           filters.search);
    if (filters?.status)           p.set("status",           toEnum(filters.status));
    if (filters?.stage)            p.set("stage",            toEnum(filters.stage));
    if (filters?.industry)         p.set("industry",         toEnum(filters.industry));
    if (filters?.type)             p.set("type",             toEnum(filters.type));
    if (filters?.accountManagerId) p.set("accountManagerId", filters.accountManagerId);
    if (filters?.fromDate) {
      p.set(
        "fromDate",
        /^\d{4}-\d{2}-\d{2}$/.test(filters.fromDate)
          ? `${filters.fromDate}T00:00:00.000Z`
          : filters.fromDate,
      );
    }
    if (filters?.toDate) {
      p.set(
        "toDate",
        /^\d{4}-\d{2}-\d{2}$/.test(filters.toDate)
          ? `${filters.toDate}T23:59:59.999Z`
          : filters.toDate,
      );
    }
    if (filters?.page)             p.set("page",             String(filters.page));
    if (filters?.limit)            p.set("limit",            String(filters.limit));
    const qs = p.toString();
    const raw = await request<RawListResponse>(`/api/clients${qs ? `?${qs}` : ""}`);
    const { clients, pagination } = raw.data;
    return { data: clients.map(listItemToClient), ...pagination };
  },

  async get(id: string): Promise<Client> {
    const raw = await request<{ success: boolean; data: RawClientListItem }>(`/api/clients/${id}`);
    return listItemToClient(raw.data);
  },

  async create(data: Omit<Client, "id" | "clientCode" | "createdAt" | "updatedAt"> & { leadStage?: string }): Promise<Client> {
    const spec = clientToSpec(data);
    console.log("[clientsApi.create] spec sent to API:", JSON.stringify(spec, null, 2));
    const raw = await request<{ success: boolean; data: Client }>("/api/clients", {
      method: "POST",
      body: JSON.stringify(spec),
    });
    console.log("[clientsApi.create] response:", JSON.stringify(raw.data, null, 2));
    return raw.data;
  },

  async update(id: string, data: Partial<Client> & { leadStage?: string }): Promise<Client> {
    const raw = await request<{ success: boolean; data: Client }>(`/api/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(clientToSpec(data)),
    });
    return raw.data;
  },

  delete(id: string): Promise<void> {
    return request<void>(`/api/clients/${id}`, { method: "DELETE" });
  },

  async getWonCount(): Promise<number> {
    const r = await request<{ success: boolean; data: { count: number } }>("/api/clients/won-count");
    return r.data.count;
  },

  // ── Contacts ─────────────────────────────────────────────────────────────

  async getContacts(id: string): Promise<ContactPerson[]> {
    const r = await request<{ success: boolean; data: ContactPerson[] }>(`/api/clients/${id}/contacts`);
    return r.data;
  },

  async createContact(id: string, data: Omit<ContactPerson, "id">): Promise<ContactPerson> {
    const r = await request<{ success: boolean; data: ContactPerson }>(`/api/clients/${id}/contacts`, {
      method: "POST", body: JSON.stringify(data),
    });
    return r.data;
  },

  async updateContact(id: string, contactId: string, data: Partial<ContactPerson>): Promise<ContactPerson> {
    const r = await request<{ success: boolean; data: ContactPerson }>(`/api/clients/${id}/contacts/${contactId}`, {
      method: "PATCH", body: JSON.stringify(data),
    });
    return r.data;
  },

  deleteContact(id: string, contactId: string): Promise<void> {
    return request<void>(`/api/clients/${id}/contacts/${contactId}`, { method: "DELETE" });
  },

  // ── Documents ─────────────────────────────────────────────────────────────

  async getDocuments(id: string): Promise<ClientDocument[]> {
    const r = await request<{ success: boolean; data: ClientDocument[] }>(`/api/clients/${id}/documents`);
    return r.data;
  },

  async uploadDocument(id: string, formData: FormData): Promise<ClientDocument> {
    const res = await fetch(`${BASE}/api/clients/${id}/documents`, {
      method: "POST",
      headers: authHeader(),
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const r = await res.json();
    return r.data as ClientDocument;
  },

  deleteDocument(id: string, docId: string): Promise<void> {
    return request<void>(`/api/clients/${id}/documents/${docId}`, { method: "DELETE" });
  },

  // ── Linked record shortcuts ───────────────────────────────────────────────

  async getQuotations(id: string):  Promise<QuotationRecord[]>  {
    const r = await request<{ success: boolean; data: QuotationRecord[] }>(`/api/clients/${id}/quotations`); return r.data;
  },
  async getInvoices(id: string):    Promise<InvoiceRecord[]>    {
    const r = await request<{
      data?: { invoices?: Array<InvoiceRecord & { amount: string | number; paid: string | number; due: string | number }> };
      invoices?: Array<InvoiceRecord & { amount: string | number; paid: string | number; due: string | number }>;
    }>(`/api/invoices?clientId=${encodeURIComponent(id)}&limit=100`);
    const rows = r.data?.invoices ?? r.invoices ?? [];
    return rows.map((invoice) => ({
      ...invoice,
      amount: Number(invoice.amount) || 0,
      paid: Number(invoice.paid) || 0,
      due: Number(invoice.due) || 0,
    }));
  },
  async getReceipts(id: string):    Promise<ReceiptRecord[]>    {
    const r = await request<{
      data?: { receipts?: Array<ReceiptRecord & { clientId?: string; amount: string | number }> };
      receipts?: Array<ReceiptRecord & { clientId?: string; amount: string | number }>;
    }>("/api/receipts?limit=100");
    const rows = r.data?.receipts ?? r.receipts ?? [];
    return rows
      .filter((receipt) => !receipt.clientId || receipt.clientId === id)
      .map((receipt) => ({ ...receipt, amount: Number(receipt.amount) || 0 }));
  },
  async getProjects(id: string):    Promise<ProjectRecord[]>    {
    const r = await request<{ success: boolean; data: ProjectRecord[] }>(`/api/clients/${id}/projects`); return r.data;
  },
  async getActivity(id: string): Promise<ActivityItem[]> {
    const r = await request<{
      success: boolean;
      data: {
        logs: Array<{
          id: string;
          userName?: string;
          user?: { name?: string };
          action: string;
          description: string;
          createdAt: string;
        }>;
      };
    }>(`/api/clients/${id}/activity?page=1&limit=50`);

    return r.data.logs.map((item) => ({
      id: item.id,
      user: item.user?.name || item.userName || "System",
      action: item.action,
      description: item.description,
      createdAt: item.createdAt,
    }));
  },
};

// ─── Supporting types ─────────────────────────────────────────────────────────

export interface QuotationRecord {
  id: string; quotationNumber: string; date: string; amount: number; status: string;
}
export interface InvoiceRecord {
  id: string; invoiceNumber: string; date: string; amount: number; paid: number; due: number; status: string;
}
export interface ReceiptRecord {
  id: string; receiptNumber: string; date: string; amount: number; paymentMode: string;
}
export interface ProjectRecord {
  id: string; projectName: string; status: string; startDate: string; endDate: string; completionPercent: number;
}
export interface ActivityItem {
  id: string; user: string; action: string; description: string; createdAt: string;
}
