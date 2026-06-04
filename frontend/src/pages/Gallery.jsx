export default function Gallery() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-8">Farm Gallery</h1>
      <div className="prose prose-emerald max-w-none text-gray-600 leading-relaxed space-y-6">
        <p className="text-lg font-bold text-emerald-800">Virtually Sourcing from the Western Ghats 📸</p>
        <p>[Placeholder Text: You can update this section in the Gallery.jsx page component later.]</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
          <div className="bg-gray-100 aspect-[4/3] rounded-2xl flex items-center justify-center text-gray-400 font-bold border border-dashed border-gray-300">
            [Image Placeholder 1]
          </div>
          <div className="bg-gray-100 aspect-[4/3] rounded-2xl flex items-center justify-center text-gray-400 font-bold border border-dashed border-gray-300">
            [Image Placeholder 2]
          </div>
        </div>
      </div>
    </div>
  );
}
