import express from 'express';
import Stripe from 'stripe';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import pkg from '@prisma/client';
import prisma from '../db.js';
import { sendOrderConfirmation, sendCustomAdminMessage } from '../utils/emailService.js';
import { verifyToken, optionalAuth, getRequestUser } from './auth.js';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, STRIPE_SECRET_KEY, FRONTEND_URL, RAZORPAY_WEBHOOK_SECRET, STRIPE_WEBHOOK_SECRET } from '../config.js';
import { priceCart, CheckoutError } from '../utils/pricing.js';

const { Prisma } = pkg;
const router = express.Router();

// ==========================================
// HELPERS
// ==========================================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRACKING_TOKEN_REGEX = /^[a-f0-9]{48}$/;
const PENDING_CHECKOUT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// How long stock is held for an unpaid checkout. The Razorpay modal closes itself after 25 minutes
// (Cart.jsx); Stripe's minimum session lifetime is 30 minutes.
const RAZORPAY_RESERVATION_MS = 30 * 60 * 1000;
const STRIPE_SESSION_MS = 31 * 60 * 1000;

// Allowed shipping address fields and their maximum lengths. Anything else is dropped.
const ADDRESS_FIELDS = {
  fullName: 100,
  mobileNumber: 20,
  email: 254,
  pincode: 10,
  houseNo: 200,
  area: 200,
  landmark: 200,
  city: 100,
  state: 100
};
const REQUIRED_ADDRESS_FIELDS = ['fullName', 'mobileNumber', 'email', 'pincode', 'houseNo', 'area', 'city', 'state'];

// The real client IP. Express derives req.ip from X-Forwarded-For using the "trust proxy"
// setting, so clients cannot inject arbitrary values.
function getClientIp(req) {
  const ip = req.ip || req.socket.remoteAddress || '';
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

// Validates the client's address and returns a clean object containing only known fields.
function sanitizeAddress(raw, clientIp) {
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new CheckoutError('Invalid shipping address.');
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CheckoutError('Invalid shipping address.');
  }

  const clean = {};
  for (const [field, maxLength] of Object.entries(ADDRESS_FIELDS)) {
    const value = parsed[field];
    if (value === undefined || value === null) {
      clean[field] = '';
      continue;
    }
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new CheckoutError('Invalid shipping address.');
    }
    const text = String(value).trim();
    if (text.length > maxLength) {
      throw new CheckoutError(`Shipping address field "${field}" is too long.`);
    }
    clean[field] = text;
  }

  if (REQUIRED_ADDRESS_FIELDS.some((field) => !clean[field])) {
    throw new CheckoutError('Please complete all required shipping address fields.');
  }
  if (!EMAIL_REGEX.test(clean.email)) {
    throw new CheckoutError('Please enter a valid email address.');
  }

  clean.email = clean.email.toLowerCase();
  clean.clientIp = clientIp;
  return clean;
}

