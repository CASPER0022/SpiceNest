import { useEffect } from 'react';

// Structured data (schema.org JSON-LD) for search engines. index.html describes the business;
// pages add their own block with useJsonLd, which is removed again when the page closes.

const SITE_URL = 'https://www.idukkiorigins.com';

// Same pack sizes and prices as the product page and the product feed
const PACKS = [
  { label: '100g', multiplier: 1.0, kg: 0.1, discountPercent: 0 },
  { label: '250g', multiplier: 2.5, kg: 0.25, discountPercent: 5 },
  { label: '500g', multiplier: 5.0, kg: 0.5, discountPercent: 10 },
  { label: '1kg', multiplier: 10.0, kg: 1.0, discountPercent: 15 }
];

// Shipping and returns, shown by Google in shopping results. Same rules as the checkout:
// ₹100 shipping below ₹500, free from ₹500; ships in 1-2 working days, arrives in 1-10 days.
// Spices are food, so returns are not accepted (damaged or wrong items are replaced).
const FREE_SHIPPING_FROM = 500;
const SHIPPING_CHARGE = 100;
const shippingDetails = (price) => ({
  '@type': 'OfferShippingDetails',
  shippingRate: { '@type': 'MonetaryAmount', value: price >= FREE_SHIPPING_FROM ? 0 : SHIPPING_CHARGE, currency: 'INR' },
  shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
    transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 10, unitCode: 'DAY' }
  }
});
const RETURN_POLICY = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'IN',
  returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted'
};

const absolute = (path) => (/^https?:\/\//i.test(path) ? path : encodeURI(`${SITE_URL}/${String(path).replace(/^\/+/, '')}`));

export function productJsonLd(product) {
  if (!product?.name || !product?.slug) return null;
  const packs = PACKS.filter((pack) => pack.kg <= (product.stock ?? 0));
  const url = `${SITE_URL}/product/${product.slug}`;
  // One offer per pack size (each opens that weight on the product page), or the smallest pack
  // shown as out of stock
  const offers = (packs.length ? packs : PACKS.slice(0, 1)).map((pack) => {
    const price = Math.round(product.price * pack.multiplier * (1 - pack.discountPercent / 100));
    return {
      '@type': 'Offer',
      name: `${product.name} ${pack.label}`,
      url: `${url}?weight=${pack.label}`,
      price,
      priceCurrency: 'INR',
      availability: packs.length ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      shippingDetails: shippingDetails(price),
      hasMerchantReturnPolicy: RETURN_POLICY,
      seller: { '@id': `${SITE_URL}/#organization` }
    };
  });

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.name,
    url,
    image: (product.images || []).filter(Boolean).map(absolute),
    description: String(product.description || '').replace(/\s+/g, ' ').trim(),
    category: product.category || undefined,
    brand: { '@type': 'Brand', name: 'Idukki Origins' },
    offers
  };
  // Stars only from real reviews on the site
  if (product.reviewsCount > 0 && product.rating > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(product.rating).toFixed(1),
      reviewCount: product.reviewsCount
    };
  }
  return data;
}

// Article data for a blog post (see data/blogPosts.js)
export function blogPostingJsonLd(post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: absolute(post.cover),
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: post.author, url: SITE_URL },
    publisher: { '@id': `${SITE_URL}/#organization` },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    keywords: post.tags.join(', ')
  };
}

// Adds a JSON-LD block while the page is open. A ready-made page (scripts/prerender.js) already
// has a block with the same id, written when the site was built: it is replaced by the live one.
export function useJsonLd(id, data) {
  const json = data ? JSON.stringify(data) : '';
  useEffect(() => {
    if (!json) return undefined;
    document.getElementById(id)?.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.textContent = json;
    document.head.appendChild(script);
    return () => script.remove();
  }, [id, json]);
}

// Home › Section › Page path for Google results, e.g.
// breadcrumbJsonLd([['Shop', '/shop'], ['Black Pepper', '/product/black-pepper']])
export function breadcrumbJsonLd(trail) {
  if (!trail?.length || trail.some(([name]) => !name)) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [['Home', '/'], ...trail].map(([name, path], index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: `${SITE_URL}${path}`
    }))
  };
}
