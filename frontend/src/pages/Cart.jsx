import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';

// Use a dummy key for testing, replace with real Publishable Key later!
const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      // Request a checkout session from our backend
      const res = await fetch(`${API_URL}/api/payment/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartItems }),
      });
      
      const session = await res.json();
      
      if (session.error) throw new Error(session.error);
      
      // Redirect directly to Stripe's secure checkout page URL
      window.location.href = session.url;
      
    } catch (error) {
      console.error(error);
      alert('Checkout Failed: \n\n' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Your Cart is Empty</h2>
        <p className="text-gray-500 mb-8">Looks like you haven't added any spices yet.</p>
        <Link to="/shop" className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-8 rounded-full transition-colors duration-200">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-grow">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {cartItems.map((item) => (
                <li key={item.id} className="p-6 flex flex-col sm:flex-row sm:items-center">
                  <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded mb-4 sm:mb-0" />
                  <div className="sm:ml-6 flex-grow mb-4 sm:mb-0">
                    <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                    <p className="text-amber-600 font-medium">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center border rounded-lg">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 hover:bg-gray-100 text-gray-600"><Minus size={16} /></button>
                      <span className="px-4 font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 hover:bg-gray-100 text-gray-600"><Plus size={16} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 p-2">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="lg:w-96 shrink-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
            <div className="flex justify-between mb-2 text-gray-600">
              <span>Subtotal</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-4 text-gray-600">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="border-t pt-4 mb-6 flex justify-between">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-amber-600">${cartTotal.toFixed(2)}</span>
            </div>
            <button 
              onClick={handleCheckout} 
              disabled={isProcessing}
              className={`w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors duration-200 ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isProcessing ? 'Connecting to Secure Checkout...' : 'Proceed to Checkout'} <ArrowRight size={20} className="ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
