"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MoreVertical, Eye, Edit, Copy, Users, Power, Trash2 } from "lucide-react";
import type { RoleWithUserCount } from "@/types/rbac";
import { summarize } from "@/lib/rbac/permissions";

function accessLevelLabel(role: RoleWithUserCount): string {
  const s = summarize(role.permissions);
  if (s.accessibleCount === 0) return "No Access";
  const hasAnyAction = role.permissions.some((p) => p.create || p.edit || p.delete || p.assign || p.approve);
  if (!hasAnyAction) return "Read Only";
  if (s.fullCount >= s.totalModules * 0.8) return "Full Access";
  if (s.fullCount > 0 || s.teamCount >= s.ownCount) return "Team Access";
  if (s.ownCount > 0) return "Own Records";
  return "Limited Access";
}

const ACCESS_BADGE: Record<string, string> = {
  "No Access": "bg-slate-100 text-slate-500",
  "Read Only": "bg-slate-100 text-slate-600",
  "Full Access": "bg-emerald-50 text-emerald-700",
  "Team Access": "bg-violet-50 text-violet-700",
  "Own Records": "bg-blue-50 text-blue-700",
  "Limited Access": "bg-amber-50 text-amber-700",
};

interface Props {
  roles: RoleWithUserCount[];
  onDuplicate: (role: RoleWithUserCount) => void;
  onViewUsers: (role: RoleWithUserCount) => void;
  onToggleStatus: (role: RoleWithUserCount) => void;
  onDelete: (role: RoleWithUserCount) => void;
}

function RowMenu({ role, onDuplicate, onViewUsers, onToggleStatus, onDelete }: Omit<Props, "roles"> & { role: RoleWithUserCount }) {
  const [open, setOpen] = useState(false);
  const canDelete = role.type === "CUSTOM" && role.userCount === 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            <Link href={`/settings/users-access/roles/${role.id}`} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <Eye className="h-4 w-4 text-slate-400" /> View
            </Link>
            <Link href={`/settings/users-access/roles/${role.id}`} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <Edit className="h-4 w-4 text-slate-400" /> Edit
            </Link>
            <button onClick={() => { setOpen(false); onDuplicate(role); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              <Copy className="h-4 w-4 text-slate-400" /> Duplicate
            </button>
            <button onClick={() => { setOpen(false); onViewUsers(role); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              <Users className="h-4 w-4 text-slate-400" /> View Users
            </button>
            <button onClick={() => { setOpen(false); onToggleStatus(role); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
              <Power className="h-4 w-4 text-slate-400" /> {role.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </button>
            <button
              disabled={!canDelete}
              title={role.type === "SYSTEM" ? "System roles cannot be deleted" : role.userCount > 0 ? "Reassign users before deleting" : undefined}
              onClick={() => { setOpen(false); onDelete(role); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function RolesTable({ roles, onDuplicate, onViewUsers, onToggleStatus, onDelete }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-[11px] uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3 text-left font-semibold">Role</th>
            <th className="px-4 py-3 text-left font-semibold">Description</th>
            <th className="px-4 py-3 text-center font-semibold">Users</th>
            <th className="px-4 py-3 text-center font-semibold">Access</th>
            <th className="px-4 py-3 text-center font-semibold">Status</th>
            <th className="px-4 py-3 text-left font-semibold">Last Updated</th>
            <th className="px-4 py-3 text-center font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {roles.map((role) => {
            const access = accessLevelLabel(role);
            return (
              <tr key={role.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/settings/users-access/roles/${role.id}`} className="font-semibold text-slate-900 hover:text-indigo-600">
                    {role.name}
                  </Link>
                  {role.type === "SYSTEM" && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">SYSTEM</span>}
                </td>
                <td className="max-w-[280px] truncate px-4 py-3 text-slate-500">{role.description || "—"}</td>
                <td className="px-4 py-3 text-center font-semibold text-slate-700">{role.userCount}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ACCESS_BADGE[access]}`}>{access}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${role.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {role.status === "ACTIVE" ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(role.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-3 text-center">
                  <RowMenu role={role} onDuplicate={onDuplicate} onViewUsers={onViewUsers} onToggleStatus={onToggleStatus} onDelete={onDelete} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
