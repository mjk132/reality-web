'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code received from Discord');
        return;
      }

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_URL}/api/auth/callback?code=${code}`);

        if (!response.ok) {
          const error = await response.json().catch(() => ({
            message: `HTTP ${response.status}`,
          }));
          throw new Error(error.message || 'Authentication failed');
        }

        const data = await response.json();

        // Store token in localStorage for SPA usage
        localStorage.setItem('reality_token', data.token);
        localStorage.setItem('reality_user', JSON.stringify(data.user));

        // Redirect to dashboard
        router.push('/dashboard');
      } catch (error) {
        setStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'Authentication failed',
        );
      }
    };

    handleCallback();
  }, [router]);

  return (
    <main className="min-h-screen bg-carbon-900 flex items-center justify-center px-6">
      <div className="glass-panel p-12 max-w-md w-full text-center">
        {status === 'processing' ? (
          <>
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{
                border: '2px solid rgba(255, 107, 0, 0.3)',
                borderTopColor: '#FF6B00',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <h2 className="text-xl font-semibold text-white mb-2">
              Authenticating
            </h2>
            <p className="text-sm text-gray-500">
              Verifying your Discord identity...
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-red-500 text-2xl">!</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Authentication Failed
            </h2>
            <p className="text-sm text-gray-500 mb-6">{errorMessage}</p>
            <button
              onClick={() => router.push('/')}
              className="text-fire hover:underline text-sm"
            >
              Return to login
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
