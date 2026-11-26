import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, Bug, CloudRain, Droplets, FlaskConical, Handshake, Layers, Leaf, MapPin, Mountain,
  Scissors, ShieldCheck, Sprout, Star, Sun, Tractor, Trees
} from 'lucide-react';
import usePageMeta from '../utils/usePageMeta';
import { pageMeta } from '../data/pageMeta';
import Reveal from '../components/Reveal';
import useReveal from '../utils/useReveal';
import SiteImg from '../components/SiteImg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';


// Counts up to `to` once visible
function CountUp({ to }) {
  const [ref, shown] = useReveal();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!shown) return undefined;
    if (to === 0) return undefined;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1200);
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [shown, to]);
  return <span ref={ref}>{value}</span>;
}

const SPICE_WORDS = ['black pepper', 'cardamom', 'nutmeg', 'cloves'];

function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % SPICE_WORDS.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <span key={i} className="inline-block text-amber-300 animate-[fadeIn_.5s_ease]">
      {SPICE_WORDS[i]}
    </span>
  );
}

const SOURCES = {
  farms: {
    label: 'Our own farms',
    icon: Tractor,
    image: '/images/farmers/raju/farm1.jpg',
    alt: 'Pepper vines climbing support trees on an Idukki farm',
    title: 'Grown by us, under the Idukki Origins name',
    text: 'We manage our own farms in Idukki, where we grow black pepper, cardamom, nutmeg and cloves together in one integrated system. Because we farm the land ourselves, we control every step: the planting material, how the soil is fed, when each crop is picked and how it is dried.',
    points: ['Pepper, cardamom, nutmeg and cloves grown side by side', 'Scientific, research-backed farming methods', 'Harvested, cured and dried under our own eye']
  },
  partners: {
    label: 'Partner farmers',
    icon: Handshake,
    image: '/images/farmers/bibin/farm2.jpg',
    alt: 'Cardamom plants under shade trees on a partner farm',
    title: 'Bought directly from Idukki farmers we know',
    text: 'We also buy from neighbouring family farmers in Idukki. There are no middlemen in between: we pay the farmer directly and fairly, and every lot is checked for colour, size, aroma, cleanliness and dryness before it is accepted.',
    points: ['Direct trade and fair prices for farmers', 'Every lot quality-checked before we buy it', 'Farmers you can meet on our website']
  }
};

// The integrated farm, from the treetops down to the soil
const LAYERS = [
  {
    id: 'canopy',
    icon: Trees,
    name: 'Shade canopy',
    height: 'Tallest layer',
    image: '/images/blog/cardamom-planting.jpg',
    alt: 'Tall shade trees over a spice farm',
    text: 'Tall trees filter the strong sun, keep the farm cool and moist, shelter the soil from heavy monsoon rain and drop leaves that become mulch. We prune them before the monsoon so each crop below gets the right amount of light.',
    color: 'from-emerald-900 to-emerald-800'
  },
  {
    id: 'pepper',
    icon: Leaf,
    name: 'Black pepper vines',
    height: 'Climbing the trees',
    image: '/images/pepper/pepper-2.jpg',
    alt: 'Green pepper spikes hanging from the vine',
    text: 'Pepper is a climbing vine. It grows up living support trees, using vertical space that would otherwise be empty, so the same land gives an extra crop.',
    color: 'from-emerald-800 to-emerald-700'
  },
  {
    id: 'nutmeg',
    icon: Sprout,
    name: 'Nutmeg and clove trees',
    height: 'Middle layer',
    image: '/images/homepage/homepage-bg6.jpg',
    alt: 'Nutmeg fruits on the tree, one split open to show the red mace',
    text: 'Nutmeg and clove trees form the middle storey. They give partial shade, add leaf litter to the soil and give us two more harvests: nutmeg with its mace, and clove buds picked just before they open.',
    color: 'from-emerald-700 to-emerald-600'
  },
  {
    id: 'cardamom',
    icon: Mountain,
    name: 'Cardamom',
    height: 'Understorey',
    image: '/images/homepage/homepage-bg3.jpg',
    alt: 'Cardamom flowering stalks near the ground',
    text: 'Cardamom loves filtered shade and cool, moist ground: exactly what the layers above create. Its flowering stalks creep along the forest floor and are pollinated by the bees that live in the farm.',
    color: 'from-lime-700 to-lime-600'
  },
  {
    id: 'soil',
    icon: Layers,
    name: 'Living soil',
    height: 'The foundation',
    image: '/images/blog/cardamom-harvest.jpg',
    alt: 'Leaf mulch and roots on the farm floor',
    text: 'Fallen leaves, prunings and compost go back into the ground as mulch. That feeds earthworms and soil microbes, holds water through the dry months and stops the rain from washing the hillside away.',
    color: 'from-amber-800 to-amber-700'
  }
];

