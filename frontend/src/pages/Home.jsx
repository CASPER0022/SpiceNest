import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const IMAGES = [
  '/images/homepage/homepage-bg1.jpg',
  '/images/homepage/homepage-bg2.jpg',
  '/images/homepage/homepage-bg3.jpg',
];

const FEATURES = [
  "Own Organic Farms",
  "Trusted by many",
  "Free Delivery Rs 500+",
  "4.90 / 5 Rating"
];

export default function Home() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // Handle the automatic image slider
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % IMAGES.length);
    }, 5000); // Auto-slide every 5 seconds
    return () => clearInterval(interval);
  }, []);

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

      {/* The Hero Container that uses high-performance clip-path to shrink horizontally on scroll */}
      <div
        className="relative min-h-screen bg-gray-900 overflow-hidden font-sans"
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
        <div className="absolute top-0 inset-x-0 h-36 md:h-44 bg-gradient-to-b from-black/65 to-transparent pointer-events-none z-10" />

        {/* Main Content Area */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center pb-20">

          {/* Soft, organic dark radial glow behind the text for superior contrast without shifting the text alignment */}
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-80 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.45)_0%,transparent_75%)] pointer-events-none -z-10 blur-3xl scale-125" />

          {/* Ather-Style Heading (Reduced Size) */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-6 max-w-5xl leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]">
            Experience True <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300 relative inline-block">
              Natural Flavors
              {/* The signature Ather-style rounded highlight around the text */}
              <span className="absolute inset-0 border-2 border-emerald-400 rounded-[2rem] -m-2 opacity-60 md:-m-3 md:rounded-[3rem] pointer-events-none hidden md:block"></span>
            </span> straight from the farm.
          </h1>

          {/* Subtext (Reduced Size) */}
          <p className="text-base md:text-xl text-gray-200 mb-10 max-w-2xl font-medium tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            Sustainably grown and carefully harvested from our lush estates in Idukki. Elevate your cooking with rich, unadulterated ingredients.
          </p>

          {/* Dual Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Link
              to="/shop"
              className="bg-white text-gray-900 hover:bg-gray-100 font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 flex items-center shadow-xl text-sm md:text-base"
            >
              Shop Now <ArrowRight size={18} className="ml-2 text-emerald-600" />
            </Link>
            <Link
              to="/shop"
              className="bg-black/30 backdrop-blur-md border border-white/30 text-white hover:bg-white/20 font-bold py-3 px-8 rounded-full transition-all duration-300 flex items-center shadow-lg text-sm md:text-base"
            >
              Explore Collection
            </Link>
          </div>
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
      <div className="bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 mb-10 tracking-tight">
            The SpiceNest Collection
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Whole Spices */}
            <div className="relative group rounded-3xl overflow-hidden h-[380px] md:h-[450px] shadow-lg border border-gray-100">
              <img
                src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=2070&auto=format&fit=crop"
                alt="Whole Spices"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-black/80" />

              <div className="absolute inset-0 flex flex-col justify-between p-6 text-center">
                <div className="mt-2">
                  <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">Premium Whole Spices</h3>
                  <span className="inline-block bg-white/20 backdrop-blur-md text-white text-[11px] md:text-xs font-bold px-4 py-1 rounded-full border border-white/20 shadow-sm">
                    Handpicked & Sun-dried
                  </span>
                </div>

                <div className="mb-2">
                  <p className="text-gray-300 text-xs font-bold mb-0.5">Prices starting at</p>
                  <p className="text-white text-lg md:text-xl font-bold mb-4">₹ 250 / 100g</p>

                  <div className="flex flex-col sm:flex-row justify-center gap-2">
                    <Link to="/shop" className="bg-gray-100 hover:bg-white text-gray-900 font-bold py-2.5 px-6 rounded-full transition-all text-xs w-full sm:w-auto shadow-md transform hover:scale-105">
                      Shop Spices
                    </Link>
                    <Link to="/shop" className="bg-gray-950/80 hover:bg-black text-white font-bold py-2.5 px-6 rounded-full transition-all text-xs w-full sm:w-auto border border-gray-800 shadow-md transform hover:scale-105">
                      Explore Range
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Powders */}
            <div className="relative group rounded-3xl overflow-hidden h-[380px] md:h-[450px] shadow-lg border border-gray-100">
              <img
                src="https://images.unsplash.com/photo-1509358271058-acd22cc93898?q=80&w=2070&auto=format&fit=crop"
                alt="Organic Powders"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-black/80" />

              <div className="absolute inset-0 flex flex-col justify-between p-6 text-center">
                <div className="mt-2">
                  <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">Organic Powders</h3>
                  <span className="inline-block bg-white/20 backdrop-blur-md text-white text-[11px] md:text-xs font-bold px-4 py-1 rounded-full border border-white/20 shadow-sm">
                    Freshly Ground
                  </span>
                </div>

                <div className="mb-2">
                  <p className="text-gray-300 text-xs font-bold mb-0.5">Prices starting at</p>
                  <p className="text-white text-lg md:text-xl font-bold mb-4">₹ 150 / 100g</p>

                  <div className="flex flex-col sm:flex-row justify-center gap-2">
                    <Link to="/shop" className="bg-gray-100 hover:bg-white text-gray-900 font-bold py-2.5 px-6 rounded-full transition-all text-xs w-full sm:w-auto shadow-md transform hover:scale-105">
                      Shop Powders
                    </Link>
                    <Link to="/shop" className="bg-gray-950/80 hover:bg-black text-white font-bold py-2.5 px-6 rounded-full transition-all text-xs w-full sm:w-auto border border-gray-800 shadow-md transform hover:scale-105">
                      Explore Range
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
