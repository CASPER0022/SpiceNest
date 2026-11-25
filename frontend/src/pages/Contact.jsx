import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRight, Building2, Check, ChevronDown, Copy, Mail, MapPin, MessageCircle, Navigation, Package, Phone, Send, Sprout, Tractor, Truck
} from 'lucide-react';
import usePageMeta from '../utils/usePageMeta';
import Reveal from '../components/Reveal';
import SiteImg from '../components/SiteImg';

const WHATSAPP = '918129074658';
const EMAIL = 'info.idukkiorigins@gmail.com';
const ADDRESS = 'Kanjikuzhy, Idukki, Kerala - 685606';
const MAP_QUERY = encodeURIComponent('Kanjikuzhy, Idukki, Kerala 685606');


const CHANNELS = [
  {
    id: 'whatsapp',
    icon: MessageCircle,
    title: 'WhatsApp',
    note: 'The quickest way to reach us',
    value: '+91 8129074658',
    href: `https://wa.me/${WHATSAPP}`,
    external: true,
    accent: 'bg-green-500'
  },
  {
    id: 'phone',
    icon: Phone,
    title: 'Call us',
    note: 'Talk to our team directly',
    value: '+91 8129074658',
    href: 'tel:+918129074658',
    accent: 'bg-emerald-600'
  },
  {
    id: 'email',
    icon: Mail,
    title: 'Email',
    note: 'For detailed or bulk enquiries',
    value: EMAIL,
    href: `mailto:${EMAIL}`,
    accent: 'bg-amber-500'
  },
  {
    id: 'visit',
    icon: MapPin,
    title: 'Find us',
    note: 'In the Cardamom Hills',
    value: ADDRESS,
    href: `https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`,
    external: true,
    accent: 'bg-sky-600'
  }
];

const TOPICS = [
  { id: 'order', icon: Package, label: 'An order', hint: 'Your order number helps us find it quickly.', subject: 'Question about my order' },
  { id: 'product', icon: Sprout, label: 'Our spices', hint: 'Ask about grades, freshness, storage or which spice suits a recipe.', subject: 'Question about your spices' },
  { id: 'bulk', icon: Building2, label: 'Bulk or business', hint: 'Tell us the spices, quantities and where they should be delivered.', subject: 'Bulk / business enquiry' },
  { id: 'farmer', icon: Tractor, label: 'Partner with us', hint: 'Are you an Idukki farmer? Tell us what you grow and where.', subject: 'Farmer partnership' },
  { id: 'other', icon: MessageCircle, label: 'Something else', hint: 'Feedback, ideas or anything else. We read every message.', subject: 'Hello from the website' }
];

