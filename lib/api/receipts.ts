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

export const receiptsApi = {
  async list(params: { page?: number; limit?: number } = {}): Promise<ReceiptListResponse> {
    const query = new URLSearchParams();
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
};
