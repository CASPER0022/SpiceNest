import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Star, MapPin, Award } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function FarmerProfile() {
  const { id } = useParams();
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetch(`${API_URL}/api/farmers/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Farmer not found');
        return res.json();
      })
      .then((data) => {
        setFarmer(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, API_URL]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !farmer) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Oops!</h2>
        <p className="text-red-500 mb-8">{error || 'Farmer not found'}</p>
        <Link to="/shop" className="text-emerald-600 font-bold hover:underline">
          ← Back to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/shop" className="inline-flex items-center text-sm text-gray-600 hover:text-emerald-600 font-medium mb-8 transition-colors">
        <ChevronLeft size={16} className="mr-1" /> Back to Shop
      </Link>

      {/* Farmer Header */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-12 border border-gray-100">
        <div className="h-48 md:h-64 bg-emerald-700 relative">
          <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80" alt="Farm Background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        <div className="px-6 sm:px-10 pb-10 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end mb-6">
            <img 
              src={farmer.image || 'https://ui-avatars.com/api/?name=Raju+John&background=10b981&color=fff&size=256'} 
              alt={farmer.name} 
              className="w-40 h-40 rounded-full border-4 border-white shadow-lg object-cover bg-white relative z-10 -mt-20 sm:-mt-24"
              onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Farmer&background=10b981&color=fff&size=256' }}
            />
            <div className="sm:ml-8 mt-4 sm:mt-0 sm:pb-4 text-center sm:text-left">
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">{farmer.name}</h1>
              <div className="flex items-center justify-center sm:justify-start space-x-4 mt-2">
                <span className="flex items-center text-amber-500 font-bold">
                  <Star fill="currentColor" size={18} className="mr-1" />
                  {farmer.rating} Rating
                </span>
                <span className="flex items-center text-gray-600">
                  <MapPin size={16} className="mr-1" />
                  Kerala, India
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 border-t pt-8 border-gray-100">
            <div className="md:col-span-2 space-y-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Award size={20} className="mr-2 text-emerald-600" />
                About the Farmer
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {farmer.about}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-4">Farmer Highlights</h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2">✓</span>
                  100% Organic Farming Practices
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2">✓</span>
                  Fair Trade Certified
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-500 mr-2">✓</span>
                  Hand-picked & Sun-dried
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Farmer's Products */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Spices by {farmer.name}</h2>
        {farmer.products && farmer.products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {farmer.products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No products available from this farmer yet.</p>
        )}
      </div>
    </div>
  );
}
