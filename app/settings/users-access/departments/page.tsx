"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Building2, Trash2 } from "lucide-react";
import type { Department } from "@/types/rbac";
import { departmentsApi } from "@/lib/rbac/store";
import DepartmentForm from "@/components/rbac/DepartmentForm";
import ConfirmDialog from "@/components/rbac/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Department | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDepartments(await departmentsApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load departments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async (name: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await departmentsApi.create(name);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create department");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await departmentsApi.remove(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete department");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Departments</h2>
        <p className="mt-0.5 text-sm text-slate-500">Organizational departments used across roles, teams, and user profiles.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <DepartmentForm submitting={submitting} onSubmit={handleCreate} />
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : departments.length === 0 ? (
        <EmptyState message="No departments yet" />
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {departments.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-slate-800">{d.name}</span>
              </div>
              <button onClick={() => setPendingDelete(d)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete department">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete Department?"
          message={`This will permanently delete "${pendingDelete.name}". Roles and teams referencing it will keep the old name as plain text.`}
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
