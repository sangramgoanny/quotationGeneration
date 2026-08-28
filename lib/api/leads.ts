import { request } from "@/lib/api/request";
import { emptyClient, type Client } from "@/types/client";
import type { ClientFilters, ClientListResponse } from "@/lib/api/clients";

interface RawLeadListResponse {
  success: boolean;
  data: {
    clients: Array<Partial<Client> & {
      accountManager?: { id: string; name?: string; email?: string } | string | null;
      _count?: { quotations?: number; invoices?: number };
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
  if (filters.industry) params.set("industry", toEnum(filters.industry));
  if (filters.stage) params.set("stage", toEnum(filters.stage));
  if (filters.accountManagerId) params.set("accountManagerId", filters.accountManagerId);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  params.set("status", "LEAD");
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
    accountManager: typeof manager === "object" && manager ? manager.id : String(manager ?? ""),
    accountManagerName: typeof manager === "object" && manager ? manager.name || manager.email : undefined,
    quotationCount: row._count?.quotations ?? 0,
    invoiceCount: row._count?.invoices ?? 0,
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
