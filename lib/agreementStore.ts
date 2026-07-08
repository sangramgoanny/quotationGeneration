import type { AgreementStatus } from "./api/agreements";
import type { ScopeItem, PricingRow } from "./quotationStore";

export type { ScopeItem, PricingRow };

export interface AgreementRecord {
  id: string;
  agreementNumber: string;
  clientName: string;
  clientAddress: string;
  quotationId?: string;
  subject: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: AgreementStatus;
  createdAt: string;
  introParagraph: string;
  note: string;
  scope: ScopeItem[];
  pricing: PricingRow[];
  paymentTerms: string[];
  termsConditions: string[];
}
