// ==========================================
// PRODUCT FEEDS for Google Merchant Center and Facebook / Instagram (Meta Commerce Manager)
//   GET /api/feed/google.xml    RSS 2.0 with the g: namespace (Google's feed spec)
//   GET /api/feed/facebook.xml  Same feed; Meta Commerce Manager accepts Google's format
//   GET /api/feed/facebook.csv  CSV version for Meta, if preferred
// Every weight option is its own item (e.g. "1-250g"), grouped by product with item_group_id,
// and links to the product page with that weight pre-selected so the prices match.
// ==========================================
import express from 'express';
import prisma from '../db.js';
import { FRONTEND_URL } from '../config.js';
import { WEIGHT_OPTIONS, getUnitPrice, FREE_SHIPPING_THRESHOLD, SHIPPING_CHARGE, MIN_PACK_KG } from '../utils/pricing.js';

const router = express.Router();

const SITE_URL = FRONTEND_URL.replace(/\/+$/, '');
const BRAND = 'Idukki Origins';
const CURRENCY = 'INR';
const FEED_CACHE_MS = 10 * 60 * 1000;

// Google product taxonomy per shop category. Unlisted categories are left for Google to classify.
const GOOGLE_CATEGORIES = {
  'Whole Spices': 'Food, Beverages & Tobacco > Food Items > Seasonings & Spices > Herbs & Spices',
  'Powders': 'Food, Beverages & Tobacco > Food Items > Seasonings & Spices > Herbs & Spices',
  'Beverages': 'Food, Beverages & Tobacco > Beverages > Coffee'
};

const formatPrice = (amount) => `${amount.toFixed(2)} ${CURRENCY}`;

// Image paths are stored relative to the website (e.g. "/images/coriander powder/x.jpg")
function absoluteUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return encodeURI(`${SITE_URL}/${String(path).replace(/^\/+/, '')}`);
}

function plainText(text, maxLength) {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

// One feed item per product weight option
async function loadFeedItems() {
  const products = await prisma.product.findMany({
    // Sold-out products are hidden on the site, so their pages would not load for Google / Meta
    where: { isArchived: false, slug: { not: null }, stock: { gte: MIN_PACK_KG } },
    orderBy: { id: 'asc' }
  });

  const items = [];
  for (const product of products) {
    const images = (product.images || []).filter(Boolean).map(absoluteUrl);
    if (images.length === 0) continue; // image_link is required

    for (const [weight, option] of Object.entries(WEIGHT_OPTIONS)) {
      // Same rounding as the product page shows
      const price = Math.round(product.price * option.multiplier);
      const salePrice = Math.round(getUnitPrice(product.price, weight));
      items.push({
        id: `${product.id}-${weight}`,
        groupId: String(product.id),
        title: plainText(`${product.name} ${weight}`, 150),
        description: plainText(product.description, 5000) || product.name,
        link: `${SITE_URL}/product/${product.slug}?weight=${encodeURIComponent(weight)}`,
        image: images[0],
        additionalImages: images.slice(1, 11),
        inStock: product.stock >= option.kg,
        price,
        salePrice: salePrice < price ? salePrice : null,
        shipping: (salePrice ?? price) >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE,
        weight,
        shippingWeight: `${option.kg * 1000} g`,
        category: product.category,
        googleCategory: GOOGLE_CATEGORIES[product.category] || null
      });
    }
  }
  return items;
}

const XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const xml = (value) => String(value)
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch]);

function buildXml(items) {
  const tag = (name, value) => (value === null || value === undefined || value === '' ? '' : `      <${name}>${xml(value)}</${name}>\n`);
  const entries = items.map((item) => {
    let out = '    <item>\n';
    out += tag('g:id', item.id);
    out += tag('g:item_group_id', item.groupId);
    out += tag('g:title', item.title);
    out += tag('g:description', item.description);
    out += tag('g:link', item.link);
    out += tag('g:image_link', item.image);
    for (const image of item.additionalImages) out += tag('g:additional_image_link', image);
    out += tag('g:availability', item.inStock ? 'in_stock' : 'out_of_stock');
    out += tag('g:price', formatPrice(item.price));
    if (item.salePrice !== null) out += tag('g:sale_price', formatPrice(item.salePrice));
    out += tag('g:brand', BRAND);
    out += tag('g:condition', 'new');
    out += tag('g:identifier_exists', 'no');
    out += tag('g:size', item.weight);
    out += tag('g:product_type', item.category);
    out += tag('g:google_product_category', item.googleCategory);
    out += tag('g:shipping_weight', item.shippingWeight);
    out += '      <g:shipping>\n';
    out += '        <g:country>IN</g:country>\n';
    out += `        <g:price>${formatPrice(item.shipping)}</g:price>\n`;
    out += '      </g:shipping>\n';
    out += '    </item>\n';
    return out;
  });

  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n'
    + '  <channel>\n'
    + `    <title>${xml(BRAND)}</title>\n`
    + `    <link>${xml(SITE_URL)}</link>\n`
    + `    <description>${xml(`${BRAND} product feed`)}</description>\n`
    // When this file was built (it is rebuilt from the live catalog whenever it is fetched)
    + `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`
    + entries.join('')
    + '  </channel>\n'
    + '</rss>\n';
}

function buildCsv(items) {
  const columns = ['id', 'item_group_id', 'title', 'description', 'availability', 'condition', 'price', 'sale_price', 'link', 'image_link', 'additional_image_link', 'brand', 'size', 'product_type', 'google_product_category', 'shipping_weight', 'shipping'];
  const cell = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows = items.map((item) => [
    item.id,
    item.groupId,
    item.title,
    item.description,
    item.inStock ? 'in stock' : 'out of stock',
    'new',
    formatPrice(item.price),
    item.salePrice !== null ? formatPrice(item.salePrice) : '',
    item.link,
    item.image,
    item.additionalImages.join(','),
    BRAND,
    item.weight,
    item.category,
    item.googleCategory,
    item.shippingWeight,
    `IN:::${formatPrice(item.shipping)}`
  ].map(cell).join(','));
  return [columns.join(','), ...rows].join('\n') + '\n';
}

// Feeds are fetched by Google / Meta a few times a day; a short cache keeps that cheap.
// Product edits show up in the feed within FEED_CACHE_MS.
const cache = new Map();
function serveFeed(format, contentType, build) {
  return async (req, res) => {
    try {
      let entry = cache.get(format);
      if (!entry || entry.expires < Date.now()) {
        entry = { body: build(await loadFeedItems()), builtAt: new Date(), expires: Date.now() + FEED_CACHE_MS };
        cache.set(format, entry);
      }
      res.set('Content-Type', contentType);
      res.set('Last-Modified', entry.builtAt.toUTCString());
      res.set('Cache-Control', `public, max-age=${FEED_CACHE_MS / 1000}`);
      res.send(entry.body);
    } catch (error) {
      console.error(`Product feed (${format}) error:`, error);
      res.status(500).type('text/plain').send('Failed to build product feed');
    }
  };
}

const serveXml = serveFeed('xml', 'application/xml; charset=utf-8', buildXml);
router.get('/google.xml', serveXml);
router.get('/facebook.xml', serveXml);
router.get('/facebook.csv', serveFeed('facebook-csv', 'text/csv; charset=utf-8', buildCsv));

export default router;
