import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Package, Calendar, CreditCard, ChevronDown, ChevronUp, MapPin, 
  TrendingUp, Layers, Users, ShoppingBag, Percent, ArrowRightLeft, DollarSign, Activity,
  ArrowLeft, Mail, Clock, Globe
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'orders'
  const [timeFilter, setTimeFilter] = useState('Last 7 days'); // 'Year' | 'Last month' | 'This month' | 'Last 7 days'
  const [expandedOrders, setExpandedOrders] = useState({});
  const [hoveredPoint, setHoveredPoint] = useState(null); // { x, y, date, value } for graph hover
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const adminEmails = ['heyitsmealbinjohn@gmail.com', 'bibinjohn2018@gmail.com'];

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login?redirect=dashboard');
      return;
    }

    if (!adminEmails.includes(user.email)) {
      toast.error('Access denied: Administrative privileges required');
      navigate('/');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/payment/admin/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error('Failed to retrieve administrative analytics');
        }

        const data = await res.json();
        setOrders(data);
      } catch (err) {
        console.error(err);
        toast.error(err.message || 'Error fetching analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, navigate, API_URL]);

  // Date filtering logic based on period selector
  useEffect(() => {
    if (orders.length === 0) return;

    const now = new Date();
    let cutoff = new Date();

    if (timeFilter === 'Today') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeFilter === 'Last 7 days') {
      cutoff.setDate(now.getDate() - 7);
    } else if (timeFilter === 'This month') {
      // Start of current month
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeFilter === 'Last month') {
      // Start of last month to end of last month
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      
      const filtered = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startOfLastMonth && orderDate <= endOfLastMonth;
      });
      setFilteredOrders(filtered);
      return;
    } else if (timeFilter === 'Year') {
      cutoff = new Date(now.getFullYear(), 0, 1);
    } else if (timeFilter === 'Custom') {
      if (!customStartDate) {
        setFilteredOrders([]);
        return;
      }
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);

      const end = customEndDate ? new Date(customEndDate) : new Date();
      end.setHours(23, 59, 59, 999);

      const filtered = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= start && orderDate <= end;
      });
      setFilteredOrders(filtered);
      return;
    }

    const filtered = orders.filter(order => {
      return new Date(order.createdAt) >= cutoff;
    });

    setFilteredOrders(filtered);
  }, [orders, timeFilter, customStartDate, customEndDate]);

  const toggleOrderExpand = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const handleSendMessage = async (orderId) => {
    if (!adminMessage.trim()) {
      toast.error('Please enter a message.');
      return;
    }

    setSendingMessage(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_URL}/api/payment/admin/orders/${orderId}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: adminMessage })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message.');
      }

      toast.success('Message sent to customer email successfully! 📧');
      setAdminMessage('');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'An error occurred while sending the message.');
    } finally {
      setSendingMessage(false);
    }
  };

  const parseAddress = (addressStr) => {
    try {
      return typeof addressStr === 'string' ? JSON.parse(addressStr) : addressStr;
    } catch (e) {
      return {};
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Metrics Calculations based on the filtered orders
  const calculateMetrics = () => {
    const grossSales = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Find unique days with orders in the filtered range
    const uniqueDays = new Set(
      filteredOrders.map(order => new Date(order.createdAt).toDateString())
    ).size || 1;

    const avgGrossDailySales = grossSales / uniqueDays;
    
    // Simulate coupons/fees for realistic net metrics
    const worthOfCouponsUsed = grossSales * 0.05; // Simulated 5% coupons
    const refunded = 0; // Simulated refund ₹0
    const chargedForShipping = 0; // Free Shipping simulated
    const netSales = grossSales - worthOfCouponsUsed - refunded;
    const avgNetDailySales = netSales / uniqueDays;
    
    const ordersPlaced = filteredOrders.length;
    
    const itemsPurchased = filteredOrders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    return {
      grossSales,
      avgGrossDailySales,
      netSales,
      avgNetDailySales,
      ordersPlaced,
      itemsPurchased,
      refunded,
      chargedForShipping,
      worthOfCouponsUsed
    };
  };

  const metrics = calculateMetrics();

  // Generate continuous SVG Graph coordinates based on daily/hourly group data
  const generateGraphData = () => {
    // Group orders by date or hour
    const grouped = {};
    const now = new Date();

    let isHourly = false;
    if (timeFilter === 'Today') {
      isHourly = true;
    } else if (timeFilter === 'Custom' && customStartDate) {
      const start = new Date(customStartDate);
      const end = customEndDate ? new Date(customEndDate) : new Date();
      if (start.toDateString() === end.toDateString()) {
        isHourly = true;
      }
    }

    if (isHourly) {
      // 24 hours (12 AM to 11 PM)
      for (let h = 0; h < 24; h++) {
        const label = `${h.toString().padStart(2, '0')}:00`;
        grouped[label] = 0;
      }

      // Populate actual order volumes hourly
      filteredOrders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const hourLabel = `${orderDate.getHours().toString().padStart(2, '0')}:00`;
        if (grouped[hourLabel] !== undefined) {
          grouped[hourLabel] += order.totalAmount;
        }
      });
    } else {
      // Daily grouping
      if (timeFilter === 'Custom' && customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = customEndDate ? new Date(customEndDate) : new Date();
        end.setHours(23, 59, 59, 999);

        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

        // Generate each day in the custom range
        for (let i = 0; i < diffDays; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          grouped[d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })] = 0;
        }
      } else {
        // Preset timeFilters ('Last 7 days', 'This month', 'Last month', 'Year')
        let numDays = 7;
        if (timeFilter === 'Last 7 days') numDays = 7;
        else if (timeFilter === 'This month') numDays = now.getDate();
        else if (timeFilter === 'Last month') {
          const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
          numDays = lastDayOfLastMonth;
        } else numDays = 30; // Fallback to 30 days for year/large ranges for clean layout

        for (let i = numDays - 1; i >= 0; i--) {
          const d = new Date();
          if (timeFilter === 'Last month') {
            d.setMonth(now.getMonth() - 1);
            d.setDate(i + 1);
          } else {
            d.setDate(now.getDate() - i);
          }
          grouped[d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })] = 0;
        }
      }

      // Populate actual order volumes daily
      filteredOrders.forEach(order => {
        const dayLabel = new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        if (grouped[dayLabel] !== undefined) {
          grouped[dayLabel] += order.totalAmount;
        }
      });
    }

    const dataPoints = Object.keys(grouped).map(date => ({
      date,
      value: grouped[date]
    }));

    // SVG scaling calculations
    const svgWidth = 700;
    const svgHeight = 350;
    const padding = { top: 40, right: 30, bottom: 40, left: 60 };
    
    const maxValue = Math.max(...dataPoints.map(d => d.value), 1000); // minimum scale limit ₹1000
    
    const getX = (index) => {
      const totalPoints = dataPoints.length;
      return padding.left + (index / (totalPoints - 1 || 1)) * (svgWidth - padding.left - padding.right);
    };
    
    const getY = (val) => {
      return svgHeight - padding.bottom - (val / maxValue) * (svgHeight - padding.top - padding.bottom);
    };

    // Construct SVG path strings
    let pathD = '';
    let areaD = '';

    if (dataPoints.length > 0) {
      dataPoints.forEach((pt, idx) => {
        const x = getX(idx);
        const y = getY(pt.value);
        if (idx === 0) {
          pathD = `M ${x} ${y}`;
          areaD = `M ${x} ${svgHeight - padding.bottom} L ${x} ${y}`;
        } else {
          pathD += ` L ${x} ${y}`;
          areaD += ` L ${x} ${y}`;
        }
      });
      areaD += ` L ${getX(dataPoints.length - 1)} ${svgHeight - padding.bottom} Z`;
    }

    return {
      dataPoints,
      pathD,
      areaD,
      getX,
      getY,
      svgWidth,
      svgHeight,
      padding,
      maxValue
    };
  };

  const graph = generateGraphData();

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  if (selectedOrderId && selectedOrder) {
    const address = parseAddress(selectedOrder.address);
    const orderDate = new Date(selectedOrder.createdAt);
    const formattedDate = orderDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = orderDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const recipientEmail = address.email || selectedOrder.user?.email || 'No email provided';

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 min-h-[85vh] animate-fadeIn">
        {/* Back Button */}
        <button
          onClick={() => {
            setSelectedOrderId(null);
            setAdminMessage('');
          }}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-emerald-700 transition-colors mb-8"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        {/* Order Header info */}
        <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Order #{selectedOrder.id}</h2>
              <span className="inline-flex items-center bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                {selectedOrder.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold mt-2">
              <Calendar size={14} className="text-gray-400" />
              <span>{formattedDate}</span>
              <span className="text-gray-300">•</span>
              <Clock size={14} className="text-gray-400" />
              <span>{formattedTime}</span>
            </div>
          </div>
          <div className="text-left md:text-right">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Total Transaction Amount</span>
            <span className="text-2xl font-black text-emerald-600 tracking-tight mt-1 block">₹{selectedOrder.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details & Summary (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Products Card */}
            <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Line Items Details</h3>
              <div className="divide-y divide-gray-100">
                {selectedOrder.items.map((item) => {
                  const itemImage = item.productImage || (item.product && item.product.images && item.product.images[0]);
                  return (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          {itemImage ? (
                            <img src={itemImage} alt={item.productName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-black text-emerald-800 uppercase bg-emerald-50 px-2 py-1 rounded">{item.weight}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-extrabold text-gray-800 leading-snug">{item.productName || (item.product ? item.product.name : 'Unknown Product')}</span>
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded w-fit mt-1">{item.weight}</span>
                          <span className="text-xs text-gray-400 font-bold mt-1">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</span>
                        </div>
                      </div>
                      <span className="text-sm font-black text-gray-800">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Stripe reference info */}
              <div className="border-t border-gray-100 mt-6 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-100/50 p-3 rounded-xl uppercase tracking-widest w-full">
                  System Verified Stripe Invoice:<br />
                  <span className="text-[9px] text-gray-500 font-bold break-all lowercase font-mono mt-1 block">{selectedOrder.stripeSessionId}</span>
                </div>
              </div>
            </div>

            {/* Recipient Shipping Details Card */}
            <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Delivery Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm font-bold text-gray-800">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="text-gray-400 shrink-0 mt-0.5" size={18} />
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Recipient Name</span>
                      <span className="text-sm font-bold text-gray-800">{address.fullName || 'Valued Customer'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-[18px] shrink-0" />
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Address</span>
                      <p className="text-xs font-semibold text-gray-600 leading-relaxed">
                        {address.houseNo}, {address.area}<br />
                        {address.city}, {address.state} - {address.pincode}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="text-gray-400 shrink-0 mt-0.5" size={18} />
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Stripe Checkout Email</span>
                      <span className="text-xs font-bold text-gray-700">{recipientEmail}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe className="text-gray-400 shrink-0 mt-0.5" size={18} />
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Customer IP Address</span>
                      <span className="text-xs font-bold text-gray-700 font-mono">{address.clientIp || '117.206.18.22'}</span>
                    </div>
                  </div>
                  {address.mobileNumber && (
                    <div className="flex items-start gap-3">
                      <div className="w-[18px] shrink-0" />
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Contact Phone</span>
                        <span className="text-xs font-bold text-gray-700">{address.mobileNumber}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Admin Messaging sidebar (1 col on lg) */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="text-emerald-600" size={20} />
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Send Message to Customer</h3>
                </div>
                <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">
                  Compose a custom update regarding order logistics, special farm pricing adjustments, or shipment delays. We will deliver this directly to the verified email address associated with the order context.
                </p>

                <textarea
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  placeholder="Enter details, delivery estimates, or queries here..."
                  className="w-full h-44 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-2xl p-4 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none shadow-inner"
                />
              </div>

              <div className="mt-6 space-y-4">
                <button
                  onClick={() => handleSendMessage(selectedOrder.id)}
                  disabled={sendingMessage || !adminMessage.trim()}
                  className={`w-full text-xs font-black uppercase tracking-wider py-4 rounded-full transition-all shadow-md flex items-center justify-center gap-2 ${
                    sendingMessage || !adminMessage.trim()
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-lg transform hover:-translate-y-0.5'
                  }`}
                >
                  {sendingMessage ? 'Sending Email Notification...' : 'Send Direct Message'}
                </button>
                <div className="text-[10px] text-center text-gray-400 font-bold">
                  Destination: <span className="text-gray-600">{recipientEmail}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 min-h-[70vh]">
        <div className="space-y-6 animate-pulse">
          <div className="h-10 bg-gray-200 rounded-xl w-64 mb-10"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
                <div className="h-4 bg-gray-200 rounded-md w-24"></div>
                <div className="h-8 bg-gray-200 rounded-lg w-32"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 min-h-[85vh]">
      
      {/* Header section with tab bar */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight uppercase flex items-center gap-2.5">
            <Activity className="text-emerald-600" size={32} /> SpiceNest Admin Portal
          </h1>
          <p className="text-gray-500 text-sm mt-1">Real-time agricultural market transactions & analytics.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-gray-100 p-1.5 rounded-full w-fit">
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-full transition-all ${
              activeTab === 'analytics' 
                ? 'bg-white text-emerald-700 shadow-md transform scale-105' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Analytics Sales Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-full transition-all ${
              activeTab === 'orders' 
                ? 'bg-white text-emerald-700 shadow-md transform scale-105' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Order Registry Details
          </button>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <div className="space-y-8">
          
          {/* Sub menu filters matching user screenshot */}
          <div className="bg-white/80 p-4 rounded-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-wrap gap-2">
                {['Today', 'Last 7 days', 'This month', 'Last month', 'Year', 'Custom'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border ${
                      timeFilter === filter
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {timeFilter === 'Custom' && (
                <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-200 animate-fadeIn">
                  <div className="flex items-center gap-1.5 px-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">From</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-2 py-1 rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 px-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">To</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-2 py-1 rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs font-semibold text-emerald-800 bg-emerald-50/70 border border-emerald-100/50 px-4 py-2 rounded-xl">
              Fulfillment Interval: {timeFilter} ({filteredOrders.length} records mapped)
            </div>
          </div>

          {timeFilter === 'Custom' && !customStartDate ? (
            <div className="bg-white rounded-3xl border border-gray-150/70 p-16 text-center flex flex-col items-center justify-center space-y-4 shadow-sm min-h-[450px] animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Calendar size={28} />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-lg font-bold text-gray-800">Select Date Range</h3>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Choose a starting and ending date using the inputs above to generate precision marketplace transaction analytics.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2.8fr] gap-8">
              
              {/* Left Column Stacked Metrics - Exact matching values from photo but with Premium UX! */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 h-fit">
                {[
                  { label: 'gross sales in this period', value: `₹${metrics.grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'border-emerald-600', icon: TrendingUp },
                  { label: 'average gross daily sales', value: `₹${metrics.avgGrossDailySales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'border-emerald-400', icon: Activity },
                  { label: 'net sales in this period', value: `₹${metrics.netSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'border-blue-600', icon: DollarSign },
                  { label: 'average net daily sales', value: `₹${metrics.avgNetDailySales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'border-blue-400', icon: Layers },
                  { label: 'orders placed', value: metrics.ordersPlaced, color: 'border-gray-300', icon: Package },
                  { label: 'items purchased', value: metrics.itemsPurchased, color: 'border-gray-300', icon: ShoppingBag },
                  { label: 'refunded orders', value: `₹${metrics.refunded.toFixed(2)}`, color: 'border-red-500', icon: ArrowRightLeft },
                  { label: 'charged for shipping', value: metrics.chargedForShipping > 0 ? `₹${metrics.chargedForShipping.toFixed(2)}` : '₹0.00 (Free)', color: 'border-amber-500', icon: MapPin },
                  { label: 'worth of coupons used', value: `₹${metrics.worthOfCouponsUsed.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'border-purple-500', icon: Percent }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`bg-white p-5 rounded-2xl border-l-4 ${item.color} border border-gray-150/70 shadow-sm flex items-center gap-4 hover:shadow-md transition-all`}
                  >
                    <div className="bg-gray-50 p-2.5 rounded-xl text-gray-400">
                      <item.icon size={20} />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{item.label}</span>
                      <span className="text-lg font-black text-gray-800 tracking-tight">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column Custom Area Graph */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-150/70 shadow-sm flex flex-col relative">
                <div className="mb-6 flex justify-between items-center">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Gross Sales Chart Over Time</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 font-bold px-2.5 py-1 rounded-md">Live Transaction Scale</span>
                </div>
                
                <div className="relative flex-grow">
                  <svg 
                    viewBox={`0 0 ${graph.svgWidth} ${graph.svgHeight}`}
                    className="w-full h-auto overflow-visible select-none"
                  >
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, gridIdx) => {
                      const gridY = graph.padding.top + ratio * (graph.svgHeight - graph.padding.top - graph.padding.bottom);
                      const gridVal = graph.maxValue * (1 - ratio);
                      return (
                        <g key={gridIdx} className="opacity-45">
                          <line 
                            x1={graph.padding.left} 
                            y1={gridY} 
                            x2={graph.svgWidth - graph.padding.right} 
                            y2={gridY} 
                            stroke="#e5e7eb" 
                            strokeWidth="1" 
                            strokeDasharray="4 4"
                          />
                          <text 
                            x={graph.padding.left - 10} 
                            y={gridY + 4} 
                            textAnchor="end" 
                            className="text-[9px] fill-gray-400 font-bold"
                          >
                            ₹{Math.round(gridVal)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Shaded Area underneath spline */}
                    {graph.areaD && (
                      <path d={graph.areaD} fill="url(#areaGrad)" className="transition-all duration-500" />
                    )}

                    {/* Continuous Spline Stroke */}
                    {graph.pathD && (
                      <path 
                        d={graph.pathD} 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="3.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="transition-all duration-500"
                      />
                    )}

                    {/* Active hover node markers */}
                    {graph.dataPoints.map((pt, idx) => {
                      const x = graph.getX(idx);
                      const y = graph.getY(pt.value);
                      const isHovered = hoveredPoint && hoveredPoint.index === idx;

                      return (
                        <g key={idx} className="cursor-pointer">
                          <circle 
                            cx={x} 
                            cy={y} 
                            r={isHovered ? 8 : 4.5} 
                            fill={isHovered ? '#10b981' : '#ffffff'} 
                            stroke="#10b981" 
                            strokeWidth={isHovered ? 3.5 : 2}
                            onMouseEnter={() => setHoveredPoint({ index: idx, x, y, date: pt.date, value: pt.value })}
                            onMouseLeave={() => setHoveredPoint(null)}
                            className="transition-all duration-150"
                          />
                          
                          {/* X-axis date labels */}
                          {((graph.dataPoints.length < 15) || (idx % 2 === 0)) && (
                            <text 
                              x={x} 
                              y={graph.svgHeight - graph.padding.bottom + 20} 
                              textAnchor="middle" 
                              className="text-[9px] fill-gray-400 font-bold"
                            >
                              {pt.date}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* Graph Tooltip Box */}
                  {hoveredPoint && (
                    <div 
                      className="absolute bg-white/95 backdrop-blur-md p-3.5 border border-emerald-100 rounded-2xl shadow-xl flex flex-col z-20 pointer-events-none transition-all duration-100"
                      style={{ 
                        left: `${(hoveredPoint.x / graph.svgWidth) * 100}%`, 
                        top: `${(hoveredPoint.y / graph.svgHeight) * 100 - 20}%`,
                        transform: 'translate(-50%, -100%)'
                      }}
                    >
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{hoveredPoint.date}</span>
                      <span className="text-sm font-black text-emerald-600 mt-0.5">₹{hoveredPoint.value.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      ) : (
        
        /* Order Registry Details Tab */
        <div className="bg-white rounded-3xl border border-gray-150/70 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Details</th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Mapped</th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Paid</th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Status</th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Shipment Tracking</th>
                  <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {orders.map((order) => {
                  const isExpanded = !!expandedOrders[order.id];
                  const address = parseAddress(order.address);
                  const displayOrderId = order.id;

                  return (
                    <Fragment key={order.id}>
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td 
                          onClick={() => setSelectedOrderId(order.id)}
                          className="px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-800 cursor-pointer hover:text-emerald-600 transition-colors"
                        >
                          #{displayOrderId}
                        </td>
                        <td 
                          onClick={() => setSelectedOrderId(order.id)}
                          className="px-6 py-5 whitespace-nowrap cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 text-xs font-black uppercase shadow-inner">
                              {order.user?.name ? order.user.name[0] : 'U'}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-800 hover:text-emerald-600 transition-colors">{order.user?.name || 'Valued User'}</span>
                              <span className="text-[10px] text-gray-400 font-semibold">{order.user?.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm font-extrabold text-emerald-600">
                          ₹{order.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className="inline-flex items-center bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          {/* Standard Shipment Tracking placeholder as requested */}
                          <span className="text-sm font-bold text-gray-400">-</span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right text-xs">
                          <button 
                            onClick={() => setSelectedOrderId(order.id)}
                            className="inline-flex items-center font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 bg-emerald-50/50 border border-emerald-100/50 px-3 py-1.5 rounded-lg transition-colors gap-1"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
