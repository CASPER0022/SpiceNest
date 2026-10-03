// Couriers we ship with. Keep the ids in sync with CARRIERS in frontend/src/pages/Dashboard.jsx.
// trackingUrl opens the parcel directly where the courier supports it; otherwise the courier's
// site, and the email / Track Order page tell the customer to enter the number there.
export const CARRIERS = {
  'india-post': {
    name: 'India Post',
    numberLabel: 'Article / tracking number',
    trackingUrl: () => 'https://www.indiapost.gov.in',
    help: 'On the India Post website, open "Track Consignment" and enter the number above.'
  },
  delhivery: {
    name: 'Delhivery',
    numberLabel: 'AWB / tracking number',
    trackingUrl: (number) => `https://www.delhivery.com/track/package/${encodeURIComponent(number)}`,
    help: 'The button opens your shipment on the Delhivery website.'
  },
  dtdc: {
    name: 'DTDC',
    numberLabel: 'Consignment / tracking number',
    trackingUrl: () => 'https://www.dtdc.com',
    help: 'On the DTDC website, open "Track" and enter the number above.'
  }
};

export const DEFAULT_CARRIER = 'india-post';

// Orders saved before couriers could be chosen have no carrier: they were India Post
export const carrierFor = (id) => CARRIERS[id] || CARRIERS[DEFAULT_CARRIER];

// What customers see: { id, name, url, help }, or null when there is no tracking number yet
export function trackingInfo(order) {
  if (!order.trackingNumber) return null;
  const id = CARRIERS[order.shippingCarrier] ? order.shippingCarrier : DEFAULT_CARRIER;
  const carrier = CARRIERS[id];
  return { id, name: carrier.name, url: carrier.trackingUrl(order.trackingNumber), help: carrier.help };
}
