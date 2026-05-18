import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pkg from '@prisma/client';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/emailService.js';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

// In a real app, never put the secret directly in code. Always use process.env!
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-learning';

// ==========================================
// REGISTER ROUTE (/api/auth/register)
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const normalizedEmail = email.toLowerCase();

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // 2. Hash the password (so we don't store plain text passwords)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Save to database
    const newUser = await prisma.user.create({
      data: { name, email: normalizedEmail, password: hashedPassword }
    });

    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ==========================================
// LOGIN ROUTE (/api/auth/login)
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase();

    // 1. Find user in the database
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // 2. Compare the given password with the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // 3. Generate a JWT Token (a digital ID card)
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });

    // 4. Send token back to frontend
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, address: user.address } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==========================================
// UPDATE ADDRESS ROUTE (/api/auth/update-address)
// ==========================================
// A simple middleware to verify the token for this route
export const verifyToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ error: 'Access denied' });
  
  const token = authHeader.split(' ')[1];
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

router.put('/update-address', verifyToken, async (req, res) => {
  try {
    const { address } = req.body;
    
    // Update the user's address in the database
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(req.user.id, 10) },
      data: { address }
    });
    
    res.json({ message: 'Address updated successfully', address: updatedUser.address });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// ==========================================
// FORGOT PASSWORD ROUTE (/api/auth/forgot-password)
// ==========================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase();
    
    // Find user in DB
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    
    // For security, always return success so attackers can't guess valid emails
    const genericMessage = 'If a user is registered with this email, we have sent a password reset link.';
    if (!user) {
      return res.json({ message: genericMessage });
    }
    
    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour validity
    
    // Store in DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry
      }
    });
    
    // Dispatch password reset email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    
    await sendPasswordResetEmail(user.email, user.name, resetUrl);
    
    res.json({ message: genericMessage });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to request password reset' });
  }
});

// ==========================================
// RESET PASSWORD ROUTE (/api/auth/reset-password)
// ==========================================
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    // Verify token exists and is not expired
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gte: new Date()
        }
      }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update user in DB and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });
    
    res.json({ message: 'Password has been reset successfully! You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
