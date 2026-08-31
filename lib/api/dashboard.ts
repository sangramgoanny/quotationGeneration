import { request } from "@/lib/api/request";
import type { DashboardSummary } from "@/types/dashboard";
interface DashboardEnvelope { success?: boolean; data: DashboardSummary }
export const dashboardApi = {
  async summary(from: string, to: string): Promise<DashboardSummary> {
    const query = new URLSearchParams({ from, to });
    const response = await request<DashboardEnvelope | DashboardSummary>(`/api/dashboard/summary?${query}`);
    return "data" in response ? response.data : response;
  },
};
