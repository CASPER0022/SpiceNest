// Writes a ready-made HTML file for every public page of the built site (run after `vite build`).
//
// The site is a single-page app: without this, every address gets the same nearly empty
// index.html with the home page's title, and the real page appears only after JavaScript runs
// and fetches the data. Link previews (WhatsApp, Facebook, Instagram, LinkedIn) and most search
// engines do not run JavaScript, so they saw the home page for every link.
//
// Each file written here already holds that page's title, description, link-preview tags,
// structured data and main text. Visitors see no difference: the text sits in a hidden block
// that React replaces as soon as the app starts (see the <style> added below).
//
// dist/index.html becomes the ready-made home page; the empty app shell is kept as
// dist/spa.html, which vercel.json serves for every address without a ready-made file
// (cart, login, dashboard, unknown addresses...).
//
// Product and farmer data comes from the live backend (PRERENDER_API_URL or VITE_API_URL,
// default https://spicenest.onrender.com). If it cannot be reached the build fails, so a broken
// build never replaces the live site. The backend triggers a new build when a product is saved,
// and a GitHub Action rebuilds every night (.github/workflows/nightly-rebuild.yml).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { loadEnv } from 'vite';

import { PAGE_META } from '../src/data/pageMeta.js';
import { BLOG_POSTS, sortedPosts, formatPostDate } from '../src/data/blogPosts.js';
import { productJsonLd, breadcrumbJsonLd, blogPostingJsonLd } from '../src/utils/structuredData.js';
import { shortDescription, DEFAULT_DESCRIPTION, DEFAULT_SHARE_IMAGE } from '../src/utils/usePageMeta.js';
import { thumbSrc } from '../src/utils/images.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SITE = 'Idukki Origins';
const SITE_URL = 'https://www.idukkiorigins.com';
const HOME_TITLE = `${SITE} | Farm-Direct Spices from Idukki, Kerala`;

const env = loadEnv('production', ROOT, '');
const configuredApi = process.env.PRERENDER_API_URL || env.VITE_API_URL || '';
// A local build with a localhost API still uses the live backend (there is no local data to read)
const API_URL = (configuredApi && !/localhost|127\.0\.0\.1/.test(configuredApi)
  ? configuredApi
  : 'https://spicenest.onrender.com').replace(/\/+$/, '');

// Same pack sizes and discounts as the product page
const PACKS = [
  { label: '100 g', multiplier: 1.0, kg: 0.1, discountPercent: 0 },
  { label: '250 g', multiplier: 2.5, kg: 0.25, discountPercent: 5 },
  { label: '500 g', multiplier: 5.0, kg: 0.5, discountPercent: 10 },
  { label: '1 kg', multiplier: 10.0, kg: 1.0, discountPercent: 15 }
];

// ---------- helpers ----------

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const absoluteUrl = (path) => (/^https?:\/\//i.test(path) ? path : encodeURI(`${SITE_URL}/${String(path).replace(/^\/+/, '')}`));

// **bold** and *italic* from the blog text, after escaping
const inlineText = (text) =>
  escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');

const paragraphs = (text) =>
  String(text || '').split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join('\n');

// The 600 px version of a site photo when the build has one, otherwise the original
const smallImage = (src) => {
  const thumb = thumbSrc(src);
  return thumb && thumb !== src && existsSync(join(DIST, decodeURI(thumb))) ? thumb : src;
};
// loading="lazy": a lazy image in a hidden block is never downloaded, so visitors don't pay for it
const img = (src, alt) => (src ? `<img src="${escapeHtml(encodeURI(smallImage(src)))}" alt="${escapeHtml(alt)}" loading="lazy" width="600">` : '');

const link = (path, text) => `<a href="${escapeHtml(path)}">${escapeHtml(text)}</a>`;

const rupees = (amount) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

// Fetches JSON from the backend. The free Render server can take up to a minute to wake up,
// so each request is retried for about four minutes before the build gives up.
async function fetchJson(path) {
  const url = `${API_URL}${path}`;
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      lastError = error;
      console.warn(`prerender: ${url} failed (attempt ${attempt}/6): ${error.message}`);
      if (attempt < 6) await new Promise((r) => setTimeout(r, 10_000));
    }
  }
  throw new Error(`prerender: could not load ${url}: ${lastError?.message}`);
}

// ---------- the page template ----------

