import { useState, useEffect, useMemo } from 'react';
import { Search, RotateCcw, SlidersHorizontal, Star, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFarmer, setSelectedFarmer] = useState('All');
  const [priceRange, setPriceRange] = useState(500); // Max price limit
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('default');
  
  // Mobile drawer state
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to connect to the backend API');
        return res.json();
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Dynamically extract unique categories and farmers from products for filters
  const categories = useMemo(() => {
    const list = products.map(p => p.category);
    return ['All', ...new Set(list)];
  }, [products]);

  const farmers = useMemo(() => {
    const list = products.map(p => p.farmer?.name).filter(Boolean);
    return ['All', ...new Set(list)];
  }, [products]);

  const maxProductPrice = useMemo(() => {
    if (products.length === 0) return 500;
    return Math.max(...products.map(p => p.price));
  }, [products]);

  // Set initial price range limit once products are loaded
  useEffect(() => {
    if (products.length > 0) {
      setPriceRange(maxProductPrice);
    }
  }, [products, maxProductPrice]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedFarmer('All');
    setPriceRange(maxProductPrice);
    setMinRating(0);
    setSortBy('default');
  };

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        p => 
          p.name.toLowerCase().includes(query) || 
          p.description.toLowerCase().includes(query) ||
          (p.category && p.category.toLowerCase().includes(query))
      );
    }

    // Category
    if (selectedCategory !== 'All') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Farmer
    if (selectedFarmer !== 'All') {
      result = result.filter(p => p.farmer?.name === selectedFarmer);
    }

    // Price Limit
    result = result.filter(p => p.price <= priceRange);

    // Rating
    if (minRating > 0) {
      result = result.filter(p => (p.farmer?.rating || 0) >= minRating);
    }

    // Sorting
    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.farmer?.rating || 0) - (a.farmer?.rating || 0));
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, searchQuery, selectedCategory, selectedFarmer, priceRange, minRating, sortBy]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-20 text-xl text-red-500 font-bold">⚠️ Error: {error}</div>;
  }

  const FiltersContent = () => (
    <div className="space-y-6">
      {/* Category Section */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Categories</h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Farmer Filter Section */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Sourced From</h3>
        <div className="space-y-2">
          {farmers.map((farmer) => (
            <label key={farmer} className="flex items-center space-x-3 cursor-pointer text-gray-650 hover:text-gray-900 font-medium text-sm">
              <input
                type="radio"
                name="farmer"
                checked={selectedFarmer === farmer}
                onChange={() => setSelectedFarmer(farmer)}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <span>{farmer === 'All' ? 'All Farmers' : `Farmer ${farmer}`}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Slider Section */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Max Price</h3>
          <span className="text-sm font-black text-emerald-700">₹{priceRange}</span>
        </div>
        <input
          type="range"
          min="50"
          max={maxProductPrice || 500}
          value={priceRange}
          onChange={(e) => setPriceRange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />
        <div className="flex justify-between text-xs text-gray-400 font-bold mt-1">
          <span>₹50</span>
          <span>₹{maxProductPrice}</span>
        </div>
      </div>

      {/* Farmer Rating Filter */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Farmer Rating</h3>
        <div className="space-y-2">
          {[4, 4.5, 4.8].map((rating) => (
            <button
              key={rating}
              onClick={() => setMinRating(minRating === rating ? 0 : rating)}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                minRating === rating
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-sm'
                  : 'text-gray-600 border border-transparent hover:bg-gray-50'
              }`}
            >
              <div className="flex text-amber-400">
                <Star size={14} fill="currentColor" />
              </div>
              <span>{rating}+ Star Rating</span>
            </button>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={handleResetFilters}
        className="w-full flex items-center justify-center space-x-2 py-3 border-2 border-dashed border-gray-250 hover:border-emerald-500 text-gray-500 hover:text-emerald-700 font-bold rounded-2xl transition-all text-xs uppercase tracking-widest cursor-pointer"
      >
        <RotateCcw size={14} />
        <span>Reset Filters</span>
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-gray-150 pb-6">
        <div>
          <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Direct from Western Ghats</p>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">SpiceNest Store</h1>
        </div>
        
        {/* Search Bar & Sort combo */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search spices, powders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-250 focus:border-emerald-500 focus:outline-none transition-colors text-sm shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Sorting Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-gray-250 focus:border-emerald-500 focus:outline-none transition-colors text-sm font-semibold text-gray-700 bg-white shadow-sm cursor-pointer"
          >
            <option value="default">Sort: Default</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Farmer Rating</option>
            <option value="name">Alphabetical</option>
          </select>

          {/* Mobile Filter Button */}
          <button
            onClick={() => setIsMobileFiltersOpen(true)}
            className="md:hidden flex items-center justify-center space-x-2 px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-2xl transition-all shadow-sm text-sm"
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="flex gap-8 items-start">
        
        {/* Left Side: Desktop Filter Panel (Sticky) */}
        <aside className="hidden md:block w-64 shrink-0 bg-white border border-gray-100 shadow-xl rounded-3xl p-6 sticky top-24 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
            <span className="font-black text-gray-900 uppercase tracking-widest text-xs">Filter Products</span>
            <SlidersHorizontal size={14} className="text-gray-400" />
          </div>
          <FiltersContent />
        </aside>

        {/* Right Side: Products Grid */}
        <main className="flex-1">
          {/* Active Filter Tags */}
          {(selectedCategory !== 'All' || selectedFarmer !== 'All' || minRating > 0 || searchQuery) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2">Active filters:</span>
              
              {searchQuery && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-150 shadow-sm">
                  <span>Search: "{searchQuery}"</span>
                  <button onClick={() => setSearchQuery('')} className="hover:text-emerald-950"><X size={12} /></button>
                </span>
              )}
              {selectedCategory !== 'All' && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-150 shadow-sm">
                  <span>Category: {selectedCategory}</span>
                  <button onClick={() => setSelectedCategory('All')} className="hover:text-emerald-950"><X size={12} /></button>
                </span>
              )}
              {selectedFarmer !== 'All' && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-150 shadow-sm">
                  <span>Farmer: {selectedFarmer}</span>
                  <button onClick={() => setSelectedFarmer('All')} className="hover:text-emerald-950"><X size={12} /></button>
                </span>
              )}
              {minRating > 0 && (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-150 shadow-sm">
                  <span>Rating: {minRating}+</span>
                  <button onClick={() => setMinRating(0)} className="hover:text-emerald-950"><X size={12} /></button>
                </span>
              )}

              <button 
                onClick={handleResetFilters}
                className="text-xs font-black text-emerald-600 hover:text-emerald-800 hover:underline uppercase tracking-wider cursor-pointer ml-auto"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Results Summary */}
          <div className="flex justify-between items-center mb-6">
            <p className="text-sm font-semibold text-gray-500">
              Showing <span className="font-bold text-gray-900">{filteredProducts.length}</span> {filteredProducts.length === 1 ? 'product' : 'products'}
            </p>
          </div>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((spice) => (
                <ProductCard key={spice.id} product={spice} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400 text-lg font-bold">No matching spices found</p>
              <p className="text-gray-400 text-sm mt-1 mb-6">Try adjusting your filters or search keywords.</p>
              <button
                onClick={handleResetFilters}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full transition-all text-xs uppercase tracking-widest cursor-pointer shadow-lg active:scale-95"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Drawer Slide-out */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileFiltersOpen(false)} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md transform transition-all duration-300">
              <div className="h-full flex flex-col bg-white shadow-2xl rounded-l-3xl overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <h2 className="text-base font-black text-gray-900 uppercase tracking-widest">Filter Products</h2>
                  <button onClick={() => setIsMobileFiltersOpen(false)} className="text-gray-400 hover:text-gray-650">
                    <X size={20} />
                  </button>
                </div>
                {/* Content */}
                <div className="p-6">
                  <FiltersContent />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
