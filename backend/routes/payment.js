import express from 'express';
import Stripe from 'stripe';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import pkg from '@prisma/client';
import prisma from '../db.js';
import { sendOrderConfirmation, sendCustomAdminMessage, sendShippingUpdate } from '../utils/emailService.js';
import { plainPersonName } from '../utils/personName.js';
import { CARRIERS, DEFAULT_CARRIER, carrierFor, trackingInfo } from '../utils/carriers.js';
import { invalidateProducts } from '../utils/cache.js';
import { normalizeIndianMobile } from '../utils/phone.js';
import { renderInvoicePdf, renderInvoicesPdf, invoiceFileName, invoiceData } from '../utils/invoice.js';
import { orderAmounts } from '../utils/tax.js';
import { renderShippingLabelPdf, renderShippingLabelsPdf, labelFileName } from '../utils/shippingLabel.js';
import { verifyToken, optionalAuth, getRequestUser } from './auth.js';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, STRIPE_SECRET_KEY, FRONTEND_URL, RAZORPAY_WEBHOOK_SECRET, STRIPE_WEBHOOK_SECRET } from '../config.js';
import { readMetaBrowser, metaInitiateCheckout, metaPurchase } from '../utils/metaCapi.js';
import { priceCart, CheckoutError, WEIGHT_OPTIONS, COUPONS, FREE_SHIPPING_THRESHOLD, SHIPPING_CHARGE, getUnitPrice } from '../utils/pricing.js';

const { Prisma } = pkg;
const router = express.Router();

// ==========================================
// HELPERS
// ==========================================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRACKING_TOKEN_REGEX = /^[a-f0-9]{48}$/;
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
  // Couriers need a reachable Indian mobile number: stored as exactly 10 digits
  clean.mobileNumber = normalizeIndianMobile(clean.mobileNumber);
  if (!clean.mobileNumber) {
    throw new CheckoutError('Please enter a valid 10-digit mobile number.');
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

// Adds entries to an order's history (OrderEvent). Always called AFTER the change itself has
// succeeded, and never throws: a missing history line must not fail an order or a status change.
// events: [{ orderId, type, message, actor? }]
async function logOrderEvents(events) {
  const data = events.filter(Boolean).map(({ orderId, type, message, actor = null }) => ({ orderId, type, message, actor }));
  if (data.length === 0) return;
  try {
    await prisma.orderEvent.createMany({ data });
  } catch (err) {
    console.error('Could not write order history:', err.message);
  }
}
const kgText = (kg) => `${round3(Number(kg) || 0)} kg`;
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
  // Unpaid checkouts are kept until an admin deletes them (Abandoned Checkout in the dashboard)
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

// Farmer names are used by the confirmation email ("Grown by ...")
const ORDER_INCLUDE = { items: { include: { product: { include: { farmer: { select: { name: true } } } } } } };

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
// Where order emails go: the account email for logged-in buyers, the checkout email for guests
async function orderRecipient(order) {
  if (order.userId) {
    const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { email: true } });
    return user?.email || null;
  }
  return parseAddress(order.address).email || null;
}

const SITE_URL = FRONTEND_URL.replace(/\/+$/, '');

// Everything that follows a newly recorded order: the confirmation email and the server-side
// Purchase event for Meta (deduplicated against the browser Pixel by its order_<id> event ID)
function onNewOrder(order) {
  sendConfirmationInBackground(order);
  metaPurchase(order, SITE_URL);
}

function sendConfirmationInBackground(order) {
  sendConfirmationEmail(order).catch((e) => console.error('Background email task failed:', e));
}