function parseAddress(address) {
  try {
    const parsed = typeof address === 'string' ? JSON.parse(address) : address;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

const round3 = (n) => Math.round(n * 1000) / 1000;
const TX_OPTIONS = { maxWait: 10000, timeout: 20000 };
const lineKey = (productId, weight) => `${productId}:${weight}`;

// Locks the given product rows (SELECT ... FOR UPDATE, in ID order to avoid deadlocks) and
// returns their current stock. The locks are held until the transaction ends.
async function lockProductStock(tx, productIds) {
  const stockByProduct = new Map();
  for (const productId of [...new Set(productIds)].sort((a, b) => a - b)) {
    const rows = await tx.$queryRaw`SELECT "stock" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
    if (rows.length > 0) stockByProduct.set(productId, Number(rows[0].stock));
  }
  return stockByProduct;
}

// Deducts each cart line from the locked stock (sequentially, so several weights of one product
// add up). Returns a per-line snapshot and whether any line needed more stock than was left.
// Stock is floored at 0, never negative.
function deductLines(lines, stockByProduct) {
  let shortfall = false;
  const snapshots = lines.map((line) => {
    const initialStock = stockByProduct.get(line.productId) ?? 0;
    if (initialStock < line.kg) shortfall = true;
    const finalStock = round3(Math.max(0, initialStock - line.kg));
    stockByProduct.set(line.productId, finalStock);
    return { productId: line.productId, weight: line.weight, kg: line.kg, initialStock, finalStock };
  });
  return { snapshots, shortfall };
}

async function writeStock(tx, stockByProduct) {
  for (const [productId, stock] of stockByProduct) {
    await tx.product.update({ where: { id: productId }, data: { stock } });
  }
}

/**
 * Remembers who is paying, where it ships and what is in the cart, keyed by the payment
 * provider's order/session ID (confirmation reads everything from here, never from the client),
 * and RESERVES the stock until reservedUntil. Throws CheckoutError if an item sold out.
 */
async function reserveCheckout({ id, provider, req, address, priced, reservedUntil }) {
  await prisma.$transaction(async (tx) => {
    const stockByProduct = await lockProductStock(tx, priced.lines.map((line) => line.productId));
    const { snapshots, shortfall } = deductLines(priced.lines, stockByProduct);
    if (shortfall) {
      throw new CheckoutError('Sorry, an item in your cart just sold out. Please review your cart and try again.');
    }
    await writeStock(tx, stockByProduct);

    await tx.pendingCheckout.create({
      data: {
        id,
        provider,
        userId: req.user ? req.user.id : null,
        address: JSON.stringify(address),
        items: priced.lines.map((line) => ({ id: line.productId, weight: line.weight, quantity: line.quantity })),
        couponCode: priced.couponCode,
        reserved: true,
        reservation: snapshots,
        reservedUntil
      }
    });
  }, TX_OPTIONS);

  // Opportunistic cleanup of old checkouts that were never paid (their stock is already released)
  prisma.pendingCheckout
    .deleteMany({ where: { reserved: false, createdAt: { lt: new Date(Date.now() - PENDING_CHECKOUT_TTL_MS) } } })
    .catch((err) => console.error('Pending checkout cleanup failed:', err));
}

// Returns the stock of every unpaid checkout whose reservation has expired. Each release locks the
// PendingCheckout row first (the same order recordPaidOrder uses), so a checkout can never be
// both paid from its reservation and released.
async function releaseExpiredReservations() {
  const expired = await prisma.pendingCheckout.findMany({
    where: { reserved: true, reservedUntil: { lt: new Date() } },
    select: { id: true },
    take: 100
  });

  for (const { id } of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw`SELECT "reserved", "reservation" FROM "PendingCheckout" WHERE "id" = ${id} FOR UPDATE`;
        if (rows.length === 0 || !rows[0].reserved) return; // paid or released in the meantime

        const kgByProduct = new Map();
        for (const snap of rows[0].reservation || []) {
          kgByProduct.set(snap.productId, (kgByProduct.get(snap.productId) || 0) + snap.kg);
        }
        for (const productId of [...kgByProduct.keys()].sort((a, b) => a - b)) {
          await tx.product.updateMany({ where: { id: productId }, data: { stock: { increment: kgByProduct.get(productId) } } });
        }
        await tx.pendingCheckout.update({ where: { id }, data: { reserved: false } });
      }, TX_OPTIONS);
      console.log(`Released expired stock reservation for checkout ${id}`);
    } catch (err) {
      console.error(`Failed to release stock reservation for checkout ${id}:`, err);
    }
  }
}

let reservationSweeper = null;
export function startReservationSweeper(intervalMs = 60 * 1000) {
  if (reservationSweeper) return;
  const run = () => releaseExpiredReservations().catch((err) => console.error('Reservation sweep failed:', err));
  run();
  reservationSweeper = setInterval(run, intervalMs);
  reservationSweeper.unref();
}

const ORDER_INCLUDE = { items: { include: { product: true } } };

/**
 * Records a paid order in ONE transaction. Normally the stock was reserved at checkout and is
 * simply kept. If the reservation had expired and been released (or there is none, e.g. a legacy
 * payment), stock is deducted now under row locks. If it ran out while the customer was paying,
 * the order is still recorded (they have paid) but marked "On Hold" for an admin to refund or
 * restock, and stock is floored at 0 instead of going negative.
 */
async function recordPaidOrder({ lines, userId, address, totalAmount, paymentFields, pendingCheckoutId }) {
  return prisma.$transaction(async (tx) => {
    let reservation = null;
    if (pendingCheckoutId) {
      const rows = await tx.$queryRaw`SELECT "reserved", "reservation" FROM "PendingCheckout" WHERE "id" = ${pendingCheckoutId} FOR UPDATE`;
      if (rows.length > 0 && rows[0].reserved) reservation = rows[0].reservation;
    }

    let snapshots;
    let oversold = false;
    if (reservation) {
      snapshots = reservation; // stock was already deducted when the checkout started
    } else {
      const stockByProduct = await lockProductStock(tx, lines.map((line) => line.productId));
      const result = deductLines(lines, stockByProduct);
      snapshots = result.snapshots;
      oversold = result.shortfall;
      await writeStock(tx, stockByProduct);
    }
    const snapshotByLine = new Map(snapshots.map((snap) => [lineKey(snap.productId, snap.weight), snap]));

    const orderItemsData = lines.map((line) => {
      const snap = snapshotByLine.get(lineKey(line.productId, line.weight));
      return {
        productId: line.productId,
        productName: line.product.name,
        productImage: line.product.images && line.product.images.length > 0 ? line.product.images[0] : '',
        quantity: line.quantity,
        price: line.unitPrice,
        weight: line.weight,
        initialStock: snap ? snap.initialStock : null,
        finalStock: snap ? snap.finalStock : null
      };
    });

    if (oversold) {
      console.warn(`Order oversold stock (payment ${JSON.stringify(paymentFields)}); recording it as On Hold.`);
    }

    const order = await tx.order.create({
      data: {
        userId,
        totalAmount,
        address,
        status: oversold ? 'On Hold' : 'PAID',
        trackingToken: crypto.randomBytes(24).toString('hex'),
        ...paymentFields,
        items: { create: orderItemsData }
      },
      include: ORDER_INCLUDE
    });

    if (pendingCheckoutId) {
      await tx.pendingCheckout.deleteMany({ where: { id: pendingCheckoutId } });
    }
    return order;
  }, TX_OPTIONS);
}

const isUniqueViolation = (err) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

// Sends the confirmation email in the background. Logged-in buyers get it at their account email
// (verified). Guests get it at the unverified checkout email they typed, so their version contains
// NO buyer-supplied text (no name, no address): only our product names, amounts and the tracking
// link. That way nobody can use checkout to send their own words from our address.
function sendConfirmationInBackground(order) {
  (async () => {
    let recipient = null;
    if (order.userId) {
      const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { email: true } });
      recipient = user?.email || null;
    } else {
      recipient = parseAddress(order.address).email || null;
    }
    if (!recipient) return;

    const trackingUrl = `${FRONTEND_URL}/track-order?id=${order.id}&token=${order.trackingToken}`;
    console.log(`📧 Sending confirmation for order ${order.id}`);
    await sendOrderConfirmation(recipient, order, trackingUrl, { includeBuyerDetails: Boolean(order.userId) });
  })().catch((e) => console.error('Background email task failed:', e));
}

// First-order coupons (e.g. STARTER) need a logged-in customer who has never ordered before.
// Guests can't be recognised across orders, so they can't use them.
async function assertCouponAllowed(priced, user) {
  if (!priced.couponFirstOrderOnly) return;
  if (!user) {
    throw new CheckoutError(`${priced.couponCode} is a first-order coupon. Please log in to use it.`);
  }
  const previousOrders = await prisma.order.count({ where: { userId: user.id } });
  if (previousOrders > 0) {
    throw new CheckoutError(`${priced.couponCode} can only be used on your first order.`);
  }
}

// ==========================================
// RAZORPAY CHECKOUT ROUTE
// ==========================================
router.post('/create-razorpay-order', optionalAuth, async (req, res) => {
  try {
    const { items, address, couponCode } = req.body;

    // The buyer comes from the session token (or is a guest), never from the request body
    const cleanAddress = sanitizeAddress(address, getClientIp(req));

    // Price the cart entirely on the server (prices, stock, coupon, shipping come from our DB/config)
    const priced = await priceCart(prisma, items, couponCode);
    await assertCouponAllowed(priced, req.user);

    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });

    const options = {
      amount: Math.round(priced.total * 100), // amount in paisa
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
      // Bind this payment order to the exact cart so it can't be confirmed with a different one
      notes: { cartHash: priced.cartHash, couponCode: priced.couponCode }
    };

    const order = await razorpay.orders.create(options);
    await reserveCheckout({
      id: order.id,
      provider: 'razorpay',
      req,
      address: cleanAddress,
      priced,
      reservedUntil: new Date(Date.now() + RAZORPAY_RESERVATION_MS)
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ error: 'Failed to create Razorpay order.' });
  }
});

// ==========================================
// STRIPE CHECKOUT ROUTE
// ==========================================
router.post('/create-checkout-session', optionalAuth, async (req, res) => {
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const { items, address, couponCode } = req.body;

    const cleanAddress = sanitizeAddress(address, getClientIp(req));
    const frontendUrl = FRONTEND_URL;

    // Price the cart entirely on the server (prices, stock, coupon, shipping come from our DB/config)
    const priced = await priceCart(prisma, items, couponCode);
    await assertCouponAllowed(priced, req.user);

    // 1. Transform our server-priced cart lines into the format Stripe expects
    const lineItems = priced.lines.map((line) => {
      let imageUrl = line.product.images && line.product.images.length > 0 ? line.product.images[0] : null;
      if (imageUrl && imageUrl.startsWith('/')) {
        imageUrl = `${frontendUrl}${imageUrl}`;
      }

      return {
        price_data: {
          currency: 'inr',
          product_data: {
            name: `${line.product.name} (${line.weight})`,
            images: imageUrl ? [imageUrl] : [],
          },
          unit_amount: Math.round(line.unitPrice * 100),
        },
        quantity: line.quantity,
      };
    });

    // 2. Add shipping fee if subtotal is below the free-shipping threshold
    if (priced.shipping > 0) {
      lineItems.push({
        price_data: {
          currency: 'inr',
          product_data: {
            name: 'Shipping Charges',
            description: 'Shipping cost for orders below ₹500',
          },
          unit_amount: Math.round(priced.shipping * 100),
        },
        quantity: 1,
      });
    }

    // Apply the (server-validated) coupon as a one-time Stripe coupon
    const discounts = [];
    if (priced.discount > 0) {
      const stripeCoupon = await stripe.coupons.create({
        amount_off: Math.round(priced.discount * 100),
        currency: 'inr',
        duration: 'once',
        max_redemptions: 1,
      });
      discounts.push({ coupon: stripeCoupon.id });
    }

    // 3. Create a secure Checkout Session. The buyer, address and cart are stored server-side
    //    (PendingCheckout), not in client-influenced metadata.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      ...(discounts.length > 0 && { discounts }),
      mode: 'payment',
      // Include session_id in the success URL so we can verify it
      success_url: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/cart`,
      metadata: { cartHash: priced.cartHash },
      // The session cannot be paid after this, so the reservation below safely outlives it
      expires_at: Math.floor((Date.now() + STRIPE_SESSION_MS) / 1000)
    });

    await reserveCheckout({
      id: session.id,
      provider: 'stripe',
      req,
      address: cleanAddress,
      priced,
      reservedUntil: new Date(Date.now() + STRIPE_SESSION_MS + 5 * 60 * 1000)
    });

    res.json({ url: session.url });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Stripe error:', error.message);
    res.status(500).json({ error: 'Failed to create Stripe checkout session.' });
  }
});

