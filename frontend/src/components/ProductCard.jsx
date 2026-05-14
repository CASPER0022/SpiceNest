import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, '100g'); // Default to 100g
    toast.success(`${product.name} added to cart!`, {
      icon: '🌶️',
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
    });
  };

  return (
    <Link to={`/product/${product.id}`} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 group flex flex-col cursor-pointer block">
      <div className="relative h-48 overflow-hidden bg-gray-200 shrink-0">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">{product.category}</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between mt-auto">
          <span className="text-xl font-bold text-gray-900">₹{product.price.toFixed(2)}</span>
          <button 
            onClick={handleAddToCart}
            className="bg-emerald-100 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-full p-2 transition-colors duration-200 flex-shrink-0 relative z-10"
            title="Add to Cart"
          >
            <ShoppingCart size={20} />
          </button>
        </div>
      </div>
    </Link>
  );
}
