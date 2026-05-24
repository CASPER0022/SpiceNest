import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ViewedProvider } from './context/ViewedContext';
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
import Viewed from './pages/Viewed';
import FarmerProfile from './pages/FarmerProfile';
import Farmers from './pages/Farmers';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Orders from './pages/Orders';
import Dashboard from './pages/Dashboard';

// Main App Layout component to handle routing logic like dynamic padding
function AppLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

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
          <Route path="/viewed" element={<Viewed />} />
          <Route path="/farmer/:id" element={<FarmerProfile />} />
          <Route path="/farmers" element={<Farmers />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
      <Footer />
      <MobileBottomNav />

      {/* Floating WhatsApp Support Button */}
      <style>{`
        @keyframes floatUpDown {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        .animate-float-slow {
          animation: floatUpDown 3s ease-in-out infinite;
        }
      `}</style>
      <a
        href="https://wa.me/918921663449"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 md:bottom-8 right-6 md:right-8 z-50 w-14 h-14 rounded-full bg-[#25D366] shadow-[0_4px_16px_rgba(37,211,102,0.4)] flex items-center justify-center animate-float-slow transition-all duration-300 hover:scale-110 hover:shadow-[0_6px_20px_rgba(37,211,102,0.6)] cursor-pointer group border border-white/10"
        aria-label="Contact support on WhatsApp"
      >
        <svg 
          className="w-7 h-7 text-white fill-current transition-transform duration-300 group-hover:rotate-12" 
          viewBox="0 0 24 24"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.864-9.83.002-2.623-1.01-5.092-2.855-6.941C16.634 3.99 14.161 2.972 11.532 2.97c-5.441 0-9.868 4.414-9.872 9.831-.001 1.745.457 3.447 1.328 4.965l-.995 3.633 3.731-.977zm11.758-6.973c-.279-.139-1.653-.815-1.909-.908-.256-.093-.443-.139-.629.139-.186.278-.72.908-.883 1.093-.163.186-.326.208-.605.069-.278-.139-1.178-.434-2.244-1.385-.829-.739-1.39-1.653-1.552-1.932-.163-.279-.017-.429.122-.568.125-.125.279-.326.418-.487.14-.161.186-.279.279-.465.093-.186.047-.348-.023-.487-.07-.139-.629-1.517-.862-2.073-.227-.547-.46-.472-.63-.481-.162-.008-.348-.01-.534-.01-.186 0-.488.07-.743.348-.256.279-.976.953-.976 2.327 0 1.373.999 2.7.1.139.113.278 1.037 1.583 2.511 2.223.351.152.624.244.838.312.355.112.678.096.933.058.285-.042.909-.371 1.037-1.029.128-.658.128-1.222.089-1.339-.039-.117-.156-.183-.434-.323z" />
        </svg>
      </a>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ViewedProvider>
          <Router>
            <ScrollToTop />
            <AppLayout />
          </Router>
        </ViewedProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
