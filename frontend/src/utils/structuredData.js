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

const absolute = (path) => (/^https?:\/\//i.test(path) ? path : encodeURI(`${SITE_URL}/${String(path).replace(/^\/+/, '')}`));

export function productJsonLd(product) {
  if (!product?.name || !product?.slug) return null;
  const packs = PACKS.filter((pack) => pack.kg <= (product.stock ?? 0));
  const prices = (packs.length ? packs : PACKS.slice(0, 1)).map((pack) =>
    Math.round(product.price * pack.multiplier * (1 - pack.discountPercent / 100))
  );
  const url = `${SITE_URL}/product/${product.slug}`;

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
    offers: {
      '@type': 'AggregateOffer',
      url,
      priceCurrency: 'INR',
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: prices.length,
      availability: packs.length ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@id': `${SITE_URL}/#organization` }
    }
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

export function useJsonLd(id, data) {
  const json = data ? JSON.stringify(data) : '';
  useEffect(() => {
    if (!json) return undefined;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.textContent = json;
    document.head.appendChild(script);
    return () => script.remove();
  }, [id, json]);
}
