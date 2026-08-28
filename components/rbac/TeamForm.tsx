"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import type { Department } from "@/types/rbac";
import type { User } from "@/lib/api/users";

export interface TeamFormValue {
  name: string;
  department: string;
  managerId: string;
  memberIds: string[];
}

export default function TeamForm({
  mode,
  initial,
  departments,
  users,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial: TeamFormValue;
  departments: Department[];
  users: User[];
  submitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (data: TeamFormValue) => void;
}) {
  const [form, setForm] = useState<TeamFormValue>(initial);
  const field = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  const toggleMember = (id: string) => {
    setForm((f) => ({ ...f, memberIds: f.memberIds.includes(id) ? f.memberIds.filter((v) => v !== id) : [...f.memberIds, id] }));
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">{mode === "create" ? "Create Team" : "Edit Team"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <label className="block text-sm font-semibold text-slate-700">
            Team Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} placeholder="e.g. Sales Team Pune" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Department
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={`${field} bg-white`}>
              <option value="">— None —</option>
              {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Manager
            <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} className={`${field} bg-white`}>
              <option value="">— None —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </select>
          </label>
          <div>
            <p className="text-sm font-semibold text-slate-700">Members</p>
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {users.length === 0 ? (
                <p className="p-2 text-xs text-slate-400">No users available</p>
              ) : (
                users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 py-1 text-sm text-slate-700">
                    <input type="checkbox" checked={form.memberIds.includes(u.id)} onChange={() => toggleMember(u.id)} className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600" />
                    {u.name || u.email}
                  </label>
                ))
              )}
            </div>
          </div>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            disabled={submitting || !form.name.trim()}
            onClick={() => onSubmit(form)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Saving…" : mode === "create" ? "Create Team" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
