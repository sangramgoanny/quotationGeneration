import {
  Activity,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Command,
  Filter,
  Flame,
  LayoutDashboard,
  LineChart,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  UsersRound,
  WalletCards,
  Zap,
} from "lucide-react";

const kpis = [
  { label: "Total Leads", value: "1,284", trend: "+12.8%", icon: UsersRound, tone: "blue", helper: "156 new this month" },
  { label: "Hot Leads", value: "184", trend: "+8.4%", icon: Flame, tone: "red", helper: "42 require action" },
  { label: "Estimated Pipeline Value", value: "$4.82M", trend: "+18.6%", icon: CircleDollarSign, tone: "violet", helper: "Weighted forecast $2.1M" },
  { label: "Follow-ups Due", value: "38", trend: "-6.2%", icon: Clock3, tone: "amber", helper: "12 due today" },
  { label: "Conversion Rate", value: "31.7%", trend: "+4.1%", icon: TrendingUp, tone: "emerald", helper: "Qualified to won" },
];

const leads = [
  {
    company: "Northstar Logistics",
    contact: "Priya Menon",
    role: "VP Operations",
    stage: "Qualified",
    score: 92,
    value: "$480,000",
    activity: "Demo completed 2h ago",
    followup: "Today, 4:30 PM",
    user: "Aarav",
    source: "LinkedIn",
  },
  {
    company: "BluePeak Manufacturing",
    contact: "Daniel Wright",
    role: "CFO",
    stage: "Proposal Sent",
    score: 78,
    value: "$310,000",
    activity: "Proposal opened 4 times",
    followup: "Tomorrow, 11:00 AM",
    user: "Mira",
    source: "Website",
  },
  {
    company: "Medivance Clinics",
    contact: "Sneha Rao",
    role: "Director",
    stage: "Negotiation",
    score: 88,
    value: "$720,000",
    activity: "Legal review started",
    followup: "Fri, 2:00 PM",
    user: "Kabir",
    source: "Referral",
  },
  {
    company: "Orbit Retail Group",
    contact: "Marco Silva",
    role: "Head of IT",
    stage: "Contacted",
    score: 64,
    value: "$165,000",
    activity: "Call logged yesterday",
    followup: "Jun 28, 10:30 AM",
    user: "Aarav",
    source: "Google Ads",
  },
  {
    company: "HelioFin Capital",
    contact: "Nisha Kapoor",
    role: "COO",
    stage: "New",
    score: 49,
    value: "$95,000",
    activity: "Inbound form submitted",
    followup: "Jun 29, 3:00 PM",
    user: "Mira",
    source: "Webinar",
  },
  {
    company: "CivicGrid Energy",
    contact: "Oliver Chen",
    role: "Procurement Lead",
    stage: "Won",
    score: 96,
    value: "$1,200,000",
    activity: "Contract signed",
    followup: "Onboarding kickoff",
    user: "Kabir",
    source: "Partner",
  },
  {
    company: "UrbanNest Realty",
    contact: "Farah Ali",
    role: "Founder",
    stage: "Lost",
    score: 34,
    value: "$58,000",
    activity: "Budget deferred",
    followup: "Revisit Q4",
    user: "Isha",
    source: "Cold Email",
  },
];

const nav = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "CRM", icon: UsersRound, children: ["Pipeline", "Leads", "Clients", "Activities", "Follow Ups"] },
  { label: "Sales", icon: WalletCards, children: ["Quotations", "Proposals", "Deals"] },
  { label: "Projects", icon: BriefcaseBusiness },
  { label: "Finance", icon: CircleDollarSign },
  { label: "Reports", icon: LineChart },
  { label: "AI Center", icon: Sparkles },
  { label: "Settings", icon: Settings },
];

