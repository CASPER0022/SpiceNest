import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, MapPin, Check, Edit2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const AVAILABLE_COUPONS = [
  { code: 'STARTER', discount: 70, description: '₹70 off on your first premium spice purchase!' },
  { code: 'SPICE50', discount: 50, description: '₹50 off on our organic Western Ghats spices!' }
];

export default function Cart() {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
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

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code: 'STARTER', discount: 70 }
  const [couponError, setCouponError] = useState('');

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
      toast.error('Please fill in all required address fields.', {
        style: { borderRadius: '10px', background: '#333', color: '#fff' }
      });
      return false;
    }
    
    const addressString = JSON.stringify(address);
    
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Your session has expired. Please log in again.', {
        style: { borderRadius: '10px', background: '#333', color: '#fff' }
      });
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
      toast.error('Failed to save address: ' + error.message, {
        style: { borderRadius: '10px', background: '#333', color: '#fff' }
      });
      return false;
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleCheckout = async () => {
    // 1. Validate Address Completion
    const required = ['fullName', 'mobileNumber', 'email', 'pincode', 'houseNo', 'area', 'city', 'state'];
    const isComplete = required.every(field => address[field]?.trim());

    if (!isComplete) {
       toast.error('Please complete all required shipping address fields.', {
         style: { borderRadius: '10px', background: '#333', color: '#fff' }
       });
       setIsEditingAddress(true);
       return;
    }

    // 2. Must save address if currently editing and user is logged in
    if (isEditingAddress && user) {
      const saved = await handleSaveAddress();
      if (!saved) return; 
    }

    // 3. Final validation check
    if (!address.houseNo) {
       toast.error('A shipping address is required to proceed.', {
         style: { borderRadius: '10px', background: '#333', color: '#fff' }
       });
       setIsEditingAddress(true);
       return;
    }

    // 4. Initiate Razorpay Checkout
    setIsProcessing(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Could not load Razorpay payment helper script.');
      }

      const res = await fetch(`${API_URL}/api/payment/create-razorpay-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: cartItems,
          userId: user ? user.id : null,
          address: JSON.stringify(address), // Use the fresh local state!
          discount: appliedCoupon ? appliedCoupon.discount : 0 // Pass the discount amount
        }),
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      // Open Razorpay Checkout modal
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'SpiceNest',
        description: 'Premium Farm-to-Table Spices',
        image: '/images/logo.png',
        order_id: data.orderId,
        handler: async function (response) {
          setIsProcessing(true);
          try {
            const confirmRes = await fetch(`${API_URL}/api/payment/confirm-razorpay-order`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                items: cartItems,
                userId: user ? user.id : null,
                address: JSON.stringify(address),
                discount: appliedCoupon ? appliedCoupon.discount : 0
              })
            });

            const confirmData = await confirmRes.json();
            if (!confirmRes.ok || confirmData.error) {
              throw new Error(confirmData.error || 'Payment verification failed.');
            }

            clearCart();
            navigate('/success', { state: { order: confirmData.order } });
          } catch (err) {
            toast.error('Payment Verification Failed: ' + err.message, {
              duration: 6000,
              style: { borderRadius: '10px', background: '#333', color: '#fff' }
            });
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: address.fullName,
          email: address.email,
          contact: address.mobileNumber
        },
        notes: {
          address: data.addressWithIp
        },
        theme: {
          color: '#059669' // Emerald Green brand color
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } catch (error) {
      console.error(error);
      toast.error('Checkout Failed: ' + error.message, {
        duration: 5000,
        style: { borderRadius: '10px', background: '#333', color: '#fff' }
      });
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
        <div className="flex-grow space-y-6">
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
            <ul className="divide-y divide-gray-100">
              {cartItems.map((item) => {
                const itemId = item.cartItemId || item.id;
                return (
                <li key={itemId} className="p-6 flex flex-col sm:flex-row sm:items-center">
                  <img src={item.images ? item.images[0] : item.image} alt={item.name} className="w-20 h-20 object-cover rounded-xl mb-4 sm:mb-0 shadow-sm" />
                  <div className="sm:ml-6 flex-grow mb-4 sm:mb-0">
                    <h3 className="text-lg font-bold text-gray-900">{item.name} <span className="text-sm text-gray-500 font-normal">({item.weight || '100g'})</span></h3>
                    <p className="text-emerald-600 font-bold">₹{Math.round(item.price)}</p>
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

          {/* Coupon Code Section */}
          <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-md">
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider opacity-70">Have a Coupon?</h3>
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-emerald-100 text-emerald-800 p-3 rounded-xl text-sm font-black border border-emerald-200">
                <span>🎉 Coupon Applied: {appliedCoupon.code} (-₹{appliedCoupon.discount})</span>
                <button 
                  onClick={() => setAppliedCoupon(null)} 
                  className="text-xs bg-emerald-200 hover:bg-emerald-300 text-emerald-950 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Remove Coupon
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    placeholder="Enter code (e.g. STARTER)"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      setCouponError('');
                    }}
                    className="flex-grow p-3 border border-gray-300 rounded-xl text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => {
                      const matched = AVAILABLE_COUPONS.find(c => c.code === couponCode.trim().toUpperCase());
                      if (matched) {
                        setAppliedCoupon(matched);
                        setCouponCode('');
                        setCouponError('');
                      } else if (!couponCode.trim()) {
                        setCouponError('Please enter a coupon code.');
                      } else {
                        setCouponError('Invalid coupon code.');
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-sm cursor-pointer transition-colors shadow-md shadow-emerald-600/10"
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-xs text-red-500 font-bold">{couponError}</p>}
                
                {/* Available Coupons list (Zomato/Swiggy style) */}
                <div className="pt-4 border-t border-gray-150">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Available Coupons</h4>
                  <div className="space-y-3">
                    {AVAILABLE_COUPONS.map((coupon) => (
                      <div 
                        key={coupon.code} 
                        className="flex items-center justify-between p-3.5 bg-emerald-50/20 border border-dashed border-emerald-200 rounded-2xl hover:bg-emerald-50/40 transition-all duration-200 group"
                      >
                        <div className="space-y-1">
                          <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-widest px-2.5 py-1 rounded-md border border-emerald-250 uppercase">
                            {coupon.code}
                          </span>
                          <p className="text-xs text-gray-500 font-bold leading-relaxed pr-4">{coupon.description}</p>
                        </div>
                        <button
                          onClick={() => {
                            setAppliedCoupon(coupon);
                            setCouponCode('');
                            setCouponError('');
                          }}
                          className="text-xs font-black text-emerald-700 hover:text-emerald-50 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-600 border border-emerald-200 hover:border-transparent py-2 px-5 rounded-xl cursor-pointer transition-all duration-200 shrink-0 shadow-sm hover:shadow-md"
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
                {!isEditingAddress && (
                  <button onClick={() => setIsEditingAddress(true)} className="text-emerald-600 hover:text-emerald-700 text-sm font-bold flex items-center">
                    <Edit2 size={14} className="mr-1" /> Edit
                  </button>
                )}
              </div>

              {isEditingAddress ? (
                <div className="space-y-4">
                  {!user && (
                    <div className="mb-4 text-xs text-gray-600 bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-xl">
                      <p className="font-bold text-emerald-800 mb-1">Checking out as a Guest</p>
                      <p className="mb-2 leading-relaxed">Save addresses and track orders in real time by logging in.</p>
                      <Link to="/login?redirect=cart" className="text-emerald-700 font-black hover:underline">
                        Login or Create Account →
                      </Link>
                    </div>
                  )}
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
                    onClick={user ? handleSaveAddress : () => {
                      const required = ['fullName', 'mobileNumber', 'email', 'pincode', 'houseNo', 'area', 'city', 'state'];
                      const missing = required.filter(field => !address[field]?.trim());
                      
                      if (missing.length > 0) {
                        toast.error('Please fill in all required address fields.', {
                          style: { borderRadius: '10px', background: '#333', color: '#fff' }
                        });
                        return;
                      }
                      setIsEditingAddress(false);
                    }}
                    disabled={isSavingAddress}
                    className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-md"
                  >
                    {isSavingAddress ? 'Saving...' : <><Check size={16} className="mr-2" /> {user ? 'Save & Deliver Here' : 'Use this Address'}</>}
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
            {(() => {
              const discountedSubtotal = Math.max(0, cartTotal - (appliedCoupon ? appliedCoupon.discount : 0));
              // Calculate exact 5% inclusive GST of the discounted subtotal, rounded to nearest integer
              const gstAmount = Math.round(discountedSubtotal * 0.05);
              const shippingCharges = cartTotal < 500 ? 100 : 0;
              const finalTotal = Math.round(discountedSubtotal + shippingCharges);

              return (
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Subtotal</span>
                    <span>₹{Math.round(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Shipping</span>
                    <span>{shippingCharges > 0 ? `₹${Math.round(shippingCharges)}` : 'Free'}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-emerald-600 font-black">
                      <span>Discount ({appliedCoupon.code})</span>
                      <span>-₹{Math.round(appliedCoupon.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-400 text-xs italic">
                    <span>Includes GST (5%)</span>
                    <span>₹{gstAmount}</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between items-end">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-3xl font-black text-emerald-600">
                      ₹{finalTotal}
                    </span>
                  </div>
                </div>
              );
            })()}

            <button 
              onClick={handleCheckout} 
              disabled={isProcessing || isSavingAddress}
              className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center transition-transform duration-200 transform hover:scale-[1.02] shadow-lg ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isProcessing ? 'Connecting...' : (
                <>
                  {!user ? 'Checkout as Guest' : 'Proceed to Payment'} 
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
