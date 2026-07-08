"use client";

import React, { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ClientProfile from "@/components/clients/ClientProfile";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ClientDetailPage({ params }: Props) {
  const { id } = use(params);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <Link
          href="/crm/clients"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <p className="text-xs text-slate-500">
          <Link href="/crm/clients" className="hover:text-indigo-600 transition-colors">Clients</Link>
          {" / "}
          <span className="text-slate-700 font-medium">Client Profile</span>
        </p>
      </div>

      {/* Profile */}
      <div className="p-6">
        <ClientProfile clientId={id} />
      </div>
    </div>
  );
}
