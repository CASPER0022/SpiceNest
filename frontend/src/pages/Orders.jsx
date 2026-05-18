import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, Calendar, CreditCard, ChevronDown, ChevronUp, MapPin, Truck, ExternalLink, ArrowRight, ShieldCheck, Box } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState({});

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=orders');
      return;
    }

    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/payment/my-orders`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error('Failed to retrieve your order history');
        }

        const data = await res.json();
        setOrders(data);
      } catch (err) {
        console.error(err);
        toast.error(err.message || 'Error loading orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, navigate, API_URL]);

  const toggleAddress = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const parseAddress = (addressStr) => {
    try {
      return typeof addressStr === 'string' ? JSON.parse(addressStr) : addressStr;
    } catch (e) {
      console.error(e);
      return {};
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper to resolve product image or return default
  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    return 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&q=80';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-20 min-h-[70vh]">
        <div className="space-y-8 animate-pulse">
          <div className="h-10 bg-gray-200 rounded-xl w-48 mb-10"></div>
          {[1, 2].map((i) => (
            <div key={i} className="bg-white/80 rounded-3xl p-6 md:p-8 border border-gray-100 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 rounded-lg w-32"></div>
                  <div className="h-4 bg-gray-200 rounded-lg w-24"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded-full w-24"></div>
              </div>
              <div className="space-y-4">
                <div className="h-20 bg-gray-150 rounded-2xl w-full"></div>
                <div className="h-6 bg-gray-100 rounded-lg w-40"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 md:py-32 text-center min-h-[70vh] flex flex-col justify-center items-center">
        <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-8 border border-emerald-100/50 shadow-inner animate-bounce">
          <Box size={44} strokeWidth={1.5} />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-3">No Orders Yet</h2>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed max-w-sm">
          Looks like you haven't placed an order yet. From black pepper to premium cashews, discover the authentic flavours of Kerala!
        </p>
        <Link 
          to="/shop" 
          className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-8 rounded-full shadow-lg shadow-emerald-600/20 transition-all transform hover:scale-105 active:scale-[0.98]"
        >
          Explore Shop <ArrowRight size={16} className="ml-2" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-20 min-h-[80vh]">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight uppercase">My Orders</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and track your farm-fresh spice shipments.</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold px-4 py-2 rounded-full inline-flex items-center w-fit">
          <ShieldCheck size={14} className="mr-1.5 shrink-0" /> Secure Payments Verified
        </div>
      </div>

      <div className="space-y-8">
        {orders.map((order) => {
          const address = parseAddress(order.address);
          const isAddressOpen = !!expandedOrders[order.id];

          // 10001 start index offset for order display
          const displayOrderId = 10000 + order.id;

          // Simple dynamic tracking status (Mocked for premium UX since it's hardseeded as PAID)
          const steps = [
            { label: 'Ordered', desc: 'Payment validated', done: true },
            { label: 'Processing', desc: 'Harvesting & packing', done: true },
            { label: 'In Transit', desc: 'Shipped from Idukki', done: false },
            { label: 'Delivered', desc: 'At your doorstep', done: false }
          ];

          return (
            <div 
              key={order.id} 
              className="bg-white rounded-3xl shadow-sm border border-gray-150/70 overflow-hidden hover:border-gray-250 transition-all hover:shadow-md"
            >
              
              {/* Order Card Header */}
              <div className="bg-gray-50/50 p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Order Number</span>
                    <span className="text-sm font-bold text-gray-800 flex items-center">
                      #{displayOrderId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Date Placed</span>
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <Calendar size={14} className="opacity-60" /> {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Total Paid</span>
                    <span className="text-sm font-extrabold text-emerald-600 flex items-center gap-1.5">
                      <CreditCard size={14} className="opacity-80" /> ₹{order.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center md:justify-end gap-3">
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-ping"></span>
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Order Items List */}
              <div className="p-6 md:p-8 border-b border-gray-100 space-y-6">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 sm:gap-6 items-center">
                    <img 
                      src={getProductImage(item.product)} 
                      alt={item.product.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-2xl border border-gray-100 shadow-sm shrink-0"
                    />
                    <div className="flex-grow">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                            {item.product.name}
                          </h4>
                          <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-wider">
                            Pack Weight: {item.weight}
                          </p>
                        </div>
                        <span className="text-sm sm:text-base font-bold text-gray-800 whitespace-nowrap text-right">
                          ₹{item.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50/50">
                        <span className="text-xs text-gray-500 font-bold">
                          Qty: <span className="text-gray-800">{item.quantity}</span>
                        </span>
                        <span className="text-xs text-gray-400 font-semibold italic">
                          Farm Direct
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dynamic Fulfillment Progress Tracker */}
              <div className="px-6 md:px-8 py-6 bg-gray-50/30 border-b border-gray-100">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Shipment Progress</span>
                <div className="grid grid-cols-4 gap-2 relative">
                  
                  {/* Progress Line */}
                  <div className="absolute top-3.5 left-[12%] right-[12%] h-[3px] bg-gray-200 z-0">
                    <div className="h-full bg-emerald-500" style={{ width: '33.33%' }}></div>
                  </div>

                  {steps.map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center text-center z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 ${
                        step.done 
                          ? 'bg-emerald-500 border-emerald-50 text-white' 
                          : 'bg-white border-gray-200 text-gray-400'
                      } shadow-sm transition-all duration-300`}>
                        {idx === 0 && <Package size={12} />}
                        {idx === 1 && <Box size={12} />}
                        {idx === 2 && <Truck size={12} />}
                        {idx === 3 && <MapPin size={12} />}
                      </div>
                      <span className={`text-[10px] sm:text-xs font-bold mt-2 ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-gray-400 font-medium hidden sm:block mt-0.5 max-w-[100px] leading-tight">
                        {step.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Collapsible Shipping Details */}
              <div className="bg-white">
                <button 
                  onClick={() => toggleAddress(order.id)}
                  className="w-full px-6 md:px-8 py-4 flex items-center justify-between text-xs font-bold text-gray-500 hover:text-emerald-600 transition-colors uppercase tracking-wider"
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="opacity-60" /> Shipping Details
                  </span>
                  {isAddressOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isAddressOpen && (
                  <div className="px-6 md:px-8 pb-6 pt-2 border-t border-gray-50 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 bg-gray-50/20">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recipient</p>
                      <p className="font-bold text-gray-800">{address.fullName || 'Valued Customer'}</p>
                      <p className="text-gray-500 font-medium">Phone: {address.mobileNumber}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Address</p>
                      <p className="font-semibold text-gray-700 leading-relaxed">
                        {address.houseNo}, {address.area}<br />
                        {address.city}, {address.state} - {address.pincode}
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
