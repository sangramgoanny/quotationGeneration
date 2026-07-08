type AnyObj = Record<string, unknown>;

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

const STATUS_DISPLAY: Record<string, string> = {
  LEAD: "Lead", ACTIVE: "Active", INACTIVE: "Inactive",
  COMPLETED: "Completed", BLACKLISTED: "Blacklisted",
};
const CLIENT_TYPE_DISPLAY: Record<string, string> = {
  COMPANY: "Company", INDIVIDUAL: "Individual",
};
const INDUSTRY_DISPLAY: Record<string, string> = {
  IT_SERVICES: "IT Services", DIGITAL_MARKETING: "Digital Marketing",
  MANUFACTURING: "Manufacturing", HEALTHCARE: "Healthcare",
  EDUCATION: "Education", RETAIL: "Retail", CONSTRUCTION: "Construction",
  MINING: "Mining", LOGISTICS: "Logistics", REAL_ESTATE: "Real Estate",
  FINANCE: "Finance", OTHER: "Other",
};
const LEAD_SOURCE_DISPLAY: Record<string, string> = {
  WEBSITE: "Website", REFERRAL: "Referral", FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram", LINKEDIN: "LinkedIn", GOOGLE_ADS: "Google Ads",
  DIRECT_CALL: "Direct Call", EXISTING_CLIENT: "Existing Client",
  COLD_CALL: "Cold Call", EMAIL: "Email", SOCIAL_MEDIA: "Social Media", OTHER: "Other",
};
const PAYMENT_TERMS_DISPLAY: Record<string, string> = {
  ADVANCE: "Advance Payment", NET_15: "Net 15", NET_30: "Net 30",
  NET_45: "Net 45", NET_60: "Net 60",
};

const VALUE_MAPS: Record<string, Record<string, string>> = {
  status:       STATUS_DISPLAY,
  client_type:  CLIENT_TYPE_DISPLAY,
  industry:     INDUSTRY_DISPLAY,
  lead_source:  LEAD_SOURCE_DISPLAY,
  payment_terms: PAYMENT_TERMS_DISPLAY,
};

export function rowToClient(row: AnyObj): AnyObj {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => {
      const camel = snakeToCamel(k);
      const mapped = VALUE_MAPS[k];
      const val = mapped && typeof v === "string" ? (mapped[v] ?? v) : v;
      return [camel, val];
    })
  );
}

export function clientToRow(obj: AnyObj): AnyObj {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [camelToSnake(k), v])
  );
}
