import { Link } from 'react-router-dom';
import usePageMeta from '../utils/usePageMeta';

// Any address that is not a page of the site. Marked "noindex" so search engines do not list
// mistyped or old addresses as pages (they used to show the home page with a 200 status).
export default function NotFound() {
  usePageMeta('Page not found', 'This page does not exist on Idukki Origins.', { noindex: true });

  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center min-h-[60vh]">
      <p className="text-sm font-extrabold uppercase tracking-widest text-emerald-600">Error 404</p>
      <h1 className="mt-3 text-4xl font-black text-gray-900 tracking-tight">This page doesn't exist</h1>
      <p className="mt-4 text-gray-600">
        The link may be old or mistyped. Our spices are still here, fresh from the farms of Idukki.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/shop" className="rounded-full bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700 transition-colors">
          Shop spices
        </Link>
        <Link to="/" className="rounded-full border border-gray-300 px-6 py-3 font-bold text-gray-700 hover:bg-gray-50 transition-colors">
          Go to the home page
        </Link>
      </div>
    </div>
  );
}
