import type { QuotationStatus } from "./api/quotations";

export interface ScopeItem { title: string; details: string[] }
export interface PricingRow { description: string; cost: number }

export type TimelineUnit = "Days" | "Weeks" | "Months";
export interface TimelinePhase {
  phase: string;
  description: string;
  duration: number;
  unit: TimelineUnit;
}

// Shared UI shape only. Quotation records and their quotationNumber values
// always come from the backend APIs.
export interface QuotationRecord {
  id: string;
  quotationNumber: string;
  clientName: string;
  clientAddress: string;
  subject: string;
  date: string;
  totalAmount: number;
  status: QuotationStatus;
  createdAt: string;
  introParagraph: string;
  note: string;
  scope: ScopeItem[];
  pricing: PricingRow[];
  paymentTerms: string[];
  termsConditions: string[];
  timeline?: TimelinePhase[];
}
