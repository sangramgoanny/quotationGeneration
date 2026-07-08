"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle, Building2, Calendar, CheckCircle, Edit, FileText,
  Globe, Mail, MapPin, Phone, Tag, User, Users,
} from "lucide-react";
import { clientsApi } from "@/lib/api/clients";
import type { Client } from "@/types/client";
import LeadQuotationSection from "@/components/leads/LeadQuotationSection";

interface Props {
  leadId: string;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <span className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500 w-32 shrink-0">{label}</span>
      <span className="text-xs font-medium text-slate-800 break-all">{value}</span>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function formatDate(date?: string) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function LeadProfile({ leadId }: Props) {
  const router = useRouter();
  const [lead, setLead] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [triggerCreate, setTriggerCreate] = useState(false);

  useEffect(() => {
    let isMounted = true;
    clientsApi
      .get(leadId)
      .then((data) => {
        if (isMounted) setLead(data);
      })
      .catch((e) => {
        if (isMounted) setError(e instanceof Error ? e.message : "Failed to load lead");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [leadId]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-lg py-14 text-center text-red-600">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm font-semibold">{error}</p>
      </div>
    );
  }

  if (!lead) return null;

  const initials = (lead.companyName || "LD").slice(0, 2).toUpperCase();
  const location = [lead.billingAddress?.city, lead.billingAddress?.state, lead.billingAddress?.country].filter(Boolean).join(", ");

  const handleConvert = async () => {
    setConverting(true);
    setError(null);
    try {
      const converted = await clientsApi.update(leadId, { ...lead, status: "Active" });
      router.push(`/crm/clients/${converted.id ?? leadId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to convert lead");
      setConverting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 break-words">{lead.companyName || "Unnamed Lead"}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Lead</span>
                {lead.clientCode && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-mono">{lead.clientCode}</span>}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {[lead.contactPersonName, lead.designation, lead.industry].filter(Boolean).join(" · ") || "Lead details pending"}
              </p>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                {lead.mobile && <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {lead.mobile}</span>}
                {lead.primaryEmail && <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {lead.primaryEmail}</span>}
                {location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {location}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleConvert}
              disabled={converting}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50"
            >
              <Users className="w-4 h-4" /> {converting ? "Converting..." : "Convert"}
            </button>
            <button
              type="button"
              onClick={() => setTriggerCreate(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50"
            >
              <FileText className="w-4 h-4" /> Quotation
            </button>
            <Link
              href={`/crm/clients/${leadId}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
            >
              <Edit className="w-4 h-4" /> Edit
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Section title="Lead Information" icon={Building2}>
          <InfoRow label="Type" value={lead.clientType} />
          <InfoRow label="Industry" value={lead.industry} />
          <InfoRow label="Business Type" value={lead.businessType} />
          <InfoRow label="Company Size" value={lead.companySize} />
          <InfoRow label="Lead Source" value={lead.leadSource} />
          <InfoRow label="Created" value={formatDate(lead.createdAt)} />
        </Section>

        <Section title="Contact Details" icon={User}>
          <InfoRow label="Contact Person" value={lead.contactPersonName} />
          <InfoRow label="Designation" value={lead.designation} />
          <InfoRow label="Mobile" value={lead.mobile} />
          <InfoRow label="WhatsApp" value={lead.whatsapp} />
          <InfoRow label="Email" value={lead.primaryEmail} />
          <InfoRow
            label="Website"
            value={
              lead.website ? (
                <a href={lead.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
                  <Globe className="w-3.5 h-3.5" /> {lead.website}
                </a>
              ) : undefined
            }
          />
        </Section>

        <Section title="Qualification" icon={CheckCircle}>
          <InfoRow label="Estimated Revenue" value={lead.annualRevenue ? `₹ ${lead.annualRevenue}` : undefined} />
          <InfoRow label="Payment Terms" value={lead.paymentTerms} />
          <InfoRow label="Opening Balance" value={lead.openingBalance ? `₹ ${lead.openingBalance}` : undefined} />
          <InfoRow label="Last Updated" value={formatDate(lead.updatedAt)} />
        </Section>

        <Section title="Address" icon={MapPin}>
          <InfoRow label="Line 1" value={lead.billingAddress?.line1} />
          <InfoRow label="Line 2" value={lead.billingAddress?.line2} />
          <InfoRow label="City" value={lead.billingAddress?.city} />
          <InfoRow label="State" value={lead.billingAddress?.state} />
          <InfoRow label="Country" value={lead.billingAddress?.country} />
          <InfoRow label="Pincode" value={lead.billingAddress?.pincode} />
        </Section>

        <Section title="Notes" icon={Calendar}>
          <InfoRow label="Meeting Notes" value={lead.meetingNotes} />
          <InfoRow label="Instructions" value={lead.specialInstructions} />
          <InfoRow label="Internal Notes" value={lead.internalNotes} />
        </Section>

        <Section title="Tags" icon={Tag}>
          {lead.tags?.length ? (
            <div className="flex flex-wrap gap-2">
              {lead.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No tags added</p>
          )}
        </Section>
      </div>

      <LeadQuotationSection
        leadId={leadId}
        leadName={lead.companyName || "Client"}
        triggerCreate={triggerCreate}
        onCreateHandled={() => setTriggerCreate(false)}
      />
    </div>
  );
}
