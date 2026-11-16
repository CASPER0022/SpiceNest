import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, CloudRain, Flame, Flower2, Hand, Leaf, Package, Ruler, Sprout, Trees, Truck
} from 'lucide-react';

// Interactive parts of the cardamom cultivation article: the plant-to-plate journey,
// the farm calendar and the pod size grader. A step without an `image` shows an icon panel.

const STEPS = [
  {
    icon: Trees,
    title: 'The forest garden',
    when: 'Before anything is planted',
    image: '/images/farmers/bibin/farm2.jpg',
    alt: 'Cardamom plants growing under shade trees in Idukki',
    text: 'Cardamom is a forest plant. It grows best between about 600 and 1,500 metres up, under the filtered shade of tall trees, in rich, slightly acidic forest soil with plenty of rain. The Cardamom Hills of Idukki give it exactly that. Farmers keep the shade trees and thin their branches so that roughly half the sunlight reaches the plants.',
    tip: 'Too much sun scorches the leaves; too much shade means few flowers. Getting the shade right is the farmer’s first job.'
  },
  {
    icon: Sprout,
    title: 'Nursery',
    when: '10–18 months',
    image: '/images/blog/cardamom-nursery.jpg',
    alt: 'Rows of young cardamom seedlings in nursery bags under shade netting',
    text: 'New plants are raised from seed or from pieces of the underground stem (rhizome) of strong, high-yielding mother plants. Seedlings start in a shaded seed bed, are moved to a second nursery to grow on, and are ready to plant out when they have a few healthy shoots.',
    tip: 'Many Idukki farmers grow farmer-selected varieties, such as Njallani Green Gold, chosen from their own best plants.'
  },
  {
    icon: CloudRain,
    title: 'Planting with the monsoon',
    when: 'June – July',
    image: '/images/blog/cardamom-planting.jpg',
    alt: 'A farmer planting a young cardamom plant under forest trees',
    text: 'Young plants go into the ground at the start of the south-west monsoon, in pits filled with topsoil and compost, a couple of metres apart. The steady rain helps the roots settle in. Each plant slowly grows into a clump of leafy shoots, two to four metres tall.'
  },
  {
    icon: Leaf,
    title: 'Growing and care',
    when: 'All year',
    image: '/images/cardamom/cardamom2.jpg',
    alt: 'A cardamom plant with flowering stalks spreading along the ground',
    text: 'Through the year, farmers weed by hand, cover the soil with a thick mulch of fallen leaves to hold moisture, feed the plants with organic manure, remove old dry shoots, and water during the dry months. The first real crop comes two to three years after planting, and a well-kept plant keeps bearing for ten years or more.'
  },
  {
    icon: Flower2,
    title: 'Flowering',
    when: 'April – October',
    image: '/images/homepage/homepage-bg3.jpg',
    alt: 'Cardamom flower stalks with green capsules near the ground',
    text: 'Surprisingly, cardamom does not flower at the top. Long flowering stalks (panicles) creep out from the base of the plant along the ground, carrying small white flowers with purple veins. Bees pollinate them, and each flower becomes a green capsule: the cardamom pod.',
    tip: 'A pod takes about 120 days to ripen after its flower opens, so the same plant has flowers and pods at the same time.'
  },
  {
    icon: Hand,
    title: 'Harvesting by hand',
    when: 'August – February',
    image: '/images/blog/cardamom-harvest.jpg',
    alt: 'Hands picking ripe green cardamom pods into a woven basket',
    text: 'Pods on one stalk ripen at different times, so they cannot be harvested by machine. Pickers go through the plantation every two to four weeks, crouching to pick only the pods that are fully mature but still green, with black seeds inside. One season can mean seven or eight picking rounds.',
    tip: 'Pick too early and the pods shrivel when dried; too late and they split and lose their colour.'
  },
  {
    icon: Flame,
    title: 'Curing (drying)',
    when: '1–2 days',
    image: '/images/blog/cardamom-curing.jpg',
    alt: 'Green cardamom pods drying on wire racks in a curing house',
    text: 'Fresh pods are washed and spread on racks in a curing house, where gentle, controlled heat (around 45–55 °C) slowly dries them until only about a tenth of their moisture is left. Slow drying keeps the bright green colour and locks in the aroma; too much heat turns the pods pale or brown.',
    tip: 'It takes about five kilos of fresh pods to make one kilo of dried cardamom.'
  },
  {
    icon: Ruler,
    title: 'Cleaning and grading',
    when: 'After curing',
    image: '/images/homepage/homepage-bg1.jpg',
    alt: 'Dried green cardamom pods',
    text: 'The dried pods are rubbed to remove stalks and old flower parts, then sieved by size. Bigger, greener, evenly shaped pods are the most valued. You can try grading yourself in the pod sizer below.'
  },
  {
    icon: Package,
    title: 'Packing in Idukki',
    when: 'Within days',
    image: '/images/cardamom/cardamom-pouch.jpg',
    alt: 'Idukki Origins cardamom pouch',
    contain: true,
    text: 'Most cardamom is sold through the Spices Board e-auctions at Puttady in Idukki and Bodinayakanur in Tamil Nadu, then passes through several traders. We buy directly from our farmers instead, and pack the whole pods by hand in Idukki, in pouches that keep out light and air.'
  },
  {
    icon: Truck,
    title: 'To your table',
    when: '1–10 days',
    image: '/images/blog/spice-route-cover.jpg',
    alt: 'Cardamom pods and black pepper on a wooden table',
    text: 'Your order is dispatched from Idukki and delivered anywhere in India. From the forest garden to your kitchen, the cardamom passes through just two pairs of hands: the farmer’s and ours.'
  }
];

