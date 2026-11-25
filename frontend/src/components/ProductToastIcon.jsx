import { thumbSrc, onThumbError } from '../utils/images';

// Small round photo of the product for "added to cart" toasts (falls back to a leaf)
export default function ProductToastIcon({ product }) {
  const src = product?.images?.[0] || product?.image;
  if (!src) return <span aria-hidden="true">🌿</span>;
  return (
    <img
      src={thumbSrc(src)}
      onError={onThumbError(src)}
      alt=""
      aria-hidden="true"
      className="w-7 h-7 rounded-full object-cover border border-white/30 shrink-0"
    />
  );
}
