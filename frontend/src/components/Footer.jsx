import { Mail, MapPin, Phone, Clock, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const socialIconClass = "w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors duration-300 text-[10px] font-bold";

  return (
    <footer className="bg-[#0c120c] text-white pt-16 pb-8 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          
          {/* Column 1: Logo & About */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full border-2 border-emerald-500 flex items-center justify-center p-1">
                <div className="w-full h-full rounded-full bg-emerald-500/20 flex items-center justify-center font-black text-xs text-emerald-500">SN</div>
              </div>
              <div>
                <h2 className="text-lg font-black tracking-widest uppercase leading-tight">SpiceNest</h2>
                <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Premium Spices</p>
              </div>
            </div>
            
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Premium organic spices from the lush farms of Wayanad, Kerala. Every spice is handpicked and processed with care to bring nature's best to your kitchen.
            </p>
            
            <div className="flex space-x-3 pt-2">
              <a href="#" className={socialIconClass}>FB</a>
              <a href="#" className={socialIconClass}>IG</a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors duration-300">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </a>
              <a href="#" className={socialIconClass}>YT</a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-white tracking-tight">Quick Links</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link to="/" className="hover:text-emerald-500 transition-colors">Home</Link></li>
              <li><Link to="/shop" className="hover:text-emerald-500 transition-colors">All Products</Link></li>
              <li><Link to="/shop?category=Whole" className="hover:text-emerald-500 transition-colors">Whole Spices</Link></li>
              <li><Link to="/shop?category=Ground" className="hover:text-emerald-500 transition-colors">Ground Spices</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Customer Reviews</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Certifications</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">About Us</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Blog</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Gallery</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Track Order</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Column 3: Customer Support */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-white tracking-tight">Customer Support</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Shipping Policy</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Cancellation & Return</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Refund Policy</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Privacy Policy</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Terms & Conditions</Link></li>
            </ul>
          </div>

          {/* Column 4: Contact Us */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-white tracking-tight">Contact Us</h3>
            <ul className="space-y-5 text-sm text-gray-400">
              <li className="flex items-start">
                <MapPin size={20} className="mr-3 text-emerald-500 shrink-0" />
                <span>Karunalayam, Cheekallore, Kaniyambetta, Kalpetta, Wayanad, Kerala - 673 121</span>
              </li>
              <li className="flex items-center">
                <Phone size={20} className="mr-3 text-emerald-500 shrink-0" />
                <div className="flex flex-col">
                  <span>+91 80-62689625</span>
                  <span>+91 9886 55 9991</span>
                </div>
              </li>
              <li className="flex items-center">
                <Mail size={20} className="mr-3 text-emerald-500 shrink-0" />
                <span>hello@wayanadcraft.com</span>
              </li>
              <li className="flex items-center">
                <Clock size={20} className="mr-3 text-emerald-500 shrink-0" />
                <span>Mon - Sat, 9AM - 5PM</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col items-center space-y-4 text-[13px] text-gray-500">
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
            <span>© {new Date().getFullYear()} SpiceNest. All rights reserved.</span>
            <span className="hidden md:inline text-gray-700">|</span>
            <span>PGS-India and NPOP Certified</span>
          </div>
          <div className="flex items-center">
            <span>Designed and Developed by</span>
            <span className="ml-1 text-emerald-500 font-bold hover:underline cursor-pointer">theCoin</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
