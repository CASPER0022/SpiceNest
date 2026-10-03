// Shipping is India-only. 28 states and 8 union territories, for the address State dropdown.
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export const INDIAN_UNION_TERRITORIES = [
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const ALL = [...INDIAN_STATES, ...INDIAN_UNION_TERRITORIES];

// Old names and common spellings people typed before the dropdown existed
const ALIASES = {
  'orissa': 'Odisha',
  'pondicherry': 'Puducherry',
  'new delhi': 'Delhi',
  'nct of delhi': 'Delhi',
  'uttaranchal': 'Uttarakhand',
  'j&k': 'Jammu and Kashmir',
  'andaman & nicobar': 'Andaman and Nicobar Islands',
  'andaman and nicobar': 'Andaman and Nicobar Islands'
};

// Matches free text ("kerala", "Tamil nadu", "Orissa") to a dropdown value, or '' if unknown
export function matchIndianState(value) {
  const text = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text) return '';
  if (ALIASES[text]) return ALIASES[text];
  const normalized = text.replace(/&/g, 'and');
  return ALL.find((name) => name.toLowerCase() === normalized) || '';
}
