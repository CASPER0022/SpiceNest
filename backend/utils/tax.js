// ==========================================
// GST REPORT (monthly, per state)
// Prices include GST at 5%, so the tax inside an order is amountPaid x 5/105 (shipping included:
// delivery charged with the goods is taxed like the goods). The store is in Kerala:
//   Kerala (intra-state):        2.5% CGST + 2.5% SGST
//   Other states and UTs:        5% IGST
// Row labels follow the format of the monthly sheets used so far, e.g. "IN-KL-2.5% CGST-1".
// ==========================================

export const GST_RATE = 0.05;
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

// GST contained in one order's amount paid
export function orderTax(amountPaid, state) {
  const tax = round2(amountPaid * GST_RATE / (1 + GST_RATE));
  if (state === HOME_STATE) {
    const cgst = round2(tax / 2);
    return { taxable: round2(amountPaid - tax), cgst, sgst: round2(tax - cgst), igst: 0, tax };
  }
  return { taxable: round2(amountPaid - tax), cgst: 0, sgst: 0, igst: tax, tax };
}

// Orders are grouped by the month they were placed in Indian time (IST, UTC+5:30)
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export function istMonthRange(year, month) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - IST_OFFSET_MS),
    end: new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS)
  };
}

/**
 * @param {Array} orders - [{ id, totalAmount, status, address (JSON string) }] placed in the month
 * @returns {{ states, lines, totals, unknownStateOrderIds, excludedOrders }}
 *   states: one row per state (orders, sales, taxable, cgst, sgst, igst, tax)
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

    const amount = Number(order.totalAmount) || 0;
    const tax = orderTax(amount, state);
    const row = byState.get(key) || { state: key, code: state ? STATE_CODES[state] : '??', orders: 0, sales: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 };
    row.orders += 1;
    row.sales = round2(row.sales + amount);
    row.taxable = round2(row.taxable + tax.taxable);
    row.cgst = round2(row.cgst + tax.cgst);
    row.sgst = round2(row.sgst + tax.sgst);
    row.igst = round2(row.igst + tax.igst);
    row.tax = round2(row.tax + tax.tax);
    byState.set(key, row);
  }

  // Kerala first, then the other states by tax collected (highest first)
  const states = [...byState.values()].sort((a, b) =>
    (b.state === HOME_STATE) - (a.state === HOME_STATE) || b.tax - a.tax || a.state.localeCompare(b.state));

  const lines = [];
  for (const row of states) {
    if (row.state === HOME_STATE) {
      lines.push({ label: `IN-${row.code}-2.5% CGST-1`, state: row.state, amount: row.cgst });
      lines.push({ label: `IN-${row.code}-2.5% SGST-2`, state: row.state, amount: row.sgst });
    } else {
      lines.push({ label: `IN-${row.code}-5% IGST-3`, state: row.state, amount: row.igst });
    }
  }

  const sum = (field) => round2(states.reduce((total, row) => total + row[field], 0));
  const totals = { orders: sum('orders'), sales: sum('sales'), taxable: sum('taxable'), cgst: sum('cgst'), sgst: sum('sgst'), igst: sum('igst'), tax: sum('tax') };

  return { states, lines, totals, unknownStateOrderIds, excludedOrders };
}
