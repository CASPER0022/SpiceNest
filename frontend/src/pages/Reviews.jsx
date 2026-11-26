import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, ChevronDown, Leaf, MessageSquareQuote, PackageCheck, PenLine, Quote, ShieldCheck, ShoppingBag, Star, UserCheck
} from 'lucide-react';
import usePageMeta from '../utils/usePageMeta';
import { pageMeta } from '../data/pageMeta';
import Reveal from '../components/Reveal';
import { useAuth } from '../context/AuthContext';
import SiteImg from '../components/SiteImg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'highest', label: 'Highest rated' },
  { id: 'lowest', label: 'Lowest rated' }
];

const AVATAR_COLORS = ['bg-emerald-600', 'bg-amber-500', 'bg-sky-600', 'bg-rose-500', 'bg-violet-600', 'bg-lime-600'];

function Stars({ value, size = 'w-4 h-4' }) {
  return (
    <span className="inline-flex gap-0.5 text-amber-400" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= Math.round(value) ? 'fill-current' : 'text-gray-300'}`} />
      ))}
    </span>
  );
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function ReviewCard({ review, index }) {
  const [expanded, setExpanded] = useState(false);
  const long = review.comment.length > 220;
  const subject = review.product || review.farmer;
  const subjectLink = review.product ? (review.product.slug ? `/product/${review.product.slug}` : null) : review.farmer ? `/farmer/${review.farmer.id}` : null;
  const subjectImage = review.product?.image || review.farmer?.image;
  const initials = review.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Reveal delay={(index % 3) * 80} className="h-full">
      <article className="relative flex h-full flex-col rounded-3xl bg-white border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <Quote className="absolute right-5 top-5 w-10 h-10 text-emerald-50" aria-hidden="true" />
        <div className="flex items-center gap-3">
          <span className={`w-11 h-11 shrink-0 rounded-full ${AVATAR_COLORS[review.id % AVATAR_COLORS.length]} text-white font-black flex items-center justify-center`}>
            {initials}
          </span>
          <div className="min-w-0">
            <p className="font-black text-gray-900 truncate">{review.name}</p>
            <p className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
              <BadgeCheck className="w-3.5 h-3.5" /> Verified buyer
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Stars value={review.rating} />
          <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
        </div>
        <p className={`mt-3 text-gray-700 leading-relaxed whitespace-pre-line ${long && !expanded ? 'line-clamp-5' : ''}`}>{review.comment}</p>
        {long && (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 self-start text-sm font-extrabold text-emerald-700 hover:underline">
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        {subject && (
          <div className="mt-auto pt-5">
            {subjectLink ? (
              <Link
                to={subjectLink}
                className="group flex items-center gap-3 rounded-2xl bg-gray-50 p-2 pr-4 hover:bg-emerald-50 transition-colors"
              >
                {subjectImage && <SiteImg size="thumb" src={subjectImage} alt="" loading="lazy" className="w-10 h-10 rounded-xl object-cover bg-white" />}
                <span className="flex-1 min-w-0 text-sm font-bold text-gray-700 truncate">
                  {review.farmer && !review.product ? `Farmer: ${subject.name}` : subject.name}
                </span>
                <ArrowRight className="w-4 h-4 text-emerald-700 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <p className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-500">{subject.name}</p>
            )}
          </div>
        )}
      </article>
    </Reveal>
  );
}

function RatingSummary({ summary, starFilter, onStar }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const total = summary.count || 0;

  return (
    <div className="grid sm:grid-cols-[auto_1fr] gap-6 sm:gap-10 items-center rounded-3xl bg-white border border-gray-100 shadow-xl p-6 sm:p-8">
      <div className="text-center sm:pr-10 sm:border-r border-gray-100">
        <p className="text-6xl font-black text-gray-900">{total ? summary.average.toFixed(1) : '–'}</p>
        <div className="mt-2 flex justify-center">
          <Stars value={summary.average} size="w-5 h-5" />
        </div>
        <p className="mt-2 text-sm font-semibold text-gray-500">
          {total} {total === 1 ? 'review' : 'reviews'} from verified buyers
        </p>
      </div>
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const n = summary.distribution?.[star] || 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          const selected = starFilter === star;
          return (
            <button
              key={star}
              type="button"
              disabled={n === 0}
              onClick={() => onStar(selected ? 0 : star)}
              aria-pressed={selected}
              className={`group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors disabled:cursor-default ${
                selected ? 'bg-amber-50 ring-2 ring-amber-300' : 'enabled:hover:bg-gray-50'
              }`}
            >
              <span className="w-10 shrink-0 inline-flex items-center gap-1 text-sm font-black text-gray-700">
                {star} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              </span>
              <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                  style={{ width: animate ? `${pct}%` : '0%' }}
                />
              </span>
              <span className="w-10 shrink-0 text-right text-sm font-bold text-gray-500">{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Reviews() {
  usePageMeta(...pageMeta('/reviews'));
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [spice, setSpice] = useState('all');
  const [starFilter, setStarFilter] = useState(0);
  const [sort, setSort] = useState('newest');
  const [visible, setVisible] = useState(9);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/reviews`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reviews = useMemo(() => data?.reviews || [], [data]);
  const summary = data?.summary || { count: 0, average: 0, distribution: {} };

  // Spice chips: only products that actually have reviews
  const spices = useMemo(() => {
    const map = new Map();
    for (const r of reviews) {
      const key = r.product ? `p${r.product.id}` : r.farmer ? `f${r.farmer.id}` : null;
      if (!key) continue;
      const label = r.product ? r.product.name : `Farmer ${r.farmer.name}`;
      map.set(key, { key, label, count: (map.get(key)?.count || 0) + 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [reviews]);

  const shown = useMemo(() => {
    let list = reviews.filter((r) => {
      const key = r.product ? `p${r.product.id}` : r.farmer ? `f${r.farmer.id}` : null;
      return (spice === 'all' || key === spice) && (!starFilter || r.rating === starFilter);
    });
    if (sort === 'highest') list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === 'lowest') list = [...list].sort((a, b) => a.rating - b.rating);
    return list;
  }, [reviews, spice, starFilter, sort]);

  const featured = useMemo(
    () => reviews.filter((r) => r.rating === 5 && r.comment.length >= 40).sort((a, b) => b.comment.length - a.comment.length)[0],
    [reviews]
  );

  const reviewTarget = user ? '/orders' : '/login';

  return (
    <div className="bg-gray-50 -mt-20 md:-mt-20">
      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-end overflow-hidden bg-emerald-950 text-white">
        <SiteImg size="web"
          src="/images/homepage/premium_whole_spices.jpg"
          alt="Whole spices from Idukki"
          className="absolute inset-0 w-full h-full object-cover opacity-45 scale-105 animate-[heroZoom_18s_ease-out_both]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-emerald-950/20" />
        <div className="relative max-w-6xl mx-auto w-full px-4 pt-36 pb-28 sm:pb-32">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-200 animate-[fadeIn_.6s_ease]">
            <UserCheck className="w-3.5 h-3.5" /> Only verified buyers can review
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] animate-[fadeIn_.8s_ease]">
            Straight from our customers’ kitchens.
          </h1>
          <p className="mt-5 max-w-2xl text-lg sm:text-xl text-emerald-50/90 animate-[fadeIn_1s_ease]">
            Every review here was written by someone who bought and cooked with our spices.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-[fadeIn_1.2s_ease]">
            <a href="#reviews" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-extrabold text-emerald-800 hover:bg-emerald-50 transition-colors">
              Read reviews <ChevronDown className="w-4 h-4" />
            </a>
            <Link to={reviewTarget} className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-extrabold text-white hover:bg-white/10 transition-colors">
              <PenLine className="w-4 h-4" /> Write a review
            </Link>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="relative -mt-16 max-w-4xl mx-auto px-4">
        {data ? (
          <RatingSummary
            summary={summary}
            starFilter={starFilter}
            onStar={(s) => {
              setStarFilter(s);
              setVisible(9);
            }}
          />
        ) : (
          <div className="h-48 rounded-3xl bg-white border border-gray-100 shadow-xl animate-pulse" />
        )}
      </section>

      {/* Featured review */}
      {featured && (
        <section className="max-w-4xl mx-auto px-4 pt-14">
          <Reveal>
            <figure className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 p-8 sm:p-10 text-white">
              <MessageSquareQuote className="w-10 h-10 text-amber-300" />
              <blockquote className="mt-4 text-xl sm:text-2xl font-bold leading-snug">“{featured.comment}”</blockquote>
              <figcaption className="mt-5 flex flex-wrap items-center gap-3 text-emerald-100">
                <Stars value={5} />
                <span className="font-black text-white">{featured.name}</span>
                {featured.product && <span>on {featured.product.name}</span>}
              </figcaption>
            </figure>
          </Reveal>
        </section>
      )}

      {/* Reviews */}
      <section id="reviews" className="scroll-mt-24 max-w-6xl mx-auto px-4 pt-16 pb-10">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">What people say</p>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">All reviews</h2>
            </div>
            {reviews.length > 1 && (
              <label className="inline-flex items-center gap-2 text-sm font-bold text-gray-600">
                Sort
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 font-bold text-gray-800 focus:border-emerald-500 focus:outline-none"
                >
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {spices.length > 1 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {[{ key: 'all', label: 'All', count: reviews.length }, ...spices].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setSpice(s.key);
                    setVisible(9);
                  }}
                  aria-pressed={spice === s.key}
                  className={`rounded-full border px-4 py-2 text-sm font-extrabold transition-all ${
                    spice === s.key ? 'border-emerald-700 bg-emerald-700 text-white shadow-md' : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'
                  }`}
                >
                  {s.label} <span className="opacity-60">({s.count})</span>
                </button>
              ))}
            </div>
          )}
          {starFilter > 0 && (
            <button
              type="button"
              onClick={() => setStarFilter(0)}
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-extrabold text-amber-900 hover:bg-amber-200"
            >
              Showing {starFilter}-star reviews · Clear
            </button>
          )}
        </Reveal>

        {!data && !failed && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-60 rounded-3xl bg-white border border-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {(failed || (data && reviews.length === 0)) && (
          <div className="rounded-3xl border-2 border-dashed border-emerald-200 bg-white p-10 text-center">
            <Leaf className="mx-auto w-10 h-10 text-emerald-600" />
            <p className="mt-3 text-xl font-black text-gray-900">{failed ? 'Reviews could not be loaded right now.' : 'No reviews yet.'}</p>
            <p className="mt-1 text-gray-500">{failed ? 'Please try again in a moment.' : 'Bought from us? Yours could be the first.'}</p>
          </div>
        )}

        {shown.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shown.slice(0, visible).map((r, i) => (
              <ReviewCard key={r.id} review={r} index={i} />
            ))}
          </div>
        )}
        {data && reviews.length > 0 && shown.length === 0 && (
          <p className="rounded-3xl bg-white border border-gray-100 p-8 text-center font-semibold text-gray-500">No reviews match these filters yet.</p>
        )}
        {shown.length > visible && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setVisible((v) => v + 9)}
              className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-700 px-6 py-3 font-extrabold text-emerald-800 hover:bg-emerald-50 transition-colors"
            >
              Show more reviews <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      {/* How to review */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Share your experience</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">How to leave a review</h2>
            <p className="mt-4 text-lg text-gray-600">Your review helps other families choose, and tells our farmers how their harvest tasted in your kitchen.</p>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: ShoppingBag, title: 'Order your spices', text: 'Reviews are open to customers who have bought the product.' },
            { icon: PackageCheck, title: 'Cook with them', text: 'Give them a try in your kitchen, then come back to the product page.' },
            { icon: PenLine, title: 'Rate and write', text: 'Log in, open the product, pick your stars and tell us what you thought.' }
          ].map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} delay={i * 100} className="h-full">
                <div className="relative h-full rounded-3xl bg-white border border-gray-100 p-6 shadow-sm">
                  <span className="absolute right-6 top-5 text-5xl font-black text-emerald-50">{i + 1}</span>
                  <span className="relative w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </span>
                  <h3 className="relative mt-4 text-lg font-black text-gray-900">{step.title}</h3>
                  <p className="relative mt-1 text-gray-600">{step.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Trust + CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 px-6 py-12 sm:px-12 text-white">
            <SiteImg size="thumb" loading="lazy" src="/images/pepper/pepper-1.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-15" />
            <div className="relative grid lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
              <div>
                <ShieldCheck className="w-10 h-10 text-amber-300" />
                <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Honest reviews, by design</h2>
                <ul className="mt-5 space-y-2 text-emerald-50/90">
                  <li className="flex gap-2">
                    <BadgeCheck className="w-5 h-5 shrink-0 text-amber-300" /> Only customers who bought a product can review it.
                  </li>
                  <li className="flex gap-2">
                    <BadgeCheck className="w-5 h-5 shrink-0 text-amber-300" /> One review per customer per product, which they can update later.
                  </li>
                  <li className="flex gap-2">
                    <BadgeCheck className="w-5 h-5 shrink-0 text-amber-300" /> Not happy with an order? Tell us first and we will make it right.
                  </li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link to="/shop" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-extrabold text-emerald-800 hover:bg-emerald-50 transition-colors">
                  Shop spices <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-extrabold text-white hover:bg-white/10 transition-colors">
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
