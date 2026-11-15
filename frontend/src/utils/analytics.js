// Google Analytics 4 + Meta Pixel. Each one only loads when it has an ID (Vercel env vars):
//   VITE_GA_MEASUREMENT_ID = "G-XXXXXXXXXX"
//   VITE_META_PIXEL_ID     = "123456789012345" (defaults to the Idukki Origins pixel below)
// The official snippets are inline <script>s, which our Content-Security-Policy blocks, so the
// same bootstrap code lives here instead. Both tools track SPA route changes on their own
// (GA4 enhanced measurement / Meta's history listener), so only shop events are sent manually.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
// The pixel ID is public (it is in every page that loads the pixel), so it can live in the code
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID?.trim() || '1433957032260246';
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

// Meta catalog IDs, as in the product feed (backend/routes/feed.js): every weight is its own item
// "1-250g", grouped under the product ID "1". Matching IDs let Meta tie events to catalog items.
const catalogId = (item) => `${item.item_id}-${item.item_variant || '100g'}`;
const catalogContents = (items) => items.map((i) => ({ id: catalogId(i), quantity: i.quantity, item_price: i.price }));

export function trackViewItem(product) {
  const item = toItem(product);
  ga('view_item', { currency: CURRENCY, value: item.price, items: [item] });
  // The product page shows every weight, so this is the product group (item_group_id in the feed)
  pixel('ViewContent', { content_ids: [item.item_id], content_name: item.item_name, content_type: 'product_group', value: item.price, currency: CURRENCY });
}

export function trackAddToCart(product, weight, price) {
  const item = toItem({ ...product, weight, price });
  ga('add_to_cart', { currency: CURRENCY, value: item.price, items: [item] });
  pixel('AddToCart', { content_ids: [catalogId(item)], contents: catalogContents([item]), content_name: item.item_name, content_type: 'product', value: item.price, currency: CURRENCY });
}

const randomId = () =>
  (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9-]/g, '');

// Returns the event ID it used, so the server's Conversions API event can share it (deduplication)
export function trackBeginCheckout(cartItems, value) {
  const items = cartItems.map(toItem);
  const eventId = `checkout_${randomId()}`;
  ga('begin_checkout', { currency: CURRENCY, value, items });
  pixel('InitiateCheckout', { content_ids: items.map(catalogId), contents: catalogContents(items), content_type: 'product', num_items: items.reduce((n, i) => n + i.quantity, 0), value, currency: CURRENCY }, { eventID: eventId });
  return eventId;
}

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

// The Pixel's browser IDs, sent with the checkout so the server's Conversions API events can be
// matched to this visitor (and to the ad click, via fbclid). The backend is on another domain, so
// it cannot read these cookies itself.
export function metaBrowserIds(eventId) {
  let fbc = readCookie('_fbc');
  if (!fbc) {
    const fbclid = new URLSearchParams(window.location.search).get('fbclid');
    if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
  }
  return { fbp: readCookie('_fbp'), fbc, eventId, url: window.location.href.split('#')[0] };
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
  // The server sends the same Purchase through the Conversions API with this event ID; Meta keeps one
  pixel('Purchase', { content_ids: items.map(catalogId), contents: catalogContents(items), content_type: 'product', num_items: items.reduce((n, i) => n + i.quantity, 0), value, currency: CURRENCY }, { eventID: `order_${order.id}` });
}
