// ==========================================
// GST TAX INVOICE (PDF)
// Built from a recorded order. Prices include 5% GST, so the tax matches the monthly GST report:
// total paid x 5/105, split CGST + SGST for Kerala and IGST for other states (see utils/tax.js).
// Seller details can be overridden with environment variables without a code change:
//   SELLER_GSTIN, SELLER_FSSAI, SELLER_LEGAL_NAME, SELLER_ADDRESS, SELLER_PHONE, SELLER_EMAIL
// ==========================================
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchState, orderTax, STATE_CODES, HOME_STATE } from './tax.js';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_CHARGE } from './pricing.js';

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const FONT_REGULAR = path.join(ASSETS, 'fonts', 'NotoSans-Regular.ttf'); // has the ₹ glyph
const FONT_BOLD = path.join(ASSETS, 'fonts', 'NotoSans-Bold.ttf');
const LOGO = path.join(ASSETS, 'logo.jpg');

const SELLER = {
  name: process.env.SELLER_LEGAL_NAME || 'Idukki Origins',
  address: process.env.SELLER_ADDRESS || 'Kanjikuzhy, Idukki, Kerala - 685606',
  phone: process.env.SELLER_PHONE || '+91 8921663449, +91 9645425742',
  email: process.env.SELLER_EMAIL || 'info.idukkiorigins@gmail.com',
  gstin: (process.env.SELLER_GSTIN || '32AGFPJ8946D1ZH').trim(),
  // FSSAI requires the registration number on invoices of food businesses
  fssai: (process.env.SELLER_FSSAI || '21326177000702').trim(),
  state: HOME_STATE
};

// HSN codes by product name (spices: chapter 09, honey: 0409). Shipping is a transport service.
const HSN_RULES = [
  [/pepper|chilli|chili/i, '0904'],
  [/cardamom|nutmeg|mace/i, '0908'],
  [/clove/i, '0907'],
  [/coriander/i, '0909'],
  [/coffee/i, '0901'],
  [/honey/i, '0409']
];
const SHIPPING_SAC = '9965';
const hsnFor = (name) => (HSN_RULES.find(([pattern]) => pattern.test(name || '')) || [])[1] || '';

