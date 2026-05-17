import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to request password reset');
      }

      setSuccess(true);
      toast.success('Reset link dispatched!', { icon: '📧' });
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-24 px-4 min-h-[75vh]">
      <div className="bg-white/80 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-xl border border-gray-100 w-full max-w-md transition-all duration-300">
        
        {!success ? (
          <>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2 text-center tracking-tight">
              Forgot Password?
            </h2>
            <p className="text-gray-500 text-sm mb-8 text-center">
              No worries! Enter your registered email address below, and we'll send you a secure link to reset your password.
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl mb-6 border border-red-100 text-center font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    required
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 focus:bg-white transition-all text-sm font-medium"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center disabled:opacity-75 disabled:pointer-events-none active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" /> Sending Reset Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="flex justify-center text-emerald-500 mb-6 animate-bounce">
              <CheckCircle2 size={64} strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
              Check Your Email
            </h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
              If an account exists with <span className="font-bold text-gray-800">{email}</span>, we have successfully dispatched a secure password reset link to your mailbox.
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="text-sm text-emerald-600 font-bold hover:underline mb-2 block w-full text-center"
            >
              Didn't receive email? Try again
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
          <Link
            to="/login"
            className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" /> Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
}
