import dotenv from 'dotenv';

// Load .env first so every module that imports this file sees the variables.
dotenv.config();

// ==========================================
// REQUIRED SECRETS: no fallbacks, the server refuses to start without them.
// ==========================================
// Razorpay test/live switch: set RAZORPAY_MODE=test or live and keep both key sets configured
// (RAZORPAY_TEST_KEY_ID / _KEY_SECRET / _WEBHOOK_SECRET and RAZORPAY_LIVE_...). Without
// RAZORPAY_MODE the plain RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET are used.
const RAZORPAY_MODE = (process.env.RAZORPAY_MODE || '').trim().toLowerCase();
if (RAZORPAY_MODE && RAZORPAY_MODE !== 'test' && RAZORPAY_MODE !== 'live') {
  throw new Error('FATAL ERROR: RAZORPAY_MODE must be "test" or "live".');
}
const RAZORPAY_PREFIX = RAZORPAY_MODE ? `RAZORPAY_${RAZORPAY_MODE.toUpperCase()}_` : 'RAZORPAY_';
const RAZORPAY_KEY_ID_VAR = `${RAZORPAY_PREFIX}KEY_ID`;
const RAZORPAY_KEY_SECRET_VAR = `${RAZORPAY_PREFIX}KEY_SECRET`;
const RAZORPAY_WEBHOOK_SECRET_VAR = `${RAZORPAY_PREFIX}WEBHOOK_SECRET`;

const REQUIRED = ['JWT_SECRET', RAZORPAY_KEY_ID_VAR, RAZORPAY_KEY_SECRET_VAR, 'STRIPE_SECRET_KEY'];

const missing = REQUIRED.filter((name) => !process.env[name] || !process.env[name].trim());
if (missing.length > 0) {
  throw new Error(`FATAL ERROR: missing required environment variable(s): ${missing.join(', ')}`);
}

// Catch a live key in the test slot (or vice versa) before it takes real money or fails checkouts
if (RAZORPAY_MODE && !process.env[RAZORPAY_KEY_ID_VAR].trim().startsWith(`rzp_${RAZORPAY_MODE}_`)) {
  throw new Error(`FATAL ERROR: ${RAZORPAY_KEY_ID_VAR} must start with rzp_${RAZORPAY_MODE}_ when RAZORPAY_MODE=${RAZORPAY_MODE}.`);
}

// Placeholder values that used to be hardcoded fallbacks (or are obviously insecure)
const BANNED_SECRETS = ['super-secret-key-for-learning', 'dummysecret', 'secret', 'changeme'];
for (const name of ['JWT_SECRET', RAZORPAY_KEY_SECRET_VAR]) {
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

export const JWT_SECRET = process.env.JWT_SECRET;
export const RAZORPAY_KEY_ID = process.env[RAZORPAY_KEY_ID_VAR].trim();
export const RAZORPAY_KEY_SECRET = process.env[RAZORPAY_KEY_SECRET_VAR].trim();
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

console.log(`💳 Razorpay running in ${RAZORPAY_KEY_ID.startsWith('rzp_live_') ? 'LIVE' : 'TEST'} mode (${RAZORPAY_KEY_ID_VAR}).`);
if (process.env.NODE_ENV === 'production' && RAZORPAY_KEY_ID.startsWith('rzp_test_')) {
  console.warn('⚠️ WARNING: Running in production with a Razorpay TEST key id.');
}

// Payment webhook secrets (optional, but needed to record orders when the customer closes the tab
// before the success page loads). Set them in the Razorpay / Stripe dashboards and here.
// Razorpay keeps separate webhooks for Test and Live mode, so each mode has its own secret.
export const RAZORPAY_WEBHOOK_SECRET = (process.env[RAZORPAY_WEBHOOK_SECRET_VAR] || '').trim();
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
if (process.env.NODE_ENV === 'production' && !RAZORPAY_WEBHOOK_SECRET) {
  console.warn(`⚠️ WARNING: ${RAZORPAY_WEBHOOK_SECRET_VAR} is not set. Paid orders are only recorded if the customer returns to the site.`);
}

// Session lifetime. Kept short because tokens live in localStorage; revocation uses User.tokenVersion.
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// Number of reverse proxies in front of the app (Render/Vercel = 1). Determines which
// X-Forwarded-For entry is the real client IP; clients cannot spoof entries past this many hops.
const trustProxyRaw = process.env.TRUST_PROXY_HOPS ?? (process.env.NODE_ENV === 'production' ? '1' : '0');
export const TRUST_PROXY_HOPS = Number.parseInt(trustProxyRaw, 10);
if (!Number.isInteger(TRUST_PROXY_HOPS) || TRUST_PROXY_HOPS < 0) {
  throw new Error('FATAL ERROR: TRUST_PROXY_HOPS must be a non-negative integer.');
}

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