// ==========================================
// PAYMENT FINALIZATION (shared by the browser callbacks and the payment webhooks)
// ==========================================
const noCheckoutFound = (paymentId) =>
  new CheckoutError(`We could not find the checkout for this payment. Please contact support with your payment ID: ${paymentId}`);

/**
 * Records the order for a verified Razorpay payment, exactly once, whichever arrives first: the
 * browser callback or the webhook. Returns { order, alreadyRecorded }. Throws CheckoutError for
 * problems that retrying cannot fix.
 *
 * legacyCart ({ items, couponCode, address }) is only used for payments that started before
 * server-side checkout records existed (sent by the old page); such orders are always guest orders.
 */
async function finalizeRazorpayPayment({ razorpayOrderId, razorpayPaymentId, legacyCart = null, clientIp = '' }) {
  const existingOrder = await prisma.order.findUnique({ where: { razorpayOrderId }, include: ORDER_INCLUDE });
  if (existingOrder) return { order: existingOrder, alreadyRecorded: true };

  // Load what was recorded server-side when this payment order was created
  let pending = await prisma.pendingCheckout.findUnique({ where: { id: razorpayOrderId } });
  if (pending && pending.provider !== 'razorpay') throw noCheckoutFound(razorpayPaymentId);
  if (!pending) {
    if (!legacyCart) throw noCheckoutFound(razorpayPaymentId);
    pending = {
      id: null,
      userId: null,
      items: legacyCart.items,
      couponCode: legacyCart.couponCode,
      address: JSON.stringify(sanitizeAddress(legacyCart.address, clientIp))
    };
  }

  // The Razorpay order holds the amount actually charged and the hash of the cart priced at checkout
  const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
  const rzpOrder = await razorpay.orders.fetch(razorpayOrderId);

  // Re-price the stored cart. Availability is not enforced here: the customer has already paid.
  const priced = await priceCart(prisma, pending.items, pending.couponCode, { enforceAvailability: false });
  if (!rzpOrder.notes || rzpOrder.notes.cartHash !== priced.cartHash) {
    throw new CheckoutError(`Cart does not match the paid order. Please contact support with your payment ID: ${razorpayPaymentId}`);
  }
  if (Math.round(priced.total * 100) !== rzpOrder.amount) {
    // Prices changed between checkout and confirmation; the customer was charged rzpOrder.amount
    console.warn(`Amount mismatch for Razorpay order ${razorpayOrderId}: charged ${rzpOrder.amount}, repriced ${Math.round(priced.total * 100)}`);
  }

  try {
    const order = await recordPaidOrder({
      lines: priced.lines,
      userId: pending.userId,
      address: pending.address,
      totalAmount: rzpOrder.amount / 100, // what the customer actually paid
      paymentFields: { razorpayOrderId, razorpayPaymentId },
      pendingCheckoutId: pending.id
    });
    return { order, alreadyRecorded: false };
  } catch (err) {
    // A concurrent confirmation of the same payment won the race; its transaction recorded the order
    if (isUniqueViolation(err)) {
      const raced = await prisma.order.findUnique({ where: { razorpayOrderId }, include: ORDER_INCLUDE });
      if (raced) return { order: raced, alreadyRecorded: true };
    }
    throw err;
  }
}

