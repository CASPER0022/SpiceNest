import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, Download, ExternalLink, Mail, MessageSquare, RefreshCw, Search, Star, Trash2 } from 'lucide-react';

const RATING_FILTERS = [
  { id: 0, label: 'All ratings' },
  { id: 5, label: '5 ★' },
  { id: 4, label: '4 ★' },
  { id: 3, label: '3 ★' },
  { id: -1, label: '1–2 ★ (needs attention)' }
];

function Stars({ value }) {
  return (
    <span className="inline-flex gap-0.5 text-amber-400" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} className={i <= value ? 'fill-current' : 'text-gray-300'} />
      ))}
    </span>
  );
}

const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function subjectOf(r) {
  if (r.product) return { key: `p${r.product.id}`, label: r.product.name };
  if (r.farmer) return { key: `f${r.farmer.id}`, label: `Farmer: ${r.farmer.name}` };
  return { key: 'none', label: '—' };
}

export default function ReviewManager({ apiUrl }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('all');
  const [rating, setRating] = useState(0);
  const [sort, setSort] = useState('newest');
  const [selected, setSelected] = useState(() => new Set());
  const [expanded, setExpanded] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [loadedAt, setLoadedAt] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/api/reviews/admin`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load reviews');
      setReviews(data);
      setLoadedAt(Date.now());
      setSelected(new Set());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    // Initial fetch; load() sets state only after the request resolves
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const subjects = useMemo(() => {
    const map = new Map();
    for (const r of reviews) {
      const s = subjectOf(r);
      map.set(s.key, { ...s, count: (map.get(s.key)?.count || 0) + 1 });
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [reviews]);

  const stats = useMemo(() => {
    const count = reviews.length;
    const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    const monthAgo = loadedAt - 30 * 24 * 3600 * 1000;
    return {
      count,
      avg,
      five: reviews.filter((r) => r.rating === 5).length,
      low: reviews.filter((r) => r.rating <= 2).length,
      recent: reviews.filter((r) => new Date(r.createdAt).getTime() >= monthAgo).length
    };
  }, [reviews, loadedAt]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = reviews.filter((r) => {
      if (subject !== 'all' && subjectOf(r).key !== subject) return false;
      if (rating === -1 ? r.rating > 2 : rating && r.rating !== rating) return false;
      if (!q) return true;
      return [r.comment, r.user?.name, r.user?.email, subjectOf(r).label].some((v) => String(v || '').toLowerCase().includes(q));
    });
    const sorted = [...list];
    if (sort === 'oldest') sorted.reverse();
    if (sort === 'lowest') sorted.sort((a, b) => a.rating - b.rating);
    if (sort === 'highest') sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  }, [reviews, query, subject, rating, sort]);

  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.id));

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allShownSelected) shown.forEach((r) => next.delete(r.id));
      else shown.forEach((r) => next.add(r.id));
      return next;
    });

  const remove = async (ids) => {
    if (ids.length === 0) return;
    const msg =
      ids.length === 1
        ? 'Delete this review permanently? It will disappear from the website and the product rating will update.'
        : `Delete ${ids.length} reviews permanently? They will disappear from the website and product ratings will update.`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      const res = await fetch(`${apiUrl}/api/reviews/admin/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ids })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setReviews((prev) => prev.filter((r) => !ids.includes(r.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      toast.success(`${data.deleted} review${data.deleted === 1 ? '' : 's'} deleted`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const rows = [['Date', 'Rating', 'Product / farmer', 'Customer', 'Email', 'Review']];
    for (const r of shown) rows.push([fmtDate(r.createdAt), r.rating, subjectOf(r).label, r.user?.name, r.user?.email, r.comment]);
    const blob = new Blob(['﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `idukki-origins-reviews-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total reviews', value: stats.count },
          { label: 'Average rating', value: stats.count ? `${stats.avg.toFixed(1)} ★` : '–' },
          { label: '5-star reviews', value: stats.five },
          { label: 'Last 30 days', value: stats.recent },
          { label: 'Need attention (1–2 ★)', value: stats.low, alert: stats.low > 0 }
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-4 shadow-sm ${s.alert ? 'bg-rose-50 border-rose-100' : 'bg-white border-gray-100'}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${s.alert ? 'text-rose-600' : 'text-gray-400'}`}>{s.label}</p>
            <p className={`mt-1 text-2xl font-black ${s.alert ? 'text-rose-700' : 'text-gray-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white/80 p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search review text, customer name or email"
              className="w-full rounded-full border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 focus:border-emerald-500 focus:outline-none"
            aria-label="Filter by product"
          >
            <option value="all">All products</option>
            {subjects.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label} ({s.count})
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 focus:border-emerald-500 focus:outline-none"
            aria-label="Sort reviews"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="lowest">Lowest rating first</option>
            <option value="highest">Highest rating first</option>
          </select>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={shown.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {RATING_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setRating(f.id)}
              aria-pressed={rating === f.id}
              className={`text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full transition-all ${
                rating === f.id ? (f.id === -1 ? 'bg-rose-600 text-white shadow-md' : 'bg-emerald-600 text-white shadow-md') : 'bg-gray-100 text-gray-500 hover:text-gray-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="sticky top-24 z-20 bg-gray-900 text-white rounded-2xl px-4 py-3 shadow-xl flex flex-wrap items-center gap-3" role="toolbar" aria-label="Bulk actions">
          <span className="text-sm font-black">{selected.size} selected</span>
          <button
            type="button"
            onClick={() => remove([...selected])}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-rose-700 disabled:opacity-50"
          >
            <Trash2 size={14} /> Delete selected
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs font-black uppercase tracking-wider text-gray-300 hover:text-white">
            Clear
          </button>
        </div>
      )}

      {/* List */}
      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center">
          <AlertTriangle className="mx-auto text-rose-500" />
          <p className="mt-2 font-bold text-rose-700">{error}</p>
        </div>
      ) : loading && reviews.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
          <MessageSquare className="mx-auto text-gray-300" size={36} />
          <p className="mt-2 font-bold text-gray-500">{reviews.length === 0 ? 'No reviews yet.' : 'No reviews match these filters.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center gap-2 px-1 text-xs font-black uppercase tracking-wider text-gray-500">
            <input type="checkbox" checked={allShownSelected} onChange={toggleAll} className="w-4 h-4 accent-emerald-600" />
            Select all {shown.length} shown
          </label>
          {shown.map((r) => {
            const s = subjectOf(r);
            const isOpen = expanded.has(r.id);
            const long = r.comment.length > 200;
            const edited = new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime() > 60_000;
            const productLink = r.product?.slug ? `/product/${r.product.slug}` : r.farmer ? `/farmer/${r.farmer.id}` : null;
            return (
              <div
                key={r.id}
                className={`rounded-2xl border bg-white p-4 sm:p-5 shadow-sm transition-colors ${
                  selected.has(r.id) ? 'border-emerald-400 ring-2 ring-emerald-100' : r.rating <= 2 ? 'border-rose-200' : 'border-gray-100'
                }`}
              >
                <div className="flex gap-3 sm:gap-4">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    aria-label={`Select review by ${r.user?.name || 'customer'}`}
                    className="mt-1 w-4 h-4 shrink-0 accent-emerald-600"
                  />
                  {r.product?.image && <img src={r.product.image} alt="" className="hidden sm:block w-14 h-14 shrink-0 rounded-xl object-cover bg-gray-50" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Stars value={r.rating} />
                      <span className="text-sm font-black text-gray-900">{s.label}</span>
                      <span className="text-xs text-gray-400">
                        {fmtDate(r.createdAt)}
                        {edited && ` · edited ${fmtDate(r.updatedAt)}`}
                      </span>
                      {r.rating <= 2 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-700">Low rating</span>}
                    </div>
                    <p className={`mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line break-words ${long && !isOpen ? 'line-clamp-3' : ''}`}>{r.comment}</p>
                    {long && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((prev) => {
                            const next = new Set(prev);
                            if (next.has(r.id)) next.delete(r.id);
                            else next.add(r.id);
                            return next;
                          })
                        }
                        className="mt-1 text-xs font-black text-emerald-700 hover:underline"
                      >
                        {isOpen ? 'Show less' : 'Read full review'}
                      </button>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                      <span className="font-bold text-gray-700">{r.user?.name || 'Deleted user'}</span>
                      {r.user?.email && <span className="text-gray-400 break-all">{r.user.email}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    {r.user?.email && (
                      <a
                        href={`mailto:${r.user.email}?subject=${encodeURIComponent(`Your review of ${s.label} – Idukki Origins`)}`}
                        title="Email customer"
                        className="inline-flex items-center justify-center rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Mail size={15} />
                      </a>
                    )}
                    {productLink && (
                      <Link
                        to={productLink}
                        target="_blank"
                        title="View on website"
                        className="inline-flex items-center justify-center rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <ExternalLink size={15} />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => remove([r.id])}
                      disabled={busy}
                      title="Delete review"
                      className="inline-flex items-center justify-center rounded-full border border-rose-200 p-2 text-rose-600 hover:bg-rose-600 hover:text-white disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
