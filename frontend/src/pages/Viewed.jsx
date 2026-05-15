import { useViewed } from '../context/ViewedContext';
import { Link } from 'react-router-dom';
import { Clock, Trash2 } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function Viewed() {
  const { viewedProducts, clearViewed } = useViewed();

  if (viewedProducts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock size={32} className="text-gray-400" />
        </div>
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">No history yet</h2>
        <p className="text-gray-500 text-sm mb-8">Products you view will show up here for quick access.</p>
        <Link to="/shop" className="inline-block bg-emerald-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-transform">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Recently Viewed</h1>
          <p className="text-gray-500 text-sm mt-1">Pick up where you left off</p>
        </div>
        <button 
          onClick={clearViewed}
          className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center px-4 py-2 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
        >
          <Trash2 size={14} className="mr-2" /> Clear History
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {viewedProducts.map((product) => (
          <ProductCard key={product._id || product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
