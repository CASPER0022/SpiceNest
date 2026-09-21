import crypto from 'crypto';

// ==========================================
// SERVER-SIDE PRICING (single source of truth)
// Never trust price, discount, or totals sent by the client.
// ==========================================

// Keep in sync with WEIGHT_OPTIONS in frontend/src/components/ProductCard.jsx
export const WEIGHT_OPTIONS = {
  '100g': { multiplier: 1.0, kg: 0.1, discountPercent: 0 },
  '250g': { multiplier: 2.5, kg: 0.25, discountPercent: 5 },
  '500g': { multiplier: 5.0, kg: 0.5, discountPercent: 10 },
  '1kg': { multiplier: 10.0, kg: 1.0, discountPercent: 15 },
};

// Keep in sync with AVAILABLE_COUPONS in frontend/src/pages/Cart.jsx (display only there)
export const COUPONS = {
  STARTER: { discount: 70 },
  SPICE50: { discount: 50 },
};

export const FREE_SHIPPING_THRESHOLD = 500;
export const SHIPPING_CHARGE = 100;
const MAX_LINES = 50;
const MAX_QUANTITY_PER_LINE = 50;

export class CheckoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CheckoutError';
    this.status = 400;
  }
}

export function normalizeWeight(weight) {
  const w = String(weight || '100g').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(WEIGHT_OPTIONS, w) ? w : null;
}

export function getUnitPrice(basePrice, weight) {
  const option = WEIGHT_OPTIONS[normalizeWeight(weight) || '100g'];
  return basePrice * option.multiplier * (1 - option.discountPercent / 100);
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Validates client-supplied cart lines and prices them from the database.
 * Only product id, weight and quantity are read from the client.
 *
 * @param {object} prisma - Prisma client
 * @param {Array} rawItems - [{ id | productId, weight, quantity }]
 * @param {string} [couponCode]
 * @param {object} [opts]
 * @param {boolean} [opts.enforceAvailability=true] - reject archived/out-of-stock products
 *        (disabled when recording an order that has already been paid for)
 */
export async function priceCart(prisma, rawItems, couponCode, { enforceAvailability = true } = {}) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new CheckoutError('Your cart is empty.');
  }
  if (rawItems.length > MAX_LINES) {
    throw new CheckoutError('Too many items in cart.');
  }

  // Validate and merge duplicate product+weight lines
  const merged = new Map();
  for (const raw of rawItems) {
    const productId = Number(raw?.id ?? raw?.productId);
    const quantity = Number(raw?.quantity);
    const weight = normalizeWeight(raw?.weight);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new CheckoutError('Invalid product in cart.');
    }
    if (!weight) {
      throw new CheckoutError('Invalid weight option in cart.');
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_LINE) {
      throw new CheckoutError(`Quantity must be a whole number between 1 and ${MAX_QUANTITY_PER_LINE}.`);
    }

    const key = `${productId}:${weight}`;
    const existing = merged.get(key);
    const totalQty = (existing ? existing.quantity : 0) + quantity;
    if (totalQty > MAX_QUANTITY_PER_LINE) {
      throw new CheckoutError(`Quantity must be a whole number between 1 and ${MAX_QUANTITY_PER_LINE}.`);
    }
    merged.set(key, { productId, weight, quantity: totalQty });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set([...merged.values()].map((l) => l.productId))] } },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const lines = [];
  const requestedKgByProduct = new Map();

  for (const { productId, weight, quantity } of merged.values()) {
    const product = productById.get(productId);
    if (!product) {
      throw new CheckoutError('A product in your cart is no longer available.');
    }
    if (enforceAvailability && product.isArchived) {
      throw new CheckoutError(`'${product.name}' is no longer available.`);
    }

    const kg = WEIGHT_OPTIONS[weight].kg * quantity;
    requestedKgByProduct.set(productId, (requestedKgByProduct.get(productId) || 0) + kg);

    lines.push({
      product,
      productId,
      weight,
      quantity,
      kg,
      unitPrice: getUnitPrice(product.price, weight),
    });
  }

  if (enforceAvailability) {
    for (const [productId, kg] of requestedKgByProduct) {
      const product = productById.get(productId);
      if (product.stock < kg) {
        throw new CheckoutError(
          `Insufficient stock for ${product.name}. Only ${Math.max(0, product.stock).toFixed(2)} kg available, but you requested ${kg.toFixed(2)} kg.`
        );
      }
    }
  }

  // Coupon: looked up server-side only
  let appliedCoupon = null;
  const code = typeof couponCode === 'string' ? couponCode.trim().toUpperCase() : '';
  if (code) {
    if (!Object.prototype.hasOwnProperty.call(COUPONS, code)) {
      throw new CheckoutError('Invalid coupon code.');
    }
    appliedCoupon = { code, discount: COUPONS[code].discount };
  }

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discount = appliedCoupon ? Math.min(appliedCoupon.discount, subtotal) : 0;
  const shipping = subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_CHARGE : 0;
  const total = Math.round(Math.max(0, subtotal - discount) + shipping);

  return {
    lines: lines.map((l) => ({ ...l, unitPrice: round2(l.unitPrice) })),
    subtotal,
    discount,
    shipping,
    total,
    couponCode: appliedCoupon ? appliedCoupon.code : '',
    // Binds the paid Razorpay order to this exact cart (see confirm-razorpay-order)
    cartHash: hashCart(lines, appliedCoupon ? appliedCoupon.code : ''),
  };
}

export function hashCart(lines, couponCode) {
  const canonical = [...lines]
    .sort((a, b) => a.productId - b.productId || a.weight.localeCompare(b.weight))
    .map((l) => `${l.productId}:${l.weight}:${l.quantity}`)
    .join('|');
  return crypto.createHash('sha256').update(`${canonical}#${couponCode || ''}`).digest('hex');
}
