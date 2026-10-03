import { useEffect, useState } from 'react';
import { Download, Receipt, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const FIRST_YEAR = 2025;

const rupees = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// GST is usually filed for the month that just ended, so that is the default
function previousMonth() {
  const now = new Date();
  return now.getMonth() === 0
    ? { year: now.getFullYear() - 1, month: 12 }
    : { year: now.getFullYear(), month: now.getMonth() };
}

// Monthly GST per state: Kerala 2.5% CGST + 2.5% SGST, other states and UTs 5% IGST.
// Prices include GST, so the tax is the amount paid x 5/105 (worked out on the server).
export default function TaxReport({ apiUrl }) {
  const [period, setPeriod] = useState(previousMonth);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const query = `year=${period.year}&month=${period.month}`;
  const periodLabel = `${MONTHS[period.month - 1]} ${period.year}`;
  const years = [];
  for (let y = new Date().getFullYear(); y >= FIRST_YEAR; y--) years.push(y);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${apiUrl}/api/tax/report?${query}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load tax report');
        if (!cancelled) setReport(data);
      } catch (err) {
        if (!cancelled) {
          setReport(null);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [apiUrl, query]);

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${apiUrl}/api/tax/report?${query}&format=xlsx`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to download tax report');
      }
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `${periodLabel} Tax.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const totals = report?.totals;
  const cards = totals ? [
    { label: 'Total GST', value: rupees(totals.tax), accent: 'text-emerald-700' },
    { label: 'CGST (Kerala)', value: rupees(totals.cgst) },
    { label: 'SGST (Kerala)', value: rupees(totals.sgst) },
    { label: 'IGST (Other states)', value: rupees(totals.igst) },
    { label: 'Sales incl. GST', value: rupees(totals.sales) },
    { label: 'Orders', value: totals.orders }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Period picker + download */}
      <div className="bg-white rounded-2xl border border-gray-150/70 p-4 shadow-sm flex flex-wrap items-center gap-3">
        <Receipt size={18} className="text-emerald-600" />
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 mr-auto">GST Report · {periodLabel}</h2>
        <select
          aria-label="Month"
          value={period.month}
          onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))}
          className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
        >
          {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
        </select>
        <select
          aria-label="Year"
          value={period.year}
          onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
          className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button
          onClick={downloadExcel}
          disabled={downloading || loading || !report}
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-all disabled:opacity-40"
        >
          <Download size={14} /> {downloading ? 'Preparing...' : 'Download Excel'}
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-gray-150/70 p-16 text-center text-sm font-bold text-gray-400">Loading tax report...</div>
      ) : error ? (
        <div className="bg-white rounded-3xl border border-red-100 p-16 text-center text-sm font-bold text-red-600">{error}</div>
      ) : report && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {cards.map((card) => (
              <div key={card.label} className="bg-white rounded-2xl border border-gray-150/70 p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{card.label}</p>
                <p className={`text-lg font-extrabold ${card.accent || 'text-gray-900'}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {report.unknownStateOrderIds.length > 0 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl p-4 text-xs font-semibold">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>
                {report.unknownStateOrderIds.length} order(s) have a state that could not be recognised, so they are counted as IGST:{' '}
                {report.unknownStateOrderIds.map((id) => `#${id}`).join(', ')}. Correct the state in the order's address to fix this.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Same layout as the monthly tax sheet */}
            <div className="xl:col-span-2 bg-white rounded-3xl border border-gray-150/70 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tax</th>
                      <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Tax Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {report.lines.length === 0 ? (
                      <tr><td colSpan={2} className="px-6 py-12 text-center text-sm font-bold text-gray-400">No taxable orders in {periodLabel}.</td></tr>
                    ) : report.lines.map((line) => (
                      <tr key={line.label}>
                        <td className="px-6 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">{line.label}</td>
                        <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right whitespace-nowrap">{rupees(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50/50">
                    <tr>
                      <td className="px-6 py-4 text-sm font-black text-gray-900">Total</td>
                      <td className="px-6 py-4 text-sm font-black text-emerald-700 text-right">{rupees(totals.tax)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Breakdown per state */}
            <div className="xl:col-span-3 bg-white rounded-3xl border border-gray-150/70 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr>
                      {['State / UT', 'Orders', 'Sales', 'Taxable Value', 'CGST', 'SGST', 'IGST'].map((heading, i) => (
                        <th key={heading} scope="col" className={`px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap ${i === 0 ? 'text-left' : 'text-right'}`}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {report.states.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-12 text-center text-sm font-bold text-gray-400">No taxable orders in {periodLabel}.</td></tr>
                    ) : report.states.map((row) => (
                      <tr key={row.state}>
                        <td className="px-4 py-3 text-sm font-bold text-gray-800 whitespace-nowrap">{row.state} <span className="text-[10px] text-gray-400">{row.code}</span></td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{row.orders}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">{rupees(row.sales)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">{rupees(row.taxable)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">{rupees(row.cgst)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">{rupees(row.sgst)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">{rupees(row.igst)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 font-medium">
            Prices include 5% GST, so tax = amount paid (including shipping) × 5/105. Kerala orders: 2.5% CGST + 2.5% SGST; other states and union territories: 5% IGST.
            Orders are counted in the month they were placed (Indian time).
            {report.excludedOrders > 0 && ` ${report.excludedOrders} cancelled / refunded / failed / pending order(s) are not counted.`}
          </p>
        </>
      )}
    </div>
  );
}
