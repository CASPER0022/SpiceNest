// <img> that loads the web-sized version of a site photo (see utils/images.js) and falls back
// to the original if that version is missing. size="thumb" (600 px) for cards, tiles and
// portraits; size="web" (1600 px) for full-width banners and large photos. Other <img> props
// pass through. Outside images (e.g. Unsplash) are used as they are.
// A page's own onError runs only when the original photo fails too.
import { thumbSrc, webSrc } from '../utils/images';

export default function SiteImg({ src, size = 'web', onError, ...props }) {
  const resized = size === 'thumb' ? thumbSrc(src) : webSrc(src);
  return (
    <img
      src={resized}
      onError={(event) => {
        const img = event.currentTarget;
        if (resized !== src && src && img.dataset.fallback !== '1') {
          img.dataset.fallback = '1';
          img.src = src; // the resized version is missing: show the original
          return;
        }
        onError?.(event);
      }}
      {...props}
    />
  );
}
