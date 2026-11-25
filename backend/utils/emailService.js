import { BrevoClient } from '@getbrevo/brevo';
import dotenv from 'dotenv';
import { plainPersonName } from './personName.js';

dotenv.config();

// Emails are sent from SENDER_EMAIL, which must be a verified sender in Brevo (Senders & IP),
// otherwise Brevo rejects every email. Customer replies go to SUPPORT_EMAIL.
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'heyitsmealbinjohn@gmail.com';
const SUPPORT_EMAIL = 'info.idukkiorigins@gmail.com';

// Every user- or admin-supplied value interpolated into email HTML MUST go through this.
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Product photos are stored as site paths ("/images/pepper/pepper-1.jpg"); emails need full URLs.
// Images always come from the public site: mail apps cannot load them from a local dev server.
const SITE_URL = (process.env.FRONTEND_URL || 'https://www.idukkiorigins.com').replace(/\/+$/, '');
const PUBLIC_SITE_URL = /localhost|127\.0\.0\.1/.test(SITE_URL) ? 'https://www.idukkiorigins.com' : SITE_URL;
// "?v=<today>": Gmail caches images by URL, so without it a replaced product photo would keep
// showing the old picture in emails. A daily version fetches the current photo at least once a day.
const absoluteImageUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const version = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${encodeURI(`${PUBLIC_SITE_URL}/${String(path).replace(/^\/+/, '')}`)}?v=${version}`;
};

// 48px product photo for email item lists, or a leaf badge when the product has none
const itemImageHtml = (item) => {
  const url = absoluteImageUrl(item.productImage || item.product?.images?.[0]);
  if (!url) {
    return '<div style="width: 48px; height: 48px; border-radius: 8px; background: #ecfdf5; text-align: center; line-height: 48px; font-size: 22px;">🌿</div>';
  }
  return `<img src="${escapeHtml(url)}" width="48" height="48" alt="" style="display: block; width: 48px; height: 48px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;">`;
};

// Item cell used by every order email: photo (or leaf badge), product name and a weight tag
const itemCellHtml = (item) => `
          <table role="presentation" style="border-collapse: collapse;"><tr>
            <td style="padding: 0 12px 0 0; vertical-align: middle;">${itemImageHtml(item)}</td>
            <td style="padding: 0; vertical-align: middle;">
              <strong>${escapeHtml(item.productName || item.product?.name || 'Product')}</strong><br>
              <span style="display: inline-block; margin-top: 3px; font-size: 12px; font-weight: bold; color: #047857; background: #ecfdf5; padding: 1px 6px; border-radius: 4px;">${escapeHtml(item.weight)}</span>
            </td>
          </tr></table>`;

// Escaped address field, or '' when missing (so it never renders as "undefined")
const addr = (address, field) => escapeHtml(address && address[field] ? address[field] : '');

// ---------- Order confirmation email ----------
// Farm-direct look: cream paper, forest green, the logo, who grew
// each spice and the short trip from the farm to the customer. Table layout and inline styles
// only, so it renders the same in Gmail, Outlook and phone mail apps. No emoji.
const BRAND = {
  green: '#14532d',      // forest green (logo)
  greenSoft: '#e8f0e6',
  cream: '#f7f3ea',      // page background
  paper: '#fffdf8',      // card background
  earth: '#8a5a2b',      // cardamom / soil brown accents
  ink: '#1f2a1f',
  muted: '#6b6f64',
  line: '#e6dfcf'
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Arial, Helvetica, sans-serif";
const rupeesText = (n) => `&#8377;${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// One item row: photo, name, weight, "Grown by <farmer>" when known, quantity and line total
const confirmationItemRow = (item) => {
  const url = absoluteImageUrl(item.productImage || item.product?.images?.[0]);
  const photo = url
    ? `<img src="${escapeHtml(url)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid ${BRAND.line};">`
    : `<div style="width:64px;height:64px;border-radius:10px;background:${BRAND.greenSoft};"></div>`;
  const farmer = item.product?.farmer?.name;
  return `
              <tr>
                <td style="padding:14px 0;border-bottom:1px solid ${BRAND.line};width:76px;vertical-align:top;">${photo}</td>
                <td style="padding:14px 10px;border-bottom:1px solid ${BRAND.line};vertical-align:top;font-family:${SANS};">
                  <div style="font-family:${SERIF};font-size:17px;color:${BRAND.ink};font-weight:bold;">${escapeHtml(item.productName || item.product?.name || 'Spice')}</div>
                  <div style="margin-top:4px;font-size:12px;color:${BRAND.muted};">${escapeHtml(item.weight)} &middot; Qty ${escapeHtml(item.quantity)}</div>
                  ${farmer ? `<div style="margin-top:6px;font-size:12px;color:${BRAND.earth};">Grown by ${escapeHtml(farmer)}, Idukki</div>` : ''}
                </td>
                <td style="padding:14px 0;border-bottom:1px solid ${BRAND.line};vertical-align:top;text-align:right;font-family:${SANS};font-size:15px;color:${BRAND.ink};white-space:nowrap;">${rupeesText(item.price * item.quantity)}</td>
              </tr>`;
};

