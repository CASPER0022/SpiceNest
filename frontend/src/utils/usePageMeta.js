import { useEffect } from 'react';

const SITE = 'Idukki Origins';
const SITE_URL = 'https://www.idukkiorigins.com';
export const DEFAULT_DESCRIPTION =
  'Farm-direct whole spices from the hills of Idukki, Kerala: black pepper, cardamom, cloves, nutmeg and mace, bought straight from our farmers. Free shipping above ₹500.';

function setMeta(name, content) {
  let tag = document.head.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

// Each page names itself as the original, on the www domain and without query strings
function setCanonical() {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', `${SITE_URL}${window.location.pathname}`);
}

// Sets the browser tab title and the description search engines show for this page.
// title: the page's own name ("Shop"); the site name is added. Pass null for the home page.
export default function usePageMeta(title, description = DEFAULT_DESCRIPTION) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE}` : `${SITE} | Farm-Direct Spices from Idukki, Kerala`;
    setMeta('description', description || DEFAULT_DESCRIPTION);
    setCanonical();
    // Pages without their own title fall back to the site name, not the previous page's title
    return () => {
      document.title = SITE;
      setMeta('description', DEFAULT_DESCRIPTION);
      document.head.querySelector('link[rel="canonical"]')?.remove();
    };
  }, [title, description]);
}
