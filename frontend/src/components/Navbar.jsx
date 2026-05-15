import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Navbar() {
  const { cartCount, setIsCartOpen } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  // Ather-style floating pill navbar with frosted glass/blur effect
  const navClasses = "fixed top-3 left-3 right-3 md:top-5 md:left-5 md:right-5 max-w-7xl mx-auto z-50 bg-white/75 backdrop-blur-md shadow-2xl rounded-2xl md:rounded-full px-2 transition-all duration-300 border border-gray-100/50";
  const textClass = "text-gray-900 hover:text-emerald-600";
  const logoClass = "text-gray-900";
  const mutedTextClass = "text-gray-600 hover:text-gray-900";
  const borderClass = "border-gray-200";

  return (
    <>
      {/* Blurred mask for the gap above the floating navbar */}
      <div className="fixed top-0 left-0 right-0 h-3 md:h-5 backdrop-blur-sm z-40 pointer-events-none" />
      
      <nav className={navClasses}>
      <div className="px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-12 md:h-13">
          <div className="flex-shrink-0 flex items-center">
            {/* Logo styling matching Ather's tracking */}
            <Link to="/" className={`text-xl md:text-2xl font-black tracking-widest uppercase transition-colors ${logoClass}`}>SpiceNest</Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:ml-6 md:flex md:space-x-8 items-center">
            <Link to="/" className={`inline-flex items-center px-1 pt-1 text-sm font-bold transition-colors ${textClass}`}>Home</Link>
            <Link to="/shop" className={`inline-flex items-center px-1 pt-1 text-sm font-bold transition-colors ${mutedTextClass}`}>Shop</Link>
            <Link to="/viewed" className={`inline-flex items-center px-1 pt-1 text-sm font-bold transition-colors ${mutedTextClass}`}>Viewed</Link>
            <button onClick={() => setIsCartOpen(true)} className={`inline-flex items-center px-1 pt-1 text-sm font-bold relative mr-4 transition-colors ${mutedTextClass}`}>
              <ShoppingCart size={20} className="mr-1" />
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-3 bg-emerald-600 text-white rounded-full text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {user ? (
              <div className={`flex items-center space-x-4 border-l pl-4 ${borderClass}`}>
                <Link to="/profile" className={`text-sm font-bold flex items-center ${textClass}`}><User size={16} className="mr-1" /> {user.name}</Link>
                <button onClick={handleLogout} className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors">Logout</button>
              </div>
            ) : (
              <div className={`flex items-center space-x-4 border-l pl-4 ${borderClass}`}>
                <Link to="/login" className={`text-sm font-bold transition-colors ${textClass}`}>Login</Link>
                <Link to="/signup" className="text-sm font-bold bg-emerald-600 text-white px-5 py-2 rounded-full hover:bg-emerald-700 shadow-md transition-all transform hover:scale-105">Sign Up</Link>
              </div>
            )}
          </div>

          <div className="flex items-center md:hidden">
            <button onClick={() => setIsCartOpen(true)} className={`mr-4 relative ${textClass}`}>
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-emerald-600 text-white rounded-full text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`focus:outline-none bg-gray-100 p-2 rounded-full transition-colors ${textClass}`}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel (Floating below the pill) */}
      {isMenuOpen && (
        <div className="md:hidden bg-white shadow-2xl absolute w-full left-0 top-[calc(100%+0.5rem)] rounded-2xl overflow-hidden border border-gray-100">
          <div className="pt-2 pb-3 space-y-1">
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="block pl-6 pr-4 py-4 text-base font-bold text-gray-900 border-b border-gray-50">Home</Link>
            <Link to="/shop" onClick={() => setIsMenuOpen(false)} className="block pl-6 pr-4 py-4 text-base font-bold text-gray-600 border-b border-gray-50">Shop</Link>
          </div>
          <div className="pt-4 pb-6 bg-gray-50/50">
            {user ? (
              <div className="px-6">
                <div className="flex items-center mb-4 text-gray-900">
                  <User size={20} className="mr-2 text-emerald-600" />
                  <span className="text-base font-black uppercase tracking-wider">{user.name}</span>
                </div>
                <button onClick={handleLogout} className="block w-full text-left py-2 text-base font-bold text-red-600">
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-4 px-6">
                <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block w-full text-center py-3 border-2 border-gray-200 rounded-xl text-base font-bold text-gray-700 bg-white shadow-sm">Login</Link>
                <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="block w-full text-center py-3 rounded-xl text-base font-bold text-white bg-emerald-600 shadow-md">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
    </>
  );
}
