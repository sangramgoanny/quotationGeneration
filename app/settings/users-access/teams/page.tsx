"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Edit, UsersRound } from "lucide-react";
import type { Department, Team } from "@/types/rbac";
import { teamsApi, departmentsApi } from "@/lib/rbac/store";
import { usersApi, type User } from "@/lib/api/users";
import TeamForm, { type TeamFormValue } from "@/components/rbac/TeamForm";
import ConfirmDialog from "@/components/rbac/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const EMPTY_FORM: TeamFormValue = { name: "", department: "", managerId: "", memberIds: [] };

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Team | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, d, u] = await Promise.all([teamsApi.list(), departmentsApi.list(), usersApi.list()]);
      setTeams(t);
      setDepartments(d);
      setUsers(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const userName = (id?: string) => (id ? users.find((u) => u.id === id)?.name || users.find((u) => u.id === id)?.email : undefined);

  const handleCreate = async (form: TeamFormValue) => {
    setSubmitting(true);
    setFormError("");
    try {
      await teamsApi.create({ name: form.name, department: form.department || undefined, managerId: form.managerId || undefined, memberIds: form.memberIds });
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create team");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (form: TeamFormValue) => {
    if (!editing) return;
    setSubmitting(true);
    setFormError("");
    try {
      await teamsApi.update(editing.id, { name: form.name, department: form.department || undefined, managerId: form.managerId || undefined, memberIds: form.memberIds });
      setEditing(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to update team");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await teamsApi.remove(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete team");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Teams</h2>
          <p className="mt-0.5 text-sm text-slate-500">Group users into teams for team-level record visibility.</p>
        </div>
        <button
          onClick={() => { setFormError(""); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Create Team
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : teams.length === 0 ? (
        <EmptyState message="No teams created yet" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div key={team.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <UsersRound className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{team.name}</p>
                    <p className="text-xs text-slate-400">{team.department || "No department"}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setFormError(""); setEditing(team); }}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                    title="Edit team"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setPendingDelete(team)} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Delete team">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <p><span className="font-semibold text-slate-600">Manager:</span> {userName(team.managerId) || "Unassigned"}</p>
                <p><span className="font-semibold text-slate-600">Members:</span> {team.memberIds.length === 0 ? "None yet" : team.memberIds.map((id) => userName(id) || "—").join(", ")}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <TeamForm
          mode="create"
          initial={EMPTY_FORM}
          departments={departments}
          users={users}
          submitting={submitting}
          error={formError}
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
        />
      )}

      {editing && (
        <TeamForm
          mode="edit"
          initial={{ name: editing.name, department: editing.department ?? "", managerId: editing.managerId ?? "", memberIds: editing.memberIds }}
          departments={departments}
          users={users}
          submitting={submitting}
          error={formError}
          onClose={() => setEditing(null)}
          onSubmit={handleUpdate}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete Team?"
          message={`This will permanently delete "${pendingDelete.name}".`}
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