const FAQS = [
  {
    q: 'How long does delivery take?',
    a: (
      <>
        We dispatch within 1–2 working days (Monday to Saturday). Delivery takes 1–10 days after dispatch depending on your location, through Delhivery, DTDC or
        India Post. See our <Link to="/shipping-policy" className="font-bold text-emerald-700 hover:underline">shipping policy</Link>.
      </>
    )
  },
  {
    q: 'Is shipping free?',
    a: 'Yes, on orders of ₹500 or more. Orders below ₹500 have a flat ₹100 shipping charge, shown in your cart before you pay.'
  },
  {
    q: 'Where is my order?',
    a: (
      <>
        Once your order ships, we email you the courier and tracking number. You can also follow it on the{' '}
        <Link to="/track-order" className="font-bold text-emerald-700 hover:underline">Track Order</Link> page or in{' '}
        <Link to="/orders" className="font-bold text-emerald-700 hover:underline">My Orders</Link>.
      </>
    )
  },
  {
    q: 'My package arrived damaged. What do I do?',
    a: (
      <>
        Message us within 7 days of delivery with photos of the package and the product, and we will send a replacement or a full refund. Details are in our{' '}
        <Link to="/cancellation-return" className="font-bold text-emerald-700 hover:underline">cancellation and return policy</Link>.
      </>
    )
  },
  {
    q: 'Do you supply in bulk to shops, restaurants or businesses?',
    a: 'Yes. Choose “Bulk or business” in the form above and tell us the spices and quantities you need, and we will get back to you with options.'
  },
  {
    q: 'I am a farmer in Idukki. Can I sell to you?',
    a: (
      <>
        We buy directly from local farmers. Choose “Partner with us” in the form, or meet some of our{' '}
        <Link to="/farmers" className="font-bold text-emerald-700 hover:underline">partner farmers</Link> first.
      </>
    )
  }
];

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy');
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-emerald-700 transition-colors"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function ChannelCard({ channel, delay }) {
  const Icon = channel.icon;
  return (
    <Reveal delay={delay} className="h-full">
      <div className="group relative h-full rounded-3xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <a
          href={channel.href}
          target={channel.external ? '_blank' : undefined}
          rel={channel.external ? 'noopener noreferrer' : undefined}
          className="absolute inset-0 rounded-3xl"
          aria-label={`${channel.title}: ${channel.value}`}
        />
        <div className={`w-12 h-12 rounded-2xl ${channel.accent} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="mt-4 text-lg font-black text-gray-900">{channel.title}</h3>
        <p className="text-sm text-gray-500">{channel.note}</p>
        <div className="relative mt-3 flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-emerald-800 [overflow-wrap:anywhere]">
            {channel.id === 'email' ? (
              <>
                {channel.value.split('@')[0]}
                <wbr />@{channel.value.split('@')[1]}
              </>
            ) : (
              channel.value
            )}
          </p>
          <CopyButton text={channel.value} label={channel.title === 'Find us' ? 'Address' : channel.title} />
        </div>
        {channel.extra && (
          <div className="relative flex items-center justify-between gap-2">
            <a href={channel.extra.href} className="text-sm font-bold text-emerald-800 hover:underline">
              {channel.extra.value}
            </a>
            <CopyButton text={channel.extra.value} label="Phone" />
          </div>
        )}
      </div>
    </Reveal>
  );
}

function MessageForm() {
  const [topic, setTopic] = useState(TOPICS[0].id);
  const [name, setName] = useState('');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const current = TOPICS.find((t) => t.id === topic);

  const compose = () => {
    const lines = [`Hi Idukki Origins, ${current.subject.toLowerCase()}.`];
    if (name.trim()) lines.push(`Name: ${name.trim()}`);
    if (topic === 'order' && orderId.trim()) lines.push(`Order: ${orderId.trim()}`);
    if (message.trim()) lines.push('', message.trim());
    return lines.join('\n');
  };

  const valid = message.trim().length > 0;

  const sendWhatsApp = () => {
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(compose())}`, '_blank', 'noopener,noreferrer');
  };
  const sendEmail = () => {
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(current.subject)}&body=${encodeURIComponent(compose())}`;
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) sendWhatsApp();
      }}
      className="rounded-3xl bg-white border border-gray-100 shadow-xl p-5 sm:p-8"
    >
      <p className="text-sm font-black text-gray-900">What would you like to talk about?</p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Topic">
        {TOPICS.map((t) => {
          const Icon = t.icon;
          const selected = t.id === topic;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTopic(t.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                selected ? 'border-emerald-700 bg-emerald-700 text-white shadow-md' : 'border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>
      <p key={topic} className="mt-3 text-sm text-gray-500 animate-[fadeIn_.4s_ease]">{current.hint}</p>

      <div className={`mt-5 grid gap-4 ${topic === 'order' ? 'sm:grid-cols-2' : ''}`}>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
            placeholder="Optional"
          />
        </label>
        {topic === 'order' && (
          <label className="block animate-[fadeIn_.4s_ease]">
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Order number</span>
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
              placeholder="If you have it"
            />
          </label>
        )}
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-black uppercase tracking-widest text-gray-500">Message</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={1500}
          required
          className="mt-1.5 w-full resize-y rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
          placeholder="Type your message here"
        />
      </label>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={!valid}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3.5 font-extrabold text-white shadow-md hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          <MessageCircle className="w-5 h-5" /> Send on WhatsApp
        </button>
        <button
          type="button"
          onClick={sendEmail}
          disabled={!valid}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-emerald-700 px-6 py-3.5 font-extrabold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          <Send className="w-5 h-5" /> Send by email
        </button>
      </div>
      <p className="mt-3 text-xs text-gray-400">Your message opens in WhatsApp or your email app, ready to send. Nothing is stored on this website.</p>
    </form>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="divide-y divide-gray-100 rounded-3xl bg-white border border-gray-100 shadow-sm">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 sm:px-6 py-5 text-left"
            >
              <span className={`font-black ${isOpen ? 'text-emerald-800' : 'text-gray-900'}`}>{item.q}</span>
              <ChevronDown className={`w-5 h-5 shrink-0 text-emerald-700 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-all duration-300 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <p className="px-5 sm:px-6 pb-5 text-gray-600 leading-relaxed">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Contact() {
  usePageMeta('Contact Us', 'Contact Idukki Origins, Kanjikuzhy, Idukki, Kerala: phone, WhatsApp and email for orders, bulk enquiries and farmer partnerships.');

  return (
    <div className="bg-gray-50 -mt-20 md:-mt-20">
      {/* Hero */}
      <section className="relative min-h-[62vh] flex items-end overflow-hidden bg-emerald-950 text-white">
        <SiteImg size="web"
          src="/images/homepage/homepage-bg2.jpg"
          alt="Spice hills of Idukki"
          className="absolute inset-0 w-full h-full object-cover opacity-55 scale-105 animate-[heroZoom_18s_ease-out_both]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/60 to-emerald-950/20" />
        <div className="relative max-w-6xl mx-auto w-full px-4 pt-36 pb-24 sm:pb-28">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-200 animate-[fadeIn_.6s_ease]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
            </span>
            We reply on WhatsApp
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] animate-[fadeIn_.8s_ease]">
            Let’s talk spices.
          </h1>
          <p className="mt-5 max-w-2xl text-lg sm:text-xl text-emerald-50/90 animate-[fadeIn_1s_ease]">
            A question about an order, a bulk enquiry, or just which pepper to buy? You will hear from the people who grow and pack your spices in Idukki.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-[fadeIn_1.2s_ease]">
            <a
              href={`https://wa.me/${WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-green-500 px-6 py-3 font-extrabold text-white hover:bg-green-600 transition-colors"
            >
              <MessageCircle className="w-5 h-5" /> Chat on WhatsApp
            </a>
            <a href="#message" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-extrabold text-white hover:bg-white/10 transition-colors">
              Write to us
            </a>
          </div>
        </div>
      </section>

      {/* Ways to reach us */}
      <section className="relative -mt-14 max-w-6xl mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CHANNELS.map((c, i) => (
            <ChannelCard key={c.id} channel={c} delay={i * 90} />
          ))}
        </div>
      </section>

      {/* Message form */}
      <section id="message" className="scroll-mt-24 max-w-6xl mx-auto px-4 pt-20 pb-10 grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-10 items-start">
        <Reveal>
          <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Send a message</p>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Tell us what you need</h2>
          <p className="mt-4 text-lg text-gray-600 leading-relaxed">
            Pick a topic, write a line or two, and send it on WhatsApp or by email. We put your details into the message so we can help you faster.
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: Truck, title: 'Track an order', text: 'Follow your parcel with its tracking number.', to: '/track-order' },
              { icon: Package, title: 'Returns and replacements', text: 'Damaged or wrong item? Report it within 7 days.', to: '/cancellation-return' },
              { icon: Tractor, title: 'Meet our farmers', text: 'The people behind your spices.', to: '/farmers' }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center gap-4 rounded-2xl bg-white border border-gray-100 p-4 hover:border-emerald-200 hover:shadow-md transition-all"
                >
                  <span className="w-11 h-11 shrink-0 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-black text-gray-900">{item.title}</span>
                    <span className="block text-sm text-gray-500">{item.text}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-emerald-700 transition-transform group-hover:translate-x-1" />
                </Link>
              );
            })}
          </div>
        </Reveal>
        <Reveal delay={150}>
          <MessageForm />
        </Reveal>
      </section>

      {/* Map */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-emerald-950 shadow-xl">
            <iframe
              title="Map of Kanjikuzhy, Idukki"
              src={`https://www.google.com/maps?q=${MAP_QUERY}&z=12&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block w-full h-[360px] sm:h-[440px] border-0"
            />
            <div className="absolute left-4 right-4 bottom-4 sm:left-6 sm:right-auto sm:bottom-6 sm:max-w-sm rounded-2xl bg-white/95 backdrop-blur p-5 shadow-lg">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Where we are</p>
              <p className="mt-1 text-lg font-black text-gray-900">Idukki Origins</p>
              <p className="text-sm text-gray-600">{ADDRESS}</p>
              <p className="mt-2 text-sm text-gray-500">Up in the Western Ghats, where our pepper, cardamom, nutmeg and cloves grow.</p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${MAP_QUERY}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-800 transition-colors"
              >
                <Navigation className="w-4 h-4" /> Get directions
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <Reveal>
          <div className="text-center mb-8">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2">Quick answers</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Before you write</h2>
          </div>
          <Faq />
        </Reveal>
      </section>

      {/* Social */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 px-6 py-12 sm:px-12 text-white">
            <SiteImg size="thumb" loading="lazy" src="/images/blog/cardamom-harvest.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-15" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="max-w-xl">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Follow life on the farm</h2>
                <p className="mt-3 text-emerald-50/85 text-lg">Harvests, curing, recipes and the people behind your spices, straight from Idukki.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://www.instagram.com/idukkiorigins_com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-extrabold text-emerald-800 hover:bg-emerald-50 transition-colors"
                >
                  Instagram <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="https://www.facebook.com/share/1Bnz5VSXGN/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-extrabold text-white hover:bg-white/10 transition-colors"
                >
                  Facebook <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
