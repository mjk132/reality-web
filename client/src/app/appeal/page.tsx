'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AppealStatus {
  id: number;
  citizenid: string;
  banReason: string;
  banAdmin: string;
  banDuration: string;
  videoUrl: string | null;
  statement: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'DENIED';
  reviewedAt: string | null;
  createdAt: string;
}

export default function AppealPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [statement, setStatement] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error' | 'info'>('info');
  const [currentAppeal, setCurrentAppeal] = useState<AppealStatus | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('reality_token');
    if (!t) { router.push('/'); return; }
    setToken(t);
    checkExistingAppeal(t);
  }, [router]);

  async function checkExistingAppeal(t: string) {
    try {
      const res = await fetch('/api/appeal/status', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentAppeal(data);
      }
    } catch { /* no appeal yet */ }
    finally { setChecking(false); }
  }

  async function handleSubmit() {
    if (!videoUrl.trim() || !statement.trim()) return;
    setSubmitting(true);
    setMessage('');

    try {
      const res = await fetch('/api/appeal/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ videoUrl: videoUrl.trim(), statement: statement.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');

      setMessage('Appeal submitted — routed to High-Management for review');
      setMsgType('success');
      checkExistingAppeal(token);
    } catch (e: any) {
      setMessage(e.message);
      setMsgType('error');
    } finally { setSubmitting(false); }
  }

  function getStatusDisplay(status: string) {
    switch (status) {
      case 'PENDING': return { label: 'Pending Review', color: '#FFA500' };
      case 'UNDER_REVIEW': return { label: 'Under Review', color: '#3b82f6' };
      case 'APPROVED': return { label: 'Approved', color: '#22c55e' };
      case 'DENIED': return { label: 'Denied', color: '#ef4444' };
      default: return { label: status, color: '#666' };
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div className="w-10 h-10 rounded-full" style={{ border: '2px solid rgba(255,0,0,0.3)', borderTopColor: '#FF0000', animation: 'spin 0.8s linear infinite' }} />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: '#0A0A0A',
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(255,0,0,0.05) 0%, transparent 60%)',
      }}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,0,0,0.1)', border: '2px solid rgba(255,0,0,0.2)' }}>
            <span className="text-2xl font-bold text-red-500">!</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2" style={{ textShadow: '0 0 20px rgba(255,0,0,0.3)' }}>
            ACCOUNT RESTRICTED
          </h1>
          <p className="text-sm text-gray-600" style={{ borderBottom: '1px solid rgba(255,0,0,0.1)', paddingBottom: '1rem' }}>
            Your account has been flagged by the system. Submit an appeal to regain access.
          </p>
        </div>

        {/* Existing Appeal */}
        {currentAppeal ? (
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(26,26,26,0.95)', border: '1px solid rgba(255,0,0,0.15)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Appeal Status</h2>
              <span className="text-xs px-3 py-1 rounded-full font-mono"
                style={{
                  background: `${getStatusDisplay(currentAppeal.status).color}15`,
                  color: getStatusDisplay(currentAppeal.status).color,
                  border: `1px solid ${getStatusDisplay(currentAppeal.status).color}30`,
                }}>
                {getStatusDisplay(currentAppeal.status).label}
              </span>
            </div>

            <div className="text-xs text-gray-600 mb-4 font-mono">
              Submitted {new Date(currentAppeal.createdAt).toLocaleDateString()}
            </div>

            <div className="space-y-3">
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-xs text-gray-700 mb-1">Evidence</p>
                {currentAppeal.videoUrl && (
                  <a href={currentAppeal.videoUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-fire hover:underline break-all">
                    {currentAppeal.videoUrl}
                  </a>
                )}
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-xs text-gray-700 mb-1">Statement</p>
                <p className="text-sm text-gray-400">{currentAppeal.statement}</p>
              </div>
            </div>

            {currentAppeal.reviewedAt && (
              <p className="text-xs text-gray-700 mt-4 font-mono">
                Reviewed: {new Date(currentAppeal.reviewedAt).toLocaleDateString()}
              </p>
            )}

            {currentAppeal.status === 'DENIED' && (
              <div className="mt-6">
                <p className="text-xs text-red-700 mb-4">Your appeal was denied. You may submit a new appeal with additional evidence.</p>
              </div>
            )}
          </div>
        ) : null}

        {/* Submit Appeal Form — show if no pending appeal */}
        {(!currentAppeal || currentAppeal.status === 'DENIED') && (
          <div className="rounded-2xl p-6"
            style={{
              background: 'rgba(26,26,26,0.95)',
              border: '1px solid rgba(255,0,0,0.15)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
            <h2 className="text-sm font-semibold text-white mb-2">Submit Appeal</h2>
            <p className="text-xs text-gray-700 mb-6">
              Provide video evidence (YouTube or Medal) and a detailed explanation of your situation.
              Your appeal will be routed directly to High-Management.
            </p>

            {/* Ban Info */}
            <div className="rounded-xl p-3 mb-5" style={{ background: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,0,0,0.1)' }}>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-700">Reason</span>
                <span className="text-red-400 font-mono">Anti-Cheat / Staff Action</span>
              </div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-700">Duration</span>
                <span className="text-gray-400 font-mono">Permanent</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-700">Responsible</span>
                <span className="text-gray-400 font-mono">System / Staff</span>
              </div>
            </div>

            {message && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                msgType === 'success' ? 'text-green-500' : msgType === 'error' ? 'text-red-500' : 'text-orange-500'
              }`}
                style={{ background: msgType === 'error' ? 'rgba(255,0,0,0.1)' : msgType === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(255,165,0,0.1)', border: `1px solid ${msgType === 'error' ? 'rgba(255,0,0,0.2)' : msgType === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(255,165,0,0.2)'}` }}>
                {message}
              </div>
            )}

            <div className="space-y-4">
              {/* Video URL */}
              <div>
                <label className="block text-xs text-gray-700 mb-2 font-mono">Video Evidence (YouTube / Medal) *</label>
                <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://medal.tv/..."
                  className="w-full px-4 py-3 rounded-xl bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm transition-all"
                  style={{ borderColor: '#333' }} />
              </div>

              {/* Statement */}
              <div>
                <label className="block text-xs text-gray-700 mb-2 font-mono">Statement (minimum 50 characters) *</label>
                <textarea value={statement} onChange={(e) => setStatement(e.target.value)}
                  placeholder="Explain your situation in detail. What happened? Why should your appeal be accepted?"
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm resize-none transition-all"
                  style={{ borderColor: '#333' }} />
                <p className="text-xs text-gray-700 mt-1 font-mono">{statement.length}/50 min</p>
              </div>

              {/* Submit */}
              <button onClick={handleSubmit}
                disabled={submitting || !videoUrl.trim() || !statement.trim() || statement.length < 50}
                className="w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-30"
                style={{
                  background: 'linear-gradient(135deg, #FF0000, #CC0000)',
                  color: 'white',
                  boxShadow: '0 0 20px rgba(255,0,0,0.2)',
                }}>
                {submitting ? 'Submitting...' : 'Submit Appeal'}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-800 mt-6 font-mono">
          All appeals are encrypted and routed to High-Management only
        </p>
      </div>
    </main>
  );
}
