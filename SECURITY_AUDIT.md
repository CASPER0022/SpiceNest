# SpiceNest / Idukki Origins - Security Audit

Audit date: 2026-09-21
Scope: `backend/` (Express + Prisma) and the checkout/auth flows of `frontend/`. Static code review only; the app was not run and no requests were sent.

Clean checks: no secrets committed in git history, no `dangerouslySetInnerHTML` in the frontend.

## Status tracker

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | Critical | Client-controlled prices, quantities and discounts at checkout | **Fixed** (2026-09-21) |
| 2 | Critical | Fallback secrets (Razorpay, JWT) defeat verification | **Fixed** (2026-09-21) |
| 3 | Critical | Admin role granted by email with no email verification | **Fixed** (2026-09-21) |
| 4 | High | Account pre-hijack and guest order theft on register | **Fixed** (2026-09-21, as part of #3) |
| 5 | High | Order attribution spoofing (`userId`, `address` from client) | Open |
| 6 | High | Rate limiter ineffective behind proxy; missing on key routes | Open |
| 7 | High | Order tracking by sequential ID + email, no rate limit | Open |
| 8 | Medium | Overselling / non-atomic stock handling | Open |
| 9 | Medium | HTML injection in outgoing emails | Open |
| 10 | Medium | Unbounded in-memory cache growth (DoS) | Open |
| 11 | Medium | Loose CORS origin check | Open |
| 12 | Medium | Account and session weaknesses | Open |
| 13 | Low | Assorted low-severity issues | Open |

---

## Critical

### 1. Payment amounts are set by the client - FIXED

> **Fixed 2026-09-21.** New `backend/utils/pricing.js` prices carts server-side (DB prices, whitelisted weights, integer quantities 1-50, server-side coupon table, stock summed per product). Razorpay orders carry a cart hash in `notes`; `/confirm-razorpay-order` re-prices the cart, verifies the hash, and records the amount Razorpay actually charged. Stripe uses server line items and a server-created coupon. `Cart.jsx` now sends only `{id, weight, quantity}` and `couponCode`. Not covered here: coupons are still unlimited-use (STARTER is not first-purchase-only).
**Files:** `backend/routes/payment.js:75-78, 150-194, 254-257`

Razorpay and Stripe checkouts compute the total from `items[].price`, `items[].quantity` and `discount` in the request body. Prices are never read from the database.

- Send `price: 0.01` to pay almost nothing for a full order.
- Send a huge `discount`; coupons (`STARTER`, `SPICE50`) exist only in `frontend/src/pages/Cart.jsx:22`, so any value is accepted.
- Send a negative `quantity` on one item to cancel out another item's cost. The stock check also passes for negative quantities.
- `/confirm-razorpay-order` does not check that the paid amount matches the items it records. Pay for a Rs 1 order, then confirm it with a completely different cart.

**Fix:**
- Client sends only `{ productId, weight, quantity, couponCode }`.
- Server computes price (using the weight multiplier logic from `cart.js`), discount, shipping and total.
- Reject quantities below 1 and non-integers.
- Validate coupons on the server.
- On confirm, fetch the Razorpay order and compare its amount to the server-computed total.

### 2. Fallback secrets defeat authentication and payment verification - FIXED

> **Fixed 2026-09-21.** New `backend/config.js` loads `.env` and throws at startup if `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` or `STRIPE_SECRET_KEY` is missing, or if a secret is a known placeholder. All hardcoded fallbacks were removed from `auth.js`, `payment.js` and `server.js`; `track-order` now uses the shared `JWT_SECRET`. JWTs are pinned to HS256 and the Razorpay signature check is constant-time. `FRONTEND_URL` is required in production. **Deploy note:** set all four secrets (and `FRONTEND_URL`) on the host before deploying, and rotate `JWT_SECRET` if it was ever unset there.
**Files:** `payment.js:81, 97, 232, 740`, `auth.js:20`

- If `RAZORPAY_KEY_SECRET` is unset, signatures are verified against the literal `'dummysecret'`. Anyone can forge a valid signature and get free orders.
- If `JWT_SECRET` is unset and `NODE_ENV` is not exactly `production`, tokens are signed with `'super-secret-key-for-learning'`, which is public in the repo. `track-order` uses this fallback with no production guard at all.
- A `rzp_test_...` key ID is hardcoded as a default.

**Fix:** remove every fallback; crash at startup if `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` or `STRIPE_SECRET_KEY` is missing. Use a single shared JWT secret constant instead of re-reading it in `track-order`.

### 3. Admin role granted by email with no email verification - FIXED

> **Fixed 2026-09-21.** Registration now creates an unverified `USER` and emails a 24h single-use link (token stored hashed); unverified accounts cannot log in. ADMIN is granted only when a mailbox in the `ADMIN_EMAILS` env var is verified (or a reset link proves ownership); the hardcoded list and the login auto-upgrade are gone. An unverified squatter on an email is replaced when the real owner registers. New routes: `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`; frontend `VerifyEmail.jsx`, updated `Signup.jsx` / `Login.jsx`. Schema: `User.emailVerified` (default true, grandfathers existing users), `emailVerifyToken`, `emailVerifyExpiry`. **Deploy note:** run `npx prisma db push` before deploying. Not covered: `Dashboard.jsx` still has a client-side admin email list (cosmetic, the API enforces the real check).
**Files:** `auth.js:22, 44, 106`

Registration does not verify email ownership. Anyone can register as `heyitsmealbinjohn@gmail.com` or `bibinjohn2018@gmail.com` and receive `ADMIN`, if those accounts do not already exist in the production DB (for example after a reset or migration via `restore-data.js` / `migrate_to_supabase.js`). Login also silently promotes anyone whose email is on the list.

**Fix:** require email verification before an account is usable; move admin assignment to an env var (`ADMIN_EMAILS`) or manual DB change; remove the login auto-upgrade.

---

## High

### 4. Account pre-hijack and guest order theft - FIXED (via #3)

> **Fixed 2026-09-21.** Guest orders are now claimed only after the email is verified, using a filtered query instead of scanning every guest order.
**File:** `auth.js:49-71`

An attacker registers with a victim's email. Register then claims every guest order matching that email, exposing the victim's name, phone, address and items. The victim later gets "User already exists". Register also loads all guest orders on every call, an unauthenticated performance problem.

**Fix:** claim guest orders only after email verification, and query only orders whose address email matches instead of scanning all guest orders.

### 5. Order attribution can be spoofed
**Files:** `payment.js:222, 287` (Razorpay), `:206, 370-371` (Stripe metadata)

`/confirm-razorpay-order` is unauthenticated and takes `userId` and `address` from the body. Any paid order can be attached to any user. Stripe `metadata.userId` / `metadata.address` are also client-supplied.

**Fix:** take the user from the JWT (or treat as guest), and store the address server-side when the payment order is created, keyed by the payment order ID.

### 6. Rate limiter ineffective and missing on key routes
**File:** `server.js:95-105`

- `trust proxy` is not set, so behind Render/Vercel all users share the proxy IP. One person can send 100 login requests and lock everyone out of login, register and forgot-password.
- Attackers can rotate `X-Forwarded-For` to bypass limits.
- No limiter on `/track-order`, payment routes, `/reset-password`.

**Fix:** `app.set('trust proxy', <hops>)`; add limiters to the missing routes; add per-account throttling on login.

### 7. Order tracking by sequential ID + email
**File:** `payment.js:695-781`

The only secret is the email. Anyone who knows a customer's email can enumerate order IDs and read address, phone and items. The response also includes the raw order, which contains `userId`.

**Fix:** rate limit, return a reduced field set, and consider a random order token in place of, or in addition to, the sequential ID.

---

## Medium

### 8. Overselling / non-atomic stock handling
**File:** `payment.js:54-72, 299-313, 419-433`

Stock is checked before payment but never reserved. Order creation and stock decrement are separate, non-atomic steps, and stock can go negative. Negative quantities can inflate stock.

**Fix:** wrap order creation and a conditional stock decrement in one `prisma.$transaction`; validate quantities.

### 9. HTML injection in outgoing emails
**File:** `utils/emailService.js:33-71, 114-133, 190-233`

The order email goes to `address.email` (chosen by the buyer) and interpolates `fullName`, `houseNo`, etc. unescaped, allowing phishing HTML from your real sender address. The reset email interpolates the user-controlled `name`; combined with #4, an attacker can register a victim's email with a malicious name and trigger a reset email to them.

**Fix:** HTML-escape every interpolated value; only send order emails to the account or verified email.

### 10. Unbounded in-memory cache growth (DoS)
**File:** `server.js:169-172, 370-373`

The cache key is the raw `:id` string, but lookup uses `parseInt`. Requests to `/api/products/1x1`, `/1x2`, ... each create a new cache entry for product 1, growing memory until the process dies. Same for farmers.

**Fix:** validate the id as an integer and use the parsed number as the cache key; cap cache size.

### 11. Loose CORS origin check
**File:** `server.js:86`

`origin.endsWith('idukkiorigins.com')` accepts `https://evilidukkiorigins.com`. Impact is limited because tokens are Bearer headers rather than cookies, but it should be an exact match.

**Fix:** allow only entries in `allowedOrigins`, or check against `.idukkiorigins.com` with a proper hostname parse.

### 12. Account and session weaknesses
**File:** `auth.js`

- Login distinguishes "no such user" from "wrong password" (`:92, 98`); register confirms existing emails.
- No password length or format validation.
- Reset tokens stored in plaintext; existing sessions are not invalidated on password reset.
- JWTs last 7 days with no revocation and are stored in `localStorage`, so any future XSS steals sessions.
- Invalid tokens return 400 instead of 401.

**Fix:** generic login error; enforce password policy; hash reset tokens; add a `tokenVersion` or `passwordChangedAt` check; shorter access tokens.

---

## Low

- Archived products still returned by `/api/farmers` and `/api/products/:id`, and can still be added to the cart and bought.
- Reviews need no purchase; comment length is unbounded (`reviews.js`); non-numeric ratings reach Prisma.
- Cart and wishlist `sync` run one DB query per item; cart quantity accepts negative numbers and arbitrary `weight` strings.
- Default 100kb JSON limit; no `helmet` security headers.
- `nodemailer` is an unused dependency with 8 high-severity advisories - remove it. `npm audit fix` patches the `qs` DoS.
- Error responses include `error.message` (`payment.js:331, 451`, `server.js:250, 296`), leaking internals.
- `track-order` calls `parseInt` on a UUID (`payment.js:743`), so a logged-in user is never recognised there.
- `x-forwarded-for` is stored unvalidated as `clientIp` in the order address.
- Anyone can create a product with default story text `'Write bibin John'` (`server.js:283`) - cosmetic placeholder to remove.

## Related business bug

No Stripe/Razorpay webhook. If a customer pays and closes the tab before `/success` loads, no order is recorded.

## Suggested fix order

1. Server-side pricing, coupons and amount verification (#1)
2. Remove secret fallbacks (#2); email verification and DB-based admin roles (#3, #4)
3. Take user from JWT; webhook-based order creation (#5)
4. Proxy-aware, wider rate limiting (#6, #7)
5. Email escaping, cache key fix, exact CORS match (#9, #10, #11)
