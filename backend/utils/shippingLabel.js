// ==========================================
// SHIPPING LABEL (PDF, 4 x 6 inch: the standard courier / thermal label size, also prints on A4)
// TO address (with a large PIN code), FROM address and the order ID (also as a Code 128 barcode).
// ==========================================
import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import { FONT_REGULAR, FONT_BOLD, LOGO, SELLER } from './invoice.js';

const LABEL_SIZE = [288, 432]; // 4 x 6 inch in points

export const labelFileName = (order) => `Shipping-Label-${order.id}.pdf`;

export async function renderShippingLabelPdf(order) {
  // Code 128 barcode of the order ID, for courier scanners
  const barcode = await bwipjs.toBuffer({ bcid: 'code128', text: String(order.id), scale: 3, height: 12, includetext: false });

  let to = {};
  try {
    to = typeof order.address === 'string' ? JSON.parse(order.address) : (order.address || {});
  } catch {
    to = {};
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: LABEL_SIZE, margin: 14, info: { Title: `Shipping label #${order.id}`, Author: SELLER.name } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('regular', FONT_REGULAR);
    doc.registerFont('bold', FONT_BOLD);
    const left = 14;
    const width = LABEL_SIZE[0] - 28;
    const bottom = LABEL_SIZE[1] - 14;
    const line = (y, weight = 1) => doc.moveTo(left, y).lineTo(left + width, y).lineWidth(weight).strokeColor('#000').stroke();

    // Outer border (cut line)
    doc.rect(left - 6, 8, width + 12, LABEL_SIZE[1] - 16).lineWidth(1.5).strokeColor('#000').stroke();

    // ---- Order ID and date
    doc.font('bold').fontSize(9).fillColor('#000').text('ORDER ID', left, 16);
    doc.font('bold').fontSize(24).text(`#${order.id}`, left, 26);
    const date = new Date(order.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
    doc.font('regular').fontSize(8).text(`Date: ${date}`, left, 20, { width, align: 'right' });
    doc.font('bold').fontSize(9).text('PREPAID', left, 32, { width, align: 'right' });
    doc.font('regular').fontSize(7).text('Do not collect cash', left, 44, { width, align: 'right' });
    doc.image(barcode, left, 64, { fit: [width, 34], align: 'center' });
    doc.font('regular').fontSize(7).text(String(order.id), left, 99, { width, align: 'center', characterSpacing: 2 });
    let y = 110;
    line(y, 1.5);

    // ---- TO (the largest block: what the courier reads)
    y += 8;
    doc.font('bold').fontSize(9).text('TO', left, y);
    y += 13;
    doc.font('bold').fontSize(15).text(to.fullName || 'Customer', left, y, { width });
    doc.font('regular').fontSize(11);
    const toLines = [
      [to.houseNo, to.area].filter(Boolean).join(', '),
      to.landmark ? `Landmark: ${to.landmark}` : '',
      [to.city, to.state].filter(Boolean).join(', ')
    ].filter(Boolean);
    for (const text of toLines) doc.text(text, left, doc.y + 1, { width });
    doc.font('bold').fontSize(20).text(`PIN ${to.pincode || '—'}`, left, doc.y + 4, { width });
    if (to.mobileNumber) doc.font('bold').fontSize(12).text(`Phone: ${to.mobileNumber}`, left, doc.y + 2, { width });
    y = doc.y + 10;
    line(y, 1.5);

    // ---- Contents
    y += 6;
    const items = (order.items || [])
      .map((item) => `${item.productName || item.product?.name || 'Item'} ${item.weight} x${item.quantity}`)
      .join(', ');
    doc.font('bold').fontSize(8).text('CONTENTS', left, y);
    doc.font('regular').fontSize(8).text(items || '-', left, y + 11, { width, height: 34, ellipsis: true });
    y = Math.min(doc.y, y + 46) + 6;
    line(y);

    // ---- FROM (bottom of the label)
    const fromTop = Math.max(y + 6, bottom - 92);
    doc.font('bold').fontSize(9).text('FROM', left, fromTop);
    try {
      doc.image(LOGO, left + width - 40, fromTop, { width: 40 });
    } catch {
      // Logo is optional
    }
    doc.font('bold').fontSize(11).text(SELLER.name, left, fromTop + 13, { width: width - 48 });
    doc.font('regular').fontSize(8.5)
      .text(SELLER.address, left, doc.y + 1, { width: width - 48 })
      .text(`Phone: ${SELLER.phone}`, { width: width - 48 });
    if (SELLER.fssai) doc.fontSize(7).text(`FSSAI Reg. No: ${SELLER.fssai}`, { width: width - 48 });

    doc.end();
  });
}
