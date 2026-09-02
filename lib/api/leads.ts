import { authHeader } from "@/utils/token";
import { request } from "@/lib/api/request";
import { emptyClient, type Client, type ClientDocument } from "@/types/client";
import type { ClientFilters, ClientListResponse } from "@/lib/api/clients";

interface RawLeadActivity {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  userName?: string;
}

interface RawLeadListResponse {
  success: boolean;
  data: {
    clients: Array<Omit<Partial<Client>, "activities" | "accountManager"> & {
      accountManager?: { id: string; name?: string; email?: string } | string | null;
      _count?: { quotations?: number; invoices?: number };
      activities?: RawLeadActivity[];
    }>;
    pagination: { total: number; page: number; limit: number; pages: number };
  };
}

function toEnum(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

function queryString(filters: ClientFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.leadStage || filters.stage) params.set("leadStage", toEnum(filters.leadStage ?? filters.stage ?? ""));
  if (filters.leadSource) params.set("leadSource", toEnum(filters.leadSource));
  if (filters.accountManagerId) params.set("accountManagerId", filters.accountManagerId);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  return `?${params.toString()}`;
}

function mapLead(row: RawLeadListResponse["data"]["clients"][number]): Client {
  const manager = row.accountManager;
  return {
    ...emptyClient(),
    ...row,
    id: row.id,
    status: "Lead",
    priority: row.priority ? String(row.priority).toLowerCase().replace(/^./, (value) => value.toUpperCase()) as Client["priority"] : "Medium",
    score: row.score == null ? null : Number(row.score),
    nextAction: row.nextAction == null ? null : String(row.nextAction),
    lostReason: row.lostReason == null ? null : String(row.lostReason),
    accountManager: typeof manager === "object" && manager ? manager.id : String(manager ?? ""),
    accountManagerName: typeof manager === "object" && manager ? manager.name || manager.email : undefined,
    quotationCount: row._count?.quotations ?? 0,
    invoiceCount: row._count?.invoices ?? 0,
    activities: row.activities?.map((item) => ({
      id: item.id,
      user: item.userName || "System",
      action: item.action,
      description: item.description,
      createdAt: item.createdAt,
    })),
  };
}

export const leadsApi = {
  async list(filters: ClientFilters = {}): Promise<ClientListResponse> {
    const raw = await request<RawLeadListResponse>(`/api/leads${queryString(filters)}`);
    return {
      data: raw.data.clients.map(mapLead),
      ...raw.data.pagination,
    };
  },

  async get(id: string): Promise<Client> {
    const raw = await request<{ success: boolean; data: RawLeadListResponse["data"]["clients"][number] }>(`/api/leads/${id}`);
    return mapLead(raw.data);
  },

  async convert(id: string): Promise<Client> {
    const raw = await request<{ success: boolean; data: Client }>(`/api/leads/${id}/convert`, { method: "POST" });
    return raw.data;
  },

  async updateStage(id: string, leadStage: string): Promise<Client> {
    const raw = await request<{ success: boolean; data: Client }>(`/api/leads/${id}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ leadStage: toEnum(leadStage) }),
    });
    return raw.data;
  },

  async updateQualification(
    id: string,
    data: { priority?: "LOW" | "MEDIUM" | "HIGH"; score?: number; nextAction?: string | null; lostReason?: string | null },
  ): Promise<Client> {
    const raw = await request<{ success: boolean; data: Client }>(`/api/leads/${id}/qualification`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return raw.data;
  },

  async sendEmail(id: string, payload: { to: string; cc?: string[]; subject: string; message: string }): Promise<{ sent: boolean; to: string }> {
    const raw = await request<{ success: boolean; data: { sent: boolean; to: string } }>(`/api/leads/${id}/email`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return raw.data;
  },

  // ── Documents ─────────────────────────────────────────────────────────────

  // Documents are handled by the Next.js route handlers (S3 upload lives there,
  // not in the NestJS backend), so these must always be same-origin regardless
  // of NEXT_PUBLIC_API_URL.
  async getDocuments(id: string): Promise<ClientDocument[]> {
    const r = await request<{ success: boolean; data: ClientDocument[] }>(
      `/api/leads/${id}/documents`, {}, { base: "" },
    );
    return r.data;
  },

  async uploadDocuments(id: string, files: File[], documentType = "Other"): Promise<ClientDocument[]> {
    const fd = new FormData();
    files.forEach((file) => fd.append("files", file));
    fd.append("documentType", documentType);
    const res = await fetch(`/api/leads/${id}/documents`, {
      method: "POST",
      headers: authHeader(),
      body: fd,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || `Upload failed: ${res.status}`);
    }
    const r = await res.json();
    return r.data as ClientDocument[];
  },

  deleteDocument(id: string, docId: string): Promise<void> {
    return request<void>(`/api/leads/${id}/documents/${docId}`, { method: "DELETE" }, { base: "" });
  },

  async pipelineSummary(): Promise<{
    totalLeads: number;
    totalPipelineValue: number;
    followUpsDue: number;
    quotationSent: number;
    won: number;
    conversionRate: number;
    stages: Array<{ stage: string; count: number; value: number }>;
  }> {
    const raw = await request<{ success: boolean; data: {
      totalLeads: number;
      totalPipelineValue: number;
      followUpsDue: number;
      quotationSent: number;
      won: number;
      conversionRate: number;
      stages: Array<{ stage: string; count: number; value: number }>;
    } }>("/api/leads/pipeline-summary");
    return raw.data;
  },
};
