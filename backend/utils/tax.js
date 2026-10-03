// ==========================================
// GST REPORT (monthly, per state)
// All prices include GST. Spices are taxed at 5% and the shipping charge at 18%, so the tax
// inside an order is (amount paid - shipping) x 5/105 + shipping x 18/118. The store is in Kerala:
//   Kerala (intra-state):   goods 2.5% CGST + 2.5% SGST,  shipping 9% CGST + 9% SGST
//   Other states and UTs:   goods 5% IGST,                shipping 18% IGST
// Row labels follow the format of the monthly sheets used so far, e.g. "IN-KL-2.5% CGST-1".
// ==========================================
import { FREE_SHIPPING_THRESHOLD, SHIPPING_CHARGE } from './pricing.js';

export const GST_RATE = 0.05; // spices
export const SHIPPING_GST_RATE = 0.18; // delivery charge
export const HOME_STATE = 'Kerala';

// Orders in these statuses were not (or no longer are) a taxable sale
export const NON_TAXABLE_STATUSES = ['Cancelled', 'Refunded', 'Failed', 'Pending Payment'];

// State / union territory -> code used in the tax labels
export const STATE_CODES = {
  'Andhra Pradesh': 'AP', 'Arunachal Pradesh': 'AR', 'Assam': 'AS', 'Bihar': 'BR',
  'Chhattisgarh': 'CT', 'Goa': 'GA', 'Gujarat': 'GJ', 'Haryana': 'HR', 'Himachal Pradesh': 'HP',
  'Jharkhand': 'JH', 'Karnataka': 'KA', 'Kerala': 'KL', 'Madhya Pradesh': 'MP',
  'Maharashtra': 'MH', 'Manipur': 'MN', 'Meghalaya': 'ML', 'Mizoram': 'MZ', 'Nagaland': 'NL',
  'Odisha': 'OR', 'Punjab': 'PB', 'Rajasthan': 'RJ', 'Sikkim': 'SK', 'Tamil Nadu': 'TN',
  'Telangana': 'TS', 'Tripura': 'TR', 'Uttar Pradesh': 'UP', 'Uttarakhand': 'UK',
  'West Bengal': 'WB',
  'Andaman and Nicobar Islands': 'AN', 'Chandigarh': 'CH',
  'Dadra and Nagar Haveli and Daman and Diu': 'DH', 'Delhi': 'DL', 'Jammu and Kashmir': 'JK',
  'Ladakh': 'LA', 'Lakshadweep': 'LD', 'Puducherry': 'PY'
};

// Keep in sync with frontend/src/utils/indianStates.js
const STATE_ALIASES = {
  'orissa': 'Odisha',
  'pondicherry': 'Puducherry',
  'new delhi': 'Delhi',
  'nct of delhi': 'Delhi',
  'uttaranchal': 'Uttarakhand',
  'j&k': 'Jammu and Kashmir',
  'andaman & nicobar': 'Andaman and Nicobar Islands',
  'andaman and nicobar': 'Andaman and Nicobar Islands'
};

// Free text from an order address ("kerala", "Orissa") -> official name, or null if unknown
export function matchState(value) {
  const text = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text) return null;
  if (STATE_ALIASES[text]) return STATE_ALIASES[text];
  const normalized = text.replace(/&/g, 'and');
  return Object.keys(STATE_CODES).find((name) => name.toLowerCase() === normalized) || null;
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * How an order's total was made up. Orders keep the price paid per item and the total; shipping,
 * the coupon discount and the rupee rounding are derived the way checkout charged them
 * (utils/pricing.js). Items need { price, quantity }.
 */
export function orderAmounts(order) {
  const total = Number(order.totalAmount) || 0;
  const itemsTotal = round2((order.items || []).reduce((sum, item) => sum + Number(item.price) * item.quantity, 0));
  const shipping = itemsTotal > 0 && itemsTotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_CHARGE : 0;
  const gap = round2(itemsTotal + shipping - total);
  const discount = gap >= 1 ? Math.round(gap) : 0; // coupons are whole rupees
  const roundOff = round2(total - (itemsTotal + shipping - discount));
  return { total, itemsTotal, shipping, discount, roundOff, goods: round2(total - shipping) };
}

// GST inside an amount that includes it, split for the place of supply
function splitTax(gross, rate, isHomeState) {
  const tax = round2(gross * rate / (1 + rate));
  const half = round2(tax / 2);
  return isHomeState
    ? { taxable: round2(gross - tax), cgst: half, sgst: round2(tax - half), igst: 0, tax }
    : { taxable: round2(gross - tax), cgst: 0, sgst: 0, igst: tax, tax };
}

