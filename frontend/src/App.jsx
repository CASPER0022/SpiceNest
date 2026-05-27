import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ViewedProvider } from './context/ViewedContext';
import { WishlistProvider } from './context/WishlistContext';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import CartDrawer from './components/CartDrawer';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Success from './pages/Success';
import Profile from './pages/Profile';
import Wishlist from './pages/Wishlist';
import FarmerProfile from './pages/FarmerProfile';
import Farmers from './pages/Farmers';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Orders from './pages/Orders';
import Dashboard from './pages/Dashboard';
import TrackOrder from './pages/TrackOrder';

// Main App Layout component to handle routing logic like dynamic padding
function AppLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    // Show initially after 3 seconds
    const initialTimeout = setTimeout(() => {
      setShowBubble(true);
      // Hide after 3.5 seconds
      setTimeout(() => setShowBubble(false), 3500);
    }, 3000);

    // Cycle every 10 seconds
    const interval = setInterval(() => {
      setShowBubble(true);
      // Hide after 3.5 seconds
      setTimeout(() => setShowBubble(false), 3500);
    }, 10000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans text-gray-900">
      <Navbar />
      <CartDrawer />
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      {/* If it's not the home page, add top padding to account for the fixed navbar */}
      <main className={`flex-grow ${!isHome ? 'pt-20' : ''} pb-16 md:pb-0`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/success" element={<Success />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/farmer/:id" element={<FarmerProfile />} />
          <Route path="/farmers" element={<Farmers />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/track-order" element={<TrackOrder />} />
        </Routes>
      </main>
      <Footer />
      <MobileBottomNav />

      {/* Floating WhatsApp Support Button with Comic Book Speech Bubble */}
      <style>{`
        @keyframes floatUpDown {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        .animate-float-slow {
          animation: floatUpDown 3s ease-in-out infinite;
        }
        
        .comic-bubble {
          font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', sans-serif;
          filter: drop-shadow(4px 4px 0px #000);
        }
      `}</style>
      <div className="fixed bottom-20 md:bottom-8 right-6 md:right-8 z-50 flex flex-col items-center">
        {/* Comic speech bubble */}
        {showBubble && (
          <div className="absolute bottom-16 mb-2 transition-all duration-300 animate-bounce scale-100 origin-bottom">
            <div className="comic-bubble bg-white border-[3px] border-black text-black px-4 py-2 rounded-[20px] font-black text-xs tracking-wider uppercase text-center relative whitespace-nowrap rotate-[-3deg] shadow-sm">
              need hellp??
              {/* Little pointer tail */}
              <div className="absolute -bottom-3 right-6 w-4 h-4 bg-white border-r-[3px] border-b-[3px] border-black rotate-[45deg]" />
            </div>
          </div>
        )}
        
        <a
          href="https://wa.me/918921663449"
          target="_blank"
          rel="noopener noreferrer"
          className="w-14 h-14 rounded-full bg-[#25D366] shadow-[0_4px_16px_rgba(37,211,102,0.4)] flex items-center justify-center animate-float-slow transition-all duration-300 hover:scale-110 hover:shadow-[0_6px_20px_rgba(37,211,102,0.6)] cursor-pointer group border border-white/10"
          aria-label="Contact support on WhatsApp"
        >
          <svg 
            className="w-7 h-7 text-white fill-current transition-transform duration-300 group-hover:rotate-12" 
            viewBox="0 0 24 24"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.454 5.709 1.455h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <ViewedProvider>
            <Router>
              <ScrollToTop />
              <AppLayout />
            </Router>
          </ViewedProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
