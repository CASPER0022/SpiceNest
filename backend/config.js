import dotenv from 'dotenv';

// Load .env first so every module that imports this file sees the variables.
dotenv.config();

// ==========================================
// REQUIRED SECRETS: no fallbacks, the server refuses to start without them.
// ==========================================
const REQUIRED = ['JWT_SECRET', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'STRIPE_SECRET_KEY'];

const missing = REQUIRED.filter((name) => !process.env[name] || !process.env[name].trim());
if (missing.length > 0) {
  throw new Error(`FATAL ERROR: missing required environment variable(s): ${missing.join(', ')}`);
}

// Placeholder values that used to be hardcoded fallbacks (or are obviously insecure)
const BANNED_SECRETS = ['super-secret-key-for-learning', 'dummysecret', 'secret', 'changeme'];
for (const name of ['JWT_SECRET', 'RAZORPAY_KEY_SECRET']) {
  if (BANNED_SECRETS.includes(process.env[name].trim().toLowerCase())) {
    throw new Error(`FATAL ERROR: ${name} is set to a known placeholder value. Use a real secret.`);
  }
}

if (process.env.JWT_SECRET.length < 32) {
  const message = 'JWT_SECRET is shorter than 32 characters. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"';
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`FATAL ERROR: ${message}`);
  }
  console.warn(`⚠️ WARNING: ${message}`);
}

if (process.env.NODE_ENV === 'production' && process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_')) {
  console.warn('⚠️ WARNING: Running in production with a Razorpay TEST key id.');
}

export const JWT_SECRET = process.env.JWT_SECRET;
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// ==========================================
// ADMINS: comma-separated list in ADMIN_EMAILS. Only granted once an email is VERIFIED.
// ==========================================
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

if (ADMIN_EMAILS.length === 0) {
  console.warn('⚠️ WARNING: ADMIN_EMAILS is empty. No account will be auto-promoted to ADMIN.');
}

// Verification / reset links are built from this, so it must be explicit in production.
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  throw new Error('FATAL ERROR: FRONTEND_URL environment variable is missing in production!');
}
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
