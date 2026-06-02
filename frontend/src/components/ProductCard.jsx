import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const WEIGHT_OPTIONS = [
  { label: '100g', multiplier: 1.0, kg: 0.1, discountPercent: 0 },
  { label: '250g', multiplier: 2.5, kg: 0.25, discountPercent: 5 },
  { label: '500g', multiplier: 5.0, kg: 0.5, discountPercent: 10 },
  { label: '1kg', multiplier: 10.0, kg: 1.0, discountPercent: 15 },
];

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const [showWeightOverlay, setShowWeightOverlay] = useState(false);
  const [selectedWeightLabel, setSelectedWeightLabel] = useState('100g');
  const isOutOfStock = product.stock !== undefined && product.stock < 0.1;

  const handleOpenOverlay = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    setShowWeightOverlay(true);
  };

  const handleConfirmAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const option = WEIGHT_OPTIONS.find(o => o.label === selectedWeightLabel);
    const finalPrice = product.price * option.multiplier * (1 - option.discountPercent / 100);
    
    addToCart(product, selectedWeightLabel, finalPrice);
    toast.success(`${product.name} (${selectedWeightLabel}) added to cart!`, {
      icon: '🌶️',
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
    });
    setShowWeightOverlay(false);
  };

  return (
    <Link to={`/product/${product.id}`} className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col cursor-pointer block relative ${isOutOfStock ? 'opacity-85' : ''}`}>
      
      {/* Dynamic Weight Selection Overlay (Fills the entire card!) */}
      {showWeightOverlay && (
        <div 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} 
          className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col justify-between p-6 transition-all duration-300 animate-fadeIn"
        >
          {/* Top Close Button */}
          <div className="flex justify-end">
            <button 
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                setShowWeightOverlay(false); 
              }} 
              className="text-[11px] font-black text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wider flex items-center gap-1 select-none cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          {/* Selection Form */}
          <div className="flex flex-col items-center justify-center flex-grow py-3">
            <span className="text-xs font-bold text-gray-600 mb-2">Select Weight:</span>
            <select
              value={selectedWeightLabel}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onChange={(e) => {
                setSelectedWeightLabel(e.target.value);
              }}
              className="bg-white border border-gray-250 rounded-xl px-4 py-2 text-sm font-bold text-gray-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 w-40 shadow-sm cursor-pointer"
            >
              {WEIGHT_OPTIONS.map(opt => {
                const isOptionDisabled = product.stock !== undefined && opt.kg > product.stock;
                return (
                  <option key={opt.label} value={opt.label} disabled={isOptionDisabled}>
                    {opt.label} {isOptionDisabled ? '(Out of stock)' : ''}
                  </option>
                );
              })}
            </select>
            <span className="text-xs font-black text-emerald-600 mt-3 flex items-center gap-1">
              ✓ In stock
            </span>
          </div>

          {/* Confirm Add Button */}
          <button
            onClick={handleConfirmAddToCart}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider py-3 rounded-xl transition-all shadow-md active:scale-98 select-none cursor-pointer"
          >
            Add to Cart
          </button>
        </div>
      )}

      {/* Product Image Area */}
      <div className="relative h-48 overflow-hidden bg-gray-200 shrink-0">
        <img 
          src={(product.images && product.images[0]) || '/images/placeholder.jpg'} 
          alt={product.name} 
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isOutOfStock ? 'filter grayscale brightness-75' : ''}`} 
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1.5px] flex items-center justify-center z-10">
            <span className="bg-rose-600 text-white text-[10px] font-black tracking-widest px-4 py-2 rounded-xl shadow-lg uppercase border border-rose-500 transform scale-100">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Details Area */}
      <div className="p-5 flex flex-col flex-grow">
        <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">{product.category}</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-4 hidden md:line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between mt-auto">
          <span className="text-xl font-bold text-gray-900">₹{Math.round(product.price)}</span>
          <button 
            disabled={isOutOfStock}
            onClick={handleOpenOverlay}
            className={`rounded-full p-2 transition-colors duration-200 flex-shrink-0 relative z-10 ${
              isOutOfStock 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-emerald-100 hover:bg-emerald-600 text-emerald-700 hover:text-white'
            }`}
            title={isOutOfStock ? "Out of Stock" : "Add to Cart"}
          >
            <ShoppingCart size={20} />
          </button>
        </div>
      </div>
    </Link>
  );
}
