"use client";

import React from "react";
import { Building2, CalendarDays, Mail, ShieldCheck, UserRound, Users } from "lucide-react";
import { useAuthRbac } from "@/lib/rbac/AuthRbacProvider";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800 break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { currentUser, loading } = useAuthRbac();

  if (loading) return <LoadingSpinner />;
  if (!currentUser) {
    return <p className="text-sm text-slate-500">You need to be signed in to view your profile.</p>;
  }

  const roleName = currentUser.assignedRole?.name ?? currentUser.role;
  const initials = (currentUser.name || currentUser.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 break-words">{currentUser.name || "Unnamed User"}</h1>
            <p className="text-sm text-slate-500">{currentUser.email}</p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              <ShieldCheck className="h-3 w-3" /> {roleName}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Details</h2>
        <Row icon={Mail} label="Email" value={currentUser.email} />
        <Row icon={ShieldCheck} label="Role" value={roleName} />
        <Row icon={Users} label="Team" value={currentUser.team?.name} />
        <Row icon={Building2} label="Department" value={currentUser.userAccess?.department} />
        <Row
          icon={UserRound}
          label="Reporting Manager"
          value={
            currentUser.reportingManager
              ? `${currentUser.reportingManager.name}${currentUser.reportingManager.email ? ` · ${currentUser.reportingManager.email}` : ""}`
              : undefined
          }
        />
        <Row icon={CalendarDays} label="Member Since" value={formatDate(currentUser.createdAt)} />
        <Row icon={UserRound} label="Status" value={currentUser.isActive ? "Active" : "Inactive"} />
      </section>

      <p className="text-xs text-slate-400">
        Need a change to your role, team, or reporting manager? Contact an administrator.
      </p>
    </div>
  );
}
