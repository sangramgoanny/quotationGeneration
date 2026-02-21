'use client'

import { Plus, Trash2, FileText } from 'lucide-react'
import type { QuotationItem } from '@/types/quotation'

interface Props {
  items: QuotationItem[]
  onChange: (items: QuotationItem[]) => void
}

function generateId() {
  return Math.random().toString(36).slice(2, 11)
}

const inputBase =
  'w-full min-h-[42px] bg-[#161b22] border border-white/[0.06] px-4 py-3 text-[14px] text-white placeholder:text-zinc-500 rounded-xl transition-all duration-200 hover:border-white/[0.09] focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/25 focus:bg-[#1a2129]'
const labelClass =
  'block text-[11px] font-medium tracking-[0.12em] uppercase text-zinc-400 mb-2'

export default function QuotationItemsForm({ items, onChange }: Props) {
  const updateItem = (id: string, updates: Partial<QuotationItem>) => {
    const updated = items.map((item) => {
      if (item.id !== id) return item
      const merged = { ...item, ...updates }
      if ('quantity' in updates || 'rate' in updates) {
        merged.amount = merged.quantity * merged.rate
      }
      return merged
    })
    onChange(updated)
  }

  const addItem = () => {
    onChange([
      ...items,
      {
        id: generateId(),
        description: '',
        quantity: 1,
        unit: 'pcs',
        rate: 0,
        amount: 0,
      },
    ])
  }

  const removeItem = (id: string) => {
    if (items.length <= 1) return
    onChange(items.filter((i) => i.id !== id))
  }

  const units = ['pcs', 'hrs', 'days', 'project', 'lot', 'sq.ft', 'nos']

  return (
    <section className="rounded-2xl border border-white/[0.05] bg-[#111820]/95 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-black/30" role="group" aria-labelledby="line-items-heading">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 shrink-0" aria-hidden>
            <FileText size={20} className="text-emerald-400/90" />
          </div>
          <div>
            <h2 id="line-items-heading" className="text-[15px] font-semibold tracking-tight text-white">
              Line Items
            </h2>
            <p className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">
              Services or products with quantity & rates
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[13px] font-medium hover:bg-blue-500/25 hover:border-blue-500/40 active:scale-[0.98] transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 shrink-0"
        >
          <Plus size={16} strokeWidth={2.5} /> Add Item
        </button>
      </div>

      <div className="space-y-5">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/[0.05] bg-[#1a1f26]/60 p-5 space-y-4 hover:border-white/[0.08] hover:bg-[#1a1f26]/80 transition-all duration-200"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-medium tracking-widest text-zinc-500 uppercase">
                Item {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={items.length <= 1}
                className="flex items-center justify-center min-h-[40px] min-w-[40px] p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-500 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-1"
                aria-label={`Remove item ${index + 1}`}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <input
                type="text"
                value={item.description}
                onChange={(e) =>
                  updateItem(item.id, { description: e.target.value })
                }
                placeholder="Brand identity design"
                className={`${inputBase} py-3`}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className={labelClass}>Qty</label>
                <input
                  type="number"
                  min={1}
                  value={item.quantity || ''}
                  onChange={(e) =>
                    updateItem(item.id, {
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  className={`${inputBase} py-2.5`}
                />
              </div>
              <div>
                <label className={labelClass}>Unit</label>
                <select
                  value={item.unit}
                  onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                  className={`${inputBase} py-2.5 appearance-none cursor-pointer bg-[#161b22]`}
                >
                  {units.map((u) => (
                    <option key={u} value={u} className="bg-zinc-900">
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Rate (₹)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.rate || ''}
                  onChange={(e) =>
                    updateItem(item.id, {
                      rate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className={`${inputBase} py-2.5`}
                />
              </div>
              <div>
                <label className={labelClass}>Amount (₹)</label>
                <input
                  type="text"
                  readOnly
                  value={item.amount.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                  className={`${inputBase} py-2.5 bg-[#141a20] cursor-default font-semibold text-zinc-300 border-white/[0.04]`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
