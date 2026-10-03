import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, MapPin, LogOut, Package, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import AddressForm from '../components/AddressForm';
import { addressError } from '../utils/address';
import { matchIndianState } from '../utils/indianStates';
import { normalizeIndianMobile } from '../utils/phone';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const EMPTY_ADDRESS = { fullName: '', mobileNumber: '', email: '', pincode: '', houseNo: '', area: '', landmark: '', city: '', state: '' };

// The saved address as form fields (older saves may be plain text or use other state spellings)
function savedAddressFields(user) {
  let saved = {};
  try {
    const parsed = typeof user.address === 'string' ? JSON.parse(user.address) : user.address;
    if (parsed && typeof parsed === 'object') saved = parsed;
  } catch {
    saved = user.address ? { houseNo: String(user.address) } : {};
  }
  return {
    ...EMPTY_ADDRESS,
    fullName: user.name || '',
    email: user.email || '',
    ...saved,
    mobileNumber: normalizeIndianMobile(saved.mobileNumber) || '',
    state: matchIndianState(saved.state)
  };
}

export default function Profile() {
  const { user, loading: authLoading, logout, updateAddress } = useAuth();
  const navigate = useNavigate();
  // Address being edited in the Shipping Details card (null when not editing)
  const [addressDraft, setAddressDraft] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);

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

  // Saved address as display lines: name / house, area / landmark / city, state - PIN / phone
  const addressLines = (address) => {
    if (!address) return [];
    try {
      const a = typeof address === 'string' ? JSON.parse(address) : address;
      if (a && typeof a === 'object') {
        return [
          a.fullName,
          [a.houseNo, a.area].filter(Boolean).join(', '),
          a.landmark ? `Near ${a.landmark}` : '',
          [a.city, [a.state, a.pincode].filter(Boolean).join(' - '), 'India'].filter(Boolean).join(', '),
          a.mobileNumber ? `Phone: ${a.mobileNumber}` : ''
        ].filter(Boolean);
      }
    } catch {
      // Older saves were plain text
    }
    return [String(address)];
  };

  const handleSaveAddress = async () => {
    const problem = addressError(addressDraft);
    if (problem) {
      toast.error(problem);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Your session has expired. Please log in again.');
      navigate('/login');
      return;
    }
    setSavingAddress(true);
    try {
      const addressString = JSON.stringify({ ...addressDraft, mobileNumber: normalizeIndianMobile(addressDraft.mobileNumber) });
      const res = await fetch(`${API_URL}/api/auth/update-address`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ address: addressString })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save address');
      updateAddress(addressString);
      setAddressDraft(null);
      toast.success('Shipping address saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingAddress(false);
    }
  };

  const quickActions = [
    { icon: Package, label: 'My Orders', desc: 'Track & manage orders', color: 'text-blue-600', bg: 'bg-blue-50', path: '/orders' },
    { icon: Heart, label: 'Wishlist', desc: 'Items you loved', color: 'text-red-600', bg: 'bg-red-50', path: '/wishlist' },
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                {addressDraft === null && (
                  <button
                    onClick={() => setAddressDraft(savedAddressFields(user))}
                    className="text-[10px] font-black text-emerald-600 uppercase border border-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    {user.address ? 'Change' : 'Add address'}
                  </button>
                )}
              </div>

              {addressDraft !== null ? (
                /* Edit the saved address (used to pre-fill checkout) */
                <div className="max-w-xl">
                  <AddressForm value={addressDraft} onChange={setAddressDraft} />
                  <div className="flex justify-end gap-3 mt-5">
                    <button
                      onClick={() => setAddressDraft(null)}
                      disabled={savingAddress}
                      className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAddress}
                      disabled={savingAddress}
                      className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {savingAddress ? 'Saving...' : 'Save address'}
                    </button>
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                   <div className="flex items-start">
                     <div className="p-2.5 bg-gray-50 rounded-xl mr-4 text-gray-400">
                       <MapPin size={20} />
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Primary Address</p>
                       {addressLines(user.address).length > 0 ? (
                         <div className="text-sm text-gray-700 font-bold leading-relaxed max-w-xs">
                           {addressLines(user.address).map((line, i) => <p key={i}>{line}</p>)}
                         </div>
                       ) : (
                         <p className="text-sm text-gray-400 font-bold">No address saved yet</p>
                       )}
                     </div>
                   </div>
                </div>

                {/* The account's real sign-up month (sent by the server as createdAt) */}
                {user.createdAt && (
                  <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100/50">
                     <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">Member Since</p>
                     <p className="text-2xl font-black text-emerald-900">
                       {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                     </p>
                     <p className="text-xs text-emerald-600 mt-1 font-medium italic opacity-70">Thanks for choosing Idukki Origins</p>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>

        </div>

      </div>

      <div className="mt-12 text-center text-[10px] text-gray-400 uppercase font-black tracking-[0.3em] opacity-40">
        Idukki Origins Authentication System &bull; Secure User Profile &bull; v1.0.4
      </div>
    </div>
  );
}
