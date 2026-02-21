export interface ClientInfo {
  companyName: string
  clientName: string
  email: string
  phone: string
  address: string
  city?: string
  state?: string
  pin?: string
}

export interface QuotationItem {
  id: string
  description: string
  quantity: number
  unit: string
  rate: number
  amount: number
}

export type Currency = 'INR' | 'USD' | 'EUR'
export type TaxType = 'igst' | 'gst'
export type DiscountType = 'percent' | 'fixed'

export interface QuotationMeta {
  quotationNumber: string
  reference: string
  projectName: string
  currency: Currency
  taxType: TaxType
  taxPercent: number
  discountType: DiscountType
  discountValue: number
  paymentTerms: string
  validityDays: number
  remarks: string
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
}

export const PAYMENT_TERMS = [
  'Net 15 days',
  'Net 30 days',
  'Net 45 days',
  '50% advance, 50% on delivery',
  '100% advance',
  'On delivery',
]
