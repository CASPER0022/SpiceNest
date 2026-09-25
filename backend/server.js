// Must be first: loads .env and validates required secrets (crashes on startup if any are missing)
import { TRUST_PROXY_HOPS } from './config.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from '@prisma/client';

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// In-Memory Cache Helper (bounded: the oldest entry is evicted once maxEntries is reached)
class MemoryCache {
  constructor(ttl = 5 * 60 * 1000, maxEntries = 500) { // Default TTL: 5 minutes
    this.cache = new Map();
    this.ttl = ttl;
    this.maxEntries = maxEntries;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value) {
    this.cache.delete(key); // re-insert so Map order reflects recency
    if (this.cache.size >= this.maxEntries) {
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

const productCache = new MemoryCache(5 * 60 * 1000);
const farmerCache = new MemoryCache(5 * 60 * 1000);

// Route IDs must be plain positive integers; the parsed number is also the cache key,
// so "/1", "/01" and "/1x" can never create separate cache entries.
function parseRouteId(raw) {
  if (typeof raw !== 'string' || !/^\d{1,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 ? id : null;
}


// Load environment variables
dotenv.config();

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 5000;

// Behind Render/Vercel the TCP peer is the proxy. Trusting exactly TRUST_PROXY_HOPS proxies makes
// req.ip the real client IP (for rate limiting) while ignoring X-Forwarded-For entries a client forges.
app.set('trust proxy', TRUST_PROXY_HOPS);

// Security headers. This is a JSON-only API, so its responses may not run scripts or be framed.
// crossOriginResourcePolicy is relaxed so the frontend (another origin) can read responses.
app.use(helmet({
  contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Import Routers
import authRoutes from './routes/auth.js';
import paymentRoutes, { startReservationSweeper } from './routes/payment.js';
import cartRoutes from './routes/cart.js';
import reviewsRoutes from './routes/reviews.js';
import wishlistRoutes from './routes/wishlist.js';
import { verifyToken } from './routes/auth.js';

// ==========================================
// Middleware (Software that runs before your routes)
// ==========================================
const allowedOrigins = [
  'http://localhost:5173',
  'https://idukkiorigins.com',
  'https://www.idukkiorigins.com'
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Exact origins from allowedOrigins, plus HTTPS subdomains of idukkiorigins.com (hostname parsed,
// so look-alikes such as "evilidukkiorigins.com" or "idukkiorigins.com.evil.net" are rejected).
function isAllowedOrigin(origin) {
  if (allowedOrigins.includes(origin)) return true;
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'https:' && hostname.endsWith('.idukkiorigins.com');
  } catch (err) {
    return false;
  }
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    // Disallowed origins get no CORS headers, so the browser blocks the response
    return callback(null, isAllowedOrigin(origin));
  },
  credentials: true
}));

app.use(express.json()); // Allows the server to understand JSON data sent in requests

// ==========================================
// Rate limiting (per client IP; req.ip is proxy-aware thanks to "trust proxy" above)
// ==========================================
const FIFTEEN_MINUTES = 15 * 60 * 1000;
const makeLimiter = (max, message, extra = {}) => rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: message },
  ...extra
});

const authLimiter = makeLimiter(50, 'Too many requests from this IP, please try again after 15 minutes.');
const passwordResetLimiter = makeLimiter(10, 'Too many password reset attempts. Please try again after 15 minutes.');
const paymentLimiter = makeLimiter(30, 'Too many payment requests. Please try again after 15 minutes.');
const trackOrderLimiter = makeLimiter(20, 'Too many tracking lookups. Please try again after 15 minutes.');

// Per-account login throttle: 10 FAILED attempts per email per 15 minutes, whatever IP they come
// from. Successful logins are not counted, so this only slows down password guessing.
const loginAccountLimiter = makeLimiter(10, 'Too many failed login attempts for this account. Please try again after 15 minutes or reset your password.', {
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `login:${email.slice(0, 254)}`;
  }
});

app.use('/api/auth/login', authLimiter, loginAccountLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/resend-verification', authLimiter);
app.use('/api/auth/verify-email', authLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);
app.use('/api/payment/create-razorpay-order', paymentLimiter);
app.use('/api/payment/create-checkout-session', paymentLimiter);
app.use('/api/payment/confirm-razorpay-order', paymentLimiter);
app.use('/api/payment/confirm-order', paymentLimiter);
app.use('/api/payment/track-order', trackOrderLimiter);

// ==========================================
// Routes (The URLs your frontend can visit)
// ==========================================

// Authentication Routes
app.use('/api/auth', authRoutes);

// Payment Routes
app.use('/api/payment', paymentRoutes);

// Cart Routes
app.use('/api/cart', cartRoutes);

// Review Routes
app.use('/api/reviews', reviewsRoutes);

// Wishlist Routes
app.use('/api/wishlist', wishlistRoutes);

// Get all spices from the Neon Database!
app.get('/api/products', async (req, res) => {
  try {
    const cachedProducts = productCache.get('all_products');
    if (cachedProducts) {
      return res.json(cachedProducts);
    }

    const products = await prisma.product.findMany({
      where: { isArchived: false },
      orderBy: { id: 'desc' },
      include: { 
        farmer: true,
        reviews: true
      }
    });

    const productsWithRatings = products.map(product => {
      const reviewsCount = product.reviews.length;
      const rating = reviewsCount > 0 
        ? parseFloat((product.reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviewsCount).toFixed(1))
        : 0; // Default to 0 when there are no reviews
      
      const { reviews, ...productData } = product;
      return {
        ...productData,
        rating,
        reviewsCount
      };
    });

    productCache.set('all_products', productsWithRatings);
    res.json(productsWithRatings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get a single product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const id = parseRouteId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid product ID' });
    const cacheKey = `product_${id}`;
    const cachedProduct = productCache.get(cacheKey);
    if (cachedProduct) {
      return res.json(cachedProduct);
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: { 
        farmer: true,
        reviews: {
          include: {
            user: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const reviewsCount = product.reviews.length;
    const rating = reviewsCount > 0 
      ? parseFloat((product.reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviewsCount).toFixed(1))
      : 0; // Default to 0 when there are no reviews

    const result = {
      ...product,
      rating,
      reviewsCount
    };

    productCache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Update a single product (Admin only!)
app.put('/api/products/:id', verifyToken, async (req, res) => {
  try {
    const id = parseRouteId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid product ID' });
    const { price, stock, isArchived, name, description, category, story } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    const updatedData = {};
    if (price !== undefined) updatedData.price = parseFloat(price);
    if (stock !== undefined) updatedData.stock = parseFloat(stock);
    if (isArchived !== undefined) updatedData.isArchived = Boolean(isArchived);
    if (name !== undefined) updatedData.name = name;
    if (description !== undefined) updatedData.description = description;
    if (category !== undefined) updatedData.category = category;
    if (story !== undefined) updatedData.story = story;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updatedData
    });

    // Invalidate product caches
    productCache.delete('all_products');
    productCache.delete(`product_${id}`);

    res.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product: ' + error.message });
  }
});

// Create a new product (Admin only!)
app.post('/api/products', verifyToken, async (req, res) => {
  try {
    const { name, price, stock, description, category, farmerId, images, story } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    if (!name || !price || !description || !category || !farmerId) {
      return res.status(400).json({ error: 'Missing required product details' });
    }

    // Default image if none provided
    const productImages = images && images.length > 0 ? images : ['/images/placeholder.jpg'];

    const newProduct = await prisma.product.create({
      data: {
        name,
        price: parseFloat(price),
        stock: parseFloat(stock || 10.0),
        description,
        category,
        farmerId: parseInt(farmerId, 10),
        images: productImages,
        story: story || 'Write bibin John'
      },
      include: {
        farmer: true
      }
    });

    // Invalidate products cache
    productCache.delete('all_products');

    res.status(201).json({ success: true, product: newProduct });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product: ' + error.message });
  }
});

// Delete a product (Admin only!)
app.delete('/api/products/:id', verifyToken, async (req, res) => {
  try {
    const id = parseRouteId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid product ID' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    await prisma.product.delete({
      where: { id }
    });

    // Invalidate product caches
    productCache.delete('all_products');
    productCache.delete(`product_${id}`);

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product: ' + error.message });
  }
});

// Get all farmers
app.get('/api/farmers', async (req, res) => {
  try {
    const cachedFarmers = farmerCache.get('all_farmers');
    if (cachedFarmers) {
      return res.json(cachedFarmers);
    }

    const farmers = await prisma.farmer.findMany({
      include: { 
        products: true,
        reviews: true
      }
    });

    const farmersWithRatings = farmers.map(farmer => {
      const reviewsCount = farmer.reviews.length;
      const rating = reviewsCount > 0 
        ? parseFloat((farmer.reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviewsCount).toFixed(1))
        : farmer.rating; // Fallback to seed rating

      const { reviews, ...farmerData } = farmer;
      return {
        ...farmerData,
        rating,
        reviewsCount
      };
    });

    // Sort by rating desc
    farmersWithRatings.sort((a, b) => b.rating - a.rating);

    farmerCache.set('all_farmers', farmersWithRatings);
    res.json(farmersWithRatings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch farmers' });
  }
});

// Get a single farmer by ID
app.get('/api/farmers/:id', async (req, res) => {
  try {
    const id = parseRouteId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid farmer ID' });
    const cacheKey = `farmer_${id}`;
    const cachedFarmer = farmerCache.get(cacheKey);
    if (cachedFarmer) {
      return res.json(cachedFarmer);
    }

    const farmer = await prisma.farmer.findUnique({
      where: { id },
      include: { 
        products: true,
        reviews: {
          include: {
            user: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer not found' });
    }
    
    const reviewsCount = farmer.reviews.length;
    const rating = reviewsCount > 0 
      ? parseFloat((farmer.reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviewsCount).toFixed(1))
      : farmer.rating;

    const result = {
      ...farmer,
      rating,
      reviewsCount
    };

    farmerCache.set(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch farmer' });
  }
});

// A simple test route to verify the server works
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from the Idukki Origins Backend! 🌶️' });
});

// ==========================================
// Start the Server
// ==========================================
app.listen(PORT, () => {
  console.log(`✅ Backend Server is running on http://localhost:${PORT}`);
  // Returns stock held by checkouts that were never paid
  startReservationSweeper();
});
