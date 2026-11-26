import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRight, BadgeCheck, Building2, Check, Copy, Droplets, Eye, FileCheck2, Flower2, Landmark, Leaf, Ruler, ShieldCheck,
  Sparkles, UtensilsCrossed, Wind
} from 'lucide-react';
import usePageMeta from '../utils/usePageMeta';
import { pageMeta } from '../data/pageMeta';
import useReveal from '../utils/useReveal';
import Reveal from '../components/Reveal';
import SiteImg from '../components/SiteImg';

const REGISTRATIONS = [
  {
    id: 'fssai',
    icon: UtensilsCrossed,
    short: 'FSSAI',
    name: 'FSSAI Registration',
    number: '21326177000702',
    authority: 'Food Safety and Standards Authority of India',
    gradient: 'from-emerald-700 to-emerald-900',
    meaning:
      'FSSAI is India’s food safety regulator. Every business that handles, packs or sells food must be registered with it. Our registration means we are a recognised food business that follows the national food safety and hygiene rules.',
    forYou: 'The spices you buy come from a registered food business, and our FSSAI number is printed on every pack.',
  },
  {
    id: 'gst',
    icon: Landmark,
    short: 'GST',
    name: 'GST Registration',
    number: '32AGFPJ8946D1ZH',
    authority: 'Goods and Services Tax, Kerala',
    gradient: 'from-amber-600 to-amber-800',
    meaning:
      'GST registration means we are a tax-registered business in Kerala. The 32 at the start of our GSTIN is Kerala’s state code. Every order comes with a proper tax invoice.',
    forYou: 'Businesses buying from us can claim input tax credit, and every customer gets a proper GST invoice.',
  },
  {
    id: 'udyam',
    icon: Building2,
    short: 'MSME',
    name: 'MSME (Udyam) Registration',
    number: 'UDYAM-KL-03-0041531',
    authority: 'Ministry of Micro, Small & Medium Enterprises',
    gradient: 'from-sky-700 to-sky-900',
    meaning:
      'Udyam registration is the Government of India’s recognition of a micro, small or medium enterprise. It confirms that Idukki Origins is a registered small business from Kerala (KL), Idukki district.',
    forYou: 'When you buy from us, you support a registered local business and the Idukki farmers it works with.',
  }
];

const CHECKS = [
  { icon: Eye, title: 'Colour', text: 'Even, natural colour: deep green cardamom, dark pepper, rich brown cloves and nutmeg.' },
  { icon: Ruler, title: 'Size and grade', text: 'Sorted so each pack holds spices of a consistent size.' },
  { icon: Flower2, title: 'Aroma', text: 'Crushed and smelled: if the aroma is weak, the lot is not packed.' },
  { icon: Droplets, title: 'Dryness', text: 'Properly dried, so the spices keep well and don’t develop mould.' },
  { icon: Wind, title: 'Cleanliness', text: 'Cleaned of dust, stalks, stones and broken or empty pieces.' },
  { icon: Leaf, title: 'Nothing added', text: 'Whole spices only. No colour, polish, filler or blending.' }
];

function CopyNumber({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Number copied');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy');
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${text}`}
      className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-white/25 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// Certificate-style card for one registration
function RegistrationCard({ reg, active, onSelect, delay }) {
  const Icon = reg.icon;
  return (
    <Reveal delay={delay} className="h-full">
      <div
        className={`relative h-full overflow-hidden rounded-3xl bg-gradient-to-br ${reg.gradient} p-6 text-white shadow-xl transition-all duration-300 ${
          active ? 'ring-4 ring-amber-300 -translate-y-1' : 'hover:-translate-y-1'
        }`}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border-[18px] border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-2 h-20 w-20 rounded-full border-4 border-dashed border-white/15" />
        <div className="relative flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
            <Icon className="w-6 h-6" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white/70">{reg.short}</p>
            <p className="font-black leading-tight">{reg.name}</p>
          </div>
        </div>
        <p className="relative mt-6 text-[11px] font-black uppercase tracking-widest text-white/60">Registration number</p>
        <div className="relative mt-1 flex items-center justify-between gap-3">
          <p className="font-mono text-base xl:text-lg font-bold tracking-wide [overflow-wrap:anywhere]">{reg.number}</p>
          <CopyNumber text={reg.number} />
        </div>
        <p className="relative mt-2 text-sm text-white/75">{reg.authority}</p>
        <div className="relative mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold transition-colors ${
              active ? 'bg-amber-300 text-amber-950' : 'bg-white text-gray-900 hover:bg-amber-100'
            }`}
          >
            <Sparkles className="w-4 h-4" /> What it means
          </button>
        </div>
      </div>
    </Reveal>
  );
}

