import { useEffect, useState } from 'react';
import { Receipt, Truck, CreditCard } from 'lucide-react';

const rupees = (amount) => {
  const n = Number(amount) || 0;
  return `${n < 0 ? '-' : ''}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Price, coupon, shipping and GST of one order, plus shipping and payment details. The figures come
// from the server (the same code that builds the invoice), so they always match the invoice.
export default function OrderBreakdown({ apiUrl, orderId }) {
  const [state, setState] = useState({ orderId: null, data: null, error: '' });

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiUrl}/api/payment/admin/orders/${orderId}/breakdown`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load the price breakdown');
        if (!cancelled) setState({ orderId, data, error: '' });
      })
      .catch((err) => {
        if (!cancelled) setState({ orderId, data: null, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl, orderId]);

  const card = 'bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm';
  const heading = 'text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2';

  if (state.orderId !== orderId) {
    return <div className={`${card} text-sm font-bold text-gray-400`}>Loading price and tax breakdown...</div>;
  }
  if (state.error) {
    return <div className={`${card} text-sm font-bold text-red-600`}>{state.error}</div>;
  }

  const { lines, amounts, tax, isHomeState, state: placeOfSupply, stateCode, shipping, payment, invoiceNumber } = state.data;
  const goodsLines = lines.filter((line) => line.gstRate === 5);
  const taxRows = [
    { label: 'Goods (spices)', rate: '5%', part: tax.goods },
    ...(amounts.shipping > 0 ? [{ label: 'Shipping', rate: '18%', part: tax.shipping }] : [])
  ];

  return (
    <>
      {/* Item prices, coupon, shipping and GST per line */}
      <div className={card}>
        <h3 className={heading}><Receipt size={14} /> Price &amp; Tax Breakdown <span className="normal-case tracking-normal font-bold text-gray-300">· Invoice {invoiceNumber}</span></h3>

        <div className="overflow-x-auto -mx-2">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="px-2 py-2 text-left">Item</th>
                <th className="px-2 py-2 text-right">Qty</th>
                <th className="px-2 py-2 text-right whitespace-nowrap">Rate (incl. GST)</th>
                <th className="px-2 py-2 text-right whitespace-nowrap">Taxable value</th>
                <th className="px-2 py-2 text-right">GST</th>
                <th className="px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lines.map((line, i) => (
                <tr key={i} className={line.amount < 0 ? 'text-purple-700' : 'text-gray-700'}>
                  <td className="px-2 py-2.5 font-semibold">
                    {line.description}
                    {line.hsn && <span className="ml-2 text-[10px] font-bold text-gray-400">HSN {line.hsn}</span>}
                  </td>
                  <td className="px-2 py-2.5 text-right">{line.quantity ?? ''}</td>
                  <td className="px-2 py-2.5 text-right whitespace-nowrap">{line.rate !== null ? rupees(line.rate) : ''}</td>
                  <td className="px-2 py-2.5 text-right whitespace-nowrap">{rupees(line.taxable)}</td>
                  <td className="px-2 py-2.5 text-right whitespace-nowrap">
                    {rupees(line.gst)} <span className="text-[10px] text-gray-400">@{line.gstRate}%</span>
                  </td>
                  <td className="px-2 py-2.5 text-right font-bold whitespace-nowrap">{rupees(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100">
          {/* How the total was made up */}
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Items subtotal</dt><dd className="font-semibold">{rupees(amounts.itemsTotal)}</dd></div>
            <div className="flex justify-between text-purple-700">
              <dt>Coupon discount</dt><dd className="font-semibold">{amounts.discount ? rupees(-amounts.discount) : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Shipping</dt>
              <dd className="font-semibold">{amounts.shipping ? rupees(amounts.shipping) : 'Free (order over ₹500)'}</dd>
            </div>
            {amounts.roundOff !== 0 && (
              <div className="flex justify-between"><dt className="text-gray-500">Round off</dt><dd className="font-semibold">{rupees(amounts.roundOff)}</dd></div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-100 text-base">
              <dt className="font-black text-gray-900">Total paid</dt><dd className="font-black text-emerald-600">{rupees(amounts.total)}</dd>
            </div>
            <p className="text-[11px] text-gray-400">{goodsLines.length} goods line{goodsLines.length === 1 ? '' : 's'} at 5% GST{amounts.shipping ? ', shipping at 18% GST' : ''}. All prices include GST.</p>
          </dl>

          {/* GST computation */}
          <div className="bg-gray-50 rounded-2xl p-4 text-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tax computation</p>
            <p className="text-xs text-gray-500 mb-3">
              Place of supply: <strong className="text-gray-800">{placeOfSupply ? `${placeOfSupply} (${stateCode})` : 'Unknown state'}</strong>
              {' · '}{isHomeState ? 'Intra-state: CGST + SGST' : 'Inter-state: IGST'}
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 font-bold">
                  <th className="text-left pb-1"></th>
                  <th className="text-right pb-1">Taxable</th>
                  {isHomeState ? <><th className="text-right pb-1">CGST</th><th className="text-right pb-1">SGST</th></> : <th className="text-right pb-1">IGST</th>}
                </tr>
              </thead>
              <tbody>
                {taxRows.map(({ label, rate, part }) => (
                  <tr key={label} className="text-gray-700">
                    <td className="py-1 font-semibold">{label} <span className="text-gray-400">@{rate}</span></td>
                    <td className="py-1 text-right">{rupees(part.taxable)}</td>
                    {isHomeState
                      ? <><td className="py-1 text-right">{rupees(part.cgst)}</td><td className="py-1 text-right">{rupees(part.sgst)}</td></>
                      : <td className="py-1 text-right">{rupees(part.igst)}</td>}
                  </tr>
                ))}
                <tr className="border-t border-gray-200 font-black text-gray-900">
                  <td className="pt-2">Total</td>
                  <td className="pt-2 text-right">{rupees(tax.taxable)}</td>
                  {isHomeState
                    ? <><td className="pt-2 text-right">{rupees(tax.cgst)}</td><td className="pt-2 text-right">{rupees(tax.sgst)}</td></>
                    : <td className="pt-2 text-right">{rupees(tax.igst)}</td>}
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-xs font-bold text-emerald-700">Total GST in this order: {rupees(tax.tax)}</p>
          </div>
        </div>
      </div>

      {/* Shipping and payment */}
      <div className={`${card} grid grid-cols-1 sm:grid-cols-2 gap-6`}>
        <div>
          <h3 className={heading}><Truck size={14} /> Shipping</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Charge</dt><dd className="font-semibold text-right">{shipping.charge ? `${rupees(shipping.charge)} (incl. 18% GST)` : 'Free'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Courier</dt><dd className="font-semibold text-right">{shipping.carrier?.name || 'Not shipped yet'}</dd></div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Tracking number</dt>
              <dd className="font-mono font-semibold text-right break-all">
                {shipping.trackingNumber
                  ? <a href={shipping.carrier?.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">{shipping.trackingNumber}</a>
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>
        <div>
          <h3 className={heading}><CreditCard size={14} /> Payment</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Paid via</dt><dd className="font-semibold text-right">{payment.provider || '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Payment ID</dt><dd className="font-mono text-xs font-semibold text-right break-all">{payment.paymentId || '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Order reference</dt><dd className="font-mono text-xs font-semibold text-right break-all">{payment.orderReference || '—'}</dd></div>
          </dl>
        </div>
      </div>
    </>
  );
}
