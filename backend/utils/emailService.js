import { TransactionalEmailsApi, SendSmtpEmail, TransactionalEmailsApiApiKeys } from '@getbrevo/brevo';
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

    // Initialize Brevo API
    const apiInstance = new TransactionalEmailsApi();
    apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

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

    const sendSmtpEmail = new SendSmtpEmail();

    sendSmtpEmail.subject = `Order Confirmed! Order ID: #${order.id}`;
    sendSmtpEmail.htmlContent = `
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
    
    // Sender must be a verified email in Brevo
    sendSmtpEmail.sender = { "name": "SpiceNest", "email": "heyitsmealbinjohn@gmail.com" };
    sendSmtpEmail.to = [{ "email": to, "name": address.fullName || "Valued Customer" }];
    sendSmtpEmail.replyTo = { "email": "heyitsmealbinjohn@gmail.com", "name": "SpiceNest Support" };

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email sent via Brevo:', data.body.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email via Brevo:', error.response ? error.response.body : error);
    return false;
  }
}
