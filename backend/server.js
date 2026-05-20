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

// Get all spices from the Neon Database!
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isArchived: false },
      orderBy: { id: 'desc' },
      include: { farmer: true }
    });
    res.json(products);
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
      include: { farmer: true }
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Get a single farmer by ID
app.get('/api/farmers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const farmer = await prisma.farmer.findUnique({
      where: { id: parseInt(id) },
      include: { products: true }
    });
    
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer not found' });
    }
    
    res.json(farmer);
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