/**
 * Records the order for a paid Stripe Checkout Session, exactly once. Pass the session object when
 * the caller already has it (the webhook); otherwise it is retrieved from Stripe.
 */
async function finalizeStripeSession(sessionId, session = null) {
  const existingOrder = await prisma.order.findUnique({ where: { stripeSessionId: sessionId }, include: ORDER_INCLUDE });
  if (existingOrder) return { order: existingOrder, alreadyRecorded: true };

  const checkoutSession = session || await new Stripe(STRIPE_SECRET_KEY).checkout.sessions.retrieve(sessionId);
  if (checkoutSession.payment_status !== 'paid') {
    throw new CheckoutError('Payment not completed');
  }

  const pending = await prisma.pendingCheckout.findUnique({ where: { id: sessionId } });
  if (!pending || pending.provider !== 'stripe') {
    throw new CheckoutError('We could not find the checkout for this payment. Please contact support.');
  }

  const priced = await priceCart(prisma, pending.items, pending.couponCode, { enforceAvailability: false });
  if (checkoutSession.metadata?.cartHash !== priced.cartHash) {
    throw new CheckoutError('Cart does not match the paid order. Please contact support.');
  }

  try {
    const order = await recordPaidOrder({
      lines: priced.lines,
      userId: pending.userId,
      address: pending.address,
      totalAmount: checkoutSession.amount_total / 100, // what the customer actually paid
      paymentFields: { stripeSessionId: sessionId },
      pendingCheckoutId: pending.id
    });
    return { order, alreadyRecorded: false };
  } catch (err) {
    if (isUniqueViolation(err)) {
      const raced = await prisma.order.findUnique({ where: { stripeSessionId: sessionId }, include: ORDER_INCLUDE });
      if (raced) return { order: raced, alreadyRecorded: true };
    }
    throw err;
  }
}

