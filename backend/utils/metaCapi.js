// ==========================================
// META CONVERSIONS API (server-side events for the Idukki Origins Pixel)
// Sends InitiateCheckout and Purchase from the server, alongside the browser Pixel. Each event
// carries the same event_id as its browser twin, so Meta counts it once (deduplication), and
// hashed customer details from checkout (better event match quality).
//
// Env (backend):
//   META_CAPI_TOKEN       access token from Events Manager > Pixel > Settings > Conversions API.
//                         Without it nothing is sent.
//   META_PIXEL_ID         defaults to the Idukki Origins pixel
//   META_TEST_EVENT_CODE  optional, e.g. TEST12345: events then show under "Test events" only
//   META_GRAPH_VERSION    optional Graph API version (default below)
//
// Events are sent in the background: a Meta outage never slows down or breaks a checkout.
// ==========================================
import crypto from 'crypto';

const TOKEN = (process.env.META_CAPI_TOKEN || '').trim();
const PIXEL_ID = (process.env.META_PIXEL_ID || '1433957032260246').trim();
const TEST_EVENT_CODE = (process.env.META_TEST_EVENT_CODE || '').trim();
const GRAPH_VERSION = (process.env.META_GRAPH_VERSION || 'v23.0').trim();
const CURRENCY = 'INR';
const REQUEST_TIMEOUT_MS = 8000;

if (TOKEN) {
  console.log(`📈 Meta Conversions API on for pixel ${PIXEL_ID}${TEST_EVENT_CODE ? ` (test code ${TEST_EVENT_CODE})` : ''}.`);
}

const FBP_REGEX = /^fb\.\d\.\d{10,16}\.\d{1,25}$/;
const FBC_REGEX = /^fb\.\d\.\d{10,16}\.[A-Za-z0-9_\-.]{1,500}$/;
const EVENT_ID_REGEX = /^[A-Za-z0-9_-]{8,80}$/;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hashed = (value) => (value ? [sha256(value)] : undefined);
const lettersOnly = (value) => String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z]/g, '');

/**
 * Validates the browser identifiers the checkout page sends ({ fbp, fbc, eventId, url }) and adds
 * the user agent. Anything malformed is dropped. Returns { browser, eventId }:
 * browser is stored with the checkout (so the Purchase can use it later), eventId is used once.
 */
export function readMetaBrowser(raw, req) {
  const meta = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const browser = {};
  if (typeof meta.fbp === 'string' && FBP_REGEX.test(meta.fbp)) browser.fbp = meta.fbp;
  if (typeof meta.fbc === 'string' && FBC_REGEX.test(meta.fbc)) browser.fbc = meta.fbc;
  const ua = req.get('user-agent');
  if (ua) browser.ua = ua.slice(0, 512);
  if (typeof meta.url === 'string' && /^https:\/\/[^\s]{1,500}$/.test(meta.url)) browser.url = meta.url;
  const eventId = typeof meta.eventId === 'string' && EVENT_ID_REGEX.test(meta.eventId) ? meta.eventId : null;
  return { browser, eventId };
}

// Customer details, normalised and SHA-256 hashed as Meta requires (IP, user agent, fbp, fbc are not hashed)
function userData(address, userId) {
  const nameParts = String(address.fullName || '').trim().split(/\s+/).filter(Boolean);
  const digits = String(address.mobileNumber || '').replace(/\D/g, '');
  const phone = digits.length === 10 ? `91${digits}` : digits.length === 12 && digits.startsWith('91') ? digits : '';
  const email = String(address.email || '').trim().toLowerCase();
  const pincode = String(address.pincode || '').replace(/\D/g, '');
  const browser = address.browser || {};

  const data = {
    em: hashed(email),
    ph: hashed(phone),
    fn: hashed(lettersOnly(nameParts[0])),
    ln: hashed(nameParts.length > 1 ? lettersOnly(nameParts[nameParts.length - 1]) : ''),
    ct: hashed(lettersOnly(address.city)),
    st: hashed(lettersOnly(address.state)),
    zp: hashed(pincode),
    country: hashed('in'),
    external_id: hashed(userId ? String(userId) : ''),
    client_ip_address: address.clientIp || undefined,
    client_user_agent: browser.ua || undefined,
    fbp: browser.fbp || undefined,
    fbc: browser.fbc || undefined
  };
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) delete data[key];
  }
  return data;
}

// Same item IDs as the catalog feed and the browser Pixel: "<productId>-<weight>"
function customData(lines, value) {
  return {
    currency: CURRENCY,
    value: Math.round(Number(value) * 100) / 100,
    content_type: 'product',
    content_ids: lines.map((line) => `${line.productId}-${line.weight || '100g'}`),
    contents: lines.map((line) => ({
      id: `${line.productId}-${line.weight || '100g'}`,
      quantity: line.quantity,
      item_price: Number(line.price) || 0
    })),
    num_items: lines.reduce((sum, line) => sum + line.quantity, 0)
  };
}

function sendEvent(event) {
  if (!TOKEN) return;
  const body = { data: [event], ...(TEST_EVENT_CODE && { test_event_code: TEST_EVENT_CODE }) };
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(TOKEN)}`;

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  })
    .then(async (res) => {
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        console.error(`Meta CAPI ${event.event_name} (${event.event_id}) rejected: ${res.status} ${detail.slice(0, 300)}`);
      }
    })
    .catch((err) => console.error(`Meta CAPI ${event.event_name} (${event.event_id}) failed:`, err.message));
}

const parse = (address) => {
  try {
    const parsed = typeof address === 'string' ? JSON.parse(address) : address;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

/** Server twin of the browser's InitiateCheckout, sent once the checkout is reserved. */
export function metaInitiateCheckout({ eventId, address, userId, priced, siteUrl }) {
  if (!TOKEN) return;
  const lines = priced.lines.map((line) => ({ productId: line.productId, weight: line.weight, quantity: line.quantity, price: line.unitPrice }));
  sendEvent({
    event_name: 'InitiateCheckout',
    event_time: Math.floor(Date.now() / 1000),
    // Without the browser's ID the event still counts, it just can't be deduplicated
    event_id: eventId || `checkout_${crypto.randomUUID()}`,
    action_source: 'website',
    event_source_url: address.browser?.url || `${siteUrl}/cart`,
    user_data: userData(address, userId),
    custom_data: customData(lines, priced.total)
  });
}

/** Server twin of the browser's Purchase. event_id "order_<id>" matches the Pixel's eventID. */
export function metaPurchase(order, siteUrl) {
  if (!TOKEN) return;
  const address = parse(order.address);
  sendEvent({
    event_name: 'Purchase',
    event_time: Math.floor(new Date(order.createdAt || Date.now()).getTime() / 1000),
    event_id: `order_${order.id}`,
    action_source: 'website',
    event_source_url: `${siteUrl}/success`,
    user_data: userData(address, order.userId),
    custom_data: {
      ...customData(order.items || [], order.totalAmount),
      order_id: String(order.id)
    }
  });
}
