"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, RefreshCw } from "lucide-react";
import type { RoleWithUserCount } from "@/types/rbac";
import { rolesApi } from "@/lib/rbac/store";
import RolesTable from "@/components/rbac/RolesTable";
import ConfirmDialog from "@/components/rbac/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleWithUserCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pendingDeactivate, setPendingDeactivate] = useState<RoleWithUserCount | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RoleWithUserCount | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRoles(await rolesApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q));
  }, [roles, search]);

  const handleDuplicate = async (role: RoleWithUserCount) => {
    setError(null);
    try {
      const created = await rolesApi.duplicate(role.id);
      router.push(`/settings/users-access/roles/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to duplicate role");
    }
  };

  const handleViewUsers = (role: RoleWithUserCount) => {
    router.push(`/settings/users-access/roles/${role.id}`);
  };

  const handleToggleStatus = (role: RoleWithUserCount) => {
    if (role.status === "ACTIVE") setPendingDeactivate(role);
    else void confirmToggleStatus(role);
  };

  const confirmToggleStatus = async (role: RoleWithUserCount) => {
    setBusy(true);
    setError(null);
    try {
      await rolesApi.setStatus(role.id, role.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      setPendingDeactivate(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role status");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    setError(null);
    try {
      await rolesApi.remove(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete role");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Roles & Permissions</h2>
          <p className="mt-0.5 text-sm text-slate-500">Manage user roles, access levels, and module permissions.</p>
        </div>
        <Link
          href="/settings/users-access/roles/new"
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Create Role
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles by name or description..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <button onClick={() => void load()} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : visibleRoles.length === 0 ? (
        <EmptyState message="No roles found" />
      ) : (
        <RolesTable
          roles={visibleRoles}
          onDuplicate={handleDuplicate}
          onViewUsers={handleViewUsers}
          onToggleStatus={handleToggleStatus}
          onDelete={setPendingDelete}
        />
      )}

      {pendingDeactivate && (
        <ConfirmDialog
          title="Deactivate Role?"
          message={`Users assigned to "${pendingDeactivate.name}" may lose access to the ERP.`}
          confirmLabel="Deactivate"
          tone="warning"
          busy={busy}
          onConfirm={() => void confirmToggleStatus(pendingDeactivate)}
          onCancel={() => setPendingDeactivate(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete Role?"
          message={
            pendingDelete.userCount > 0
              ? `This role is currently assigned to ${pendingDelete.userCount} user${pendingDelete.userCount === 1 ? "" : "s"}. Reassign them before deleting the role.`
              : `This will permanently delete "${pendingDelete.name}". This action cannot be undone.`
          }
          confirmLabel="Delete"
          tone="danger"
          busy={busy}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
