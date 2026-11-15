import usePageMeta from '../utils/usePageMeta';

export default function RefundPolicy() {
  usePageMeta('Refund Policy', 'How and when Idukki Origins refunds orders: damaged or wrong items, cancellations before dispatch and returns, paid back to your original payment method.');

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-8">Refund Policy</h1>

      <div className="prose prose-emerald max-w-none text-gray-700 leading-relaxed space-y-6">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">When you get a refund</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Damaged or wrong item</strong> reported within 7 days of delivery with photos: full refund of that item and any shipping you paid for it (or a free replacement, if you prefer).</li>
            <li><strong>Order cancelled before dispatch:</strong> full refund.</li>
            <li><strong>Unopened item returned</strong> within 7 days of delivery: refund of the item price minus ₹100 for shipping.</li>
          </ul>
          <p>
            Details are in our <a href="/cancellation-return" className="text-emerald-700 font-semibold hover:underline">Cancellation &amp; Return Policy</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">How you are refunded</h2>
          <p>
            Refunds always go back to your <strong>original payment method</strong> (UPI, card, net banking or wallet). We email you when your refund is
            approved and start it within <strong>2 working days</strong>. Your bank or card provider usually shows it within <strong>5–7 working days</strong> after that.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">Late or missing refunds</h2>
          <p>If you haven’t received a refund yet, first check your bank or card statement again, then contact your bank: posting a refund can take a few days.</p>
          <p>
            If you still have not received it, contact us at <strong>info.idukkiorigins@gmail.com</strong> or WhatsApp <strong>+91 8921663449</strong> with
            your order number.
          </p>
        </section>
      </div>
    </div>
  );
}
