import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ViewedProvider } from './context/ViewedContext';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import CartDrawer from './components/CartDrawer';
import Footer from './components/Footer';
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
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ViewedProvider>
          <Router>
            <AppLayout />
          </Router>
        </ViewedProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
