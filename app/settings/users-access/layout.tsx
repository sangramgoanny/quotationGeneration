"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Shield, UsersRound, Building2, History } from "lucide-react";

const TABS = [
  { label: "Users", href: "/settings/users-access/users", icon: Users },
  { label: "Roles & Permissions", href: "/settings/users-access/roles", icon: Shield },
  { label: "Teams", href: "/settings/users-access/teams", icon: UsersRound },
  { label: "Departments", href: "/settings/users-access/departments", icon: Building2 },
  { label: "Activity Logs", href: "/settings/users-access/activity-logs", icon: History },
];

export default function UsersAccessLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users & Access</h1>
        <p className="mt-0.5 text-sm text-slate-500">Manage user accounts, roles, teams, departments, and access history.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                active ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
