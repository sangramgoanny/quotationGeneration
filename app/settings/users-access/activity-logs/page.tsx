"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import type { AuditEntityType, AuditLogEntry } from "@/types/rbac";
import { auditApi } from "@/lib/rbac/store";
import AuditLogFeed from "@/components/rbac/AuditLogFeed";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const ENTITY_FILTERS: { id: AuditEntityType | ""; label: string }[] = [
  { id: "", label: "All Activity" },
  { id: "ROLE", label: "Roles" },
  { id: "TEAM", label: "Teams" },
  { id: "DEPARTMENT", label: "Departments" },
  { id: "USER_ACCESS", label: "User Access" },
];

export default function ActivityLogsPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState<AuditEntityType | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries((await auditApi.list({ entityType: entityType || undefined, search: search || undefined })).entries);
    } finally {
      setLoading(false);
    }
  }, [entityType, search]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Activity Logs</h2>
        <p className="mt-0.5 text-sm text-slate-500">Every role, team, department, and user-access change is recorded here.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by role, team, or person..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value as AuditEntityType | "")}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        >
          {ENTITY_FILTERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <button onClick={() => void load()} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {loading ? <LoadingSpinner /> : <AuditLogFeed entries={entries} />}
      </div>
    </div>
  );
}
