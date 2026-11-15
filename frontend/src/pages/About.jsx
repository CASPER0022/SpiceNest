import usePageMeta from '../utils/usePageMeta';

export default function About() {
  usePageMeta('About Us');
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-8">About Us</h1>
      <div className="prose prose-emerald max-w-none text-gray-600 leading-relaxed space-y-6">
        <p className="text-lg font-bold text-emerald-800">Welcome to Idukki Origins! 🌿</p>
        <p>We are dedicated to bringing you the finest, farm-fresh spices direct from the lush hills of Idukki, Kerala. By bypassing traditional middlemen, we ensure that our local family growers receive fair wages while delivering authentic, farm-fresh spices straight to your kitchen.</p>
        <p>Our commitment is built on sustainable, chemical-free agriculture, sun-drying techniques, and absolute direct trade transparency.</p>
      </div>
    </div>
  );
}
