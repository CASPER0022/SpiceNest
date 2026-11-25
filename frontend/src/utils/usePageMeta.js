import { useEffect } from 'react';

const SITE = 'Idukki Origins';
const SITE_URL = 'https://www.idukkiorigins.com';
const HOME_TITLE = `${SITE} | Farm-Direct Spices from Idukki, Kerala`;
// Under ~155 characters, so Google shows it in full
export const DEFAULT_DESCRIPTION =
  'Farm-direct whole spices from Idukki, Kerala: black pepper, cardamom, cloves, nutmeg and mace, bought straight from our farmers. Free shipping over ₹500.';
// Picture shown when a page is shared on WhatsApp, Facebook, Instagram or X
export const DEFAULT_SHARE_IMAGE = '/images/share/idukki-origins.jpg';

// Text cut to fit a search-result description (~155 characters), at a word boundary
export function shortDescription(text, max = 155) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,.;:–-]+$/, '')}…`;
}

const absoluteUrl = (path) => (/^https?:\/\//i.test(path) ? path : encodeURI(`${SITE_URL}/${String(path).replace(/^\/+/, '')}`));

// <meta name="..."> or <meta property="..."> tag, created when missing
function setMeta(attribute, key, content) {
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

const removeMeta = (attribute, key) => document.head.querySelector(`meta[${attribute}="${key}"]`)?.remove();

// Each page names itself as the original, on the www domain and without query strings
function setCanonical(url) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

// Sets the browser tab title, the description search engines show, and the link preview used
// when the page is shared (Open Graph / Twitter tags).
// title: the page's own name ("Shop"); the site name is added. Pass null for the home page.
// options.image: picture for link previews (site path or URL); a farm photo by default
// options.type: 'website' (default), 'product' or 'article'
// options.noindex: keep the page out of search results (e.g. "page not found")
export default function usePageMeta(title, description = DEFAULT_DESCRIPTION, { image, type = 'website', noindex = false } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE}` : HOME_TITLE;
    const text = description || DEFAULT_DESCRIPTION;
    const url = `${SITE_URL}${window.location.pathname}`;
    const shareImage = absoluteUrl(image || DEFAULT_SHARE_IMAGE);

    document.title = fullTitle;
    setMeta('name', 'description', text);
    if (noindex) {
      setMeta('name', 'robots', 'noindex');
      document.head.querySelector('link[rel="canonical"]')?.remove();
    } else {
      removeMeta('name', 'robots');
      setCanonical(url);
    }

    setMeta('property', 'og:site_name', SITE);
    setMeta('property', 'og:title', title || HOME_TITLE);
    setMeta('property', 'og:description', text);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:image', shareImage);
    setMeta('property', 'og:locale', 'en_IN');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title || HOME_TITLE);
    setMeta('name', 'twitter:description', text);
    setMeta('name', 'twitter:image', shareImage);

    // Pages without their own title fall back to the site name, not the previous page's title
    return () => {
      document.title = SITE;
      setMeta('name', 'description', DEFAULT_DESCRIPTION);
      removeMeta('name', 'robots');
      document.head.querySelector('link[rel="canonical"]')?.remove();
    };
  }, [title, description, image, type, noindex]);
}
