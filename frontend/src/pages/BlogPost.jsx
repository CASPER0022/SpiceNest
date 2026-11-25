import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock, Link2, Share2, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import usePageMeta, { shortDescription } from '../utils/usePageMeta';
import { useJsonLd, breadcrumbJsonLd } from '../utils/structuredData';
import { formatPostDate, getPost, sortedPosts } from '../data/blogPosts';
import SpiceRouteExplorer from '../components/blog/SpiceRouteExplorer';
import { CardamomCalendar, CardamomGrades, CardamomJourney } from '../components/blog/CardamomStory';
import SiteImg from '../components/SiteImg';

const SITE_URL = 'https://www.idukkiorigins.com';

// **bold** and *italic* inside block text
function Rich({ text }) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="text-gray-900">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

const SPICES = [
  { name: 'Black Pepper', slug: 'black-pepper', image: '/images/pepper/pepper-pouch.jpg', note: 'The spice that started it all. Native to the Western Ghats.' },
  { name: 'Cardamom', slug: 'cardamom', image: '/images/cardamom/cardamom-pouch.jpg', note: 'The “queen of spices”, from the Cardamom Hills of Idukki.' },
  { name: 'Cloves', slug: 'cloves', image: '/images/cloves/cloves-pouch.jpg', note: 'Once only from the Maluku Islands, now grown in Kerala too.' },
  { name: 'Nutmeg', slug: 'nutmeg', image: '/images/nutmeg/nutmeg-pouch.jpg', note: 'From the Banda Islands to Idukki farms.' },
  { name: 'Mace', slug: 'nutmeg-flower', image: '/images/nutmegflower/nutmegflower-pouch.jpg', note: 'The red lace around the nutmeg seed, sold as nutmeg flower.' }
];

