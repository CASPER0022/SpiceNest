import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Clock, ShoppingCart, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useViewed } from '../context/ViewedContext';

export default function MobileBottomNav() {
  const location = useLocation();
  const { cartCount, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const { viewedProducts } = useViewed();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Shop', path: '/shop', icon: ShoppingBag },
    { name: 'Viewed', path: '/viewed', icon: Clock, badge: viewedProducts.length },
    { name: 'Cart', path: '/cart', icon: ShoppingCart, onClick: () => setIsCartOpen(true), isAction: true },
    { name: 'Account', path: user ? '/profile' : '/login', icon: User },
  ];

  const isActive = (path) => {
    if (path === '/shop') {
      return location.pathname === '/shop' || location.pathname.startsWith('/product/');
    }
    return location.pathname === path;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 flex justify-around items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        
        const content = (
          <div className={`flex flex-col items-center justify-center w-full h-full gap-1 ${active ? 'text-emerald-600' : 'text-gray-500'}`}>
            <div className="relative flex items-center justify-center">
              <Icon size={22} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
              {item.name === 'Cart' && cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  {cartCount}
                </span>
              )}
              {item.name === 'Viewed' && viewedProducts.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  {viewedProducts.length}
                </span>
              )}
            </div>
            <span className={`text-[10px] leading-none font-medium tracking-tight ${active ? 'font-bold' : ''}`}>
              {item.name}
            </span>
          </div>
        );

        if (item.isAction) {
          return (
            <button 
              key={item.name} 
              onClick={item.onClick}
              className="flex-1 transition-all duration-200 active:scale-95"
            >
              {content}
            </button>
          );
        }

        return (
          <Link 
            key={item.name} 
            to={item.path} 
            className="flex-1 transition-all duration-200 active:scale-95"
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
