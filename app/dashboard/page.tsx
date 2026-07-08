"use client";

import Link from "next/link";
import { Users, FileText, DollarSign, FolderOpen } from "lucide-react";

const stats = [
  { label: "Total Clients",     value: "—", sub: "Active accounts",   icon: Users,      color: "bg-blue-50   text-blue-600"   },
  { label: "Active Projects",   value: "—", sub: "In progress",        icon: FolderOpen, color: "bg-violet-50 text-violet-600" },
  { label: "Pending Invoices",  value: "—", sub: "Awaiting payment",   icon: FileText,   color: "bg-amber-50  text-amber-600"  },
  { label: "Total Revenue",     value: "—", sub: "This month",         icon: DollarSign, color: "bg-green-50  text-green-600"  },
];

const quickLinks = [
  { label: "New Quotation",   href: "/quotation",        icon: "📄" },
  { label: "New Invoice",     href: "/invoice",          icon: "🧾" },
  { label: "New Receipt",     href: "/receipt",          icon: "🏷️" },
  { label: "New Agreement",   href: "/contract",         icon: "📜" },
  { label: "Add Lead",        href: "/crm/leads",        icon: "🎯" },
  { label: "Add Client",      href: "/crm/clients",      icon: "👤" },
  { label: "New Project",     href: "/projects",         icon: "📁" },
  { label: "View Expenses",   href: "/finance/expenses", icon: "💰" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color} bg-opacity-80`}>
                <s.icon className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-200
                         hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
            >
              <span className="text-base">{q.icon}</span>
              <span className="text-[13px] text-slate-600 font-medium group-hover:text-indigo-700">
                {q.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Placeholder recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {["Recent Quotations", "Recent Invoices"].map((title) => (
          <div key={title} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">{title}</h2>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="space-y-1">
                    <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                    <div className="h-2.5 w-20 bg-slate-100 rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-14 bg-slate-100 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
