import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import pkg from '@prisma/client';
import { sendOrderConfirmation } from '../utils/emailService.js';
import { verifyToken } from './auth.js';

dotenv.config();

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

// ==========================================
// STRIPE CHECKOUT ROUTE
// ==========================================
router.post('/create-checkout-session', async (req, res) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { items, userId, address } = req.body;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // 1. Transform our cart items into the format Stripe expects
    const lineItems = items.map((item) => {
      let imageUrl = item.image;
      if (imageUrl && imageUrl.startsWith('/')) {
        imageUrl = `${frontendUrl}${imageUrl}`;
      }

      return {
        price_data: {
          currency: 'inr',
          product_data: {
            name: item.name,
            images: imageUrl ? [imageUrl] : [],
          },
          unit_amount: Math.round(item.price * 100), 
        },
        quantity: item.quantity,
      };
    });

    // 2. Create a secure Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      // Include session_id in the success URL so we can verify it
      success_url: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/cart`,
      metadata: {
        userId: userId.toString(),
        address: address // This is the JSON string of the address
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error.message);
    res.status(500).json({ error: 'Failed to create Stripe checkout session.' });
  }
});

// ==========================================
// CONFIRM ORDER ROUTE
// ==========================================
router.get('/confirm-order', async (req, res) => {
  const { session_id } = req.query;
  
  if (!session_id) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // 1. Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // 2. Check if order already exists (to prevent duplicates on refresh)
    const existingOrder = await prisma.order.findUnique({
      where: { stripeSessionId: session_id },
      include: { items: { include: { product: true } } }
    });

    if (existingOrder) {
      return res.json({ success: true, order: existingOrder, message: 'Order already recorded' });
    }

    // 3. Get line items and all products to match them up
    const lineItems = await stripe.checkout.sessions.listLineItems(session_id);
    const products = await prisma.product.findMany();
    
    // 4. Create the Order in our database
    const userId = parseInt(session.metadata.userId, 10);
    const address = session.metadata.address;

    const orderItemsData = lineItems.data.map(item => {
      const product = products.find(p => p.name === item.description);
      if (!product) {
        throw new Error(`Product not found in database: ${item.description}`);
      }
      return {
        productId: product.id,
        productName: product.name,
        productImage: product.images && product.images.length > 0 ? product.images[0] : '',
        quantity: item.quantity,
        price: item.amount_total / 100 / item.quantity,
        weight: '100g' // Default weight
      };
    });

    const order = await prisma.order.create({
      data: {
        userId,
        totalAmount: session.amount_total / 100,
        address,
        stripeSessionId: session_id,
        items: {
          create: orderItemsData
        }
      },
      include: { items: { include: { product: true } } }
    });
    
    // 5. Send response to user immediately (don't block the UI)
    res.json({ success: true, order });

    // 6. Send confirmation email in the background (NOT awaited)
    try {
      const parsedAddress = JSON.parse(address);
      if (parsedAddress.email) {
        console.log(`📧 Sending confirmation to: ${parsedAddress.email}`);
        // We do NOT await here to ensure the user is never blocked
        sendOrderConfirmation(parsedAddress.email, order);
      }
    } catch (e) {
      console.error('Background email task failed:', e);
    }
  } catch (error) {
    console.error('Order confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm order: ' + error.message });
  }
});

// ==========================================
// GET USER'S ORDERS ROUTE
// ==========================================
router.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.user.id, 10);
    
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
      where: { id: parseInt(req.user.id, 10) }
    });

    const adminEmails = ['heyitsmealbinjohn@gmail.com', 'bibinjohn22@gmail.com'];
    if (!user || !adminEmails.includes(user.email)) {
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
        }
      }
    });

    res.json(orders);
  } catch (error) {
    console.error('Fetch admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch admin dashboard data' });
  }
});

export default router;
