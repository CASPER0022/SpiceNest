import { Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { CheckCircle, Package, MapPin, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Success() {
  const { clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    async function confirmOrder() {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/payment/confirm-order?session_id=${sessionId}`);
        const data = await res.json();

        if (data.success) {
          setOrder(data.order);
          clearCart(); // Only clear the cart after we've confirmed the order is saved!
        } else {
          setError(data.error || 'Failed to verify order.');
        }
      } catch (err) {
        setError('Something went wrong while confirming your order.');
      } finally {
        setLoading(false);
      }
    }

    confirmOrder();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 size={48} className="text-emerald-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Verifying Payment...</h2>
        <p className="text-gray-500">Please don't close this page.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-40 px-4 text-center">
        <AlertCircle size={64} className="text-red-500 mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Verification Failed</h1>
        <p className="text-gray-600 mb-8 max-w-md">{error}</p>
        <Link to="/cart" className="bg-emerald-600 text-white font-bold py-3 px-8 rounded-full">
          Back to Cart
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
        <div className="bg-emerald-600 py-12 text-center text-white">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
            <CheckCircle size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-black mb-2">Order Confirmed!</h1>
          <p className="text-emerald-50 opacity-90">Thank you for your purchase from SpiceNest.</p>
        </div>

        <div className="p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Order Info */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Package size={22} className="mr-2 text-emerald-600" /> Order Summary
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <span className="text-gray-500">Order ID</span>
                  <span className="font-bold text-gray-900">#{order?.id || '10001'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium text-gray-900 flex items-center">
                    <Calendar size={14} className="mr-1" /> {order ? new Date(order.createdAt).toLocaleDateString() : 'Today'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <span className="text-gray-500">Total Paid</span>
                  <span className="text-xl font-black text-emerald-600">₹{order?.totalAmount?.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="font-bold text-gray-900 mb-3">Items</h3>
                <div className="space-y-3">
                  {order?.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.product?.name} x {item.quantity}</span>
                      <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <MapPin size={22} className="mr-2 text-emerald-600" /> Shipping Details
              </h2>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                {order && order.address ? (() => {
                  try {
                    const addr = JSON.parse(order.address);
                    return (
                      <>
                        <p className="font-bold text-gray-900 mb-1">{addr.fullName}</p>
                        <p className="text-gray-600 mb-1">{addr.houseNo}, {addr.area}</p>
                        <p className="text-gray-600 mb-1">{addr.city}, {addr.state} - {addr.pincode}</p>
                        <p className="text-gray-900 font-medium mt-3 text-sm">Phone: {addr.mobileNumber}</p>
                      </>
                    );
                  } catch (e) {
                    return <p className="text-gray-600">{order.address}</p>;
                  }
                })() : (
                  <p className="text-gray-500 italic">Address info unavailable</p>
                )}
              </div>
              
              <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-emerald-800 text-sm leading-relaxed">
                  <strong>Note:</strong> You will receive a tracking link via email once your spices are shipped from the farm.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link to="/shop" className="inline-block bg-gray-900 text-white font-bold py-4 px-10 rounded-full hover:bg-black transition-all shadow-lg hover:scale-105">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
