import nodemailer from 'nodemailer';
import dns from 'dns';

// Force Node.js to prefer IPv4 over IPv6. 
// This fixes the 'ENETUNREACH' error on platforms like Render.
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Sends an order confirmation email to the customer.
 * @param {string} to - Customer's email address
 * @param {object} order - The order object from Prisma
 */
export async function sendOrderConfirmation(to, order) {
  try {
    // Configure transporter
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set. Falling back to Ethereal.');
    }

    let transporter;
    
    if (process.env.EMAIL_USER && process.env.EMAIL_USER.includes('gmail')) {
      // Use Gmail with explicit settings for better compatibility with Render/Hosting
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // STARTTLS
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        family: 4, // Explicitly force IPv4
        connectionTimeout: 15000, // 15 seconds
        greetingTimeout: 15000,
        socketTimeout: 15000,
      });
    } else {
      // Use SMTP or Ethereal for testing
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER || 'test@ethereal.email',
          pass: process.env.EMAIL_PASS || 'test_password',
        },
      });
    }

    // Verify transporter connection
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified');
    } catch (verifyError) {
      console.error('❌ SMTP verification failed:', verifyError);
      throw verifyError;
    }

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

    const mailOptions = {
      from: `"SpiceNest 🌿" <${process.env.EMAIL_USER}>`, // Gmail requires this to be the authenticated email
      to: to,
      replyTo: process.env.EMAIL_USER,
      subject: `Order Confirmed! Order ID: #${order.id}`,
      html: `
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
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully: %s', info.messageId);
    
    // If using Ethereal, log the preview URL
    if (transporter.options.host === 'smtp.ethereal.email') {
      console.log('✉️ Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    // Log more specific info for Gmail
    if (error.code === 'EAUTH') {
      console.error('Check if your App Password is correct and EMAIL_USER matches.');
    }
    return false;
  }
}