// One step of "From our farm to your kitchen"
const journeyStep = (number, title, text) => `
                <td style="width:33%;padding:0 6px;vertical-align:top;text-align:center;font-family:${SANS};">
                  <div style="width:34px;height:34px;line-height:34px;margin:0 auto 8px;border-radius:17px;background:${BRAND.green};color:#ffffff;font-weight:bold;font-size:14px;">${number}</div>
                  <div style="font-family:${SERIF};font-size:14px;font-weight:bold;color:${BRAND.ink};">${title}</div>
                  <div style="margin-top:4px;font-size:12px;line-height:1.5;color:${BRAND.muted};">${text}</div>
                </td>`;

/**
 * HTML of the order confirmation email (also used for previews).
 * @param {object} order - Prisma order with items (and items.product.farmer for "Grown by")
 * @param {object} opts - { buyerName, address, includeBuyerDetails, trackingUrl, invoiceName }
 */
export function orderConfirmationHtml(order, { buyerName = '', address = {}, includeBuyerDetails = false, trackingUrl = '', invoiceName = '' } = {}) {
  const firstName = escapeHtml(String(buyerName || '').trim().split(/\s+/)[0] || '');
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const logo = absoluteImageUrl('/images/logo.jpg');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Your Idukki Origins order #${escapeHtml(order.id)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};">
  <div style="display:none;max-height:0;overflow:hidden;">Thank you! Your spices are being packed in Idukki and will be on their way soon.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${BRAND.paper};border:1px solid ${BRAND.line};border-radius:16px;overflow:hidden;">

        <!-- Logo -->
        <tr><td align="center" style="padding:24px 24px 16px;">
          <img src="${escapeHtml(logo)}" width="120" alt="Idukki Origins" style="display:block;width:120px;height:auto;border:0;">
          <div style="margin-top:8px;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.earth};">Farm-direct spices from the hills of Idukki, Kerala</div>
        </td></tr>

        <!-- Thank you -->
        <tr><td style="padding:28px 32px 8px;background:${BRAND.green};">
          <div style="font-family:${SERIF};font-size:28px;line-height:1.25;color:#ffffff;">Thank you${firstName ? `, ${firstName}` : ''}!</div>
          <div style="margin-top:10px;font-family:${SANS};font-size:15px;line-height:1.6;color:#d9e8d4;">
            Your order is confirmed. The spices you chose were grown by our farmers in the hills of Idukki,
            and they are now being hand-packed for you, straight from the farm. No warehouses, no middlemen.
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;background:${BRAND.green};">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="font-family:${SANS};font-size:12px;color:#d9e8d4;">ORDER<br><span style="font-size:16px;font-weight:bold;color:#ffffff;">#${escapeHtml(order.id)}</span></td>
            <td style="font-family:${SANS};font-size:12px;color:#d9e8d4;">DATE<br><span style="font-size:16px;font-weight:bold;color:#ffffff;">${escapeHtml(orderDate)}</span></td>
            <td style="font-family:${SANS};font-size:12px;color:#d9e8d4;text-align:right;">TOTAL PAID<br><span style="font-size:16px;font-weight:bold;color:#ffffff;">${rupeesText(order.totalAmount)}</span></td>
          </tr></table>
        </td></tr>
${trackingUrl ? `
        <!-- Track -->
        <tr><td align="center" style="padding:28px 32px 4px;">
          <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:${BRAND.earth};color:#ffffff;text-decoration:none;font-family:${SANS};font-weight:bold;font-size:15px;padding:14px 30px;border-radius:30px;">Track your order</a>
          <div style="margin-top:8px;font-family:${SANS};font-size:11px;color:${BRAND.muted};">Keep this link private: it shows your delivery details.</div>
        </td></tr>` : ''}

        <!-- Items -->
        <tr><td style="padding:24px 32px 8px;">
          <div style="font-family:${SERIF};font-size:20px;color:${BRAND.ink};">From our farms to your kitchen</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">
            ${order.items.map(confirmationItemRow).join('')}
            <tr>
              <td colspan="2" style="padding:14px 0 0;font-family:${SANS};font-size:14px;color:${BRAND.muted};">Total paid (incl. all taxes and shipping)</td>
              <td style="padding:14px 0 0;text-align:right;font-family:${SERIF};font-size:20px;font-weight:bold;color:${BRAND.green};white-space:nowrap;">${rupeesText(order.totalAmount)}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Journey -->
        <tr><td style="padding:28px 26px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.greenSoft};border-radius:14px;">
            <tr><td colspan="3" style="padding:20px 20px 14px;text-align:center;font-family:${SERIF};font-size:17px;color:${BRAND.green};">What happens next</td></tr>
            <tr>
              ${journeyStep(1, 'Picked at the farm', 'Your spices come from the latest harvest of our farmers in Idukki.')}
              ${journeyStep(2, 'Hand-packed', 'Packed in small batches so the aroma stays locked in.')}
              ${journeyStep(3, 'Shipped to you', 'We email you the courier and tracking number once it ships.')}
            </tr>
            <tr><td colspan="3" style="height:20px;"></td></tr>
          </table>
        </td></tr>

        <!-- Freshness tip -->
        <tr><td style="padding:20px 32px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="border-left:3px solid ${BRAND.earth};padding:4px 0 4px 14px;font-family:${SANS};font-size:13px;line-height:1.6;color:${BRAND.ink};">
              <strong style="font-family:${SERIF};font-size:14px;">A tip from the farm:</strong>
              keep your spices whole until you cook, in an airtight jar away from light and heat.
              They stay fragrant for months.
            </td>
          </tr></table>
        </td></tr>
${includeBuyerDetails ? `
        <!-- Address -->
        <tr><td style="padding:24px 32px 4px;font-family:${SANS};">
          <div style="font-family:${SERIF};font-size:16px;color:${BRAND.ink};">Delivering to</div>
          <div style="margin-top:6px;font-size:13px;line-height:1.6;color:${BRAND.muted};">
            ${addr(address, 'fullName')}<br>
            ${addr(address, 'houseNo')}, ${addr(address, 'area')}<br>
            ${addr(address, 'city')}, ${addr(address, 'state')} - ${addr(address, 'pincode')}<br>
            Phone: ${addr(address, 'mobileNumber')}
          </div>
        </td></tr>` : ''}
${invoiceName ? `
        <tr><td style="padding:18px 32px 0;font-family:${SANS};font-size:13px;color:${BRAND.muted};">
          Your GST invoice is attached to this email (${escapeHtml(invoiceName)}).
        </td></tr>` : ''}

        <!-- Help + footer -->
        <tr><td style="padding:28px 32px 0;">
          <div style="border-top:1px solid ${BRAND.line};"></div>
        </td></tr>
        <tr><td align="center" style="padding:20px 32px 28px;font-family:${SANS};font-size:13px;line-height:1.7;color:${BRAND.muted};">
          Questions about your order? Just reply to this email,<br>
          or WhatsApp us at <a href="https://wa.me/918129074658" style="color:${BRAND.green};font-weight:bold;text-decoration:none;">+91 81290 74658</a>.
          <div style="margin-top:16px;font-family:${SERIF};font-size:15px;color:${BRAND.green};">Idukki Origins</div>
          <div style="font-size:11px;color:${BRAND.muted};">Kanjikuzhy, Idukki, Kerala 685606 &middot; <a href="${escapeHtml(PUBLIC_SITE_URL)}" style="color:${BRAND.muted};">idukkiorigins.com</a></div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Sends an order confirmation email to the customer using Brevo API.
 * @param {string} to - Customer's email address
 * @param {object} order - The order object from Prisma
 * @param {string} [trackingUrl] - Secret tracking link for this order
 * @param {object} [opts]
 * @param {boolean} [opts.includeBuyerDetails=false] - include the buyer's name and shipping address.
 *        Only for verified recipients: for guests every buyer-typed value is left out.
 * @param {{ name: string, content: Buffer }} [opts.invoice] - PDF invoice to attach
 */
export async function sendOrderConfirmation(to, order, trackingUrl, { includeBuyerDetails = false, invoice = null } = {}) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY is missing');
      return false;
    }

    const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

    let address = {};
    try {
      address = typeof order.address === 'string' ? JSON.parse(order.address) : (order.address || {});
    } catch (e) {
      console.error('Failed to parse order address:', e);
    }
    // Guests: their name only if it is a plain personal name (see personName.js)
    const buyerName = includeBuyerDetails ? (address.fullName || '') : plainPersonName(address.fullName);

    const htmlContent = orderConfirmationHtml(order, {
      buyerName, address, includeBuyerDetails, trackingUrl, invoiceName: invoice?.name || ''
    });

    const response = await client.transactionalEmails.sendTransacEmail({
      subject: `Order #${order.id} confirmed: your farm-fresh spices are being packed`,
      htmlContent,
      sender: { name: "Idukki Origins", email: SENDER_EMAIL },
      to: [{ email: to, name: buyerName || "Valued Customer" }],
      replyTo: { email: SUPPORT_EMAIL, name: "Idukki Origins Support" },
      ...(invoice && { attachment: [{ name: invoice.name, content: invoice.content.toString('base64') }] })
    });

    console.log('✅ Email sent via Brevo:', response.data?.messageId || response.messageId || 'Success');
    return true;
  } catch (error) {
    console.error('❌ Failed to send email via Brevo:', error.response?.body || error);
    return false;
  }
}

