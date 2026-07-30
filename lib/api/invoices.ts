import { request } from "@/lib/api/request";
import type { Invoice, InvoiceListResponse, InvoiceStatus } from "@/types/invoice";

interface ApiEnvelope<T> {
  success?: boolean;
  data: T;
}

export interface CreateInvoicePayload {
  clientId: string;
  quotationId?: string | null;
  date: string;
  dueDate?: string | null;
  amount: number;
  paid?: number;
  status?: InvoiceStatus;
  notes?: string;
}

function unwrap<T>(response: T | ApiEnvelope<T>): T {
  if (
    typeof response === "object" &&
    response !== null &&
    "data" in response
  ) {
    return (response as ApiEnvelope<T>).data;
  }
  return response as T;
}

export const invoicesApi = {
  async create(data: CreateInvoicePayload): Promise<Invoice> {
    const response = await request<Invoice | ApiEnvelope<Invoice>>("/api/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return unwrap(response);
  },

  async list(params: {
    clientId?: string;
    status?: InvoiceStatus | "";
    page?: number;
    limit?: number;
  } = {}): Promise<InvoiceListResponse> {
    const query = new URLSearchParams();
    if (params.clientId) query.set("clientId", params.clientId);
    if (params.status) query.set("status", params.status);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    const suffix = query.size ? `?${query.toString()}` : "";
    const response = await request<InvoiceListResponse | ApiEnvelope<InvoiceListResponse>>(`/api/invoices${suffix}`);
    return unwrap(response);
  },

  async get(id: string): Promise<Invoice> {
    const response = await request<Invoice | ApiEnvelope<Invoice>>(`/api/invoices/${id}`);
    return unwrap(response);
  },

  async update(
    id: string,
    data: Partial<Pick<Invoice, "date" | "dueDate" | "status" | "notes">> & {
      amount?: number;
      paid?: number;
    },
  ): Promise<Invoice> {
    const response = await request<Invoice | ApiEnvelope<Invoice>>(`/api/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return unwrap(response);
  },
};
