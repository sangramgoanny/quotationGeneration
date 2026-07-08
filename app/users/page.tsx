"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Search, Filter, ChevronDown, Edit, Trash2, RefreshCw,
  Users as UsersIcon, UserCheck, UserX, ShieldCheck, AlertCircle, X, Eye, EyeOff,
} from "lucide-react";
import { usersApi, type User, type UserRole } from "@/lib/api/users";

// ─── Badges ────────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN:   "bg-purple-100 text-purple-700",
  MANAGER: "bg-indigo-100 text-indigo-700",
  STAFF:   "bg-slate-100 text-slate-600",
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_COLORS[role] ?? "bg-slate-100 text-slate-600"}`}>
      {role}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
      isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
    }`}>
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-slate-200 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

// ─── Inline action buttons ────────────────────────────────────────────────────

function ActionButtons({
  user,
  onEdit,
  onDelete,
}: {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
}) {
  const btn = "p-1.5 rounded-lg transition-colors disabled:opacity-40";

  return (
    <div className="flex items-center justify-center gap-0.5">
      <button title="Edit User" onClick={() => onEdit(user)} className={`${btn} text-slate-600 hover:bg-slate-100`}>
        <Edit className="w-4 h-4" />
      </button>
      <button title="Delete User" onClick={() => onDelete(user.id)} className={`${btn} text-red-500 hover:bg-red-50`}>
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ─── User form modal (create + edit) ──────────────────────────────────────────

interface UserFormState {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
}

function UserFormModal({
  mode,
  initial,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial: UserFormState;
  submitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (data: UserFormState) => void;
}) {
  const [form, setForm] = useState<UserFormState>(initial);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!form.name.trim()) return setLocalError("Name is required");
    if (!form.email.trim()) return setLocalError("Email is required");
    if (mode === "create" && form.password.length < 8) return setLocalError("Password must be at least 8 characters");
    if (mode === "edit" && form.password && form.password.length < 8) return setLocalError("Password must be at least 8 characters");

    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{mode === "create" ? "Add User" : "Edit User"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="jane@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Password {mode === "edit" && <span className="text-slate-400 font-normal">(leave blank to keep unchanged)</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder={mode === "create" ? "Min. 8 characters" : "••••••••"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white"
            >
              <option value="STAFF">STAFF</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          {mode === "edit" && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
              />
              Active
            </label>
          )}

          {(localError || error) && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
              {localError || error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {submitting ? "Saving…" : mode === "create" ? "Create User" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.list({
        role:   roleFilter || undefined,
        search: search      || undefined,
      });
      setUsers(data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search]);

  useEffect(() => { fetchUsers(); }, [roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayedUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  const total    = users.length;
  const active   = users.filter((u) => u.isActive).length;
  const inactive = users.filter((u) => !u.isActive).length;
  const admins   = users.filter((u) => u.role === "ADMIN").length;

  const handleCreate = async (form: UserFormState) => {
    setSubmitting(true);
    setFormError("");
    try {
      const created = await usersApi.create({
        name: form.name, email: form.email, password: form.password, role: form.role,
      });
      setUsers((prev) => [created, ...prev]);
      setShowCreateModal(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (form: UserFormState) => {
    if (!editingUser) return;
    setSubmitting(true);
    setFormError("");
    try {
      const updated = await usersApi.update(editingUser.id, {
        name: form.name,
        email: form.email,
        role: form.role,
        isActive: form.isActive,
        ...(form.password ? { password: form.password } : {}),
      } as Parameters<typeof usersApi.update>[1]);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    setDeleting(id);
    try {
      await usersApi.delete(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage user accounts and permissions</p>
        </div>
        <button
          onClick={() => { setFormError(""); setShowCreateModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Users" value={total}    icon={UsersIcon}   color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Active"      value={active}   icon={UserCheck}   color="bg-green-50 text-green-600" />
        <StatCard label="Inactive"    value={inactive}  icon={UserX}       color="bg-slate-100 text-slate-600" />
        <StatCard label="Admins"      value={admins}    icon={ShieldCheck} color="bg-purple-50 text-purple-600" />
      </div>

      {/* ── Filters ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="relative">
          <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
            className="pl-8 pr-8 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white appearance-none"
          >
            <option value="">All Roles</option>
            {(["ADMIN", "MANAGER", "STAFF"] as UserRole[]).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <button
          onClick={fetchUsers}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 text-red-500 gap-2">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={fetchUsers} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Email</th>
                  <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">Role</th>
                  <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Created</th>
                  <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : displayedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <UsersIcon className="w-8 h-8 opacity-50" />
                        <p className="text-sm font-medium">No users found</p>
                        <p className="text-xs">Try adjusting your filters or add a new user</p>
                        <button
                          onClick={() => { setFormError(""); setShowCreateModal(true); }}
                          className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" /> Add First User
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50 transition-colors ${deleting === user.id ? "opacity-40 pointer-events-none" : ""}`}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{user.name || "—"}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[220px] truncate">{user.email || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge isActive={user.isActive} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActionButtons
                          user={user}
                          onEdit={(u) => { setFormError(""); setEditingUser(u); }}
                          onDelete={handleDelete}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <UserFormModal
          mode="create"
          initial={{ name: "", email: "", password: "", role: "STAFF", isActive: true }}
          submitting={submitting}
          error={formError}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingUser && (
        <UserFormModal
          mode="edit"
          initial={{
            name: editingUser.name,
            email: editingUser.email,
            password: "",
            role: editingUser.role,
            isActive: editingUser.isActive,
          }}
          submitting={submitting}
          error={formError}
          onClose={() => setEditingUser(null)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}
