"use client";

import React from "react";
import { Clock } from "lucide-react";
import type { AuditLogEntry } from "@/types/rbac";
import EmptyState from "@/components/ui/EmptyState";

const ACTION_LABELS: Record<string, string> = {
  "role.create": "created role",
  "role.update": "updated role",
  "role.delete": "deleted role",
  "role.duplicate": "duplicated role",
  "team.create": "created team",
  "team.update": "updated team",
  "team.delete": "deleted team",
  "department.create": "created department",
  "department.delete": "deleted department",
  "user_access.role_change": "changed role for",
  "user_access.update": "updated access details for",
  "user_access.override_set": "set a permission override for",
  "user_access.override_cleared": "cleared the permission override for",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function AuditLogFeed({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) return <EmptyState message="No activity recorded yet" />;

  return (
    <div className="space-y-0">
      {entries.map((entry, i) => (
        <div key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
              {entry.actorName.charAt(0).toUpperCase()}
            </div>
            {i < entries.length - 1 && <div className="my-1 w-px flex-1 bg-slate-200" />}
          </div>
          <div className="flex-1 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">{entry.actorName}</span>
              <span className="text-xs text-slate-500">{ACTION_LABELS[entry.action] ?? entry.action}</span>
              <span className="text-xs font-semibold text-slate-700">{entry.entityName}</span>
              <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3 w-3" />
                {new Date(entry.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {entry.changes.length > 0 && (
              <div className="mt-1.5 space-y-0.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {entry.changes.map((c, idx) => (
                  <p key={idx}>
                    <span className="font-medium text-slate-500">{c.field}:</span> {formatValue(c.from)} → <span className="font-semibold text-slate-800">{formatValue(c.to)}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
