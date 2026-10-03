import { normalizeIndianMobile, PHONE_ERROR } from './phone';

const REQUIRED_FIELDS = ['fullName', 'mobileNumber', 'email', 'pincode', 'houseNo', 'area', 'city', 'state'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// First problem with a shipping address (same rules as checkout), or '' when it can be saved
export function addressError(address) {
  if (REQUIRED_FIELDS.some((field) => !String(address[field] || '').trim())) return 'Please fill in all required address fields.';
  if (!normalizeIndianMobile(address.mobileNumber)) return PHONE_ERROR;
  if (!EMAIL_REGEX.test(address.email.trim())) return 'Please enter a valid email address.';
  if (!/^\d{6}$/.test(address.pincode.trim())) return 'Please enter a valid 6-digit PIN code.';
  return '';
}