// Constant-time comparison of two hex/ASCII signatures
function signaturesMatch(given, expected) {
  const a = Buffer.from(String(given));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ==========================================
// CONFIRM RAZORPAY ORDER ROUTE (browser callback after payment)
// ==========================================
router.post('/confirm-razorpay-order', async (req, res) => {
  // Only the payment proof is read from the client. The buyer, address and cart come from the
  // PendingCheckout saved when the Razorpay order was created.
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (typeof razorpay_order_id !== 'string' || typeof razorpay_payment_id !== 'string' || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment details.' });
  }

  try {
    // 1. Verify Razorpay Payment Signature
    const generated_signature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');
    if (!signaturesMatch(razorpay_signature, generated_signature)) {
      return res.status(400).json({ error: 'Signature verification failed. The transaction may have been tampered.' });
    }

    // 2. Record the order (or return it if the webhook already did)
    const hasLegacyCart = req.body.items !== undefined && req.body.address !== undefined;
    const { order, alreadyRecorded } = await finalizeRazorpayPayment({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      legacyCart: hasLegacyCart ? { items: req.body.items, couponCode: req.body.couponCode, address: req.body.address } : null,
      clientIp: getClientIp(req)
    });

    // 3. Send response immediately, then the confirmation email in the background
    res.json({ success: true, order, ...(alreadyRecorded && { message: 'Order already recorded' }) });
    if (!alreadyRecorded) sendConfirmationInBackground(order);
  } catch (error) {
    if (error instanceof CheckoutError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Razorpay confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm order. Please contact support with your payment ID: ' + razorpay_payment_id });
  }
});

// ==========================================
// CONFIRM ORDER ROUTE (Stripe success page)
// ==========================================
router.get('/confirm-order', async (req, res) => {
  const { session_id } = req.query;

  if (typeof session_id !== 'string' || !session_id || session_id.length > 255) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    const { order, alreadyRecorded } = await finalizeStripeSession(session_id);
    res.json({ success: true, order, ...(alreadyRecorded && { message: 'Order already recorded' }) });
    if (!alreadyRecorded) sendConfirmationInBackground(order);
  } catch (error) {
    if (error instanceof CheckoutError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Order confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm order. Please contact support.' });
  }
});

// ==========================================
// PAYMENT WEBHOOKS
// Called by Razorpay / Stripe themselves, so orders are recorded even if the customer closes the
// tab before the success page loads. Signatures are verified over the raw request body.
// Permanent problems answer 200 (so the provider stops retrying) and are logged; unexpected
// errors answer 500 so the provider retries later.
// ==========================================
router.post('/razorpay-webhook', async (req, res) => {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Webhook not configured' });
  }
  const signature = req.header('X-Razorpay-Signature');
  if (!req.rawBody || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Invalid webhook' });
  }
  const expected = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(req.rawBody).digest('hex');
  if (!signaturesMatch(signature, expected)) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const { event, payload } = req.body || {};
  if (event !== 'payment.captured' && event !== 'order.paid') {
    return res.json({ received: true, ignored: event });
  }
  const payment = payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id || payload?.order?.entity?.id;
  const razorpayPaymentId = payment?.id;
  if (typeof razorpayOrderId !== 'string' || typeof razorpayPaymentId !== 'string') {
    return res.json({ received: true, ignored: 'no order/payment id' });
  }

  try {
    const { order, alreadyRecorded } = await finalizeRazorpayPayment({ razorpayOrderId, razorpayPaymentId });
    if (!alreadyRecorded) {
      console.log(`Razorpay webhook recorded order ${order.id} (${razorpayOrderId})`);
      sendConfirmationInBackground(order);
    }
    res.json({ received: true });
  } catch (error) {
    if (error instanceof CheckoutError) {
      console.warn(`Razorpay webhook for ${razorpayOrderId} not recorded: ${error.message}`);
      return res.json({ received: true, ignored: error.message });
    }
    console.error('Razorpay webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/stripe-webhook', async (req, res) => {
  if (!STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Webhook not configured' });
  }

  let event;
  try {
    event = new Stripe(STRIPE_SECRET_KEY).webhooks.constructEvent(req.rawBody, req.header('Stripe-Signature'), STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return res.json({ received: true, ignored: event.type });
  }
  const session = event.data.object;
  if (session.payment_status !== 'paid') {
    return res.json({ received: true, ignored: 'not paid yet' });
  }

  try {
    const { order, alreadyRecorded } = await finalizeStripeSession(session.id, session);
    if (!alreadyRecorded) {
      console.log(`Stripe webhook recorded order ${order.id} (${session.id})`);
      sendConfirmationInBackground(order);
    }
    res.json({ received: true });
  } catch (error) {
    if (error instanceof CheckoutError) {
      console.warn(`Stripe webhook for ${session.id} not recorded: ${error.message}`);
      return res.json({ received: true, ignored: error.message });
    }
    console.error('Stripe webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ==========================================
// GET USER'S ORDERS ROUTE
// ==========================================
router.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch all orders for this user, ordered by creation date (newest first)
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    res.json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ error: 'Failed to fetch your orders' });
  }
});

// ==========================================
// GET ADMIN DASHBOARD DATA ROUTE
// ==========================================
router.get('/admin/dashboard', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    // Fetch all orders in the entire system, ordered by creation date (newest first)
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: true
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    res.json(orders);
  } catch (error) {
    console.error('Fetch admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch admin dashboard data' });
  }
});

// ==========================================
// SEND CUSTOM MESSAGE TO ORDER RECIPIENT
// ==========================================
router.post('/admin/orders/:id/send-message', verifyToken, async (req, res) => {
  try {
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    const { id } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        user: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Parse the address to retrieve email
    let recipientEmail = null;
    let recipientName = null;
    try {
      const address = JSON.parse(order.address);
      recipientEmail = address.email;
      recipientName = address.fullName;
    } catch (e) {
      console.error('Error parsing order address:', e);
    }

    // Fallbacks
    if (!recipientEmail) {
      recipientEmail = order.user?.email;
    }
    if (!recipientName) {
      recipientName = order.user?.name || 'Valued Customer';
    }

    if (!recipientEmail) {
      return res.status(400).json({ error: 'No email address found for this order' });
    }

    console.log(`📧 Admin sending custom message to: ${recipientEmail}`);
    const success = await sendCustomAdminMessage(recipientEmail, recipientName, order, message);

    if (success) {
      // Save sent message to DB
      const createdMessage = await prisma.orderMessage.create({
        data: {
          orderId: order.id,
          message,
          sentBy: 'admin'
        }
      });
      res.json({ success: true, message: 'Message sent successfully', orderMessage: createdMessage });
    } else {
      res.status(500).json({ error: 'Failed to send message via Brevo' });
    }
  } catch (error) {
    console.error('Send custom admin message error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// ==========================================
// UPDATE ORDER STATUS (ADMIN ONLY)
// ==========================================
router.put('/admin/orders/:id/status', verifyToken, async (req, res) => {
  try {
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PAID', 'Processing', 'On Hold', 'Completed', 'Cancelled', 'Pending Payment', 'Refunded', 'Failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id, 10) },
      data: { status }
    });

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// ==========================================
// UPDATE ORDER ADDRESS (ADMIN ONLY)
// ==========================================
router.put('/admin/orders/:id/address', verifyToken, async (req, res) => {
  try {
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    const { id } = req.params;
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address data is required' });
    }

    const addressString = typeof address === 'string' ? address : JSON.stringify(address);

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id, 10) },
      data: { address: addressString },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: true
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Update order address error:', error);
    res.status(500).json({ error: 'Failed to update order address' });
  }
});

// ==========================================
// PUBLIC TRACK ORDER ROUTE
// ==========================================
const maskName = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
};
const maskPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length > 4 ? `******${digits.slice(-4)}` : '';
};

