import usePageMeta from '../utils/usePageMeta';

export default function CancellationReturn() {
  usePageMeta('Cancellation & Return Policy', 'Damaged or wrong item? Report it within 7 days of delivery with photos for a free replacement or full refund. Idukki Origins cancellation and return policy.');

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-8">Cancellation & Return Policy</h1>

      <div className="prose prose-emerald max-w-none text-gray-700 leading-relaxed space-y-6">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">Damaged or wrong items</h2>
          <p>
            If your order arrives <strong>damaged</strong> (torn or opened pouch, spilled or spoiled spices) or you received the <strong>wrong item</strong>,
            we will make it right at no cost to you:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Contact us within <strong>7 days of delivery</strong> by WhatsApp (+91 8921663449) or email (info.idukkiorigins@gmail.com).</li>
            <li>Send your <strong>order number</strong> and <strong>clear photos</strong> of the item and the packaging (and the shipping label, if the parcel was damaged).</li>
            <li>Once we have checked the photos, choose a <strong>free replacement</strong> or a <strong>full refund</strong> of that item, including any shipping you paid for it.</li>
          </ol>
          <p>You do not need to send the item back unless we ask you to; if we do, we arrange and pay for the pickup.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">Cancelling an order</h2>
          <p>
            You can cancel an order <strong>before it is dispatched</strong> by contacting us on WhatsApp or by email. We then refund the full amount.
            Once an order has been shipped it can no longer be cancelled, but the return terms below still apply.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">Returns for other reasons</h2>
          <p>
            If you changed your mind, you can return an item within <strong>7 days of delivery</strong> if it is <strong>unopened</strong>, unused and in its
            original packaging (for food safety, opened pouches cannot be returned).
          </p>
          <p>
            For these returns the courier cost both ways is paid by you, and a flat <strong>₹100</strong> is deducted from the refund for shipping, also on
            orders that had free shipping.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-emerald-800">How to return an item</h2>
          <p>
            Email or WhatsApp us first. Where our couriers serve your PIN code we arrange a pickup; otherwise please send the item to:
          </p>
          <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl text-sm font-semibold text-gray-700 space-y-1">
            <p className="font-extrabold text-gray-900">Idukki Origins</p>
            <p>Kanjikuzhy, Idukki</p>
            <p>Kerala, India – 685606</p>
            <p>Phone: +91 8921663449, +91 9645425742</p>
          </div>
          <p>
            Refunds are paid to your original payment method. See our{' '}
            <a href="/refund-policy" className="text-emerald-700 font-semibold hover:underline">Refund Policy</a> for timelines.
          </p>
        </section>
      </div>
    </div>
  );
}
