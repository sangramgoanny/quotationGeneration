"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import type { Department, ModulePermission, PermissionModuleDef, PermissionPreset, RoleWithUserCount } from "@/types/rbac";
import { rolesApi, departmentsApi } from "@/lib/rbac/store";
import { PERMISSION_CATALOG, PERMISSION_GROUPS, SENSITIVE_MODULE_IDS, catalogByGroup } from "@/lib/rbac/catalog";
import { applyPreset, emptyModulePermission } from "@/lib/rbac/permissions";
import RoleForm, { type RoleFormValue } from "@/components/rbac/RoleForm";
import PermissionGroup from "@/components/rbac/PermissionGroup";
import PermissionPresetBar from "@/components/rbac/PermissionPresetBar";
import PermissionToolbar, { type PermissionFilter } from "@/components/rbac/PermissionToolbar";
import PermissionSummaryPanel from "@/components/rbac/PermissionSummaryPanel";
import AssignedUsersPanel from "@/components/rbac/AssignedUsersPanel";
import ConfirmDialog from "@/components/rbac/ConfirmDialog";
import { useUnsavedChangesGuard } from "@/components/rbac/useUnsavedChangesGuard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const EMPTY_FORM: RoleFormValue = { name: "", code: "", description: "", department: "", type: "CUSTOM", status: "ACTIVE" };

function buildEmptyPermissionMap(): Record<string, ModulePermission> {
  const map: Record<string, ModulePermission> = {};
  for (const mod of PERMISSION_CATALOG) map[mod.id] = emptyModulePermission(mod.id, "NONE");
  return map;
}

function permissionsArrayToMap(perms: ModulePermission[]): Record<string, ModulePermission> {
  const map = buildEmptyPermissionMap();
  for (const p of perms) map[p.module] = p;
  return map;
}

function matchesFilter(mod: PermissionModuleDef, mp: ModulePermission | undefined, filter: PermissionFilter): boolean {
  if (!mp) return true;
  switch (filter) {
    case "ACCESSIBLE": return mp.scope !== "NONE";
    case "NO_ACCESS": return mp.scope === "NONE";
    case "SENSITIVE": return mp.export || mp.delete || SENSITIVE_MODULE_IDS.includes(mod.id);
    default: return true;
  }
}

