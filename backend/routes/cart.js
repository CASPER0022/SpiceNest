import express from 'express';
import pkg from '@prisma/client';
import { verifyToken } from './auth.js';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

// ==========================================
// FETCH USER'S CART (GET /api/cart)
// ==========================================
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.user.id, 10);

    const items = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true }
    });

    // Map database structures to matching frontend structures
    const formattedItems = items.map(item => ({
      id: item.productId,
      cartItemId: `${item.productId}-${item.weight}`,
      name: item.product.name,
      price: item.product.price,
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
    const userId = parseInt(req.user.id, 10);
    const { productId, weight, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return res.status(400).json({ error: 'Product ID and quantity are required.' });
    }

    const parsedProductId = parseInt(productId, 10);
    const selectedWeight = weight || '100g';

    // Verify product exists in the DB
    const product = await prisma.product.findUnique({
      where: { id: parsedProductId }
    });
    if (!product) {
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
        quantity: parseInt(quantity, 10)
      },
      create: {
        userId,
        productId: parsedProductId,
        weight: selectedWeight,
        quantity: parseInt(quantity, 10)
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
    const userId = parseInt(req.user.id, 10);
    const { items } = req.body;

    if (Array.isArray(items)) {
      for (const item of items) {
        const parsedProductId = parseInt(item.id, 10);
        const selectedWeight = item.weight || '100g';
        const quantity = parseInt(item.quantity, 10);

        // Verify product exists
        const product = await prisma.product.findUnique({
          where: { id: parsedProductId }
        });
        if (!product) continue; // Skip orphan guest items gracefully

        // Upsert guest items (increment if exists, create otherwise)
        await prisma.cartItem.upsert({
          where: {
            userId_productId_weight: {
              userId,
              productId: parsedProductId,
              weight: selectedWeight
            }
          },
          update: {
            quantity: { increment: quantity }
          },
          create: {
            userId,
            productId: parsedProductId,
            weight: selectedWeight,
            quantity
          }
        });
      }
    }

    // Retrieve full, freshly merged user cart list
    const dbItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true }
    });

    const formattedItems = dbItems.map(item => ({
      id: item.productId,
      cartItemId: `${item.productId}-${item.weight}`,
      name: item.product.name,
      price: item.product.price,
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
    const userId = parseInt(req.user.id, 10);
    const { cartItemId } = req.params;

    // Parse "productId-weight" format
    const dashIndex = cartItemId.indexOf('-');
    if (dashIndex === -1) {
      return res.status(400).json({ error: 'Invalid cart item ID structure.' });
    }

    const productId = parseInt(cartItemId.substring(0, dashIndex), 10);
    const weight = cartItemId.substring(dashIndex + 1);

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
    const userId = parseInt(req.user.id, 10);

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
