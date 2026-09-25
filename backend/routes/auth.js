import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';
import crypto from 'crypto';
import { JWT_SECRET, JWT_EXPIRES_IN, ADMIN_EMAILS, FRONTEND_URL } from '../config.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/emailService.js';

const router = express.Router();

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // verification links are valid for 24 hours
const RESET_TTL_MS = 60 * 60 * 1000;       // password reset links are valid for 1 hour
const RESEND_COOLDOWN_MS = 60 * 1000;      // at most one verification/reset email per minute per account
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_REGEX = /^[a-f0-9]{64}$/;
const INVALID_CREDENTIALS = 'Invalid email or password';

// Compared against when the email is unknown, so "no such user" takes as long as "wrong password"
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10);

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Password policy shared by register and reset. Returns an error message, or null if valid.
export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return 'Password must be between 8 and 128 characters';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number';
  }
  return null;
}

const signSessionToken = (user) =>
  jwt.sign({ id: user.id, tv: user.tokenVersion }, JWT_SECRET, { algorithm: 'HS256', expiresIn: JWT_EXPIRES_IN });

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
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // The response must not reveal whether the email is already registered.
    const genericMessage = 'Thanks! If this email is not already registered, we have sent a verification link. Please check your inbox. If you already have an account, log in or reset your password.';

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser && existingUser.emailVerified) {
      return res.status(201).json({ message: genericMessage, requiresVerification: true });
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
    //    A send failure is only logged: reporting it would distinguish new emails from existing ones.
    const emailSent = await issueVerificationEmail(user);
    if (!emailSent) {
      console.error(`Verification email could not be sent for user ${user.id}`);
    }

    res.status(201).json({ message: genericMessage, requiresVerification: true });
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
    if (typeof token !== 'string' || !TOKEN_REGEX.test(token)) {
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

    // 1. Find user in the database, then compare the password. Unknown emails and wrong passwords
    //    get the same response and take the same time, so emails cannot be enumerated.
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    const isMatch = await bcrypt.compare(password, user ? user.password : DUMMY_PASSWORD_HASH);
    if (!user || !isMatch) {
      return res.status(401).json({ error: INVALID_CREDENTIALS });
    }

    // 3. Unverified accounts cannot log in (only reveal this after the password is proven)
    if (!user.emailVerified) {
      return res.status(403).json({
        error: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // 4. Generate a JWT Token (a digital ID card). The role is read from the database only;
    //    logging in never changes it. The embedded tokenVersion allows revocation.
    const token = signSessionToken(user);

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
// Extracts the bearer token, or null when the header is absent (the frontend may send "Bearer null").
function getBearerToken(req) {
  const authHeader = req.header('Authorization');
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token && token !== 'null' && token !== 'undefined' ? token : null;
}

// Resolves a session token to its user. Returns null for invalid, expired or revoked tokens.
async function resolveSessionToken(token) {
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return null;
  }
  if (!decoded || typeof decoded.id !== 'string') return null;

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true, role: true, tokenVersion: true }
  });
  // Tokens issued before tokenVersion existed carry no "tv" and count as version 0
  if (!user || (decoded.tv ?? 0) !== user.tokenVersion) return null;
  return { id: user.id, email: user.email, role: user.role };
}

// Returns the logged-in user for this request, or null (guest / invalid token). Never responds.
export async function getRequestUser(req) {
  const token = getBearerToken(req);
  return token ? resolveSessionToken(token) : null;
}

// Middleware: the request MUST carry a valid, unrevoked session token.
export const verifyToken = async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Access denied' });

  let user;
  try {
    user = await resolveSessionToken(token);
  } catch (err) {
    console.error('Session verification error:', err);
    return res.status(500).json({ error: 'Failed to verify session' });
  }
  if (!user) return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });

  req.user = user;
  next();
};

// Middleware: guests are allowed (req.user = null), but a token that IS sent must be valid, so a
// logged-in user with an expired session is told to log in again instead of silently becoming a guest.
export const optionalAuth = async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  return verifyToken(req, res, next);
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
    if (address !== null && (typeof address !== 'string' || address.length > 2000)) {
      return res.status(400).json({ error: 'Invalid address' });
    }

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
  // For security, always return the same message so attackers can't guess valid emails
  const genericMessage = 'If a user is registered with this email, we have sent a password reset link.';
  try {
    const { email } = req.body;
    if (typeof email !== 'string' || email.length > 254) {
      return res.json({ message: genericMessage });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Find user in DB
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.json({ message: genericMessage });
    }

    // At most one reset email per minute per account (prevents mailbox flooding)
    const lastIssuedAt = user.resetTokenExpiry ? user.resetTokenExpiry.getTime() - RESET_TTL_MS : 0;
    if (Date.now() - lastIssuedAt < RESEND_COOLDOWN_MS) {
      return res.json({ message: genericMessage });
    }

    // Generate secure random token. Only its hash is stored, so a DB leak exposes no usable links.
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + RESET_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashToken(token),
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
    
    if (typeof token !== 'string' || !TOKEN_REGEX.test(token)) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    // Verify token exists and is not expired (tokens are stored hashed)
    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashToken(token),
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

    // Update user in DB, clear the token, and bump tokenVersion so every existing session
    // (including one an attacker may hold) is logged out.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        tokenVersion: { increment: 1 }
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
