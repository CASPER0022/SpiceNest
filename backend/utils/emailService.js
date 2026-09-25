import { BrevoClient } from '@getbrevo/brevo';
import dotenv from 'dotenv';

dotenv.config();

// Every user- or admin-supplied value interpolated into email HTML MUST go through this.
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Escaped address field, or '' when missing (so it never renders as "undefined")
const addr = (address, field) => escapeHtml(address && address[field] ? address[field] : '');

/**
 * Sends an order confirmation email to the customer using Brevo API.
 * @param {string} to - Customer's email address
 * @param {object} order - The order object from Prisma
 * @param {string} [trackingUrl] - Secret tracking link for this order
 * @param {object} [opts]
 * @param {boolean} [opts.includeBuyerDetails=false] - include the buyer's name and shipping address.
 *        Only for verified recipients: for guests every buyer-typed value is left out.
 */
export async function sendOrderConfirmation(to, order, trackingUrl, { includeBuyerDetails = false } = {}) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY is missing');
      return false;
    }

    // Initialize Brevo Client
    const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

    // Parse address if it's a string
    let address = {};
    try {
      address = typeof order.address === 'string' ? JSON.parse(order.address) : (order.address || {});
    } catch (e) {
      console.error('Failed to parse order address:', e);
    }
    const safeName = includeBuyerDetails ? escapeHtml(address.fullName || 'Valued Customer') : 'Valued Customer';

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${escapeHtml(item.productName || item.product?.name || 'Product')} (${escapeHtml(item.weight)})</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${escapeHtml(item.quantity)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h1 style="color: #059669; text-align: center;">Order Confirmed!</h1>
          <p>Hi ${safeName},</p>
          <p>Thank you for shopping with Idukki Origins! Your order has been successfully placed and is being prepared for shipment from our farms.</p>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h2 style="margin-top: 0; font-size: 18px;">Order Details</h2>
            <p><strong>Order ID:</strong> #${escapeHtml(order.id)}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Total Paid:</strong> ₹${order.totalAmount.toFixed(2)}</p>
          </div>
${trackingUrl ? `
          <div style="text-align: center; margin: 20px 0;">
            <a href="${escapeHtml(trackingUrl)}" style="background: #059669; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 8px; font-weight: bold; display: inline-block;">
              Track Your Order
            </a>
            <p style="font-size: 12px; color: #999;">Keep this link private: it shows your full delivery details.</p>
          </div>` : ''}

          <table style="width: 100%; border-collapse: collapse;">
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

${includeBuyerDetails ? `
          <div style="margin-top: 30px;">
            <h2 style="font-size: 18px;">Shipping Address</h2>
            <p style="color: #666; line-height: 1.6;">
              ${addr(address, 'fullName')}<br>
              ${addr(address, 'houseNo')}, ${addr(address, 'area')}<br>
              ${addr(address, 'city')}, ${addr(address, 'state')} - ${addr(address, 'pincode')}<br>
              Phone: ${addr(address, 'mobileNumber')}
            </p>
          </div>` : `
          <p style="margin-top: 30px; color: #666;">Your full delivery details are available through the tracking link above.</p>`}

          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            Idukki Origins - From our farms to your kitchen.<br>
            Kerala, India
          </p>
        </div>
    `;

    const response = await client.transactionalEmails.sendTransacEmail({
      subject: `Order Confirmed! Order ID: #${order.id}`,
      htmlContent: htmlContent,
      sender: { name: "Idukki Origins", email: "heyitsmealbinjohn@gmail.com" },
      to: [{ email: to, name: includeBuyerDetails && address.fullName ? address.fullName : "Valued Customer" }],
      replyTo: { email: "heyitsmealbinjohn@gmail.com", name: "Idukki Origins Support" }
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
      sender: { name: "Idukki Origins", email: "heyitsmealbinjohn@gmail.com" },
      to: [{ email: to, name: name || "Valued Customer" }],
      replyTo: { email: "heyitsmealbinjohn@gmail.com", name: "Idukki Origins Support" }
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
      sender: { name: "Idukki Origins", email: "heyitsmealbinjohn@gmail.com" },
      to: [{ email: to, name: name || "Valued Customer" }],
      replyTo: { email: "heyitsmealbinjohn@gmail.com", name: "Idukki Origins Support" }
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
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${escapeHtml(item.productName || (item.product && item.product.name) || 'Product')}</td>
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
      sender: { name: "Idukki Origins Admin", email: "heyitsmealbinjohn@gmail.com" },
      to: [{ email: to, name: name || "Valued Customer" }],
      replyTo: { email: "heyitsmealbinjohn@gmail.com", name: "Idukki Origins Support" }
    });

    console.log('✅ Custom message email sent via Brevo:', response.data?.messageId || response.messageId || 'Success');
    return true;
  } catch (error) {
    console.error('❌ Failed to send custom message email via Brevo:', error.response?.body || error);
    return false;
  }
}

