import { Mail, MapPin, Phone, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const socialIconClass = "w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors duration-300";

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
              Premium organic spices from the lush farms of Idukki, Kerala. Every spice is handpicked and processed with care to bring nature's best to your kitchen.
            </p>
            
            <div className="flex space-x-3 pt-2">
              {/* Facebook */}
              <a href="#" className={socialIconClass}>
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              {/* Instagram */}
              <a href="#" className={socialIconClass}>
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              {/* WhatsApp */}
              <a href="#" className={socialIconClass}>
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </a>
              {/* YouTube */}
              <a href="#" className={socialIconClass}>
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.42 5.58a2.78 2.78 0 0 0 1.94 2c1.71.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.89 23 12 23 12s0-3.89-.42-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"></polygon></svg>
              </a>
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
                <span>Kanjikuzhy, Idukki, Kaniyambetta, Kalpetta, Wayanad, Kerala - 685 606</span>
              </li>
              <li className="flex items-center">
                <Phone size={20} className="mr-3 text-emerald-500 shrink-0" />
                <div className="flex flex-col">
                  <span>+91 8921663449</span>
                  <span>+91 9645425742</span>
                </div>
              </li>
              <li className="flex items-center">
                <Mail size={20} className="mr-3 text-emerald-500 shrink-0" />
                <span>heyitsmealbinjohn@gmail.com</span>
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
            <span>Certified</span>
          </div>
          <div className="flex items-center">
            <span>Designed and Developed by</span>
            <span className="ml-1 text-emerald-500 font-bold hover:underline cursor-pointer">Albin John</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