/**
 * Sends an email-verification link to a newly registered customer using Brevo API.
 * @param {string} to - Customer's email address
 * @param {string} name - Customer's name
 * @param {string} verifyUrl - The verification URL
 */
export async function sendVerificationEmail(to, name, verifyUrl) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY is missing');
      return false;
    }

    const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
    const safeName = escapeHtml(name || 'Valued Customer');
    const safeUrl = escapeHtml(verifyUrl);

    const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <h1 style="color: #059669; text-align: center;">Verify Your Email 🌿</h1>
          <p>Hi ${safeName},</p>
          <p>Welcome to Idukki Origins! Please confirm your email address to activate your account.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${safeUrl}" style="background: #059669; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 8px; font-weight: bold; display: inline-block;">
              Verify Email
            </a>
          </div>

          <p style="font-size: 14px; color: #555;">
            This link is valid for <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
          </p>

          <p style="font-size: 12px; color: #999;">
            If the button above does not work, copy and paste this URL into your browser:<br>
            <a href="${safeUrl}" style="color: #059669;">${safeUrl}</a>
          </p>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            Idukki Origins - From our farms to your kitchen.<br>
            Kerala, India
          </p>
        </div>
    `;

    const response = await client.transactionalEmails.sendTransacEmail({
      subject: "Verify your Idukki Origins account 🌿",
      htmlContent: htmlContent,
      sender: { name: "Idukki Origins", email: SENDER_EMAIL },
      to: [{ email: to, name: name || "Valued Customer" }],
      replyTo: { email: SUPPORT_EMAIL, name: "Idukki Origins Support" }
    });

    console.log('✅ Verification email sent via Brevo:', response.data?.messageId || response.messageId || 'Success');
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email via Brevo:', error.response?.body || error);
    return false;
  }
}

/**
 * Sends a password reset link to the customer using Brevo API.
 * @param {string} to - Customer's email address
 * @param {string} name - Customer's name
 * @param {string} resetUrl - The password reset URL
 */
export async function sendPasswordResetEmail(to, name, resetUrl) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY is missing');
      return false;
    }

    const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
    const safeName = escapeHtml(name || 'Valued Customer');
    const safeUrl = escapeHtml(resetUrl);

    const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <h1 style="color: #059669; text-align: center;">Reset Your Password 🌿</h1>
          <p>Hi ${safeName},</p>
          <p>We received a request to reset your Idukki Origins account password. If you didn't request a password reset, you can safely ignore this email.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${safeUrl}" style="background: #059669; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(5,150,105,0.2);">
              Reset Password
            </a>
          </div>

          <p style="font-size: 14px; color: #555;">
            This link is valid for <strong>1 hour</strong>. For security, please do not forward or share this link.
          </p>

          <p style="font-size: 12px; color: #999;">
            If the button above does not work, copy and paste this URL into your browser:<br>
            <a href="${safeUrl}" style="color: #059669;">${safeUrl}</a>
          </p>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            Idukki Origins - From our farms to your kitchen.<br>
            Kerala, India
          </p>
        </div>
    `;

    const response = await client.transactionalEmails.sendTransacEmail({
      subject: "Reset Your Idukki Origins Password 🌿",
      htmlContent: htmlContent,
      sender: { name: "Idukki Origins", email: SENDER_EMAIL },
      to: [{ email: to, name: name || "Valued Customer" }],
      replyTo: { email: SUPPORT_EMAIL, name: "Idukki Origins Support" }
    });

    console.log('✅ Reset email sent via Brevo:', response.data?.messageId || response.messageId || 'Success');
    return true;
  } catch (error) {
    console.error('❌ Failed to send reset email via Brevo:', error.response?.body || error);
    return false;
  }
}

