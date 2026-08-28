"use client";

import React from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import type { ModulePermission } from "@/types/rbac";
import { summarize } from "@/lib/rbac/permissions";

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-bold ${tone ?? "text-slate-800"}`}>{value}</span>
    </div>
  );
}

export default function PermissionSummaryPanel({ permissions }: { permissions: ModulePermission[] }) {
  const summary = summarize(permissions);

  return (
    <div className="lg:sticky lg:top-4 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldCheck className="h-4 w-4 text-indigo-600" /> Permission Summary
        </h3>
        <p className="mb-3 text-xs text-slate-400">Live preview of the role being configured.</p>

        <Row label="Modules Accessible" value={`${summary.accessibleCount} / ${summary.totalModules}`} />
        <Row label="Full Access" value={summary.fullCount} tone="text-emerald-600" />
        <Row label="Team Access" value={summary.teamCount} tone="text-violet-600" />
        <Row label="Own Access" value={summary.ownCount} tone="text-blue-600" />
        <Row label="No Access" value={summary.noAccessCount} tone="text-slate-400" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldAlert className="h-4 w-4 text-amber-600" /> Sensitive Permissions
        </h3>
        <Row label="Export" value={summary.exportEnabled ? "Enabled" : "Disabled"} tone={summary.exportEnabled ? "text-amber-600" : "text-slate-400"} />
        <Row label="Delete" value={summary.deleteEnabled ? "Enabled" : "Disabled"} tone={summary.deleteEnabled ? "text-red-600" : "text-slate-400"} />
        <Row label="User Management" value={summary.userManagementEnabled ? "Enabled" : "Disabled"} tone={summary.userManagementEnabled ? "text-red-600" : "text-slate-400"} />
      </div>
    </div>
  );
}
