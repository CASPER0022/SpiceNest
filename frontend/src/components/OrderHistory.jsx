import { useEffect, useState } from 'react';
import { History } from 'lucide-react';

// Order history for admins (newest first): order placed, payment, stock taken and returned,
// status changes, emails, tracking and address edits. The server builds it (GET .../history).
// Reload it by changing the component's key after something about the order changes.

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'status', label: 'Order status', types: ['order', 'status'] },
  { id: 'stock', label: 'Stock', types: ['stock'] },
  { id: 'other', label: 'Payment & emails', types: ['payment', 'email', 'shipping', 'address', 'message'] }
];

const TYPE_STYLES = {
  order: { label: 'Order', dot: 'bg-gray-900', tag: 'bg-gray-100 text-gray-700' },
  status: { label: 'Status', dot: 'bg-blue-500', tag: 'bg-blue-50 text-blue-700' },
  stock: { label: 'Stock', dot: 'bg-amber-500', tag: 'bg-amber-50 text-amber-700' },
  payment: { label: 'Payment', dot: 'bg-emerald-500', tag: 'bg-emerald-50 text-emerald-700' },
  email: { label: 'Email', dot: 'bg-purple-500', tag: 'bg-purple-50 text-purple-700' },
  shipping: { label: 'Shipping', dot: 'bg-sky-500', tag: 'bg-sky-50 text-sky-700' },
  address: { label: 'Address', dot: 'bg-gray-400', tag: 'bg-gray-100 text-gray-600' },
  message: { label: 'Message', dot: 'bg-purple-400', tag: 'bg-purple-50 text-purple-700' }
};

const formatWhen = (iso) => new Date(iso).toLocaleString('en-IN', {
  day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
});

export default function OrderHistory({ apiUrl, orderId }) {
  const [state, setState] = useState({ orderId: null, entries: [], error: '' });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiUrl}/api/payment/admin/orders/${orderId}/history`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load the order history');
        if (!cancelled) setState({ orderId, entries: data, error: '' });
      })
      .catch((err) => {
        if (!cancelled) setState({ orderId, entries: [], error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, orderId]);

  const active = FILTERS.find((f) => f.id === filter);
  const shown = active.types ? state.entries.filter((e) => active.types.includes(e.type)) : state.entries;

  return (
    <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <History size={14} /> Order history
        </h3>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter the order history">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-colors ${
                filter === f.id ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {state.orderId !== orderId ? (
        <p className="text-sm font-bold text-gray-400">Loading history...</p>
      ) : state.error ? (
        <p className="text-sm font-bold text-red-600">{state.error}</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing here yet.</p>
      ) : (
        <ol className="space-y-3">
          {shown.map((entry) => {
            const style = TYPE_STYLES[entry.type] || TYPE_STYLES.order;
            return (
              <li key={entry.id} className="flex gap-3">
                <span className={`mt-4 w-2 h-2 rounded-full shrink-0 ${style.dot}`} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-800 break-words">
                    <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded mr-2 align-middle ${style.tag}`}>
                      {style.label}
                    </span>
                    {entry.message}
                  </div>
                  <p className="mt-1 ml-1 text-[11px] text-gray-400">
                    {formatWhen(entry.createdAt)}
                    {entry.actor && <> · by {entry.actor}</>}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
