import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// ==========================================
// STRIPE CHECKOUT ROUTE
// ==========================================
router.post('/create-checkout-session', async (req, res) => {
  try {
    // Initialize Stripe inside the route so we guarantee .env is loaded
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    const { items } = req.body;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // 1. Transform our cart items into the format Stripe expects
    const lineItems = items.map((item) => {
      // Stripe requires absolute URLs for images
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
          // Stripe expects the price in paise! (₹15.99 = 1599)
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
      success_url: `${frontendUrl}/success`,
      cancel_url: `${frontendUrl}/cart`,
    });

    // 3. Send the Stripe Checkout URL back to the frontend
    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error.message);
    res.status(500).json({ error: 'Failed to create Stripe checkout session. Did you add your STRIPE_SECRET_KEY to .env?' });
  }
});

export default router;
