"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, ShieldAlert } from "lucide-react";
import ClientForm from "@/components/clients/ClientForm";
import { clientsApi } from "@/lib/api/clients";
import { ApiRequestError } from "@/lib/api/request";
import type { Client } from "@/types/client";
import { usePermissions } from "@/lib/rbac/usePermissions";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function NewClientPage() {
  const router = useRouter();
  const { can, loading: permissionsLoading } = usePermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (data: Client) => {
    setIsLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const created = await clientsApi.create(data);
      router.push(`/crm/clients/${created.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create client";
      setError(msg);
      if (e instanceof ApiRequestError) setFieldErrors(e.fieldErrors);
      setIsLoading(false);
    }
  };

  if (permissionsLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!can("clients", "create")) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-600" />
        <h1 className="mt-3 text-lg font-bold text-slate-900">Permission denied</h1>
        <p className="mt-1 max-w-md text-sm text-slate-600">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 shrink-0">
        <Link
          href="/crm/clients"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Add New Client</h1>
          <p className="text-xs text-slate-500">Fill in the details to create a new client record</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            &times;
          </button>
        </div>
      )}

      {/* Form */}
      <div className="flex-1 overflow-hidden px-6 pt-4 pb-0">
        <ClientForm
          mode="create"
          isLoading={isLoading}
          serverErrors={fieldErrors}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/crm/clients")}
        />
      </div>
    </div>
  );
}
