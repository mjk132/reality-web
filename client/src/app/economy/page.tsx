'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Property {
  id: number;
  label: string;
  type: 'house' | 'business' | 'shop';
  price: number;
  owner: { citizenid: string; name: string } | null;
  position: { x: number; y: number; z: number };
}

interface Stats {
  totalProperties: number;
  ownedProperties: number;
  unownedProperties: number;
  totalValue: number;
  propertyTypes: Record<string, number>;
}

const TYPE_COLORS: Record<string, string> = {
  house: '#22c55e',
  business: '#FF6B00',
  shop: '#3b82f6',
};

const TYPE_LABELS: Record<string, string> = {
  house: 'Houses',
  business: 'Businesses',
  shop: 'Shops',
};

export default function EconomyPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [selected, setSelected] = useState<Property | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('reality_token');
    if (!token) { router.push('/'); return; }

    Promise.all([
      fetch('/api/economy/properties', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/economy/stats', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([props, s]) => { setProperties(props); setStats(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = filterType === 'all' ? properties : properties.filter((p) => p.type === filterType);

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Economy Map</h1>
            <p className="text-sm text-gray-500 mt-1">Real estate and business overview</p>
          </div>
          <button onClick={() => router.push('/dashboard')}
            className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#999' }}>
            Dashboard
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatBox label="Total Properties" value={stats.totalProperties.toString()} color="#999" />
            <StatBox label="Owned" value={stats.ownedProperties.toString()} color="#22c55e" />
            <StatBox label="Available" value={stats.unownedProperties.toString()} color="#FF6B00" />
            <StatBox label="Total Value" value={`$${stats.totalValue.toLocaleString()}`} color="#FFA500" />
          </div>
        )}

        {/* Type Filter */}
        <div className="flex gap-2 mb-6">
          {['all', 'house', 'business', 'shop'].map((type) => (
            <button key={type} onClick={() => setFilterType(type)}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filterType === type ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.03)',
                color: filterType === type ? '#FF6B00' : '#666',
                border: `1px solid ${filterType === type ? 'rgba(255,107,0,0.3)' : 'rgba(255,255,255,0.05)'}`,
              }}>
              {type === 'all' ? 'All' : TYPE_LABELS[type] || type}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Property List */}
          <div className="flex-1 space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            {filtered.length === 0 && (
              <div className="glass-panel p-8 text-center">
                <p className="text-gray-600 text-sm">No properties found.</p>
              </div>
            )}
            {filtered.map((p) => (
              <div key={p.id}
                onClick={() => setSelected(p)}
                className="glass-panel p-4 cursor-pointer transition-all hover:border-glow"
                style={{
                  borderLeft: `3px solid ${TYPE_COLORS[p.type] || '#333'}`,
                  borderColor: selected?.id === p.id ? '#FF6B00' : undefined,
                }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white">{p.label}</h3>
                    <p className="text-xs font-mono text-gray-700 mt-0.5">{p.type}</p>
                  </div>
                  <span className="text-sm font-bold text-gradient font-mono">${p.price.toLocaleString()}</span>
                </div>
                {p.owner ? (
                  <p className="text-xs text-gray-700 mt-2">Owned by {p.owner.name}</p>
                ) : (
                  <p className="text-xs text-fire mt-2">Available for purchase</p>
                )}
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="w-80 glass-panel p-5 self-start sticky top-0">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs px-2 py-1 rounded-full font-mono"
                  style={{ background: `${TYPE_COLORS[selected.type]}15`, color: TYPE_COLORS[selected.type], border: `1px solid ${TYPE_COLORS[selected.type]}30` }}>
                  {selected.type}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{selected.label}</h3>
              <div className="text-2xl font-bold text-gradient font-mono mb-4">${selected.price.toLocaleString()}</div>

              {selected.owner ? (
                <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-xs text-gray-600 mb-1">Owner</p>
                  <p className="text-sm text-white">{selected.owner.name}</p>
                  <p className="text-xs font-mono text-gray-700">{selected.owner.citizenid}</p>
                </div>
              ) : (
                <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,107,0,0.05)', border: '1px solid rgba(255,107,0,0.15)' }}>
                  <p className="text-sm text-fire">Unowned</p>
                  <p className="text-xs text-gray-600 mt-1">Available for purchase in-game</p>
                </div>
              )}

              {/* Mini Map Position */}
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-xs text-gray-600 mb-1">Position</p>
                <p className="text-xs font-mono text-gray-500">
                  X: {selected.position.x.toFixed(2)}
                  <br />Y: {selected.position.y.toFixed(2)}
                  <br />Z: {selected.position.z.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass-panel p-4">
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-xl font-bold font-mono" style={{ color }}>{value}</p>
    </div>
  );
}
