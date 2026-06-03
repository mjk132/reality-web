'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  active: boolean;
  createdAt: string;
}

export default function AdminWhitelistPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ question: '', options: ['', ''], correctIndex: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('reality_token');
    if (!t) { router.push('/'); return; }
    setToken(t);
    fetchQuestions(t);
  }, [router]);

  async function fetchQuestions(t: string) {
    try {
      const res = await fetch('/api/whitelist/questions?all=true', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setQuestions(data.map((q: any) => ({ ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options })));
    } catch { setError('Failed to load questions'); }
    finally { setLoading(false); }
  }

  async function saveQuestion() {
    if (!form.question || form.options.some((o) => !o.trim())) {
      setError('All fields required');
      return;
    }

    setError('');
    const body = { question: form.question, options: form.options, correctIndex: form.correctIndex };

    try {
      const res = editingId
        ? await fetch(`/api/whitelist/questions/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
          })
        : await fetch('/api/whitelist/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
          });

      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }

      setForm({ question: '', options: ['', ''], correctIndex: 0 });
      setEditingId(null);
      fetchQuestions(token);
    } catch (e: any) { setError(e.message); }
  }

  async function deleteQuestion(id: number) {
    try {
      await fetch(`/api/whitelist/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchQuestions(token);
    } catch { setError('Delete failed'); }
  }

  function editQuestion(q: Question) {
    setEditingId(q.id);
    setForm({ question: q.question, options: q.options, correctIndex: q.correctIndex });
  }

  function addOption() {
    if (form.options.length < 6) setForm((p) => ({ ...p, options: [...p.options, ''] }));
  }

  function removeOption(idx: number) {
    if (form.options.length <= 2) return;
    setForm((p) => {
      const opts = p.options.filter((_, i) => i !== idx);
      return { ...p, options: opts, correctIndex: Math.min(p.correctIndex, opts.length - 1) };
    });
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
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Whitelist Questions</h1>
            <p className="text-sm text-gray-500 mt-1">Manage test questions</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/admin/ledger')}
              className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#999' }}>
              Ledger
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

        {/* Question Form */}
        <div className="glass-panel p-6 mb-8">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            {editingId ? 'Edit Question' : 'New Question'}
          </h3>
          <textarea
            value={form.question}
            onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))}
            placeholder="Enter your question..."
            className="w-full px-4 py-3 rounded-xl bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none mb-4 resize-none"
            rows={3}
          />
          <div className="space-y-2 mb-4">
            {form.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <button
                  onClick={() => setForm((p) => ({ ...p, correctIndex: idx }))}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono flex-shrink-0 transition-all"
                  style={{
                    background: form.correctIndex === idx ? '#FF6B00' : 'rgba(255,255,255,0.05)',
                    color: form.correctIndex === idx ? '#0D0D0D' : '#666',
                    border: `1px solid ${form.correctIndex === idx ? '#FF6B00' : 'rgba(255,255,255,0.1)'}`,
                  }}>
                  {String.fromCharCode(65 + idx)}
                </button>
                <input
                  value={opt}
                  onChange={(e) => {
                    const opts = [...form.options];
                    opts[idx] = e.target.value;
                    setForm((p) => ({ ...p, options: opts }));
                  }}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm"
                />
                {form.options.length > 2 && (
                  <button onClick={() => removeOption(idx)} className="text-red-500 text-xs hover:underline">Remove</button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {form.options.length < 6 && (
              <button onClick={addOption} className="text-xs text-fire hover:underline">+ Add Option</button>
            )}
            <div className="flex-1" />
            {editingId && (
              <button onClick={() => { setEditingId(null); setForm({ question: '', options: ['', ''], correctIndex: 0 }); }}
                className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-white transition-colors">
                Cancel
              </button>
            )}
            <button onClick={saveQuestion}
              className="px-5 py-2 rounded-lg text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, #FF6B00, #FFA500)',
                color: '#0D0D0D',
                boxShadow: '0 0 15px rgba(255,107,0,0.2)',
              }}>
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-3">
          {questions.length === 0 && (
            <div className="glass-panel p-8 text-center">
              <p className="text-gray-600 text-sm">No questions yet. Create your first question above.</p>
            </div>
          )}
          {questions.map((q) => (
            <div key={q.id} className="glass-panel p-5 transition-all" style={{ opacity: q.active ? 1 : 0.4 }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-gray-600">#{q.id}</span>
                    {!q.active && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,0,0,0.1)', color: '#ff4444' }}>Inactive</span>}
                  </div>
                  <p className="text-sm text-white mb-2">{q.question}</p>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 rounded"
                        style={{
                          background: idx === q.correctIndex ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.03)',
                          color: idx === q.correctIndex ? '#FF6B00' : '#888',
                          border: `1px solid ${idx === q.correctIndex ? 'rgba(255,107,0,0.2)' : 'rgba(255,255,255,0.05)'}`,
                        }}>
                        {String.fromCharCode(65 + idx)}: {opt}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => editQuestion(q)} className="text-xs text-gray-500 hover:text-fire transition-colors">Edit</button>
                  <button onClick={() => deleteQuestion(q.id)} className="text-xs text-gray-500 hover:text-red-500 transition-colors">Deactivate</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
