export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-12">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-amber-500">SpiceNest</h2>
            <p className="mt-2 text-gray-400 text-sm">Premium spices from around the world.</p>
          </div>
          <div className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} SpiceNest. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
