import express from 'express';
import pkg from '@prisma/client';
import { verifyToken } from './auth.js';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

// ==========================================
// FETCH USER'S WISHLIST (GET /api/wishlist)
// ==========================================
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: true }
    });

    // Map database structures to matching frontend product structures
    const formattedItems = items.map(item => ({
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      images: item.product.images,
      category: item.product.category,
      description: item.product.description,
      stock: item.product.stock
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error('Fetch wishlist error:', error);
    res.status(500).json({ error: 'Failed to retrieve your wishlist.' });
  }
});

// ==========================================
// ADD ITEM TO WISHLIST (POST /api/wishlist)
// ==========================================
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    const parsedProductId = parseInt(productId, 10);

    // Verify product exists in the DB
    const product = await prisma.product.findUnique({
      where: { id: parsedProductId }
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Upsert or create unique wishlist item
    await prisma.wishlistItem.upsert({
      where: {
        userId_productId: {
          userId,
          productId: parsedProductId
        }
      },
      update: {}, // No updates needed if already exists
      create: {
        userId,
        productId: parsedProductId
      }
    });

    res.json({ success: true, message: 'Item added to wishlist.' });
  } catch (error) {
    console.error('Save wishlist item error:', error);
    res.status(500).json({ error: 'Failed to add item to wishlist.' });
  }
});

// ==========================================
// MERGE GUEST WISHLIST ON LOGIN (POST /api/wishlist/sync)
// ==========================================
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { items } = req.body;

    if (Array.isArray(items)) {
      for (const item of items) {
        const parsedProductId = parseInt(item.id, 10);

        // Verify product exists
        const product = await prisma.product.findUnique({
          where: { id: parsedProductId }
        });
        if (!product) continue; // Skip orphan guest items gracefully

        // Upsert guest items (do nothing if exists, create otherwise)
        await prisma.wishlistItem.upsert({
          where: {
            userId_productId: {
              userId,
              productId: parsedProductId
            }
          },
          update: {},
          create: {
            userId,
            productId: parsedProductId
          }
        });
      }
    }

    // Retrieve full, freshly merged user wishlist list
    const dbItems = await prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: true }
    });

    const formattedItems = dbItems.map(item => ({
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      images: item.product.images,
      category: item.product.category,
      description: item.product.description,
      stock: item.product.stock
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error('Merge guest wishlist error:', error);
    res.status(500).json({ error: 'Failed to synchronize guest wishlist.' });
  }
});

// ==========================================
// REMOVE WISHLIST ITEM (DELETE /api/wishlist/:productId)
// ==========================================
router.delete('/:productId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = parseInt(req.params.productId, 10);

    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID.' });
    }

    await prisma.wishlistItem.deleteMany({
      where: {
        userId,
        productId
      }
    });

    res.json({ success: true, message: 'Item removed from database wishlist.' });
  } catch (error) {
    console.error('Delete wishlist item error:', error);
    res.status(500).json({ error: 'Failed to delete wishlist item.' });
  }
});

// ==========================================
// CLEAR USER WISHLIST (DELETE /api/wishlist)
// ==========================================
router.delete('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.wishlistItem.deleteMany({
      where: { userId }
    });

    res.json({ success: true, message: 'Database wishlist cleared.' });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({ error: 'Failed to clear database wishlist.' });
  }
});

export default router;
