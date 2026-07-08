"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import ClientForm from "@/components/clients/ClientForm";
import { clientsApi } from "@/lib/api/clients";
import type { Client } from "@/types/client";

export default function NewClientPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Client) => {
    setIsLoading(true);
    setError(null);
    try {
      const created = await clientsApi.create(data);
      router.push(`/crm/clients/${created.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create client";
      setError(msg);
      setIsLoading(false);
    }
  };

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
          onSubmit={handleSubmit}
          onCancel={() => router.push("/crm/clients")}
        />
      </div>
    </div>
  );
}