const stageStyles: Record<string, string> = {
  New: "bg-slate-100 text-slate-700 ring-slate-200",
  Contacted: "bg-blue-50 text-blue-700 ring-blue-200",
  Qualified: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Proposal Sent": "bg-violet-50 text-violet-700 ring-violet-200",
  Negotiation: "bg-amber-50 text-amber-700 ring-amber-200",
  Won: "bg-green-50 text-green-700 ring-green-200",
  Lost: "bg-red-50 text-red-700 ring-red-200",
};

const scoreTone = (score: number) => {
  if (score >= 80) return { text: "text-emerald-600", ring: "stroke-emerald-500", bg: "stroke-emerald-100", label: "Hot" };
  if (score >= 55) return { text: "text-amber-600", ring: "stroke-amber-500", bg: "stroke-amber-100", label: "Warm" };
  return { text: "text-red-600", ring: "stroke-red-500", bg: "stroke-red-100", label: "Cold" };
};

function KpiCard({ item }: { item: (typeof kpis)[number] }) {
  const Icon = item.icon;
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 shadow-blue-100",
    red: "bg-red-50 text-red-600 shadow-red-100",
    violet: "bg-violet-50 text-violet-600 shadow-violet-100",
    amber: "bg-amber-50 text-amber-600 shadow-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 shadow-emerald-100",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ${tones[item.tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">{item.trend}</span>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{item.label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <h3 className="text-2xl font-bold tracking-tight text-slate-950">{item.value}</h3>
        <span className="h-8 w-20 rounded-lg bg-gradient-to-r from-blue-100 via-violet-100 to-transparent" />
      </div>
      <p className="mt-3 text-xs font-medium text-slate-400">{item.helper}</p>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const tone = scoreTone(score);
  const circumference = 100;
  const dash = (score / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-11 w-11">
        <svg viewBox="0 0 42 42" className="-rotate-90">
          <circle cx="21" cy="21" r="16" fill="none" strokeWidth="4" className={tone.bg} />
          <circle
            cx="21"
            cy="21"
            r="16"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            className={tone.ring}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${tone.text}`}>{score}</span>
      </div>
      <div>
        <p className={`text-sm font-bold ${tone.text}`}>{tone.label}</p>
        <p className="text-xs text-slate-400">AI score</p>
      </div>
    </div>
  );
}

export default function LeadTwoPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] font-[Inter,ui-sans-serif,system-ui] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white px-4 py-5 xl:block">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white shadow-lg shadow-blue-200">
              <Command className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight">Goanny AI CRM</p>
              <p className="text-xs font-medium text-slate-400">Enterprise workspace</p>
            </div>
          </div>

          <nav className="space-y-2">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  <div className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold ${item.label === "CRM" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.children ? <ChevronDown className="h-4 w-4" /> : null}
                  </div>
                  {item.children ? (
                    <div className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-4">
                      {item.children.map((child) => (
                        <div
                          key={child}
                          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${child === "Leads" ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
                        >
                          {child}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-xl lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-600">CRM / Leads Management</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Leads Command Center</h1>
              </div>
              <div className="flex flex-1 items-center gap-3 lg:max-w-3xl">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="Search companies, people, deals, activities..."
                  />
                </div>
                <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-blue-600">
                  <Bell className="h-5 w-5" />
                </button>
                <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-blue-600">
                  <CalendarDays className="h-5 w-5" />
                </button>
                <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-xs font-bold text-white">SG</div>
                  <div className="hidden text-sm lg:block">
                    <p className="font-semibold text-slate-800">Sangram</p>
                    <p className="text-xs text-slate-400">Sales Admin</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="grid flex-1 grid-cols-1 gap-6 p-5 lg:p-8 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {kpis.map((item) => <KpiCard key={item.label} item={item} />)}
              </div>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-100">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold tracking-tight">AI Insights</h2>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                        42 hot leads need action, forecasted revenue is trending 18% above target, and 9 quotations are waiting for decision-maker approval.
                      </p>
                    </div>
                  </div>
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition hover:-translate-y-0.5">
                    <Bot className="h-4 w-4" />
                    Generate action plan
                  </button>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-5">
                  {["Hot leads requiring action", "Revenue forecast $2.1M", "9 pending quotations", "16 inactive leads", "Prioritize CFO buyers"].map((text) => (
                    <div key={text} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                      {text}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.7fr_1fr_1fr_1fr_1fr_1fr_1fr_auto]">
                  <label className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100" placeholder="Search leads" />
                  </label>
                  {["Lead Status", "Source", "Industry", "Assigned User", "Date Range", "Tags"].map((filter) => (
                    <button key={filter} className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:border-blue-200 hover:bg-blue-50">
                      {filter}
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </button>
                  ))}
                  <button className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">
                    <Plus className="h-4 w-4" />
                    Add Lead
                  </button>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">Lead Pipeline</h2>
                    <p className="text-sm text-slate-500">Real-time lead health, ownership, and next-best actions.</p>
                  </div>
                  <button className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    <Filter className="h-4 w-4" />
                    Advanced filters
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left">
                    <thead>
                      <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                        {["Company Name", "Contact Person", "Lead Stage", "AI Score", "Estimated Deal Value", "Last Activity", "Next Follow-up", "Assigned User", "Actions"].map((head) => (
                          <th key={head} className="border-b border-slate-100 px-5 py-3 font-bold">{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr key={lead.company} className="group transition hover:bg-blue-50/40">
                          <td className="border-b border-slate-100 px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                                <Building2 className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{lead.company}</p>
                                <p className="text-xs font-medium text-slate-400">{lead.source}</p>
                              </div>
                            </div>
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4">
                            <p className="font-semibold text-slate-800">{lead.contact}</p>
                            <p className="text-xs text-slate-400">{lead.role}</p>
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${stageStyles[lead.stage]}`}>{lead.stage}</span>
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4"><ScoreRing score={lead.score} /></td>
                          <td className="border-b border-slate-100 px-5 py-4 font-bold text-slate-900">{lead.value}</td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm font-medium text-slate-500">{lead.activity}</td>
                          <td className="border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-700">{lead.followup}</td>
                          <td className="border-b border-slate-100 px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{lead.user[0]}</div>
                              <span className="text-sm font-semibold text-slate-700">{lead.user}</span>
                            </div>
                          </td>
                          <td className="border-b border-slate-100 px-5 py-4">
                            <div className="flex items-center gap-2 text-slate-400">
                              <button className="rounded-lg p-2 hover:bg-white hover:text-blue-600"><Phone className="h-4 w-4" /></button>
                              <button className="rounded-lg p-2 hover:bg-white hover:text-blue-600"><Mail className="h-4 w-4" /></button>
                              <button className="rounded-lg p-2 hover:bg-white hover:text-blue-600"><MoreHorizontal className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold">AI Assistant</h2>
                    <p className="text-xs font-medium text-slate-400">Live CRM intelligence</p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <PanelBlock icon={CheckCircle2} title="Today's Tasks" items={["Call Northstar before 4:30 PM", "Send revised ERP quote to BluePeak", "Confirm Medivance legal timeline"]} />
                  <PanelBlock icon={Sparkles} title="AI Recommendations" items={["Move Northstar to negotiation", "Offer CFO ROI calculator to HelioFin", "Reactivate Orbit with migration audit"]} />
                  <PanelBlock icon={Zap} title="Revenue Opportunities" items={["$720K Medivance expansion risk is low", "$480K Northstar has 92 hot score", "$310K BluePeak needs pricing approval"]} />
                  <PanelBlock icon={Activity} title="Recent Activities" items={["Proposal viewed by BluePeak CFO", "CivicGrid deal moved to won", "New inbound lead from webinar"]} />
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>

      <button className="fixed bottom-6 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white shadow-2xl shadow-blue-300 transition hover:-translate-y-1">
        <MessageSquareText className="h-7 w-7" />
      </button>
    </main>
  );
}

function PanelBlock({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium leading-5 text-slate-600">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