const TEMPLATE = readFileSync(join(DIST, 'index.html'), 'utf8');
if (!TEMPLATE.includes('<div id="root"></div>')) {
  throw new Error('prerender: dist/index.html has no empty <div id="root"></div> (already prerendered?)');
}

// Replaces <meta name|property="key" content="..."> or adds it before </head>
function setMeta(html, attribute, key, content) {
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(`<meta\\s+${attribute}="${key.replace(/[.:]/g, '\\$&')}"\\s+content="[^"]*"\\s*/?>`);
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `  ${tag}\n  </head>`);
}

const removeMeta = (html, attribute, key) =>
  html.replace(new RegExp(`\\s*<meta\\s+${attribute}="${key.replace(/[.:]/g, '\\$&')}"\\s+content="[^"]*"\\s*/?>`), '');

// Visitors with JavaScript never see the ready-made text: React replaces it when the app starts,
// and until then it is hidden (no flash). Crawlers without JavaScript read it as normal HTML.
const HIDE_STYLE = '<style>@media (scripting: enabled) { #prerendered { display: none } }</style>';

/**
 * One ready-made page.
 * @param {object} page
 * @param {string} page.path        address, e.g. /product/black-pepper
 * @param {string|null} page.title  page name ("Shop"), or null for the home page
 * @param {string} [page.description]
 * @param {string} [page.image]     link-preview picture (site path or URL)
 * @param {string} [page.type]      og:type: website, product, article or profile
 * @param {object[]} [page.jsonLd]  [id, data] pairs; the ids match the app's useJsonLd ids
 * @param {string} page.body        main text (HTML)
 */
