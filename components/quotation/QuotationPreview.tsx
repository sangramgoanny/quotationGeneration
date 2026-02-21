'use client'

import { Printer } from 'lucide-react'
import type { ClientInfo, QuotationItem, Currency, TaxType } from '@/types/quotation'
import { CURRENCY_SYMBOLS } from '@/types/quotation'

interface Props {
  quotationNumber: string
  reference: string
  projectName: string
  clientInfo: ClientInfo
  items: QuotationItem[]
  subtotal: number
  discountAmount: number
  taxPercent: number
  taxType: TaxType
  taxAmount: number
  total: number
  currency: Currency
  paymentTerms: string
  validityDays: number
  remarks: string
}

export default function QuotationPreview({
  quotationNumber,
  reference,
  projectName,
  clientInfo,
  items,
  subtotal,
  discountAmount,
  taxPercent,
  taxType,
  taxAmount,
  total,
  currency,
  paymentTerms,
  validityDays,
  remarks,
}: Props) {
  const sym = CURRENCY_SYMBOLS[currency]
  const formatCurrency = (n: number) =>
    `${sym}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const formatDate = () =>
    new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  const taxLabel = taxType === 'igst' ? 'IGST' : 'GST'

  const handlePrint = () => {
    const clientLines = [
      clientInfo.companyName &&
        `<div class="client-name">${escapeHtml(clientInfo.companyName)}</div>`,
      clientInfo.clientName &&
        `<div>Attn: ${escapeHtml(clientInfo.clientName)}</div>`,
      clientInfo.address && `<div>${escapeHtml(clientInfo.address)}</div>`,
      [clientInfo.city, clientInfo.state, clientInfo.pin].filter(Boolean)
        .length > 0 &&
        `<div>${[clientInfo.city, clientInfo.state, clientInfo.pin]
          .filter((x): x is string => Boolean(x))
          .map((x) => escapeHtml(x))
          .join(', ')}</div>`,
      clientInfo.email && `<div>${escapeHtml(clientInfo.email)}</div>`,
      clientInfo.phone && `<div>${escapeHtml(clientInfo.phone)}</div>`,
    ].filter(Boolean)

    const rows = items
      .map(
        (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(item.description || '—')}</td>
        <td class="text-right">${item.quantity.toLocaleString()}</td>
        <td class="text-right">${item.unit}</td>
        <td class="text-right">${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="text-right">${item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `
      )
      .join('')

    const discountRow =
      discountAmount > 0
        ? `<div class="totals-row"><span>Discount</span><span>-${formatCurrency(discountAmount)}</span></div>`
        : ''
    const taxRow = `<div class="totals-row"><span>${taxLabel} (${taxPercent}%)</span><span>${formatCurrency(taxAmount)}</span></div>`

    const metaBlock = [
      quotationNumber && `<div class="meta-item"><strong>Quotation No.</strong> ${escapeHtml(quotationNumber)}</div>`,
      reference && `<div class="meta-item"><strong>Reference</strong> ${escapeHtml(reference)}</div>`,
      projectName && `<div class="meta-item"><strong>Project</strong> ${escapeHtml(projectName)}</div>`,
    ]
      .filter(Boolean)
      .join('')

    const printDoc = `
<!DOCTYPE html>
<html>
<head>
  <title>Quotation - ARTERIAZ</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; background: #fff; color: #000; padding: 40px; max-width: 210mm; margin: 0 auto; font-size: 12px; }
    .letterhead { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 24px; }
    .company { font-size: 26px; letter-spacing: 0.25em; font-weight: 300; }
    .tagline { font-size: 10px; letter-spacing: 0.2em; margin-top: 6px; opacity: 0.7; }
    .meta-row { margin-top: 14px; font-size: 10px; letter-spacing: 0.1em; opacity: 0.7; display: flex; flex-wrap: wrap; gap: 16px; }
    .meta-item strong { margin-right: 6px; }
    .client-box { margin: 20px 0; font-size: 12px; line-height: 1.7; }
    .client-box strong { display: block; margin-bottom: 6px; }
    .client-box .client-name { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #ddd; text-align: left; }
    th { font-weight: 600; letter-spacing: 0.05em; font-size: 10px; opacity: 0.85; }
    .text-right { text-align: right; }
    .totals { margin-top: 20px; max-width: 300px; margin-left: auto; font-size: 13px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .totals .total-row { font-size: 16px; font-weight: 700; border-top: 2px solid #000; margin-top: 10px; padding-top: 12px; }
    .remarks { margin-top: 28px; font-size: 11px; opacity: 0.85; line-height: 1.6; white-space: pre-wrap; }
    .terms { margin-top: 20px; font-size: 11px; opacity: 0.75; }
    .validity { margin-top: 12px; font-size: 11px; opacity: 0.7; }
    .footer { margin-top: 40px; font-size: 10px; opacity: 0.5; text-align: center; letter-spacing: 0.12em; }
  </style>
</head>
<body>
  <div class="letterhead">
    <div class="company">ARTERIAZ</div>
    <div class="tagline">Branding • Strategy • Identity</div>
    <div class="meta-row">
      <span>${formatDate()} | Quotation</span>
      ${metaBlock ? '|' : ''} ${metaBlock}
    </div>
  </div>
  <div class="client-box">
    <strong>To,</strong>
    ${clientLines.join('')}
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>DESCRIPTION</th>
        <th class="text-right">QTY</th>
        <th class="text-right">UNIT</th>
        <th class="text-right">RATE (${sym})</th>
        <th class="text-right">AMOUNT (${sym})</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
    ${discountRow}
    ${taxRow}
    <div class="totals-row total-row"><span>Total</span><span>${formatCurrency(total)}</span></div>
  </div>
  ${paymentTerms ? `<div class="terms"><strong>Payment:</strong> ${escapeHtml(paymentTerms)}</div>` : ''}
  ${remarks ? `<div class="remarks">${escapeHtml(remarks)}</div>` : ''}
  <div class="validity">Valid for ${validityDays} days from date of issue.</div>
  <div class="footer">© ${new Date().getFullYear()} Arteriaz Branding</div>
</body>
</html>
`
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(printDoc)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 300)
  }

  function escapeHtml(text: string) {
    const el = document.createElement('div')
    el.textContent = text
    return el.innerHTML
  }

  const isEmpty =
    !clientInfo.companyName &&
    !clientInfo.clientName &&
    !clientInfo.email &&
    items.every((i) => !i.description && i.amount === 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-white flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-blue-500/80" aria-hidden />
            Live Preview
          </h2>
          <p className="text-[12px] text-zinc-500 mt-1">
            Updates as you type
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[13px] font-medium hover:bg-blue-500/30 hover:border-blue-500/50 hover:text-blue-200 active:scale-[0.98] transition-all duration-200 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
        >
          <Printer size={16} strokeWidth={2} aria-hidden /> Print / PDF
        </button>
      </div>

      <div className={`bg-white text-zinc-900 p-8 md:p-10 rounded-2xl shadow-xl shadow-black/40 ring-1 ring-white/20 overflow-hidden transition-shadow duration-300 ${isEmpty ? 'shadow-blue-500/5' : ''}`}>
        {/* Letterhead */}
        <div className="border-b-2 border-black pb-5 mb-6">
          <div className="text-2xl md:text-3xl tracking-[0.2em] font-light">
            ARTERIAZ
          </div>
          <div className="text-[10px] tracking-[0.2em] mt-2 opacity-70">
            Branding • Strategy • Identity
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[10px] tracking-wider opacity-65">
            <span>{formatDate()} | Quotation</span>
            {quotationNumber && (
              <span><strong>No.</strong> {quotationNumber}</span>
            )}
            {reference && <span><strong>Ref.</strong> {reference}</span>}
            {projectName && (
              <span><strong>Project</strong> {projectName}</span>
            )}
          </div>
        </div>

        {/* Client */}
        <div className="text-[13px] leading-relaxed mb-6">
          <strong className="block mb-2 text-zinc-900">To,</strong>
          {clientInfo.companyName ||
          clientInfo.clientName ||
          clientInfo.address ||
          clientInfo.email ? (
            <>
              {clientInfo.companyName && (
                <div className="font-semibold text-zinc-900">
                  {clientInfo.companyName}
                </div>
              )}
              {clientInfo.clientName && (
                <div className="text-zinc-600">Attn: {clientInfo.clientName}</div>
              )}
              {clientInfo.address && <div>{clientInfo.address}</div>}
              {(clientInfo.city || clientInfo.state || clientInfo.pin) && (
                <div className="text-zinc-600">
                  {[clientInfo.city, clientInfo.state, clientInfo.pin]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              )}
              {clientInfo.email && <div>{clientInfo.email}</div>}
              {clientInfo.phone && <div>{clientInfo.phone}</div>}
            </>
          ) : (
            <p className="text-zinc-400 italic">
              Enter client details in the form to see them here
            </p>
          )}
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-[13px] border-collapse min-w-[480px]">
          <thead>
            <tr className="border-b border-black/20">
              <th className="text-left py-2.5 px-3 font-medium opacity-80">#</th>
              <th className="text-left py-2.5 px-3 font-medium opacity-80">
                DESCRIPTION
              </th>
              <th className="text-right py-2.5 px-3 font-medium opacity-80">QTY</th>
              <th className="text-right py-2.5 px-3 font-medium opacity-80">UNIT</th>
              <th className="text-right py-2.5 px-3 font-medium opacity-80">
                RATE ({sym})
              </th>
              <th className="text-right py-2.5 px-3 font-medium opacity-80">
                AMOUNT ({sym})
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className="border-b border-black/10">
                <td className="py-2.5 px-3">{i + 1}</td>
                <td className="py-2.5 px-3">{item.description || '—'}</td>
                <td className="py-2.5 px-3 text-right">
                  {item.quantity.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right">{item.unit}</td>
                <td className="py-2.5 px-3 text-right">
                  {item.rate.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="py-2.5 px-3 text-right font-medium">
                  {item.amount.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Totals */}
        <div className="ml-auto max-w-[300px] mt-6 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-700">
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>{taxLabel} ({taxPercent}%)</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-4 mt-3 border-t-2 border-black">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {paymentTerms && (
          <div className="mt-6 text-xs opacity-80">
            <strong>Payment:</strong> {paymentTerms}
          </div>
        )}

        {remarks && (
          <div className="mt-6 text-xs opacity-80 leading-relaxed whitespace-pre-wrap">
            {remarks}
          </div>
        )}

        <div className="mt-6 text-xs opacity-60">
          Valid for {validityDays} days from date of issue.
        </div>

        <div className="mt-10 text-[10px] opacity-50 text-center tracking-wider">
          © {new Date().getFullYear()} Arteriaz Branding
        </div>
      </div>
    </div>
  )
}