export default function RoleEditor({ roleId }: { roleId?: string }) {
  const router = useRouter();
  const isCreate = !roleId;

  const [loading, setLoading] = useState(!isCreate);
  const [role, setRole] = useState<RoleWithUserCount | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState<RoleFormValue>(EMPTY_FORM);
  const [permMap, setPermMap] = useState<Record<string, ModulePermission>>(buildEmptyPermissionMap());
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PermissionFilter>("ALL");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPreset, setConfirmPreset] = useState<PermissionPreset | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const depts = await departmentsApi.list();
      if (active) setDepartments(depts);

      if (isCreate) {
        if (active) {
          setInitialSnapshot(JSON.stringify({ form: EMPTY_FORM, permMap: buildEmptyPermissionMap() }));
          setLoading(false);
        }
        return;
      }
      try {
        const r = await rolesApi.get(roleId!);
        if (!active) return;
        const nextForm: RoleFormValue = { name: r.name, code: r.code, description: r.description ?? "", department: r.department ?? "", type: r.type, status: r.status };
        const nextMap = permissionsArrayToMap(r.permissions);
        setRole(r);
        setForm(nextForm);
        setPermMap(nextMap);
        setInitialSnapshot(JSON.stringify({ form: nextForm, permMap: nextMap }));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load role");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [roleId, isCreate]);

  const isReadOnly = role?.code === "SUPER_ADMIN";
  const isDirty = useMemo(() => JSON.stringify({ form, permMap }) !== initialSnapshot, [form, permMap, initialSnapshot]);
  const { guard, showPrompt, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isDirty && !isReadOnly);

  const filteredGroups = useMemo(() => {
    const grouped = catalogByGroup();
    const result: Record<string, PermissionModuleDef[]> = {};
    const q = search.trim().toLowerCase();
    for (const group of PERMISSION_GROUPS) {
      result[group] = (grouped[group] ?? []).filter((mod) => {
        const bySearch = !q || mod.label.toLowerCase().includes(q);
        return bySearch && matchesFilter(mod, permMap[mod.id], filter);
      });
    }
    return result;
  }, [search, filter, permMap]);

  const updatePermission = useCallback((moduleId: string, next: ModulePermission) => {
    setPermMap((cur) => ({ ...cur, [moduleId]: next }));
  }, []);

  const doApplyPreset = (preset: PermissionPreset) => {
    setPermMap((cur) => {
      const next = { ...cur };
      for (const mod of PERMISSION_CATALOG) next[mod.id] = applyPreset(cur[mod.id] ?? emptyModulePermission(mod.id), preset);
      return next;
    });
    setConfirmPreset(null);
  };

  const requestPreset = (preset: PermissionPreset) => {
    if (preset === "FULL_ACCESS") setConfirmPreset(preset);
    else doApplyPreset(preset);
  };

  const permissionsArray = () => PERMISSION_CATALOG.map((mod) => permMap[mod.id]);

  const doSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isCreate) {
        const created = await rolesApi.create({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          department: form.department || undefined,
          permissions: permissionsArray(),
        });
        router.push(`/settings/users-access/roles/${created.id}`);
        return;
      }
      const updated = await rolesApi.update(roleId!, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        department: form.department || undefined,
        status: form.status,
        permissions: permissionsArray(),
      });
      setRole((cur) => (cur ? { ...cur, ...updated } : cur));
      setInitialSnapshot(JSON.stringify({ form, permMap }));
      setConfirmSave(false);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (!form.name.trim()) {
      setError("Role name is required");
      return;
    }
    setError(null);
    if (!isCreate && role && role.userCount > 0) {
      setConfirmSave(true);
      return;
    }
    void doSave();
  };

  const goBack = () => guard(() => router.push("/settings/users-access/roles"));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <button type="button" onClick={goBack} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-bold text-slate-900">{isCreate ? "Create Role" : form.name || "Role"}</h1>
            {!isCreate && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${form.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                {form.status === "ACTIVE" ? "Active" : "Inactive"}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">{form.description || "Handles a defined scope of ERP access."}</p>
        </div>
        {savedFlash && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Role permissions updated successfully
          </span>
        )}
      </div>

      {isReadOnly && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Super Admin permissions cannot be edited by any user, including other admins.
        </div>
      )}

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <RoleForm
            value={form}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            departments={departments}
            readOnly={isReadOnly}
            isSystemRole={role?.type === "SYSTEM"}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Permissions</h3>
            </div>
            <div className="space-y-3">
              <PermissionToolbar search={search} onSearchChange={setSearch} filter={filter} onFilterChange={setFilter} />
              {!isReadOnly && <PermissionPresetBar onApply={requestPreset} />}
              <div className="space-y-3 pt-1">
                {PERMISSION_GROUPS.map((group) => (
                  <PermissionGroup
                    key={group}
                    group={group}
                    modules={filteredGroups[group] ?? []}
                    permissions={permMap}
                    onChange={updatePermission}
                    readOnly={isReadOnly}
                  />
                ))}
              </div>
            </div>
          </div>

          {!isCreate && role && <AssignedUsersPanel roleId={role.id} roleName={role.name} />}
        </div>

        <PermissionSummaryPanel permissions={permissionsArray()} />
      </div>

      {!isReadOnly && (
        <div className="sticky bottom-0 z-30 -mx-6 border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={goBack} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveClick}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {showPrompt && (
        <ConfirmDialog
          title="Unsaved Changes"
          message="You have modified role permissions. Do you want to discard these changes?"
          confirmLabel="Discard Changes"
          cancelLabel="Keep Editing"
          tone="warning"
          onConfirm={confirmDiscard}
          onCancel={cancelDiscard}
        />
      )}

      {confirmPreset && (
        <ConfirmDialog
          title="Grant Full Access?"
          message="This preset allows access to all records, and enables Delete and Export everywhere. Apply it to every module in this role?"
          confirmLabel="Apply Full Access"
          tone="danger"
          onConfirm={() => doApplyPreset(confirmPreset)}
          onCancel={() => setConfirmPreset(null)}
        />
      )}

      {confirmSave && role && (
        <ConfirmDialog
          title="Confirm Permission Change"
          message={`You are changing permissions for ${role.name}. This will affect ${role.userCount} user${role.userCount === 1 ? "" : "s"}.`}
          confirmLabel="Save Changes"
          busy={saving}
          onConfirm={doSave}
          onCancel={() => setConfirmSave(false)}
        />
      )}
    </div>
  );
}
