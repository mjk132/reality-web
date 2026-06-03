'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, AuthUser } from '@/lib/api';
import CitizenCard from '@/components/dashboard/CitizenCard';

interface CitizenProfile {
  citizenid: string;
  cash: number;
  bank: number;
  charinfo: { firstname: string; lastname: string; birthdate: string; nationality: string; phone: string } | null;
  licenses: { driver: boolean; weapon: boolean } | null;
  job: { name: string; label: string; grade: number; gradeName: string } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('reality_token');
    if (!token) { router.push('/'); return; }

    authApi.getMe(token)
      .then(setUser)
      .catch(() => { localStorage.removeItem('reality_token'); router.push('/'); return null; })
      .then((u) => {
        if (!u) return;
        return fetch(`/api/citizen/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then((res) => res?.json())
      .then((p) => setProfile(p))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = () => {
    const token = localStorage.getItem('reality_token');
    if (token) authApi.logout(token).catch(() => {});
    localStorage.removeItem('reality_token');
    localStorage.removeItem('reality_user');
    router.push('/');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-carbon-900 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full" style={{ border: '2px solid rgba(255,107,0,0.3)', borderTopColor: '#FF6B00', animation: 'spin 0.8s linear infinite' }} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-carbon-900">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.username || 'Player'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/garage')}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#999' }}>
              Garage
            </button>
            <button onClick={() => router.push('/marketplace')}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#999' }}>
              Marketplace
            </button>
            <button onClick={() => router.push('/economy')}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#999' }}>
              Economy
            </button>
            <button onClick={() => router.push('/mdt')}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{ border: '1px solid rgba(255,68,68,0.3)', color: '#FF4444', background: 'rgba(255,68,68,0.05)' }}>
              MDT
            </button>
            <span className="px-3 py-1 rounded-full text-xs font-mono"
              style={{ background: 'rgba(255,107,0,0.1)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.2)' }}>
              {user?.role || 'CITIZEN'}
            </span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-fire transition-colors">Logout</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Citizen Card */}
          <div className="lg:col-span-1">
            {profile ? (
              <CitizenCard data={profile} />
            ) : (
              <div className="glass-panel p-8 text-center">
                <p className="text-gray-600 text-sm mb-3">No FiveM character linked</p>
                {user?.citizenid && (
                  <p className="text-xs text-gray-700 font-mono">Linked ID: {user.citizenid}</p>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transfer Card */}
            {profile && (
              <div className="glass-panel p-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Bank Transfer</h3>
                <BankTransferForm token={localStorage.getItem('reality_token') || ''} />
              </div>
            )}

            {/* Portal Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PortalCard
                label="Garage"
                description="View and manage your vehicles"
                icon="🚗"
                onClick={() => router.push('/garage')}
              />
              <PortalCard
                label="Marketplace"
                description="Buy and sell vehicles"
                icon="🏪"
                onClick={() => router.push('/marketplace')}
              />
              <PortalCard
                label="Economy"
                description="Map of properties and businesses"
                icon="🗺️"
                onClick={() => router.push('/economy')}
              />
              <PortalCard
                label="MDT"
                description="Police law enforcement portal"
                icon="🔫"
                onClick={() => router.push('/mdt')}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function BankTransferForm({ token }: { token: string }) {
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleTransfer() {
    if (!target.trim() || !amount) return;
    setStatus('sending');
    setMessage('');

    try {
      const res = await fetch('/api/citizen/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetCitizenid: target.trim(), amount: parseInt(amount, 10) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Transfer failed');

      setStatus('success');
      setMessage(`Transferred $${amount} successfully`);
      setTarget('');
      setAmount('');
    } catch (e: any) {
      setStatus('error');
      setMessage(e.message);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <input value={target} onChange={(e) => setTarget(e.target.value)}
          placeholder="Recipient Citizen ID"
          className="flex-1 px-4 py-2.5 rounded-xl bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm" />
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          placeholder="Amount"
          className="w-full sm:w-40 px-4 py-2.5 rounded-xl bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm font-mono" />
        <button onClick={handleTransfer} disabled={status === 'sending' || !target || !amount}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
          style={{
            background: !target || !amount ? 'rgba(255,107,0,0.1)' : 'linear-gradient(135deg, #FF6B00, #FFA500)',
            color: !target || !amount ? '#666' : '#0D0D0D',
            boxShadow: target && amount ? '0 0 15px rgba(255,107,0,0.2)' : 'none',
          }}>
          {status === 'sending' ? 'Sending...' : 'Send'}
        </button>
      </div>
      {message && (
        <p className={`text-xs ${status === 'success' ? 'text-green-500' : 'text-red-500'}`}>{message}</p>
      )}
    </div>
  );
}

function PortalCard({ label, description, icon, onClick }: { label: string; description: string; icon: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="glass-panel p-5 text-left transition-all duration-300 hover:border-glow group">
      <span className="text-2xl mb-3 block">{icon}</span>
      <h4 className="text-sm font-semibold text-white mb-1 group-hover:text-fire transition-colors">{label}</h4>
      <p className="text-xs text-gray-600">{description}</p>
    </button>
  );
}