/**
 * GST contained in one order: goods at 5%, shipping at 18%.
 * @returns {{ taxable, cgst, sgst, igst, tax, goods, shipping }} - totals, and each part separately
 */
export function orderTax(order, state) {
  const { goods, shipping } = orderAmounts(order);
  const isHomeState = state === HOME_STATE;
  const goodsTax = splitTax(goods, GST_RATE, isHomeState);
  const shippingTax = splitTax(shipping, SHIPPING_GST_RATE, isHomeState);
  const sum = (field) => round2(goodsTax[field] + shippingTax[field]);
  return {
    taxable: sum('taxable'), cgst: sum('cgst'), sgst: sum('sgst'), igst: sum('igst'), tax: sum('tax'),
    goods: goodsTax,
    shipping: shippingTax
  };
}

// Orders are grouped by the month they were placed in Indian time (IST, UTC+5:30)
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export function istMonthRange(year, month) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - IST_OFFSET_MS),
    end: new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS)
  };
}

const REPORT_FIELDS = ['taxable', 'cgst', 'sgst', 'igst', 'tax', 'goodsCgst', 'goodsSgst', 'goodsIgst', 'shippingCgst', 'shippingSgst', 'shippingIgst'];

/**
 * @param {Array} orders - [{ id, totalAmount, status, address (JSON string), items: [{ price, quantity }] }]
 *        placed in the month
 * @returns {{ states, lines, totals, unknownStateOrderIds, excludedOrders }}
 *   states: one row per state: orders, sales, taxable, cgst, sgst, igst, tax, and the same split
 *           by rate (goodsCgst / goodsSgst / goodsIgst at 5%, shippingCgst / ... at 18%)
 *   lines:  rows in the monthly sheet format ({ label, amount }), Kerala first
 */
export function buildTaxReport(orders) {
  const byState = new Map();
  const unknownStateOrderIds = [];
  let excludedOrders = 0;

  for (const order of orders) {
    if (NON_TAXABLE_STATUSES.includes(order.status)) {
      excludedOrders += 1;
      continue;
    }
    let address = {};
    try {
      address = typeof order.address === 'string' ? JSON.parse(order.address) : (order.address || {});
    } catch {
      address = {};
    }
    const state = matchState(address.state);
    if (!state) unknownStateOrderIds.push(order.id);
    const key = state || 'Unknown';

    const tax = orderTax(order, state);
    const parts = {
      taxable: tax.taxable, cgst: tax.cgst, sgst: tax.sgst, igst: tax.igst, tax: tax.tax,
      goodsCgst: tax.goods.cgst, goodsSgst: tax.goods.sgst, goodsIgst: tax.goods.igst,
      shippingCgst: tax.shipping.cgst, shippingSgst: tax.shipping.sgst, shippingIgst: tax.shipping.igst
    };
    const row = byState.get(key) || {
      state: key, code: state ? STATE_CODES[state] : '??', orders: 0, sales: 0,
      ...Object.fromEntries(REPORT_FIELDS.map((field) => [field, 0]))
    };
    row.orders += 1;
    row.sales = round2(row.sales + (Number(order.totalAmount) || 0));
    for (const field of REPORT_FIELDS) row[field] = round2(row[field] + parts[field]);
    byState.set(key, row);
  }

  // Kerala first, then the other states by tax collected (highest first)
  const states = [...byState.values()].sort((a, b) =>
    (b.state === HOME_STATE) - (a.state === HOME_STATE) || b.tax - a.tax || a.state.localeCompare(b.state));

  const lines = [];
  for (const row of states) {
    if (row.state === HOME_STATE) {
      lines.push({ label: `IN-${row.code}-2.5% CGST-1`, state: row.state, amount: row.goodsCgst });
      lines.push({ label: `IN-${row.code}-2.5% SGST-2`, state: row.state, amount: row.goodsSgst });
      if (row.shippingCgst || row.shippingSgst) {
        lines.push({ label: `IN-${row.code}-9% CGST-4`, state: row.state, amount: row.shippingCgst });
        lines.push({ label: `IN-${row.code}-9% SGST-5`, state: row.state, amount: row.shippingSgst });
      }
    } else {
      lines.push({ label: `IN-${row.code}-5% IGST-3`, state: row.state, amount: row.goodsIgst });
      if (row.shippingIgst) lines.push({ label: `IN-${row.code}-18% IGST-6`, state: row.state, amount: row.shippingIgst });
    }
  }

  const sum = (field) => round2(states.reduce((total, row) => total + row[field], 0));
  const totals = Object.fromEntries(['orders', 'sales', ...REPORT_FIELDS].map((field) => [field, sum(field)]));

  return { states, lines, totals, unknownStateOrderIds, excludedOrders };
}
