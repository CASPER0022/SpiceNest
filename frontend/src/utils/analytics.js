// Google Analytics 4 + Meta Pixel. Each one only loads when its ID is set (Vercel env vars):
//   VITE_GA_MEASUREMENT_ID = "G-XXXXXXXXXX"
//   VITE_META_PIXEL_ID     = "123456789012345"
// The official snippets are inline <script>s, which our Content-Security-Policy blocks, so the
// same bootstrap code lives here instead. Both tools track SPA route changes on their own
// (GA4 enhanced measurement / Meta's history listener), so only shop events are sent manually.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID?.trim();
const CURRENCY = 'INR';

function loadScript(src) {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

let initialized = false;

export function initAnalytics() {
  if (initialized) return;
  initialized = true;

  if (GA_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`);
  }

  if (PIXEL_ID && !window.fbq) {
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
    loadScript('https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }
}

function ga(event, params) {
  if (GA_ID && window.gtag) window.gtag('event', event, params);
}

function pixel(event, params, options) {
  if (PIXEL_ID && window.fbq) window.fbq('track', event, params, options);
}

const toItem = ({ id, name, price, quantity = 1, weight }) => ({
  item_id: String(id),
  item_name: name,
  item_variant: weight,
  price: Number(price) || 0,
  quantity
});

export function trackViewItem(product) {
  const item = toItem(product);
  ga('view_item', { currency: CURRENCY, value: item.price, items: [item] });
  pixel('ViewContent', { content_ids: [item.item_id], content_name: item.item_name, content_type: 'product', value: item.price, currency: CURRENCY });
}

export function trackAddToCart(product, weight, price) {
  const item = toItem({ ...product, weight, price });
  ga('add_to_cart', { currency: CURRENCY, value: item.price, items: [item] });
  pixel('AddToCart', { content_ids: [item.item_id], content_name: item.item_name, content_type: 'product', value: item.price, currency: CURRENCY });
}

export function trackBeginCheckout(cartItems, value) {
  const items = cartItems.map(toItem);
  ga('begin_checkout', { currency: CURRENCY, value, items });
  pixel('InitiateCheckout', { content_ids: items.map((i) => i.item_id), num_items: items.reduce((n, i) => n + i.quantity, 0), value, currency: CURRENCY });
}

// Sent once per order, even if the success page is reloaded.
export function trackPurchase(order) {
  if (!order?.id) return;
  const key = `tracked_purchase_${order.id}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch {
    // Storage unavailable: still report the purchase once for this page view
  }

  const items = (order.items || []).map((i) =>
    toItem({ id: i.productId, name: i.productName || i.product?.name, price: i.price, quantity: i.quantity, weight: i.weight })
  );
  const value = Number(order.totalAmount) || 0;
  ga('purchase', { transaction_id: String(order.id), currency: CURRENCY, value, items });
  // eventID lets Meta de-duplicate if a server-side Conversions API is added later
  pixel('Purchase', { content_ids: items.map((i) => i.item_id), content_type: 'product', num_items: items.reduce((n, i) => n + i.quantity, 0), value, currency: CURRENCY }, { eventID: `order_${order.id}` });
}
