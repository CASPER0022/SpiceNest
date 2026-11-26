import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import usePageMeta from '../utils/usePageMeta';
import { pageMeta } from '../data/pageMeta';
import Reveal from '../components/Reveal';
import SiteImg from '../components/SiteImg';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'farm', label: 'Farms & harvest' },
  { id: 'pepper', label: 'Black pepper' },
  { id: 'cardamom', label: 'Cardamom' },
  { id: 'nutmeg', label: 'Nutmeg & mace' },
  { id: 'cloves', label: 'Cloves' },
  { id: 'packs', label: 'Our packs' }
];

const PHOTOS = [
  { src: '/images/blog/cardamom-harvest.jpg', title: 'Picking cardamom by hand', text: 'Only the ripe capsules are picked, in rounds every few weeks through the season.', cats: ['farm', 'cardamom'] },
  { src: '/images/farmers/bibin/farm1.jpg', title: 'Pepper vines on living supports', text: 'Black pepper climbs support trees, using space that would otherwise be empty.', cats: ['farm', 'pepper'] },
  { src: '/images/homepage/homepage-bg6.jpg', title: 'Nutmeg on the tree', text: 'A ripe fruit splits open to show the red mace around the seed.', cats: ['farm', 'nutmeg'] },
  { src: '/images/pepper/pepper-2.jpg', title: 'Green pepper spikes', text: 'Pepper berries hang in long spikes and darken as they dry in the sun.', cats: ['farm', 'pepper'] },
  { src: '/images/cardamom/cardamom-pouch.jpg', title: 'Whole cardamom pack', text: 'Green cardamom, packed by hand in Idukki.', cats: ['packs', 'cardamom'] },
  { src: '/images/blog/cardamom-nursery.jpg', title: 'Cardamom nursery', text: 'Young plants are raised under shade nets before they go out to the farm.', cats: ['farm', 'cardamom'] },
  { src: '/images/farmers/John/farm2.jpg', title: 'Clove buds on the tree', text: 'Cloves are flower buds, picked just before they open.', cats: ['farm', 'cloves'] },
  { src: '/images/homepage/homepage-bg4.jpg', title: 'Sun-dried black pepper', text: 'Dried until the berries turn deep black and wrinkled.', cats: ['pepper'] },
  { src: '/images/blog/cardamom-curing.jpg', title: 'Curing cardamom', text: 'Gentle, steady heat dries the pods while keeping their green colour and aroma.', cats: ['farm', 'cardamom'] },
  { src: '/images/nutmeg/nutmeg.jpg', title: 'Nutmeg and mace', text: 'One fruit gives two spices: the nutmeg seed and the lacy red mace.', cats: ['nutmeg'] },
  { src: '/images/farmers/bibin/farm2.jpg', title: 'Cardamom under the canopy', text: 'Cardamom grows best in the cool, filtered shade of taller trees.', cats: ['farm', 'cardamom'] },
  { src: '/images/pepper/pepper-pouch.jpg', title: 'Whole black pepper pack', text: 'Black pepper from Idukki, packed by hand.', cats: ['packs', 'pepper'] },
  { src: '/images/cloves/cloves1.jpg', title: 'Whole dried cloves', text: 'Dried until they turn a rich reddish brown.', cats: ['cloves'] },
  { src: '/images/homepage/homepage-bg3.jpg', title: 'Cardamom in flower', text: 'Flowering stalks creep along the ground at the base of the plant.', cats: ['farm', 'cardamom'] },
  { src: '/images/nutmegflower/nutmegflower2.jpg', title: 'Mace around the seed', text: 'The red mace is peeled off and dried separately from the nutmeg.', cats: ['nutmeg'] },
  { src: '/images/blog/cardamom-planting.jpg', title: 'Planting cardamom', text: 'New plants go in at the start of the monsoon, under the forest canopy.', cats: ['farm', 'cardamom'] },
  { src: '/images/homepage/homepage-bg1.jpg', title: 'Graded green cardamom', text: 'Sorted by size so every pack is even.', cats: ['cardamom'] },
  { src: '/images/nutmeg/nutmeg2.jpg', title: 'Nutmeg fruits ripening', text: 'The fruits turn yellow and split open when they are ready.', cats: ['farm', 'nutmeg'] },
  { src: '/images/cloves/cloves-pouch.jpg', title: 'Whole cloves pack', text: 'Whole cloves, packed by hand in Idukki.', cats: ['packs', 'cloves'] },
  { src: '/images/pepper/pepper-3.jpg', title: 'A ripening pepper spike', text: 'Picked when the first berries on the spike start to turn.', cats: ['farm', 'pepper'] },
  { src: '/images/blog/spice-route-cover.jpg', title: 'Pepper and cardamom', text: 'The two spices that made Kerala famous across the world.', cats: ['pepper', 'cardamom'] },
  { src: '/images/nutmegflower/nutmegflower.jpg', title: 'Whole dried mace', text: 'Also called nutmeg flower: warm, delicate and fragrant.', cats: ['nutmeg'] },
  { src: '/images/cardamom/cardamom2.jpg', title: 'At the base of the plant', text: 'Cardamom capsules form on stalks close to the ground.', cats: ['farm', 'cardamom'] },
  { src: '/images/nutmeg/nutmeg-pouch.jpg', title: 'Whole nutmeg pack', text: 'Whole nutmeg, packed by hand in Idukki.', cats: ['packs', 'nutmeg'] },
  { src: '/images/pepper/pepper-1.jpg', title: 'Whole and ground pepper', text: 'Grind it fresh for the strongest flavour.', cats: ['pepper'] },
  { src: '/images/cardamom/cardamom1.jpg', title: 'Fresh green cardamom', text: 'Plump, green, aromatic pods.', cats: ['cardamom'] },
  { src: '/images/nutmegflower/nutmegflower-pouch.jpg', title: 'Whole mace pack', text: 'Whole mace (nutmeg flower), packed by hand in Idukki.', cats: ['packs', 'nutmeg'] },
  { src: '/images/homepage/premium_whole_spices.jpg', title: 'Whole spices of the Western Ghats', text: 'Pepper, cardamom, nutmeg, mace and cloves, all from the same hills.', cats: ['pepper', 'cardamom', 'nutmeg', 'cloves'] }
];

