import { Mail, MapPin, Phone, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const socialIconClass = "w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10 hover:border-emerald-500 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-600/20 text-gray-400 hover:text-white transition-all duration-300";

  return (
    <footer className="bg-[#0b0f0b] text-white pt-20 pb-8 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        
        {/* Modern 5-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          
          {/* Column 1: Brand Sidebar */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full border-2 border-emerald-500 flex items-center justify-center p-1">
                <div className="w-full h-full rounded-full bg-emerald-500/20 flex items-center justify-center font-black text-xs text-emerald-500">IO</div>
              </div>
              <div>
                <h2 className="text-xl font-black tracking-widest uppercase leading-tight">Idukki Origins</h2>
                <p className="text-[10px] text-gray-500 font-black tracking-widest uppercase">Premium Spices</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Premium organic spices from the lush farms of Idukki, Kerala. Every spice is handpicked and processed with care to bring nature's best to your kitchen.
            </p>
            {/* Social Links */}
            <div className="flex space-x-3 pt-2">
              <a href="#" className={socialIconClass} aria-label="Facebook">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a href="#" className={socialIconClass} aria-label="Instagram">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="#" className={socialIconClass} aria-label="WhatsApp">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </a>
              <a href="#" className={socialIconClass} aria-label="YouTube">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.42 5.58a2.78 2.78 0 0 0 1.94 2c1.71.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.89 23 12 23 12s0-3.89-.42-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"></polygon></svg>
              </a>
            </div>
          </div>

          {/* Column 2: Explore */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest opacity-85">Shop Spices</h3>
            <ul className="space-y-3.5 text-sm text-gray-400">
              <li><Link to="/" className="hover:text-emerald-500 transition-colors">Home</Link></li>
              <li><Link to="/shop" className="hover:text-emerald-500 transition-colors">All Products</Link></li>
              <li><Link to="/shop?category=Whole" className="hover:text-emerald-500 transition-colors">Whole Spices</Link></li>
              <li><Link to="/shop?category=Ground" className="hover:text-emerald-500 transition-colors">Ground Spices</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Certifications</Link></li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest opacity-85">Our Company</h3>
            <ul className="space-y-3.5 text-sm text-gray-400">
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">About Us</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Customer Reviews</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Blog</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Gallery</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Column 4: Customer Support */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest opacity-85">Customer Support</h3>
            <ul className="space-y-3.5 text-sm text-gray-400">
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Shipping Policy</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Cancellation & Return</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Refund Policy</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Privacy Policy</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Terms & Conditions</Link></li>
              <li><Link to="#" className="hover:text-emerald-500 transition-colors">Track Order</Link></li>
            </ul>
          </div>

          {/* Column 5: Contact Us */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest opacity-85">Contact Us</h3>
            <div className="space-y-4">
              <div className="flex items-start text-sm text-gray-400">
                <MapPin size={18} className="mr-3 text-emerald-500 shrink-0 mt-0.5" />
                <span>Kanjikuzhy, Idukki, Kerala - 685606</span>
              </div>
              <div className="flex items-center text-sm text-gray-400">
                <Phone size={18} className="mr-3 text-emerald-500 shrink-0" />
                <span>+91 8921663449, +91 9645425742</span>
              </div>
              <div className="flex items-center text-sm text-gray-400">
                <Mail size={18} className="mr-3 text-emerald-500 shrink-0" />
                <span>heyitsmealbinjohn@gmail.com</span>
              </div>
              <div className="flex items-center text-sm text-gray-400">
                <Clock size={18} className="mr-3 text-emerald-500 shrink-0" />
                <span>Mon - Sat, 9AM - 5PM</span>
              </div>
            </div>
          </div>

        </div>

        {/* Centered and Enlarged Bottom Bar */}
        <div className="mt-20 pt-8 border-t border-white/5 flex flex-col items-center justify-center space-y-4 text-center text-gray-500">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 text-[13px]">
            <span>© {new Date().getFullYear()} Idukki Origins. All rights reserved.</span>
            <span className="hidden sm:inline text-gray-700">|</span>
            <span>Certified Spice Estate</span>
          </div>
          <div className="flex items-center justify-center space-x-1.5 pt-2 text-[14px]">
            <span className="text-gray-400">Designed & Developed by</span>
            <a 
              href="https://albinjohn.dev" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-emerald-500 font-extrabold hover:underline transition-colors"
            >
              Albin John
            </a>
          </div>
        </div>
        
      </div>
    </footer>
  );
}