/**
 * Sends a custom admin message to the customer using Brevo API.
 * @param {string} to - Customer's email address
 * @param {string} name - Customer's name
 * @param {object} order - The order context
 * @param {string} messageContent - The message content written by the admin
 */
export async function sendCustomAdminMessage(to, name, order, messageContent) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY is missing');
      return false;
    }

    const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

    // Parse address if it's a string
    let address = {};
    try {
      address = typeof order.address === 'string' ? JSON.parse(order.address) : (order.address || {});
    } catch (e) {
      console.error('Failed to parse order address:', e);
    }
    const safeName = escapeHtml(name || 'Valued Customer');

    // Escape first, then format newlines into HTML breaks
    const formattedMessage = escapeHtml(messageContent).replace(/\n/g, '<br>');

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${itemCellHtml(item)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${escapeHtml(item.quantity)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <h1 style="color: #059669; text-align: center;">Message regarding Order #${order.id} 🌿</h1>
          <p>Hi ${safeName},</p>
          <p>We are writing to you with an update regarding your order <strong>#${order.id}</strong> placed on ${new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}.</p>
          
          <div style="background: #f9fafb; padding: 25px; border-left: 4px solid #059669; border-radius: 8px; margin: 20px 0; font-size: 15px; color: #1f2937; line-height: 1.6;">
            ${formattedMessage}
          </div>

          <div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin: 25px 0 20px 0; border: 1px solid #f0f0f0;">
            <h2 style="margin-top: 0; font-size: 16px; color: #059669; border-bottom: 1px solid #eee; padding-bottom: 8px;">Order Details</h2>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Order ID:</strong> #${order.id}</p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
            <p style="margin: 6px 0; font-size: 13px;"><strong>Total Paid:</strong> ₹${order.totalAmount.toFixed(2)}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: left;">Qty</th>
                <th style="padding: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 30px;">
            <h2 style="font-size: 16px; color: #059669; border-bottom: 1px solid #eee; padding-bottom: 8px;">Shipping Address</h2>
            <p style="color: #555; line-height: 1.6; font-size: 13px; margin-top: 8px;">
              <strong>${escapeHtml(address.fullName || name)}</strong><br>
              ${addr(address, 'houseNo')}, ${addr(address, 'area')}<br>
              ${addr(address, 'city')}, ${addr(address, 'state')} - ${addr(address, 'pincode')}<br>
              Phone: ${addr(address, 'mobileNumber')}
            </p>
          </div>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 35px 0 25px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            Idukki Origins - From our farms to your kitchen.<br>
            Kerala, India
          </p>
        </div>
    `;

    const response = await client.transactionalEmails.sendTransacEmail({
      subject: `Update on your Idukki Origins Order #${order.id} 🌿`,
      htmlContent: htmlContent,
      sender: { name: "Idukki Origins Admin", email: SENDER_EMAIL },
      to: [{ email: to, name: name || "Valued Customer" }],
      replyTo: { email: SUPPORT_EMAIL, name: "Idukki Origins Support" }
    });

    console.log('✅ Custom message email sent via Brevo:', response.data?.messageId || response.messageId || 'Success');
    return true;
  } catch (error) {
    console.error('❌ Failed to send custom message email via Brevo:', error.response?.body || error);
    return false;
  }
}


