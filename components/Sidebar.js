"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { clearToken } from "@/utils/token";
import {
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  FolderOpen,
  Settings,
  ChevronDown,
  Target,
  UserCircle,
  Briefcase,
  Receipt,
  CreditCard,
  CheckSquare,
  Shield,
  LogOut,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  Activity,
  Clock3,
} from "lucide-react";

const SECTIONS = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, tone: "blue" },
      { label: "AI Center", href: "/ai-center", icon: Sparkles, tone: "violet", badge: "AI" },
      { label: "Reports", href: "/reports", icon: BarChart3, tone: "cyan" },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "CRM",
        icon: Users,
        tone: "cyan",
        children: [
          { label: "Pipeline", href: "/crm/pipeline", icon: Activity, tone: "cyan" },
          { label: "Leads", href: "/crm/leads", icon: Target, tone: "blue", badge: "12" },
          { label: "Leads 2", href: "/crm/leads-2", icon: Target, tone: "red", badge: "New" },
          { label: "Clients", href: "/crm/clients", icon: UserCircle, tone: "cyan" },
          { label: "Activities", href: "/crm/activities", icon: Activity, tone: "violet" },
          { label: "Follow Ups", href: "/crm/follow-ups", icon: Clock3, tone: "amber", badge: "5" },
        ],
      },
      {
        label: "Sales",
        icon: FileText,
        tone: "violet",
        children: [
          { label: "Quotations", href: "/quotation", icon: FileText, tone: "blue", badge: "3" },
          { label: "Proposals", href: "/sales/proposals", icon: Briefcase, tone: "violet" },
          { label: "Deals", href: "/sales/deals", icon: Target, tone: "emerald" },
          { label: "Agreements", href: "/contract", icon: Briefcase, tone: "violet" },
        ],
      },
      {
        label: "Projects",
        icon: FolderOpen,
        tone: "amber",
        children: [
          { label: "Projects", href: "/projects", icon: FolderOpen, tone: "amber" },
          { label: "Tasks", href: "/projects/tasks", icon: CheckSquare, tone: "blue", badge: "8" },
        ],
      },
      {
        label: "Finance",
        icon: DollarSign,
        tone: "emerald",
        children: [
          { label: "Invoices", href: "/invoice", icon: Receipt, tone: "blue" },
          { label: "Receipts", href: "/receipt", icon: CreditCard, tone: "cyan" },
          { label: "Expenses", href: "/finance/expenses", icon: DollarSign, tone: "emerald" },
        ],
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        label: "Users",
        icon: UserCircle,
        tone: "red",
        children: [
          { label: "Users", href: "/users", icon: Users, tone: "blue" },
          { label: "Roles", href: "/users/roles", icon: Shield, tone: "red" },
        ],
      },
      { label: "Settings", href: "/settings", icon: Settings, tone: "slate" },
    ],
  },
];

const TONES = {
  blue: "from-[#0070B8] to-[#0EA5E9]",
  cyan: "from-[#0284C7] to-[#38BDF8]",
  red: "from-[#E60046] to-[#FB7185]",
  violet: "from-[#2563EB] to-[#7C3AED]",
  emerald: "from-[#059669] to-[#22C55E]",
  amber: "from-[#D97706] to-[#F59E0B]",
  slate: "from-slate-500 to-slate-700",
};

const iconChip = (tone = "blue", active = false) =>
  active
    ? `bg-gradient-to-br ${TONES[tone]} text-white shadow-lg shadow-[#0070B8]/20`
    : "bg-white/7 text-slate-300 ring-1 ring-white/10 group-hover:bg-white/12 group-hover:text-white group-hover:ring-white/20";

