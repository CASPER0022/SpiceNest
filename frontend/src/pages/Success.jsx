import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

export default function Success() {
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear the cart when the user successfully completes a payment
    clearCart();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-32 px-4">
      <CheckCircle size={80} className="text-green-500 mb-6" />
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Payment Successful! 🎉</h1>
      <p className="text-xl text-gray-600 mb-8 text-center max-w-lg">
        Thank you for your order. Your premium spices are being prepared and will be shipped to you soon!
      </p>
      <Link to="/shop" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-full transition-colors duration-200">
        Continue Shopping
      </Link>
    </div>
  );
}
