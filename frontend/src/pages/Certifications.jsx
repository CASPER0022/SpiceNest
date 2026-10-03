export default function Certifications() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-8">Our Certifications</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 mb-1">FSSAI Registration No.</p>
          <p className="text-xl font-extrabold text-gray-900 tracking-wide break-all">21326177000702</p>
          <p className="text-xs text-gray-500 mt-1">Food Safety and Standards Authority of India</p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 mb-1">GST Registration No. (GSTIN)</p>
          <p className="text-xl font-extrabold text-gray-900 tracking-wide break-all">32AGFPJ8946D1ZH</p>
          <p className="text-xs text-gray-500 mt-1">Goods and Services Tax, Kerala</p>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 mb-1">MSME (Udyam) Registration No.</p>
          <p className="text-xl font-extrabold text-gray-900 tracking-wide break-all">UDYAM-KL-03-0041531</p>
          <p className="text-xs text-gray-500 mt-1">Ministry of Micro, Small &amp; Medium Enterprises</p>
        </div>
      </div>
      <div className="prose prose-emerald max-w-none text-gray-600 leading-relaxed space-y-6">
        <p className="text-lg font-bold text-emerald-800">Pure & Sustainably Sourced 🌾</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Directly Sourced from Farmers</li>
          <li>Fair Prices Paid to Our Farmers</li>
          <li>Traditional Sun-dried & Carefully Packed</li>
        </ul>
      </div>
    </div>
  );
}
