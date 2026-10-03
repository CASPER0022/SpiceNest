// Guests type their name into an unverified checkout form, and it ends up in emails we send to an
// address nobody has verified. So only a plain personal name is used ("Sigi Raju", "Anil K. D'Souza"):
// letters (any script), spaces, dots, apostrophes and hyphens, up to 50 characters. Anything else
// (links, digits, messages) returns '' and the caller falls back to a generic greeting.
export function plainPersonName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  if (name.length === 0 || name.length > 50) return '';
  return /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(name) ? name : '';
}
