// Web-sized WebP versions of the site photos, made by frontend/scripts/make_thumbs.py:
//   thumbSrc: 600 px wide  /images/cloves/cloves-pouch.jpg -> /images/thumbs/cloves/cloves-pouch.webp
//             (shop cards, cart, portraits, gallery tiles, small banners)
//   webSrc:   1600 px wide /images/homepage/homepage-bg1.jpg -> /images/web/homepage/homepage-bg1.webp
//             (full-width banners, slideshow, photos inside articles)
// Always pair them with onThumbError(original) as the <img> onError, so a photo without a
// generated version (e.g. one just added) shows the original instead.

// Site photos in a folder under /images (not the logo, not outside links, not already a version)
const RESIZABLE = /^\/images\/(?!thumbs\/|web\/)[^?#]+\.(jpe?g|png|webp)$/i;

const versionOf = (folder) => (src) =>
  src && RESIZABLE.test(src)
    ? src.replace(/^\/images\//, `/images/${folder}/`).replace(/\.(jpe?g|png|webp)$/i, '.webp')
    : src;

export const thumbSrc = versionOf('thumbs');
export const webSrc = versionOf('web');

// onError handler: fall back from the resized version to the original photo, once
export const onThumbError = (original) => (event) => {
  const img = event.currentTarget;
  if (original && img.dataset.fallback !== '1') {
    img.dataset.fallback = '1';
    img.src = original;
  }
};