function renderPage({ path, title, description, image, type = 'website', jsonLd = [], body }) {
  const fullTitle = title ? `${title} | ${SITE}` : HOME_TITLE;
  const text = description || DEFAULT_DESCRIPTION;
  const url = `${SITE_URL}${path === '/' ? '/' : encodeURI(path)}`;
  const shareImage = absoluteUrl(image || DEFAULT_SHARE_IMAGE);

  let html = TEMPLATE.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(fullTitle)}</title>`);
  html = setMeta(html, 'name', 'description', text);
  html = setMeta(html, 'property', 'og:title', title || HOME_TITLE);
  html = setMeta(html, 'property', 'og:description', text);
  html = setMeta(html, 'property', 'og:url', url);
  html = setMeta(html, 'property', 'og:type', type);
  html = setMeta(html, 'property', 'og:image', shareImage);
  if (image) {
    // The size in the template is that of the default share picture
    html = removeMeta(html, 'property', 'og:image:width');
    html = removeMeta(html, 'property', 'og:image:height');
  }
  html = setMeta(html, 'name', 'twitter:title', title || HOME_TITLE);
  html = setMeta(html, 'name', 'twitter:description', text);
  html = setMeta(html, 'name', 'twitter:image', shareImage);

  const extraHead = [
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    HIDE_STYLE,
    ...jsonLd
      .filter(([, data]) => data)
      // "<" escaped so text in the data can never close the <script> tag
      .map(([id, data]) => `<script type="application/ld+json" id="${id}" data-prerendered>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`)
  ];
  html = html.replace('</head>', `  ${extraHead.join('\n    ')}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root"><div id="prerendered">\n${siteNav}\n<main>\n${body}\n</main>\n${siteFooter}\n</div></div>`);

  const file = path === '/' ? join(DIST, 'index.html') : join(DIST, ...path.split('/').filter(Boolean), 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

// Links on every page, so crawlers can find the whole site from any page
const siteNav = `<nav><ul>${[['/', 'Home'], ['/shop', 'Shop'], ['/farmers', 'Our Farmers'], ['/blog', 'Blog'], ['/about', 'About Us'], ['/reviews', 'Reviews'], ['/contact', 'Contact Us']]
  .map(([path, text]) => `<li>${link(path, text)}</li>`).join('')}</ul></nav>`;
const siteFooter = `<footer><ul>${['/certifications', '/shipping-policy', '/cancellation-return', '/refund-policy', '/privacy-policy', '/terms-conditions', '/gallery']
  .map((path) => `<li>${link(path, PAGE_META[path].title)}</li>`).join('')}</ul>
<p>${SITE}, Kanjikuzhy, Idukki, Kerala 685606, India. Phone and WhatsApp: +91 81290 74658. Email: info.idukkiorigins@gmail.com</p></footer>`;

// ---------- page bodies ----------

const productCard = (product) => `<li>
${img(product.images?.[0], product.name)}
<h3>${link(`/product/${product.slug}`, product.name)}</h3>
<p>${escapeHtml(shortDescription(product.description, 200))}</p>
<p>From ${rupees(product.price)} for 100 g</p>
</li>`;

function productBody(product) {
  const packs = PACKS.filter((pack) => pack.kg <= (product.stock ?? 0));
  return `<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link('/shop', 'Shop')} › ${escapeHtml(product.name)}</nav>
<article>
<h1>${escapeHtml(product.name)}</h1>
${(product.images || []).slice(0, 3).map((src, i) => img(src, i === 0 ? product.name : `${product.name}, photo ${i + 1}`)).join('\n')}
${product.category ? `<p>${escapeHtml(product.category)}</p>` : ''}
${paragraphs(product.description)}
<h2>Pack sizes and prices</h2>
${packs.length
    ? `<ul>${packs.map((pack) => {
      const price = product.price * pack.multiplier * (1 - pack.discountPercent / 100);
      return `<li>${pack.label}: ${rupees(price)}${pack.discountPercent ? ` (${pack.discountPercent}% off)` : ''}</li>`;
    }).join('')}</ul>
<p>In stock. Free shipping on orders above ₹500.</p>`
    : '<p>Out of stock.</p>'}
${product.farmer ? `<p>Grown by ${link(`/farmer/${product.farmer.id}`, product.farmer.name)} in Idukki, Kerala.</p>` : ''}
${product.story ? `<section>\n<h2>The story</h2>\n${paragraphs(product.story)}\n</section>` : ''}
</article>`;
}

function farmerBody(farmer, productsById) {
  const grows = (farmer.products || []).map((p) => productsById.get(p.id)).filter(Boolean);
  return `<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link('/farmers', 'Our Farmers')} › ${escapeHtml(farmer.name)}</nav>
<article>
<h1>${escapeHtml(farmer.name)}, spice farmer in Idukki</h1>
${img(farmer.image, farmer.name)}
${paragraphs(farmer.about)}
${grows.length ? `<h2>Spices from ${escapeHtml(farmer.name)}</h2>\n<ul>${grows.map(productCard).join('\n')}</ul>` : ''}
</article>`;
}

// Blog content blocks as plain HTML; interactive blocks (map, quiz, timeline) are left out
function blogBlock(block) {
  switch (block.type) {
    case 'p': return `<p>${inlineText(block.text)}</p>`;
    case 'h2': return `<h2 id="${escapeHtml(block.id)}">${inlineText(block.text)}</h2>`;
    case 'quote': return `<blockquote><p>${inlineText(block.text)}</p>${block.cite ? `<cite>${escapeHtml(block.cite)}</cite>` : ''}</blockquote>`;
    case 'image': return `<figure>${img(block.src, block.alt)}${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}</figure>`;
    case 'facts': return `<dl>${(block.items || []).map((item) => `<dt>${escapeHtml(item.front)}</dt><dd>${escapeHtml(item.back)}</dd>`).join('')}</dl>`;
    default: return '';
  }
}

function blogPostBody(post) {
  return `<nav aria-label="Breadcrumb">${link('/', 'Home')} › ${link('/blog', 'Blog')} › ${escapeHtml(post.title)}</nav>
<article>
<h1>${escapeHtml(post.title)}</h1>
<p>${escapeHtml(formatPostDate(post.date))} · ${post.readMinutes} min read · ${escapeHtml(post.author)}</p>
${img(post.cover, post.coverAlt || post.title)}
<p>${inlineText(post.excerpt)}</p>
${post.blocks.map(blogBlock).filter(Boolean).join('\n')}
</article>`;
}

const postList = (posts) => `<ul>${posts.map((post) => `<li>
<h3>${link(`/blog/${post.slug}`, post.title)}</h3>
<p>${escapeHtml(formatPostDate(post.date))}</p>
<p>${inlineText(post.excerpt)}</p>
</li>`).join('\n')}</ul>`;

// ---------- build every page ----------

const startedAt = Date.now();
console.log(`prerender: loading products and farmers from ${API_URL}`);
const [products, farmers] = await Promise.all([fetchJson('/api/products'), fetchJson('/api/farmers')]);
if (!Array.isArray(products) || !Array.isArray(farmers)) throw new Error('prerender: unexpected API response');
// An empty shop almost certainly means a backend problem: better no new build than empty pages
if (products.length === 0) throw new Error('prerender: the backend returned no products');

const listed = products.filter((p) => p.slug).sort((a, b) => a.id - b.id);
const productsById = new Map(listed.map((p) => [p.id, p]));

// The empty app shell, served for every address without a ready-made page (see vercel.json)
writeFileSync(join(DIST, 'spa.html'), TEMPLATE);

const pages = [];
const add = (page) => pages.push(page);

add({
  path: '/',
  title: null,
  body: `<h1>${escapeHtml(HOME_TITLE)}</h1>
<p>${escapeHtml(DEFAULT_DESCRIPTION)}</p>
<h2>Our spices</h2>
<ul>${listed.map(productCard).join('\n')}</ul>
<h2>From the blog</h2>
${postList(sortedPosts().slice(0, 3))}`
});

add({
  path: '/shop',
  ...PAGE_META['/shop'],
  body: `<h1>${escapeHtml(PAGE_META['/shop'].title)}</h1>
<p>${escapeHtml(PAGE_META['/shop'].description)}</p>
<ul>${listed.map(productCard).join('\n')}</ul>`
});

for (const product of listed) {
  add({
    path: `/product/${product.slug}`,
    title: `Buy ${product.name} Online – Farm-Direct from Idukki`,
    description: product.description ? shortDescription(product.description) : undefined,
    image: product.images?.[0],
    type: 'product',
    jsonLd: [
      ['product-jsonld', productJsonLd(product)],
      ['breadcrumb-jsonld', breadcrumbJsonLd([['Shop', '/shop'], [product.name, `/product/${product.slug}`]])]
    ],
    body: productBody(product)
  });
}

add({
  path: '/farmers',
  ...PAGE_META['/farmers'],
  body: `<h1>${escapeHtml(PAGE_META['/farmers'].title)}</h1>
<p>${escapeHtml(PAGE_META['/farmers'].description)}</p>
<ul>${farmers.map((farmer) => `<li>
${img(farmer.image, farmer.name)}
<h2>${link(`/farmer/${farmer.id}`, farmer.name)}</h2>
<p>${escapeHtml(shortDescription(farmer.about, 200))}</p>
</li>`).join('\n')}</ul>`
});

for (const farmer of farmers) {
  add({
    path: `/farmer/${farmer.id}`,
    title: `${farmer.name}, Spice Farmer in Idukki`,
    description: farmer.about ? shortDescription(farmer.about) : undefined,
    image: farmer.image,
    type: 'profile',
    jsonLd: [['breadcrumb-jsonld', breadcrumbJsonLd([['Our Farmers', '/farmers'], [farmer.name, `/farmer/${farmer.id}`]])]],
    body: farmerBody(farmer, productsById)
  });
}

add({
  path: '/blog',
  ...PAGE_META['/blog'],
  body: `<h1>${escapeHtml(PAGE_META['/blog'].title)}</h1>
<p>${escapeHtml(PAGE_META['/blog'].description)}</p>
${postList(sortedPosts())}`
});

for (const post of BLOG_POSTS) {
  add({
    path: `/blog/${post.slug}`,
    title: post.title,
    description: post.seoDescription || shortDescription(post.excerpt),
    image: post.cover,
    type: 'article',
    jsonLd: [
      ['blogpost-jsonld', blogPostingJsonLd(post)],
      ['breadcrumb-jsonld', breadcrumbJsonLd([['Blog', '/blog'], [post.title, `/blog/${post.slug}`]])]
    ],
    body: blogPostBody(post)
  });
}

// Fixed pages: their title and description (the full text of these lives in the app)
for (const path of ['/about', '/gallery', '/contact', '/reviews', '/certifications', '/shipping-policy', '/cancellation-return', '/refund-policy', '/privacy-policy', '/terms-conditions']) {
  const { title, description } = PAGE_META[path];
  add({ path, title, description, body: `<h1>${escapeHtml(title)}</h1>\n<p>${escapeHtml(description)}</p>` });
}

for (const page of pages) renderPage(page);

console.log(`prerender: wrote ${pages.length} pages (${listed.length} products, ${farmers.length} farmers, ${BLOG_POSTS.length} blog posts) in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
