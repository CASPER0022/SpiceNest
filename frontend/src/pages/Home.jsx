import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-6">
          Elevate Your <span className="text-amber-600">Cooking</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Discover our curated collection of premium, ethically sourced spices that bring authentic flavors to your kitchen.
        </p>
        <Link to="/shop" className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-8 rounded-full transition-colors duration-200">
          Shop Spices
        </Link>
      </div>
    </div>
  );
}