const round2 = (n) => Math.round(n * 100) / 100;
const money = (n) => `${n < 0 ? '-' : ''}₹${Math.abs(Number(n)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Indian financial year (April-March) in Indian time, e.g. "26-27"
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function financialYear(date) {
  const ist = new Date(new Date(date).getTime() + IST_OFFSET_MS);
  const startYear = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
}

// One invoice per order; order IDs are consecutive, so invoice numbers are too
export const invoiceNumber = (order) => `IO/${financialYear(order.createdAt)}/${order.id}`;
export const invoiceFileName = (order) => `Invoice-${invoiceNumber(order).replace(/\//g, '-')}.pdf`;

const istDate = (date) => new Date(date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });

// 1234.5 -> "One Thousand Two Hundred Thirty Four Rupees and Fifty Paise Only" (Indian numbering)
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function twoDigits(n) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]} ${ONES[n % 10]}`.trim();
}
function wholeNumberInWords(n) {
  if (n === 0) return 'Zero';
  const parts = [];
  for (const [size, label] of [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand'], [100, 'Hundred']]) {
    if (n >= size) {
      parts.push(`${wholeNumberInWords(Math.floor(n / size))} ${label}`);
      n %= size;
    }
  }
  if (n > 0) parts.push(twoDigits(n));
  return parts.join(' ');
}
export function amountInWords(amount) {
  const rupees = Math.floor(round2(amount));
  const paise = Math.round((round2(amount) - rupees) * 100);
  return `${wholeNumberInWords(rupees)} Rupees${paise ? ` and ${twoDigits(paise)} Paise` : ''} Only`;
}

/**
 * Works out the invoice lines and tax for an order. Orders keep the price paid per item and the
 * total; shipping, the coupon discount and the rupee rounding are derived from them the same way
 * checkout calculated them (utils/pricing.js).
 */
export function invoiceData(order) {
  let address = {};
  try {
    address = typeof order.address === 'string' ? JSON.parse(order.address) : (order.address || {});
  } catch {
    address = {};
  }
  const state = matchState(address.state);
  const total = Number(order.totalAmount) || 0;

  const lines = (order.items || []).map((item) => {
    const name = item.productName || item.product?.name || 'Product';
    return {
      description: `${name} (${item.weight})`,
      hsn: hsnFor(name),
      quantity: item.quantity,
      rate: Number(item.price),
      amount: round2(Number(item.price) * item.quantity)
    };
  });
  const itemsTotal = round2(lines.reduce((sum, line) => sum + line.amount, 0));
  const shipping = itemsTotal > 0 && itemsTotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_CHARGE : 0;
  const gap = round2(itemsTotal + shipping - total);
  const discount = gap >= 1 ? Math.round(gap) : 0; // coupons are whole rupees
  const roundOff = round2(total - (itemsTotal + shipping - discount));

  if (discount) lines.push({ description: 'Discount (coupon)', hsn: '', quantity: null, rate: null, amount: -discount });
  if (shipping) lines.push({ description: 'Shipping & delivery', hsn: SHIPPING_SAC, quantity: 1, rate: shipping, amount: shipping });
  if (roundOff) lines.push({ description: 'Round off', hsn: '', quantity: null, rate: null, amount: roundOff });

  // Taxable value per line, adjusted so the lines add up exactly to the order's taxable value
  const tax = orderTax(total, state);
  let allocated = 0;
  lines.forEach((line, i) => {
    line.taxable = i === lines.length - 1
      ? round2(tax.taxable - allocated)
      : round2(line.amount * 100 / 105);
    allocated = round2(allocated + line.taxable);
  });

  return {
    number: invoiceNumber(order),
    date: istDate(order.createdAt),
    orderId: order.id,
    paymentId: order.razorpayPaymentId || order.stripeSessionId || '',
    buyer: address,
    state,
    stateCode: state ? STATE_CODES[state] : '',
    isHomeState: state === HOME_STATE,
    lines,
    total,
    tax
  };
}

/**
 * Renders the invoice as a PDF and resolves with its bytes.
 * @param {object} order - Order with items (and item.product)
 * @param {object} [opts]
 * @param {boolean} [opts.includeBuyerDetails=true] - buyer name, address and phone. Left out of
 *        invoices emailed to guests (unverified addresses), like the confirmation email itself.
 */
export function renderInvoicePdf(order, { includeBuyerDetails = true } = {}) {
  const data = invoiceData(order);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `Invoice ${data.number}`, Author: SELLER.name } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('regular', FONT_REGULAR);
    doc.registerFont('bold', FONT_BOLD);
    const GREEN = '#065f46';
    const GREY = '#6b7280';
    const left = 40;
    const right = doc.page.width - 40;
    const width = right - left;

    // ---- Header: seller (left) and invoice details (right)
    try {
      doc.image(LOGO, left, 40, { width: 52 });
    } catch {
      // Logo is optional
    }
    const sellerWidth = 250;
    doc.font('bold').fontSize(16).fillColor(GREEN).text(SELLER.name, left + 62, 42, { width: sellerWidth });
    doc.font('regular').fontSize(8.5).fillColor('#374151')
      .text(SELLER.address, left + 62, 64, { width: sellerWidth })
      .text(`Phone: ${SELLER.phone}`, { width: sellerWidth })
      .text(`Email: ${SELLER.email}`, { width: sellerWidth });
    if (SELLER.gstin) doc.font('bold').text(`GSTIN: ${SELLER.gstin}`, { width: sellerWidth });
    if (SELLER.fssai) doc.font('bold').text(`FSSAI Reg. No: ${SELLER.fssai}`, { width: sellerWidth });
    const sellerBottom = doc.y;

    doc.font('bold').fontSize(15).fillColor('#111827').text('TAX INVOICE', left, 42, { width, align: 'right' });
    doc.font('regular').fontSize(8.5).fillColor('#374151');
    const meta = [
      ['Invoice No', data.number],
      ['Invoice Date', data.date],
      ['Order No', `#${data.orderId}`],
      ...(data.paymentId ? [['Payment ID', data.paymentId]] : [])
    ];
    let y = 64;
    for (const [label, value] of meta) {
      doc.font('regular').fontSize(8.5).fillColor(GREY).text(label, right - 210, y, { width: 70 });
      doc.font('bold').fontSize(8.5).fillColor('#111827').text(value, right - 140, y, { width: 140, align: 'right' });
      y += 12;
    }

    y = Math.max(sellerBottom, y, 100) + 12;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(0.8).strokeColor('#d1d5db').stroke();
    y += 10;

    // ---- Bill to / place of supply
    const placeOfSupply = data.state ? `${data.state} (${data.stateCode})` : (data.buyer.state || 'Not specified');
    doc.font('bold').fontSize(9).fillColor(GREY).text('BILL TO / SHIP TO', left, y);
    doc.font('bold').fontSize(9).fillColor(GREY).text('PLACE OF SUPPLY', left + width / 2, y);
    y += 13;
    doc.font('bold').fontSize(9.5).fillColor('#111827').text(placeOfSupply, left + width / 2, y);
    doc.font('regular').fontSize(8.5).fillColor('#374151')
      .text(data.isHomeState ? 'Intra-state supply (CGST + SGST)' : 'Inter-state supply (IGST)', left + width / 2, y + 13);
    if (includeBuyerDetails) {
      const b = data.buyer;
      doc.font('bold').fontSize(9.5).fillColor('#111827').text(b.fullName || 'Customer', left, y, { width: width / 2 - 10 });
      doc.font('regular').fontSize(8.5).fillColor('#374151')
        .text([b.houseNo, b.area, b.landmark].filter(Boolean).join(', '), { width: width / 2 - 10 })
        .text([b.city, b.state, b.pincode].filter(Boolean).join(', '), { width: width / 2 - 10 });
      if (b.mobileNumber) doc.text(`Phone: ${b.mobileNumber}`, { width: width / 2 - 10 });
    } else {
      doc.font('regular').fontSize(9).fillColor('#374151').text('Customer (online order)', left, y, { width: width / 2 - 10 });
    }
    y = Math.max(doc.y, y + 30) + 14;

    // ---- Items table
    const cols = [
      { key: 'no', label: '#', width: 22, align: 'left' },
      { key: 'description', label: 'Description', width: 175, align: 'left' },
      { key: 'hsn', label: 'HSN/SAC', width: 52, align: 'left' },
      { key: 'quantity', label: 'Qty', width: 34, align: 'right' },
      { key: 'rate', label: 'Rate (incl. GST)', width: 82, align: 'right' },
      { key: 'taxable', label: 'Taxable Value', width: 75, align: 'right' },
      { key: 'amount', label: 'Amount', width: width - 440, align: 'right' }
    ];
    const drawRow = (values, rowY, { bold = false, color = '#111827' } = {}) => {
      let x = left;
      let height = 0;
      for (const col of cols) {
        doc.font(bold ? 'bold' : 'regular').fontSize(8.5).fillColor(color)
          .text(values[col.key] ?? '', x + 4, rowY, { width: col.width - 8, align: col.align });
        height = Math.max(height, doc.heightOfString(String(values[col.key] ?? ''), { width: col.width - 8 }));
        x += col.width;
      }
      return rowY + height + 8;
    };

    doc.rect(left, y, width, 20).fill('#ecfdf5');
    y = drawRow(Object.fromEntries(cols.map((c) => [c.key, c.label])), y + 6, { bold: true, color: GREEN }) - 2;
    data.lines.forEach((line, i) => {
      if (y > doc.page.height - 220) {
        doc.addPage();
        y = 40;
      }
      y = drawRow({
        no: String(i + 1),
        description: line.description,
        hsn: line.hsn,
        quantity: line.quantity ?? '',
        rate: line.rate !== null ? money(line.rate) : '',
        taxable: money(line.taxable),
        amount: money(line.amount)
      }, y + 4);
      doc.moveTo(left, y).lineTo(right, y).lineWidth(0.4).strokeColor('#e5e7eb').stroke();
    });

    // ---- Tax summary (right) and amount in words (left)
    y += 14;
    const summaryX = right - 220;
    const summary = [
      ['Taxable Value', money(data.tax.taxable)],
      ...(data.isHomeState
        ? [['CGST @ 2.5%', money(data.tax.cgst)], ['SGST @ 2.5%', money(data.tax.sgst)]]
        : [['IGST @ 5%', money(data.tax.igst)]]),
      ['Total GST', money(data.tax.tax)]
    ];
    let sy = y;
    for (const [label, value] of summary) {
      doc.font('regular').fontSize(9).fillColor('#374151').text(label, summaryX, sy, { width: 120 });
      doc.font('regular').text(value, summaryX + 120, sy, { width: 100, align: 'right' });
      sy += 15;
    }
    doc.moveTo(summaryX, sy).lineTo(right, sy).lineWidth(0.8).strokeColor('#111827').stroke();
    sy += 6;
    doc.font('bold').fontSize(11).fillColor(GREEN).text('Grand Total', summaryX, sy, { width: 120 });
    doc.text(money(data.total), summaryX + 100, sy, { width: 120, align: 'right' });

    doc.font('bold').fontSize(8.5).fillColor(GREY).text('AMOUNT IN WORDS', left, y, { width: summaryX - left - 20 });
    doc.font('regular').fontSize(9).fillColor('#111827').text(amountInWords(data.total), left, y + 12, { width: summaryX - left - 20 });
    doc.font('regular').fontSize(8).fillColor(GREY)
      .text('All prices include GST. Tax shown is the GST contained in the amount paid.', left, y + 40, { width: summaryX - left - 20 });

    // ---- Footer
    const footerY = Math.max(sy + 50, doc.y + 30);
    doc.moveTo(left, footerY).lineTo(right, footerY).lineWidth(0.4).strokeColor('#e5e7eb').stroke();
    doc.font('bold').fontSize(9.5).fillColor(GREEN).text('Thanks for choosing Idukki Origins!', left, footerY + 10, { width, align: 'center' });
    doc.font('regular').fontSize(7.5).fillColor(GREY)
      .text('This is a computer-generated invoice and does not require a signature.', left, footerY + 26, { width, align: 'center' });

    doc.end();
  });
}
