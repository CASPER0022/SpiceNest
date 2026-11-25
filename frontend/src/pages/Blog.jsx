import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, Search } from 'lucide-react';
import usePageMeta from '../utils/usePageMeta';
import { formatPostDate, sortedPosts } from '../data/blogPosts';
import SiteImg from '../components/SiteImg';

function PostMeta({ post, light }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold ${light ? 'text-emerald-100/80' : 'text-gray-400'}`}>
      <span className="inline-flex items-center gap-1">
        <CalendarDays className="w-3.5 h-3.5" /> {formatPostDate(post.date)}
      </span>
      <span className="inline-flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" /> {post.readMinutes} min read
      </span>
    </div>
  );
}

export default function Blog() {
  usePageMeta('Blog', 'Stories from the spice hills of Idukki, Kerala: the history of the Spice Route, how our spices are grown and harvested, and how to cook with them.');
  const posts = sortedPosts();
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('All');

  const tags = useMemo(() => ['All', ...new Set(posts.flatMap((p) => p.tags))], [posts]);
  const filtered = posts.filter((post) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || `${post.title} ${post.excerpt} ${post.tags.join(' ')}`.toLowerCase().includes(q);
    return matchesQuery && (tag === 'All' || post.tags.includes(tag));
  });
  const browsing = query.trim() || tag !== 'All';
  const [featured, ...rest] = filtered;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden bg-emerald-950 text-white">
        <SiteImg size="web" src="/images/homepage/homepage-bg1.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 to-emerald-950" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-20">
          <p className="text-sm font-extrabold uppercase tracking-widest text-emerald-300">The Idukki Origins Blog</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-black tracking-tight">Stories from the spice hills</h1>
          <p className="mt-4 max-w-2xl text-lg text-emerald-50/85">
            History, farming and cooking: everything behind the spices we bring you from Idukki, Kerala.
          </p>
          <label className="mt-8 flex max-w-md items-center gap-3 rounded-full bg-white px-5 py-3 text-gray-900 shadow-lg">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles"
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
              aria-label="Search articles"
            />
          </label>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Tags */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                t === tag ? 'bg-emerald-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-lg font-bold text-gray-900">No articles found</p>
            <button type="button" onClick={() => { setQuery(''); setTag('All'); }} className="mt-3 text-sm font-bold text-emerald-700 hover:underline">
              Show all articles
            </button>
          </div>
        )}

        {/* Featured (newest) article */}
        {featured && (
          <Link
            to={`/blog/${featured.slug}`}
            className="group mt-6 grid overflow-hidden rounded-3xl bg-white shadow-sm border border-gray-100 hover:shadow-xl transition-shadow md:grid-cols-2"
          >
            <div className="relative h-64 md:h-auto min-h-72 overflow-hidden">
              <SiteImg size="web" src={featured.cover} alt={featured.coverAlt} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              {!browsing && <span className="absolute top-4 left-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950">Latest</span>}
            </div>
            <div className="p-6 sm:p-10 flex flex-col justify-center">
              <div className="flex flex-wrap gap-2">
                {featured.tags.slice(0, 3).map((t) => (
                  <span key={t} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    {t}
                  </span>
                ))}
              </div>
              <h2 className="mt-4 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight group-hover:text-emerald-800 transition-colors">{featured.title}</h2>
              <p className="mt-3 text-gray-600 leading-relaxed">{featured.excerpt}</p>
              <div className="mt-5">
                <PostMeta post={featured} />
              </div>
              <span className="mt-6 inline-flex items-center gap-2 font-extrabold text-emerald-700">
                Read the story <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>
        )}

        {/* Other articles */}
        {rest.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="group overflow-hidden rounded-3xl bg-white border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="h-48 overflow-hidden">
                  <SiteImg size="thumb" src={post.cover} alt={post.coverAlt} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="p-6">
                  <h2 className="text-lg font-extrabold text-gray-900 group-hover:text-emerald-800">{post.title}</h2>
                  <p className="mt-2 text-sm text-gray-500 line-clamp-3">{post.excerpt}</p>
                  <div className="mt-4">
                    <PostMeta post={post} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Newsletter-style nudge to the shop */}
        <div className="mt-12 rounded-3xl bg-emerald-50 border border-emerald-100 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-lg font-black text-emerald-950">More stories are on the way</p>
            <p className="text-sm text-emerald-900/70">Next up: how our farmers harvest and sun-dry green cardamom.</p>
          </div>
          <Link to="/shop" className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-6 py-3 text-sm font-extrabold text-white hover:bg-emerald-800">
            Shop spices <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
