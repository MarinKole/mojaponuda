import Link from "next/link";
import {
  FolderSearch,
  Clock,
  EyeOff,
  Shield,
  LayoutDashboard,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  ChevronDown,
  Upload,
  BarChart3,
  FileText,
  Briefcase,
  Search,
  ChevronRight,
  Minus,
  Plus,
} from "lucide-react";

function NavBar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-slate-800 bg-[#020611]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="font-serif text-lg font-bold tracking-tight text-white">
            MojaPonuda
          </span>
          <span className="font-serif text-lg font-bold text-blue-500">.ba</span>
        </Link>

        <div className="hidden items-center gap-8 sm:flex">
          <a href="#problem" className="text-xs font-medium uppercase tracking-wider text-slate-400 transition-colors hover:text-white">
            Problem
          </a>
          <a href="#kako-radi" className="text-xs font-medium uppercase tracking-wider text-slate-400 transition-colors hover:text-white">
            Metodologija
          </a>
          <a href="#rjesenje" className="text-xs font-medium uppercase tracking-wider text-slate-400 transition-colors hover:text-white">
            Platforma
          </a>
          <a href="#cijene" className="text-xs font-medium uppercase tracking-wider text-slate-400 transition-colors hover:text-white">
            Pristup
          </a>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-medium uppercase tracking-wider text-slate-400 transition-colors hover:text-white"
          >
            Prijava
          </Link>
          <Link
            href="/signup"
            className="rounded-none bg-white px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#020611] transition-colors hover:bg-slate-200"
          >
            Pristup sistemu
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ... HeroSection is already updated ...

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#020611] px-6 pb-24 pt-32 sm:pb-32 sm:pt-40">
      {/* Abstract grid background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#1e3a8a15_1px,transparent_1px),linear-gradient(to_bottom,#1e3a8a15_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020611_100%)]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#1e3a8a]/40 bg-[#1e3a8a]/10 px-3 py-1 mb-6">
              <span className="flex size-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-blue-400">
                MojaPonuda.ba Platforma 2.0
              </span>
            </div>

            <h1 className="font-serif text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Pripremite ponudu
              <br />
              <span className="text-blue-500">bez ijedne greške.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
              Jedina platforma za upravljanje tenderskom dokumentacijom i analizu javnih nabavki u Bosni i Hercegovini. 
              Eliminišite administrativne greške i pobjeđujte na tenderima na osnovu podataka.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-none bg-blue-600 px-8 text-sm font-semibold text-white transition-all hover:bg-blue-500"
              >
                Započnite besplatno
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#kako-radi"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-none border border-slate-700 bg-transparent px-8 text-sm font-semibold text-slate-300 transition-all hover:border-slate-500 hover:text-white"
              >
                Upoznajte platformu
              </a>
            </div>

            <div className="mt-10 flex items-center gap-6 border-t border-slate-800 pt-6">
              <div className="flex flex-col">
                <span className="font-mono text-2xl font-bold text-white">4.8B+</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Analiziranih KM</span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="flex flex-col">
                <span className="font-mono text-2xl font-bold text-white">12k+</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Dnevnih tendera</span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div className="flex flex-col">
                <span className="font-mono text-2xl font-bold text-white">0%</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Margina greške</span>
              </div>
            </div>
          </div>

          {/* High-end Bloomberg Terminal Mockup */}
          <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
            <div className="absolute -inset-0.5 rounded-sm bg-gradient-to-b from-blue-500/30 to-transparent opacity-50 blur-xl" />
            <div className="relative overflow-hidden rounded-sm border border-slate-800 bg-[#060b17] shadow-2xl">
              
              {/* Terminal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-[#020611] px-4 py-2">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="size-2 rounded-sm bg-slate-700" />
                    <div className="size-2 rounded-sm bg-slate-700" />
                    <div className="size-2 rounded-sm bg-slate-700" />
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">SYS.TER.01 // MARKET_INTEL</span>
                </div>
                <div className="font-mono text-[10px] text-blue-500/70">
                  LIVE<span className="ml-1 inline-block size-1.5 animate-pulse rounded-full bg-blue-500" />
                </div>
              </div>

              {/* Terminal Content */}
              <div className="p-5">
                <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-mono text-xs font-bold text-white">TENDER_ANALYSIS_DASHBOARD</h3>
                    <p className="mt-1 font-mono text-[10px] text-slate-500">Analiza tržišta javnih nabavki - Sektor građevine (Q3)</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-emerald-400">STATUS: OPTIMAL</div>
                    <div className="font-mono text-[10px] text-slate-500">LATENCY: 12ms</div>
                  </div>
                </div>

                {/* Data Grid */}
                <div className="grid grid-cols-4 gap-px bg-slate-800">
                  {[
                    { label: "VOLUMEN (BAM)", val: "142.5M", change: "+12.4%", color: "text-emerald-400" },
                    { label: "AKTIVNI TENDERI", val: "843", change: "+4.1%", color: "text-emerald-400" },
                    { label: "PROS. ZAKASNJENJE", val: "0.4D", change: "-2.1%", color: "text-emerald-400" },
                    { label: "UPOZORENJA", val: "12", change: "+3.0%", color: "text-red-400" },
                  ].map((s, i) => (
                    <div key={i} className="bg-[#060b17] p-3">
                      <div className="font-mono text-[9px] text-slate-500">{s.label}</div>
                      <div className="mt-1 font-mono text-lg font-bold text-white">{s.val}</div>
                      <div className={`mt-1 font-mono text-[9px] ${s.color}`}>{s.change} vs LAST Q</div>
                    </div>
                  ))}
                </div>

                {/* Chart Mockup */}
                <div className="mt-4 rounded-sm border border-slate-800 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-400">WIN_RATE_PROJECTION</span>
                    <div className="flex gap-2">
                      <span className="font-mono text-[9px] text-blue-400">■ COMPETITOR A</span>
                      <span className="font-mono text-[9px] text-emerald-400">■ OUR MODEL</span>
                    </div>
                  </div>
                  <div className="relative h-32 w-full border-b border-l border-slate-800">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-px w-full bg-slate-800/50" />
                      ))}
                    </div>
                    {/* Graph line 1 (Our model) */}
                    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                      <path d="M0 100 Q 50 80, 100 90 T 200 60 T 300 30 T 400 20" fill="none" stroke="#34d399" strokeWidth="2" />
                      <path d="M0 100 Q 50 80, 100 90 T 200 60 T 300 30 T 400 20 L 400 128 L 0 128 Z" fill="url(#grad-emerald)" opacity="0.1" />
                      <defs>
                        <linearGradient id="grad-emerald" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                      </defs>
                    </svg>
                    {/* Graph line 2 (Competitor) */}
                    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                      <path d="M0 110 Q 50 100, 100 110 T 200 90 T 300 80 T 400 85" fill="none" stroke="#60a5fa" strokeWidth="1" strokeDasharray="4 4" />
                    </svg>
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[9px] text-slate-600">
                    <span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span>
                  </div>
                </div>

                {/* Log Output */}
                <div className="mt-4 rounded-sm bg-[#020611] p-3 font-mono text-[10px] leading-relaxed text-slate-500">
                  <div><span className="text-blue-500">&gt;</span> SYSTEM_INIT_ROUTINE</div>
                  <div><span className="text-blue-500">&gt;</span> FETCHING_EJN_DATA_STREAM... <span className="text-emerald-400">OK</span></div>
                  <div><span className="text-blue-500">&gt;</span> RUNNING_AI_DOC_ANALYSIS... <span className="text-emerald-400">OK</span></div>
                  <div><span className="text-blue-500">&gt;</span> DETECTED_3_EXPIRING_CERTS: [TAX, COURT, BANK]</div>
                  <div className="text-amber-400"><span className="text-amber-400">&gt;</span> ALERT: UPLOAD_NEW_DOCS_BEFORE_2024_08_15</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PROBLEMS = [
  {
    icon: FolderSearch,
    title: "DOKUMENTACIJA_RASUTA",
    description:
      "Uvjerenje o registraciji u jednom folderu, potvrda o porezu u emailu, garancija na desktopu. Gubitak vremena na svakom novom tenderu.",
  },
  {
    icon: Clock,
    title: "ROKOVI_ISTEKLI",
    description:
      "Dokument istekne usred pripreme ponude. Nema automatskog upozorenja. Diskvalifikacija zbog administrativnog propusta.",
  },
  {
    icon: EyeOff,
    title: "SLIJEPA_TACKA",
    description:
      "Nedostatak podataka o tome ko pobjeđuje, po kojim cijenama i koji tenderi dolaze. Konkurencija koristi podatke, vi ne.",
  },
] as const;

