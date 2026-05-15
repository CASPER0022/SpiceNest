import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, Star, Heart, Share2, Truck, ShieldCheck, Leaf, Plus, Minus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useViewed } from '../context/ViewedContext';
import toast from 'react-hot-toast';

const WEIGHT_OPTIONS = [
  { label: '100g', multiplier: 1 },
  { label: '250g', multiplier: 2.375 }, // Slight discount on bulk
  { label: '500g', multiplier: 4.625 },
  { label: '1kg', multiplier: 9.0625 },
];

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToViewed } = useViewed();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWeight, setSelectedWeight] = useState(WEIGHT_OPTIONS[0]);
  const [quantity, setQuantity] = useState(1);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetch(`${API_URL}/api/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Product not found');
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        addToViewed(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, API_URL]);

  const currentPrice = useMemo(() => {
    if (!product) return 0;
    return product.price * selectedWeight.multiplier;
  }, [product, selectedWeight]);

  const handleAddToCart = () => {
    // Add multiple times based on quantity, or adjust addToCart to accept quantity.
    // Since addToCart currently increments by 1, we can call it `quantity` times,
    // OR we can update CartContext. Wait, CartContext adds 1 by default. Let's add multiple if needed.
    // Actually, I can just call it once and then update quantity if needed, but the simplest way is a loop or update context.
    // Wait, addToCart in CartContext uses `{ ...product, cartItemId, weight, price: priceToUse, quantity: 1 }`
    // I can just add it once and then `updateQuantity` if quantity > 1.
    
    addToCart(product, selectedWeight.label, currentPrice);
    
    // Quick hack for multiple quantities since addToCart only adds 1
    if (quantity > 1) {
      // Need to find a way to update it. Since addToCart runs asynchronously with setState, 
      // it's tricky. Let's just add it 1 by 1.
      for(let i = 1; i < quantity; i++) {
         addToCart(product, selectedWeight.label, currentPrice);
      }
    }

    toast.success(`${quantity}x ${product.name} (${selectedWeight.label}) added to cart!`, {
      icon: '🛒',
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Oops!</h2>
        <p className="text-red-500 mb-8">{error || 'Product not found'}</p>
        <Link to="/shop" className="text-emerald-600 font-bold hover:underline">
          ← Back to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/shop" className="inline-flex items-center text-sm text-gray-600 hover:text-emerald-600 font-medium mb-8 transition-colors">
        <ChevronLeft size={16} className="mr-1" /> Back to Shop
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
        
        {/* Left Column: Image */}
        <div className="space-y-4">
          <div className="aspect-w-4 aspect-h-3 bg-gray-100 rounded-3xl overflow-hidden shadow-lg border border-gray-100 relative group">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          {/* Mock Thumbnails */}
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {[product.image, product.image, product.image].map((img, i) => (
              <button key={i} className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 ${i === 0 ? 'border-emerald-500' : 'border-transparent'} opacity-${i===0?'100':'70'} hover:opacity-100 transition-opacity`}>
                 <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="flex flex-col">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
              {product.category}
            </span>
            <span className="px-3 py-1 text-emerald-600 text-[10px] font-bold rounded-full uppercase tracking-wider bg-emerald-50/50">
              Organic
            </span>
            <span className="px-3 py-1 bg-gray-50 text-gray-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
              Natural
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 leading-tight">
            {product.name}
          </h1>

          <div className="flex items-center space-x-4 mb-6">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill={i < 4 ? "currentColor" : "none"} className={i < 4 ? "" : "text-gray-300"} />
              ))}
            </div>
            <span className="text-sm font-medium text-gray-500">4.9 (118 reviews)</span>
          </div>

          <div className="flex items-end space-x-4 mb-6">
            <span className="text-4xl font-black text-gray-900">₹{Math.round(currentPrice)}</span>
            <span className="text-lg text-gray-400 line-through font-medium pb-1">₹{Math.round(currentPrice * 1.1)}</span>
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded mb-1.5">10% OFF</span>
          </div>

          <p className="text-gray-600 mb-8 leading-relaxed">
            {product.description} Completely free from heavy metals, chemicals, and additives, it is a premium everyday spice that brings natural wellness and authentic flavour to your kitchen.
          </p>

          {/* Sourced By */}
          {product.farmer && (
            <div className="mb-8 p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between transition-all hover:shadow-md">
              <div className="flex items-center space-x-4">
                <img 
                  src={product.farmer.image || 'https://ui-avatars.com/api/?name=Farmer&background=10b981&color=fff&size=128'} 
                  alt={product.farmer.name} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" 
                  onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Farmer&background=10b981&color=fff&size=128' }}
                />
                <div>
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-0.5">from farmer</p>
                  <p className="text-gray-900 font-bold">{product.farmer.name}</p>
                </div>
              </div>
              <Link to={`/farmer/${product.farmer.id}`} className="text-sm bg-white border border-emerald-200 text-emerald-700 font-bold py-2 px-4 rounded-xl hover:bg-emerald-600 hover:text-white transition-colors">
                View Profile
              </Link>
            </div>
          )}

          {/* Weight Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Select Weight</h3>
            <div className="flex flex-wrap gap-2">
              {WEIGHT_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  onClick={() => setSelectedWeight(option)}
                  className={`flex flex-col items-center justify-center w-14 sm:w-16 py-1.5 border rounded-2xl transition-all ${
                    selectedWeight.label === option.label 
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800' 
                      : 'border-gray-200 text-gray-600 hover:border-emerald-300'
                  }`}
                >
                  <span className="font-bold text-sm">{option.label}</span>
                  <span className="text-[10px] opacity-80">₹{Math.round(product.price * option.multiplier)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider opacity-60">Quantity</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 px-4 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors border-r border-gray-100"
                >
                  <Minus size={18} strokeWidth={2.5} />
                </button>
                <div className="w-12 text-center font-black text-gray-900 text-lg">
                  {quantity}
                </div>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 px-4 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors border-l border-gray-100"
                >
                  <Plus size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button 
              onClick={handleAddToCart}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-emerald-700/20 active:scale-[0.98]"
            >
              <ShoppingCart size={18} className="mr-2" /> Add to Cart
            </button>
            <button 
              onClick={handleBuyNow}
              className="bg-white hover:bg-gray-50 text-emerald-700 border border-gray-200 font-bold py-4 px-4 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-[0.98]"
            >
              <span className="mr-2 text-emerald-500">⚡</span> Buy Now
            </button>
          </div>

          {/* Meta Actions */}
          <div className="grid grid-cols-2 gap-3 mb-8">
             <button className="flex items-center justify-center py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
               <Heart size={18} className="mr-2 text-gray-400" /> Add to Wishlist
             </button>
             <button className="flex items-center justify-center py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
               <Share2 size={18} className="mr-2 text-gray-400" /> Share
             </button>
          </div>

          {/* Trust Badges */}
          <div className="space-y-2 mb-10">
            <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-100/50">
              <div className="flex items-center text-sm text-gray-700 font-semibold">
                <Truck size={18} className="text-emerald-600 mr-3 shrink-0" />
                <span>Free delivery on orders over ₹500</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-100/50">
              <div className="flex items-center text-sm text-gray-700 font-semibold">
                <ShieldCheck size={18} className="text-emerald-600 mr-3 shrink-0" />
                <span>100% quality guarantee</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-100/50">
              <div className="flex items-center text-sm text-gray-700 font-semibold">
                <Leaf size={18} className="text-emerald-600 mr-3 shrink-0" />
                <span>Certified organic product</span>
              </div>
              <span className="text-gray-400 text-xs">→</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
