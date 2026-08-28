"use client";

import React from "react";
import type { PermissionPreset } from "@/types/rbac";
import { PRESET_LABELS, PRESET_ORDER } from "@/lib/rbac/permissions";

const PRESET_STYLE: Record<PermissionPreset, string> = {
  FULL_ACCESS: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
  MANAGER_ACCESS: "border-violet-200 text-violet-700 hover:bg-violet-50",
  STANDARD_USER: "border-blue-200 text-blue-700 hover:bg-blue-50",
  READ_ONLY: "border-slate-200 text-slate-600 hover:bg-slate-50",
  NO_ACCESS: "border-red-200 text-red-600 hover:bg-red-50",
};

export default function PermissionPresetBar({ onApply, disabled }: { onApply: (preset: PermissionPreset) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-slate-500">Apply preset to all modules:</span>
      {PRESET_ORDER.map((preset) => (
        <button
          key={preset}
          type="button"
          disabled={disabled}
          onClick={() => onApply(preset)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${PRESET_STYLE[preset]}`}
        >
          {PRESET_LABELS[preset]}
        </button>
      ))}
    </div>
  );
}
