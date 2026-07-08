"use client";

import React, { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LeadProfile from "@/components/leads/LeadProfile";

interface Props {
  params: Promise<{ id: string }>;
}

export default function LeadDetailPage({ params }: Props) {
  const { id } = use(params);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <Link
          href="/crm/leads"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <p className="text-xs text-slate-500">
          <Link href="/crm/leads" className="hover:text-indigo-600">Leads</Link>
          {" / "}
          <span className="text-slate-700 font-medium">Lead Details</span>
        </p>
      </header>

      <div className="p-6">
        <LeadProfile leadId={id} />
      </div>
    </main>
  );
}
