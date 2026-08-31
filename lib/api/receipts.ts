import { request } from "@/lib/api/request";
import type { InvoiceReceipt } from "@/types/invoice";

export type PaymentMode = "CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE" | "CARD" | "OTHER";

export interface CreateReceiptPayload {
  clientId: string;
  invoiceId: string;
  date: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
}

export interface ReceiptLastEmail {
  to: string;
  sentAt: string;
}

export interface ReceiptListItem extends InvoiceReceipt {
  invoiceId?: string;
  clientId?: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    amount?: string | number;
  } | null;
  client?: {
    id: string;
    companyName: string;
    clientCode?: string;
  } | null;
  lastEmail?: ReceiptLastEmail | null;
  emailHistory?: ReceiptLastEmail[];
}

export interface ReceiptListResponse {
  receipts: ReceiptListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface ApiEnvelope<T> {
  success?: boolean;
  data: T;
}

export interface SendDocumentEmailPayload {
  to?: string;
  cc?: string[];
  subject: string;
  message?: string;
  attachmentFilename: string;
  attachmentBase64: string;
}

export const receiptsApi = {
  async list(params: { search?: string; page?: number; limit?: number } = {}): Promise<ReceiptListResponse> {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    const suffix = query.size ? `?${query.toString()}` : "";
    const response = await request<
      ReceiptListResponse | ReceiptListItem[] | ApiEnvelope<ReceiptListResponse | ReceiptListItem[]>
    >(`/api/receipts${suffix}`);
    const unwrapped = typeof response === "object" && response !== null && "data" in response
      ? response.data
      : response;
    if (Array.isArray(unwrapped)) {
      return {
        receipts: unwrapped,
        pagination: { total: unwrapped.length, page: 1, limit: unwrapped.length, pages: 1 },
      };
    }
    return unwrapped;
  },

  async create(payload: CreateReceiptPayload): Promise<InvoiceReceipt> {
    const response = await request<InvoiceReceipt | ApiEnvelope<InvoiceReceipt>>("/api/receipts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return typeof response === "object" && response !== null && "data" in response
      ? (response as ApiEnvelope<InvoiceReceipt>).data
      : response as InvoiceReceipt;
  },

  async get(id: string): Promise<ReceiptListItem> {
    const response = await request<ReceiptListItem | ApiEnvelope<ReceiptListItem>>(
      `/api/receipts/${encodeURIComponent(id)}`,
    );
    return typeof response === "object" && response !== null && "data" in response
      ? (response as ApiEnvelope<ReceiptListItem>).data
      : response as ReceiptListItem;
  },

  async void(id: string, reason: string): Promise<ReceiptListItem> {
    const response = await request<ReceiptListItem | ApiEnvelope<ReceiptListItem>>(
      `/api/receipts/${encodeURIComponent(id)}/void`,
      { method: "PATCH", body: JSON.stringify({ reason }) },
    );
    return typeof response === "object" && response !== null && "data" in response
      ? (response as ApiEnvelope<ReceiptListItem>).data
      : response as ReceiptListItem;
  },

  async sendEmail(id: string, payload: SendDocumentEmailPayload): Promise<{ sent: boolean; to: string }> {
    const response = await request<{ sent: boolean; to: string } | ApiEnvelope<{ sent: boolean; to: string }>>(
      `/api/receipts/${encodeURIComponent(id)}/email`,
      { method: "POST", body: JSON.stringify(payload) },
    );
    return typeof response === "object" && response !== null && "data" in response
      ? (response as ApiEnvelope<{ sent: boolean; to: string }>).data
      : response as { sent: boolean; to: string };
  },
};