const badgeClass = (active = false) =>
  active
    ? "bg-white/20 text-white ring-1 ring-white/25"
    : "bg-[#E60046]/15 text-rose-200 ring-1 ring-[#E60046]/20 group-hover:bg-[#E60046] group-hover:text-white";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState([]);
  const [collapsed, setCollapsed] = useState(false);

  const getAutoOpen = (path) =>
    SECTIONS.flatMap((section) => section.items)
      .filter((m) => m.children?.some((c) => path.startsWith(c.href)))
      .map((m) => m.label);

  const openItems = [...new Set([...open, ...getAutoOpen(pathname)])];

  const toggle = (label) =>
    setOpen((prev) => prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]);

  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  function renderLeaf(item, compact = false) {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={`group relative flex items-center overflow-hidden rounded-2xl text-[13px] font-semibold transition-all duration-300 ${
          compact || collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
        } ${
          active
            ? "bg-white text-[#063A66] shadow-[0_18px_45px_rgba(0,112,184,0.22)]"
            : "text-slate-300 hover:bg-white/9 hover:text-white"
        }`}
      >
        {active ? <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#E60046]" /> : null}
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition duration-300 group-hover:scale-110 group-hover:rotate-3 ${iconChip(item.tone, active)}`}>
          <Icon className="h-4 w-4 shrink-0" />
        </span>
        {!collapsed && !compact ? (
          <>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.badge ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${badgeClass(active)}`}>{item.badge}</span> : null}
          </>
        ) : item.badge ? (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#E60046] ring-2 ring-[#061526]" />
        ) : null}
      </Link>
    );
  }

  return (
    <aside className={`relative hidden bg-[#061526] text-white transition-[width] duration-300 lg:flex lg:flex-col h-screen sticky top-0 shrink-0 select-none ${collapsed ? "w-20" : "w-72"}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.24),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(230,0,70,0.18),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_44%)]" />
      <div className="pointer-events-none absolute left-5 right-5 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="group absolute -right-6 top-8 z-30 flex h-11 w-6 items-center justify-center rounded-r-full bg-gradient-to-b from-[#0070B8] via-[#0EA5E9] to-[#E60046] p-[1px] shadow-[10px_12px_28px_rgba(0,112,184,0.26)] transition-all duration-300 hover:w-7"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className="flex h-full w-full items-center justify-center rounded-r-full bg-white text-[#0070B8] transition-colors duration-300 group-hover:bg-[#061526] group-hover:text-white">
          {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </span>
      </button>

      <div className={`relative shrink-0 ${collapsed ? "p-3" : "p-4"}`}>
        <div className={`rounded-2xl border border-white/12 bg-white shadow-[0_22px_50px_rgba(0,112,184,0.18)] ${collapsed ? "p-2" : "px-3 py-3"}`}>
          <Image
            src="/GoannyLogo.png"
            alt="Goanny Logo"
            width={180}
            height={38}
            className={`${collapsed ? "h-8 w-8 object-left object-cover" : "mx-auto h-9 w-auto object-contain"}`}
            priority
          />
        </div>

        {!collapsed ? (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/7 px-3 py-2 backdrop-blur">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">Live CRM</p>
              <p className="text-xs font-medium text-slate-400">Smart ERP + CRM</p>
            </div>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E60046] opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#E60046]" />
            </span>
          </div>
        ) : null}
      </div>

      <nav className={`relative flex-1 overflow-y-auto pb-3 scrollbar-thin ${collapsed ? "px-2 space-y-2" : "px-3 space-y-5"}`}>
        {SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed ? (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{section.label}</p>
            ) : null}

            <div className="space-y-1.5">
              {section.items.map((item) => {
                if (!item.children) return renderLeaf(item);

                const isOpen = openItems.includes(item.label) && !collapsed;
                const hasActiveChild = item.children.some((c) => isActive(c.href));
                const Icon = item.icon;

                if (collapsed) {
                  return (
                    <div key={item.label} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setCollapsed(false)}
                        title={item.label}
                        className={`group relative flex w-full items-center justify-center rounded-2xl px-2 py-2.5 transition-all duration-300 ${
                          hasActiveChild ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/9 hover:text-white"
                        }`}
                      >
                        {hasActiveChild ? <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#E60046]" /> : null}
                        <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition duration-300 group-hover:scale-110 group-hover:-rotate-3 ${iconChip(item.tone, hasActiveChild)}`}>
                          <Icon className="h-4 w-4 shrink-0" />
                        </span>
                        {item.children.some((child) => child.badge) ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#E60046] ring-2 ring-[#061526]" /> : null}
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={() => toggle(item.label)}
                      className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-300 ${
                        hasActiveChild
                          ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]"
                          : "text-slate-300 hover:bg-white/9 hover:text-white"
                      }`}
                    >
                      <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition duration-300 group-hover:scale-110 group-hover:-rotate-3 ${iconChip(item.tone, hasActiveChild)}`}>
                        <Icon className="h-4 w-4 shrink-0" />
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isOpen ? (
                      <div className="ml-4 mt-1.5 space-y-1 border-l border-white/10 pl-4">
                        {item.children.map((child) => {
                          const active = isActive(child.href);
                          const ChildIcon = child.icon;

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] font-medium transition-all duration-300 ${
                                active
                                  ? "bg-gradient-to-r from-[#0070B8] to-[#0EA5E9] text-white shadow-lg shadow-sky-950/40"
                                  : "text-slate-400 hover:bg-white/8 hover:text-white"
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${active ? "bg-[#E60046] shadow-[0_0_0_4px_rgba(230,0,70,0.16)]" : "bg-slate-600 group-hover:bg-sky-300"}`} />
                              <ChildIcon className="h-3.5 w-3.5 shrink-0 transition duration-300 group-hover:scale-110" />
                              <span className="min-w-0 flex-1 truncate">{child.label}</span>
                              {child.badge ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${badgeClass(active)}`}>{child.badge}</span> : null}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`relative shrink-0 border-t border-white/10 ${collapsed ? "p-2" : "p-3"}`}>
        <Link
          href="/crm/leads-2"
          title="Ask AI"
          className={`group mb-3 flex items-center rounded-2xl bg-gradient-to-r from-[#0070B8] to-[#E60046] font-bold text-white shadow-[0_18px_45px_rgba(0,112,184,0.26)] transition-all duration-300 hover:-translate-y-0.5 ${collapsed ? "justify-center p-3" : "gap-3 px-3 py-3"}`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/18 transition group-hover:scale-110 group-hover:rotate-3">
            <Sparkles className="h-4 w-4" />
          </span>
          {!collapsed ? (
            <span className="min-w-0 flex-1">
              <span className="block text-sm leading-4">Ask Goanny AI</span>
              <span className="block text-[11px] font-medium text-white/75">Lead insights & actions</span>
            </span>
          ) : null}
        </Link>

        <button
          onClick={handleLogout}
          title="Sign out"
          className={`group flex w-full items-center rounded-2xl border border-white/10 bg-white/6 text-[13px] font-semibold text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-[#063A66] hover:shadow-[0_18px_45px_rgba(0,112,184,0.20)] ${collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"}`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/8 text-slate-300 transition duration-300 group-hover:scale-110 group-hover:bg-[#E60046] group-hover:text-white">
            <LogOut className="h-4 w-4 shrink-0" />
          </span>
          {!collapsed ? "Sign out" : null}
        </button>
      </div>
    </aside>
  );
}
