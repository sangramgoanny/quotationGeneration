import { request } from "./request";

export type QuotationStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export interface QuotationScope {
  id?:       string;
  title:     string;
  details:   string[];
  sortOrder: number;
}

export interface QuotationPricing {
  id?:         string;
  description: string;
  cost:        number | string;
  sortOrder:   number;
}

export interface QuotationTerm {
  id?:       string;
  term:      string;
  sortOrder: number;
}

export type DurationUnit = "DAYS" | "WEEKS" | "MONTHS";

export interface QuotationTimelinePhase {
  id?:         string;
  phase:       string;
  description?: string;
  duration:    number;
  unit:        DurationUnit;
  sortOrder:   number;
}

export interface QuotationListItem {
  id:              string;
  quotationNumber: string;
  clientId:        string;
  clientName:      string;
  clientAddress:   string;
  date:            string;
  subject:         string;
  totalAmount:     string | number;
  status:          QuotationStatus;
  createdAt:       string;
}

export interface Quotation {
  id:              string;
  quotationNumber: string;
  clientId:        string;
  clientName:      string;
  clientAddress:   string;
  date:            string;
  subject:         string;
  introParagraph:  string;
  note:            string;
  totalAmount:     string | number;
  status:          QuotationStatus;
  client?: {
    id:           string;
    companyName:  string;
    primaryEmail: string;
    mobile:       string;
  };
  createdBy?: {
    id:   string;
    name: string;
  };
  scope:           QuotationScope[];
  pricing:         QuotationPricing[];
  paymentTerms:    QuotationTerm[];
  termsConditions: QuotationTerm[];
  timeline:        QuotationTimelinePhase[];
  createdById?:    string;
  createdAt:       string;
  updatedAt:       string;
}

export interface CreateQuotationPayload {
  clientId:        string;
  clientName:      string;
  clientAddress:   string;
  subject:         string;
  date:            string;
  totalAmount?:    number;
  introParagraph?: string;
  note?:           string;
  scope:           Omit<QuotationScope, "id">[];
  pricing:         Omit<QuotationPricing, "id">[];
  paymentTerms:    Omit<QuotationTerm, "id">[];
  termsConditions: Omit<QuotationTerm, "id">[];
  timeline?:       Omit<QuotationTimelinePhase, "id">[];
}

export interface ActivityLog {
  id:          string;
  userName:    string;
  action:      string;
  description: string;
  meta?:       Record<string, string>;
  createdAt:   string;
}

interface Res<T> { success: boolean; data: T }
interface PaginatedListRes {
  success: boolean;
  data: {
    quotations:  QuotationListItem[];
    pagination:  { total: number; page: number; limit: number; pages: number };
  };
}
interface ActivityRes {
  success: boolean;
  data: {
    logs:       ActivityLog[];
    pagination: { total: number; page: number; limit: number; pages: number };
  };
}

export const quotationsApi = {
  async list(params?: {
    clientId?: string;
    status?:   QuotationStatus;
    search?:   string;
    page?:     number;
    limit?:    number;
  }): Promise<{ data: QuotationListItem[]; total: number; page: number; pages: number }> {
    const p = new URLSearchParams();
    if (params?.clientId) p.set("clientId", params.clientId);
    if (params?.status)   p.set("status",   params.status);
    if (params?.search)   p.set("search",   params.search);
    if (params?.page)     p.set("page",     String(params.page));
    if (params?.limit)    p.set("limit",    String(params.limit));
    const qs = p.toString();
    const r = await request<PaginatedListRes>(`/api/quotations${qs ? `?${qs}` : ""}`);
    const pg = r.data.pagination;
    return { data: r.data.quotations, total: pg.total, page: pg.page, pages: pg.pages };
  },

  async get(id: string): Promise<Quotation> {
    const r = await request<Res<Quotation>>(`/api/quotations/${id}`);
    return r.data;
  },

  async create(data: CreateQuotationPayload): Promise<Quotation> {
    const r = await request<Res<Quotation>>("/api/quotations", {
      method: "POST",
      body:   JSON.stringify(data),
    });
    return r.data;
  },

  async update(id: string, data: Partial<CreateQuotationPayload>): Promise<Quotation> {
    const r = await request<Res<Quotation>>(`/api/quotations/${id}`, {
      method: "PATCH",
      body:   JSON.stringify(data),
    });
    return r.data;
  },

  async updateStatus(id: string, status: QuotationStatus): Promise<{ id: string; status: QuotationStatus }> {
    const r = await request<Res<{ id: string; status: QuotationStatus }>>(`/api/quotations/${id}/status`, {
      method: "PATCH",
      body:   JSON.stringify({ status }),
    });
    return r.data;
  },

  async delete(id: string): Promise<void> {
    await request<void>(`/api/quotations/${id}`, { method: "DELETE" });
  },

  async listByClient(clientId: string, params?: { status?: QuotationStatus; page?: number; limit?: number }): Promise<{ data: QuotationListItem[]; total: number }> {
    const p = new URLSearchParams();
    if (params?.status) p.set("status", params.status);
    if (params?.page)   p.set("page",   String(params.page));
    if (params?.limit)  p.set("limit",  String(params.limit));
    const qs = p.toString();
    const r = await request<PaginatedListRes>(`/api/clients/${clientId}/quotations${qs ? `?${qs}` : ""}`);
    return { data: r.data.quotations, total: r.data.pagination.total };
  },

  async getActivity(id: string, params?: { page?: number; limit?: number }): Promise<{ logs: ActivityLog[]; total: number }> {
    const p = new URLSearchParams();
    if (params?.page)  p.set("page",  String(params.page));
    if (params?.limit) p.set("limit", String(params.limit));
    const qs = p.toString();
    const r = await request<ActivityRes>(`/api/quotations/${id}/activity${qs ? `?${qs}` : ""}`);
    return { logs: r.data.logs, total: r.data.pagination.total };
  },
};
