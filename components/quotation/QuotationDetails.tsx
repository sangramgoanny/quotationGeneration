'use client'

import {
  Hash,
  FolderOpen,
  Calendar,
  Percent,
  CreditCard,
  MessageSquare,
  FileText,
} from 'lucide-react'
import type {
  QuotationMeta,
  Currency,
  TaxType,
  DiscountType,
} from '@/types/quotation'
import { PAYMENT_TERMS } from '@/types/quotation'

interface Props {
  meta: QuotationMeta
  onChange: (meta: QuotationMeta) => void
}

const inputBase =
  'w-full min-h-[44px] bg-[#161b22] border border-white/[0.06] px-4 py-3.5 text-[15px] text-white placeholder:text-zinc-500 rounded-xl transition-all duration-200 hover:border-white/[0.09] focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/25 focus:bg-[#1a2129]'
const labelClass =
  'block text-[11px] font-medium tracking-[0.15em] uppercase text-zinc-400 mb-2'

export default function QuotationDetails({ meta, onChange }: Props) {
  const update = (field: keyof QuotationMeta, val: string | number) => {
    onChange({ ...meta, [field]: val })
  }

  return (
    <section className="rounded-2xl border border-white/[0.05] bg-[#111820]/95 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/30" role="group" aria-labelledby="quotation-details-heading">
      <header className="flex items-center gap-4 mb-6 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 shrink-0" aria-hidden>
          <FileText size={20} className="text-indigo-400/90" />
        </div>
        <div>
          <h2 id="quotation-details-heading" className="text-[15px] font-semibold tracking-tight text-white">
            Quotation Details
          </h2>
          <p className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">
            Number, tax, discount & payment
          </p>
        </div>
      </header>

      <div className="space-y-5">
        <div>
          <label className={labelClass}>Quotation No.</label>
          <div className="relative">
            <Hash
              size={14}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
            <input
              type="text"
              value={meta.quotationNumber}
              onChange={(e) => update('quotationNumber', e.target.value)}
              placeholder="QTN-250120-001"
              className={`${inputBase} pl-11 font-mono text-sm`}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Reference</label>
          <input
            type="text"
            value={meta.reference}
            onChange={(e) => update('reference', e.target.value)}
            placeholder="PO / RFQ number"
            className={inputBase}
          />
        </div>

        <div>
          <label className={labelClass}>Project Name</label>
          <div className="relative">
            <FolderOpen
              size={14}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
            <input
              type="text"
              value={meta.projectName}
              onChange={(e) => update('projectName', e.target.value)}
              placeholder="Website Redesign 2025"
              className={`${inputBase} pl-11`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Currency</label>
            <select
              value={meta.currency}
              onChange={(e) => update('currency', e.target.value as Currency)}
              className={`${inputBase} appearance-none cursor-pointer bg-[#161b22] pr-10`}
            >
              <option value="INR" className="bg-zinc-900">
                INR (₹)
              </option>
              <option value="USD" className="bg-zinc-900">
                USD ($)
              </option>
              <option value="EUR" className="bg-zinc-900">
                EUR (€)
              </option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Tax Type</label>
            <select
              value={meta.taxType}
              onChange={(e) => update('taxType', e.target.value as TaxType)}
              className={`${inputBase} appearance-none cursor-pointer bg-[#161b22] pr-10`}
            >
              <option value="gst" className="bg-zinc-900">
                CGST + SGST
              </option>
              <option value="igst" className="bg-zinc-900">
                IGST
              </option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tax %</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={meta.taxPercent}
              onChange={(e) =>
                update('taxPercent', parseFloat(e.target.value) || 0)
              }
              className={inputBase}
            />
          </div>
          <div>
            <label className={labelClass}>Validity (days)</label>
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              />
              <input
                type="number"
                min={1}
                value={meta.validityDays}
                onChange={(e) =>
                  update('validityDays', parseInt(e.target.value) || 30)
                }
                className={`${inputBase} pl-11`}
              />
            </div>
          </div>
        </div>

        <div>
          <label className={`${labelClass} flex items-center gap-2`}>
            <Percent size={12} className="text-zinc-500" />
            Discount
          </label>
          <div className="flex gap-3">
            <select
              value={meta.discountType}
              onChange={(e) =>
                update('discountType', e.target.value as DiscountType)
              }
              className={`${inputBase} w-28 shrink-0 appearance-none cursor-pointer bg-[#161b22]`}
            >
              <option value="percent" className="bg-zinc-900">
                %
              </option>
              <option value="fixed" className="bg-zinc-900">
                Fixed
              </option>
            </select>
            <input
              type="number"
              min={0}
              step={meta.discountType === 'percent' ? 1 : 0.01}
              value={meta.discountValue || ''}
              onChange={(e) =>
                update('discountValue', parseFloat(e.target.value) || 0)
              }
              placeholder={meta.discountType === 'percent' ? '10' : '500'}
              className={`${inputBase} flex-1`}
            />
          </div>
        </div>

        <div>
          <label className={`${labelClass} flex items-center gap-2`}>
            <CreditCard size={12} className="text-zinc-500" />
            Payment Terms
          </label>
          <select
            value={meta.paymentTerms}
            onChange={(e) => update('paymentTerms', e.target.value)}
            className={`${inputBase} appearance-none cursor-pointer bg-[#161b22]`}
          >
            {PAYMENT_TERMS.map((term) => (
              <option key={term} value={term} className="bg-zinc-900">
                {term}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`${labelClass} flex items-center gap-2`}>
            <MessageSquare size={12} className="text-zinc-500" />
            Remarks
          </label>
          <textarea
            value={meta.remarks}
            onChange={(e) => update('remarks', e.target.value)}
            rows={2}
            placeholder="Terms, delivery notes, etc."
            className={`${inputBase} resize-none`}
          />
        </div>
      </div>
    </section>
  )
}
