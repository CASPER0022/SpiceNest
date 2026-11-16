import usePageMeta from '../utils/usePageMeta';

export default function ShippingPolicy() {
  usePageMeta('Shipping Policy', 'Idukki Origins ships across India with Delhivery, DTDC and India Post. Orders dispatch in 1–2 working days and arrive in 1–10 days. Free shipping above ₹500.');

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-8">Shipping Policy</h1>

      <div className="prose prose-emerald max-w-none text-gray-700 leading-relaxed space-y-6">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">Where we deliver</h2>
          <p>
            We deliver to <strong>all of India</strong>. Every order is packed by hand in Idukki, Kerala, and sent with our courier partners
            <strong> Delhivery</strong>, <strong>DTDC</strong> and <strong>India Post</strong>. We choose the one that serves your PIN code best; India Post reaches
            even the most remote PIN codes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">Shipping charges</h2>
          <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl text-sm font-semibold text-gray-700 space-y-2">
            <p>Orders of <strong>₹500 or more</strong>: <strong className="text-emerald-700">free shipping</strong></p>
            <p>Orders below ₹500: <strong>₹100</strong> flat shipping charge</p>
          </div>
          <p>The shipping charge, if any, is shown in your cart before you pay. There are no other delivery charges.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">Dispatch and delivery times</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Dispatch:</strong> within 1–2 working days of your order (Monday to Saturday).</li>
            <li><strong>Delivery:</strong> 1–10 days after dispatch, depending on your location. Orders within Kerala usually arrive sooner; remote areas may take the full 10 days.</li>
          </ul>
          <p>Delivery times are estimates from our courier partners and can be longer during holidays, heavy rain or other events outside our control.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">Tracking your order</h2>
          <p>
            Once your order is shipped, we send you the courier name and tracking number by email. You can also follow your order on our{' '}
            <a href="/track-order" className="text-emerald-700 font-semibold hover:underline">Track Order</a> page, or in{' '}
            <a href="/orders" className="text-emerald-700 font-semibold hover:underline">My Orders</a> if you have an account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">Address and delivery attempts</h2>
          <p>
            Please check your address, PIN code and phone number before you pay: the courier calls this number to deliver. If a parcel comes back to us
            because the address was wrong or nobody accepted it, we will contact you to send it again; the new shipping charge is then payable by you.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">Damaged or wrong items</h2>
          <p>
            If your parcel arrives damaged or contains the wrong item, tell us within <strong>7 days of delivery</strong> with photos and we will send a
            replacement or refund you. See our{' '}
            <a href="/cancellation-return" className="text-emerald-700 font-semibold hover:underline">Cancellation &amp; Return Policy</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">Questions</h2>
          <p>
            WhatsApp or call us at <strong>+91 8921663449</strong> or <strong>+91 9645425742</strong> (Monday to Saturday, 9 AM–6 PM), or email{' '}
            <strong>info.idukkiorigins@gmail.com</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
