'use client'

import { Building2, User, Mail, Phone, MapPin } from 'lucide-react'
import type { ClientInfo } from '@/types/quotation'

interface Props {
  value: ClientInfo
  onChange: (value: ClientInfo) => void
}

const inputBase =
  'w-full min-h-[44px] bg-[#161b22] border border-white/[0.06] px-4 py-3.5 text-[15px] text-white placeholder:text-zinc-500 rounded-xl transition-all duration-200 hover:border-white/[0.09] focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/25 focus:bg-[#1a2129] focus-visible:ring-2 focus-visible:ring-blue-500/40'
const labelClass =
  'block text-[11px] font-medium tracking-[0.1em] uppercase text-zinc-400 mb-2 leading-tight'

export default function ClientInfoForm({ value, onChange }: Props) {
  const update = (field: keyof ClientInfo, val: string | number) => {
    onChange({ ...value, [field]: val })
  }

  return (
    <section className="rounded-2xl border border-white/[0.05] bg-[#111820]/95 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/30" role="group" aria-labelledby="client-info-heading">
      <header className="flex items-center gap-4 mb-6 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 shrink-0" aria-hidden>
          <Building2 size={20} className="text-blue-400/90" />
        </div>
        <div>
          <h2 id="client-info-heading" className="text-[15px] font-semibold tracking-tight text-white">
            Client Information
          </h2>
          <p className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">
            Billing address and contact details
          </p>
        </div>
      </header>

      <div className="space-y-5">
        <div>
          <label className={labelClass}>Company / Organization</label>
          <input
            type="text"
            value={value.companyName}
            onChange={(e) => update('companyName', e.target.value)}
            placeholder="Acme Corporation"
            className={inputBase}
          />
        </div>

        <div>
          <label className={labelClass}>Contact Person</label>
          <div className="relative">
            <User
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            />
            <input
              type="text"
              value={value.clientName}
              onChange={(e) => update('clientName', e.target.value)}
              placeholder="John Doe"
              className={`${inputBase} pl-11`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Email</label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              />
              <input
                type="email"
                value={value.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="john@company.com"
                className={`${inputBase} pl-11`}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <div className="relative">
              <Phone
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              />
              <input
                type="tel"
                value={value.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className={`${inputBase} pl-11`}
              />
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>Address</label>
          <div className="relative">
            <MapPin
              size={16}
              className="absolute left-4 top-4 text-zinc-500 pointer-events-none"
            />
            <textarea
              value={value.address}
              onChange={(e) => update('address', e.target.value)}
              rows={2}
              placeholder="123 Business Park, Sector 5"
              className={`${inputBase} pl-11 resize-none`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>City</label>
            <input
              type="text"
              value={value.city ?? ''}
              onChange={(e) => update('city', e.target.value)}
              placeholder="Mumbai"
              className={inputBase}
            />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input
              type="text"
              value={value.state ?? ''}
              onChange={(e) => update('state', e.target.value)}
              placeholder="Maharashtra"
              className={inputBase}
            />
          </div>
          <div>
            <label className={labelClass}>PIN Code</label>
            <input
              type="text"
              value={value.pin ?? ''}
              onChange={(e) => update('pin', e.target.value)}
              placeholder="400001"
              className={inputBase}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
