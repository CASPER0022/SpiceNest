import express from 'express';
import pkg from '@prisma/client';
import { verifyToken } from './auth.js';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

// ==========================================
// CREATE OR UPDATE A REVIEW (POST /api/reviews)
// ==========================================
router.post('/', verifyToken, async (req, res) => {
  try {
    const { rating, comment, productId, farmerId } = req.body;
    const userId = parseInt(req.user.id, 10);

    // 1. Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }
    if (!comment || comment.trim() === '') {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    if (!productId && !farmerId) {
      return res.status(400).json({ error: 'Either productId or farmerId must be provided' });
    }

    let review;

    if (productId) {
      const prodId = parseInt(productId, 10);
      // Check if product exists
      const product = await prisma.product.findUnique({ where: { id: prodId } });
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Upsert product review (since we have a @@unique([userId, productId]) constraint)
      review = await prisma.review.upsert({
        where: {
          userId_productId: {
            userId,
            productId: prodId,
          },
        },
        update: {
          rating: parseInt(rating, 10),
          comment: comment.trim(),
        },
        create: {
          userId,
          productId: prodId,
          rating: parseInt(rating, 10),
          comment: comment.trim(),
        },
        include: {
          user: {
            select: { name: true }
          }
        }
      });
    } else if (farmerId) {
      const farmId = parseInt(farmerId, 10);
      // Check if farmer exists
      const farmer = await prisma.farmer.findUnique({ where: { id: farmId } });
      if (!farmer) {
        return res.status(404).json({ error: 'Farmer not found' });
      }

      // Upsert farmer review (since we have a @@unique([userId, farmerId]) constraint)
      review = await prisma.review.upsert({
        where: {
          userId_farmerId: {
            userId,
            farmerId: farmId,
          },
        },
        update: {
          rating: parseInt(rating, 10),
          comment: comment.trim(),
        },
        create: {
          userId,
          farmerId: farmId,
          rating: parseInt(rating, 10),
          comment: comment.trim(),
        },
        include: {
          user: {
            select: { name: true }
          }
        }
      });
    }

    res.status(200).json({
      message: 'Review saved successfully!',
      review
    });
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).json({ error: 'Failed to save review' });
  }
});

// ==========================================
// GET REVIEWS FOR A PRODUCT (GET /api/reviews/product/:productId)
// ==========================================
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await prisma.review.findMany({
      where: { productId: parseInt(productId, 10) },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true }
        }
      }
    });
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ==========================================
// GET REVIEWS FOR A FARMER (GET /api/reviews/farmer/:farmerId)
// ==========================================
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;
    const reviews = await prisma.review.findMany({
      where: { farmerId: parseInt(farmerId, 10) },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true }
        }
      }
    });
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

export default router;
