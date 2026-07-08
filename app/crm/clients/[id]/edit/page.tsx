"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import ClientForm from "@/components/clients/ClientForm";
import { clientsApi } from "@/lib/api/clients";
import type { Client } from "@/types/client";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditClientPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchDone, setFetchDone] = useState(false);

  useEffect(() => {
    clientsApi
      .get(id)
      .then((data) => {
        setClient(data);
        setFetchDone(true);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Failed to load client";
        setLoadError(msg);
        setFetchDone(true);
      });
  }, [id]);

  const handleSubmit = async (data: Client) => {
    setIsLoading(true);
    setSaveError(null);
    try {
      await clientsApi.update(id, data);
      router.push(`/crm/clients/${id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update client";
      setSaveError(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 shrink-0">
        <Link
          href={`/crm/clients/${id}`}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Edit Client</h1>
          <p className="text-xs text-slate-500">Update client information</p>
        </div>
      </div>

      {/* Error banners */}
      {(loadError || saveError) && (
        <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{loadError ?? saveError}</span>
          <button onClick={() => { setLoadError(null); setSaveError(null); }} className="ml-auto text-red-500 hover:text-red-700">
            &times;
          </button>
        </div>
      )}

      {/* Loading state */}
      {!fetchDone && !loadError && (
        <div className="flex-1 flex items-center justify-center">
          <span className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Form */}
      {fetchDone && client && (
        <div className="flex-1 overflow-hidden px-6 pt-4 pb-0">
          <ClientForm
            mode="edit"
            initialData={client}
            isLoading={isLoading}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/crm/clients/${id}`)}
          />
        </div>
      )}
    </div>
  );
}
