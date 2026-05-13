import { Link, useNavigate } from 'react-router-dom';
import { X, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartDrawer() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, isCartOpen, setIsCartOpen, clearCart } = useCart();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    navigate('/cart');
  };

  const amountAwayFromFreeDelivery = Math.max(0, 500 - cartTotal);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-[70] flex flex-col transform transition-transform duration-300 translate-x-0">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center text-gray-900">
            <ShoppingCart size={24} className="mr-3 text-gray-900" />
            <h2 className="text-xl font-bold">Shopping Cart</h2>
          </div>
          <button 
            onClick={() => setIsCartOpen(false)}
            className="text-gray-400 hover:text-gray-900 transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* Free Delivery Bar */}
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 text-sm">
          {amountAwayFromFreeDelivery > 0 ? (
            <>
              <p className="text-gray-600 mb-2">Add <span className="font-bold text-gray-900">₹{amountAwayFromFreeDelivery.toFixed(2)}</span> more for <span className="font-bold text-gray-900">Free Delivery</span></p>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (cartTotal / 500) * 100)}%` }}
                ></div>
              </div>
            </>
          ) : (
            <p className="text-emerald-600 font-bold flex items-center justify-center">
              🎉 You got Free Delivery!
            </p>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-5">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <ShoppingCart size={48} className="mb-4 text-gray-300" />
              <p className="font-medium text-lg">Your cart is empty.</p>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="mt-4 text-emerald-600 font-bold hover:underline"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-gray-500 font-medium">{cartItems.length} item{cartItems.length > 1 ? 's' : ''} in your cart</p>
              <ul className="space-y-6">
                {cartItems.map((item) => {
                  const itemId = item.cartItemId || item.id;
                  return (
                  <li key={itemId} className="flex gap-4">
                    <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-xl border border-gray-100" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 leading-tight mb-1">{item.name}</h3>
                        <p className="text-xs text-gray-500">{item.weight || '100g'}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-gray-200 rounded-md bg-white">
                          <button onClick={() => updateQuantity(itemId, item.quantity - 1)} className="p-1 hover:bg-gray-100 text-gray-600"><Minus size={14} /></button>
                          <span className="w-8 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                          <button onClick={() => updateQuantity(itemId, item.quantity + 1)} className="p-1 hover:bg-gray-100 text-gray-600"><Plus size={14} /></button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900">₹{item.price.toFixed(2)}</span>
                          <button onClick={() => removeFromCart(itemId)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                )})}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="p-5 border-t border-gray-100 bg-white">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600 font-medium text-lg">Subtotal</span>
              <span className="text-2xl font-black text-gray-900">₹{cartTotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500 text-center mb-4">
              Inclusive of all taxes. Shipping calculated at checkout.
            </p>
            
            <button 
              onClick={() => setIsCartOpen(false)}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl flex justify-center items-center mb-3 transition-colors shadow-sm"
            >
              Add more products
            </button>
            <button 
              onClick={handleProceedToCheckout}
              className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 font-bold py-3.5 px-4 rounded-xl flex justify-center items-center transition-colors shadow-sm mb-4"
            >
              Proceed to Checkout
            </button>
            
            <button onClick={clearCart} className="w-full text-center text-sm font-medium text-gray-500 hover:text-red-500 transition-colors">
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}
