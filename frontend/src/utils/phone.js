// Indian mobile numbers: 10 digits starting with 6-9. Common ways of typing one are accepted and
// reduced to the 10 digits: "+91 94467 20133", "91-9446720133", "09446720133".
// Keep in sync with backend/utils/phone.js
export function normalizeIndianMobile(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}

export const PHONE_ERROR = 'Please enter a valid 10-digit mobile number.';
