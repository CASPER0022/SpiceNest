// Small (600 px WebP) versions of product photos, made by frontend/scripts/make_thumbs.py:
// /images/cloves/cloves-pouch.jpg -> /images/thumbs/cloves/cloves-pouch.webp
// Use thumbSrc() for shop cards, cart and gallery thumbnails, with onThumbError as the <img>
// onError so a photo without a thumb (e.g. a newly added one) shows the original instead.

const THUMBABLE = /^\/images\/(?!thumbs\/|blog\/|farmers\/|homepage\/)[^/]+\/[^/]+\.(jpe?g|png|webp)$/i;

export const thumbSrc = (src) =>
  src && THUMBABLE.test(src)
    ? src.replace(/^\/images\//, '/images/thumbs/').replace(/\.(jpe?g|png|webp)$/i, '.webp')
    : src;

// onError handler: fall back from the thumb to the original photo, once
export const onThumbError = (original) => (event) => {
  const img = event.currentTarget;
  if (original && img.dataset.fallback !== '1') {
    img.dataset.fallback = '1';
    img.src = original;
  }
};
