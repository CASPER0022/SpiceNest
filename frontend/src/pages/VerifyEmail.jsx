import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(token ? 'loading' : 'error'); // loading | success | error
  const [message, setMessage] = useState(token ? '' : 'Invalid verification link. Missing token.');
  const requested = useRef(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // The token is single-use; guard against React StrictMode running this effect twice.
    if (!token || requested.current) return;
    requested.current = true;

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Verification failed');
        setMessage(data.message || 'Email verified successfully!');
        setStatus('success');
      } catch (err) {
        setMessage(err.message);
        setStatus('error');
      }
    })();
  }, [token, API_URL]);

  return (
    <div className="flex justify-center items-center py-24 px-4 min-h-[60vh]">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="text-emerald-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Verifying your email...</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 size={56} className="text-emerald-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link to="/login" className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg">
              Go to Login
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle size={56} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link to="/login" className="text-emerald-600 hover:underline font-semibold">
              Back to Login to request a new link
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
