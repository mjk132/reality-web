'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Listing {
  id: number;
  plate: string;
  vehicle: string;
  price: number;
  sellerCitizenid: string;
  engine: number;
  body: number;
  fuel: number;
  listedAt: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('reality_token');
    if (!t) { router.push('/'); return; }
    setToken(t);
    fetchListings(t);
  }, [router]);

  async function fetchListings(t: string) {
    try {
      const res = await fetch('/api/garage/marketplace', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      setListings(await res.json());
    } catch { setMessage('Failed to load marketplace'); setMsgType('error'); }
    finally { setLoading(false); }
  }

  async function handleBuy(plate: string) {
    setPurchasing(plate);
    setMessage('');
    try {
      const res = await fetch('/api/garage/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage(`Vehicle ${plate} purchased!`);
      setMsgType('success');
      fetchListings(token);
    } catch (e: any) {
      setMessage(e.message);
      setMsgType('error');
    } finally { setPurchasing(null); }
  }

  function getHealthColor(value: number): string {
    if (value >= 800) return '#22c55e';
    if (value >= 500) return '#eab308';
    return '#ef4444';
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-carbon-900 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full" style={{ border: '2px solid rgba(255,107,0,0.3)', borderTopColor: '#FF6B00', animation: 'spin 0.8s linear infinite' }} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-carbon-900">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Vehicle Marketplace</h1>
            <p className="text-sm text-gray-500 mt-1">{listings.length} vehicle{listings.length !== 1 ? 's' : ''} for sale</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/garage')}
              className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#999' }}>
              My Garage
            </button>
            <button onClick={() => router.push('/dashboard')}
              className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#999' }}>
              Dashboard
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-3 rounded-lg text-sm ${msgType === 'error' ? 'text-red-500' : 'text-green-500'}`}
            style={{ background: msgType === 'error' ? 'rgba(255,0,0,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${msgType === 'error' ? 'rgba(255,0,0,0.2)' : 'rgba(34,197,94,0.2)'}` }}>
            {message}
          </div>
        )}

        {listings.length === 0 && (
          <div className="glass-panel p-12 text-center">
            <p className="text-gray-600 text-sm mb-2">No vehicles listed for sale.</p>
            <button onClick={() => router.push('/garage')} className="text-fire text-xs hover:underline">
              List a vehicle from your garage
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => (
            <div key={l.id} className="glass-panel p-5 transition-all hover:border-glow">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{l.vehicle}</h3>
                  <p className="text-xs font-mono text-gray-600 mt-0.5">{l.plate}</p>
                </div>
                <span className="text-sm font-bold text-gradient font-mono">${l.price.toLocaleString()}</span>
              </div>

              <div className="space-y-1.5 mb-4">
                <MiniBar label="Engine" value={l.engine} max={1000} color={getHealthColor(l.engine)} />
                <MiniBar label="Body" value={l.body} max={1000} color={getHealthColor(l.body)} />
                <MiniBar label="Fuel" value={l.fuel} max={100} color="#3b82f6" />
              </div>

              <div className="text-xs text-gray-700 font-mono mb-4 truncate">
                Seller: {l.sellerCitizenid.slice(0, 8)}...
              </div>

              <button
                onClick={() => handleBuy(l.plate)}
                disabled={purchasing === l.plate}
                className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #FF6B00, #FFA500)',
                  color: '#0D0D0D',
                  boxShadow: '0 0 15px rgba(255,107,0,0.2)',
                }}>
                {purchasing === l.plate ? 'Purchasing...' : 'Buy Now'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-700 font-mono w-12">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-carbon-700 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-gray-700 font-mono w-8 text-right">{pct}%</span>
    </div>
  );
}
