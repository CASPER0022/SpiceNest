import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, Star, Heart, Share2, Truck, ShieldCheck, Leaf, Plus, Minus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useViewed } from '../context/ViewedContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import toast from 'react-hot-toast';

const WEIGHT_OPTIONS = [
  { label: '100g', multiplier: 1.0, kg: 0.1 },
  { label: '250g', multiplier: 2.5, kg: 0.25 },
  { label: '500g', multiplier: 5.0, kg: 0.5 },
  { label: '1kg', multiplier: 10.0, kg: 1.0 },
];

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToViewed } = useViewed();
  const { user } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWeight, setSelectedWeight] = useState(WEIGHT_OPTIONS[0]);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(null);
  const { toggleWishlist, isInWishlist } = useWishlist();
  const productWishlisted = product ? isInWishlist(product.id) : false;

  const handleToggleWishlist = () => {
    if (product) {
      toggleWishlist(product);
    }
  };

  const [newRating, setNewRating] = useState(5);

  const handleShare = async () => {
    if (!product) return;
    const shareData = {
      title: product.name,
      text: `Check out ${product.name} on SpiceNest - direct from Western Ghats farms!`,
      url: window.location.href
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success('Shared successfully!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Product link copied to clipboard! 📋', {
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          }
        });
      } catch (err) {
        console.error('Failed to copy link:', err);
        toast.error('Could not copy link to clipboard.');
      }
    }
  };
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const existingReview = useMemo(() => {
    if (!product || !product.reviews || !user) return null;
    return product.reviews.find(r => r.userId === user.id);
  }, [product, user]);

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
    fetch(`${API_URL}/api/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Product not found');
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        if (data.images && data.images.length > 0) {
          setActiveImage(data.images[0]);
        }
        addToViewed(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, API_URL]);

  useEffect(() => {
    if (product && product.stock !== undefined) {
      // Find the first option that fits in stock
      const firstAvailable = WEIGHT_OPTIONS.find(opt => opt.kg <= product.stock);
      if (firstAvailable) {
        setSelectedWeight(firstAvailable);
      } else {
        setSelectedWeight(WEIGHT_OPTIONS[0]);
      }
    }
  }, [product]);

  useEffect(() => {
    if (product && product.stock !== undefined && selectedWeight) {
      const maxQty = Math.floor(product.stock / selectedWeight.kg);
      if (quantity > maxQty) {
        setQuantity(Math.max(1, maxQty));
      }
    }
  }, [selectedWeight, product]);

  const currentPrice = useMemo(() => {
    if (!product) return 0;
    return product.price * selectedWeight.multiplier;
  }, [product, selectedWeight]);

  const handleAddToCart = () => {
    // Add multiple times based on quantity, or adjust addToCart to accept quantity.
    // Since addToCart currently increments by 1, we can call it `quantity` times,
    // OR we can update CartContext. Wait, CartContext adds 1 by default. Let's add multiple if needed.
    // Actually, I can just call it once and then update quantity if needed, but the simplest way is a loop or update context.
    // Wait, addToCart in CartContext uses `{ ...product, cartItemId, weight, price: priceToUse, quantity: 1 }`
    // I can just add it once and then `updateQuantity` if quantity > 1.
    
    addToCart(product, selectedWeight.label, currentPrice);
    
    // Quick hack for multiple quantities since addToCart only adds 1
    if (quantity > 1) {
      // Need to find a way to update it. Since addToCart runs asynchronously with setState, 
      // it's tricky. Let's just add it 1 by 1.
      for(let i = 1; i < quantity; i++) {
         addToCart(product, selectedWeight.label, currentPrice);
      }
    }

    toast.success(`${quantity}x ${product.name} (${selectedWeight.label}) added to cart!`, {
      icon: '🛒',
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
    });
  };

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
          productId: product.id
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }
      
      toast.success('Thank you! Your review has been saved.');
      setNewComment('');
      
      // Reload product details to update reviews and calculated rating
      const updatedRes = await fetch(`${API_URL}/api/products/${id}`);
      if (updatedRes.ok) {
        const updatedProduct = await updatedRes.json();
        setProduct(updatedProduct);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Oops!</h2>
        <p className="text-red-500 mb-8">{error || 'Product not found'}</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
        
        {/* Left Column: Image */}
        <div className="space-y-4">
          <div className="aspect-w-4 aspect-h-3 bg-gray-100 rounded-3xl overflow-hidden shadow-lg border border-gray-100 relative group">
            <img 
              src={activeImage || (product.images && product.images[0]) || '/images/placeholder.jpg'} 
              alt={product.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          {/* Thumbnails */}
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {product.images?.map((img, i) => (
              <button 
                key={i} 
                onClick={() => setActiveImage(img)}
                className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 ${activeImage === img ? 'border-emerald-500' : 'border-transparent'} opacity-${activeImage === img ? '100' : '70'} hover:opacity-100 transition-opacity bg-gray-50`}
              >
                 <img 
                   src={img} 
                   alt={`${product.name} ${i + 1}`} 
                   className="w-full h-full object-cover"
                   onError={(e) => {
                     // Fallback to the first image if there's an error
                     if (i > 0 && product.images) e.target.src = product.images[0];
                   }}
                 />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="flex flex-col">
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
              {product.category}
            </span>
            <span className="px-3 py-1 text-emerald-600 text-[10px] font-bold rounded-full uppercase tracking-wider bg-emerald-50/50">
              Organic
            </span>
            {product.stock !== undefined && (
              product.stock >= 0.1 ? (
                <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-full border border-emerald-100 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  {product.stock.toFixed(2)} kg in stock
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 bg-rose-50 text-rose-700 text-[10px] font-extrabold rounded-full border border-rose-100 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse"></span>
                  Out of Stock
                </span>
              )
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 leading-tight">
            {product.name}
          </h1>

          <div className="flex items-center space-x-4 mb-6">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => {
                const isFilled = i < Math.round(product.rating);
                return (
                  <Star key={i} size={18} fill={isFilled ? "currentColor" : "none"} className={isFilled ? "" : "text-gray-300"} />
                );
              })}
            </div>
            <span className="text-sm font-bold text-gray-600">
              {product.rating ? product.rating.toFixed(1) : '0.0'} ({product.reviewsCount || 0} {product.reviewsCount === 1 ? 'review' : 'reviews'})
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
          </div>

          <div className="flex items-end space-x-4 mb-6">
            <span className="text-4xl font-black text-gray-900">₹{Math.round(currentPrice)}</span>
            <span className="text-lg text-gray-400 line-through font-medium pb-1">₹{Math.round(currentPrice * 1.1)}</span>
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded mb-1.5">10% OFF</span>
          </div>

          <p className="text-gray-600 mb-8 leading-relaxed">
            {product.description}
          </p>

          {/* Sourced By */}
          {product.farmer && (
            <div className="mb-8 p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between transition-all hover:shadow-md">
              <div className="flex items-center space-x-4">
                <img 
                  src={product.farmer.image || 'https://ui-avatars.com/api/?name=Farmer&background=10b981&color=fff&size=128'} 
                  alt={product.farmer.name} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" 
                  onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Farmer&background=10b981&color=fff&size=128' }}
                />
                <div>
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-0.5">from farmer</p>
                  <p className="text-gray-900 font-bold">{product.farmer.name}</p>
                </div>
              </div>
              <Link to={`/farmer/${product.farmer.id}`} className="text-sm bg-white border border-emerald-200 text-emerald-700 font-bold py-2 px-4 rounded-xl hover:bg-emerald-600 hover:text-white transition-colors">
                View Profile
              </Link>
            </div>
          )}

          {/* Weight Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Select Weight</h3>
            <div className="flex flex-wrap gap-2">
              {WEIGHT_OPTIONS.map((option) => {
                const isOptionDisabled = product.stock !== undefined && option.kg > product.stock;
                return (
                  <button
                    key={option.label}
                    disabled={isOptionDisabled}
                    onClick={() => setSelectedWeight(option)}
                    className={`flex flex-col items-center justify-center w-14 sm:w-16 py-1.5 border rounded-2xl transition-all ${
                      isOptionDisabled
                        ? 'bg-gray-50 border-gray-150 text-gray-300 cursor-not-allowed line-through opacity-50'
                        : selectedWeight.label === option.label 
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm shadow-emerald-600/5' 
                          : 'border-gray-200 text-gray-600 hover:border-emerald-300'
                    }`}
                  >
                    <span className="font-bold text-sm">{option.label}</span>
                    <span className="text-[10px] opacity-80">₹{Math.round(product.price * option.multiplier)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider opacity-60">Quantity</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 px-4 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors border-r border-gray-100"
                >
                  <Minus size={18} strokeWidth={2.5} />
                </button>
                <div className="w-12 text-center font-black text-gray-900 text-lg">
                  {quantity}
                </div>
                <button 
                  onClick={() => {
                    const nextQty = quantity + 1;
                    if (product.stock !== undefined && nextQty * selectedWeight.kg > product.stock) {
                      toast.error(`Cannot add more. Only ${product.stock.toFixed(2)} kg available in stock.`, {
                        style: {
                          borderRadius: '10px',
                          background: '#333',
                          color: '#fff',
                        }
                      });
                      return;
                    }
                    setQuantity(nextQty);
                  }}
                  className="p-3 px-4 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors border-l border-gray-100"
                >
                  <Plus size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {product.stock !== undefined && product.stock < 0.1 ? (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-150 text-rose-800 rounded-2xl text-center font-bold text-sm flex items-center justify-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              <span>Currently Out of Stock. Raju John is preparing the next fresh harvest! 🌿</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                onClick={handleAddToCart}
                disabled={product.stock !== undefined && (selectedWeight.kg * quantity > product.stock)}
                className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-emerald-700/20 active:scale-[0.98]"
              >
                <ShoppingCart size={18} className="mr-2" /> Add to Cart
              </button>
              <button 
                onClick={handleBuyNow}
                disabled={product.stock !== undefined && (selectedWeight.kg * quantity > product.stock)}
                className="bg-white hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed text-emerald-700 border border-gray-200 font-bold py-4 px-4 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-[0.98]"
              >
                <span className="mr-2 text-emerald-500">⚡</span> Buy Now
              </button>
            </div>
          )}

          {/* Meta Actions */}
          <div className="grid grid-cols-2 gap-3 mb-8">
              <button 
                onClick={handleToggleWishlist}
                className="flex items-center justify-center py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Heart size={18} className={`mr-2 ${productWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} /> 
                {productWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
              </button>
             <button 
               onClick={handleShare}
               className="flex items-center justify-center py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
             >
               <Share2 size={18} className="mr-2 text-gray-400" /> Share
             </button>
          </div>

          {/* Trust Badges */}
          <div className="space-y-2 mb-10">
            <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-100/50">
              <div className="flex items-center text-sm text-gray-700 font-semibold">
                <Truck size={18} className="text-emerald-600 mr-3 shrink-0" />
                <span>Free delivery on orders over ₹500</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-100/50">
              <div className="flex items-center text-sm text-gray-700 font-semibold">
                <ShieldCheck size={18} className="text-emerald-600 mr-3 shrink-0" />
                <span>100% quality guarantee</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-100/50">
              <div className="flex items-center text-sm text-gray-700 font-semibold">
                <Leaf size={18} className="text-emerald-600 mr-3 shrink-0" />
                <span>Certified organic product</span>
              </div>
              <span className="text-gray-400 text-xs">→</span>
            </div>
          </div>
          
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-8 border-t border-gray-200 pt-8">
        <h2 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Customer Reviews</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Reviews Stats Summary */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-lg flex flex-col justify-center items-center text-center h-fit">
            <span className="text-5xl font-black text-emerald-800 mb-2">
              {product.rating ? product.rating.toFixed(1) : '0.0'}
            </span>
            <div className="flex text-amber-400 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} fill={i < Math.round(product.rating) ? "currentColor" : "none"} className={i < Math.round(product.rating) ? "" : "text-gray-300"} />
              ))}
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Based on {product.reviewsCount || 0} {product.reviewsCount === 1 ? 'review' : 'reviews'}
            </span>
          </div>

          {/* Reviews List & Write Form */}
          <div className="lg:col-span-2 space-y-8" id="review-form-section">
            {/* Review Form */}
            {user ? (
              <form onSubmit={handleSubmitReview} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md space-y-5">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  {existingReview ? 'Edit Your Review' : 'Write a Review'}
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
                    placeholder="Share your experience with this premium spice..."
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
                <p className="text-sm font-bold text-emerald-800 mb-2">Want to review this spice?</p>
                <p className="text-xs text-emerald-600/90 mb-4">Please sign in to share your experience with other customers.</p>
                <Link to="/login" className="inline-block bg-white text-emerald-700 border border-emerald-200 font-bold py-2 px-6 rounded-xl hover:bg-emerald-600 hover:text-white hover:border-transparent transition-colors text-sm">
                  Sign In to Review
                </Link>
              </div>
            )}

            {/* Reviews List */}
            <div className="space-y-6">
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map((rev) => (
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
                  <p className="text-gray-400 text-sm font-semibold">No reviews yet for this product.</p>
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
