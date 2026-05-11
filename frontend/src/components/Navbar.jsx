import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Navbar() {
  const { cartCount } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-2xl font-bold text-amber-600">SpiceNest</Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden sm:ml-6 sm:flex sm:space-x-8 items-center">
            <Link to="/" className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-amber-500 text-sm font-medium transition-colors">Home</Link>
            <Link to="/shop" className="text-gray-500 hover:text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-amber-500 text-sm font-medium transition-colors">Shop</Link>
            <Link to="/cart" className="text-gray-500 hover:text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-amber-500 text-sm font-medium relative mr-4 transition-colors">
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
                <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors">Logout</button>
              </div>
            ) : (
              <div className="flex items-center space-x-4 border-l pl-4 border-gray-200">
                <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors">Login</Link>
                <Link to="/signup" className="text-sm font-medium bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 shadow-sm transition-colors">Sign Up</Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center sm:hidden">
            <Link to="/cart" className="text-gray-500 hover:text-gray-900 mr-4 relative">
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-amber-600 text-white rounded-full text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-500 hover:text-gray-900 focus:outline-none"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isMenuOpen && (
        <div className="sm:hidden border-t border-gray-200 bg-white">
          <div className="pt-2 pb-3 space-y-1">
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="block pl-3 pr-4 py-2 border-l-4 border-transparent hover:bg-amber-50 hover:border-amber-500 text-base font-medium text-gray-600 transition-colors">Home</Link>
            <Link to="/shop" onClick={() => setIsMenuOpen(false)} className="block pl-3 pr-4 py-2 border-l-4 border-transparent hover:bg-amber-50 hover:border-amber-500 text-base font-medium text-gray-600 transition-colors">Shop</Link>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            {user ? (
              <div className="px-4">
                <div className="flex items-center mb-3 text-gray-700">
                  <User size={20} className="mr-2" />
                  <span className="text-base font-medium">{user.name}</span>
                </div>
                <button onClick={handleLogout} className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-red-600 hover:bg-red-50 hover:border-red-500 transition-colors">
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block pl-3 pr-4 py-2 border-l-4 border-transparent hover:bg-amber-50 hover:border-amber-500 text-base font-medium text-gray-600 transition-colors">Login</Link>
                <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="block pl-3 pr-4 py-2 border-l-4 border-transparent hover:bg-amber-50 hover:border-amber-500 text-base font-medium text-amber-600 transition-colors">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
