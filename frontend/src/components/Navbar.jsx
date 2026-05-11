import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { cartCount } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-2xl font-bold text-amber-600">SpiceNest</Link>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:space-x-8 items-center">
            <Link to="/" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-amber-500 text-sm font-medium">Home</Link>
            <Link to="/shop" className="text-gray-500 hover:text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-amber-500 text-sm font-medium">Shop</Link>
            <Link to="/cart" className="text-gray-500 hover:text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-amber-500 text-sm font-medium relative mr-4">
              <ShoppingCart size={20} className="mr-1" />
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-3 bg-amber-600 text-white rounded-full text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center space-x-4 border-l pl-4 border-gray-200">
                <span className="text-sm font-medium text-gray-700 flex items-center"><User size={16} className="mr-1" /> {user.name}</span>
                <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:text-red-800">Logout</button>
              </div>
            ) : (
              <div className="flex items-center space-x-4 border-l pl-4 border-gray-200">
                <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-amber-600">Login</Link>
                <Link to="/signup" className="text-sm font-medium bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 shadow-sm transition-colors">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