// Only the fields the tracking page needs. Never userId, clientIp or payment identifiers.
// With "limited" access (order ID + email only) the street address, phone and messages are hidden.
function toTrackingView(order, address, fullAccess) {
  const view = {
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    limited: !fullAccess,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName || item.product?.name || 'Product',
      productImage: item.productImage || item.product?.images?.[0] || '',
      quantity: item.quantity,
      price: item.price,
      weight: item.weight
    }))
  };

  if (fullAccess) {
    view.address = JSON.stringify({
      fullName: address.fullName || '',
      mobileNumber: address.mobileNumber || '',
      email: address.email || order.user?.email || '',
      houseNo: address.houseNo || '',
      area: address.area || '',
      landmark: address.landmark || '',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode || ''
    });
    view.messages = order.messages.map((msg) => ({ id: msg.id, message: msg.message, createdAt: msg.createdAt }));
  } else {
    view.address = JSON.stringify({
      fullName: maskName(address.fullName),
      mobileNumber: maskPhone(address.mobileNumber),
      email: address.email || order.user?.email || '',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode || ''
    });
    view.messages = [];
  }
  return view;
}

// Access (checked in this order):
//   1. the logged-in owner of the order            -> full details
//   2. order ID + the secret token from the email  -> full details
//   3. order ID + checkout/account email           -> limited details (rate limited in server.js)
// Every failure returns the same 404 so the endpoint does not reveal which order IDs exist.
router.get('/track-order', async (req, res) => {
  const notFound = () => res.status(404).json({ error: 'No order matches these details. Please check the Order ID and email.' });

  try {
    const { id, email, token } = req.query;

    if (typeof id !== 'string' || !/^\d{1,9}$/.test(id.trim())) {
      return res.status(400).json({ error: 'Invalid Order ID format' });
    }
    const hasToken = typeof token === 'string' && TRACKING_TOKEN_REGEX.test(token);
    const queryEmail = typeof email === 'string' && email.length <= 254 ? email.toLowerCase().trim() : '';

    const loggedInUser = await getRequestUser(req);
    if (!hasToken && !queryEmail && !loggedInUser) {
      return res.status(400).json({ error: 'Order ID and Email Address are required' });
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(id.trim()) },
      include: {
        user: { select: { email: true } },
        items: { include: { product: { select: { name: true, images: true } } } },
        messages: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!order) return notFound();

    const address = parseAddress(order.address);
    let fullAccess = false;

    if (loggedInUser && order.userId === loggedInUser.id) {
      fullAccess = true;
    } else if (hasToken && order.trackingToken) {
      const given = Buffer.from(token);
      const expected = Buffer.from(order.trackingToken);
      fullAccess = given.length === expected.length && crypto.timingSafeEqual(given, expected);
      if (!fullAccess) return notFound();
    } else {
      const checkoutEmail = typeof address.email === 'string' ? address.email.toLowerCase().trim() : '';
      const userEmail = order.user?.email ? order.user.email.toLowerCase().trim() : '';
      const matches = queryEmail && (queryEmail === checkoutEmail || queryEmail === userEmail);
      if (!matches) return notFound();
    }

    res.json({ success: true, order: toTrackingView(order, address, fullAccess) });
  } catch (error) {
    console.error('Track order lookup error:', error);
    res.status(500).json({ error: 'Failed to retrieve order tracking info' });
  }
});

export default router;
