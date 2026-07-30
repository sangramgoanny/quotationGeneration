"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { ReactNode, useSyncExternalStore } from "react";
import { getToken, getUser } from "@/utils/token";
import { Bell } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":        "Dashboard",
  "/crm/leads":        "Leads",
  "/crm/clients":      "Clients",
  "/quotation":        "Quotations",
  "/contract":         "Agreements",
  "/invoice":          "Invoices",
  "/invoice/new":      "Create Invoice",
  "/receipt":          "Receipts",
  "/finance/expenses": "Expenses",
  "/projects":         "Projects",
  "/projects/tasks":   "Tasks",
  "/users":            "Users",
  "/users/roles":      "Roles",
  "/settings":         "Settings",
};

const NO_SIDEBAR_PREFIXES = ["/login", "/admin", "/crm/leads-2"];

function subscribeToTokenChanges(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export default function ConditionalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showSidebar = !NO_SIDEBAR_PREFIXES.some((p) => pathname.startsWith(p));
  const token = useSyncExternalStore(subscribeToTokenChanges, getToken, () => null);

  if (!showSidebar) return <>{children}</>;

  const user     = token ? getUser() : null;
  const title    = PAGE_TITLES[pathname] ?? "Goanny ERP";
  const isClientsCommandCenter = pathname === "/crm/clients";
  const initials = user?.email?.[0]?.toUpperCase() ?? "U";
  const username = user?.email?.split("@")[0] ?? "User";

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className={`${isClientsCommandCenter ? "h-16" : "h-14"} bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm`}>
          {isClientsCommandCenter ? (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#0070B8]">
                CRM / Clients Management
              </p>
              <h1 className="mt-0.5 text-[17px] font-black tracking-tight text-slate-900">
                Clients Command Center
              </h1>
            </div>
          ) : (
            <h1 className="text-[15px] font-semibold text-slate-800">{title}</h1>
          )}
          <div className="flex items-center gap-3">
            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
              <Bell className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 pl-1">
              <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white text-[11px] font-bold">{initials}</span>
              </div>
              <span className="text-[13px] text-slate-600 font-medium hidden sm:block">{username}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
