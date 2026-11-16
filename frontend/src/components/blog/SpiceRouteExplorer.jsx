import { useState } from 'react';
import { MapPin, Ship, X } from 'lucide-react';

// Interactive Spice Route map and timeline for the Spice Route blog post.
// The map is a schematic (not to scale): ports are placed by latitude and longitude,
// lon -15..135 → x 0..1000, lat 50..-38 → y 0..560.

const PORTS = {
  idukki: { name: 'Idukki hills', x: 634, y: 256, home: true, text: 'Where it all starts. Pepper and cardamom grow wild in the forests of the Cardamom Hills, and are still farmed here by families like the ones we buy from.' },
  muziris: { name: 'Muziris', x: 598, y: 256, text: 'The great port of the Roman era, near today’s Kodungallur. Ships from Egypt came here for pepper. Its harbour is believed to have silted up after the Periyar flood of 1341.' },
  calicut: { name: 'Calicut', x: 590, y: 230, text: 'Kozhikode, the city of the Zamorin. A meeting point for Arab, Chinese and Indian traders, and where Vasco da Gama landed in 1498.' },
  kochi: { name: 'Kochi', x: 610, y: 280, text: 'A natural harbour that opened after the 1341 flood and became the leading spice port, later held by the Portuguese, the Dutch and the British.' },
  aden: { name: 'Aden', x: 400, y: 237, text: 'Gateway to the Red Sea. Ships that crossed the Arabian Sea on the monsoon winds stopped here.' },
  berenike: { name: 'Berenike', x: 337, y: 166, text: 'A Red Sea port of Roman Egypt. Spices were unloaded here and carried across the desert by camel to the Nile.' },
  alexandria: { name: 'Alexandria', x: 299, y: 120, text: 'The great market of the Mediterranean. Roman and later Venetian merchants bought Indian spices here.' },
  rome: { name: 'Rome', x: 183, y: 56, text: 'The biggest customer of the ancient spice trade. Rome had whole warehouses for pepper, the horrea piperataria.' },
  venice: { name: 'Venice', x: 190, y: 26, text: 'In the Middle Ages, Venice grew rich by buying spices in Alexandria and selling them across Europe.' },
  lisbon: { name: 'Lisbon', x: 39, y: 72, text: 'The Portuguese capital. Vasco da Gama sailed from here in 1497 to find a sea route to India.' },
  cape: { name: 'Cape of Good Hope', x: 223, y: 537, text: 'The southern tip of Africa. Sailing round it let European ships reach India without passing through the Middle East.' },
  malindi: { name: 'Malindi', x: 367, y: 339, text: 'An East African port where da Gama found a pilot to guide him across the Indian Ocean to Calicut.' },
  malacca: { name: 'Malacca', x: 781, y: 304, text: 'The narrow strait between the Indian Ocean and the South China Sea, where spices from the east were traded on.' },
  banda: { name: 'Banda & Maluku', x: 966, y: 347, text: 'The original home of nutmeg, mace and cloves. These trees now also grow in Kerala.' },
  guangzhou: { name: 'Guangzhou', x: 855, y: 171, text: 'Chinese merchants and Zheng He’s treasure fleets (1405–1433) sailed from China to Calicut.' },
  delhi: { name: 'Delhi', x: 615, y: 136, text: 'We ship to every PIN code in India.' },
  mumbai: { name: 'Mumbai', x: 586, y: 197, text: 'We ship to every PIN code in India.' },
  kolkata: { name: 'Kolkata', x: 689, y: 174, text: 'We ship to every PIN code in India.' },
  bengaluru: { name: 'Bengaluru', x: 625, y: 232, text: 'We ship to every PIN code in India.' }
};

