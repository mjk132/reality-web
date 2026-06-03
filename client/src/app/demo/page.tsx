'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLES = [
  { key: 'OWNER', label: 'Owner & Founder', color: '#FF6B00', desc: 'Full system access — RBAC, MDT, Ledger, Whitelist' },
  { key: 'HIGH_MANAGEMENT', label: 'High-Management', color: '#FF4444', desc: 'Management Ledger, Appeal Review, all admin panels' },
  { key: 'DIRECTOR', label: 'Director', color: '#3b82f6', desc: 'Case edit/delete, management access' },
  { key: 'ORGANIZER', label: 'Organizer', color: '#22c55e', desc: 'Event management, staff tools' },
  { key: 'STAFF', label: 'Staff', color: '#a855f7', desc: 'Basic moderation, whitelist review' },
  { key: 'CITIZEN', label: 'Citizen', color: '#666', desc: 'Dashboard, Garage, Marketplace, Economy map' },
];

export default function DemoLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleDemoLogin(role: string) {
    setLoading(role);
    setError('');

    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('reality_token', data.token);
      localStorage.setItem('reality_user', JSON.stringify(data.user));

      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-carbon-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            <span className="text-gradient">Reality</span> Demo
          </h1>
          <p className="text-sm text-gray-600">Sandbox environment — select a role to preview the portal</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg text-sm text-red-500"
            style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.2)' }}>
            {error}
          </div>
        )}

        <div className="space-y-3">
          {ROLES.map((role) => (
            <button key={role.key}
              onClick={() => handleDemoLogin(role.key)}
              disabled={loading !== null}
              className="w-full glass-panel p-4 text-left transition-all duration-300 hover:border-glow disabled:opacity-40 group"
              style={{ borderLeft: `3px solid ${role.color}` }}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{role.label}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                      style={{ background: `${role.color}15`, color: role.color, border: `1px solid ${role.color}30` }}>
                      {role.key}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{role.desc}</p>
                </div>
                <span className="text-sm font-mono transition-transform group-hover:translate-x-1" style={{ color: role.color }}>
                  {loading === role.key ? '...' : '→'}
                </span>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-gray-800 mt-8 font-mono">
          DEMO MODE · All data is simulated · No real Discord OAuth
        </p>
      </div>
    </main>
  );
}
