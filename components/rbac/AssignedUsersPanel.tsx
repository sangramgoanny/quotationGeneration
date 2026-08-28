"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { usersApi, type User } from "@/lib/api/users";
import { userAccessApi } from "@/lib/rbac/store";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function AssignedUsersPanel({ roleId, roleName }: { roleId: string; roleName: string }) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [users, access] = await Promise.all([usersApi.list(), userAccessApi.listByRole(roleId)]);
      setAllUsers(users);
      setAssignedIds(access.map((a) => a.userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assigned users");
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => { void load(); }, [load]);

  const assignedUsers = allUsers.filter((u) => assignedIds.includes(u.id));
  const unassignedUsers = allUsers.filter((u) => !assignedIds.includes(u.id));

  const openAssign = () => {
    setSelected([]);
    setShowAssign(true);
  };

  const toggleSelected = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((v) => v !== id) : [...current, id]));
  };

  const confirmAssign = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const targets = allUsers.filter((u) => selected.includes(u.id)).map((u) => ({ id: u.id, name: u.name || u.email }));
      await userAccessApi.assignUsers(roleId, targets);
      setShowAssign(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign users");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Assigned Users</h3>
          <p className="text-xs text-slate-400">{assignedUsers.length} user{assignedUsers.length !== 1 ? "s" : ""} using {roleName}</p>
        </div>
        <button
          type="button"
          onClick={openAssign}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-3.5 w-3.5" /> Assign Users
        </button>
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</div>}

      {assignedUsers.length === 0 ? (
        <EmptyState message="No users assigned to this role yet" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignedUsers.map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2 font-medium text-slate-800">{u.name || "—"}</td>
                  <td className="px-3 py-2 text-slate-500">{u.email}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAssign && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setShowAssign(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900">Assign Users to {roleName}</h3>
              <button onClick={() => setShowAssign(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto px-5 py-3">
              {unassignedUsers.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">Every user is already assigned to this role.</p>
              ) : (
                unassignedUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-2.5 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selected.includes(u.id)}
                      onChange={() => toggleSelected(u.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                    />
                    <span className="flex-1">
                      {u.name || "—"} <span className="text-slate-400">({u.email})</span>
                    </span>
                  </label>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button onClick={() => setShowAssign(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                disabled={saving || selected.length === 0}
                onClick={() => void confirmAssign()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Assigning…" : `Assign ${selected.length || ""}`.trim()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