export function CardamomJourney() {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const Icon = step.icon;
  const go = (i) => setIndex(Math.max(0, Math.min(STEPS.length - 1, i)));

  return (
    <div
      className="not-prose my-10 rounded-3xl border border-emerald-100 bg-white shadow-sm overflow-hidden"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') go(index + 1);
        if (event.key === 'ArrowLeft') go(index - 1);
      }}
    >
      {/* Step chips */}
      <div className="flex gap-2 overflow-x-auto p-4 border-b border-emerald-50 bg-emerald-50/40" role="tablist" aria-label="Steps from plant to plate">
        {STEPS.map((s, i) => {
          const StepIcon = s.icon;
          const current = i === index;
          return (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={current}
              onClick={() => go(i)}
              title={s.title}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold transition-all ${
                current ? 'bg-emerald-700 text-white shadow-md' : i < index ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-gray-500 hover:bg-emerald-100'
              }`}
            >
              <StepIcon className="w-3.5 h-3.5" />
              <span>{i + 1}</span>
              <span className={current ? 'inline' : 'hidden sm:inline'}>{s.title}</span>
            </button>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2" role="tabpanel">
        {/* Picture or icon panel */}
        <div className="relative h-60 md:h-auto md:min-h-[380px] overflow-hidden bg-stone-50">
          {step.image ? (
            <img
              key={step.image}
              src={step.image}
              alt={step.alt}
              loading="lazy"
              decoding="async"
              className={`absolute inset-0 w-full h-full animate-[fadeIn_.5s_ease] ${step.contain ? 'object-contain p-4' : 'object-cover'}`}
            />
          ) : (
            <div key={step.title} className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-800 via-emerald-700 to-lime-600 animate-[fadeIn_.5s_ease]">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
              <Icon className="relative w-28 h-28 text-white/90" strokeWidth={1.25} />
            </div>
          )}
          <span className="absolute top-4 left-4 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs font-black text-emerald-800 shadow">
            Step {index + 1} of {STEPS.length}
          </span>
        </div>

        {/* Text */}
        <div key={step.title} className="p-6 sm:p-8 flex flex-col animate-[fadeIn_.4s_ease]">
          <p className="text-xs font-extrabold uppercase tracking-widest text-amber-700">{step.when}</p>
          <h3 className="mt-1 text-2xl font-black text-gray-900">{step.title}</h3>
          <p className="mt-3 text-gray-600 leading-relaxed">{step.text}</p>
          {step.tip && (
            <p className="mt-4 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm font-medium text-amber-900">
              <strong>Did you know?</strong> {step.tip}
            </p>
          )}
          <div className="mt-auto pt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:border-emerald-300 disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-emerald-600 transition-all duration-500" style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
            </div>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={index === STEPS.length - 1}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-30"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// What happens on a cardamom farm in Idukki, month by month
const ACTIVITIES = {
  shade: { label: 'Shade and mulch', color: 'bg-stone-500' },
  water: { label: 'Watering', color: 'bg-sky-500' },
  plant: { label: 'Planting', color: 'bg-lime-500' },
  flower: { label: 'Flowering', color: 'bg-fuchsia-400' },
  harvest: { label: 'Harvest and curing', color: 'bg-emerald-600' }
};

const MONTHS = [
  { m: 'Jan', acts: ['harvest', 'water'], note: 'The last picking rounds of the season, and the end of the curing work. The dry season begins, so plants are watered.' },
  { m: 'Feb', acts: ['harvest', 'water', 'shade'], note: 'Final pickings in some gardens. Farmers mulch the soil thickly with fallen leaves to keep it moist in the heat.' },
  { m: 'Mar', acts: ['water', 'shade'], note: 'The hottest, driest month. Regular watering and mulching keep the plants alive and ready to flower.' },
  { m: 'Apr', acts: ['water', 'shade', 'flower'], note: 'Summer showers wake the plants up, and the first flowering stalks appear at the base of the clumps.' },
  { m: 'May', acts: ['flower', 'shade'], note: 'Flowering is in full swing. Shade trees are trimmed before the monsoon so the garden is not too dark.' },
  { m: 'Jun', acts: ['plant', 'flower'], note: 'The south-west monsoon arrives. New plants go into the ground and the flowers keep coming.' },
  { m: 'Jul', acts: ['plant', 'flower'], note: 'Heavy rain. Planting continues and the early pods are swelling.' },
  { m: 'Aug', acts: ['flower', 'harvest'], note: 'The first ripe pods from the spring flowers: the harvest season begins, and the curing houses start up.' },
  { m: 'Sep', acts: ['flower', 'harvest'], note: 'Picking rounds every few weeks. This is when the busiest part of the season begins.' },
  { m: 'Oct', acts: ['flower', 'harvest'], note: 'Peak harvest. Fresh pods come in from the garden and go straight to the curing house.' },
  { m: 'Nov', acts: ['harvest'], note: 'Peak harvest continues as the north-east monsoon brings a little more rain.' },
  { m: 'Dec', acts: ['harvest'], note: 'Harvest goes on into the cooler, clearer weather. Some of the year’s best green pods are cured now.' }
];

export function CardamomCalendar() {
  const now = new Date().getMonth();
  const [month, setMonth] = useState(now);
  const current = MONTHS[month];

  return (
    <div className="not-prose my-10 rounded-3xl bg-white border border-emerald-100 shadow-sm p-5 sm:p-6">
      <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">A year on a cardamom farm</p>
      <p className="mt-1 text-sm text-gray-500">Tap a month to see what our farmers are busy with.</p>

      <div className="mt-5 grid grid-cols-6 sm:grid-cols-12 gap-1.5">
        {MONTHS.map((item, i) => (
          <button
            key={item.m}
            type="button"
            onClick={() => setMonth(i)}
            aria-pressed={i === month}
            className={`rounded-xl px-1 pt-2 pb-1.5 text-center transition-all ${
              i === month ? 'bg-emerald-800 text-white shadow-md -translate-y-0.5' : 'bg-gray-50 text-gray-700 hover:bg-emerald-50'
            }`}
          >
            <span className="block text-xs font-extrabold">{item.m}</span>
            <span className="mt-1.5 flex justify-center gap-0.5">
              {item.acts.map((a) => (
                <span key={a} className={`w-1.5 h-1.5 rounded-full ${ACTIVITIES[a].color}`} />
              ))}
            </span>
            {i === now && <span className={`block mt-1 text-[9px] font-black uppercase ${i === month ? 'text-emerald-200' : 'text-emerald-600'}`}>Now</span>}
          </button>
        ))}
      </div>

      <div key={month} className="mt-5 rounded-2xl bg-emerald-50/60 border border-emerald-100 p-5 animate-[fadeIn_.4s_ease]">
        <div className="flex flex-wrap gap-2">
          {current.acts.map((a) => (
            <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700 border border-gray-100">
              <span className={`w-2 h-2 rounded-full ${ACTIVITIES[a].color}`} /> {ACTIVITIES[a].label}
            </span>
          ))}
        </div>
        <p className="mt-3 text-gray-700 leading-relaxed">{current.note}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
        {Object.values(ACTIVITIES).map((a) => (
          <span key={a.label} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
            <span className={`w-2 h-2 rounded-full ${a.color}`} /> {a.label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-gray-400">Typical timings for Idukki; each season shifts a little with the rains.</p>
    </div>
  );
}

// Trade grades by pod size (diameter), as used in the Kerala cardamom trade
const GRADES = [
  { min: 8, name: '8 mm and above', label: 'Jumbo / premium bold', text: 'The largest pods: the most striking to look at and usually the most expensive. Popular as a gift and for export.' },
  { min: 7, name: '7–8 mm', label: 'Extra bold (AGEB)', text: '“Alleppey Green Extra Bold”: big, plump pods with plenty of seeds. A top choice for kitchens and sweets.' },
  { min: 6, name: '6–7 mm', label: 'Bold (AGB)', text: 'Good-sized, well-filled pods. Great everyday cardamom for tea, biryani and payasam.' },
  { min: 5, name: '5–6 mm', label: 'Superior (AGS)', text: 'Smaller pods with the same aroma. Often used for grinding and in spice blends.' },
  { min: 0, name: 'Below 5 mm', label: 'Small / shorts', text: 'Small or less filled pods, mostly used for cardamom powder and oil extraction.' }
];

export function CardamomGrades() {
  const [size, setSize] = useState(7.5);
  const grade = GRADES.find((g) => size >= g.min);
  const scale = 0.55 + (size - 4) * 0.12;

  return (
    <div className="not-prose my-10 rounded-3xl bg-gradient-to-br from-lime-50 to-emerald-50 border border-emerald-100 p-5 sm:p-8">
      <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">Try it: the pod sizer</p>
      <p className="mt-1 text-sm text-gray-600">Cardamom is graded by the width of the pod. Slide to change the size.</p>

      <div className="mt-6 grid sm:grid-cols-[180px_1fr] gap-6 items-center">
        <div className="h-40 flex items-center justify-center">
          <svg viewBox="0 0 120 160" className="h-full transition-transform duration-300" style={{ transform: `scale(${scale})` }} aria-hidden="true">
            <defs>
              <linearGradient id="pod-fill" x1="0" x2="1">
                <stop offset="0" stopColor="#6b8f2a" />
                <stop offset="0.5" stopColor="#a3c25a" />
                <stop offset="1" stopColor="#5f7f22" />
              </linearGradient>
            </defs>
            <path d="M60 8 C 92 30, 100 90, 60 150 C 20 90, 28 30, 60 8 Z" fill="url(#pod-fill)" stroke="#4d6b1a" strokeWidth="2" />
            {[-18, -9, 0, 9, 18].map((dx) => (
              <path key={dx} d={`M60 14 C ${60 + dx * 1.6} 50, ${60 + dx * 1.6} 100, 60 146`} fill="none" stroke="#4d6b1a" strokeOpacity="0.35" strokeWidth="1.5" />
            ))}
            <path d="M60 2 L60 10" stroke="#7c5a2a" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-4xl font-black text-emerald-900">{size.toFixed(1)} mm</p>
          <input
            type="range"
            min="4"
            max="9"
            step="0.1"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            aria-label="Pod size in millimetres"
            className="mt-3 w-full accent-emerald-700"
          />
          <div className="flex justify-between text-[11px] font-bold text-gray-400">
            <span>4 mm</span>
            <span>9 mm</span>
          </div>
          <div className="mt-4 rounded-2xl bg-white border border-emerald-100 p-4">
            <p className="text-sm font-black text-gray-900">
              {grade.label} <span className="font-semibold text-gray-400">· {grade.name}</span>
            </p>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">{grade.text}</p>
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-500">
        Size is not everything: colour, aroma and how well the pod is filled with seeds matter just as much. A good pod is uniformly green and feels firm.
      </p>
    </div>
  );
}