function FactCards({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="not-prose my-10">
      <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 mb-3">Tap a card</p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((fact, i) => {
          const flipped = open === i;
          return (
            <button
              key={fact.front}
              type="button"
              onClick={() => setOpen(flipped ? null : i)}
              aria-expanded={flipped}
              className={`min-h-36 rounded-2xl p-4 text-left transition-all duration-300 ${
                flipped ? 'bg-emerald-800 text-white shadow-lg' : 'bg-amber-50 border border-amber-100 hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              {flipped ? (
                <span className="text-sm leading-relaxed font-medium">{fact.back}</span>
              ) : (
                <>
                  <span className="block text-2xl sm:text-3xl font-black text-amber-900">{fact.front}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                    What’s this? <ArrowRight className="w-3 h-3" />
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SpiceCards({ only, title = 'The spices of the route, from Idukki' }) {
  const list = only ? SPICES.filter((spice) => only.includes(spice.slug)) : SPICES;
  return (
    <div className="not-prose my-10">
      <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 mb-3">{title}</p>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
        {list.map((spice) => (
          <Link
            key={spice.slug}
            to={`/product/${spice.slug}`}
            className="group snap-start shrink-0 w-44 rounded-2xl bg-white border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <div className="h-40 bg-stone-50">
              <SiteImg size="thumb" src={spice.image} alt={`${spice.name} pouch`} loading="lazy" decoding="async" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-3">
              <p className="text-sm font-extrabold text-gray-900">{spice.name}</p>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{spice.note}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                Shop now <ArrowRight className="w-3 h-3" />
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Quiz({ title, questions: QUIZ }) {
  const [picked, setPicked] = useState({});
  const answered = Object.keys(picked).length;
  const score = QUIZ.filter((item, i) => picked[i] === item.answer).length;

  return (
    <div className="not-prose my-12 rounded-3xl bg-emerald-950 text-white p-6 sm:p-8">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-emerald-300">
        <Sparkles className="w-4 h-4" /> Quick quiz
      </p>
      <h3 className="mt-2 text-2xl font-black">{title}</h3>
      <div className="mt-6 space-y-6">
        {QUIZ.map((item, qi) => {
          const choice = picked[qi];
          const done = choice !== undefined;
          return (
            <div key={item.q}>
              <p className="font-bold">
                {qi + 1}. {item.q}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {item.options.map((option, oi) => {
                  const right = oi === item.answer;
                  const chosen = oi === choice;
                  let style = 'bg-white/10 hover:bg-white/20 border-white/10';
                  if (done && right) style = 'bg-emerald-500 border-emerald-400 text-white';
                  else if (done && chosen) style = 'bg-red-500/80 border-red-400 text-white';
                  else if (done) style = 'bg-white/5 border-white/5 text-white/50';
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={done}
                      onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${style}`}
                    >
                      {option}
                      {done && right && <Check className="w-4 h-4 shrink-0" />}
                      {done && chosen && !right && <X className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {done && <p className="mt-2 text-sm text-emerald-100/80">{item.why}</p>}
            </div>
          );
        })}
      </div>
      {answered === QUIZ.length && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/10 p-4">
          <p className="font-extrabold">
            You got {score} of {QUIZ.length}! {score === QUIZ.length ? 'A true spice trader. 🌶️' : 'Not bad, sailor. ⛵'}
          </p>
          <button type="button" onClick={() => setPicked({})} className="text-sm font-bold text-emerald-300 hover:text-white">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function ShopCta({ title = 'Taste the Spice Route at home', image = '/images/homepage/premium_whole_spices.jpg' }) {
  return (
    <div className="not-prose my-12 rounded-3xl overflow-hidden relative">
      <SiteImg size="web" src={image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-900/85 to-emerald-900/40" />
      <div className="relative p-8 sm:p-10 text-white max-w-lg">
        <h3 className="text-2xl sm:text-3xl font-black">{title}</h3>
        <p className="mt-3 text-emerald-50/90">
          Whole spices from Idukki farmers, packed by hand and shipped across India. Free shipping on orders of ₹500 or more.
        </p>
        <Link to="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-extrabold text-emerald-800 hover:bg-emerald-50 transition-colors">
          Shop spices <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function Block({ block }) {
  switch (block.type) {
    case 'h2':
      return (
        <h2 id={block.id} className="scroll-mt-28 pt-4 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          {block.text}
        </h2>
      );
    case 'quote':
      return (
        <figure className="not-prose my-10 border-l-4 border-amber-500 bg-amber-50/60 rounded-r-2xl px-6 py-5">
          <blockquote className="text-xl sm:text-2xl font-bold text-amber-950 leading-snug">“{block.text}”</blockquote>
          <figcaption className="mt-3 text-sm font-semibold text-amber-800">{block.cite}</figcaption>
        </figure>
      );
    case 'image':
      return (
        <figure className="not-prose my-10">
          <SiteImg size="web" src={block.src} alt={block.alt} loading="lazy" decoding="async" className="w-full max-h-[480px] object-cover rounded-3xl" />
          {block.caption && <figcaption className="mt-3 text-sm text-gray-500 text-center">{block.caption}</figcaption>}
        </figure>
      );
    case 'explorer':
      return <SpiceRouteExplorer />;
    case 'facts':
      return <FactCards items={block.items} />;
    case 'spices':
      return <SpiceCards only={block.only} title={block.title} />;
    case 'quiz':
      return <Quiz title={block.title} questions={block.questions} />;
    case 'cta':
      return <ShopCta title={block.title} image={block.image} />;
    case 'journey':
      return <CardamomJourney />;
    case 'calendar':
      return <CardamomCalendar />;
    case 'grades':
      return <CardamomGrades />;
    default:
      return (
        <p className="text-[17px] sm:text-lg leading-8 text-gray-700">
          <Rich text={block.text} />
        </p>
      );
  }
}

function useReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return progress;
}

function useActiveHeading(ids) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join('|');
  useEffect(() => {
    const headings = key.split('|').map((id) => document.getElementById(id)).filter(Boolean);
    if (!headings.length) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: '-100px 0px -60% 0px' }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [key]);
  return active;
}

export default function BlogPost() {
  const { slug } = useParams();
  const post = getPost(slug);
  usePageMeta(
    post ? post.title : 'Article not found',
    post ? (post.seoDescription || shortDescription(post.excerpt)) : undefined,
    { image: post?.cover, type: post ? 'article' : 'website', noindex: !post }
  );
  useJsonLd(
    'blogpost-jsonld',
    post && {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      image: `${SITE_URL}${post.cover}`,
      datePublished: post.date,
      dateModified: post.date,
      author: { '@type': 'Organization', name: post.author, url: SITE_URL },
      publisher: { '@id': `${SITE_URL}/#organization` },
      mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
      keywords: post.tags.join(', ')
    }
  );

  // Home › Blog › article title in Google results
  useJsonLd('breadcrumb-jsonld', post && breadcrumbJsonLd([['Blog', '/blog'], [post.title, `/blog/${post.slug}`]]));

  const headings = post ? post.blocks.filter((b) => b.type === 'h2') : [];
  const active = useActiveHeading(headings.map((h) => h.id));
  const progress = useReadingProgress();

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-black text-gray-900">Article not found</h1>
        <p className="mt-3 text-gray-500">This article may have moved.</p>
        <Link to="/blog" className="mt-6 inline-flex items-center gap-2 font-bold text-emerald-700 hover:underline">
          <ArrowLeft className="w-4 h-4" /> All articles
        </Link>
      </div>
    );
  }

  const share = async () => {
    const url = `${SITE_URL}/blog/${post.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      }
    } catch {
      // Share sheet closed
    }
  };

  const more = sortedPosts().filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <article className="bg-white">
      {/* Reading progress */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-transparent pointer-events-none">
        <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 origin-left" style={{ transform: `scaleX(${progress})` }} />
      </div>

      {/* Hero */}
      <header className="relative overflow-hidden bg-emerald-950 text-white">
        <SiteImg size="web" src={post.cover} alt={post.coverAlt} className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 pt-14 pb-12 sm:pt-20 sm:pb-16">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-200 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> All articles
          </Link>
          <div className="mt-6 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-bold">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight leading-tight">{post.title}</h1>
          <p className="mt-4 text-lg text-emerald-50/85 max-w-2xl">{post.excerpt}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-emerald-100/80">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" /> {formatPostDate(post.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {post.readMinutes} min read
            </span>
            <button type="button" onClick={share} className="inline-flex items-center gap-1.5 hover:text-white">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        {/* Table of contents */}
        <aside className="hidden lg:block">
          <nav className="sticky top-28" aria-label="In this article">
            <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">In this article</p>
            <ul className="space-y-1 border-l border-gray-100">
              {headings.map((h) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className={`block -ml-px border-l-2 pl-4 py-1.5 text-sm transition-colors ${
                      active === h.id ? 'border-emerald-600 font-bold text-emerald-800' : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="max-w-3xl space-y-6">
          {post.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}

          <div className="not-prose flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-8">
            <p className="text-sm font-semibold text-gray-500">Enjoyed this? Share it with a fellow food lover.</p>
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-5 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
            >
              <Link2 className="w-4 h-4" /> Share article
            </button>
          </div>

          {more.length > 0 && (
            <div className="pt-6">
              <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">More from the blog</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {more.map((p) => (
                  <Link key={p.slug} to={`/blog/${p.slug}`} className="rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <p className="font-extrabold text-gray-900">{p.title}</p>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{p.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
