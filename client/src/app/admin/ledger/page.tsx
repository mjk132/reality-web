'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LedgerEntry {
  id: number;
  title: string;
  content: string;
  isEncrypted: boolean;
  pinned: boolean;
  authorId: string;
  signature: string;
  createdAt: string;
  updatedAt: string;
}

export default function ManagementLedgerPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [decryptedContent, setDecryptedContent] = useState('');
  const [decrypting, setDecrypting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState('');
  const [integrityResults, setIntegrityResults] = useState<any[] | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('reality_token');
    if (!t) { router.push('/'); return; }
    setToken(t);
    fetchEntries(t);
  }, [router]);

  async function fetchEntries(t: string) {
    try {
      const res = await fetch('/api/management/entries', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      setEntries(await res.json());
    } catch { setError('Failed to load ledger entries'); }
    finally { setLoading(false); }
  }

  async function viewEntry(id: number) {
    setDecrypting(true);
    setError('');
    try {
      const res = await fetch(`/api/management/entries/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to decrypt entry');
      const entry: LedgerEntry = await res.json();
      setSelectedEntry(entry);
      setDecryptedContent(entry.content);
    } catch (e: any) { setError(e.message); }
    finally { setDecrypting(false); }
  }

  async function createEntry() {
    if (!newTitle.trim() || !newContent.trim()) { setError('Title and content required'); return; }
    setError('');
    try {
      const res = await fetch('/api/management/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTitle, content: newContent }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setNewTitle('');
      setNewContent('');
      setShowNewForm(false);
      fetchEntries(token);
    } catch (e: any) { setError(e.message); }
  }

  async function togglePin(id: number) {
    try {
      await fetch(`/api/management/entries/${id}/toggle-pin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchEntries(token);
    } catch { setError('Failed to toggle pin'); }
  }

  async function deleteEntry(id: number) {
    try {
      await fetch(`/api/management/entries/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (selectedEntry?.id === id) { setSelectedEntry(null); setDecryptedContent(''); }
      fetchEntries(token);
    } catch { setError('Failed to delete'); }
  }

  async function verifyIntegrity() {
    try {
      const res = await fetch('/api/management/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIntegrityResults(await res.json());
    } catch { setError('Verification failed'); }
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
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Management Ledger</h1>
            <p className="text-sm text-gray-500 mt-1">Encrypted Operations Room</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={verifyIntegrity}
              className="px-4 py-2 rounded-lg text-xs font-mono transition-all"
              style={{ border: '1px solid rgba(255,107,0,0.2)', color: '#FF6B00', background: 'rgba(255,107,0,0.05)' }}>
              Verify Integrity
            </button>
            <button onClick={() => router.push('/admin/whitelist')}
              className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#999' }}>
              Questions
            </button>
            <button onClick={() => router.push('/dashboard')}
              className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#999' }}>
              Dashboard
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg text-sm" style={{ background: 'rgba(255,0,0,0.1)', color: '#ff4444', border: '1px solid rgba(255,0,0,0.2)' }}>
            {error}
          </div>
        )}

        {/* Integrity Results */}
        {integrityResults && (
          <div className="glass-panel p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Integrity Check</h3>
            <div className="space-y-1">
              {integrityResults.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-xs font-mono">
                  <span className={r.valid ? 'text-green-500' : 'text-red-500'}>{r.valid ? '✓' : '✕'}</span>
                  <span className="text-gray-600">Entry #{r.id}:</span>
                  <span className={r.valid ? 'text-green-500' : 'text-red-500'}>{r.message}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setIntegrityResults(null)} className="text-xs text-gray-600 hover:text-white mt-3 transition-colors">Clear</button>
          </div>
        )}

        <div className="flex gap-6">
          {/* Entry List */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Entries ({entries.length})
              </h3>
              <button onClick={() => setShowNewForm(!showNewForm)}
                className="text-xs text-fire hover:underline">
                {showNewForm ? 'Cancel' : '+ New Entry'}
              </button>
            </div>

            {showNewForm && (
              <div className="glass-panel p-5 mb-4">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Entry title..."
                  className="w-full px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none mb-3 text-sm"
                />
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Markdown content (will be encrypted)..."
                  className="w-full px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none mb-3 resize-none text-sm font-mono"
                  rows={6}
                />
                <button onClick={createEntry}
                  className="px-5 py-2 rounded-lg text-sm font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #FF6B00, #FFA500)',
                    color: '#0D0D0D',
                    boxShadow: '0 0 15px rgba(255,107,0,0.2)',
                  }}>
                  Encrypt & Save
                </button>
              </div>
            )}

            {entries.length === 0 && (
              <div className="glass-panel p-8 text-center">
                <p className="text-gray-600 text-sm">No ledger entries yet.</p>
              </div>
            )}

            {entries.map((entry) => (
              <div key={entry.id}
                onClick={() => viewEntry(entry.id)}
                className="glass-panel p-4 cursor-pointer transition-all hover:border-glow"
                style={{
                  borderLeft: entry.pinned ? '3px solid #FF6B00' : '1px solid rgba(255,255,255,0.05)',
                }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {entry.pinned && <span className="text-fire text-xs">📌</span>}
                    <span className="text-sm font-medium text-white truncate">{entry.title}</span>
                  </div>
                  <span className="text-xs text-gray-600 font-mono flex-shrink-0 ml-2">
                    {new Date(entry.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-700 font-mono">#{entry.id}</span>
                  <span className="text-xs text-gray-700">Encrypted</span>
                  <button onClick={(e) => { e.stopPropagation(); togglePin(entry.id); }}
                    className="text-xs text-gray-600 hover:text-fire transition-colors">
                    {entry.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                    className="text-xs text-gray-600 hover:text-red-500 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Detail View */}
          {selectedEntry && (
            <div className="w-96 glass-panel p-6 self-start sticky top-8" style={{ maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Decrypted View</h3>
                <button onClick={() => { setSelectedEntry(null); setDecryptedContent(''); }}
                  className="text-xs text-gray-600 hover:text-white">Close</button>
              </div>

              <h4 className="text-lg font-semibold text-white mb-1">{selectedEntry.title}</h4>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-700 font-mono">#{selectedEntry.id}</span>
                <span className="text-xs text-gray-700">Signed: {selectedEntry.signature.slice(0, 16)}...</span>
              </div>

              {decrypting ? (
                <div className="py-8 text-center">
                  <div className="w-8 h-8 mx-auto rounded-full" style={{ border: '2px solid rgba(255,107,0,0.3)', borderTopColor: '#FF6B00', animation: 'spin 0.8s linear infinite' }} />
                  <p className="text-xs text-gray-600 mt-3">Decrypting...</p>
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed"
                    style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {decryptedContent}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 text-xs text-gray-700 font-mono"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div>Author: {selectedEntry.authorId}</div>
                <div>Created: {new Date(selectedEntry.createdAt).toLocaleString()}</div>
                <div>Updated: {new Date(selectedEntry.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