function Explainer({ reg }) {
  return (
    <div key={reg.id} id="explainer" className="scroll-mt-28 grid lg:grid-cols-2 gap-6 animate-[fadeIn_.45s_ease]">
      <div className="rounded-3xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm">
        <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">What it means</p>
        <h3 className="mt-2 text-2xl font-black text-gray-900">{reg.name}</h3>
        <p className="mt-4 text-gray-600 leading-relaxed">{reg.meaning}</p>
        <div className="mt-6 flex gap-3 rounded-2xl bg-emerald-50 p-4">
          <BadgeCheck className="w-5 h-5 shrink-0 text-emerald-700 mt-0.5" />
          <p className="text-sm font-semibold text-emerald-900">
            <span className="font-black">For you: </span>
            {reg.forYou}
          </p>
        </div>
      </div>
      <div className="rounded-3xl bg-emerald-950 p-6 sm:p-8 text-white shadow-sm">
        <p className="text-xs font-black text-emerald-300 uppercase tracking-widest">Registration details</p>
        <h3 className="mt-2 text-2xl font-black">{reg.short}</h3>
        <dl className="mt-6 space-y-4">
          {[
            ['Registration number', reg.number, true],
            ['Issued by', reg.authority],
            ['Registered business', 'Idukki Origins'],
            ['Location', 'Kanjikuzhy, Idukki, Kerala 685606']
          ].map(([label, value, mono]) => (
            <div key={label} className="border-b border-white/10 pb-3 last:border-0">
              <dt className="text-[11px] font-black uppercase tracking-widest text-emerald-300/80">{label}</dt>
              <dd className={`mt-1 text-emerald-50 ${mono ? 'font-mono text-lg font-bold tracking-wide [overflow-wrap:anywhere]' : 'font-semibold'}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

// Ticks the quality checks one by one when the list scrolls into view
function QualityChecklist() {
  const [ref, shown] = useReveal();
  const [ticked, setTicked] = useState(0);
  useEffect(() => {
    if (!shown) return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const id = setInterval(() => {
      setTicked((n) => {
        if (reduced) {
          clearInterval(id);
          return CHECKS.length;
        }
        if (n >= CHECKS.length) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 350);
    return () => clearInterval(id);
  }, [shown]);

  return (
    <div ref={ref} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {CHECKS.map((c, i) => {
        const Icon = c.icon;
        const done = i < ticked;
        return (
          <div
            key={c.title}
            className={`relative rounded-3xl border p-5 transition-all duration-500 ${
              done ? 'bg-white border-emerald-200 shadow-md' : 'bg-white/60 border-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </span>
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                  done ? 'bg-emerald-600 text-white scale-100' : 'bg-gray-100 text-transparent scale-75'
                }`}
                aria-hidden="true"
              >
                <Check className="w-4 h-4" />
              </span>
            </div>
            <h3 className="mt-4 font-black text-gray-900">{c.title}</h3>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">{c.text}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function Certifications() {
  usePageMeta(...pageMeta('/certifications'));
  const [selected, setSelected] = useState(REGISTRATIONS[0].id);
  const current = REGISTRATIONS.find((r) => r.id === selected);

  const select = (id) => {
    setSelected(id);
    document.getElementById('explainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="bg-gray-50 -mt-20 md:-mt-20">
      {/* Hero */}
      <section className="relative min-h-[62vh] flex items-end overflow-hidden bg-emerald-950 text-white">
        <SiteImg size="web"
          src="/images/homepage/homepage-bg1.jpg"
          alt="Graded green cardamom pods"
          className="absolute inset-0 w-full h-full object-cover opacity-50 scale-105 animate-[heroZoom_18s_ease-out_both]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-emerald-950/20" />
        <div className="relative max-w-6xl mx-auto w-full px-4 pt-36 pb-24 sm:pb-28">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-200 animate-[fadeIn_.6s_ease]">
            <ShieldCheck className="w-3.5 h-3.5" /> Registered and compliant
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] animate-[fadeIn_.8s_ease]">
            Registered. Responsible. Real.
          </h1>
          <p className="mt-5 max-w-2xl text-lg sm:text-xl text-emerald-50/90 animate-[fadeIn_1s_ease]">
            Idukki Origins is a registered food business, a GST-registered company and a government-recognised small enterprise. Here is every registration we hold
            and what it means for you.
          </p>
          <div className="mt-8 flex flex-wrap gap-2 animate-[fadeIn_1.2s_ease]">
            {REGISTRATIONS.map((r) => (
              <span key={r.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm font-extrabold">
                <BadgeCheck className="w-4 h-4 text-amber-300" /> {r.short} registered
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Registration cards */}
      <section className="relative -mt-14 max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-4">
          {REGISTRATIONS.map((r, i) => (
            <RegistrationCard key={r.id} reg={r} active={r.id === selected} onSelect={() => select(r.id)} delay={i * 100} />
          ))}
        </div>
      </section>

      {/* Explainer */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-8">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">What each registration means</h2>
            </div>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Registrations">
              {REGISTRATIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={r.id === selected}
                  onClick={() => setSelected(r.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-extrabold transition-all ${
                    r.id === selected ? 'border-emerald-700 bg-emerald-700 text-white shadow-md' : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'
                  }`}
                >
                  {r.short}
                </button>
              ))}
            </div>
          </div>
          <Explainer reg={current} />
        </Reveal>
      </section>

      {/* Quality checks */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Beyond the paperwork</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Six checks before anything is packed</h2>
            <p className="mt-4 text-lg text-gray-600">
              Registrations set the rules. Our own checks set the standard. Every lot, from our farms or our partner farmers, goes through these by hand in
              Idukki.
            </p>
          </div>
        </Reveal>
        <QualityChecklist />
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 px-6 py-12 sm:px-12 text-white">
            <SiteImg size="thumb" loading="lazy" src="/images/blog/cardamom-curing.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-15" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="max-w-xl">
                <FileCheck2 className="w-10 h-10 text-amber-300" />
                <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Need our documents for your business?</h2>
                <p className="mt-3 text-emerald-50/85 text-lg">
                  Buying for a shop, restaurant or company and need copies of our registrations? Ask us and we will send them.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-extrabold text-emerald-800 hover:bg-emerald-50 transition-colors">
                  Contact us <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/about" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-extrabold text-white hover:bg-white/10 transition-colors">
                  How we farm
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
