import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '../components/ProductCard';

const IMAGES = [
  '/images/homepage/homepage-bg1.jpg',
  '/images/homepage/homepage-bg2.jpg',
  '/images/homepage/homepage-bg3.jpg',
  '/images/homepage/homepage-bg4.jpg',
  '/images/homepage/homepage-bg5.jpg',
  '/images/homepage/homepage-bg6.jpg'
];

const FEATURES = [
  "Own Organic Farms",
  "Trusted by many",
  "Free Delivery Rs 500+",
  "4.90 / 5 Rating"
];

export default function Home() {
  const [currentImageIndex, setCurrentImageIndex] = useState(() => Math.floor(Math.random() * IMAGES.length));
  const [scrollY, setScrollY] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const collections = [
    {
      title: "Premium Whole Spices",
      subtitle: "Handpicked & Sun-dried",
      price: "₹ 250 / 100g",
      img: "/images/homepage/premium_whole_spices.jpg",
      shopUrl: "/shop",
      exploreUrl: "/shop",
      shopText: "Shop Spices",
    },
    {
      title: "Organic Powders",
      subtitle: "Freshly Ground",
      price: "₹ 150 / 100g",
      img: "/images/chilli powder/chilli powder.jpg",
      shopUrl: "/shop",
      exploreUrl: "/shop",
      shopText: "Shop Powders",
    },
    {
      title: "Others",
      subtitle: "Beverages & More",
      price: "₹ 250 / 100g",
      img: "/images/homepage/others.jpg",
      shopUrl: "/shop",
      exploreUrl: "/shop",
      shopText: "Shop Others",
    }
  ];

  // Infinite seamless carousel state for mobile/tablet collections
  const [carouselItems, setCarouselItems] = useState([0, 1, 2]);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [translateX, setTranslateX] = useState(0);

  const handleNextCollection = () => {
    if (translateX !== 0) return; // Prevent overlapping transitions
    setIsTransitioning(true);
    setTranslateX(-33.333); // Translate left by width of 1 card (33.333% of the 150% width track)
    setTimeout(() => {
      setIsTransitioning(false);
      setCarouselItems((prev) => {
        const next = [...prev];
        const first = next.shift();
        next.push(first);
        return next;
      });
      setTranslateX(0);
    }, 500);
  };

  const handlePrevCollection = () => {
    if (translateX !== 0) return; // Prevent overlapping transitions
    setIsTransitioning(false);
    setCarouselItems((prev) => {
      const next = [...prev];
      const last = next.pop();
      next.unshift(last);
      return next;
    });
    setTranslateX(-33.333);
    setTimeout(() => {
      setIsTransitioning(true);
      setTranslateX(0);
    }, 50);
  };

  // Auto-slide loop for infinite left-to-right swapping
  useEffect(() => {
    const interval = setInterval(() => {
      handleNextCollection();
    }, 4000);
    return () => clearInterval(interval);
  }, [translateX]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch products');
        return res.json();
      })
      .then((data) => {
        setFeaturedProducts(data.slice(0, 8));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching featured products:', err);
        setLoading(false);
      });
  }, []);

  // Handle the automatic image slider with dynamic reset on slide change
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % IMAGES.length);
    }, 5000); // Auto-slide every 5 seconds
    return () => clearInterval(interval);
  }, [currentImageIndex]);

  // Handle the scroll event for smooth, proportional shrinking
  useEffect(() => {
    const handleScroll = () => {
      requestAnimationFrame(() => {
        setScrollY(window.scrollY);
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate dynamic clip-path based on scroll position
  const maxScroll = 400; // The effect completes after 400px of scrolling
  const scrollProgress = Math.min(scrollY / maxScroll, 1); // Value between 0 and 1

  // We only shrink from left and right (0% to 4% margin)
  const insetX = scrollProgress * 4;
  // Border radius increases smoothly (0px to 48px)
  const borderRadius = scrollProgress * 48;

  return (
    // Outer wrapper with bg-gray-50 so when the hero shrinks, it reveals the clean background
    <div className="bg-gray-50 min-h-screen">
      <style>{`
        @keyframes progressFill {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-progress-fill {
          animation: progressFill 5000ms linear forwards;
        }
      `}</style>

      {/* The Hero Container that uses high-performance clip-path to shrink horizontally on scroll */}
      <div
        className="relative h-[290px] md:min-h-screen bg-gray-900 overflow-hidden font-sans"
        style={{
          clipPath: `inset(0% ${insetX}% 0% ${insetX}% round ${borderRadius}px)`
        }}
      >

        {/* Background Image Slider */}
        {IMAGES.map((img, index) => (
          <div
            key={img}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
          >
            <img
              src={img}
              alt="Lush Greenery"
              className="w-full h-full object-cover"
            />
            {/* Dark gradient overlay for text readability - lightened in the middle for a fresh, bright look */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/80" />
          </div>
        ))}

        {/* Top Vignette: Elegant shadow from top down to make floating navbar pop (softer and shallower on web) */}
        <div className="absolute top-0 inset-x-0 h-20 md:h-44 bg-gradient-to-b from-black/65 to-transparent pointer-events-none z-10" />

        {/* Main Content Area */}
        <div className="relative z-10 flex flex-col items-center justify-end md:justify-center h-full px-4 text-center pb-5 pt-14 md:pb-20 md:pt-0">

          {/* Soft, organic dark radial glow behind the text for superior contrast without shifting the text alignment */}
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-80 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.45)_0%,transparent_75%)] pointer-events-none -z-10 blur-3xl scale-125 hidden md:block" />

          <h1 className="text-2xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-4 max-w-7xl mx-auto leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]">
            Experience True <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300 relative inline-block">
              Natural Flavors
              {/* The signature Ather-style rounded highlight around the text */}
              <span className="absolute inset-0 border-2 border-emerald-400 rounded-[2rem] -m-2 opacity-60 md:-m-3 md:rounded-[3rem] pointer-events-none hidden md:block"></span>
            </span> <br className="hidden md:inline" /> from the farms of Idukki
          </h1>

          {/* Subtext (Reduced Size) */}
          <p className="text-xs md:text-xl text-gray-200 mb-6 max-w-2xl font-medium tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] leading-relaxed">
            Sustainably grown and carefully harvested from our lush estates in Idukki. Elevate your cooking with rich, unadulterated ingredients.
          </p>

          {/* Dual Buttons */}
          <div className="flex flex-row gap-3 items-center justify-center">
            <Link
              to="/shop"
              className="bg-white text-gray-900 hover:bg-gray-100 font-bold py-2 px-5 md:py-3 md:px-8 rounded-full transition-all duration-300 transform hover:scale-105 flex items-center shadow-xl text-xs md:text-base"
            >
              Shop Now <ArrowRight size={14} className="ml-1.5 text-emerald-600 md:size-[18px] md:ml-2" />
            </Link>
            <Link
              to="/shop"
              className="bg-black/30 backdrop-blur-md border border-white/30 text-white hover:bg-white/20 font-bold py-2 px-5 md:py-3 md:px-8 rounded-full transition-all duration-300 flex items-center shadow-lg text-xs md:text-base"
            >
              Explore Collection
            </Link>
          </div>
        </div>

        {/* Carousel Indicators (Zomato/Tesla/Ather style progress-bar indicators) */}
        <div className="absolute bottom-4 md:bottom-24 left-1/2 -translate-x-1/2 z-30 hidden md:flex items-center gap-2 md:gap-3">
          {IMAGES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className="h-[3px] w-10 md:w-14 rounded-full bg-white/20 overflow-hidden relative focus:outline-none group cursor-pointer transition-all duration-300 hover:bg-white/40"
              aria-label={`Go to slide ${index + 1}`}
            >
              <div
                className={`h-full rounded-full bg-white transition-all ${
                  index === currentImageIndex
                    ? 'animate-progress-fill'
                    : index < currentImageIndex
                      ? 'w-full opacity-60'
                      : 'w-0'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Ather-Style Bottom Feature Ticker */}
        <div className="absolute bottom-0 w-full bg-black/40 backdrop-blur-md border-t border-white/10 hidden md:block z-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center py-4">
              {FEATURES.map((feature, i) => (
                <div key={i} className="flex items-center text-gray-300 text-xs md:text-sm font-bold tracking-wide">
                  <CheckCircle2 size={16} className="text-emerald-400 mr-2" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Shopping Cards Section (Ather Style - Compact) */}
      <div className="bg-gray-50 py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 mb-8 md:mb-10 tracking-tight">
            The Idukki Origins Collection
          </h2>

          {/* Mobile/Tablet view: Shows 2 cards at a time, auto-swapping from left to right with navigation arrows */}
          <div className="relative md:hidden w-full px-5">
            <button
              onClick={handlePrevCollection}
              className="absolute -left-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white shadow-md border border-gray-100 hover:bg-gray-50 text-gray-700 active:scale-95 transition-all z-20"
              aria-label="Previous Collection"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="w-full overflow-hidden py-1 relative">
              <div
                className={`flex gap-2.5 w-[150%] ${isTransitioning ? 'transition-transform duration-500 ease-in-out' : ''}`}
                style={{
                  transform: `translateX(${translateX}%)`
                }}
              >
                {carouselItems.map((index) => {
                  const item = collections[index];
                  return (
                    <div
                      key={item.title}
                      className="w-[calc(33.333%-6.67px)] flex-shrink-0 relative group rounded-2xl overflow-hidden h-[220px] sm:h-[280px] shadow-md border border-gray-100/50 flex flex-col justify-between p-3.5 text-center transition-all transform hover:scale-[1.02]"
                    >
                      <img
                        src={item.img}
                        alt={item.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/15 to-black/85" />

                      <div className="relative z-10 mt-1">
                        <h3 className="text-sm sm:text-base font-black text-white leading-tight tracking-tight line-clamp-1">
                          {item.title}
                        </h3>
                        <span className="inline-block bg-white/20 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border border-white/20 shadow-sm mt-1.5">
                          {item.subtitle.split(" & ")[0]}
                        </span>
                      </div>

                      <div className="relative z-10 mb-1">
                        <p className="text-[10px] sm:text-xs text-gray-300 font-bold mb-0.5">Starting at</p>
                        <p className="text-white text-sm sm:text-base font-black mb-2.5">{item.price}</p>
                        <Link
                          to={item.shopUrl}
                          className="bg-white hover:bg-gray-100 text-gray-900 font-extrabold py-1.5 px-4 sm:py-2 sm:px-6 rounded-full transition-all text-[10px] sm:text-xs shadow-md inline-block"
                        >
                          Shop Now
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleNextCollection}
              className="absolute -right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white shadow-md border border-gray-100 hover:bg-gray-50 text-gray-700 active:scale-95 transition-all z-20"
              aria-label="Next Collection"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Desktop/Large View: Shows all 3 cards in full glory */}
          <div className="hidden md:grid md:grid-cols-3 gap-6">
            {collections.map((item) => (
              <div
                key={item.title}
                className="relative group rounded-3xl overflow-hidden h-[380px] md:h-[450px] shadow-lg border border-gray-100"
              >
                <img
                  src={item.img}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-black/80" />

                <div className="absolute inset-0 flex flex-col justify-between p-6 text-center">
                  <div className="mt-2">
                    <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">
                      {item.title}
                    </h3>
                    <span className="inline-block bg-white/20 backdrop-blur-md text-white text-[11px] md:text-xs font-bold px-4 py-1 rounded-full border border-white/20 shadow-sm">
                      {item.subtitle}
                    </span>
                  </div>

                  <div className="mb-2">
                    <p className="text-gray-300 text-xs font-bold mb-0.5">Prices starting at</p>
                    <p className="text-white text-lg md:text-xl font-bold mb-4">{item.price}</p>

                    <div className="flex flex-col sm:flex-row justify-center gap-2">
                      <Link
                        to={item.shopUrl}
                        className="bg-gray-100 hover:bg-white text-gray-900 font-bold py-2.5 px-6 rounded-full transition-all text-xs w-full sm:w-auto shadow-md transform hover:scale-105"
                      >
                        {item.shopText}
                      </Link>
                      <Link
                        to={item.exploreUrl}
                        className="bg-gray-950/80 hover:bg-black text-white font-bold py-2.5 px-6 rounded-full transition-all text-xs w-full sm:w-auto border border-gray-800 shadow-md transform hover:scale-105"
                      >
                        Explore Range
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Handpicked for You Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-between items-end mb-10">
          <div>
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1.5">Handpicked for You</p>
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Featured Spices</h2>
          </div>
          <Link 
            to="/shop" 
            className="text-xs font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest flex items-center px-5 py-2.5 bg-emerald-50 rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
          >
            View All <ArrowRight size={14} className="ml-2" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-80 shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
                <div className="bg-gray-200 h-48 rounded-xl mb-4 w-full"></div>
                <div className="bg-gray-200 h-5 rounded-md mb-2 w-3/4"></div>
                <div className="bg-gray-200 h-4 rounded-md w-1/2"></div>
              </div>
            ))}
          </div>
        ) : featuredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {featuredProducts.map((product, index) => (
                <div 
                  key={product.id} 
                  className={index >= 4 && !mobileExpanded ? "hidden lg:block" : "block"}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            {featuredProducts.length > 4 && (
              <div className="flex justify-center mt-8 lg:hidden">
                <button
                  onClick={() => setMobileExpanded(!mobileExpanded)}
                  className="text-xs font-black uppercase tracking-wider bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-6 py-3 rounded-full transition-all active:scale-95 shadow-sm border border-emerald-100/50 cursor-pointer"
                >
                  {mobileExpanded ? 'View Less' : 'View More Spices 🌶️'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-400 text-sm font-semibold">No featured spices available right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
