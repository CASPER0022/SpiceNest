// ==========================================
// SHIPPING LABEL for India Post (PDF, 4 x 6 inch; also prints on A4 with "fit to page")
// Laid out the way India Post handles parcels:
//   - a clear box at the top for the Speed Post / Registered Parcel barcode sticker and postage,
//     so the counter's sticker never covers the address
//   - delivery address in the middle with the PIN code in 6 boxes (sorting is done by PIN)
//   - sender block "If undelivered, return to" (plain address, PIN included)
//   - our order ID barcode kept small and labelled, away from India Post's sticker
// ==========================================
import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import { FONT_REGULAR, FONT_BOLD, SELLER, pdfBuffer } from './invoice.js';

const LABEL_SIZE = [288, 432]; // 4 x 6 inch in points

export const labelFileName = (order) => `Shipping-Label-${order.id}.pdf`;

export function renderShippingLabelPdf(order) {
  return renderShippingLabelsPdf([order]);
}

// Several labels in one PDF, one per page (for printing in bulk from the dashboard)
export async function renderShippingLabelsPdf(orders) {
  // Code 128 barcode of each order ID (small, for our own reference)
  const barcodes = await Promise.all(orders.map((order) =>
    bwipjs.toBuffer({ bcid: 'code128', text: String(order.id), scale: 2, height: 8, includetext: false })));

  const title = orders.length === 1 ? `Shipping label #${orders[0].id}` : `Shipping labels (${orders.length} orders)`;
  const doc = new PDFDocument({ size: LABEL_SIZE, margin: 14, autoFirstPage: false, info: { Title: title, Author: SELLER.name } });
  const done = pdfBuffer(doc);
  doc.registerFont('regular', FONT_REGULAR);
  doc.registerFont('bold', FONT_BOLD);
  orders.forEach((order, i) => {
    doc.addPage();
    drawLabel(doc, order, barcodes[i]);
  });
  doc.end();
  return done;
}

// Draws one label on the current page
function drawLabel(doc, order, barcode) {
  let to = {};
  try {
    to = typeof order.address === 'string' ? JSON.parse(order.address) : (order.address || {});
  } catch {
    to = {};
  }

  doc.fillColor('#000').strokeColor('#000');
  const left = 14;
  const width = LABEL_SIZE[0] - 28;
  const right = left + width;
  const line = (y, weight = 1) => doc.moveTo(left, y).lineTo(right, y).lineWidth(weight).stroke();

  // PIN code in 6 boxes, India Post style
  const pinBoxes = (pin, x, y, size) => {
    const digits = String(pin || '').replace(/\D/g, '').slice(0, 6).padEnd(6, ' ');
    for (let i = 0; i < 6; i++) {
      doc.rect(x + i * size, y, size, size).lineWidth(1).stroke();
      doc.font('bold').fontSize(size * 0.62).text(digits[i], x + i * size, y + size * 0.12, { width: size, align: 'center', lineBreak: false });
    }
    return y + size;
  };

  // Outer border (cut line)
  doc.rect(left - 6, 8, width + 12, LABEL_SIZE[1] - 16).lineWidth(1.5).stroke();

  // ---- Reserved space for India Post's article barcode sticker and postage
  doc.save().dash(3, { space: 3 }).rect(left, 16, width, 62).lineWidth(0.8).stroke().restore();
  doc.font('regular').fontSize(7).fillColor('#555')
    .text('Space for India Post barcode sticker / postage', left, 18, { width, align: 'center' });
  doc.fillColor('#000');

  // ---- TO
  let y = 88;
  doc.font('bold').fontSize(10).text('TO,', left, y);
  y += 14;
  doc.font('bold').fontSize(14).text(to.fullName || 'Customer', left, y, { width });
  doc.font('regular').fontSize(10.5);
  const toLines = [
    [to.houseNo, to.area].filter(Boolean).join(', '),
    // Customers often type the landmark as "Near ..." already
    to.landmark ? (/^near\b/i.test(to.landmark.trim()) ? to.landmark.trim() : `Near ${to.landmark.trim()}`) : '',
    [to.city, to.state].filter(Boolean).join(', ')
  ].filter(Boolean);
  for (const text of toLines) doc.text(text, left, doc.y + 1, { width });
  if (to.mobileNumber) doc.font('bold').fontSize(11).text(`Mob: ${to.mobileNumber}`, left, doc.y + 2, { width });
  y = doc.y + 6;
  doc.font('bold').fontSize(10).text('PIN', left, y + 9);
  y = pinBoxes(to.pincode, left + 28, y, 28) + 8;
  // What is in the parcel is deliberately not printed (customer privacy)
  line(y, 1.5);

  // ---- FROM (return address) with our order reference
  y += 6;
  const fromWidth = width - 92;
  doc.font('bold').fontSize(8).text('FROM (If undelivered, please return to):', left, y, { width });
  y += 12;
  doc.font('bold').fontSize(10).text(SELLER.name, left, y, { width: fromWidth });
  doc.font('regular').fontSize(8)
    .text(SELLER.address, left, doc.y, { width: fromWidth })
    .text(`Mob: ${SELLER.phone}`, { width: fromWidth });

  // Order reference (bottom right)
  const refX = right - 86;
  doc.font('bold').fontSize(7).text('ORDER ID', refX, y, { width: 86, align: 'center' });
  doc.font('bold').fontSize(14).text(`#${order.id}`, refX, y + 9, { width: 86, align: 'center' });
  doc.image(barcode, refX + 3, y + 30, { fit: [80, 24], align: 'center' });
  const date = new Date(order.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
  doc.font('regular').fontSize(6.5).text(date, refX, y + 57, { width: 86, align: 'center' });

}
