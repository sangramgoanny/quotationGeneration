// ─── Enums / Unions ──────────────────────────────────────────────────────────

export type ClientType =
  | "Company"
  | "Individual";

export type ClientStatus =
  | "Lead"
  | "Active"
  | "Inactive"
  | "Completed"
  | "Blacklisted";

export type Industry =
  | "IT Services"
  | "Digital Marketing"
  | "Manufacturing"
  | "Healthcare"
  | "Education"
  | "Retail"
  | "Construction"
  | "Mining"
  | "Logistics"
  | "Real Estate"
  | "Finance"
  | "Other";

export type LeadSource =
  | "Website"
  | "Referral"
  | "Facebook"
  | "Instagram"
  | "LinkedIn"
  | "Google Ads"
  | "Direct Call"
  | "Cold Call"
  | "Email"
  | "Social Media"
  | "Existing Client"
  | "Other";

export type PaymentTerms =
  | "Advance Payment"
  | "Net 15"
  | "Net 30"
  | "Net 45"
  | "Net 60";

export type DocumentType =
  | "GST Certificate"
  | "PAN Card"
  | "MSME Certificate"
  | "Company Registration"
  | "Incorporation Certificate"
  | "Cancelled Cheque"
  | "Purchase Order"
  | "NDA"
  | "Signed Agreement"
  | "Other";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Address {
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface ContactPerson {
  id?: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  mobile: string;
  whatsapp: string;
  isPrimary: boolean;
}

export interface BankDetails {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  upiId: string;
}

export interface ClientDocument {
  id: string;
  name: string;
  documentType: DocumentType;
  fileType: string;
  fileSize: number;
  s3Url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  description: string;
  createdAt: string;
}

// ─── Main Client Interface ────────────────────────────────────────────────────

export interface Client {
  // Identity
  id?: string;
  clientCode?: string;

  // Basic Info
  clientType: ClientType;
  companyName: string;
  leadStage?: "New" | "Hot" | "Warm" | "Cold" | "Quotation Sent" | "Won" | "Lost";
  contactPersonName: string;
  designation: string;
  industry: Industry | "";
  businessType: string;
  companySize: string;
  status: ClientStatus;

  // Contact Info
  primaryEmail: string;
  secondaryEmail: string;
  mobile: string;
  alternateMobile: string;
  phone: string;
  whatsapp: string;
  website: string;

  // Address
  billingAddress: Address;
  sameShipping: boolean;
  shippingAddress: Address;

  // GST & Tax
  gstRegistered: boolean;
  gstNumber: string;
  panNumber: string;
  tanNumber: string;
  msmeNumber: string;

  // Business Info
  registrationNumber: string;
  cinNumber: string;
  yearEstablished: string;
  numberOfEmployees: string;
  annualRevenue: string;

  // Social Media
  facebook: string;
  instagram: string;
  linkedin: string;
  twitter: string;
  youtube: string;
  googleBusiness: string;

  // Account Info
  accountManager: string;
  leadSource: LeadSource | "";
  paymentTerms: PaymentTerms | "";
  creditLimit: string;
  openingBalance: string;
  outstandingBalance: string;

  // Bank Details
  bankDetails: BankDetails;

  // Contact Persons
  contacts: ContactPerson[];

  // Documents
  documents: ClientDocument[];

  // Notes
  internalNotes: string;
  specialInstructions: string;
  meetingNotes: string;

  // Tags
  tags: string[];

  // Taken Services
  developmentServices: string[];
  digitalMarketingServices: string[];

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// ─── Empty Defaults ───────────────────────────────────────────────────────────

export const emptyAddress = (): Address => ({
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
});

export const emptyBankDetails = (): BankDetails => ({
  bankName: "",
  accountHolder: "",
  accountNumber: "",
  ifscCode: "",
  branchName: "",
  upiId: "",
});

export const emptyClient = (): Client => ({
  clientType: "Company",
  companyName: "",
  contactPersonName: "",
  designation: "",
  industry: "",
  businessType: "",
  companySize: "",
  status: "Lead",
  primaryEmail: "",
  secondaryEmail: "",
  mobile: "",
  alternateMobile: "",
  phone: "",
  whatsapp: "",
  website: "",
  billingAddress: emptyAddress(),
  sameShipping: false,
  shippingAddress: emptyAddress(),
  gstRegistered: false,
  gstNumber: "",
  panNumber: "",
  tanNumber: "",
  msmeNumber: "",
  registrationNumber: "",
  cinNumber: "",
  yearEstablished: "",
  numberOfEmployees: "",
  annualRevenue: "",
  facebook: "",
  instagram: "",
  linkedin: "",
  twitter: "",
  youtube: "",
  googleBusiness: "",
  accountManager: "",
  leadSource: "",
  paymentTerms: "",
  creditLimit: "",
  openingBalance: "",
  outstandingBalance: "",
  bankDetails: emptyBankDetails(),
  contacts: [],
  documents: [],
  internalNotes: "",
  specialInstructions: "",
  meetingNotes: "",
  tags: [],
  developmentServices: [],
  digitalMarketingServices: [],
});
