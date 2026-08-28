"use client";

import React, { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import type { AccessScope, ModulePermission, PermissionAction, PermissionModuleDef } from "@/types/rbac";
import { applyDependencyRules } from "@/lib/rbac/permissions";

export const SCOPE_LABELS: Record<AccessScope, string> = {
  NONE: "No Access",
  OWN: "Own Records",
  TEAM: "Team Records",
  ALL: "All Records",
};

export const SCOPE_BADGE: Record<AccessScope, string> = {
  NONE: "bg-slate-100 text-slate-500",
  OWN: "bg-blue-50 text-blue-700",
  TEAM: "bg-violet-50 text-violet-700",
  ALL: "bg-emerald-50 text-emerald-700",
};

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  assign: "Assign",
  reassign: "Reassign",
  export: "Export",
  approve: "Approve",
  upload: "Upload",
  download: "Download",
};

interface Props {
  moduleDef: PermissionModuleDef;
  value: ModulePermission;
  onChange: (next: ModulePermission) => void;
  readOnly?: boolean;
  defaultOpen?: boolean;
}

export default function PermissionModule({ moduleDef, value, onChange, readOnly, defaultOpen }: Props) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const [hint, setHint] = useState<string | null>(null);

  const applyChange = (next: ModulePermission, changed: keyof ModulePermission, note?: string) => {
    const resolved = applyDependencyRules(next, changed);
    if (note && (resolved.scope !== value.scope || JSON.stringify(resolved) !== JSON.stringify(next))) {
      setHint(note);
      window.setTimeout(() => setHint(null), 4000);
    }
    onChange(resolved);
  };

  const setScope = (scope: AccessScope) => {
    if (readOnly) return;
    applyChange({ ...value, scope }, "scope");
  };

  const toggleAction = (action: PermissionAction) => {
    if (readOnly || action === "view") return;
    const key = action as Exclude<PermissionAction, "view">;
    const nextVal = !value[key];
    const note =
      (action === "assign" || action === "reassign") && nextVal && (value.scope === "NONE" || value.scope === "OWN")
        ? `${ACTION_LABELS[action]} requires at least Team visibility — scope was raised automatically.`
        : undefined;
    applyChange({ ...value, [key]: nextVal }, key, note);
  };

  const availableActions = moduleDef.actions.filter((a) => a !== "view");
  const accessible = value.scope !== "NONE";
  const actionsDisabled = readOnly || !accessible;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-slate-800">{moduleDef.label}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${SCOPE_BADGE[value.scope]}`}>
            {moduleDef.scoped ? SCOPE_LABELS[value.scope] : accessible ? "Enabled" : "No Access"}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          {hint && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {hint}
            </div>
          )}

          {moduleDef.scoped ? (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Data Scope</p>
              <div className="flex flex-wrap gap-2">
                {(["NONE", "OWN", "TEAM", "ALL"] as AccessScope[]).map((scope) => (
                  <label
                    key={scope}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      value.scope === scope
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    } ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={value.scope === scope}
                      disabled={readOnly}
                      onChange={() => setScope(scope)}
                    />
                    {SCOPE_LABELS[scope]}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Access</p>
              <label className={`flex w-fit cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${accessible ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"} ${readOnly ? "cursor-not-allowed opacity-60" : ""}`}>
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300"
                  checked={accessible}
                  disabled={readOnly}
                  onChange={(e) => setScope(e.target.checked ? "ALL" : "NONE")}
                />
                Module enabled
              </label>
            </div>
          )}

          {availableActions.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Actions</p>
              <div className="flex flex-wrap gap-3">
                {availableActions.map((action) => (
                  <label
                    key={action}
                    className={`flex items-center gap-1.5 text-xs font-medium ${actionsDisabled ? "text-slate-300" : "text-slate-700"} ${actionsDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400 disabled:opacity-50"
                      checked={Boolean(value[action])}
                      disabled={actionsDisabled}
                      onChange={() => toggleAction(action)}
                    />
                    {ACTION_LABELS[action]}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
