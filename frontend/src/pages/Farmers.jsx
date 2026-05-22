import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Award, ArrowRight, ShieldCheck, Heart } from 'lucide-react';

export default function Farmers() {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetch(`${API_URL}/api/farmers`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch farmers data');
        return res.json();
      })
      .then((data) => {
        setFarmers(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [API_URL]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Error loading farmers</h2>
        <p className="text-red-500 mb-8">{error}</p>
        <Link to="/" className="text-emerald-600 font-bold hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Decorative Top Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Banner with glassmorphism */}
      <div className="relative overflow-hidden py-16 md:py-24 bg-emerald-950 text-white">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1500937386664-56d15943747f?w=1600&q=80" 
            alt="Lush Farm Canopy" 
            className="w-full h-full object-cover opacity-20 filter brightness-75 scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-emerald-950/80 to-emerald-950" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center space-x-2 bg-emerald-800/40 backdrop-blur-md border border-emerald-700/50 px-4 py-1.5 rounded-full mb-6">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span className="text-xs font-bold tracking-wider uppercase text-emerald-100">100% Direct Trade model</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
            Meet Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-300">Spice Farmers</span>
          </h1>
          <p className="text-lg md:text-xl text-emerald-100/90 max-w-3xl mx-auto font-medium leading-relaxed">
            We bypass middlemen to connect you directly with local family growers in Kerala. By choosing SpiceNest, you ensure farmers receive fair wages and support sustainable agriculture.
          </p>
        </div>
      </div>

      {/* Farmers Grid Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {farmers.map((farmer) => (
            <Link 
              key={farmer.id} 
              to={`/farmer/${farmer.id}`}
              className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between"
            >
              <div>
                {/* Farmer Image Banner */}
                <div className="h-44 relative overflow-hidden bg-gray-100">
                  <img 
                    src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80" 
                    alt="Farm Lands" 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  
                  {/* Floating Rating Badge */}
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md text-amber-600 font-extrabold text-xs px-3.5 py-1.5 rounded-full border border-amber-100 shadow-md flex items-center gap-1">
                    <Star fill="currentColor" size={14} />
                    {farmer.rating}
                  </div>
                </div>

                {/* Farmer Profile Headshot & Details */}
                <div className="px-6 pb-6 relative">
                  <div className="flex justify-between items-end -mt-12 mb-4">
                    <img 
                      src={farmer.image || 'https://ui-avatars.com/api/?name=Farmer&background=10b981&color=fff&size=256'} 
                      alt={farmer.name} 
                      className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg object-cover bg-white relative z-10"
                      onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Farmer&background=10b981&color=fff&size=256' }}
                    />
                    
                    <div className="flex items-center text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                      <MapPin size={12} className="text-emerald-600 mr-1" />
                      Kerala, India
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-gray-900 group-hover:text-emerald-700 transition-colors mb-2 tracking-tight">
                    {farmer.name}
                  </h3>
                  
                  {/* Supplies label */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {farmer.products && farmer.products.map(p => (
                      <span key={p.id} className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-0.5 rounded-full">
                        {p.name}
                      </span>
                    ))}
                    {(!farmer.products || farmer.products.length === 0) && (
                      <span className="text-[10px] font-bold bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">
                        Organic Spices
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 font-semibold leading-relaxed line-clamp-3">
                    {farmer.about}
                  </p>
                </div>
              </div>

              {/* Action Footer */}
              <div className="px-6 py-5 border-t border-gray-50 bg-gray-50/50 flex justify-between items-center group-hover:bg-emerald-50/30 transition-colors">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-700 group-hover:text-emerald-800 flex items-center gap-1">
                  View Profile & Harvest <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </span>
                <Heart size={16} className="text-gray-300 group-hover:text-red-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
