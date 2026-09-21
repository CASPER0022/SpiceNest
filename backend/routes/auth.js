import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pkg from '@prisma/client';
import crypto from 'crypto';
import { JWT_SECRET, ADMIN_EMAILS, FRONTEND_URL } from '../config.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/emailService.js';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // verification links are valid for 24 hours
const RESEND_COOLDOWN_MS = 60 * 1000;      // at most one verification email per minute per account
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Generates a fresh verification token (only its hash is stored) and emails the link.
async function issueVerificationEmail(user) {
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifyToken: hashToken(token),
      emailVerifyExpiry: new Date(Date.now() + VERIFY_TTL_MS)
    }
  });
  return sendVerificationEmail(user.email, user.name, `${FRONTEND_URL}/verify-email?token=${token}`);
}

// Guest orders placed with this email become the user's orders. Only ever called AFTER the
// email has been proven to belong to the user.
async function claimGuestOrders(user) {
  try {
    const candidates = await prisma.order.findMany({
      where: { userId: null, address: { contains: user.email, mode: 'insensitive' } },
      select: { id: true, address: true }
    });

    const ids = [];
    for (const order of candidates) {
      try {
        const parsed = JSON.parse(order.address);
        if (parsed && typeof parsed.email === 'string' && parsed.email.toLowerCase().trim() === user.email) {
          ids.push(order.id);
        }
      } catch (addrErr) {
        // ignore parsing error
      }
    }

    if (ids.length > 0) {
      await prisma.order.updateMany({ where: { id: { in: ids }, userId: null }, data: { userId: user.id } });
      console.log(`Linked ${ids.length} guest order(s) to verified user ${user.id}`);
    }
  } catch (claimErr) {
    console.error('Failed to auto-claim guest orders:', claimErr);
  }
}

// Marks the email as verified (the user proved they own the mailbox). This is the ONLY place
// where the ADMIN role can be granted automatically, and only for addresses in ADMIN_EMAILS.
async function markEmailVerified(user) {
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiry: null,
      ...(ADMIN_EMAILS.includes(user.email) && { role: 'ADMIN' })
    }
  });
  await claimGuestOrders(updated);
  return updated;
}

// ==========================================
// REGISTER ROUTE (/api/auth/register)
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (typeof name !== 'string' || !name.trim() || name.length > 100) {
      return res.status(400).json({ error: 'A valid name is required' });
    }
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()) || email.length > 254) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be between 6 and 128 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser && existingUser.emailVerified) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // 2. Hash the password (so we don't store plain text passwords)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Save to database. Accounts always start as USER + unverified; nobody can register
    //    their way into ADMIN. If an UNVERIFIED account already holds this email (someone
    //    squatting on it), the rightful owner's registration replaces it.
    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: { name: name.trim(), password: hashedPassword }
        })
      : await prisma.user.create({
          data: {
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: 'USER',
            emailVerified: false
          }
        });

    // 4. Email a verification link. Guest orders are claimed only once the email is verified.
    const emailSent = await issueVerificationEmail(user);

    res.status(201).json({
      message: emailSent
        ? 'Account created! Please check your email and click the verification link to activate your account.'
        : 'Account created, but we could not send the verification email. Please use "Resend verification email" on the login page.',
      requiresVerification: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ==========================================
// VERIFY EMAIL ROUTE (/api/auth/verify-email)
// ==========================================
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: hashToken(token), emailVerifyExpiry: { gte: new Date() } }
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    await markEmailVerified(user);
    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// ==========================================
// RESEND VERIFICATION EMAIL (/api/auth/resend-verification)
// ==========================================
router.post('/resend-verification', async (req, res) => {
  const genericMessage = 'If an unverified account exists for this email, we have sent a new verification link.';
  try {
    const { email } = req.body;
    if (typeof email !== 'string') {
      return res.json({ message: genericMessage });
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (user && !user.emailVerified) {
      const lastIssuedAt = user.emailVerifyExpiry ? user.emailVerifyExpiry.getTime() - VERIFY_TTL_MS : 0;
      if (Date.now() - lastIssuedAt >= RESEND_COOLDOWN_MS) {
        await issueVerificationEmail(user);
      }
    }
    res.json({ message: genericMessage });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// ==========================================
// LOGIN ROUTE (/api/auth/login)
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Find user in the database
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(400).json({ error: 'No registered user found with this email' });
    }

    // 2. Compare the given password with the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect password. Please try again.' });
    }

    // 3. Unverified accounts cannot log in (only reveal this after the password is proven)
    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // 4. Generate a JWT Token (a digital ID card). The role is read from the database only;
    //    logging in never changes it.
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // 5. Send token back to frontend
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, address: user.address, role: user.role } });
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
    const verified = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// ==========================================
// GET CURRENT USER / VERIFY TOKEN ROUTE (/api/auth/me)
// ==========================================
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: user.id, name: user.name, email: user.email, address: user.address, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

router.put('/update-address', verifyToken, async (req, res) => {
  try {
    const { address } = req.body;
    
    // Update the user's address in the database
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
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
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
    
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

    // Clicking the emailed reset link proves the user owns this mailbox, so it also verifies it
    // (this lets the rightful owner recover an address that someone else pre-registered).
    if (!user.emailVerified) {
      await markEmailVerified(user);
    }
    
    res.json({ message: 'Password has been reset successfully! You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
