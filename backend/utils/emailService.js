import { BrevoClient } from '@getbrevo/brevo';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Sends an order confirmation email to the customer using Brevo API.
 * @param {string} to - Customer's email address
 * @param {object} order - The order object from Prisma
 */
export async function sendOrderConfirmation(to, order) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY is missing');
      return false;
    }

    // Initialize Brevo Client
    const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

    // Parse address if it's a string
    let address = order.address;
    try {
      if (typeof order.address === 'string') {
        address = JSON.parse(order.address);
      }
    } catch (e) {
      console.error('Failed to parse order address:', e);
    }

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h1 style="color: #059669; text-align: center;">Order Confirmed!</h1>
          <p>Hi ${address.fullName || 'Valued Customer'},</p>
          <p>Thank you for shopping with SpiceNest! Your order has been successfully placed and is being prepared for shipment from our farms.</p>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h2 style="margin-top: 0; font-size: 18px;">Order Details</h2>
            <p><strong>Order ID:</strong> #${order.id}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Total Paid:</strong> ₹${order.totalAmount.toFixed(2)}</p>
          </div>

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

          <div style="margin-top: 30px;">
            <h2 style="font-size: 18px;">Shipping Address</h2>
            <p style="color: #666; line-height: 1.6;">
              ${address.fullName}<br>
              ${address.houseNo}, ${address.area}<br>
              ${address.city}, ${address.state} - ${address.pincode}<br>
              Phone: ${address.mobileNumber}
            </p>
          </div>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            SpiceNest - From our farms to your kitchen.<br>
            Kerala, India
          </p>
        </div>
    `;

    const response = await client.transactionalEmails.sendTransacEmail({
      subject: `Order Confirmed! Order ID: #${order.id}`,
      htmlContent: htmlContent,
      sender: { name: "SpiceNest", email: "heyitsmealbinjohn@gmail.com" },
      to: [{ email: to, name: address.fullName || "Valued Customer" }],
      replyTo: { email: "heyitsmealbinjohn@gmail.com", name: "SpiceNest Support" }
    });

    console.log('✅ Email sent via Brevo:', response.data?.messageId || response.messageId || 'Success');
    return true;
  } catch (error) {
    console.error('❌ Failed to send email via Brevo:', error.response?.body || error);
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

    const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <h1 style="color: #059669; text-align: center;">Reset Your Password 🌿</h1>
          <p>Hi ${name || 'Valued Customer'},</p>
          <p>We received a request to reset your SpiceNest account password. If you didn't request a password reset, you can safely ignore this email.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #059669; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(5,150,105,0.2);">
              Reset Password
            </a>
          </div>

          <p style="font-size: 14px; color: #555;">
            This link is valid for <strong>1 hour</strong>. For security, please do not forward or share this link.
          </p>

          <p style="font-size: 12px; color: #999;">
            If the button above does not work, copy and paste this URL into your browser:<br>
            <a href="${resetUrl}" style="color: #059669;">${resetUrl}</a>
          </p>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            SpiceNest - From our farms to your kitchen.<br>
            Kerala, India
          </p>
        </div>
    `;

    const response = await client.transactionalEmails.sendTransacEmail({
      subject: "Reset Your SpiceNest Password 🌿",
      htmlContent: htmlContent,
      sender: { name: "SpiceNest", email: "heyitsmealbinjohn@gmail.com" },
      to: [{ email: to, name: name || "Valued Customer" }],
      replyTo: { email: "heyitsmealbinjohn@gmail.com", name: "SpiceNest Support" }
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

    // Format newlines into HTML breaks
    const formattedMessage = messageContent.replace(/\n/g, '<br>');

    const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <h1 style="color: #059669; text-align: center;">Message regarding Order #${order.id} 🌿</h1>
          <p>Hi ${name || 'Valued Customer'},</p>
          <p>We are writing to you with an update regarding your order <strong>#${order.id}</strong> placed on ${new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}.</p>
          
          <div style="background: #f9fafb; padding: 25px; border-left: 4px solid #059669; border-radius: 8px; margin: 20px 0; font-size: 15px; color: #1f2937; line-height: 1.6;">
            ${formattedMessage}
          </div>

          <p>If you have any further questions, you can reply directly to this email to contact our support team.</p>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            SpiceNest - From our farms to your kitchen.<br>
            Kerala, India
          </p>
        </div>
    `;

    const response = await client.transactionalEmails.sendTransacEmail({
      subject: `Update on your SpiceNest Order #${order.id} 🌿`,
      htmlContent: htmlContent,
      sender: { name: "SpiceNest Admin", email: "heyitsmealbinjohn@gmail.com" },
      to: [{ email: to, name: name || "Valued Customer" }],
      replyTo: { email: "heyitsmealbinjohn@gmail.com", name: "SpiceNest Support" }
    });

    console.log('✅ Custom message email sent via Brevo:', response.data?.messageId || response.messageId || 'Success');
    return true;
  } catch (error) {
    console.error('❌ Failed to send custom message email via Brevo:', error.response?.body || error);
    return false;
  }
}

