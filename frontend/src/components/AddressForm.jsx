import { INDIAN_STATES, INDIAN_UNION_TERRITORIES } from '../utils/indianStates';
import { normalizeIndianMobile } from '../utils/phone';

const inputClass = 'w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none';

// Shipping address fields (India only). `value` holds the address fields; onChange gets the new object.
export default function AddressForm({ value, onChange }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  const mobile = value.mobileNumber || '';

  return (
    <div className="grid grid-cols-1 gap-3">
      <input type="text" placeholder="Full Name (Required)" value={value.fullName || ''} onChange={set('fullName')} autoComplete="name" className={inputClass} />
      <div>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="10-digit Mobile Number (Required)"
          value={mobile}
          onChange={(e) => {
            // Digits only; a pasted "+91 94467 20133" or "09446720133" becomes the 10 digits
            const digits = e.target.value.replace(/\D/g, '');
            onChange({ ...value, mobileNumber: digits.length > 10 ? (normalizeIndianMobile(digits) || digits.slice(0, 10)) : digits });
          }}
          className={`${inputClass} ${mobile.length === 10 && !normalizeIndianMobile(mobile) ? 'border-red-400' : ''}`}
        />
        {mobile.length === 10 && !normalizeIndianMobile(mobile) && (
          <p className="text-xs text-red-600 mt-1">Indian mobile numbers start with 6, 7, 8 or 9.</p>
        )}
      </div>
      <input type="email" placeholder="Email Address (Required)" value={value.email || ''} onChange={set('email')} autoComplete="email" className={inputClass} />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          inputMode="numeric"
          placeholder="PIN code (Required)"
          value={value.pincode || ''}
          onChange={(e) => onChange({ ...value, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
          autoComplete="postal-code"
          className={inputClass}
        />
        <input type="text" placeholder="City (Required)" value={value.city || ''} onChange={set('city')} autoComplete="address-level2" className={inputClass} />
      </div>
      <input type="text" placeholder="House No., Building Name (Required)" value={value.houseNo || ''} onChange={set('houseNo')} autoComplete="address-line1" className={inputClass} />
      <input type="text" placeholder="Road name, Area, Colony (Required)" value={value.area || ''} onChange={set('area')} autoComplete="address-line2" className={inputClass} />
      <div className="grid grid-cols-2 gap-3">
        <select
          aria-label="State (Required)"
          value={value.state || ''}
          onChange={set('state')}
          className={`${inputClass} bg-white ${value.state ? 'text-gray-900' : 'text-gray-400'}`}
        >
          <option value="" disabled>State (Required)</option>
          <optgroup label="States">
            {INDIAN_STATES.map((state) => <option key={state} value={state} className="text-gray-900">{state}</option>)}
          </optgroup>
          <optgroup label="Union Territories">
            {INDIAN_UNION_TERRITORIES.map((state) => <option key={state} value={state} className="text-gray-900">{state}</option>)}
          </optgroup>
        </select>
        {/* We only ship within India */}
        <select aria-label="Country" value="India" onChange={() => {}} className={`${inputClass} bg-white text-gray-900`}>
          <option value="India">India</option>
        </select>
      </div>
      <input type="text" placeholder="Landmark (Optional)" value={value.landmark || ''} onChange={set('landmark')} className={inputClass} />
    </div>
  );
}
