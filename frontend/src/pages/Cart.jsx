import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, MapPin, Check, Edit2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { useState, useEffect } from 'react';

// Use a dummy key for testing, replace with real Publishable Key later!
const stripePromise = loadStripe('pk_test_TYooMQauvdEDq54NiTphI7jx');

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal } = useCart();
  const { user, updateAddress } = useAuth();
  const navigate = useNavigate();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [address, setAddress] = useState({
    fullName: '',
    mobileNumber: '',
    pincode: '',
    houseNo: '',
    area: '',
    landmark: '',
    city: '',
    state: '',
    email: ''
  });
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Initialize address state when user loads
  useEffect(() => {
    if (user?.address) {
      try {
        const parsed = JSON.parse(user.address);
        if (parsed && typeof parsed === 'object') {
          setAddress(prev => ({ ...prev, ...parsed }));
          
          // Check if the saved address is complete
          const required = ['fullName', 'mobileNumber', 'email', 'pincode', 'houseNo', 'area', 'city', 'state'];
          const isComplete = required.every(field => parsed[field]?.trim());
          setIsEditingAddress(!isComplete);
        } else {
          setAddress(prev => ({ ...prev, houseNo: user.address }));
          setIsEditingAddress(true);
        }
      } catch (e) {
        setAddress(prev => ({ ...prev, houseNo: user.address }));
        setIsEditingAddress(true);
      }
    } else {
      setIsEditingAddress(true);
    }
  }, [user]);

  const handleSaveAddress = async () => {
    const required = ['fullName', 'mobileNumber', 'email', 'pincode', 'houseNo', 'area', 'city', 'state'];
    const missing = required.filter(field => !address[field]?.trim());
    
    if (missing.length > 0) {
      alert(`Please fill in all required fields.`);
      return false;
    }
    
    const addressString = JSON.stringify(address);
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Your session has expired. Please log in again.");
      navigate('/login');
      return false;
    }

    setIsSavingAddress(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/update-address`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ address: addressString }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      updateAddress(addressString); // Update the React context and localStorage
      setIsEditingAddress(false);
      return true;
    } catch (error) {
      alert("Failed to save address: " + error.message);
      return false;
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleCheckout = async () => {
    // 1. Must be logged in
    if (!user) {
      navigate('/login');
      return;
    }

    // 2. Validate Address Completion
    const required = ['fullName', 'mobileNumber', 'email', 'pincode', 'houseNo', 'area', 'city', 'state'];
    const isComplete = required.every(field => address[field]?.trim());

    if (!isComplete) {
       alert("Please complete all required shipping address fields.");
       setIsEditingAddress(true);
       return;
    }

    // 3. Must save address if currently editing
    if (isEditingAddress) {
      const saved = await handleSaveAddress();
      if (!saved) return; 
    }

    // 4. Final validation check
    if (!user.address && !address.houseNo) {
       alert("A shipping address is required to proceed.");
       setIsEditingAddress(true);
       return;
    }

    // 5. Initiate Stripe Checkout
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/payment/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: cartItems,
          userId: user.id,
          address: JSON.stringify(address) // Use the fresh local state!
        }),
      });
      
      const session = await res.json();
      if (session.error) throw new Error(session.error);
      
      // Redirect to Stripe checkout
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
        <Link to="/shop" className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-full transition-colors duration-200">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Cart Items */}
        <div className="flex-grow">
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
            <ul className="divide-y divide-gray-100">
              {cartItems.map((item) => {
                const itemId = item.cartItemId || item.id;
                return (
                <li key={itemId} className="p-6 flex flex-col sm:flex-row sm:items-center">
                  <img src={item.images ? item.images[0] : item.image} alt={item.name} className="w-20 h-20 object-cover rounded-xl mb-4 sm:mb-0 shadow-sm" />
                  <div className="sm:ml-6 flex-grow mb-4 sm:mb-0">
                    <h3 className="text-lg font-bold text-gray-900">{item.name} <span className="text-sm text-gray-500 font-normal">({item.weight || '100g'})</span></h3>
                    <p className="text-emerald-600 font-bold">₹{item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <button onClick={() => updateQuantity(itemId, item.quantity - 1)} className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"><Minus size={16} /></button>
                      <span className="px-4 font-bold text-gray-900">{item.quantity}</span>
                      <button onClick={() => updateQuantity(itemId, item.quantity + 1)} className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"><Plus size={16} /></button>
                    </div>
                    <button onClick={() => removeFromCart(itemId)} className="text-red-500 hover:text-red-600 p-2 transition-colors bg-red-50 rounded-lg">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </li>
              )})}
            </ul>
          </div>
        </div>

        {/* Checkout & Address Column */}
        <div className="lg:w-[400px] shrink-0">
          <div className="bg-white shadow-xl rounded-2xl p-6 border border-gray-100 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
            
            {/* Address Collection Section */}
            <div className="mb-8 border border-gray-100 rounded-xl p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 flex items-center">
                  <MapPin size={18} className="mr-2 text-emerald-600" />
                  Shipping Address
                </h3>
                {!isEditingAddress && user?.address && (
                  <button onClick={() => setIsEditingAddress(true)} className="text-emerald-600 hover:text-emerald-700 text-sm font-bold flex items-center">
                    <Edit2 size={14} className="mr-1" /> Edit
                  </button>
                )}
              </div>

              {!user ? (
                <div className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                  <p>You must log in to add a shipping address and complete your purchase.</p>
                  <Link to="/login" className="text-emerald-600 font-bold mt-2 inline-block">Login or Create Account →</Link>
                </div>
              ) : isEditingAddress ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      type="text"
                      placeholder="Full Name (Required)"
                      value={address.fullName}
                      onChange={(e) => setAddress({...address, fullName: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Mobile Number (Required)"
                      value={address.mobileNumber}
                      onChange={(e) => setAddress({...address, mobileNumber: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <input
                      type="email"
                      placeholder="Email Address (Required for Confirmation)"
                      value={address.email}
                      onChange={(e) => setAddress({...address, email: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Pincode"
                        value={address.pincode}
                        onChange={(e) => setAddress({...address, pincode: e.target.value})}
                        className="p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="City"
                        value={address.city}
                        onChange={(e) => setAddress({...address, city: e.target.value})}
                        className="p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="State (Required)"
                      value={address.state}
                      onChange={(e) => setAddress({...address, state: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="House No., Building Name (Required)"
                      value={address.houseNo}
                      onChange={(e) => setAddress({...address, houseNo: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Road name, Area, Colony (Required)"
                      value={address.area}
                      onChange={(e) => setAddress({...address, area: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Landmark (Optional)"
                      value={address.landmark}
                      onChange={(e) => setAddress({...address, landmark: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  
                  <button 
                    onClick={handleSaveAddress}
                    disabled={isSavingAddress}
                    className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-md"
                  >
                    {isSavingAddress ? 'Saving...' : <><Check size={16} className="mr-2" /> Save & Deliver Here</>}
                  </button>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-xl border border-emerald-100 text-sm text-gray-700 shadow-sm">
                  <p className="font-bold text-gray-900 mb-1">{address.fullName}</p>
                  <p className="mb-1">{address.houseNo}, {address.area}</p>
                  {address.landmark && <p className="mb-1 text-gray-500 text-xs">Landmark: {address.landmark}</p>}
                  <p className="mb-2">{address.city}, {address.state} - {address.pincode}</p>
                  <p className="font-medium text-gray-900 flex items-center mb-1">
                    <span className="text-gray-500 font-normal mr-2">Phone:</span> {address.mobileNumber}
                  </p>
                  <p className="font-medium text-gray-900 flex items-center">
                    <span className="text-gray-500 font-normal mr-2">Email:</span> {address.email}
                  </p>
                </div>
              )}
            </div>

            {/* Total Section */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600 font-medium">
                <span>Subtotal</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 font-medium">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="border-t pt-4 flex justify-between items-end">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-3xl font-black text-emerald-600">₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button 
              onClick={handleCheckout} 
              disabled={isProcessing || isSavingAddress}
              className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center transition-transform duration-200 transform hover:scale-[1.02] shadow-lg ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isProcessing ? 'Connecting...' : (
                <>
                  {!user ? 'Login to Checkout' : 'Proceed to Payment'} 
                  <ArrowRight size={20} className="ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
