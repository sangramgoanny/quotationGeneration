"use client";

import React from "react";
import type { Department } from "@/types/rbac";
import type { RoleType, RoleStatus } from "@/types/rbac";

export interface RoleFormValue {
  name: string;
  code: string;
  description: string;
  department: string;
  type: RoleType;
  status: RoleStatus;
}

const field = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

export default function RoleForm({
  value,
  onChange,
  departments,
  readOnly,
  isSystemRole,
}: {
  value: RoleFormValue;
  onChange: (patch: Partial<RoleFormValue>) => void;
  departments: Department[];
  readOnly?: boolean;
  isSystemRole?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Role Information</h3>
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-slate-700">
          Role Name
          <input
            value={value.name}
            disabled={readOnly}
            onChange={(e) => onChange({ name: e.target.value })}
            className={`${field} disabled:bg-slate-50 disabled:text-slate-400`}
            placeholder="e.g. Sales Executive"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Role Code
          <input
            value={value.code}
            disabled={readOnly}
            onChange={(e) => onChange({ code: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
            className={`${field} font-mono disabled:bg-slate-50 disabled:text-slate-400`}
            placeholder="e.g. SALES_EXECUTIVE"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Description
          <textarea
            value={value.description}
            disabled={readOnly}
            onChange={(e) => onChange({ description: e.target.value })}
            className={`${field} min-h-20 disabled:bg-slate-50 disabled:text-slate-400`}
            placeholder="Handles assigned leads, follow-ups, activities, and sales opportunities."
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Department
          <select
            value={value.department}
            disabled={readOnly}
            onChange={(e) => onChange({ department: e.target.value })}
            className={`${field} bg-white disabled:bg-slate-50 disabled:text-slate-400`}
          >
            <option value="">— None —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </label>

        <div>
          <p className="text-sm font-semibold text-slate-700">Role Type</p>
          <div className="mt-1 flex gap-2">
            {(["SYSTEM", "CUSTOM"] as RoleType[]).map((type) => (
              <span
                key={type}
                className={`flex-1 rounded-lg border px-3 py-2 text-center text-xs font-semibold ${
                  value.type === type ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-400"
                }`}
              >
                {type === "SYSTEM" ? "System Role" : "Custom Role"}
              </span>
            ))}
          </div>
          {isSystemRole && <p className="mt-1.5 text-[11px] text-slate-400">System roles can be edited but not deleted.</p>}
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Status
          <select
            value={value.status}
            disabled={readOnly}
            onChange={(e) => onChange({ status: e.target.value as RoleStatus })}
            className={`${field} bg-white disabled:bg-slate-50 disabled:text-slate-400`}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
      </div>
    </div>
  );
}