const ERAS = [
  {
    id: 'roman',
    label: 'Roman era',
    years: '30 BCE – 400 CE',
    color: '#b45309',
    summary: 'Ships from Roman Egypt ride the monsoon winds to Muziris, then carry pepper up the Red Sea and across the desert to Alexandria and Rome.',
    routes: [
      ['idukki', 'muziris'],
      ['muziris', 'aden', 'berenike'],
      ['berenike', 'alexandria', 'rome']
    ]
  },
  {
    id: 'medieval',
    label: 'Middle Ages',
    years: '600 – 1490',
    color: '#047857',
    summary: 'Arab, Persian and Chinese merchants meet in Calicut. Cloves and nutmeg arrive from the east; Venice sells everything on to Europe.',
    routes: [
      ['idukki', 'calicut'],
      ['banda', 'malacca', 'calicut'],
      ['guangzhou', 'malacca'],
      ['calicut', 'aden', 'alexandria', 'venice']
    ]
  },
  {
    id: 'colonial',
    label: 'Age of sail',
    years: '1498 – 1800s',
    color: '#1d4ed8',
    summary: 'Vasco da Gama sails round Africa to Calicut. The Portuguese, Dutch and British fight to control the spice coast.',
    routes: [
      ['lisbon', 'cape'],
      ['cape', 'malindi', 'calicut'],
      ['idukki', 'kochi']
    ]
  },
  {
    id: 'today',
    label: 'Today',
    years: 'Idukki Origins',
    color: '#059669',
    summary: 'The shortest route yet: straight from Idukki farmers to your kitchen, anywhere in India.',
    routes: [
      ['idukki', 'bengaluru'],
      ['idukki', 'mumbai'],
      ['idukki', 'delhi'],
      ['idukki', 'kolkata']
    ]
  }
];

// Bends in the sea routes so lines go round land rather than straight across it
const WAYPOINTS = {
  'lisbon>cape': [[33, 256], [150, 420]],
  'cape>malindi': [[330, 470]],
  'muziris>aden': [[500, 270]],
  'calicut>aden': [[500, 262]],
  'malindi>calicut': [[480, 300]],
  'banda>malacca': [[880, 345]],
  'malacca>calicut': [[690, 300]],
  'guangzhou>malacca': [[820, 250]],
  'aden>berenike': [[370, 205]],
  'aden>alexandria': [[360, 190]],
  'alexandria>venice': [[250, 80]]
};

const TIMELINE = [
  { year: '1213 BCE', era: 'roman', port: 'alexandria', title: 'Pepper in a pharaoh’s tomb', text: 'Peppercorns from South India are placed in the mummy of Ramesses II.' },
  { year: '1st c. CE', era: 'roman', port: 'muziris', title: 'Riding the monsoon', text: 'Greek and Roman sailors cross the Arabian Sea on the monsoon winds to Muziris.' },
  { year: '408 CE', era: 'roman', port: 'rome', title: 'A ransom in pepper', text: 'Alaric’s ransom for Rome reportedly includes 3,000 pounds of pepper.' },
  { year: '1341', era: 'medieval', port: 'kochi', title: 'The Periyar flood', text: 'A great flood is believed to close Muziris and open the harbour of Kochi.' },
  { year: '1405–1433', era: 'medieval', port: 'calicut', title: 'Zheng He’s fleets', text: 'Chinese treasure fleets visit Calicut several times.' },
  { year: '1498', era: 'colonial', port: 'calicut', title: 'Vasco da Gama lands', text: 'The first direct sea voyage from Europe reaches Kappad, near Calicut.' },
  { year: '1663', era: 'colonial', port: 'kochi', title: 'The Dutch take Kochi', text: 'Control of the spice coast passes from the Portuguese to the Dutch.' },
  { year: 'Today', era: 'today', port: 'idukki', title: 'Farm to kitchen', text: 'Idukki Origins buys directly from Idukki farmers and ships across India.' }
];

const SEAS = [
  ['Mediterranean', 235, 92],
  ['Red Sea', 352, 200],
  ['Arabian Sea', 505, 300],
  ['Bay of Bengal', 700, 260],
  ['Indian Ocean', 560, 430],
  ['South China Sea', 880, 260],
  ['Atlantic', 70, 330]
];

