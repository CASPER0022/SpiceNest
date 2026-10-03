export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-8">Contact Us</h1>
      <div className="prose prose-emerald max-w-none text-gray-600 leading-relaxed space-y-6">
        <p className="text-lg font-bold text-emerald-800">Get in Touch 📞</p>
        <div className="space-y-3 font-semibold text-gray-700">
          <p>📍 Location: Kanjikuzhy, Idukki, Kerala - 685606</p>
          <p>
            📞 Phone:{' '}
            <a href="tel:+918921663449" className="text-emerald-700 hover:underline">+91 8921663449</a>,{' '}
            <a href="tel:+919645425742" className="text-emerald-700 hover:underline">+91 9645425742</a>
          </p>
          <p>
            💬 WhatsApp:{' '}
            <a href="https://wa.me/918921663449" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">+91 8921663449</a>
          </p>
          <p>
            📧 Email:{' '}
            <a href="mailto:info.idukkiorigins@gmail.com" className="text-emerald-700 hover:underline break-all">info.idukkiorigins@gmail.com</a>
          </p>
          <p>
            📱 Follow us:{' '}
            <a href="https://www.instagram.com/idukkiorigins_com/" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">Instagram</a>
            {' · '}
            <a href="https://www.facebook.com/share/1Bnz5VSXGN/" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">Facebook</a>
          </p>
        </div>
      </div>
    </div>
  );
}
