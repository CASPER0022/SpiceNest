import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, MapPin, LogOut, Package, Heart, Bell, Settings, Shield, CreditCard } from 'lucide-react';

export default function Profile() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 min-h-[70vh]">
        <div className="space-y-6 animate-pulse text-center">
          <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-6"></div>
          <div className="h-6 bg-gray-200 rounded-lg w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatAddress = (address) => {
    if (!address) return 'No address set yet';
    try {
      const addr = typeof address === 'string' ? JSON.parse(address) : address;
      if (typeof addr === 'object' && addr !== null) {
        return [
          addr.fullName,
          addr.mobileNumber,
          addr.pincode,
          addr.state,
          'India'
        ].filter(Boolean).join(', ');
      }
    } catch (e) {
      return address;
    }
    return address;
  };

  const quickActions = [
    { icon: Package, label: 'My Orders', desc: 'Track & manage orders', color: 'text-blue-600', bg: 'bg-blue-50', path: '/orders' },
    { icon: Heart, label: 'Wishlist', desc: 'Items you loved', color: 'text-red-600', bg: 'bg-red-50' },
    { icon: Bell, label: 'Notifications', desc: 'Updates & offers', color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const settingsItems = [
    { icon: User, label: 'Edit Profile' },
    { icon: CreditCard, label: 'Payment Methods' },
    { icon: Shield, label: 'Security & Privacy' },
    { icon: Settings, label: 'App Settings' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.5fr] gap-8">
        
        {/* Left Column: Sidebar Profile */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center lg:text-left">
            <div className="relative inline-block lg:block mb-6">
              <div className="w-24 h-24 lg:w-32 lg:h-32 bg-emerald-50 rounded-full flex items-center justify-center border-4 border-white shadow-xl mx-auto lg:mx-0">
                <User size={48} className="text-emerald-600" />
              </div>
              <div className="absolute bottom-1 right-1 lg:bottom-4 lg:right-2 w-6 h-6 lg:w-8 lg:h-8 bg-emerald-500 border-4 border-white rounded-full shadow-sm"></div>
            </div>
            
            <div className="space-y-1">
              <h1 className="text-2xl lg:text-3xl font-black text-gray-900 uppercase tracking-tight">{user.name}</h1>
              <p className="text-gray-500 text-sm flex items-center justify-center lg:justify-start">
                <Mail size={14} className="mr-2 opacity-60" /> {user.email}
              </p>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-50 space-y-2">
               {settingsItems.map((item, i) => (
                 <button key={i} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors text-gray-600 group">
                   <div className="flex items-center">
                     <item.icon size={18} className="mr-3 opacity-60 group-hover:text-emerald-600 group-hover:opacity-100 transition-all" />
                     <span className="text-sm font-bold uppercase tracking-widest text-[11px]">{item.label}</span>
                   </div>
                   <span className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                 </button>
               ))}
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-5 bg-white border border-red-50 text-red-600 font-bold rounded-2xl shadow-sm hover:bg-red-50 transition-all active:scale-[0.98]"
          >
            <LogOut size={18} className="mr-2" /> Logout Account
          </button>
        </div>

        {/* Right Column: Content Area */}
        <div className="space-y-8">
          
          {/* Quick Actions Grid */}
          <div>
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">Quick Access</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quickActions.map((item, i) => (
                <button key={i} onClick={() => item.path && navigate(item.path)} className="flex flex-col items-start p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 text-left group w-full">
                  <div className={`p-3 ${item.bg} ${item.color} rounded-2xl mb-4 group-hover:scale-110 transition-transform`}>
                    <item.icon size={24} />
                  </div>
                  <span className="text-sm font-black text-gray-900 uppercase tracking-tight mb-1">{item.label}</span>
                  <span className="text-xs text-gray-400 font-medium">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">Shipping Details</h3>
                <button className="text-[10px] font-black text-emerald-600 uppercase border border-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">Change</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                   <div className="flex items-start">
                     <div className="p-2.5 bg-gray-50 rounded-xl mr-4 text-gray-400">
                       <MapPin size={20} />
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Primary Address</p>
                       <p className="text-sm text-gray-700 font-bold leading-relaxed max-w-xs">
                         {formatAddress(user.address)}
                       </p>
                     </div>
                   </div>
                </div>

                <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100/50">
                   <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">Member Since</p>
                   <p className="text-2xl font-black text-emerald-900">May 2024</p>
                   <p className="text-xs text-emerald-600 mt-1 font-medium italic opacity-70">SpiceNest Premium Member</p>
                </div>
              </div>
            </div>
          </div>

          {/* Marketing/Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="p-8 bg-gray-900 rounded-3xl text-white relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2">Rewards</p>
                  <p className="text-3xl font-black mb-1">450 <span className="text-sm font-medium opacity-60">Points</span></p>
                  <p className="text-xs opacity-60 font-medium">Earn 50 more points for a ₹100 discount</p>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                   <Package size={120} />
                </div>
             </div>
             <div className="p-8 bg-emerald-600 rounded-3xl text-white relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em] mb-2">Invite Friends</p>
                  <p className="text-2xl font-black mb-2 leading-tight">Get ₹200 for every referral</p>
                  <button className="text-[10px] font-black bg-white text-emerald-700 px-4 py-2 rounded-xl uppercase shadow-lg">Copy Code</button>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-125 transition-transform duration-700 rotate-12">
                   <Heart size={120} />
                </div>
             </div>
          </div>

        </div>

      </div>

      <div className="mt-12 text-center text-[10px] text-gray-400 uppercase font-black tracking-[0.3em] opacity-40">
        SpiceNest Authentication System &bull; Secure User Profile &bull; v1.0.4
      </div>
    </div>
  );
}
