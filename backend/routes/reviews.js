import express from 'express';
import prisma from '../db.js';
import { verifyToken } from './auth.js';

const router = express.Router();

const MAX_COMMENT_LENGTH = 2000;
// Orders in these states don't count as a purchase for reviewing
const NON_PURCHASE_STATUSES = ['Cancelled', 'Refunded', 'Failed', 'Pending Payment'];

// Only customers who bought the product (or any product from the farmer) may review it
function hasPurchased(userId, itemFilter) {
  return prisma.order.findFirst({
    where: { userId, status: { notIn: NON_PURCHASE_STATUSES }, items: { some: itemFilter } },
    select: { id: true }
  });
}

// ==========================================
// CREATE OR UPDATE A REVIEW (POST /api/reviews)
// ==========================================
router.post('/', verifyToken, async (req, res) => {
  try {
    const { rating, comment, productId, farmerId } = req.body;
    const userId = req.user.id;

    // 1. Validation
    const ratingValue = Number(rating);
    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }
    if (typeof comment !== 'string' || comment.trim() === '') {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    if (comment.trim().length > MAX_COMMENT_LENGTH) {
      return res.status(400).json({ error: `Comment must be at most ${MAX_COMMENT_LENGTH} characters` });
    }
    if (!productId && !farmerId) {
      return res.status(400).json({ error: 'Either productId or farmerId must be provided' });
    }

    let review;

    if (productId) {
      const prodId = Number(productId);
      // Check if product exists
      const product = Number.isInteger(prodId) ? await prisma.product.findUnique({ where: { id: prodId } }) : null;
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      if (!await hasPurchased(userId, { productId: prodId })) {
        return res.status(403).json({ error: 'You can review this product after you have purchased it.' });
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
          rating: ratingValue,
          comment: comment.trim(),
        },
        create: {
          userId,
          productId: prodId,
          rating: ratingValue,
          comment: comment.trim(),
        },
        include: {
          user: {
            select: { name: true }
          }
        }
      });
    } else if (farmerId) {
      const farmId = Number(farmerId);
      // Check if farmer exists
      const farmer = Number.isInteger(farmId) ? await prisma.farmer.findUnique({ where: { id: farmId } }) : null;
      if (!farmer) {
        return res.status(404).json({ error: 'Farmer not found' });
      }
      if (!await hasPurchased(userId, { product: { farmerId: farmId } })) {
        return res.status(403).json({ error: "You can review this farmer after you have purchased one of their products." });
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
          rating: ratingValue,
          comment: comment.trim(),
        },
        create: {
          userId,
          farmerId: farmId,
          rating: ratingValue,
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

// ==========================================
// DELETE A REVIEW (DELETE /api/reviews/:id)
// ==========================================
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Fetch user details from database to check email for admin check
    const requestingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!requestingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdmin = requestingUser.role === 'ADMIN';

    const reviewId = parseInt(id, 10);
    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Owner or admin is allowed to delete
    if (review.userId !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this review' });
    }

    await prisma.review.delete({
      where: { id: reviewId }
    });

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

export default router;