const PRACTICES = [
  { icon: FlaskConical, title: 'Soil testing and balanced nutrition', text: 'We test the soil and feed each crop what it actually needs, with compost and organic manure as the base, instead of guessing.' },
  { icon: Sprout, title: 'Quality planting material', text: 'Healthy, high-yielding planting material from proven mother plants, so the farm starts strong and stays productive for years.' },
  { icon: Sun, title: 'Shade and canopy management', text: 'Regular pruning of shade trees and pepper vines keeps light, air flow and humidity right for every layer of the farm.' },
  { icon: Bug, title: 'Integrated pest management', text: 'We prevent problems first: clean fields, regular checks, natural enemies and biological controls such as beneficial fungi and bacteria.' },
  { icon: Droplets, title: 'Smart water use', text: 'Rainwater is held on the slopes during the monsoon, and plants are watered carefully through the dry months.' },
  { icon: CloudRain, title: 'Soil and water conservation', text: 'Mulch, ground cover and contour work on the hillsides stop erosion and keep the topsoil where it belongs.' },
  { icon: Scissors, title: 'Picked at the right moment', text: 'Every crop is harvested by hand at the right ripeness: pepper spikes, cardamom pods, nutmeg fruits and clove buds.' },
  { icon: ShieldCheck, title: 'Careful curing and clean handling', text: 'Controlled drying and curing, cleaning and moisture checks before anything is packed, in line with our FSSAI registration.' }
];

const JOURNEY = [
  { icon: Tractor, title: 'Grown', text: 'On our own integrated farms and by partner farmers in Idukki.' },
  { icon: Scissors, title: 'Harvested', text: 'By hand, at peak ripeness, in rounds through the season.' },
  { icon: Sun, title: 'Cured and dried', text: 'Slowly and carefully, to keep colour, oils and aroma.' },
  { icon: BadgeCheck, title: 'Checked and packed', text: 'Cleaned, quality-checked and packed by hand in Idukki.' },
  { icon: MapPin, title: 'Delivered', text: 'Shipped straight to your door, anywhere in India.' }
];

