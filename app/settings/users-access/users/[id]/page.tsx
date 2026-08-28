"use client";

import React, { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, AlertTriangle } from "lucide-react";
import { usersApi, type User } from "@/lib/api/users";
import { rolesApi, departmentsApi, teamsApi, userAccessApi } from "@/lib/rbac/store";
import type { Department, ModulePermission, RoleWithUserCount, Team, UserAccess } from "@/types/rbac";
import { PERMISSION_CATALOG, PERMISSION_GROUPS, catalogByGroup } from "@/lib/rbac/catalog";
import { emptyModulePermission } from "@/lib/rbac/permissions";
import { usePermissions } from "@/lib/rbac/usePermissions";
import PermissionGroup from "@/components/rbac/PermissionGroup";
import PermissionSummaryPanel from "@/components/rbac/PermissionSummaryPanel";
import ConfirmDialog from "@/components/rbac/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const selectField = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60";

export default function UserAccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = usePermissions();

  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [roles, setRoles] = useState<RoleWithUserCount[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState(false);

  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideMap, setOverrideMap] = useState<Record<string, ModulePermission>>({});
  const [savingOverride, setSavingOverride] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const u = await usersApi.get(id);
      setUser(u);
      const [a, r, d, t, users] = await Promise.all([
        userAccessApi.get(id, { legacyRole: u.role, userName: u.name || u.email }),
        rolesApi.list(),
        departmentsApi.list(),
        teamsApi.list(),
        usersApi.list(),
      ]);
      setAccess(a);
      setRoles(r);
      setDepartments(d);
      setTeams(t);
      setAllUsers(users.filter((candidate) => candidate.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const role = roles.find((r) => r.id === access?.roleId) ?? null;

  const effectivePermissions: ModulePermission[] = role
    ? role.permissions.map((p) => {
        const override = access?.overrides?.find((o) => o.module === p.module);
        return override ? { ...p, ...override } : p;
      })
    : [];

  const changeRole = async (roleId: string) => {
    if (!user || !roleId) return;
    setSavingField(true);
    setError(null);
    try {
      const nextRole = roles.find((candidate) => candidate.id === roleId);
      if (!nextRole) throw new Error("Role not found");
      const updatedUser = await usersApi.update(user.id, { roleId: nextRole.id });
      setUser(updatedUser);
      setAccess(await userAccessApi.assignRole(user.id, roleId, { userName: user.name || user.email }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change role");
    } finally {
      setSavingField(false);
    }
  };

  const changeField = async (patch: { department?: string; team?: string; reportingManagerId?: string }) => {
    if (!user) return;
    setSavingField(true);
    setError(null);
    try {
      setAccess(await userAccessApi.updateAccess(user.id, patch, { userName: user.name || user.email }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update access details");
    } finally {
      setSavingField(false);
    }
  };

  const startOverride = () => {
    const map: Record<string, ModulePermission> = {};
    for (const mod of PERMISSION_CATALOG) {
      map[mod.id] = effectivePermissions.find((p) => p.module === mod.id) ?? emptyModulePermission(mod.id, "NONE");
    }
    setOverrideMap(map);
    setOverrideMode(true);
  };

  const saveOverride = async () => {
    if (!user || !role) return;
    setSavingOverride(true);
    setError(null);
    try {
      const diffOverrides: Partial<ModulePermission>[] = [];
      for (const mod of PERMISSION_CATALOG) {
        const base = role.permissions.find((p) => p.module === mod.id);
        const current = overrideMap[mod.id];
        if (base && JSON.stringify(base) !== JSON.stringify(current)) diffOverrides.push(current);
      }
      setAccess(await userAccessApi.setOverride(user.id, diffOverrides, { userName: user.name || user.email }));
      setOverrideMode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save override");
    } finally {
      setSavingOverride(false);
    }
  };

  const resetOverride = async () => {
    if (!user) return;
    setSavingOverride(true);
    setError(null);
    try {
      setAccess(await userAccessApi.clearOverride(user.id, { userName: user.name || user.email }));
      setOverrideMode(false);
      setConfirmReset(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset override");
    } finally {
      setSavingOverride(false);
    }
  };

  const canManageOverrides = can("rolesPermissions", "edit");

  if (loading) return <LoadingSpinner />;
  if (error && !user) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }
  if (!user) return null;

  const hasOverride = Boolean(access?.overrides && access.overrides.length > 0);
  const grouped = catalogByGroup();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/settings/users-access/users" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{user.name || user.email}</h1>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <ShieldCheck className="h-4 w-4" /> Access & Permissions
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Primary Role
                <select value={access?.roleId ?? ""} disabled={savingField} onChange={(e) => void changeRole(e.target.value)} className={selectField}>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Department
                <select value={access?.department ?? ""} disabled={savingField} onChange={(e) => void changeField({ department: e.target.value })} className={selectField}>
                  <option value="">— None —</option>
                  {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Team
                <select value={access?.team ?? ""} disabled={savingField} onChange={(e) => void changeField({ team: e.target.value })} className={selectField}>
                  <option value="">— None —</option>
                  {teams.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Reporting Manager
                <select value={access?.reportingManagerId ?? ""} disabled={savingField} onChange={(e) => void changeField({ reportingManagerId: e.target.value })} className={selectField}>
                  <option value="">— None —</option>
                  {allUsers.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                </select>
              </label>
            </div>
            <p className="mt-3 text-xs text-slate-400">Permissions are inherited from the assigned role by default.</p>
          </div>

          {hasOverride && !overrideMode && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              This user&apos;s permissions are different from the default role permissions.
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Permission Override</h3>
              {canManageOverrides && !overrideMode && (
                <div className="flex gap-2">
                  <button type="button" onClick={startOverride} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    Add / Remove Permission
                  </button>
                  {hasOverride && (
                    <button type="button" onClick={() => setConfirmReset(true)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      Reset to Role Default
                    </button>
                  )}
                </div>
              )}
            </div>

            {!canManageOverrides ? (
              <p className="text-xs text-slate-400">Only Super Admin and Admin can override an individual user&apos;s permissions.</p>
            ) : overrideMode ? (
              <div className="space-y-3">
                {PERMISSION_GROUPS.map((group) => (
                  <PermissionGroup
                    key={group}
                    group={group}
                    modules={grouped[group] ?? []}
                    permissions={overrideMap}
                    onChange={(moduleId, next) => setOverrideMap((cur) => ({ ...cur, [moduleId]: next }))}
                    defaultOpen={false}
                  />
                ))}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setOverrideMode(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingOverride}
                    onClick={() => void saveOverride()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {savingOverride ? "Saving…" : "Save Override"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                {hasOverride ? "This user has custom permission overrides." : "No overrides — this user follows their role's default permissions exactly."}
              </p>
            )}
          </div>
        </div>

        <PermissionSummaryPanel permissions={effectivePermissions} />
      </div>

      {confirmReset && (
        <ConfirmDialog
          title="Reset to Role Default?"
          message="This removes all custom permission overrides for this user. They will inherit permissions from their role exactly."
          confirmLabel="Reset"
          tone="warning"
          busy={savingOverride}
          onConfirm={() => void resetOverride()}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}
