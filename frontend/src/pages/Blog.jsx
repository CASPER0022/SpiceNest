export default function Blog() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-8">Our Blog</h1>
      <div className="prose prose-emerald max-w-none text-gray-600 leading-relaxed space-y-6">
        <p className="text-lg font-bold text-emerald-800">Stories from the Spice Estates 📝</p>
        <p>[Placeholder Text: You can update this section in the Blog.jsx page component later.]</p>
        <div className="border-l-4 border-emerald-500 pl-4 py-1">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Coming Soon: The Secrets of Harvesting Green Cardamom</h2>
          <p className="text-xs text-gray-400 font-bold mb-2">June 4, 2026</p>
          <p className="text-sm">Stay tuned for our first article highlighting Raju John's traditional drying techniques...</p>
        </div>
      </div>
    </div>
  );
}
