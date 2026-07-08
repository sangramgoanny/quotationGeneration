import { request } from "./request";

export type AgreementStatus = "DRAFT" | "SENT" | "SIGNED" | "ACTIVE" | "EXPIRED" | "TERMINATED";

export interface AgreementScope {
  id?:       string;
  title:     string;
  details:   string[];
  sortOrder: number;
}

export interface AgreementPricing {
  id?:         string;
  description: string;
  cost:        number | string;
  sortOrder:   number;
}

export interface AgreementTerm {
  id?:       string;
  term:      string;
  sortOrder: number;
}

export interface AgreementListItem {
  id:              string;
  agreementNumber: string;
  clientId:        string;
  clientName:      string;
  clientAddress:   string;
  quotationId?:    string;
  startDate:       string;
  endDate:         string;
  subject:         string;
  totalAmount:     string | number;
  status:          AgreementStatus;
  createdAt:       string;
}

export interface Agreement {
  id:              string;
  agreementNumber: string;
  clientId:        string;
  clientName:      string;
  clientAddress:   string;
  quotationId?:    string;
  startDate:       string;
  endDate:         string;
  subject:         string;
  introParagraph:  string;
  note:            string;
  totalAmount:     string | number;
  status:          AgreementStatus;
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
  scope:           AgreementScope[];
  pricing:         AgreementPricing[];
  paymentTerms:    AgreementTerm[];
  termsConditions: AgreementTerm[];
  createdById?:    string;
  createdAt:       string;
  updatedAt:       string;
}

export interface CreateAgreementPayload {
  clientId:        string;
  clientName:      string;
  clientAddress:   string;
  quotationId?:    string;
  subject:         string;
  startDate:       string;
  endDate:         string;
  totalAmount?:    number;
  introParagraph?: string;
  note?:           string;
  scope:           Omit<AgreementScope, "id">[];
  pricing:         Omit<AgreementPricing, "id">[];
  paymentTerms:    Omit<AgreementTerm, "id">[];
  termsConditions: Omit<AgreementTerm, "id">[];
}

export interface AgreementActivityLog {
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
    agreements:  AgreementListItem[];
    pagination:  { total: number; page: number; limit: number; pages: number };
  };
}
interface ActivityRes {
  success: boolean;
  data: {
    logs:       AgreementActivityLog[];
    pagination: { total: number; page: number; limit: number; pages: number };
  };
}

export const agreementsApi = {
  async list(params?: {
    clientId?: string;
    status?:   AgreementStatus;
    search?:   string;
    page?:     number;
    limit?:    number;
  }): Promise<{ data: AgreementListItem[]; total: number; page: number; pages: number }> {
    const p = new URLSearchParams();
    if (params?.clientId) p.set("clientId", params.clientId);
    if (params?.status)   p.set("status",   params.status);
    if (params?.search)   p.set("search",   params.search);
    if (params?.page)     p.set("page",     String(params.page));
    if (params?.limit)    p.set("limit",    String(params.limit));
    const qs = p.toString();
    const r = await request<PaginatedListRes>(`/api/agreements${qs ? `?${qs}` : ""}`);
    const pg = r.data.pagination;
    return { data: r.data.agreements, total: pg.total, page: pg.page, pages: pg.pages };
  },

  async get(id: string): Promise<Agreement> {
    const r = await request<Res<Agreement>>(`/api/agreements/${id}`);
    return r.data;
  },

  async create(data: CreateAgreementPayload): Promise<Agreement> {
    const r = await request<Res<Agreement>>("/api/agreements", {
      method: "POST",
      body:   JSON.stringify(data),
    });
    return r.data;
  },

  async update(id: string, data: Partial<CreateAgreementPayload>): Promise<Agreement> {
    const r = await request<Res<Agreement>>(`/api/agreements/${id}`, {
      method: "PATCH",
      body:   JSON.stringify(data),
    });
    return r.data;
  },

  async updateStatus(id: string, status: AgreementStatus): Promise<{ id: string; status: AgreementStatus }> {
    const r = await request<Res<{ id: string; status: AgreementStatus }>>(`/api/agreements/${id}/status`, {
      method: "PATCH",
      body:   JSON.stringify({ status }),
    });
    return r.data;
  },

  async delete(id: string): Promise<void> {
    await request<void>(`/api/agreements/${id}`, { method: "DELETE" });
  },

  async listByClient(clientId: string, params?: { status?: AgreementStatus; page?: number; limit?: number }): Promise<{ data: AgreementListItem[]; total: number }> {
    const p = new URLSearchParams();
    if (params?.status) p.set("status", params.status);
    if (params?.page)   p.set("page",   String(params.page));
    if (params?.limit)  p.set("limit",  String(params.limit));
    const qs = p.toString();
    const r = await request<PaginatedListRes>(`/api/clients/${clientId}/agreements${qs ? `?${qs}` : ""}`);
    return { data: r.data.agreements, total: r.data.pagination.total };
  },

  async getActivity(id: string, params?: { page?: number; limit?: number }): Promise<{ logs: AgreementActivityLog[]; total: number }> {
    const p = new URLSearchParams();
    if (params?.page)  p.set("page",  String(params.page));
    if (params?.limit) p.set("limit", String(params.limit));
    const qs = p.toString();
    const r = await request<ActivityRes>(`/api/agreements/${id}/activity${qs ? `?${qs}` : ""}`);
    return { logs: r.data.logs, total: r.data.pagination.total };
  },
};
