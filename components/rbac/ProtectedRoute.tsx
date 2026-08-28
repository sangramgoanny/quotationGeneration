"use client";

import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import type { PermissionAction } from "@/types/rbac";
import { usePermissions } from "@/lib/rbac/usePermissions";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function ProtectedRoute({ module, action = "view", children }: { module: string; action?: PermissionAction; children: ReactNode }) {
  const { can, loading } = usePermissions();
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><LoadingSpinner /></div>;
  if (!can(module, action)) return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
      <ShieldAlert className="h-10 w-10 text-amber-600" />
      <h1 className="mt-3 text-lg font-bold text-slate-900">Permission denied</h1>
      <p className="mt-1 max-w-md text-sm text-slate-600">You do not have permission to access this page.</p>
    </div>
  );
  return <>{children}</>;
}