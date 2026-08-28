"use client";

import React from "react";
import { Search } from "lucide-react";

export type PermissionFilter = "ALL" | "ACCESSIBLE" | "NO_ACCESS" | "SENSITIVE";

const FILTERS: { id: PermissionFilter; label: string }[] = [
  { id: "ALL", label: "All Modules" },
  { id: "ACCESSIBLE", label: "Accessible Only" },
  { id: "NO_ACCESS", label: "No Access" },
  { id: "SENSITIVE", label: "Sensitive Permissions" },
];

export default function PermissionToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filter: PermissionFilter;
  onFilterChange: (value: PermissionFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search permissions (e.g. invoice)"
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </div>
      <select
        value={filter}
        onChange={(e) => onFilterChange(e.target.value as PermissionFilter)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      >
        {FILTERS.map((f) => (
          <option key={f.id} value={f.id}>{f.label}</option>
        ))}
      </select>
    </div>
  );
}