function ProblemSection() {
  return (
    <section id="problem" className="border-t border-slate-800 bg-[#020611] px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-1.5 bg-red-500" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Identifikacija_Problema
              </p>
            </div>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Priprema ponude je 
              <span className="text-slate-500"> administrativni haos.</span>
            </h2>
          </div>
          <p className="max-w-md text-sm text-slate-400">
            Većina firmi u BiH gubi ugovore ne zbog cijene ili kvaliteta, već zbog banalne papirologije i nedostatka pravovremenih informacija.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {PROBLEMS.map((p, i) => (
            <div
              key={p.title}
              className="group relative border border-slate-800 bg-[#060b17] p-8 transition-colors hover:border-slate-700"
            >
              <div className="mb-6 font-mono text-[10px] text-slate-600">
                0{i + 1} // ERROR_STATE
              </div>
              <div className="mb-6 flex size-12 items-center justify-center border border-slate-800 bg-[#020611] text-slate-400 group-hover:text-red-400 transition-colors">
                <p.icon className="size-5" />
              </div>
              <h3 className="mb-3 font-mono text-sm font-bold text-white">
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-400">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "DATA_INGESTION",
    label: "Skladištenje i validacija",
    description: "Centralizovani trezor dokumenata sa automatskim praćenjem rokova trajanja (60, 30 i 7 dana).",
    icon: Upload,
  },
  {
    step: "02",
    title: "AI_PROCESSING",
    label: "Analiza tenderske dokumentacije",
    description: "Algoritam čita PDF tendera, izdvaja zahtjeve i kreira interaktivnu checklistu potrebnih dokumenata.",
    icon: LayoutDashboard,
  },
  {
    step: "03",
    title: "MARKET_INTEL",
    label: "Strateško pozicioniranje",
    description: "Pristup historijskim podacima o cijenama i konkurenciji za optimizaciju finansijske ponude.",
    icon: TrendingUp,
  },
] as const;

function HowItWorksSection() {
  return (
    <section id="kako-radi" className="border-t border-slate-800 bg-[#060b17] px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-2">
          <span className="size-1.5 bg-blue-500" />
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Sistemska_Metodologija
          </p>
        </div>
        <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Kako platforma 
          <span className="text-blue-500"> eliminiše greške.</span>
        </h2>

        <div className="mt-16 grid gap-0 sm:grid-cols-3 border border-slate-800">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.step} className={`relative p-8 ${i !== 2 ? 'border-b sm:border-b-0 sm:border-r border-slate-800' : ''}`}>
              <div className="mb-8 flex items-center justify-between">
                <span className="font-mono text-3xl font-light text-slate-800">
                  {s.step}
                </span>
                <s.icon className="size-6 text-slate-500" />
              </div>
              <h3 className="font-mono text-sm font-bold text-blue-400">
                {s.title}
              </h3>
              <p className="mt-2 text-xs font-medium text-white">
                {s.label}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: Shield,
    title: "SECURE_VAULT",
    label: "Trezor dokumenata",
    description:
      "Centralizovano, enkriptovano skladište za sve dokumente vaše firme. Praćenje rokova važenja na nivou dana.",
    details: [
      "Upload jednom, koristite na svakom tenderu",
      "Sistem upozorenja (60/30/7 dana prije isteka)",
      "Organizacija po klasama i tipovima dokumenata",
    ],
  },
  {
    icon: LayoutDashboard,
    title: "BID_WORKSPACE",
    label: "Radni prostor za ponude",
    description:
      "Zasebno okruženje za svaki tender. NLP analiza tenderske dokumentacije izvlači obavezne uslove i kreira dinamičku listu.",
    details: [
      "AI ekstrakcija uslova iz PDF/Word fajlova",
      "Validacija poklapanja s vašim trezorom",
      "Automatsko generisanje finalnog paketa ponude",
    ],
  },
  {
    icon: TrendingUp,
    title: "MARKET_ANALYTICS",
    label: "Tržišna inteligencija",
    description:
      "Otkrijte obrasce u javnim nabavkama. Saznajte po kojim cijenama konkurencija dobija ugovore i predvidite buduće tendere.",
    details: [
      "Analiza historije pobjeda po naručiocima",
      "Predviđanje cijena na osnovu prošlih ugovora",
      "Rani pristup planovima javnih nabavki",
    ],
  },
] as const;

function SolutionSection() {
  return (
    <section id="rjesenje" className="border-t border-slate-800 bg-[#020611] px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-2">
          <span className="size-1.5 bg-blue-500" />
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Arhitektura_Sistema
          </p>
        </div>
        <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Kompletan tehnološki stack za 
          <span className="text-slate-500"> javne nabavke.</span>
        </h2>

        <div className="mt-20 space-y-24">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`flex flex-col items-center gap-16 lg:flex-row ${
                i % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Technical Mockup Side */}
              <div className="w-full flex-1">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-slate-800 bg-[#060b17]">
                  {/* Decorative corner brackets */}
                  <div className="absolute left-0 top-0 size-4 border-l border-t border-slate-600" />
                  <div className="absolute right-0 top-0 size-4 border-r border-t border-slate-600" />
                  <div className="absolute bottom-0 left-0 size-4 border-b border-l border-slate-600" />
                  <div className="absolute bottom-0 right-0 size-4 border-b border-r border-slate-600" />
                  
                  <div className="absolute inset-0 p-6">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="font-mono text-[10px] text-slate-500">MODULE // {f.title}</div>
                      <div className="font-mono text-[10px] text-emerald-400">ACTIVE</div>
                    </div>
                    
                    <div className="flex h-[calc(100%-2rem)] flex-col gap-3">
                      {[1, 2, 3, 4, 5].map((row) => (
                        <div key={row} className="flex flex-1 items-center gap-4 bg-[#020611] p-3 border border-slate-800/50">
                          <div className={`size-1.5 shrink-0 ${row <= 3 ? "bg-emerald-500" : row === 4 ? "bg-amber-500" : "bg-slate-700"}`} />
                          <div className="flex-1 space-y-2">
                            <div className="h-1.5 rounded-sm bg-slate-700" style={{ width: `${Math.random() * 40 + 30}%` }} />
                            <div className="h-1.5 rounded-sm bg-slate-800" style={{ width: `${Math.random() * 20 + 10}%` }} />
                          </div>
                          <div className="font-mono text-[9px] text-slate-600">
                            {(Math.random() * 100).toFixed(2)}ms
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Side */}
              <div className="flex-1">
                <div className="mb-6 font-mono text-[10px] text-slate-500">
                  // {f.title}
                </div>
                <h3 className="font-serif text-2xl font-bold text-white">
                  {f.label}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-slate-400">
                  {f.description}
                </p>
                <div className="mt-8 space-y-4 border-l border-slate-800 pl-6">
                  {f.details.map((d) => (
                    <div key={d} className="flex items-start gap-3">
                      <div className="mt-1.5 size-1 shrink-0 bg-blue-500" />
                      <span className="text-sm text-slate-300">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { value: "3x", label: "Brža priprema ponude", metric: "EFFICIENCY_GAIN" },
    { value: "0", label: "Propuštenih rokova", metric: "ERROR_RATE" },
    { value: "100%", label: "Dokumenata na jednom mjestu", metric: "DATA_CENTRALIZATION" },
    { value: "24/7", label: "Pristup platformi", metric: "UPTIME" },
  ];

  return (
    <section className="border-t border-slate-800 bg-[#020611] px-6 py-20">
      <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border-l border-slate-800 pl-6">
            <div className="font-mono text-[10px] text-slate-500 mb-2">METRIC // {s.metric}</div>
            <p className="font-mono text-4xl font-light tracking-tight text-white">
              {s.value}
            </p>
            <p className="mt-2 text-sm text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TestimonialSection() {
  return (
    <section className="border-t border-slate-800 bg-[#060b17] px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="size-1.5 bg-blue-500" />
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Validacija_Trzista
          </p>
        </div>
        <div className="relative">
          {/* Quotes */}
          <div className="absolute -top-10 left-0 font-serif text-8xl text-slate-800/50">"</div>
          <p className="relative z-10 font-serif text-xl leading-relaxed text-slate-300 sm:text-2xl">
            Prije platforme, priprema jedne ponude nam je trajala 3-4
            dana. Sad nam treba dan, a nismo propustili nijedan rok. 
            Za firmu koja učestvuje na 20 tendera godišnje, ROI je momentalan.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <div className="flex size-12 items-center justify-center bg-slate-800 font-mono text-sm text-slate-300">
              MH
            </div>
            <div className="text-left">
              <p className="font-mono text-sm font-bold text-white">Mirza Hodžić</p>
              <p className="font-mono text-[10px] text-slate-500">
                DIREKTOR // GRADNJA PLUS D.O.O.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PRICING_FEATURES = [
  "Trezor dokumenata s upozorenjima za istek",
  "Radni prostor za svaki tender",
  "AI ekstrakcija uslova iz dokumentacije",
  "Automatski checklist obaveznih dokumenata",
  "Izvoz PDF paketa ponude",
  "Pretraga i praćenje aktivnih tendera",
  "Tržišna analitika (pobjednici, cijene)",
  "Planirane nabavke (rani pristup)",
] as const;

function PricingSection() {
  return (
    <section id="cijene" className="border-t border-slate-800 bg-[#020611] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2">
          <span className="size-1.5 bg-blue-500" />
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Komercijalni_Model
          </p>
        </div>
        <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Predvidljiva i 
          <span className="text-blue-500"> transparentna licenca.</span>
        </h2>

        <div className="mx-auto mt-16 grid max-w-4xl gap-6 lg:grid-cols-2">
          {/* Free */}
          <div className="border border-slate-800 bg-[#060b17] p-8 transition-colors hover:border-slate-700">
            <h3 className="font-mono text-sm font-bold text-slate-400">EVALUATION_LICENSE</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-mono text-4xl font-light text-white">0</span>
              <span className="font-mono text-[10px] text-slate-500">BAM / MJESEČNO</span>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Validacija sistema na stvarnim podacima.
            </p>
            <div className="mt-8 space-y-3 border-t border-slate-800 pt-6">
              {[
                "Ograničeno na 3 ponude",
                "Trezor dokumenata",
                "Pretraga tendera",
                "Osnovna analitika",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <div className="mt-1.5 size-1 shrink-0 bg-slate-600" />
                  <span className="text-sm text-slate-300">{f}</span>
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="mt-8 flex w-full items-center justify-center border border-slate-700 bg-transparent py-3 text-xs font-bold uppercase tracking-wider text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
            >
              Inicijalizacija Evaluacije
            </Link>
          </div>

          {/* Pro */}
          <div className="relative border border-blue-500/30 bg-[#060b17] p-8 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
            <div className="absolute top-0 right-8 -translate-y-1/2 bg-blue-500 px-3 py-1 font-mono text-[10px] font-bold text-white">
              OPTIMAL_CHOICE
            </div>
            <h3 className="font-mono text-sm font-bold text-blue-400">ENTERPRISE_LICENSE</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-mono text-4xl font-light text-white">150</span>
              <span className="font-mono text-[10px] text-slate-500">BAM / MJESEČNO</span>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Puna snaga platforme za serijske ponuđače.
            </p>
            <div className="mt-8 space-y-3 border-t border-slate-800 pt-6">
              {PRICING_FEATURES.map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <div className="mt-1.5 size-1 shrink-0 bg-blue-500" />
                  <span className="text-sm text-slate-300">{f}</span>
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="mt-8 flex w-full items-center justify-center bg-blue-600 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-blue-500"
            >
              Aktivacija Licence
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: "Da li postoji ugovorna obaveza?",
    a: "Ne. Licenca je na mjesečnom nivou i može se otkazati u bilo kojem trenutku iz dashboarda. Podaci ostaju dostupni u read-only formatu do kraja tekućeg obračunskog perioda.",
  },
  {
    q: "Koji formati dokumenata su podržani?",
    a: "Sistem prihvata PDF, PNG i JPG formate do veličine od 10MB po dokumentu. Preporučujemo skeniranje u PDF formatu za optimalnu čitljivost.",
  },
  {
    q: "Kako funkcioniše AI ekstrakcija uslova?",
    a: "Sistem koristi napredne modele za obradu prirodnog jezika (NLP) koji čitaju tendersku dokumentaciju, identificiraju sekcije koje propisuju uslove kvalifikacije i generišu strukturiranu listu.",
  },
  {
    q: "Koliko često se ažuriraju podaci o tenderima?",
    a: "Podaci se sinhronizuju sa zvaničnim e-Procurement portalom (ejn.gov.ba) u realnom vremenu, osiguravajući da uvijek imate najnovije informacije o objavama i odlukama.",
  },
  {
    q: "Gdje se čuvaju moji podaci?",
    a: "Podaci se čuvaju u sigurnim cloud instancama koristeći Supabase infrastrukturu s Row Level Security (RLS) politikama, što znači da su vaši podaci strogo izolirani od drugih korisnika.",
  },
] as const;

function FAQSection() {
  return (
    <section className="border-t border-slate-800 bg-[#060b17] px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2 mb-8">
          <span className="size-1.5 bg-blue-500" />
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Knowledge_Base
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="group border border-slate-800 bg-[#020611] transition-colors hover:border-slate-700"
            >
              <summary className="flex cursor-pointer items-center justify-between p-6 text-sm font-bold text-white [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="font-mono text-xs text-slate-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="border-t border-slate-800/50 p-6 pt-0">
                <p className="mt-4 text-sm leading-relaxed text-slate-400">
                  {item.a}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="border-t border-slate-800 bg-[#020611] px-6 py-32">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Optimizirajte proces prikupljanja dokumentacije.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base text-slate-400">
          Ukinite ručni rad i prepustite praćenje rokova i uslova sistemu izgrađenom za profesionalne nabavke.
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center gap-2 bg-white px-8 text-sm font-bold uppercase tracking-wider text-[#020611] transition-colors hover:bg-slate-200"
          >
            Pristup sistemu
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-[#060b17] px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-serif text-sm font-bold text-white">
                MojaPonuda
              </span>
              <span className="font-serif text-sm font-bold text-blue-500">
                .ba
              </span>
            </div>
            <p className="mt-2 font-mono text-[10px] text-slate-500">
              SYSTEM_VERSION: 2.0.4 // MARKET_DATA: ACTIVE
            </p>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="font-mono text-[10px] uppercase tracking-widest text-slate-500 transition-colors hover:text-white"
            >
              Politika privatnosti
            </Link>
            <Link
              href="/terms"
              className="font-mono text-[10px] uppercase tracking-widest text-slate-500 transition-colors hover:text-white"
            >
              Uvjeti korištenja
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <SolutionSection />
      <StatsSection />
      <TestimonialSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
