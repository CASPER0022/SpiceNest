import express from 'express';
import prisma from '../db.js';
import { verifyToken } from './auth.js';
import { getUnitPrice as getWeightAdjustedPrice, normalizeWeight, MAX_LINES, MAX_QUANTITY_PER_LINE } from '../utils/pricing.js';

const router = express.Router();

// Returns { productId, weight, quantity } if valid, else null. Quantity must be a whole number
// from 1 to MAX_QUANTITY_PER_LINE and weight one of the supported options.
function parseCartLine(productId, weight, quantity) {
  const id = Number(productId);
  const qty = Number(quantity);
  const normalizedWeight = normalizeWeight(weight);
  if (!Number.isInteger(id) || id <= 0 || !normalizedWeight) return null;
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY_PER_LINE) return null;
  return { productId: id, weight: normalizedWeight, quantity: qty };
}

// ==========================================
// FETCH USER'S CART (GET /api/cart)
// ==========================================
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Archived products can't be bought, so they are left out of the cart
    const items = await prisma.cartItem.findMany({
      where: { userId, product: { isArchived: false } },
      include: { product: true }
    });

    // Map database structures to matching frontend structures
    const formattedItems = items.map(item => ({
      id: item.productId,
      cartItemId: `${item.productId}-${item.weight}`,
      name: item.product.name,
      price: getWeightAdjustedPrice(item.product.price, item.weight),
      weight: item.weight,
      quantity: item.quantity,
      images: item.product.images,
      category: item.product.category,
      description: item.product.description
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error('Fetch cart error:', error);
    res.status(500).json({ error: 'Failed to retrieve your shopping cart.' });
  }
});

// ==========================================
// ADD/UPDATE CART ITEM (POST /api/cart)
// ==========================================
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, weight, quantity } = req.body;

    const line = parseCartLine(productId, weight || '100g', quantity);
    if (!line) {
      return res.status(400).json({ error: `Invalid cart item. Quantity must be a whole number between 1 and ${MAX_QUANTITY_PER_LINE}.` });
    }
    const parsedProductId = line.productId;
    const selectedWeight = line.weight;

    // Verify product exists and is still for sale
    const product = await prisma.product.findUnique({
      where: { id: parsedProductId }
    });
    if (!product || product.isArchived) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Upsert the cart item
    await prisma.cartItem.upsert({
      where: {
        userId_productId_weight: {
          userId,
          productId: parsedProductId,
          weight: selectedWeight
        }
      },
      update: {
        quantity: line.quantity
      },
      create: {
        userId,
        productId: parsedProductId,
        weight: selectedWeight,
        quantity: line.quantity
      }
    });

    res.json({ success: true, message: 'Cart synchronized successfully.' });
  } catch (error) {
    console.error('Save cart item error:', error);
    res.status(500).json({ error: 'Failed to update cart item.' });
  }
});

// ==========================================
// MERGE GUEST CART ON LOGIN (POST /api/cart/sync)
// ==========================================
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { items } = req.body;

    if (Array.isArray(items) && items.length > 0) {
      // Invalid lines are skipped gracefully (guest carts come from localStorage)
      const lines = items.slice(0, MAX_LINES)
        .map((item) => parseCartLine(item?.id, item?.weight || '100g', item?.quantity))
        .filter(Boolean);

      // Two queries total (instead of two per item): which products exist, and the current cart
      const [products, existing] = await Promise.all([
        prisma.product.findMany({
          where: { id: { in: [...new Set(lines.map((l) => l.productId))] }, isArchived: false },
          select: { id: true }
        }),
        prisma.cartItem.findMany({ where: { userId }, select: { productId: true, weight: true, quantity: true } })
      ]);
      const validIds = new Set(products.map((p) => p.id));
      const quantityByKey = new Map(existing.map((e) => [`${e.productId}:${e.weight}`, e.quantity]));

      // Merge guest quantities into the saved cart, capped per line
      for (const line of lines) {
        if (!validIds.has(line.productId)) continue; // Skip orphan / archived guest items
        const key = `${line.productId}:${line.weight}`;
        quantityByKey.set(key, Math.min(MAX_QUANTITY_PER_LINE, (quantityByKey.get(key) || 0) + line.quantity));
      }

      const writes = lines
        .filter((line) => validIds.has(line.productId))
        .filter((line, i, arr) => arr.findIndex((l) => l.productId === line.productId && l.weight === line.weight) === i)
        .map((line) => {
          const quantity = quantityByKey.get(`${line.productId}:${line.weight}`);
          return prisma.cartItem.upsert({
            where: { userId_productId_weight: { userId, productId: line.productId, weight: line.weight } },
            update: { quantity },
            create: { userId, productId: line.productId, weight: line.weight, quantity }
          });
        });
      if (writes.length > 0) {
        await prisma.$transaction(writes);
      }
    }

    // Retrieve full, freshly merged user cart list
    const dbItems = await prisma.cartItem.findMany({
      where: { userId, product: { isArchived: false } },
      include: { product: true }
    });

    const formattedItems = dbItems.map(item => ({
      id: item.productId,
      cartItemId: `${item.productId}-${item.weight}`,
      name: item.product.name,
      price: getWeightAdjustedPrice(item.product.price, item.weight),
      weight: item.weight,
      quantity: item.quantity,
      images: item.product.images,
      category: item.product.category,
      description: item.product.description
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error('Merge guest cart error:', error);
    res.status(500).json({ error: 'Failed to synchronize guest items.' });
  }
});

// ==========================================
// REMOVE CART ITEM (DELETE /api/cart/:cartItemId)
// ==========================================
router.delete('/:cartItemId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItemId } = req.params;

    // Parse "productId-weight" format
    const dashIndex = cartItemId.indexOf('-');
    if (dashIndex === -1) {
      return res.status(400).json({ error: 'Invalid cart item ID structure.' });
    }

    const productId = parseInt(cartItemId.substring(0, dashIndex), 10);
    const weight = normalizeWeight(cartItemId.substring(dashIndex + 1));

    if (isNaN(productId) || !weight) {
      return res.status(400).json({ error: 'Invalid cart item ID components.' });
    }

    await prisma.cartItem.deleteMany({
      where: {
        userId,
        productId,
        weight
      }
    });

    res.json({ success: true, message: 'Item removed from database cart.' });
  } catch (error) {
    console.error('Delete cart item error:', error);
    res.status(500).json({ error: 'Failed to delete cart item.' });
  }
});

// ==========================================
// CLEAR USER CART (DELETE /api/cart)
// ==========================================
router.delete('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.cartItem.deleteMany({
      where: { userId }
    });

    res.json({ success: true, message: 'Database shopping cart cleared.' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Failed to clear database shopping cart.' });
  }
});

export default router;
