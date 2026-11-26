// Title and search description of each fixed page. The pages read these through usePageMeta,
// and the build script (scripts/prerender.js) writes them into each page's ready-made HTML,
// so the two always match. Keep descriptions under ~155 characters so Google shows them in full.

export const PAGE_META = {
  '/shop': {
    title: 'Shop Whole Spices',
    description: 'Buy farm-direct black pepper, cardamom, cloves, nutmeg and mace from Idukki, Kerala in 100 g to 1 kg packs. Free shipping above ₹500.'
  },
  '/farmers': {
    title: 'Our Farmers',
    description: 'Meet the Idukki farmers who grow our spices. We buy pepper, cardamom, cloves, nutmeg and mace directly from them.'
  },
  '/about': {
    title: 'About Us',
    description: 'Idukki Origins grows black pepper, cardamom, nutmeg and cloves on its own farms in Idukki, Kerala, and buys directly from local farmers.'
  },
  '/gallery': {
    title: 'Gallery',
    description: 'Photos from Idukki: pepper vines, cardamom harvests, nutmeg, mace and cloves on the farm, and the packs they end up in.'
  },
  '/blog': {
    title: 'Blog',
    description: 'Stories from the spice hills of Idukki, Kerala: the history of the Spice Route, how our spices are grown and harvested, and how to cook with them.'
  },
  '/contact': {
    title: 'Contact Us',
    description: 'Contact Idukki Origins, Kanjikuzhy, Idukki, Kerala: phone, WhatsApp and email for orders, bulk enquiries and farmer partnerships.'
  },
  '/reviews': {
    title: 'Customer Reviews',
    description: 'Read reviews of Idukki Origins spices from verified buyers, and share your own after your order arrives.'
  },
  '/certifications': {
    title: 'Certifications',
    description: 'Idukki Origins is FSSAI registered (21326177000702), GST registered (32AGFPJ8946D1ZH) and an MSME Udyam registered business (UDYAM-KL-03-0041531).'
  },
  '/shipping-policy': {
    title: 'Shipping Policy',
    description: 'Idukki Origins ships across India with Delhivery, DTDC and India Post. Orders dispatch in 1–2 working days and arrive in 1–10 days. Free shipping above ₹500.'
  },
  '/cancellation-return': {
    title: 'Cancellation & Return Policy',
    description: 'Our spices are food products, so we do not accept returns. Damaged or wrong item? Report it within 7 days of delivery with photos for a free replacement or full refund.'
  },
  '/refund-policy': {
    title: 'Refund Policy',
    description: 'How and when Idukki Origins refunds orders: damaged or wrong items and cancellations before dispatch, paid back to your original payment method.'
  },
  '/privacy-policy': {
    title: 'Privacy Policy',
    description: 'How Idukki Origins collects, uses, shares and protects your personal information, including payments, cookies and your consent.'
  },
  '/terms-conditions': {
    title: 'Terms of Service',
    description: 'The terms of service for the Idukki Origins online store: orders, prices, products, billing, prohibited uses and liability.'
  }
};

// [title, description] for usePageMeta, e.g. usePageMeta(...pageMeta('/shop'))
export const pageMeta = (path) => [PAGE_META[path].title, PAGE_META[path].description];