// Smooth line through the points: straight segments joined by curves at each bend
function pathThrough(points) {
  if (points.length === 2) return `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`;
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    const mx = i === points.length - 2 ? nx : (x + nx) / 2;
    const my = i === points.length - 2 ? ny : (y + ny) / 2;
    d += ` Q${x},${y} ${mx},${my}`;
  }
  return d;
}

function routePath(stops) {
  const points = [];
  stops.forEach((id, i) => {
    const port = PORTS[id];
    if (i > 0) (WAYPOINTS[`${stops[i - 1]}>${id}`] || []).forEach((p) => points.push(p));
    points.push([port.x, port.y]);
  });
  return pathThrough(points);
}

export default function SpiceRouteExplorer() {
  const [eraId, setEraId] = useState('roman');
  const [portId, setPortId] = useState(null);
  const era = ERAS.find((e) => e.id === eraId);
  const activePorts = new Set(era.routes.flat());
  const port = portId ? PORTS[portId] : null;

  const chooseEra = (id) => {
    setEraId(id);
    setPortId(null);
  };

  const chooseMoment = (moment) => {
    setEraId(moment.era);
    setPortId(moment.port);
  };

  return (
    <div className="not-prose my-10 rounded-3xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
      <style>{`
        @keyframes routeDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        .route-draw { stroke-dasharray: 1; animation: routeDraw 1.6s ease-out both; }
        @keyframes portPulse { 0%, 100% { r: 9; opacity: .35; } 50% { r: 15; opacity: 0; } }
        .port-pulse { animation: portPulse 2.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .route-draw { animation: none; stroke-dasharray: none; }
          .port-pulse, .route-ship { display: none; }
        }
      `}</style>

      {/* Era picker */}
      <div className="flex gap-2 overflow-x-auto p-4 border-b border-emerald-50 bg-emerald-50/40" role="tablist" aria-label="Choose an era">
        {ERAS.map((e) => (
          <button
            key={e.id}
            type="button"
            role="tab"
            aria-selected={e.id === eraId}
            onClick={() => chooseEra(e.id)}
            className={`shrink-0 rounded-2xl px-4 py-2 text-left transition-all ${
              e.id === eraId ? 'bg-emerald-700 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-emerald-100'
            }`}
          >
            <span className="block text-sm font-extrabold">{e.label}</span>
            <span className={`block text-[11px] font-semibold ${e.id === eraId ? 'text-emerald-100' : 'text-gray-400'}`}>{e.years}</span>
          </button>
        ))}
      </div>

      <p className="px-5 pt-4 text-sm font-medium text-gray-600 flex gap-2">
        <Ship className="w-4 h-4 mt-0.5 shrink-0" style={{ color: era.color }} />
        {era.summary}
      </p>

      {/* Map */}
      <div className="relative px-2 sm:px-4 pb-2">
        <svg viewBox="0 0 1000 560" className="w-full h-auto" role="img" aria-label={`Map of the spice trade routes: ${era.label}`}>
          <defs>
            <pattern id="spice-grid" width="25" height="25" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#d1fae5" />
            </pattern>
          </defs>
          <rect width="1000" height="560" rx="24" fill="#f8fdfb" />
          <rect width="1000" height="560" rx="24" fill="url(#spice-grid)" />
          {SEAS.map(([name, x, y]) => (
            <text key={name} x={x} y={y} textAnchor="middle" className="fill-emerald-900/25 italic" style={{ fontSize: 17, letterSpacing: 2 }}>
              {name}
            </text>
          ))}

          {/* Routes of the chosen era; key makes them redraw when the era changes */}
          <g key={eraId}>
            {era.routes.map((stops, i) => {
              const d = routePath(stops);
              return (
                <g key={stops.join('-')}>
                  <path d={d} fill="none" stroke={era.color} strokeOpacity="0.15" strokeWidth="9" strokeLinecap="round" />
                  <path
                    d={d}
                    pathLength="1"
                    fill="none"
                    stroke={era.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="route-draw"
                    style={{ animationDelay: `${i * 0.25}s` }}
                  />
                  <circle r="5" fill={era.color} className="route-ship">
                    <animateMotion dur={`${4 + i}s`} repeatCount="indefinite" path={d} />
                  </circle>
                </g>
              );
            })}
          </g>

          {/* Ports */}
          {Object.entries(PORTS).map(([id, p]) => {
            const active = activePorts.has(id);
            if (!active && (id === 'delhi' || id === 'mumbai' || id === 'kolkata' || id === 'bengaluru')) return null;
            const selected = id === portId;
            const leftLabel = ['muziris', 'calicut', 'kochi', 'mumbai', 'malindi', 'cape', 'banda'].includes(id);
            return (
              <g
                key={id}
                role="button"
                tabIndex={0}
                aria-label={p.name}
                onClick={() => setPortId(selected ? null : id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setPortId(selected ? null : id);
                  }
                }}
                className="cursor-pointer focus:outline-none"
                opacity={active ? 1 : 0.35}
              >
                <circle cx={p.x} cy={p.y} r="18" fill="transparent" />
                {(p.home || selected) && <circle cx={p.x} cy={p.y} r="9" fill={p.home ? '#059669' : era.color} className="port-pulse" />}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={selected ? 8 : p.home ? 7 : 5.5}
                  fill={p.home ? '#059669' : '#fff'}
                  stroke={p.home ? '#fff' : active ? era.color : '#9ca3af'}
                  strokeWidth={p.home ? 2.5 : 2.5}
                />
                <text
                  x={leftLabel ? p.x - 12 : p.x + 12}
                  y={p.y + 5}
                  textAnchor={leftLabel ? 'end' : 'start'}
                  className={selected || p.home ? 'fill-gray-900' : 'fill-gray-600'}
                  style={{ fontSize: p.home ? 22 : 18, fontWeight: selected || p.home ? 800 : 600, paintOrder: 'stroke', stroke: '#f8fdfb', strokeWidth: 4 }}
                >
                  {p.name}
                </text>
              </g>
            );
          })}
        </svg>

        {port && (
          <div className="absolute left-4 right-4 bottom-4 sm:left-auto sm:w-80 rounded-2xl bg-white/95 backdrop-blur border border-emerald-100 shadow-xl p-4">
            <button type="button" onClick={() => setPortId(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
            <p className="flex items-center gap-1.5 text-sm font-extrabold text-gray-900 pr-6">
              <MapPin className="w-4 h-4 text-emerald-600" /> {port.name}
            </p>
            <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{port.text}</p>
          </div>
        )}
      </div>
      <p className="px-5 pb-3 text-[11px] text-gray-400 font-semibold">Schematic map, not to scale. Tap a port for its story.</p>

      {/* Timeline */}
      <div className="border-t border-emerald-50 px-4 py-5">
        <p className="px-1 mb-3 text-xs font-extrabold uppercase tracking-widest text-emerald-700">Timeline</p>
        <ol className="flex gap-3 overflow-x-auto pb-2 snap-x">
          {TIMELINE.map((m) => {
            const current = m.era === eraId && m.port === portId;
            const inEra = m.era === eraId;
            return (
              <li key={m.year} className="snap-start shrink-0 w-56">
                <button
                  type="button"
                  onClick={() => chooseMoment(m)}
                  className={`h-full w-full text-left rounded-2xl border p-4 transition-all ${
                    current
                      ? 'border-emerald-600 bg-emerald-50 shadow-md'
                      : inEra
                        ? 'border-emerald-200 bg-white hover:border-emerald-400'
                        : 'border-gray-100 bg-gray-50 hover:border-emerald-200'
                  }`}
                >
                  <span className="block text-xs font-black" style={{ color: ERAS.find((e) => e.id === m.era).color }}>
                    {m.year}
                  </span>
                  <span className="block mt-1 text-sm font-extrabold text-gray-900">{m.title}</span>
                  <span className="block mt-1 text-xs text-gray-500 leading-relaxed">{m.text}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
