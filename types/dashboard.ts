export type DashboardModule = "leads" | "quotations" | "invoices" | "followUps";
export interface DashboardPeriod { from: string; to: string; previousFrom: string; previousTo: string }
export interface DashboardStage { stage: string; count: number; value: string | number }
export interface DashboardQuotation { id: string; quotationNumber: string; clientName: string; totalAmount: string | number; status: string; date: string; expiresAt?: string | null }
export interface DashboardInvoice { id: string; invoiceNumber: string; clientName: string; amount: string | number; paid: string | number; due: string | number; status: string; date: string; dueDate?: string | null }
export interface DashboardFollowUp { id: string; clientId: string; title: string; scheduledAt: string; priority?: "LOW" | "MEDIUM" | "HIGH"; clientName?: string; assignedUserName?: string; isOverdue?: boolean }
export interface DashboardLeadAlert { id: string; companyName: string; priority: string; stage?: string }
export interface DashboardTrendPoint { date: string; revenue: string | number; collected: string | number }
export interface DashboardLeaderboardEntry { userId: string; userName: string; leads: number; won: number; value: string | number; conversionRate: number }
export interface DashboardTopClient { clientId: string; clientName: string; revenue: string | number; invoiceCount: number }
export interface DashboardExpenseCategory { category: string; amount: string | number }
export interface DashboardSummary {
  period: DashboardPeriod;
  pipeline: { totalLeads: number; totalValue: string | number; conversionRate: number; valueChange: number | null; conversionChange: number | null; stages: DashboardStage[]; highPriorityWithoutAction: DashboardLeadAlert[]; leaderboard: DashboardLeaderboardEntry[] };
  quotations: { pendingCount: number; pendingValue: string | number; expiringCount: number; pendingChange: number | null; recent: DashboardQuotation[]; expiring: DashboardQuotation[] };
  invoices: { invoiced: string | number; received: string | number; outstanding: string | number; overdueCount: number; overdueValue: string | number; receivedChange: number | null; outstandingChange: number | null; recent: DashboardInvoice[]; overdue: DashboardInvoice[]; topClients: DashboardTopClient[] };
  followUps: { overdueCount: number; dueTodayCount: number; upcomingCount: number; overdue: DashboardFollowUp[]; dueToday: DashboardFollowUp[]; upcoming: DashboardFollowUp[] };
  finance: { totalExpenses: string | number; expensesByCategory: DashboardExpenseCategory[]; profit: string | number; profitMargin: number; expenseChange: number | null; profitChange: number | null };
  trends: DashboardTrendPoint[];
}