// Sends the order confirmation email with the GST invoice attached, and records it in the order
// history. Used automatically for every new order, and by admins to send it again.
// order: with ORDER_INCLUDE. actor: the admin's email when sent by hand.
// Returns { sent, recipient } (recipient is null when the order has no email address).
async function sendConfirmationEmail(order, actor = null) {
  const recipient = await orderRecipient(order);
  if (!recipient) return { sent: false, recipient: null };

  const trackingUrl = `${FRONTEND_URL}/track-order?id=${order.id}&token=${order.trackingToken}`;
  const includeBuyerDetails = Boolean(order.userId);

  // GST invoice as a PDF attachment (same rule for buyer details as the email itself).
  // If it cannot be built, the confirmation still goes out without it.
  let invoice = null;
  try {
    invoice = { name: invoiceFileName(order), content: await renderInvoicePdf(order, { includeBuyerDetails }) };
  } catch (err) {
    console.error(`Invoice for order ${order.id} could not be created:`, err);
  }

  console.log(`📧 Sending confirmation for order ${order.id}${invoice ? ' with invoice' : ''}${actor ? ` (by ${actor})` : ''}`);
  const sent = await sendOrderConfirmation(recipient, order, trackingUrl, { includeBuyerDetails, invoice });
  await logOrderEvents([{
    orderId: order.id,
    type: 'email',
    actor,
    message: sent
      ? `Order confirmation email ${actor ? 'sent again' : 'sent'} to ${recipient}${invoice ? ' with the GST invoice' : ''}.`
      : `Order confirmation email to ${recipient} could not be sent.`
  }]);
  return { sent, recipient, withInvoice: Boolean(invoice) };
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
    // Meta browser IDs (_fbp/_fbc cookies, user agent) are kept with the checkout for the Purchase event
    const { browser, eventId: metaEventId } = readMetaBrowser(req.body.meta, req);
    cleanAddress.browser = browser;

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
    metaInitiateCheckout({ eventId: metaEventId, address: cleanAddress, userId: req.user?.id, priced, siteUrl: SITE_URL });

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
    const { browser, eventId: metaEventId } = readMetaBrowser(req.body.meta, req);
    cleanAddress.browser = browser;
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
    metaInitiateCheckout({ eventId: metaEventId, address: cleanAddress, userId: req.user?.id, priced, siteUrl: SITE_URL });

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
    if (!alreadyRecorded) onNewOrder(order);
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
    if (!alreadyRecorded) onNewOrder(order);
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
      onNewOrder(order);
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
      onNewOrder(order);
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

    // Courier name and tracking link, same as the Track Order page
    res.json(orders.map((order) => ({ ...order, carrier: trackingInfo(order) })));
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
// ABANDONED CHECKOUTS (ADMIN ONLY)
// Customers who entered their details and opened the payment window but never paid. A checkout
// counts as abandoned once its stock reservation has been released (the payment window is over).
// Customers who paid later are left out, and repeat attempts are merged into the latest one.
// ==========================================
export async function listAbandonedCheckouts() {
  const checkouts = await prisma.pendingCheckout.findMany({
    where: { reserved: false },
    orderBy: { createdAt: 'desc' },
    take: 1000
  });
  if (checkouts.length === 0) return [];

  // Latest paid order per customer (by email and by phone), to drop those who bought afterwards
  const oldest = checkouts[checkouts.length - 1].createdAt;
  const laterOrders = await prisma.order.findMany({
    where: { createdAt: { gte: oldest } },
    select: { createdAt: true, address: true, user: { select: { email: true } } }
  });
  const lastOrderAt = new Map();
  const remember = (key, date) => {
    if (key && (!lastOrderAt.has(key) || lastOrderAt.get(key) < date)) lastOrderAt.set(key, date);
  };
  for (const order of laterOrders) {
    const address = parseAddress(order.address);
    remember(`email:${String(order.user?.email || address.email || '').toLowerCase()}`, order.createdAt);
    remember(`phone:${String(address.mobileNumber || '').replace(/\D/g, '').slice(-10)}`, order.createdAt);
  }

  const productIds = new Set();
  for (const checkout of checkouts) {
    for (const item of Array.isArray(checkout.items) ? checkout.items : []) productIds.add(Number(item.id));
  }
  const products = await prisma.product.findMany({
    where: { id: { in: [...productIds].filter(Number.isInteger) } },
    select: { id: true, name: true, price: true, slug: true }
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const byCustomer = new Map();
  for (const checkout of checkouts) {
    const address = parseAddress(checkout.address);
    const email = String(address.email || '').toLowerCase();
    const phone = String(address.mobileNumber || '').replace(/\D/g, '').slice(-10);
    const boughtLater = [`email:${email}`, `phone:${phone}`]
      .some((key) => lastOrderAt.has(key) && lastOrderAt.get(key) > checkout.createdAt);
    if (boughtLater) continue;

    const customerKey = email || phone || checkout.id;
    const existing = byCustomer.get(customerKey);
    if (existing) {
      existing.attempts += 1; // checkouts are newest first, so the first one seen is kept
      existing.checkoutIds.push(checkout.id);
      continue;
    }

    // Cart value at today's prices (the checkout record keeps the cart, not the amount)
    const items = (Array.isArray(checkout.items) ? checkout.items : []).map((item) => {
      const product = productById.get(Number(item.id));
      const unitPrice = product ? Math.round(getUnitPrice(product.price, item.weight)) : null;
      return {
        productId: Number(item.id),
        name: product?.name || 'Deleted product',
        slug: product?.slug || null,
        weight: item.weight,
        quantity: item.quantity,
        unitPrice
      };
    });
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0);
    const coupon = COUPONS[checkout.couponCode];
    const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
    const shipping = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_CHARGE : 0;

    const { clientIp, browser, ...shippingAddress } = address;
    byCustomer.set(customerKey, {
      id: checkout.id,
      provider: checkout.provider,
      createdAt: checkout.createdAt,
      registered: Boolean(checkout.userId),
      address: shippingAddress,
      items,
      couponCode: checkout.couponCode,
      cartValue: Math.round(Math.max(0, subtotal - discount) + shipping),
      attempts: 1,
      checkoutIds: [checkout.id] // every merged attempt, so deleting the row removes them all
    });
  }

  return [...byCustomer.values()];
}

router.get('/admin/abandoned-checkouts', verifyToken, async (req, res) => {
  try {
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    res.json(await listAbandonedCheckouts());
  } catch (error) {
    console.error('Fetch abandoned checkouts error:', error);
    res.status(500).json({ error: 'Failed to fetch abandoned checkouts' });
  }
});

// Deletes abandoned checkouts (all merged attempts of one customer). Only checkouts whose
// payment window is over are deleted, so a checkout that can still be paid is never touched.
router.post('/admin/abandoned-checkouts/delete', verifyToken, async (req, res) => {
  try {
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0 || ids.length > 1000 || !ids.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 255)) {
      return res.status(400).json({ error: 'Invalid checkout ids' });
    }

    const { count } = await prisma.pendingCheckout.deleteMany({
      where: { id: { in: ids }, reserved: false }
    });
    res.json({ deleted: count });
  } catch (error) {
    console.error('Delete abandoned checkouts error:', error);
    res.status(500).json({ error: 'Failed to delete abandoned checkouts' });
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
// ORDER STATUS AND STOCK
// Every order takes its stock when it is paid. Moving it to Cancelled, Refunded or Failed puts
// that stock back; moving it back to any other status takes it out again. Moving between two
// of these (e.g. Cancelled -> Refunded) changes nothing, so stock is never returned twice.
// ==========================================
const STOCK_RELEASED_STATUSES = ['Cancelled', 'Refunded', 'Failed'];
const releasesStock = (status) => STOCK_RELEASED_STATUSES.includes(status);

// Kilos an order line took from stock: an oversold order only took the stock that was left
function stockTakenByItem(item) {
  return item.initialStock !== null && item.finalStock !== null
    ? item.initialStock - item.finalStock
    : (WEIGHT_OPTIONS[item.weight]?.kg ?? 0) * item.quantity;
}

// Changes one order's status inside a transaction, returning or taking its stock when needed.
// Locks the order row first, so two quick changes cannot both move the stock.
// Returns null if the order does not exist, else { order, stockChange: 'restored' | 'deducted' | null }.
async function setOrderStatus(tx, orderId, status) {
  const rows = await tx.$queryRaw`SELECT "status" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
  if (rows.length === 0) return null;

  let stockChange = null;
  const stockMoves = []; // { name, weight, quantity, kg, after } for the order history
  const restore = releasesStock(status);
  if (releasesStock(rows[0].status) !== restore) {
    const items = await tx.orderItem.findMany({ where: { orderId }, orderBy: { productId: 'asc' } });
    for (const item of items) {
      if (!item.productId) continue; // product was deleted since
      const taken = stockTakenByItem(item);
      if (!(taken > 0)) continue;
      const updated = restore
        ? await tx.$queryRaw`UPDATE "Product" SET "stock" = ROUND(("stock" + ${taken})::numeric, 3)::float8 WHERE "id" = ${item.productId} RETURNING "stock"`
        : await tx.$queryRaw`UPDATE "Product" SET "stock" = GREATEST(0, ROUND(("stock" - ${taken})::numeric, 3))::float8 WHERE "id" = ${item.productId} RETURNING "stock"`;
      if (updated.length > 0) {
        const after = Number(updated[0].stock);
        stockMoves.push({
          productId: item.productId, name: item.productName || 'Product', weight: item.weight, quantity: item.quantity, kg: taken,
          after
        });
      }
    }
    stockChange = restore ? 'restored' : 'deducted';
  }

  const order = await tx.order.update({ where: { id: orderId }, data: { status } });
  return { order, stockChange, oldStatus: rows[0].status, stockMoves };
}

// History lines for one status change made with setOrderStatus
function statusChangeEvents(orderId, result, actor) {
  if (!result || result.oldStatus === result.order.status) return [];
  const events = [{ orderId, type: 'status', actor, message: `Status changed from ${result.oldStatus} to ${result.order.status}.` }];
  for (const move of result.stockMoves) {
    const line = `${move.name} ${move.weight} × ${move.quantity}`;
    events.push(result.stockChange === 'restored'
      ? { orderId, type: 'stock', actor, message: `Stock returned: ${line}, +${kgText(move.kg)} (stock is now ${kgText(move.after)}).` }
      : { orderId, type: 'stock', actor, message: `Stock taken again: ${line}, −${kgText(move.kg)} (stock is now ${kgText(move.after)}).` });
  }
  return events;
}

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

    const validStatuses = ['PAID', 'Processing', 'Shipped', 'Delivered', 'On Hold', 'Cancelled', 'Pending Payment', 'Refunded', 'Failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const orderId = parseInt(id, 10);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    const result = await prisma.$transaction((tx) => setOrderStatus(tx, orderId, status), TX_OPTIONS);
    if (!result) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (result.stockChange) {
      console.log(`Admin ${adminUser.email} set order #${orderId} to ${status} and ${result.stockChange} its stock`);
    }
    if (result.stockChange) invalidateProducts(result.stockMoves.map((move) => move.productId));
    await logOrderEvents(statusChangeEvents(orderId, result, adminUser.email));

    res.json({ success: true, order: result.order, stockChange: result.stockChange });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// ==========================================
// DELETE ORDER (ADMIN ONLY), e.g. to clean up test orders.
// ?restoreStock=true puts the order's items back into stock. This never refunds the payment;
// refunds are issued from the Razorpay / Stripe dashboard.
// ==========================================
router.delete('/admin/orders/:id', verifyToken, async (req, res) => {
  try {
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    const restoreStock = req.query.restoreStock === 'true';

    const deleted = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
      if (!order) return null;

      // A cancelled, refunded or failed order has already given its stock back
      if (restoreStock && !releasesStock(order.status)) {
        for (const item of order.items) {
          if (!item.productId) continue; // product was deleted since
          const taken = stockTakenByItem(item);
          if (taken > 0) {
            await tx.$executeRaw`UPDATE "Product" SET "stock" = ROUND(("stock" + ${taken})::numeric, 3)::float8 WHERE "id" = ${item.productId}`;
          }
        }
      }

      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } }); // order messages are deleted with it (cascade)
      return order;
    }, TX_OPTIONS);

    if (!deleted) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const restoredStock = restoreStock && !releasesStock(deleted.status);
    if (restoredStock) invalidateProducts(deleted.items.map((item) => item.productId).filter(Boolean));
    console.log(`Admin ${adminUser.email} deleted order #${id}${restoredStock ? ' and restored its stock' : ''}`);
    res.json({ success: true, restoredStock });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// ==========================================
// DOWNLOAD INVOICE (ADMIN ONLY): the GST invoice PDF for an order, with full buyer details
// ==========================================
router.get('/admin/orders/:id/invoice', verifyToken, async (req, res) => {
  try {
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const pdf = await renderInvoicePdf(order, { includeBuyerDetails: true });
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${invoiceFileName(order)}"`);
    res.send(pdf);
  } catch (error) {
    console.error('Invoice download error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// ==========================================
// BULK ACTIONS ON SELECTED ORDERS (ADMIN ONLY)
// Body: { ids: [10021, 10022, ...] } (up to 100). Kept under /admin/bulk/ so "bulk" is never read
// as an order ID by the /admin/orders/:id routes.
//   POST /admin/bulk/orders/invoices -> one PDF, an invoice per page
//   POST /admin/bulk/orders/labels   -> one PDF, a shipping label per page
//   PUT  /admin/bulk/orders/status   -> { ids, status }; "Shipped" only moves PAID / Processing orders
// ==========================================
const MAX_BULK_ORDERS = 100;

async function requireAdminUser(req, res) {
  const adminUser = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!adminUser || adminUser.role !== 'ADMIN') {
    res.status(403).json({ error: 'Access denied: Admins only' });
    return null;
  }
  return adminUser;
}

// Validated, de-duplicated order IDs from the request body (in the order given), or null
function bulkOrderIds(body) {
  const ids = Array.isArray(body?.ids) ? [...new Set(body.ids.map(Number))] : [];
  if (ids.length === 0 || ids.length > MAX_BULK_ORDERS || !ids.every((id) => Number.isInteger(id) && id > 0)) return null;
  return ids;
}

// The orders for the IDs, in the same order (missing ones left out)
async function ordersByIds(ids) {
  const orders = await prisma.order.findMany({ where: { id: { in: ids } }, include: ORDER_INCLUDE });
  const byId = new Map(orders.map((order) => [order.id, order]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

for (const [path, render, fileName] of [
  ['invoices', (orders) => renderInvoicesPdf(orders, { includeBuyerDetails: true }), 'Invoices'],
  ['labels', renderShippingLabelsPdf, 'Shipping-Labels']
]) {
  router.post(`/admin/bulk/orders/${path}`, verifyToken, async (req, res) => {
    try {
      if (!(await requireAdminUser(req, res))) return;
      const ids = bulkOrderIds(req.body);
      if (!ids) {
        return res.status(400).json({ error: `Select between 1 and ${MAX_BULK_ORDERS} orders.` });
      }
      const orders = await ordersByIds(ids);
      if (orders.length === 0) {
        return res.status(404).json({ error: 'None of the selected orders were found.' });
      }
      const pdf = await render(orders);
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `attachment; filename="${fileName}-${orders.length}-orders.pdf"`);
      res.send(pdf);
    } catch (error) {
      console.error(`Bulk ${path} error:`, error);
      res.status(500).json({ error: `Failed to create ${path === 'labels' ? 'shipping labels' : 'invoices'}` });
    }
  });
}

const ORDER_STATUSES = ['PAID', 'Processing', 'Shipped', 'Delivered', 'On Hold', 'Cancelled', 'Pending Payment', 'Refunded', 'Failed'];

router.put('/admin/bulk/orders/status', verifyToken, async (req, res) => {
  try {
    if (!(await requireAdminUser(req, res))) return;
    const ids = bulkOrderIds(req.body);
    if (!ids) {
      return res.status(400).json({ error: `Select between 1 and ${MAX_BULK_ORDERS} orders.` });
    }
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Shipping only makes sense for paid orders that haven't gone out yet
    const where = { id: { in: ids }, ...(status === 'Shipped' && { status: { in: ['PAID', 'Processing'] } }) };
    const toUpdate = await prisma.order.findMany({ where, select: { id: true } });
    const updatedIds = toUpdate.map((order) => order.id);
    // One transaction per order, so stock is returned or taken the same way as a single change
    const admin = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
    for (const orderId of updatedIds) {
      const result = await prisma.$transaction((tx) => setOrderStatus(tx, orderId, status), TX_OPTIONS);
      if (result?.stockChange) invalidateProducts(result.stockMoves.map((move) => move.productId));
      await logOrderEvents(statusChangeEvents(orderId, result, admin?.email || null));
    }

    res.json({ success: true, status, updatedIds, skippedIds: ids.filter((id) => !updatedIds.includes(id)) });
  } catch (error) {
    console.error('Bulk status error:', error);
    res.status(500).json({ error: 'Failed to update orders' });
  }
});

// ==========================================
// SAVE COURIER TRACKING NUMBER (ADMIN ONLY)
// Body: { trackingNumber, carrier = 'india-post' | 'delhivery' | 'dtdc', markShipped = true,
// notifyCustomer = true }. An empty number clears it.
// With markShipped, a PAID / Processing order becomes "Shipped". With notifyCustomer, the customer
// is emailed the tracking number (same recipient and name rules as the order confirmation).
// ==========================================
const TRACKING_NUMBER_REGEX = /^[A-Z0-9-]{6,30}$/;

router.put('/admin/orders/:id/tracking', verifyToken, async (req, res) => {
  try {
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    // Typed with spaces or in lower case: "em 1234 5678 9in" -> "EM123456789IN"
    const trackingNumber = String(req.body.trackingNumber || '').toUpperCase().replace(/\s+/g, '');
    if (trackingNumber && !TRACKING_NUMBER_REGEX.test(trackingNumber)) {
      return res.status(400).json({ error: 'Tracking number should be 6-30 letters or digits, e.g. EM123456789IN.' });
    }
    const carrierId = req.body.carrier || DEFAULT_CARRIER;
    if (!CARRIERS[carrierId]) {
      return res.status(400).json({ error: 'Choose India Post, Delhivery or DTDC.' });
    }
    const markShipped = req.body.markShipped !== false;
    const notifyCustomer = req.body.notifyCustomer !== false;

    const existing = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const data = { trackingNumber: trackingNumber || null, shippingCarrier: trackingNumber ? carrierId : null };
    if (trackingNumber && markShipped && ['PAID', 'Processing'].includes(existing.status)) {
      data.status = 'Shipped';
    }
    const order = await prisma.order.update({ where: { id }, data, include: ORDER_INCLUDE });

    const historyEvents = [];
    if (trackingNumber !== (existing.trackingNumber || '') || (trackingNumber && carrierId !== existing.shippingCarrier)) {
      historyEvents.push({
        orderId: id, type: 'shipping', actor: adminUser.email,
        message: trackingNumber
          ? `Tracking ${existing.trackingNumber ? 'changed' : 'added'}: ${carrierFor(carrierId).name} ${trackingNumber}.`
          : `Tracking number ${existing.trackingNumber} removed.`
      });
    }
    if (data.status) {
      historyEvents.push({ orderId: id, type: 'status', actor: adminUser.email, message: `Status changed from ${existing.status} to ${data.status}.` });
    }

    let emailed = false;
    if (trackingNumber && notifyCustomer) {
      const recipient = await orderRecipient(order);
      if (recipient) {
        const address = parseAddress(order.address);
        // Guests' typed names are only used when they are a plain personal name
        const name = order.userId ? (address.fullName || '') : plainPersonName(address.fullName);
        const trackingUrl = order.trackingToken ? `${FRONTEND_URL}/track-order?id=${order.id}&token=${order.trackingToken}` : '';
        const carrier = carrierFor(carrierId);
        emailed = await sendShippingUpdate(recipient, name, order, trackingNumber, trackingUrl, {
          name: carrier.name,
          numberLabel: carrier.numberLabel,
          url: carrier.trackingUrl(trackingNumber),
          help: carrier.help
        });
      }
    }

    if (trackingNumber && notifyCustomer) {
      historyEvents.push({
        orderId: id, type: 'email', actor: adminUser.email,
        message: emailed ? 'Shipping update email with the tracking number sent to the customer.' : 'Shipping update email could not be sent.'
      });
    }
    await logOrderEvents(historyEvents);

    res.json({ success: true, order: { id: order.id, status: order.status, trackingNumber: order.trackingNumber, shippingCarrier: order.shippingCarrier }, emailed });
  } catch (error) {
    console.error('Save tracking number error:', error);
    res.status(500).json({ error: 'Failed to save tracking number' });
  }
});

// ==========================================
// SEND THE ORDER CONFIRMATION EMAIL AGAIN (ADMIN ONLY), with the GST invoice attached.
// Same email and recipient as the automatic one sent when the order is placed.
// ==========================================
router.post('/admin/orders/:id/send-confirmation', verifyToken, async (req, res) => {
  try {
    const adminUser = await requireAdminUser(req, res);
    if (!adminUser) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const result = await sendConfirmationEmail(order, adminUser.email || 'admin');
    if (!result.recipient) {
      return res.status(400).json({ error: 'This order has no email address to send to.' });
    }
    if (!result.sent) {
      return res.status(502).json({ error: `The email to ${result.recipient} could not be sent. Please try again.` });
    }
    res.json({ success: true, recipient: result.recipient, withInvoice: result.withInvoice });
  } catch (error) {
    console.error('Send order confirmation error:', error);
    res.status(500).json({ error: 'Failed to send the order email' });
  }
});

// ==========================================
// ORDER HISTORY (ADMIN ONLY): everything that happened to an order, newest first.
// Placing the order, the payment, the stock it took and admin messages are read from the order
// itself (so older orders have them too); later changes come from OrderEvent.
// Each entry: { id, type: 'order' | 'payment' | 'stock' | 'status' | 'email' | 'shipping' | 'address' | 'message', message, actor, createdAt }
// ==========================================
router.get('/admin/orders/:id/history', verifyToken, async (req, res) => {
  try {
    if (!(await requireAdminUser(req, res))) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, messages: { orderBy: { createdAt: 'asc' } } }
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const placedAt = order.createdAt;
    const entries = [];
    // Oversold: a line needed more than the stock that was left when it was paid
    const oversold = order.items.some((item) => item.initialStock !== null && item.initialStock < (WEIGHT_OPTIONS[item.weight]?.kg ?? 0) * item.quantity - 1e-9);
    entries.push({ id: 'placed', type: 'order', actor: null, createdAt: placedAt,
      message: `Order placed (₹${order.totalAmount.toFixed(2)})${oversold ? ', put On Hold: not enough stock left' : ''}.` });

    if (order.razorpayPaymentId || order.razorpayOrderId) {
      entries.push({ id: 'payment', type: 'payment', actor: null, createdAt: placedAt,
        message: `Payment received via Razorpay${order.razorpayPaymentId ? ` (payment ${order.razorpayPaymentId})` : ''}${order.razorpayOrderId ? `, Razorpay order ${order.razorpayOrderId}` : ''}.` });
    } else if (order.stripeSessionId) {
      entries.push({ id: 'payment', type: 'payment', actor: null, createdAt: placedAt,
        message: `Payment received via Stripe (session ${order.stripeSessionId}).` });
    }

    order.items.forEach((item, index) => {
      const line = `${item.productName || 'Product'} ${item.weight} × ${item.quantity}`;
      const taken = stockTakenByItem(item);
      // Only the amount: the stock figures at that moment can include other customers' unpaid
      // checkouts, which made the history look inconsistent
      entries.push({ id: `stock-${index}`, type: 'stock', actor: null, createdAt: placedAt,
        message: `Stock reduced: ${line}, −${kgText(taken)}.` });
    });

    for (const msg of order.messages) {
      const preview = msg.message.length > 140 ? `${msg.message.slice(0, 140)}…` : msg.message;
      entries.push({ id: `message-${msg.id}`, type: 'message', actor: null, createdAt: msg.createdAt, message: `Message emailed to the customer: “${preview}”` });
    }

    let events = [];
    try {
      events = await prisma.orderEvent.findMany({ where: { orderId: id }, orderBy: { createdAt: 'asc' } });
    } catch (err) {
      console.error('Could not read order history:', err.message); // e.g. table not created yet
    }
    for (const event of events) {
      entries.push({ id: `event-${event.id}`, type: event.type, actor: event.actor, createdAt: event.createdAt, message: event.message });
    }

    // Newest first; entries with the same time keep the order they happened in
    const indexed = entries.map((entry, index) => ({ entry, index }));
    indexed.sort((a, b) => (new Date(b.entry.createdAt) - new Date(a.entry.createdAt)) || (b.index - a.index));
    res.json(indexed.map(({ entry }) => entry));
  } catch (error) {
    console.error('Order history error:', error);
    res.status(500).json({ error: 'Failed to load the order history' });
  }
});

// ==========================================
// PRICE & TAX BREAKDOWN (ADMIN ONLY): the same figures as the invoice, for the order details page
// ==========================================
router.get('/admin/orders/:id/breakdown', verifyToken, async (req, res) => {
  try {
    if (!(await requireAdminUser(req, res))) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const data = invoiceData(order);
    const amounts = orderAmounts(order);
    res.json({
      invoiceNumber: data.number,
      state: data.state,
      stateCode: data.stateCode,
      isHomeState: data.isHomeState,
      lines: data.lines.map((line) => ({ ...line, gst: Math.round((line.amount - line.taxable) * 100) / 100 })),
      amounts,
      tax: data.tax,
      shipping: {
        charge: amounts.shipping,
        carrier: trackingInfo(order),
        trackingNumber: order.trackingNumber || null
      },
      payment: {
        provider: order.razorpayPaymentId ? 'Razorpay' : order.stripeSessionId ? 'Stripe' : null,
        paymentId: order.razorpayPaymentId || null,
        orderReference: order.razorpayOrderId || order.stripeSessionId || null
      }
    });
  } catch (error) {
    console.error('Order breakdown error:', error);
    res.status(500).json({ error: 'Failed to load the price breakdown' });
  }
});

// ==========================================
// DOWNLOAD SHIPPING LABEL (ADMIN ONLY): 4 x 6 inch PDF with the TO / FROM addresses and order ID
// ==========================================
router.get('/admin/orders/:id/label', verifyToken, async (req, res) => {
  try {
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const pdf = await renderShippingLabelPdf(order);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${labelFileName(order)}"`);
    res.send(pdf);
  } catch (error) {
    console.error('Shipping label error:', error);
    res.status(500).json({ error: 'Failed to create shipping label' });
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

    await logOrderEvents([{ orderId: updatedOrder.id, type: 'address', actor: adminUser.email, message: 'Delivery details edited.' }]);

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
    // Courier tracking number and courier: shown with order ID + email too (they reveal parcel
    // movement only, not the street address)
    trackingNumber: order.trackingNumber || null,
    carrier: trackingInfo(order),
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