function FarmLayers() {
  const [active, setActive] = useState(LAYERS[0].id);
  const layer = LAYERS.find((l) => l.id === active);

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 items-stretch">
      {/* Layer stack */}
      <div className="flex flex-col gap-2" role="tablist" aria-label="Layers of our integrated farm">
        {LAYERS.map((l, i) => {
          const Icon = l.icon;
          const selected = l.id === active;
          return (
            <button
              key={l.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(l.id)}
              onMouseEnter={() => setActive(l.id)}
              className={`group relative flex items-center gap-4 rounded-2xl bg-gradient-to-r ${l.color} px-5 text-left text-white transition-all duration-300 ${
                selected ? 'py-5 shadow-xl scale-[1.02]' : 'py-3.5 opacity-80 hover:opacity-100'
              }`}
              style={{ marginLeft: `${i * 4}%`, marginRight: `${(LAYERS.length - 1 - i) * 4}%` }}
            >
              <span className={`flex items-center justify-center rounded-xl bg-white/15 transition-all ${selected ? 'w-12 h-12' : 'w-9 h-9'}`}>
                <Icon className={selected ? 'w-6 h-6' : 'w-5 h-5'} />
              </span>
              <span>
                <span className="block text-[11px] font-bold uppercase tracking-widest text-white/60">{l.height}</span>
                <span className="block font-extrabold">{l.name}</span>
              </span>
              <ArrowRight className={`ml-auto w-4 h-4 transition-all ${selected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} />
            </button>
          );
        })}
      </div>

      {/* Detail */}
      <div key={layer.id} className="rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-sm animate-[fadeIn_.4s_ease]">
        <div className="h-56 sm:h-64 overflow-hidden">
          <SiteImg size="thumb" src={layer.image} alt={layer.alt} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        </div>
        <div className="p-6">
          <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-600">{layer.height}</p>
          <h3 className="mt-1 text-2xl font-black text-gray-900">{layer.name}</h3>
          <p className="mt-3 text-gray-600 leading-relaxed">{layer.text}</p>
        </div>
      </div>
    </div>
  );
}

function PartnerFarmers() {
  const [farmers, setFarmers] = useState([]);
  useEffect(() => {
    let alive = true;
    fetch(`${API_URL}/api/farmers`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => alive && setFarmers(Array.isArray(data) ? data : []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!farmers.length) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 pt-16">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1.5">The people behind the spices</p>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Meet our partner farmers</h2>
          </div>
          <Link to="/farmers" className="inline-flex items-center gap-2 text-sm font-extrabold text-emerald-700 hover:text-emerald-800">
            All farmers <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Reveal>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {farmers.map((farmer, i) => (
          <Reveal key={farmer.id} delay={i * 100}>
            <Link to={`/farmer/${farmer.id}`} className="group block rounded-3xl bg-white border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="aspect-square overflow-hidden bg-stone-100">
                <SiteImg size="thumb" src={farmer.image} alt={farmer.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="p-4">
                <p className="font-extrabold text-gray-900">{farmer.name}</p>
                {farmer.rating > 0 && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-current" /> {Number(farmer.rating).toFixed(1)}
                  </p>
                )}
                {farmer.products?.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">{farmer.products.map((p) => p.name).join(', ')}</p>
                )}
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default function About() {
  usePageMeta(...pageMeta('/about'));
  const [source, setSource] = useState('farms');
  const current = SOURCES[source];

  return (
    <div className="bg-gray-50 -mt-20 md:-mt-20">
      {/* Hero */}
      <section className="relative min-h-[78vh] flex items-end overflow-hidden bg-emerald-950 text-white">
        <SiteImg size="web" src="/images/farmers/bibin/farm1.jpg" alt="Pepper vines on shade trees at an Idukki Origins farm" className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 animate-[heroZoom_18s_ease-out_both]" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-emerald-950/20" />
        <div className="relative max-w-6xl mx-auto w-full px-4 pt-36 pb-16 sm:pb-20">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-200 animate-[fadeIn_.6s_ease]">
            <MapPin className="w-3.5 h-3.5" /> Kanjikuzhy, Idukki, Kerala
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] animate-[fadeIn_.8s_ease]">
            We don’t just sell spices. We grow them.
          </h1>
          <p className="mt-5 max-w-2xl text-lg sm:text-xl text-emerald-50/90 animate-[fadeIn_1s_ease]">
            Idukki Origins farms its own land in the Cardamom Hills and works directly with local farmers, to bring you <RotatingWord /> as fresh as it
            leaves the farm.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-[fadeIn_1.2s_ease]">
            <Link to="/shop" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-extrabold text-emerald-800 hover:bg-emerald-50 transition-colors">
              Shop our spices <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#integrated-farming" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-extrabold text-white hover:bg-white/10 transition-colors">
              How we farm
            </a>
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="relative -mt-10 max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-3xl bg-white shadow-xl border border-gray-100 p-4 sm:p-6">
          {[
            { value: 4, label: 'spices grown on our own farms' },
            { value: 2, label: 'ways we source: our farms and partner farmers' },
            { value: 0, label: 'middlemen between the farm and you' },
            { value: 100, suffix: '%', label: 'hand-picked and packed in Idukki' }
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-emerald-50/60 p-4 text-center">
              <p className="text-3xl sm:text-4xl font-black text-emerald-800">
                <CountUp to={stat.value} />
                {stat.suffix}
              </p>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-gray-600 leading-snug">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-10 grid lg:grid-cols-2 gap-10 items-center">
        <Reveal>
          <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Our story</p>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Rooted in the Cardamom Hills</h2>
          <div className="mt-5 space-y-4 text-gray-600 text-lg leading-relaxed">
            <p>
              Idukki has grown some of the world’s finest spices for centuries. Yet most of the pepper and cardamom grown here passes through many traders
              before it reaches a kitchen: it loses freshness on the way, and the grower gets the smallest share.
            </p>
            <p>
              We started Idukki Origins to change that. We grow spices on our own farms, buy the rest directly from farmers we know, and send them
              straight to your home. Fresher spices for you, and a fair deal for the people who grow them.
            </p>
          </div>
        </Reveal>
        <Reveal delay={150} className="relative">
          <div className="grid grid-cols-2 gap-3">
            <SiteImg size="thumb" src="/images/blog/cardamom-harvest.jpg" alt="Hand-picking cardamom" loading="lazy" className="rounded-3xl h-56 sm:h-72 w-full object-cover" />
            <SiteImg size="thumb" src="/images/farmers/John/farm2.jpg" alt="Clove buds on the tree" loading="lazy" className="rounded-3xl h-56 sm:h-72 w-full object-cover mt-10" />
          </div>
          <div className="absolute -bottom-4 left-6 rounded-2xl bg-amber-400 px-5 py-3 shadow-lg">
            <p className="text-sm font-black text-amber-950">Farm-direct since day one</p>
          </div>
        </Reveal>
      </section>

      {/* Two ways we source */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Where our spices come from</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Two sources. One standard.</h2>
          </div>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-full bg-white border border-gray-200 p-1 shadow-sm" role="tablist">
              {Object.entries(SOURCES).map(([key, s]) => {
                const Icon = s.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={source === key}
                    onClick={() => setSource(key)}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-extrabold transition-all ${
                      source === key ? 'bg-emerald-700 text-white shadow' : 'text-gray-600 hover:text-emerald-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>
        <div key={source} className="mt-8 grid md:grid-cols-2 overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-sm animate-[fadeIn_.45s_ease]">
          <div className="h-64 md:h-auto md:min-h-96">
            <SiteImg size="web" src={current.image} alt={current.alt} loading="lazy" className="w-full h-full object-cover" />
          </div>
          <div className="p-6 sm:p-10">
            <h3 className="text-2xl font-black text-gray-900">{current.title}</h3>
            <p className="mt-3 text-gray-600 leading-relaxed">{current.text}</p>
            <ul className="mt-6 space-y-3">
              {current.points.map((point) => (
                <li key={point} className="flex items-start gap-3 font-semibold text-gray-800">
                  <BadgeCheck className="w-5 h-5 shrink-0 text-emerald-600" /> {point}
                </li>
              ))}
            </ul>
            {source === 'partners' && (
              <Link to="/farmers" className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-emerald-700 hover:text-emerald-800">
                Meet our farmers <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Integrated farming */}
      <section id="integrated-farming" className="scroll-mt-24 bg-emerald-50/60 border-y border-emerald-100">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Integrated farming</p>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Four spices, one living farm</h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                On our farms, pepper, cardamom, nutmeg and cloves are not grown in separate blocks. They grow together in layers, like a forest, where each
                crop helps the others. The result is healthier plants, richer soil and more harvests from the same land. Tap a layer to explore it.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100} className="mt-10">
            <FarmLayers />
          </Reveal>
        </div>
      </section>

      {/* Science */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <Reveal>
          <div className="max-w-3xl">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Traditional land, modern science</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Farmed with scientifically proven methods</h2>
            <p className="mt-4 text-lg text-gray-600 leading-relaxed">
              Generations of farming wisdom, backed by research-based practices for spice crops. Here is what that means on our farms, every day.
            </p>
          </div>
        </Reveal>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRACTICES.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.title} delay={(i % 4) * 90}>
                <div className="group h-full rounded-3xl bg-white border border-gray-100 p-6 hover:border-emerald-200 hover:shadow-xl hover:-translate-y-1 transition-all">
                  <span className="flex w-12 h-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                    <Icon className="w-6 h-6" />
                  </span>
                  <h3 className="mt-4 font-extrabold text-gray-900">{p.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{p.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Journey */}
      <section className="bg-emerald-950 text-white">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <Reveal>
            <p className="text-xs font-black text-emerald-300 uppercase tracking-widest mb-2">Farm to kitchen</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">How your spices reach you</h2>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-5 gap-6 relative">
            <div className="hidden lg:block absolute top-7 left-[10%] right-[10%] h-px bg-gradient-to-r from-emerald-700 via-amber-400 to-emerald-700" aria-hidden="true" />
            {JOURNEY.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.title} delay={i * 120}>
                  <div className="relative text-center">
                    <span className="relative mx-auto flex w-14 h-14 items-center justify-center rounded-full bg-emerald-800 border-2 border-amber-400 text-amber-300">
                      <Icon className="w-6 h-6" />
                    </span>
                    <p className="mt-2 text-xs font-black text-emerald-400">Step {i + 1}</p>
                    <h3 className="mt-1 text-lg font-extrabold">{step.title}</h3>
                    <p className="mt-1 text-sm text-emerald-100/75 leading-relaxed">{step.text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <PartnerFarmers />

      {/* Promise */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl">
            <SiteImg size="web" src="/images/blog/spice-route-cover.jpg" alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/85 to-emerald-900/40" />
            <div className="relative p-8 sm:p-12 text-white max-w-xl">
              <h2 className="text-3xl font-black tracking-tight">Our promise</h2>
              <p className="mt-3 text-emerald-50/90 leading-relaxed">
                Whole, honest spices: grown or bought by us in Idukki, never blended with anything else, and packed fresh for you. We are registered with FSSAI
                and as an MSME, and we stand behind every pack.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/shop" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-extrabold text-emerald-800 hover:bg-emerald-50">
                  Shop spices <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/certifications" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-extrabold hover:bg-white/10">
                  Our certifications
                </Link>
                <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-extrabold hover:bg-white/10">
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
