import { useState, useEffect } from 'react';
import { Package, Search, Calendar, MapPin, Loader2, AlertCircle, Phone, Mail, CheckCircle, Truck, ShoppingBag, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const statusTimeline = [
  { status: 'PAID', label: 'Order Paid', desc: 'Transaction approved. Spices reserved from local farm inventory.' },
  { status: 'Processing', label: 'Preparing Shipment', desc: 'Spices are being carefully sorted, weighed, and packed at the farm.' },
  { status: 'Completed', label: 'Shipped & Delivered', desc: 'Western Ghats premium spices dispatched to your doorstep!' }
];

export default function TrackOrder() {
  const { user } = useAuth();
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [searched, setSearched] = useState(false);

  const [recentOrders, setRecentOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    async function fetchRecentOrders() {
      const token = localStorage.getItem('token');
      if (user && token) {
        setLoadingOrders(true);
        try {
          const res = await fetch(`${API_URL}/api/payment/my-orders`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await res.json();
          if (res.ok) {
            setRecentOrders(data);
          }
        } catch (err) {
          console.error('Failed to load recent orders:', err);
        } finally {
          setLoadingOrders(false);
        }
      }
    }
    fetchRecentOrders();
  }, [user]);

  const trackRecentOrder = (recentOrder) => {
    setLoading(true);
    setSearched(true);
    let orderEmail = '';
    try {
      const parsed = JSON.parse(recentOrder.address);
      orderEmail = parsed.email || user?.email;
    } catch (e) {
      orderEmail = user?.email;
    }

    setOrderId(recentOrder.id.toString());
    setEmail(orderEmail || '');

    fetch(`${API_URL}/api/payment/track-order?id=${recentOrder.id}&email=${orderEmail}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOrder(data.order);
          toast.success(`Tracking Order #${recentOrder.id}! 🌿`);
          setTimeout(() => {
            const el = document.getElementById('tracking-details-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        } else {
          toast.error(data.error || 'Failed to fetch tracking details.');
        }
      })
      .catch(err => {
        console.error(err);
        toast.error('An error occurred while tracking the order.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!orderId.trim() || !email.trim()) {
      toast.error('Please enter both Order ID and Email Address.');
      return;
    }

    setLoading(true);
    setOrder(null);
    setSearched(true);

    const headers = {};
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_URL}/api/payment/track-order?id=${orderId.trim()}&email=${email.trim()}`, {
        headers
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setOrder(data.order);
        toast.success('Order tracking details fetched successfully! 🌿');
      } else {
        toast.error(data.error || 'Failed to locate order. Please check your credentials.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while tracking your order.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIndex = (currentStatus) => {
    if (currentStatus === 'PAID') return 0;
    if (currentStatus === 'Processing' || currentStatus === 'On Hold') return 1;
    if (currentStatus === 'Completed') return 2;
    return 1; // Default fallback to Processing
  };

  const parsedAddress = order ? (() => {
    try {
      return JSON.parse(order.address);
    } catch (e) {
      return {};
    }
  })() : {};

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 min-h-[80vh]">
      {/* Page Title */}
      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 mb-3">
          <Truck size={12} /> Idukki Origins Logistics
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">Track Your Spices</h1>
        <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
          Enter your transaction details below to verify checkout verification and trace farm-to-table shipping milestones.
        </p>
      </div>

      {/* Lookup Card */}
      <div className="bg-white shadow-xl rounded-3xl border border-gray-100 p-6 md:p-8 mb-12 max-w-2xl mx-auto">
        <form onSubmit={handleSearch} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Order Transaction ID</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 10024"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-2xl p-4 pl-10 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                />
                <ShoppingBag className="absolute left-3.5 top-4 text-gray-400" size={16} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Checkout Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="e.g. guest@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-2xl p-4 pl-10 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                />
                <Mail className="absolute left-3.5 top-4 text-gray-400" size={16} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider py-4 rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <>
                <Search size={16} /> Track Order Status
              </>
            )}
          </button>
        </form>
      </div>

      {/* Recent Orders Section for Logged-In Users */}
      {user && !loading && recentOrders.length > 0 && (
        <div className="bg-white shadow-xl rounded-3xl border border-gray-150 p-6 md:p-8 max-w-2xl mx-auto mb-12 animate-fadeIn">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Your Recent Purchases</h3>
          <p className="text-xs text-gray-500 font-medium mb-6">
            Click any of your recent orders below to instantly trace shipping updates.
          </p>

          <div className="space-y-3">
            {(showAllOrders ? recentOrders : recentOrders.slice(0, 4)).map((item) => {
              const statusStyles = {
                PAID: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                Processing: 'bg-blue-50 text-blue-700 border-blue-100',
                'On Hold': 'bg-gray-50 text-gray-600 border-gray-100',
                Completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                Cancelled: 'bg-red-50 text-red-700 border-red-100',
                'Pending Payment': 'bg-amber-50 text-amber-700 border-amber-100',
                Refunded: 'bg-purple-50 text-purple-700 border-purple-100',
                Failed: 'bg-rose-50 text-rose-700 border-rose-100'
              };

              return (
                <div 
                  key={item.id} 
                  onClick={() => trackRecentOrder(item)}
                  className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50/10 cursor-pointer transition-all duration-200 group shadow-sm active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-emerald-600 transition-colors shadow-inner animate-fadeIn">
                      <ShoppingBag size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-gray-800">Order #{item.id}</span>
                      <span className="text-[10px] text-gray-400 font-bold block">
                        {new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusStyles[item.status] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                      {item.status}
                    </span>
                    <span className="text-xs font-black text-gray-800">₹{item.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {recentOrders.length > 4 && (
            <button
              onClick={() => setShowAllOrders(!showAllOrders)}
              className="w-full mt-4 text-center text-xs font-black uppercase tracking-widest text-emerald-700 hover:text-emerald-800 transition-colors py-2 cursor-pointer"
            >
              {showAllOrders ? 'Show Less' : `See More (+${recentOrders.length - 4} orders)`}
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-20 animate-fadeIn">
          <Loader2 className="text-emerald-600 animate-spin mx-auto mb-4" size={48} />
          <h3 className="text-lg font-bold text-gray-900">Locating order in farmers registry...</h3>
          <p className="text-gray-500 text-sm mt-1">Verifying secure database transaction.</p>
        </div>
      )}

      {/* Searched & Not Found */}
      {searched && !loading && !order && (
        <div className="bg-red-50/50 border border-red-100 rounded-3xl p-8 text-center max-w-xl mx-auto animate-fadeIn">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-950 mb-1">Order Lookup Failed</h3>
          <p className="text-xs text-red-700 leading-relaxed max-w-md mx-auto">
            We couldn't locate any records matching that Order ID and Email combination. Please ensure you entered the exact credentials used during payment.
          </p>
        </div>
      )}

      {/* Order Tracking Display */}
      {order && !loading && (
        <div id="tracking-details-section" className="space-y-8 animate-fadeIn">
          {/* Timeline Tracking Flow */}
          <div className="bg-white shadow-xl rounded-3xl border border-gray-150 p-6 md:p-8">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8">Shipping Milestones</h3>
            
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-6 md:left-1/2 top-4 bottom-4 w-1 -ml-0.5 bg-gray-100 hidden md:block" />
              
              <div className="space-y-12 relative">
                {statusTimeline.map((item, idx) => {
                  const activeIdx = getStatusIndex(order.status);
                  const isDone = idx <= activeIdx;
                  const isCurrent = idx === activeIdx;

                  return (
                    <div key={idx} className="flex flex-col md:flex-row md:items-center relative">
                      {/* Desktop Bullet Center Indicator */}
                      <div className="absolute left-6 md:left-1/2 top-2 md:top-auto w-8 h-8 rounded-full border-4 border-white shadow-md flex items-center justify-center -ml-4 z-10 transition-colors duration-300">
                        <div className={`w-3.5 h-3.5 rounded-full ${
                          isCurrent 
                            ? 'bg-emerald-600 animate-ping' 
                            : isDone 
                              ? 'bg-emerald-600' 
                              : 'bg-gray-200'
                        }`} />
                        {isCurrent && <div className="absolute w-3.5 h-3.5 rounded-full bg-emerald-600" />}
                      </div>

                      {/* Content Blocks */}
                      <div className={`w-full md:w-1/2 pl-12 md:pl-0 md:pr-12 text-left md:text-right ${idx % 2 === 1 ? 'md:order-1 md:pl-12 md:pr-0 md:text-left' : 'md:order-0'}`}>
                        <div className={`inline-block ${isCurrent ? 'scale-105' : ''} transition-transform`}>
                          <span className={`text-[10px] font-black uppercase tracking-wider block ${
                            isCurrent 
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded w-fit md:ml-auto' 
                              : isDone 
                                ? 'text-emerald-600 font-black' 
                                : 'text-gray-400'
                          } ${idx % 2 === 1 && isCurrent ? 'md:mr-auto md:ml-0' : ''}`}>
                            {item.label}
                          </span>
                          <p className="text-sm font-extrabold text-gray-800 mt-2">{item.desc}</p>
                        </div>
                      </div>
                      
                      {/* Empty side for layout on desktop */}
                      <div className="w-1/2 hidden md:block" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Delivery & Summary split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Order Summary & Products */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Product Listing */}
              <div className="bg-white shadow-xl rounded-3xl border border-gray-150 p-6 md:p-8">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Your Spice Bundle</h3>
                <div className="divide-y divide-gray-100">
                  {order.items?.map((item) => (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          {item.productImage ? (
                            <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-black text-emerald-800 uppercase bg-emerald-50 px-2 py-1 rounded">{item.weight}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-extrabold text-gray-800 leading-snug">{item.productName}</span>
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded w-fit mt-1">{item.weight}</span>
                          <span className="text-xs text-gray-400 font-bold mt-1">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</span>
                        </div>
                      </div>
                      <span className="text-sm font-black text-gray-800">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 mt-6 pt-6 flex justify-between items-end">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Total Amount Paid</span>
                    <span className="text-xs text-gray-400 font-bold">(Inclusive of farm taxes & packaging)</span>
                  </div>
                  <span className="text-2xl font-black text-emerald-600">₹{order.totalAmount?.toFixed(2)}</span>
                </div>
              </div>

              {/* Farmer Support Timeline Log */}
              {order.messages && order.messages.length > 0 && (
                <div className="bg-white shadow-xl rounded-3xl border border-gray-150 p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-4">
                    <Clock className="text-emerald-600" size={18} />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Farmer Updates</h3>
                  </div>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {order.messages.map((msg) => {
                      const msgDate = new Date(msg.createdAt);
                      return (
                        <div key={msg.id} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-emerald-800 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded uppercase tracking-wider">
                              Farm Dispatch
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold">
                              {msgDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}, {msgDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 font-semibold whitespace-pre-wrap leading-relaxed">
                            {msg.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Recipient Shipping card */}
            <div className="space-y-8">
              <div className="bg-white shadow-xl rounded-3xl border border-gray-150 p-6 md:p-8">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Delivery Target</h3>
                
                <div className="space-y-6 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin className="text-gray-400 shrink-0 mt-0.5" size={18} />
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Shipping Address</span>
                      <p className="text-xs font-bold text-gray-800 leading-relaxed">
                        <strong className="text-sm font-extrabold text-gray-900 block mb-1">{parsedAddress.fullName}</strong>
                        {parsedAddress.houseNo}, {parsedAddress.area}<br />
                        {parsedAddress.city}, {parsedAddress.state} - {parsedAddress.pincode}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="text-gray-400 shrink-0 mt-0.5" size={18} />
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Contact Phone</span>
                      <span className="text-xs font-bold text-gray-800">{parsedAddress.mobileNumber}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="text-gray-400 shrink-0 mt-0.5" size={18} />
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Verified Email</span>
                      <span className="text-xs font-bold text-gray-800 break-all">{parsedAddress.email || order.user?.email || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="text-gray-400 shrink-0 mt-0.5" size={18} />
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Order Date</span>
                      <span className="text-xs font-bold text-gray-800">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
