import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from '@prisma/client';

import rateLimit from 'express-rate-limit';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// In-Memory Cache Helper
class MemoryCache {
  constructor(ttl = 5 * 60 * 1000) { // Default TTL: 5 minutes
    this.cache = new Map();
    this.ttl = ttl;
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


// Load environment variables
dotenv.config();

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL ERROR: JWT_SECRET environment variable is missing in production!');
  } else {
    console.warn('⚠️ WARNING: JWT_SECRET environment variable is not defined in .env. Using fallback key for development.');
  }
}

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 5000;

// Import Routers
import authRoutes from './routes/auth.js';
import paymentRoutes from './routes/payment.js';
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

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('idukkiorigins.com')) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

app.use(express.json()); // Allows the server to understand JSON data sent in requests

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
    const { id } = req.params;
    const cacheKey = `product_${id}`;
    const cachedProduct = productCache.get(cacheKey);
    if (cachedProduct) {
      return res.json(cachedProduct);
    }

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
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
    const { id } = req.params;
    const { price, stock, isArchived, name, description, category } = req.body;

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

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id, 10) },
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
    const { name, price, stock, description, category, farmerId, images } = req.body;

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
        images: productImages
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
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    await prisma.product.delete({
      where: { id: parseInt(id, 10) }
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
    const { id } = req.params;
    const cacheKey = `farmer_${id}`;
    const cachedFarmer = farmerCache.get(cacheKey);
    if (cachedFarmer) {
      return res.json(cachedFarmer);
    }

    const farmer = await prisma.farmer.findUnique({
      where: { id: parseInt(id) },
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
});
