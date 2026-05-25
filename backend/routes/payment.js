import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import pkg from '@prisma/client';
import { sendOrderConfirmation, sendCustomAdminMessage } from '../utils/emailService.js';
import { verifyToken } from './auth.js';

dotenv.config();

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

// ==========================================
// HELPERS
// ==========================================
function parseWeightToKg(weightStr) {
  if (!weightStr) return 0.1;
  const lower = weightStr.toLowerCase().trim();
  if (lower.endsWith('kg')) {
    const val = parseFloat(lower.replace('kg', ''));
    return isNaN(val) ? 1.0 : val;
  }
  if (lower.endsWith('g')) {
    const val = parseFloat(lower.replace('g', ''));
    return isNaN(val) ? 0.1 : val / 1000.0;
  }
  const val = parseFloat(lower);
  return isNaN(val) ? 0.1 : val;
}

// ==========================================
// STRIPE CHECKOUT ROUTE
// ==========================================
router.post('/create-checkout-session', async (req, res) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { items, userId, address, discount } = req.body;

    // Capture the client IP address securely
    const clientIpRaw = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    // Clean IPv6 prefix if present (e.g. ::ffff:)
    const clientIp = clientIpRaw.includes('::ffff:') ? clientIpRaw.split('::ffff:')[1] : clientIpRaw;

    let addressWithIp = address;
    try {
      const parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;
      parsedAddress.clientIp = clientIp;
      addressWithIp = JSON.stringify(parsedAddress);
    } catch (e) {
      console.error('Failed to inject IP to address:', e);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Verify stock levels before proceeding to payment
    for (const item of items) {
      const dbProduct = await prisma.product.findUnique({
        where: { id: parseInt(item.id, 10) }
      });

      if (!dbProduct) {
        return res.status(400).json({ error: `Product '${item.name}' not found.` });
      }

      const itemWeightKg = parseWeightToKg(item.weight);
      const totalRequestedKg = itemWeightKg * item.quantity;

      if (dbProduct.stock < totalRequestedKg) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${dbProduct.name}. Only ${dbProduct.stock.toFixed(2)} kg available, but you requested ${(totalRequestedKg).toFixed(2)} kg.`
        });
      }
    }

    // 1. Transform our cart items into the format Stripe expects
    const lineItems = items.map((item) => {
      let imageUrl = item.image;
      if (imageUrl && imageUrl.startsWith('/')) {
        imageUrl = `${frontendUrl}${imageUrl}`;
      }

      const displayName = item.weight ? `${item.name} (${item.weight})` : item.name;

      return {
        price_data: {
          currency: 'inr',
          product_data: {
            name: displayName,
            images: imageUrl ? [imageUrl] : [],
          },
          unit_amount: Math.round(item.price * 100), 
        },
        quantity: item.quantity,
      };
    });

    // Apply coupon discount dynamically by reducing the unit_amount of the first line item
    let discountPaisa = discount ? Math.round(discount * 100) : 0;
    if (discountPaisa > 0 && lineItems.length > 0) {
      const firstItem = lineItems[0];
      const deduction = Math.floor(discountPaisa / firstItem.quantity);
      firstItem.price_data.unit_amount = Math.max(100, firstItem.price_data.unit_amount - deduction);
    }

    // 2. Add shipping fee if subtotal is below ₹500
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (subtotal < 500) {
      lineItems.push({
        price_data: {
          currency: 'inr',
          product_data: {
            name: 'Shipping Charges',
            description: 'Shipping cost for orders below ₹500',
          },
          unit_amount: 100 * 100, 
        },
        quantity: 1,
      });
    }

    // 3. Create a secure Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      // Include session_id in the success URL so we can verify it
      success_url: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/cart`,
      metadata: {
        userId: userId ? userId.toString() : 'guest',
        address: addressWithIp // This is the JSON string of the address with embedded IP
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
    const userId = session.metadata.userId === 'guest' ? null : parseInt(session.metadata.userId, 10);
    const address = session.metadata.address;

    const orderItemsData = lineItems.data
      .filter(item => item.description !== 'Shipping Charges')
      .map(item => {
        // Parse description e.g. "Black Pepper (250g)"
        const match = item.description.match(/^(.+?)\s*(?:\(([^)]+)\))?$/);
        const name = match ? match[1].trim() : item.description;
        const weight = match && match[2] ? match[2].trim() : '100g';

        const product = products.find(p => p.name === name);
        if (!product) {
          throw new Error(`Product not found in database: ${name}`);
        }
        return {
          productId: product.id,
          productName: product.name,
          productImage: product.images && product.images.length > 0 ? product.images[0] : '',
          quantity: item.quantity,
          price: item.amount_total / 100 / item.quantity,
          weight: weight
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

    // Decrement stock for each item in the order
    for (const item of orderItemsData) {
      const itemWeightKg = parseWeightToKg(item.weight);
      const totalDeductionKg = itemWeightKg * item.quantity;
      
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: totalDeductionKg
          }
        }
      });
      console.log(`Decremented stock for product ${item.productName} by ${totalDeductionKg} kg.`);
    }
    
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

    const adminEmails = ['heyitsmealbinjohn@gmail.com', 'bibinjohn2018@gmail.com'];
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
      where: { id: parseInt(req.user.id, 10) }
    });

    const adminEmails = ['heyitsmealbinjohn@gmail.com', 'bibinjohn2018@gmail.com'];
    if (!adminUser || !adminEmails.includes(adminUser.email)) {
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
      where: { id: parseInt(req.user.id, 10) }
    });

    const adminEmails = ['heyitsmealbinjohn@gmail.com', 'bibinjohn2018@gmail.com'];
    if (!adminUser || !adminEmails.includes(adminUser.email)) {
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
      where: { id: parseInt(req.user.id, 10) }
    });

    const adminEmails = ['heyitsmealbinjohn@gmail.com', 'bibinjohn2018@gmail.com'];
    if (!adminUser || !adminEmails.includes(adminUser.email)) {
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
router.get('/track-order', async (req, res) => {
  try {
    const { id, email } = req.query;

    if (!id || !email) {
      return res.status(400).json({ error: 'Order ID and Email Address are required' });
    }

    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid Order ID format' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
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

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Try to identify if a user is logged in via Authorization header
    let loggedInUser = null;
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token && token !== 'null' && token !== 'undefined') {
        try {
          const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-learning';
          const jwt = (await import('jsonwebtoken')).default;
          const verified = jwt.verify(token, JWT_SECRET);
          loggedInUser = await prisma.user.findUnique({
            where: { id: parseInt(verified.id, 10) }
          });
        } catch (err) {
          console.error('Track order token verification error:', err.message);
        }
      }
    }

    let parsedAddress = {};
    try {
      parsedAddress = JSON.parse(order.address);
    } catch (e) {
      console.error('Error parsing order address for verification:', e);
    }

    const checkoutEmail = parsedAddress.email ? parsedAddress.email.toLowerCase().trim() : '';
    const userEmail = order.user?.email ? order.user.email.toLowerCase().trim() : '';
    const queryEmail = email.toLowerCase().trim();

    if (loggedInUser) {
      // Logged in: either checkout email or associated registered email is acceptable
      if (queryEmail !== checkoutEmail && queryEmail !== userEmail) {
        return res.status(403).json({ error: 'Verification failed: Email does not match this Order' });
      }
    } else {
      // Logged out: strictly match checkout email (with fallback to userEmail for older orders where checkoutEmail is empty)
      const strictTargetEmail = checkoutEmail || userEmail;
      if (queryEmail !== strictTargetEmail) {
        return res.status(403).json({ error: 'Verification failed: Email does not match this Order' });
      }
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Track order lookup error:', error);
    res.status(500).json({ error: 'Failed to retrieve order tracking info' });
  }
});

export default router;
