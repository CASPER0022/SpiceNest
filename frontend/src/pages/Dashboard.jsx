import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Package, Calendar, CreditCard, ChevronDown, ChevronUp, MapPin, 
  TrendingUp, Layers, Users, ShoppingBag, Percent, ArrowRightLeft, DollarSign, Activity,
  ArrowLeft, Mail, Clock, Globe, Search
} from 'lucide-react';
import toast from 'react-hot-toast';

const parseAddress = (addressStr) => {
  try {
    return typeof addressStr === 'string' ? JSON.parse(addressStr) : addressStr;
  } catch (e) {
    return {};
  }
};

const parseWeightToKg = (weightStr) => {
  if (!weightStr) return 0.1;
  const lower = weightStr.toLowerCase().trim();
  if (lower.endsWith('kg')) {
    const val = parseFloat(lower.replace('kg', ''));
    return isNaN(val) ? 1.0 : val;
  }
  if (lower.endsWith('g')) {
    const val = parseFloat(lower.replace('g', ''));
    return isNaN(val) ? 0.1 : val / 1000.0;
  }
  const val = parseFloat(lower);
  return isNaN(val) ? 0.1 : val;
};

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'productAnalytics' | 'customerAnalytics' | 'orders' | 'products'
  const [timeFilter, setTimeFilter] = useState('Last 7 days'); // 'Year' | 'Last month' | 'This month' | 'Last 7 days'
  const [expandedOrders, setExpandedOrders] = useState({});
  const [hoveredPoint, setHoveredPoint] = useState(null); // { x, y, date, value } for graph hover
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedCustomerEmail, setSelectedCustomerEmail] = useState(null);
  const [selectedProductAnalyticsId, setSelectedProductAnalyticsId] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editAddressForm, setEditAddressForm] = useState(null);
  const [updatingAddress, setUpdatingAddress] = useState(false);

  // Product Management States
  const [products, setProducts] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editProductForm, setEditProductForm] = useState({
    price: 0,
    stock: 0,
    name: '',
    description: '',
    category: ''
  });
  const [savingProduct, setSavingProduct] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const adminEmails = ['heyitsmealbinjohn@gmail.com', 'bibinjohn2018@gmail.com'];

  const statusStyles = {
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-150',
    Processing: 'bg-blue-50 text-blue-700 border-blue-150',
    'On Hold': 'bg-gray-50 text-gray-600 border-gray-150',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-150',
    Cancelled: 'bg-red-50 text-red-700 border-red-150',
    'Pending Payment': 'bg-amber-50 text-amber-700 border-amber-150',
    Refunded: 'bg-purple-50 text-purple-700 border-purple-150',
    Failed: 'bg-rose-50 text-rose-700 border-rose-150'
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/payment/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update status');
      }

      setOrders(prevOrders => 
        prevOrders.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
      );
      toast.success(`Order #${orderId} updated to ${newStatus}`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error updating order status');
    }
  };

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

        // Fetch products list too!
        const prodRes = await fetch(`${API_URL}/api/products`);
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData);
        }
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

  const filteredRegistryOrders = orders.filter(order => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    const address = parseAddress(order.address);
    
    const orderIdMatch = order.id.toString().includes(query) || `#${order.id}`.includes(query);
    const customerNameMatch = (order.user?.name?.toLowerCase().includes(query) || (address && address.fullName?.toLowerCase().includes(query)));
    const emailMatch = (order.user?.email?.toLowerCase().includes(query) || (address && address.email?.toLowerCase().includes(query)));
    const phoneMatch = address && address.mobileNumber ? address.mobileNumber.includes(query) : false;
    
    return orderIdMatch || customerNameMatch || emailMatch || phoneMatch;
  });

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

      // Update local orders list state to add the newly created message
      if (data.orderMessage) {
        setOrders(prevOrders => 
          prevOrders.map(o => {
            if (o.id === orderId) {
              const currentMessages = o.messages || [];
              return {
                ...o,
                messages: [data.orderMessage, ...currentMessages]
              };
            }
            return o;
          })
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'An error occurred while sending the message.');
    } finally {
      setSendingMessage(false);
    }
  };

  const startEditingAddress = (order) => {
    const parsed = parseAddress(order.address);
    setEditAddressForm({
      fullName: parsed.fullName || '',
      houseNo: parsed.houseNo || '',
      area: parsed.area || '',
      city: parsed.city || '',
      state: parsed.state || '',
      pincode: parsed.pincode || '',
      mobileNumber: parsed.mobileNumber || '',
      clientIp: parsed.clientIp || ''
    });
    setIsEditingAddress(true);
  };

  const handleAddressSave = async (orderId) => {
    const requiredFields = ['fullName', 'houseNo', 'area', 'city', 'state', 'pincode', 'mobileNumber'];
    for (const field of requiredFields) {
      if (!editAddressForm[field] || !editAddressForm[field].trim()) {
        toast.error(`Please fill out the ${field} field.`);
        return;
      }
    }

    setUpdatingAddress(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/api/payment/admin/orders/${orderId}/address`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ address: editAddressForm })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update address');
      }

      setOrders(prevOrders => 
        prevOrders.map(o => o.id === orderId ? data.order : o)
      );
      
      toast.success('Shipping address updated successfully!');
      setIsEditingAddress(false);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error updating address');
    } finally {
      setUpdatingAddress(false);
    }
  };

  const startEditingProduct = (product) => {
    setEditingProductId(product.id);
    setEditProductForm({
      price: product.price,
      stock: product.stock !== undefined ? product.stock : 10.0,
      name: product.name,
      description: product.description,
      category: product.category
    });
  };

  const handleProductSave = async (productId) => {
    if (editProductForm.price <= 0) {
      toast.error('Price must be greater than zero.');
      return;
    }
    if (editProductForm.stock < 0) {
      toast.error('Stock cannot be negative.');
      return;
    }

    setSavingProduct(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price: parseFloat(editProductForm.price),
          stock: parseFloat(editProductForm.stock),
          name: editProductForm.name,
          description: editProductForm.description,
          category: editProductForm.category
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      setProducts(prevProducts => 
        prevProducts.map(p => p.id === productId ? { ...p, ...data.product } : p)
      );
      
      toast.success(`${editProductForm.name} updated successfully! 🌿`);
      setEditingProductId(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error updating product');
    } finally {
      setSavingProduct(false);
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

  const calculateProductAnalytics = () => {
    const productStats = {};

    products.forEach(p => {
      productStats[p.id] = {
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        image: p.images && p.images.length > 0 ? p.images[0] : '/images/placeholder.jpg',
        quantitySold: 0,
        revenue: 0,
        weights: {},
        ordersCount: 0
      };
    });

    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const prodId = item.productId;
        if (!prodId) return;
        
        if (!productStats[prodId]) {
          productStats[prodId] = {
            id: prodId,
            name: item.productName || 'Deleted Product',
            category: 'N/A',
            price: item.price,
            stock: 0,
            image: item.productImage || '/images/placeholder.jpg',
            quantitySold: 0,
            revenue: 0,
            weights: {},
            ordersCount: 0
          };
        }

        const stats = productStats[prodId];
        stats.quantitySold += item.quantity;
        stats.revenue += item.price * item.quantity;
        stats.ordersCount += 1;

        if (item.weight) {
          stats.weights[item.weight] = (stats.weights[item.weight] || 0) + item.quantity;
        }
      });
    });

    return Object.values(productStats).map(stats => {
      let topWeight = 'N/A';
      let maxWeightQty = 0;
      Object.entries(stats.weights).forEach(([w, qty]) => {
        if (qty > maxWeightQty) {
          maxWeightQty = qty;
          topWeight = w;
        }
      });

      return {
        ...stats,
        topWeight
      };
    }).sort((a, b) => b.revenue - a.revenue);
  };

  const calculateCustomerAnalytics = () => {
    const customers = {};

    orders.forEach(order => {
      let email = '';
      let name = '';
      
      if (order.userId && order.user && order.user.email) {
        // Registered customer: STRICTLY use account email
        email = order.user.email.toLowerCase().trim();
        name = order.user.name ? order.user.name.trim() : '';
      } else {
        // Guest checkout: Validate based on shipping address email
        try {
          const address = parseAddress(order.address);
          email = address.email ? address.email.toLowerCase().trim() : '';
          name = address.fullName ? address.fullName.trim() : '';
        } catch (e) {}
      }

      if (!email) return;

      if (!customers[email]) {
        customers[email] = {
          name: name || 'Anonymous Guest',
          email,
          ordersCount: 0,
          totalSpent: 0,
          lastOrderDate: order.createdAt,
          isRegistered: !!order.userId
        };
      }

      const cust = customers[email];
      cust.ordersCount += 1;
      cust.totalSpent += order.totalAmount;
      if (new Date(order.createdAt) > new Date(cust.lastOrderDate)) {
        cust.lastOrderDate = order.createdAt;
      }
      if (order.userId) {
        cust.isRegistered = true;
      }
      if (name && cust.name === 'Anonymous Guest') {
        cust.name = name;
      }
    });

    return Object.values(customers).map(cust => {
      let tag = 'New';
      let tagColor = 'bg-blue-50 text-blue-700 border-blue-200';
      
      if (cust.ordersCount > 5) {
        tag = 'Regular Customer';
        tagColor = 'bg-purple-50 text-purple-700 border-purple-200';
      } else if (cust.ordersCount >= 2) {
        tag = 'Returner';
        tagColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      }

      return {
        ...cust,
        tag,
        tagColor
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  };

  const getCustomerDetailData = (customerEmail) => {
    const customerOrders = orders.filter(order => {
      let email = '';
      if (order.userId && order.user && order.user.email) {
        email = order.user.email.toLowerCase().trim();
      } else {
        try {
          const address = parseAddress(order.address);
          email = address.email ? address.email.toLowerCase().trim() : '';
        } catch (e) {}
      }
      return email === customerEmail.toLowerCase().trim();
    });

    const totalSpent = customerOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const ordersCount = customerOrders.length;
    const name = customerOrders[0]?.user?.name || parseAddress(customerOrders[0]?.address).fullName || 'Customer';

    // Group purchases by product
    const productCounts = {};
    customerOrders.forEach(o => {
      o.items.forEach(item => {
        const prodName = item.productName || (item.product && item.product.name) || 'Unknown Product';
        productCounts[prodName] = (productCounts[prodName] || 0) + item.quantity;
      });
    });

    const topProducts = Object.entries(productCounts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);

    return {
      name,
      email: customerEmail,
      totalSpent,
      ordersCount,
      orders: customerOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      topProducts
    };
  };

  const getProductDetailData = (productId) => {
    const product = products.find(p => p.id === productId) || {};
    
    // Filter orders that contain this product
    const productOrders = [];
    orders.forEach(order => {
      const matchingItems = order.items.filter(item => item.productId === productId);
      if (matchingItems.length > 0) {
        matchingItems.forEach(item => {
          let customerName = order.user?.name;
          let customerEmail = order.user?.email;
          try {
            const addr = parseAddress(order.address);
            customerName = addr.fullName || customerName;
            customerEmail = addr.email || customerEmail;
          } catch (e) {}

          productOrders.push({
            orderId: order.id,
            date: order.createdAt,
            customerName: customerName || 'Guest Customer',
            customerEmail: customerEmail || '',
            quantity: item.quantity,
            weight: item.weight,
            price: item.price,
            total: item.price * item.quantity,
            status: order.status
          });
        });
      }
    });

    const totalRevenue = productOrders.reduce((sum, o) => sum + o.total, 0);
    const totalUnitsSold = productOrders.reduce((sum, o) => sum + o.quantity, 0);
    
    // Group weight selections
    const weightStats = {};
    productOrders.forEach(o => {
      weightStats[o.weight] = (weightStats[o.weight] || 0) + o.quantity;
    });

    return {
      product,
      orders: productOrders.sort((a, b) => new Date(b.date) - new Date(a.date)),
      totalRevenue,
      totalUnitsSold,
      weightStats
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
            setIsEditingAddress(false);
            setEditAddressForm(null);
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
              <div className="relative inline-flex items-center">
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                  className={`appearance-none inline-flex items-center text-[10px] font-black uppercase tracking-wider px-3 py-1.5 pr-8 rounded-full border cursor-pointer focus:outline-none transition-all shadow-sm ${
                    statusStyles[selectedOrder.status] || 'bg-emerald-50 text-emerald-700 border-emerald-150'
                  }`}
                >
                  <option value="PAID">PAID</option>
                  <option value="Processing">Processing</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Pending Payment">Pending Payment</option>
                  <option value="Refunded">Refunded</option>
                  <option value="Failed">Failed</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center px-1 text-gray-500">
                  <ChevronDown size={12} />
                </div>
              </div>
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
                          
                          {/* Stock Log Details */}
                          <div className="text-[10px] text-gray-500 font-bold mt-2 bg-gray-50 border border-gray-150 p-2 rounded-xl flex flex-wrap items-center gap-x-2 gap-y-1 w-fit">
                            <span className="text-emerald-700 font-black uppercase tracking-wider text-[8px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 shadow-sm">Stock Log</span>
                            <span>Reduced: <strong className="text-gray-800">{(parseWeightToKg(item.weight) * item.quantity).toFixed(2)} kg</strong></span>
                            {item.initialStock !== undefined && item.initialStock !== null ? (
                              <>
                                <span className="text-gray-300">•</span>
                                <span>Initial: <strong className="text-gray-800">{item.initialStock.toFixed(2)} kg</strong></span>
                                <span className="text-gray-300">•</span>
                                <span>Final: <strong className="text-gray-800">{item.finalStock.toFixed(2)} kg</strong></span>
                              </>
                            ) : (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-gray-400 font-medium italic">Initial/Final states not archived</span>
                              </>
                            )}
                          </div>
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
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Delivery Details</h3>
                {!isEditingAddress ? (
                  <button
                    onClick={() => startEditingAddress(selectedOrder)}
                    className="text-[10px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                  >
                    Edit Address
                  </button>
                ) : null}
              </div>

              {isEditingAddress && editAddressForm ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Recipient Name</label>
                      <input
                        type="text"
                        value={editAddressForm.fullName}
                        onChange={(e) => setEditAddressForm(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                        placeholder="Recipient Name"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Contact Phone</label>
                      <input
                        type="text"
                        value={editAddressForm.mobileNumber}
                        onChange={(e) => setEditAddressForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                        className="w-full text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                        placeholder="Contact Phone"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">House No / Flat / Building</label>
                      <input
                        type="text"
                        value={editAddressForm.houseNo}
                        onChange={(e) => setEditAddressForm(prev => ({ ...prev, houseNo: e.target.value }))}
                        className="w-full text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                        placeholder="House No"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Area / Street / Sector</label>
                      <input
                        type="text"
                        value={editAddressForm.area}
                        onChange={(e) => setEditAddressForm(prev => ({ ...prev, area: e.target.value }))}
                        className="w-full text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                        placeholder="Area"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">City</label>
                      <input
                        type="text"
                        value={editAddressForm.city}
                        onChange={(e) => setEditAddressForm(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                        placeholder="City"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">State</label>
                      <input
                        type="text"
                        value={editAddressForm.state}
                        onChange={(e) => setEditAddressForm(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                        placeholder="State"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Pincode</label>
                      <input
                        type="text"
                        value={editAddressForm.pincode}
                        onChange={(e) => setEditAddressForm(prev => ({ ...prev, pincode: e.target.value }))}
                        className="w-full text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                        placeholder="Pincode"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setIsEditingAddress(false)}
                      disabled={updatingAddress}
                      className="text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAddressSave(selectedOrder.id)}
                      disabled={updatingAddress}
                      className="text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      {updatingAddress ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
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
              )}
            </div>

          </div>

          {/* Admin Messaging sidebar (1 col on lg) */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm flex flex-col h-fit justify-between">
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

            {/* Sent Messages History Card */}
            <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm flex flex-col h-fit">
              <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-4">
                <div className="flex items-center gap-2">
                  <Clock className="text-emerald-600" size={18} />
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Sent Log</h3>
                </div>
                <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 animate-fadeIn">
                  {selectedOrder.messages?.length || 0} Sent
                </span>
              </div>

              {selectedOrder.messages && selectedOrder.messages.length > 0 ? (
                <div className="space-y-4 max-h-[290px] overflow-y-auto pr-1">
                  {selectedOrder.messages.map((msg, index) => {
                    const msgDate = new Date(msg.createdAt);
                    const formattedMsgDate = msgDate.toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric'
                    });
                    const formattedMsgTime = msgDate.toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    });

                    return (
                      <div key={msg.id || index} className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl space-y-2 relative group hover:border-gray-200 transition-all animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-emerald-800 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded uppercase tracking-wider">
                            {msg.sentBy || 'Admin'}
                          </span>
                          <span className="text-[9px] text-gray-400 font-bold flex items-center gap-1">
                            <Clock size={10} />
                            {formattedMsgDate}, {formattedMsgTime}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 font-medium whitespace-pre-wrap leading-relaxed">
                          {msg.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 px-4 flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                    <Mail size={18} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-gray-700">No message history</p>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed max-w-[200px] mx-auto">
                      Any email updates you send to this customer will be archived in this timeline.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Selected Customer Detail View
  if (selectedCustomerEmail) {
    const custData = getCustomerDetailData(selectedCustomerEmail);
    const sortedOrders = [...custData.orders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    let cumulative = 0;
    const graphPoints = sortedOrders.map((o, idx) => {
      cumulative += o.totalAmount;
      return {
        label: new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        value: cumulative,
        orderId: o.id
      };
    });

    const svgWidth = 600;
    const svgHeight = 250;
    const padding = { top: 30, right: 30, bottom: 40, left: 60 };
    const maxVal = Math.max(...graphPoints.map(p => p.value), 500);

    const getX = (idx) => padding.left + (idx / (graphPoints.length - 1 || 1)) * (svgWidth - padding.left - padding.right);
    const getY = (val) => svgHeight - padding.bottom - (val / maxVal) * (svgHeight - padding.top - padding.bottom);

    let pathD = '';
    let areaD = '';
    if (graphPoints.length > 0) {
      graphPoints.forEach((pt, idx) => {
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
      areaD += ` L ${getX(graphPoints.length - 1)} ${svgHeight - padding.bottom} Z`;
    }

    let tag = 'New';
    let tagColor = 'bg-blue-50 text-blue-700 border-blue-200';
    if (custData.ordersCount > 5) {
      tag = 'Regular Customer';
      tagColor = 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (custData.ordersCount >= 2) {
      tag = 'Returner';
      tagColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }

    const firstOrder = sortedOrders[0];
    const isRegistered = firstOrder ? !!firstOrder.userId : false;

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 min-h-[85vh] animate-fadeIn">
        <button
          onClick={() => setSelectedCustomerEmail(null)}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-emerald-750 transition-colors mb-8 cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{custData.name}</h2>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${tagColor}`}>
                {tag}
              </span>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${isRegistered ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                {isRegistered ? 'Member Account' : 'Guest Checkout'}
              </span>
            </div>
            <p className="text-xs text-gray-505 font-bold mt-2 flex items-center gap-1.5">
              <Mail size={14} className="text-gray-400" />
              <span>{custData.email}</span>
            </p>
          </div>
          <div className="text-left md:text-right">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Lifetime Value (Spent)</span>
            <span className="text-2xl font-black text-emerald-600 tracking-tight mt-1 block">₹{custData.totalSpent.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm">
              <div className="mb-6 flex justify-between items-center">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Cumulative Growth Chart</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 font-bold px-2 py-0.5 rounded">₹ Spending Progress</span>
              </div>
              
              <div className="relative">
                {graphPoints.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-10">No orders logged.</p>
                ) : (
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
                    <defs>
                      <linearGradient id="custAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, gridIdx) => {
                      const gridY = padding.top + ratio * (svgHeight - padding.top - padding.bottom);
                      const gridVal = maxVal * (1 - ratio);
                      return (
                        <g key={gridIdx} className="opacity-45">
                          <line x1={padding.left} y1={gridY} x2={svgWidth - padding.right} y2={gridY} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
                          <text x={padding.left - 10} y={gridY + 4} textAnchor="end" className="text-[9px] fill-gray-400 font-bold">₹{Math.round(gridVal)}</text>
                        </g>
                      );
                    })}

                    {areaD && <path d={areaD} fill="url(#custAreaGrad)" />}
                    {pathD && <path d={pathD} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

                    {graphPoints.map((pt, idx) => {
                      const x = getX(idx);
                      const y = getY(pt.value);
                      return (
                        <g key={idx} className="cursor-pointer">
                          <circle cx={x} cy={y} r="5" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
                          <text x={x} y={svgHeight - padding.bottom + 18} textAnchor="middle" className="text-[9px] fill-gray-450 font-bold">{pt.label}</text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Customer Order Registry</h3>
              <div className="overflow-auto max-h-[380px] pr-1">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(229,231,235,0.2)]">
                    <tr className="border-b border-gray-150 bg-white">
                      <th className="py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white">Order ID</th>
                      <th className="py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white">Date Placed</th>
                      <th className="py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white">Status</th>
                      <th className="py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right bg-white">Items Quantity</th>
                      <th className="py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right bg-white">Amount Paid</th>
                      <th className="py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center bg-white">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {custData.orders.map((o) => {
                      const totalQty = o.items.reduce((sum, item) => sum + item.quantity, 0);
                      return (
                        <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 text-sm font-bold text-gray-800">#{o.id}</td>
                          <td className="py-3 text-xs font-medium text-gray-550">
                            {new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-3">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${statusStyles[o.status] || 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3 text-right text-xs font-bold text-gray-800">{totalQty} units</td>
                          <td className="py-3 text-right text-xs font-black text-emerald-600">₹{o.totalAmount.toFixed(2)}</td>
                          <td className="py-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedOrderId(o.id);
                                setSelectedCustomerEmail(null);
                              }}
                              className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 bg-gray-100 hover:bg-emerald-650 hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                              View Invoice
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Flavor Preferences</h3>
              {custData.topProducts.length === 0 ? (
                <p className="text-gray-400 text-xs py-4 text-center">No purchases recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {custData.topProducts.map((p, idx) => {
                    const maxQty = Math.max(...custData.topProducts.map(p => p.qty), 1);
                    const widthPercent = (p.qty / maxQty) * 100;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-gray-800">
                          <span className="truncate pr-4">{p.name}</span>
                          <span>{p.qty} units</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${widthPercent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-emerald-50/50 rounded-3xl border border-emerald-100 p-6 space-y-4">
              <h3 className="text-xs font-black text-emerald-800 uppercase tracking-widest">Cohort Loyalty Metric</h3>
              <div className="space-y-2 text-sm text-emerald-950 font-bold">
                <div className="flex justify-between">
                  <span className="font-normal text-emerald-700">Loyalty Class:</span>
                  <span>{tag}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-normal text-emerald-700">Orders Frequency:</span>
                  <span>{custData.ordersCount} purchased</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-normal text-emerald-700">Average Order Size:</span>
                  <span>₹{(custData.totalSpent / (custData.ordersCount || 1)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Selected Product Detail View
  if (selectedProductAnalyticsId) {
    const prodData = getProductDetailData(selectedProductAnalyticsId);
    const sortedProdOrders = [...prodData.orders].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const dailyStats = {};
    sortedProdOrders.forEach(o => {
      const dateLabel = new Date(o.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      dailyStats[dateLabel] = (dailyStats[dateLabel] || 0) + o.quantity;
    });

    const graphPoints = Object.entries(dailyStats).map(([date, val]) => ({
      label: date,
      value: val
    }));

    const svgWidth = 600;
    const svgHeight = 250;
    const padding = { top: 30, right: 30, bottom: 40, left: 60 };
    const maxVal = Math.max(...graphPoints.map(p => p.value), 10);

    const getX = (idx) => padding.left + (idx / (graphPoints.length - 1 || 1)) * (svgWidth - padding.left - padding.right);
    const getY = (val) => svgHeight - padding.bottom - (val / maxVal) * (svgHeight - padding.top - padding.bottom);

    let pathD = '';
    let areaD = '';
    if (graphPoints.length > 0) {
      graphPoints.forEach((pt, idx) => {
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
      areaD += ` L ${getX(graphPoints.length - 1)} ${svgHeight - padding.bottom} Z`;
    }

    const prodImage = prodData.product.images && prodData.product.images.length > 0 ? prodData.product.images[0] : '/images/placeholder.jpg';

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 min-h-[85vh] animate-fadeIn">
        <button
          onClick={() => setSelectedProductAnalyticsId(null)}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-emerald-700 transition-colors mb-8 cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <img src={prodImage} alt={prodData.product.name} className="w-16 h-16 rounded-2xl object-cover border border-gray-100 shadow-inner bg-gray-50" />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{prodData.product.name}</h2>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  {prodData.product.category}
                </span>
              </div>
              <p className="text-xs text-gray-405 font-bold mt-1">Base Price: ₹{prodData.product.price?.toFixed(2)}</p>
            </div>
          </div>
          <div className="text-left md:text-right">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Total Product Revenue</span>
            <span className="text-2xl font-black text-emerald-600 tracking-tight mt-1 block">₹{prodData.totalRevenue.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm">
              <div className="mb-6 flex justify-between items-center">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Units Sold Daily Trend</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 font-bold px-2 py-0.5 rounded">Quantity (Units)</span>
              </div>
              
              <div className="relative">
                {graphPoints.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-10">No sales recorded yet.</p>
                ) : (
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
                    <defs>
                      <linearGradient id="prodAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, gridIdx) => {
                      const gridY = padding.top + ratio * (svgHeight - padding.top - padding.bottom);
                      const gridVal = maxVal * (1 - ratio);
                      return (
                        <g key={gridIdx} className="opacity-45">
                          <line x1={padding.left} y1={gridY} x2={svgWidth - padding.right} y2={gridY} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
                          <text x={padding.left - 10} y={gridY + 4} textAnchor="end" className="text-[9px] fill-gray-400 font-bold">{Math.round(gridVal)} units</text>
                        </g>
                      );
                    })}

                    {areaD && <path d={areaD} fill="url(#prodAreaGrad)" />}
                    {pathD && <path d={pathD} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

                    {graphPoints.map((pt, idx) => {
                      const x = getX(idx);
                      const y = getY(pt.value);
                      return (
                        <g key={idx} className="cursor-pointer">
                          <circle cx={x} cy={y} r="5" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
                          <text x={x} y={svgHeight - padding.bottom + 18} textAnchor="middle" className="text-[9px] fill-gray-450 font-bold">{pt.label}</text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Product Order Registry</h3>
              <div className="overflow-auto max-h-[380px] pr-1">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(229,231,235,0.2)]">
                    <tr className="border-b border-gray-150 bg-white">
                      <th className="py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white">Order ID</th>
                      <th className="py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white">Date Mapped</th>
                      <th className="py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white">Customer Details</th>
                      <th className="py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center bg-white">Size (Weight)</th>
                      <th className="py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right bg-white">Quantity</th>
                      <th className="py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right bg-white">Transaction Total</th>
                      <th className="py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center bg-white">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {prodData.orders.map((o, idx) => {
                      return (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 text-sm font-bold text-gray-800">#{o.orderId}</td>
                          <td className="py-3 text-xs font-medium text-gray-550">
                            {new Date(o.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-855">{o.customerName}</span>
                              <span className="text-[9px] text-gray-400 font-semibold">{o.customerEmail}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              {o.weight}
                            </span>
                          </td>
                          <td className="py-3 text-right text-xs font-bold text-gray-800">{o.quantity} units</td>
                          <td className="py-3 text-right text-xs font-black text-emerald-600">₹{o.total.toFixed(2)}</td>
                          <td className="py-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedOrderId(o.orderId);
                                setSelectedProductAnalyticsId(null);
                              }}
                              className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 bg-gray-100 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                              View Invoice
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Weight Preference Breakdown</h3>
              {Object.keys(prodData.weightStats).length === 0 ? (
                <p className="text-gray-400 text-xs py-4 text-center">No purchases recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(prodData.weightStats).map(([w, qty], idx) => {
                    const maxQty = Math.max(...Object.values(prodData.weightStats), 1);
                    const widthPercent = (qty / maxQty) * 100;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-gray-800">
                          <span className="bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-black text-emerald-800 uppercase tracking-wider border border-emerald-100">{w}</span>
                          <span>{qty} units</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${widthPercent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-emerald-50/50 rounded-3xl border border-emerald-100 p-6 space-y-4">
              <h3 className="text-xs font-black text-emerald-800 uppercase tracking-widest">Inventory Status Metric</h3>
              <div className="space-y-2 text-sm text-emerald-950 font-bold">
                <div className="flex justify-between">
                  <span className="font-normal text-emerald-700">Units Sold:</span>
                  <span>{prodData.totalUnitsSold} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-normal text-emerald-700">Live Inventory:</span>
                  <span>{prodData.product.stock?.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-normal text-emerald-700">Average Order Size:</span>
                  <span>{(prodData.totalUnitsSold / (prodData.orders.length || 1)).toFixed(1)} units</span>
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
        <div className="flex flex-wrap bg-gray-100 p-1.5 rounded-2xl md:rounded-full w-fit gap-1.5 md:gap-0">
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-full transition-all ${
              activeTab === 'analytics' 
                ? 'bg-white text-emerald-700 shadow-md transform scale-105' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Sales Analytics
          </button>
          <button 
            onClick={() => setActiveTab('productAnalytics')}
            className={`text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-full transition-all ${
              activeTab === 'productAnalytics' 
                ? 'bg-white text-emerald-700 shadow-md transform scale-105' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Product Sales
          </button>
          <button 
            onClick={() => setActiveTab('customerAnalytics')}
            className={`text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-full transition-all ${
              activeTab === 'customerAnalytics' 
                ? 'bg-white text-emerald-700 shadow-md transform scale-105' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Customer Analytics
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-full transition-all ${
              activeTab === 'orders' 
                ? 'bg-white text-emerald-700 shadow-md transform scale-105' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Order Registry
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-full transition-all ${
              activeTab === 'products' 
                ? 'bg-white text-emerald-700 shadow-md transform scale-105' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Inventory
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
      ) : activeTab === 'productAnalytics' ? (
        /* Product Sales Analytics Tab */
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8 border-b border-gray-50 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Product-Level Sales Analytics</h3>
                <p className="text-xs text-gray-400 font-bold mt-1">Detailed performance, revenues, and purchase metrics by spice in current period.</p>
              </div>
              <span className="text-xs font-black bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100">
                Sorted by Revenue
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Info</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Base Price</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Quantity Sold</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Revenue</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Top Weight Preferred</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Current Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(() => {
                    const prodAnalytics = calculateProductAnalytics();
                    if (prodAnalytics.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-gray-400 text-sm font-semibold">
                            No product sales recorded in the selected period.
                          </td>
                        </tr>
                      );
                    }
                    return prodAnalytics.map((item) => (
                      <tr key={item.id} onClick={() => setSelectedProductAnalyticsId(item.id)} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                        <td className="py-4 pr-4 flex items-center gap-3">
                          <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover border border-gray-100 bg-gray-50" />
                          <span className="text-sm font-bold text-gray-800">{item.name}</span>
                        </td>
                        <td className="py-4 pr-4">
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">{item.category}</span>
                        </td>
                        <td className="py-4 pr-4 text-right text-xs font-bold text-gray-700">
                          ₹{item.price.toFixed(2)}
                        </td>
                        <td className="py-4 pr-4 text-right text-sm font-black text-gray-800">
                          {item.quantitySold} units
                        </td>
                        <td className="py-4 pr-4 text-right text-sm font-black text-emerald-600">
                          ₹{item.revenue.toFixed(2)}
                        </td>
                        <td className="py-4 pr-4 text-center">
                          <span className="text-xs font-black text-emerald-700 bg-emerald-50/50 border border-emerald-100 px-2 py-0.5 rounded">
                            {item.topWeight}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${item.stock < 1 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-600 border-gray-150'}`}>
                            {item.stock.toFixed(2)} kg
                          </span>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'customerAnalytics' ? (
        /* Customer-Level Analytics Tab */
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8 border-b border-gray-50 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Customer Engagement & Loyalty Analytics</h3>
                <p className="text-xs text-gray-400 font-bold mt-1">Cohort segmentation showing order count, spending loyalty, and automatically mapped tags.</p>
              </div>
              <span className="text-xs font-black bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full border border-purple-100">
                Sorted by Total Spent
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Details</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Loyalty Status Segment</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Orders</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Purchases Amount</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Last Active Date</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Checkout Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(() => {
                    const custAnalytics = calculateCustomerAnalytics();
                    if (custAnalytics.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-gray-400 text-sm font-semibold">
                            No customer purchase records found.
                          </td>
                        </tr>
                      );
                    }
                    return custAnalytics.map((cust) => (
                      <tr key={cust.email} onClick={() => setSelectedCustomerEmail(cust.email)} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-black text-xs uppercase shadow-inner">
                              {cust.name ? cust.name[0] : 'U'}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-800">{cust.name}</span>
                              <span className="text-[10px] text-gray-400 font-semibold">{cust.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${cust.tagColor}`}>
                            {cust.tag}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-right text-sm font-black text-gray-800">
                          {cust.ordersCount} orders
                        </td>
                        <td className="py-4 pr-4 text-right text-sm font-black text-emerald-600">
                          ₹{cust.totalSpent.toFixed(2)}
                        </td>
                        <td className="py-4 pr-4 text-center text-xs text-gray-500 font-bold">
                          {new Date(cust.lastOrderDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-4 text-center">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${cust.isRegistered ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                            {cust.isRegistered ? 'Member Account' : 'Guest Checkout'}
                          </span>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'orders' ? (
        
        /* Order Registry Details Tab */
        <div className="space-y-6">
          {/* Premium Search Bar */}
          <div className="bg-white rounded-2xl border border-gray-150/70 p-4 shadow-sm flex items-center gap-3">
            <div className="relative flex-grow">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders by customer name, order ID (#10068), email address, or contact phone..."
                className="w-full text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={16} />
              </div>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[10px] font-black uppercase tracking-wider bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-3 rounded-xl transition-all"
              >
                Clear
              </button>
            )}
          </div>

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
                  {filteredRegistryOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Search size={22} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-gray-800">No matching orders found</p>
                            <p className="text-xs text-gray-400 font-medium">Your query did not match any customer names, order IDs, email addresses, or phone numbers.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRegistryOrders.map((order) => {
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
                          <div className="relative inline-flex items-center">
                            <select
                               value={order.status}
                               onChange={(e) => handleStatusChange(order.id, e.target.value)}
                               className={`appearance-none inline-flex items-center text-[10px] font-black uppercase tracking-wider px-3 py-1.5 pr-8 rounded-full border cursor-pointer focus:outline-none transition-all shadow-sm ${
                                 statusStyles[order.status] || 'bg-emerald-50 text-emerald-700 border-emerald-150'
                               }`}
                            >
                               <option value="PAID">PAID</option>
                               <option value="Processing">Processing</option>
                               <option value="On Hold">On Hold</option>
                               <option value="Completed">Completed</option>
                               <option value="Cancelled">Cancelled</option>
                               <option value="Pending Payment">Pending Payment</option>
                               <option value="Refunded">Refunded</option>
                               <option value="Failed">Failed</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center px-1 text-gray-500">
                              <ChevronDown size={12} />
                            </div>
                          </div>
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      ) : (
        /* Product Management Tab */
        <div className="space-y-8 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8 border-b border-gray-50 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Product Catalog Inventory</h3>
                <p className="text-xs text-gray-400 font-bold mt-1">Manage spice prices, live stock levels, and catalog info.</p>
              </div>
              <span className="text-xs font-black bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100">
                {products.length} Spices Listed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Spice Image & Name</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Price (Base)</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Current Stock</th>
                    <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((prod) => {
                    const isEditing = editingProductId === prod.id;
                    const prodImage = prod.images && prod.images.length > 0 ? prod.images[0] : '/images/placeholder.jpg';

                    return (
                      <tr key={prod.id} className="hover:bg-gray-50/50 transition-colors">
                        {/* Name and Image */}
                        <td className="py-5 pr-4 flex items-start gap-4">
                          <img src={prodImage} alt={prod.name} className="w-14 h-14 rounded-2xl object-cover border border-gray-100 shadow-sm shrink-0 bg-gray-50" />
                          <div className="space-y-1 flex-grow">
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editProductForm.name}
                                  onChange={(e) => setEditProductForm(prev => ({ ...prev, name: e.target.value }))}
                                  className="text-xs font-extrabold text-gray-800 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 focus:bg-white w-full max-w-[200px]"
                                />
                                <textarea
                                  value={editProductForm.description}
                                  onChange={(e) => setEditProductForm(prev => ({ ...prev, description: e.target.value }))}
                                  className="text-[10px] font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 focus:bg-white w-full max-w-[300px] h-16 resize-none block"
                                />
                              </div>
                            ) : (
                              <>
                                <span className="text-sm font-extrabold text-gray-800 block leading-none">{prod.name}</span>
                                <p className="text-[10px] text-gray-400 font-semibold line-clamp-2 max-w-[300px] leading-relaxed">{prod.description}</p>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-5 pr-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editProductForm.category}
                              onChange={(e) => setEditProductForm(prev => ({ ...prev, category: e.target.value }))}
                              className="text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 w-28"
                            />
                          ) : (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50/70 border border-emerald-100/50 px-2.5 py-1 rounded-full">{prod.category}</span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="py-5 pr-4 text-right">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1">
                              <span className="text-xs font-black text-gray-400">₹</span>
                              <input
                                type="number"
                                step="any"
                                value={editProductForm.price}
                                onChange={(e) => setEditProductForm(prev => ({ ...prev, price: e.target.value }))}
                                className="text-xs font-black text-gray-800 bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500 w-16 text-right"
                              />
                            </div>
                          ) : (
                            <span className="text-sm font-black text-gray-800">₹{prod.price.toFixed(2)}</span>
                          )}
                        </td>

                        {/* Stock */}
                        <td className="py-5 pr-4 text-right">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                step="any"
                                value={editProductForm.stock}
                                onChange={(e) => setEditProductForm(prev => ({ ...prev, stock: e.target.value }))}
                                className="text-xs font-black text-gray-800 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 w-20 text-right"
                              />
                              <span className="text-[10px] font-black text-gray-400 uppercase">kg</span>
                            </div>
                          ) : (
                            <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                              prod.stock >= 0.1 
                                ? 'bg-emerald-50/50 text-emerald-800 border-emerald-100' 
                                : 'bg-rose-50/50 text-rose-800 border-rose-100 animate-pulse'
                            }`}>
                              {prod.stock !== undefined ? `${prod.stock.toFixed(2)} kg` : '10.00 kg'}
                            </span>
                          )}
                        </td>

                        {/* Action buttons */}
                        <td className="py-5 text-center">
                          {isEditing ? (
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleProductSave(prod.id)}
                                disabled={savingProduct}
                                className="text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm cursor-pointer w-full"
                              >
                                {savingProduct ? 'Saving' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingProductId(null)}
                                disabled={savingProduct}
                                className="text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-all cursor-pointer w-full"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditingProduct(prod)}
                              className="text-[9px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-full border border-emerald-250 hover:bg-emerald-600 hover:text-white text-emerald-700 transition-all cursor-pointer shadow-sm hover:shadow"
                            >
                              Edit details
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
