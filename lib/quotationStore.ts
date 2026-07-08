import type { QuotationStatus } from "./api/quotations";

export interface ScopeItem  { title: string; details: string[] }
export interface PricingRow { description: string; cost: number }

export type TimelineUnit = "Days" | "Weeks" | "Months";
export interface TimelinePhase {
  phase: string;
  description: string;
  duration: number;
  unit: TimelineUnit;
}

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

const KEY = "goanny_quotations";

const SEED: QuotationRecord[] = [
  {
    id: "seed-1", quotationNumber: "GO/AB/QT/01062026/001", clientName: "Abhilash Technologies Pvt. Ltd.",
    clientAddress: "301, Tech Park, Baner, Pune – 411045",
    subject: "Website Redesign & Development", date: "2026-06-01", totalAmount: 125000, status: "SENT", createdAt: "2026-06-01",
    introParagraph: "We are pleased to submit our quotation for the complete redesign and development of your company website.",
    note: "Prices are inclusive of all applicable taxes.",
    scope: [{ title: "UI/UX Design", details: ["Wireframes & prototypes", "Responsive design", "Up to 3 revisions"] }],
    pricing: [{ description: "UI/UX Design", cost: 35000 }, { description: "Frontend Development", cost: 55000 }, { description: "Backend & Hosting", cost: 35000 }],
    paymentTerms: ["50% advance on kick-off", "25% on design approval", "25% on delivery"],
    termsConditions: ["Validity: 30 days", "Source code handed over after full payment"],
  },
  {
    id: "seed-2", quotationNumber: "GO/TC/QT/28052026/002", clientName: "TechCorp Solutions",
    clientAddress: "12, MG Road, Bengaluru – 560001",
    subject: "Digital Marketing Campaign – Q3", date: "2026-05-28", totalAmount: 75000, status: "ACCEPTED", createdAt: "2026-05-28",
    introParagraph: "Thank you for the opportunity to propose our digital marketing services.",
    note: "Ad budget is separate from the service fee.",
    scope: [{ title: "Social Media Management", details: ["3 posts/week", "Story creation", "Community engagement"] }],
    pricing: [{ description: "Social Media Management (3 months)", cost: 45000 }, { description: "Paid Ads Management Fee", cost: 30000 }],
    paymentTerms: ["100% advance payment"],
    termsConditions: ["Ad spend billed separately at actuals", "Validity: 15 days"],
  },
  {
    id: "seed-3", quotationNumber: "GO/IN/QT/20052026/003", clientName: "Infra Nexus Ltd.",
    clientAddress: "5th Floor, Infinity Tower, Navi Mumbai – 400614",
    subject: "ERP Software Implementation", date: "2026-05-20", totalAmount: 340000, status: "DRAFT", createdAt: "2026-05-20",
    introParagraph: "We propose a full-scale ERP implementation to streamline your operations.",
    note: "Data migration from legacy system is included.",
    scope: [{ title: "Module Implementation", details: ["Finance & Accounting", "HR & Payroll", "Inventory Management"] }],
    pricing: [{ description: "ERP Licensing (Annual)", cost: 120000 }, { description: "Implementation", cost: 150000 }, { description: "Data Migration", cost: 40000 }, { description: "Training", cost: 30000 }],
    paymentTerms: ["40% on PO", "40% on go-live", "20% after support"],
    termsConditions: ["Validity: 45 days"],
  },
  {
    id: "seed-4", quotationNumber: "GO/SY/QT/15052026/004", clientName: "Synapse Digital",
    clientAddress: "8, Cyber City, Gurugram – 122002",
    subject: "Mobile App Development (Android)", date: "2026-05-15", totalAmount: 220000, status: "REJECTED", createdAt: "2026-05-15",
    introParagraph: "We are excited to present our proposal for a native Android application.",
    note: "iOS version available at additional cost.",
    scope: [{ title: "App Development", details: ["Native Android (Kotlin)", "REST API integration", "Firebase notifications"] }],
    pricing: [{ description: "UI/UX Design", cost: 40000 }, { description: "Android Development", cost: 150000 }, { description: "QA & Deployment", cost: 30000 }],
    paymentTerms: ["50% advance", "30% on beta", "20% on release"],
    termsConditions: ["Validity: 30 days"],
  },
  {
    id: "seed-5", quotationNumber: "GO/NX/QT/30042026/005", clientName: "NovaTech Industries",
    clientAddress: "Plot 22, Industrial Area, Hyderabad – 500032",
    subject: "Annual IT Support & Maintenance", date: "2026-04-30", totalAmount: 96000, status: "EXPIRED", createdAt: "2026-04-30",
    introParagraph: "This quotation covers our Annual Managed IT Support package.",
    note: "On-site visits beyond 4/quarter charged at ₹2,500 per visit.",
    scope: [{ title: "Helpdesk Support", details: ["8×5 remote support", "4-hour response SLA"] }],
    pricing: [{ description: "Annual Helpdesk Support", cost: 60000 }, { description: "Infrastructure Maintenance", cost: 36000 }],
    paymentTerms: ["Annual upfront payment"],
    termsConditions: ["Contract period: 12 months", "30-day notice to cancel"],
  },
];

export function loadQuotations(): QuotationRecord[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as QuotationRecord[];
  } catch {
    return SEED;
  }
}

export function saveQuotations(list: QuotationRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function addQuotation(record: QuotationRecord): void {
  const list = loadQuotations();
  saveQuotations([record, ...list]);
}

export function deleteQuotation(id: string): void {
  saveQuotations(loadQuotations().filter(q => q.id !== id));
}

export function getQuotation(id: string): QuotationRecord | undefined {
  return loadQuotations().find(q => q.id === id);
}

export function updateQuotation(id: string, data: Omit<QuotationRecord, "id" | "createdAt">): void {
  const list = loadQuotations();
  saveQuotations(list.map(q => q.id === id ? { ...q, ...data } : q));
}

export function genQuotNumber(clientName: string, serial: number): string {
  const cl = clientName.replace(/[^A-Za-z]/g, "").substring(0, 2).toUpperCase() || "CL";
  const d  = new Date();
  const dp = String(d.getDate()).padStart(2, "0") + String(d.getMonth() + 1).padStart(2, "0") + d.getFullYear();
  return `GO/${cl}/QT/${dp}/${String(serial).padStart(3, "0")}`;
}
