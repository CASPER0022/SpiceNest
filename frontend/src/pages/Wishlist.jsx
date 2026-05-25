import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2 } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import toast from 'react-hot-toast';

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('wishlist');
    setWishlist(saved ? JSON.parse(saved) : []);
  }, []);

  const clearWishlist = () => {
    localStorage.removeItem('wishlist');
    setWishlist([]);
    window.dispatchEvent(new Event('wishlist-update'));
    toast.success('Wishlist cleared!');
  };

  if (wishlist.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100/50 shadow-inner">
          <Heart size={32} className="text-rose-500 fill-rose-500" />
        </div>
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Your Wishlist is Empty</h2>
        <p className="text-gray-500 text-sm mb-8">Save items you love here to easily purchase them later.</p>
        <Link to="/shop" className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-8 rounded-full shadow-lg shadow-emerald-600/20 active:scale-95 transition-all transform hover:scale-105">
          Start Exploring
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">My Wishlist</h1>
          <p className="text-gray-500 text-sm mt-1">Spices you loved from the farm fields</p>
        </div>
        <button 
          onClick={clearWishlist}
          className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center px-5 py-2.5 bg-red-50 rounded-full hover:bg-red-100 transition-colors cursor-pointer shadow-sm active:scale-95"
        >
          <Trash2 size={14} className="mr-2" /> Clear Wishlist
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {wishlist.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
