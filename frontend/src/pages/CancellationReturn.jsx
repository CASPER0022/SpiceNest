import usePageMeta from '../utils/usePageMeta';
import { pageMeta } from '../data/pageMeta';

export default function CancellationReturn() {
  usePageMeta(...pageMeta('/cancellation-return'));

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-8">Cancellation & Return Policy</h1>

      <div className="prose prose-emerald max-w-none text-gray-700 leading-relaxed space-y-6">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">No returns on food products</h2>
          <p>
            Our products are food. For <strong>hygiene and food safety</strong>, we <strong>do not accept returns or exchanges</strong> once an order has
            been delivered, including if you have changed your mind and even if the pouch is unopened.
          </p>
          <p>
            If something is wrong with your order, we will still make it right: see damaged or wrong items below.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">Damaged or wrong items</h2>
          <p>
            If your order arrives <strong>damaged</strong> (torn or opened pouch, spilled or spoiled spices) or you received the <strong>wrong item</strong>,
            we will make it right at no cost to you:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Contact us within <strong>7 days of delivery</strong> by WhatsApp (+91 8129074658) or email (info.idukkiorigins@gmail.com).</li>
            <li>Send your <strong>order number</strong> and <strong>clear photos</strong> of the item and the packaging (and the shipping label, if the parcel was damaged).</li>
            <li>Once we have checked the photos, choose a <strong>free replacement</strong> or a <strong>full refund</strong> of that item, including any shipping you paid for it.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">Cancelling an order</h2>
          <p>
            You can cancel an order <strong>before it is dispatched</strong> by contacting us on WhatsApp or by email. We then refund the full amount.
            Once an order has been shipped it can no longer be cancelled.
          </p>
          <p>
            Refunds are paid to your original payment method. See our{' '}
            <a href="/refund-policy" className="text-emerald-700 font-semibold hover:underline">Refund Policy</a> for timelines.
          </p>
        </section>
      </div>
    </div>
  );
}