function Lightbox({ photos, index, onClose, onMove }) {
  const photo = photos[index];
  const touchX = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onMove(1);
      if (e.key === 'ArrowLeft') onMove(-1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onMove]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-neutral-950 text-white animate-[fadeIn_.25s_ease]"
      role="dialog"
      aria-modal="true"
      aria-label={photo.title}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) onMove(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-bold text-white/60">
          {index + 1} / {photos.length}
        </span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-white/10">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-16" onClick={onClose}>
        <SiteImg size="web"
          key={photo.src}
          src={photo.src}
          alt={photo.title}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded-xl object-contain shadow-2xl animate-[fadeIn_.3s_ease]"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMove(-1);
          }}
          aria-label="Previous photo"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 hover:bg-white/20"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMove(1);
          }}
          aria-label="Next photo"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 hover:bg-white/20"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
      <div className="px-4 pt-4 pb-6 text-center">
        <p className="text-lg font-black">{photo.title}</p>
        <p className="mx-auto mt-1 max-w-xl text-sm text-white/70">{photo.text}</p>
        <div className="mx-auto mt-4 flex max-w-3xl gap-2 overflow-x-auto pb-1 justify-start sm:justify-center">
          {photos.map((p, i) => (
            <button
              key={p.src}
              type="button"
              onClick={() => onMove(i - index)}
              aria-label={`Show ${p.title}`}
              className={`h-12 w-16 shrink-0 overflow-hidden rounded-lg transition-all ${i === index ? 'ring-2 ring-amber-300 opacity-100' : 'opacity-40 hover:opacity-80'}`}
            >
              <SiteImg size="thumb" src={p.src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Gallery() {
  usePageMeta(...pageMeta('/gallery'));
  const [category, setCategory] = useState('all');
  const [open, setOpen] = useState(null);

  const photos = useMemo(() => (category === 'all' ? PHOTOS : PHOTOS.filter((p) => p.cats.includes(category))), [category]);
  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c.id, c.id === 'all' ? PHOTOS.length : PHOTOS.filter((p) => p.cats.includes(c.id)).length])), []);

  const close = useCallback(() => setOpen(null), []);
  const move = useCallback((step) => setOpen((i) => (i === null ? i : (i + step + photos.length) % photos.length)), [photos.length]);

  return (
    <div className="bg-gray-50 -mt-20 md:-mt-20">
      {/* Hero: a mosaic of photos */}
      <section className="relative min-h-[62vh] flex items-end overflow-hidden bg-emerald-950 text-white">
        <div className="absolute inset-0 grid grid-cols-3 sm:grid-cols-4 gap-1 opacity-50 scale-105 animate-[heroZoom_18s_ease-out_both]" aria-hidden="true">
          {PHOTOS.slice(0, 12).map((p, i) => (
            <SiteImg size="thumb" key={p.src} src={p.src} alt="" className={`h-full w-full object-cover ${i >= 9 ? 'hidden sm:block' : ''}`} />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/70 to-emerald-950/30" />
        <div className="relative max-w-6xl mx-auto w-full px-4 pt-36 pb-16 sm:pb-20">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-200 animate-[fadeIn_.6s_ease]">
            <Camera className="w-3.5 h-3.5" /> {PHOTOS.length} photos from Idukki
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] animate-[fadeIn_.8s_ease]">Life on a spice farm.</h1>
          <p className="mt-5 max-w-2xl text-lg sm:text-xl text-emerald-50/90 animate-[fadeIn_1s_ease]">
            From pepper vines and cardamom in flower to the curing house and the pack on your shelf. Tap any photo to see it up close.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-20 z-30 bg-gray-50/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto" role="tablist" aria-label="Photo categories">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              onClick={() => setCategory(c.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-extrabold transition-all ${
                category === c.id ? 'border-emerald-700 bg-emerald-700 text-white shadow-md' : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
              }`}
            >
              {c.label} <span className="opacity-60">{counts[c.id]}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Masonry grid */}
      <section className="max-w-6xl mx-auto px-4 pt-8 pb-16">
        <div key={category} className="columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4 animate-[fadeIn_.45s_ease]">
          {photos.map((p, i) => (
            <button
              key={p.src}
              type="button"
              onClick={() => setOpen(i)}
              className="group relative mb-3 sm:mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-gray-200 text-left shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
            >
              <SiteImg size="thumb"
                src={p.src}
                alt={p.title}
                loading="lazy"
                className="w-full h-auto transition-transform duration-700 ease-out group-hover:scale-110 motion-reduce:transition-none"
              />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />
              <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/90 p-2 text-emerald-800 opacity-0 transition-all duration-300 group-hover:opacity-100 scale-75 group-hover:scale-100">
                <Expand className="w-4 h-4" />
              </span>
              <span className="pointer-events-none absolute inset-x-0 bottom-0 p-3 sm:p-4 translate-y-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                <span className="block text-sm sm:text-base font-black text-white">{p.title}</span>
                <span className="hidden sm:block mt-0.5 text-xs text-white/80 line-clamp-2">{p.text}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <Reveal>
          <div className="grid md:grid-cols-2 gap-4">
            <Link to="/farmers" className="group relative overflow-hidden rounded-3xl min-h-[220px] flex items-end p-6 sm:p-8 text-white">
              <SiteImg size="web" loading="lazy" src="/images/farmers/bibin/farm2.jpg" alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 to-emerald-950/20" />
              <span className="relative">
                <span className="block text-2xl sm:text-3xl font-black">Meet our farmers</span>
                <span className="mt-1 inline-flex items-center gap-2 font-bold text-emerald-100">
                  The people behind these harvests <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </span>
            </Link>
            <a
              href="https://www.instagram.com/idukkiorigins_com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-3xl min-h-[220px] flex items-end p-6 sm:p-8 text-white"
            >
              <SiteImg size="web" loading="lazy" src="/images/blog/cardamom-curing.jpg" alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-amber-950/90 to-amber-950/20" />
              <span className="relative">
                <span className="block text-2xl sm:text-3xl font-black">More on Instagram</span>
                <span className="mt-1 inline-flex items-center gap-2 font-bold text-amber-100">
                  Reels and photos from the farm <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </span>
            </a>
          </div>
        </Reveal>
      </section>

      {open !== null && <Lightbox photos={photos} index={open} onClose={close} onMove={move} />}
    </div>
  );
}
