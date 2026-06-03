'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Vehicle {
  plate: string;
  vehicle: string;
  hash: number;
  fuel: number;
  engine: number;
  body: number;
  state: 'garaged' | 'out';
  mods: Record<string, any>;
}

export default function GaragePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [sellPlate, setSellPlate] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const t = localStorage.getItem('reality_token');
    if (!t) { router.push('/'); return; }
    setToken(t);
    fetchVehicles(t);
  }, [router]);

  async function fetchVehicles(t: string) {
    try {
      const res = await fetch('/api/garage/vehicles', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      setVehicles(await res.json());
    } catch {
      setMessage('Failed to load vehicles');
      setMsgType('error');
    } finally { setLoading(false); }
  }

  async function handleListForSale(plate: string) {
    const price = parseInt(sellPrice, 10);
    if (!price || price <= 0) { setMessage('Invalid price'); setMsgType('error'); return; }

    try {
      const res = await fetch('/api/garage/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plate, price }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage(`Vehicle listed for $${price.toLocaleString()}`);
      setMsgType('success');
      setSellPlate('');
      setSellPrice('');
      fetchVehicles(token);
    } catch (e: any) {
      setMessage(e.message);
      setMsgType('error');
    }
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
            <h1 className="text-2xl font-bold text-white">Garage</h1>
            <p className="text-sm text-gray-500 mt-1">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/marketplace')}
              className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#999' }}>
              Marketplace
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

        {vehicles.length === 0 && (
          <div className="glass-panel p-12 text-center">
            <p className="text-gray-600 text-sm">No vehicles found.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicles.map((v) => (
            <div key={v.plate} className="glass-panel p-5 transition-all hover:border-glow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{v.vehicle}</h3>
                  <p className="text-xs font-mono text-gray-600 mt-0.5">{v.plate}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-mono ${v.state === 'garaged' ? 'text-green-500' : 'text-yellow-500'}`}
                  style={{ background: v.state === 'garaged' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)', border: `1px solid ${v.state === 'garaged' ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)'}` }}>
                  {v.state}
                </span>
              </div>

              {/* Health bars */}
              <div className="space-y-2 mb-4">
                <HealthBar label="Engine" value={v.engine} max={1000} color={getHealthColor(v.engine)} />
                <HealthBar label="Body" value={v.body} max={1000} color={getHealthColor(v.body)} />
                <HealthBar label="Fuel" value={v.fuel} max={100} color="#3b82f6" />
              </div>

              {/* Sell controls */}
              {sellPlate === v.plate ? (
                <div className="flex gap-2">
                  <input value={sellPrice} onChange={(e) => setSellPrice(e.target.value.replace(/\D/g, ''))}
                    placeholder="Price"
                    className="flex-1 px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm font-mono"
                    autoFocus />
                  <button onClick={() => handleListForSale(v.plate)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: 'linear-gradient(135deg, #FF6B00, #FFA500)', color: '#0D0D0D', boxShadow: '0 0 10px rgba(255,107,0,0.2)' }}>
                    List
                  </button>
                  <button onClick={() => { setSellPlate(''); setSellPrice(''); }}
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#666' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => { setSellPlate(v.plate); setSellPrice(''); }}
                  className="w-full py-2 rounded-lg text-xs font-medium transition-all"
                  style={{ border: '1px solid rgba(255,107,0,0.2)', color: '#FF6B00', background: 'rgba(255,107,0,0.05)' }}>
                  List for Sale
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function HealthBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-600 font-mono">{label}</span>
        <span className="text-gray-500 font-mono">{pct}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-carbon-700 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
