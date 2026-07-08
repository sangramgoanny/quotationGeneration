import {
  ArrowUpRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Filter,
  Flame,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

const stages = [
  {
    name: "New Leads",
    count: 18,
    value: "$642K",
    tone: "blue",
    deals: [
      { company: "Northstar Logistics", owner: "Aarav", value: "$120K", score: 92, next: "Call today", tag: "ERP" },
      { company: "HelioFin Capital", owner: "Mira", value: "$95K", score: 68, next: "Discovery", tag: "Finance" },
      { company: "UrbanNest Realty", owner: "Isha", value: "$58K", score: 54, next: "Qualify", tag: "CRM" },
    ],
  },
  {
    name: "Qualified",
    count: 14,
    value: "$1.18M",
    tone: "emerald",
    deals: [
      { company: "BluePeak Manufacturing", owner: "Mira", value: "$310K", score: 81, next: "ROI review", tag: "Manufacturing" },
      { company: "Orbit Retail Group", owner: "Aarav", value: "$165K", score: 74, next: "Demo follow-up", tag: "Retail" },
      { company: "CivicGrid Energy", owner: "Kabir", value: "$420K", score: 89, next: "Tech scope", tag: "Energy" },
    ],
  },
  {
    name: "Proposal",
    count: 9,
    value: "$1.46M",
    tone: "violet",
    deals: [
      { company: "Medivance Clinics", owner: "Kabir", value: "$720K", score: 88, next: "Legal review", tag: "Healthcare" },
      { company: "Aster Cloud Labs", owner: "Isha", value: "$260K", score: 76, next: "Quote revision", tag: "SaaS" },
      { company: "PrimeAxis Foods", owner: "Mira", value: "$185K", score: 70, next: "Decision sync", tag: "FMCG" },
    ],
  },
  {
    name: "Negotiation",
    count: 6,
    value: "$980K",
    tone: "amber",
    deals: [
      { company: "Greenline Infra", owner: "Aarav", value: "$390K", score: 84, next: "Pricing approval", tag: "Infra" },
      { company: "Novara Textiles", owner: "Kabir", value: "$210K", score: 71, next: "Procurement call", tag: "ERP" },
    ],
  },
  {
    name: "Won",
    count: 11,
    value: "$2.24M",
    tone: "red",
    deals: [
      { company: "CivicGrid Energy", owner: "Kabir", value: "$1.2M", score: 96, next: "Onboarding", tag: "Enterprise" },
      { company: "Vantage Schools", owner: "Isha", value: "$340K", score: 91, next: "Kickoff", tag: "Education" },
    ],
  },
];

const kpis = [
  { label: "Pipeline Value", value: "$6.5M", trend: "+18.4%", icon: CircleDollarSign },
  { label: "Active Deals", value: "58", trend: "+9.2%", icon: BriefcaseBusiness },
  { label: "Win Probability", value: "42%", trend: "+6.1%", icon: Target },
  { label: "Avg. Deal Cycle", value: "24d", trend: "-3.5%", icon: Clock3 },
];

const toneMap: Record<string, string> = {
  blue: "from-[#0070B8] to-[#0EA5E9]",
  emerald: "from-[#059669] to-[#22C55E]",
  violet: "from-[#2563EB] to-[#7C3AED]",
  amber: "from-[#D97706] to-[#F59E0B]",
  red: "from-[#E60046] to-[#FB7185]",
};

function scoreColor(score: number) {
  if (score >= 85) return "text-emerald-600 bg-emerald-50 ring-emerald-100";
  if (score >= 70) return "text-amber-600 bg-amber-50 ring-amber-100";
  return "text-rose-600 bg-rose-50 ring-rose-100";
}

export default function PipelinePage() {
  return (
    <div className="min-h-full space-y-6 bg-slate-100 font-[Inter,ui-sans-serif,system-ui]">
      <section className="overflow-hidden rounded-[24px] border border-white bg-[#061526] shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <div className="relative p-6 lg:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(14,165,233,0.28),transparent_28%),radial-gradient(circle_at_88%_10%,rgba(230,0,70,0.22),transparent_28%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-sky-100">
                <Sparkles className="h-3.5 w-3.5 text-[#0EA5E9]" />
                Goanny AI Pipeline
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white lg:text-4xl">Sales Pipeline Command Board</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Track deal movement, revenue risk, AI score, owners, and next actions across every stage of your CRM pipeline.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-4 text-sm font-bold text-white backdrop-blur transition hover:bg-white/14">
                <CalendarDays className="h-4 w-4" />
                This Quarter
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              <button className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-[#063A66] shadow-lg shadow-sky-950/20 transition hover:-translate-y-0.5">
                <Plus className="h-4 w-4" />
                Add Deal
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(15,23,42,0.10)]">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0070B8] to-[#0EA5E9] text-white shadow-lg shadow-sky-100">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">{item.trend}</span>
              </div>
              <p className="mt-5 text-sm font-semibold text-slate-500">{item.label}</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{item.value}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
              <label className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100" placeholder="Search deals, companies, contacts..." />
              </label>
              {["Stage", "Owner", "Deal Size"].map((filter) => (
                <button key={filter} className="flex h-11 items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50">
                  {filter}
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              ))}
              <button className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:-translate-y-0.5">
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[1180px] grid-cols-5 gap-4">
              {stages.map((stage) => (
                <section key={stage.name} className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                  <div className="mb-3 rounded-2xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full bg-gradient-to-br ${toneMap[stage.tone]}`} />
                        <h2 className="text-sm font-black text-slate-900">{stage.name}</h2>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">{stage.count}</span>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <p className="text-2xl font-black tracking-tight text-slate-950">{stage.value}</p>
                      <BarChart3 className="h-4 w-4 text-slate-300" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {stage.deals.map((deal) => (
                      <article key={deal.company} className="group rounded-[18px] border border-slate-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_16px_36px_rgba(14,165,233,0.12)]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-black text-slate-900">{deal.company}</h3>
                            <p className="mt-1 text-xs font-semibold text-slate-400">Owner: {deal.owner}</p>
                          </div>
                          <button className="rounded-xl p-1.5 text-slate-300 transition hover:bg-slate-50 hover:text-slate-600">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-lg font-black text-slate-950">{deal.value}</span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${scoreColor(deal.score)}`}>{deal.score}</span>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">{deal.tag}</span>
                          <span className="text-[11px] font-bold text-sky-600">{deal.next}</span>
                        </div>

                        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                          <button className="flex h-8 flex-1 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-sky-50 hover:text-sky-600">
                            <Phone className="h-3.5 w-3.5" />
                          </button>
                          <button className="flex h-8 flex-1 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-sky-50 hover:text-sky-600">
                            <Mail className="h-3.5 w-3.5" />
                          </button>
                          <button className="flex h-8 flex-1 items-center justify-center rounded-xl bg-slate-950 text-white transition hover:bg-[#0070B8]">
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0070B8] to-[#E60046] text-white shadow-lg shadow-sky-100">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-950">AI Pipeline Coach</h2>
                <p className="text-xs font-semibold text-slate-400">Next-best actions</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ["High intent", "Northstar is 92% likely to move if pricing is sent today.", Flame],
                ["Risk alert", "Medivance legal review is slowing by 3 days.", Clock3],
                ["Fast win", "CivicGrid onboarding can unlock expansion revenue.", CheckCircle2],
                ["Forecast", "Quarter-end target is tracking 14% above plan.", TrendingUp],
              ].map(([title, text, Icon]) => (
                <div key={String(title)} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[#0070B8]" />
                    <p className="text-sm font-black text-slate-800">{String(title)}</p>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-slate-500">{String(text)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border border-slate-200 bg-[#061526] p-5 text-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-sky-200">Weighted Forecast</p>
                <p className="mt-2 text-3xl font-black">$3.84M</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Zap className="h-5 w-5 text-[#0EA5E9]" />
              </div>
            </div>
            <div className="mt-5 h-2 rounded-full bg-white/10">
              <div className="h-2 w-[72%] rounded-full bg-gradient-to-r from-[#0070B8] to-[#E60046]" />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-400">72% of quarterly target covered by active pipeline.</p>
          </section>
        </aside>
      </section>
    </div>
  );
}