/**
 * Tells the customer their parcel has been booked with the courier, with the tracking number.
 * @param {string} to - recipient (verified account email, or the guest's checkout email)
 * @param {string} name - greeting name ('' for the generic greeting)
 * @param {object} order - Order with items
 * @param {string} trackingNumber - courier tracking number, e.g. EM123456789IN
 * @param {string} [trackingUrl] - secret order tracking link on our site
 * @param {{ name: string, url: string, help: string, numberLabel: string }} carrier - see utils/carriers.js
 */
export async function sendShippingUpdate(to, name, order, trackingNumber, trackingUrl, carrier) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY is missing');
      return false;
    }

    const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
    const safeName = escapeHtml(name || 'Valued Customer');
    const safeNumber = escapeHtml(trackingNumber);

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #eee;">${itemCellHtml(item)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #eee; text-align: right;">× ${escapeHtml(item.quantity)}</td>
      </tr>
    `).join('');

    const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <h1 style="color: #059669; text-align: center;">Your order is on its way! 📦</h1>
          <p>Hi ${safeName},</p>
          <p>Good news! Your order <strong>#${order.id}</strong> has been packed and handed over to <strong>${escapeHtml(carrier.name)}</strong>.</p>

          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 10px; margin: 25px 0; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #047857; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">${escapeHtml(carrier.name)} ${escapeHtml(carrier.numberLabel)}</p>
            <p style="margin: 8px 0 14px 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #111827;">${safeNumber}</p>
            <a href="${escapeHtml(carrier.url)}" style="background: #059669; color: #fff; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: bold; display: inline-block;">Track on ${escapeHtml(carrier.name)}</a>
            <p style="margin: 12px 0 0 0; font-size: 12px; color: #6b7280;">${escapeHtml(carrier.help)} Tracking usually starts within 24 hours of booking.</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 8px 10px; text-align: left;">Item</th>
                <th style="padding: 8px 10px; text-align: right;">Qty</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
${trackingUrl ? `
          <p style="text-align: center; margin: 25px 0;">
            <a href="${escapeHtml(trackingUrl)}" style="color: #059669; font-weight: bold;">View your order status</a>
          </p>` : ''}

          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            Thanks for choosing Idukki Origins!<br>
            Questions? Just reply to this email.
          </p>
        </div>
    `;

    const response = await client.transactionalEmails.sendTransacEmail({
      subject: `Shipped! Your Idukki Origins order #${order.id} is on its way`,
      htmlContent,
      sender: { name: "Idukki Origins", email: SENDER_EMAIL },
      to: [{ email: to, name: name || "Valued Customer" }],
      replyTo: { email: SUPPORT_EMAIL, name: "Idukki Origins Support" }
    });

    console.log('✅ Shipping update email sent via Brevo:', response.data?.messageId || response.messageId || 'Success');
    return true;
  } catch (error) {
    console.error('❌ Failed to send shipping update email via Brevo:', error.response?.body || error);
    return false;
  }
}
