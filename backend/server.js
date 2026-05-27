import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from '@prisma/client';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// Load environment variables
dotenv.config();

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
app.use(cors()); // Allows our React frontend (port 5173) to securely talk to this backend (port 5000)
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

    res.json({
      ...product,
      rating,
      reviewsCount
    });
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

    const adminEmails = ['heyitsmealbinjohn@gmail.com', 'bibinjohn2018@gmail.com'];
    if (!user || !adminEmails.includes(user.email)) {
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

    const adminEmails = ['heyitsmealbinjohn@gmail.com', 'bibinjohn2018@gmail.com'];
    if (!user || !adminEmails.includes(user.email)) {
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

    res.status(201).json({ success: true, product: newProduct });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product: ' + error.message });
  }
});

// Get all farmers
app.get('/api/farmers', async (req, res) => {
  try {
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

    res.json({
      ...farmer,
      rating,
      reviewsCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch farmer' });
  }
});

// A simple test route to verify the server works
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from the SpiceNest Backend! 🌶️' });
});

// ==========================================
// Start the Server
// ==========================================
app.listen(PORT, () => {
  console.log(`✅ Backend Server is running on http://localhost:${PORT}`);
});
