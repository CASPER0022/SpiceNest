import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Star, MapPin, Award } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function FarmerProfile() {
  const { id } = useParams();
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const existingReview = useMemo(() => {
    if (!farmer || !farmer.reviews || !user) return null;
    return farmer.reviews.find(r => r.userId === user.id);
  }, [farmer, user]);

  useEffect(() => {
    if (existingReview) {
      setNewRating(existingReview.rating);
      setNewComment(existingReview.comment);
    } else {
      setNewRating(5);
      setNewComment('');
    }
  }, [existingReview]);

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

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast.error('Please enter a comment.');
      return;
    }
    
    setSubmittingReview(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: newRating,
          comment: newComment,
          farmerId: farmer.id
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }
      
      toast.success('Thank you! Your review has been saved.');
      setNewComment('');
      
      // Reload farmer details to update reviews and rating
      const updatedRes = await fetch(`${API_URL}/api/farmers/${id}`);
      if (updatedRes.ok) {
        const updatedFarmer = await updatedRes.json();
        setFarmer(updatedFarmer);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

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
          <img src={farmer.id === 1 ? "/images/farmers/raju/farm1.jpg" : "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80"} alt="Farm Background" className="w-full h-full object-cover" />
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
                  {farmer.rating ? farmer.rating.toFixed(1) : '0.0'} ({farmer.reviewsCount || 0} {farmer.reviewsCount === 1 ? 'review' : 'reviews'})
                </span>
                <span className="text-gray-300">|</span>
                <button 
                  onClick={() => {
                    const element = document.getElementById('review-form-section');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="text-xs font-black text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer transition-all uppercase tracking-wider"
                >
                  {existingReview ? 'Edit Review' : 'Add Review'}
                </button>
                <span className="text-gray-300">|</span>
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
      <div className="mb-16">
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

      {/* Harvest & Farm Gallery */}
      {farmer.id === 1 && (
        <div className="mt-16 bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-gray-100 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight flex items-center">
              <span className="bg-emerald-50 text-emerald-800 p-2 rounded-xl mr-3 flex items-center justify-center border border-emerald-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </span>
              Harvest & Farm Gallery
            </h2>
            <p className="text-gray-500 font-semibold mb-8 text-sm max-w-2xl leading-relaxed">
              Take a virtual tour of Raju John's lush natural farming estates in Idukki, Kerala, where our premium spices are grown using 100% organic and sustainable traditions.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Farm Image 1 */}
              <div className="group relative rounded-2xl overflow-hidden shadow-md border border-gray-100 aspect-[4/3] bg-gray-50">
                <img 
                  src="/images/farmers/raju/farm1.jpg" 
                  alt="Raju John's Spices Cultivation" 
                  className="w-full h-full object-cover transition-transform duration-[1000ms] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 transition-opacity" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-emerald-50 px-2.5 py-1 rounded-full mb-2 inline-block">
                    Organic Estates
                  </span>
                  <h4 className="text-lg font-bold">Rainforest Spice Canopy</h4>
                  <p className="text-xs text-gray-200/90 font-medium mt-1">
                    Spices grown under the natural, biodiverse shade of Kerala's Western Ghats.
                  </p>
                </div>
              </div>

              {/* Farm Image 2 */}
              <div className="group relative rounded-2xl overflow-hidden shadow-md border border-gray-100 aspect-[4/3] bg-gray-50">
                <img 
                  src="/images/farmers/raju/farm2.jpg" 
                  alt="Harvesting Spices" 
                  className="w-full h-full object-cover transition-transform duration-[1000ms] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 transition-opacity" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-emerald-50 px-2.5 py-1 rounded-full mb-2 inline-block">
                    Traditional Harvest
                  </span>
                  <h4 className="text-lg font-bold">Traditional Handpicking</h4>
                  <p className="text-xs text-gray-200/90 font-medium mt-1">
                    Carefully selected and naturally sun-dried to lock in pure oils and rich aroma.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="mt-8 border-t border-gray-200 pt-8">
        <h2 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Farmer Reviews & Ratings</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Reviews Stats Summary */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-lg flex flex-col justify-center items-center text-center h-fit">
            <span className="text-5xl font-black text-emerald-800 mb-2">
              {farmer.rating ? farmer.rating.toFixed(1) : '0.0'}
            </span>
            <div className="flex text-amber-400 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} fill={i < Math.round(farmer.rating) ? "currentColor" : "none"} className={i < Math.round(farmer.rating) ? "" : "text-gray-300"} />
              ))}
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Based on {farmer.reviewsCount || 0} {farmer.reviewsCount === 1 ? 'review' : 'reviews'}
            </span>
          </div>

          {/* Reviews List & Form */}
          <div className="lg:col-span-2 space-y-8" id="review-form-section">
            {user ? (
              <form onSubmit={handleSubmitReview} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md space-y-5">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  {existingReview ? `Edit Your Review for ${farmer.name}` : `Write a Review for ${farmer.name}`}
                </h3>
                
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-bold text-gray-700">Your Rating:</span>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                      >
                        <Star size={24} fill={star <= newRating ? "currentColor" : "none"} className={star <= newRating ? "" : "text-gray-300"} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="comment" className="text-sm font-bold text-gray-700 block">Comments</label>
                  <textarea
                    id="comment"
                    rows={4}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={`Tell others about your experience sourcing spices from ${farmer.name}...`}
                    className="w-full rounded-2xl border border-gray-250 p-4 text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-450 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md active:scale-[0.98] text-sm cursor-pointer"
                >
                  {submittingReview ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
                </button>
              </form>
            ) : (
              <div className="bg-emerald-50/50 rounded-3xl p-6 sm:p-8 border border-emerald-100/50 text-center">
                <p className="text-sm font-bold text-emerald-800 mb-2">Want to review {farmer.name}?</p>
                <p className="text-xs text-emerald-600/90 mb-4">Please sign in to share your experience with other customers.</p>
                <Link to="/login" className="inline-block bg-white text-emerald-700 border border-emerald-200 font-bold py-2 px-6 rounded-xl hover:bg-emerald-600 hover:text-white hover:border-transparent transition-colors text-sm">
                  Sign In to Review
                </Link>
              </div>
            )}

            {/* Reviews List */}
            <div className="space-y-6">
              {farmer.reviews && farmer.reviews.length > 0 ? (
                farmer.reviews.map((rev) => (
                  <div key={rev.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm uppercase shrink-0">
                          {rev.user?.name ? rev.user.name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">{rev.user?.name || 'Anonymous User'}</p>
                          <div className="flex text-amber-400 mt-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={14} fill={i < rev.rating ? "currentColor" : "none"} className={i < rev.rating ? "" : "text-gray-300"} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-gray-400">
                        {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap pl-1">{rev.comment}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-400 text-sm font-semibold">No reviews yet for this farmer.</p>
                  <p className="text-gray-400 text-xs mt-1">Be the first to share your feedback!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
