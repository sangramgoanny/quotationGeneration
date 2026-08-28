"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ModulePermission, PermissionModuleDef } from "@/types/rbac";
import PermissionModule from "@/components/rbac/PermissionModule";

interface Props {
  group: string;
  modules: PermissionModuleDef[];
  permissions: Record<string, ModulePermission>;
  onChange: (moduleId: string, next: ModulePermission) => void;
  readOnly?: boolean;
  defaultOpen?: boolean;
}

export default function PermissionGroup({ group, modules, permissions, onChange, readOnly, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  if (modules.length === 0) return null;

  const accessibleCount = modules.filter((m) => (permissions[m.id]?.scope ?? "NONE") !== "NONE").length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-1 py-1.5 text-left"
      >
        <span className="flex items-center gap-2">
          <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
          <span className="text-sm font-bold text-slate-800">{group}</span>
          <span className="text-xs text-slate-400">{accessibleCount}/{modules.length} accessible</span>
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {modules.map((mod) => (
            <PermissionModule
              key={mod.id}
              moduleDef={mod}
              value={permissions[mod.id]}
              onChange={(next) => onChange(mod.id, next)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}
