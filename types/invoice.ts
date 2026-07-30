export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export interface InvoiceClient {
  id: string;
  companyName: string;
  clientCode?: string;
}

export interface InvoiceReceipt {
  id: string;
  receiptNumber: string;
  date: string;
  amount: string | number;
  paymentMode: string;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  clientId?: string;
  quotationId?: string | null;
  invoiceNumber: string;
  date: string;
  dueDate?: string | null;
  amount: string | number;
  paid: string | number;
  due: string | number;
  status: InvoiceStatus;
  notes?: string | null;
  createdAt: string;
  client: InvoiceClient;
  receipts?: InvoiceReceipt[];
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
