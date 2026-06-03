'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Question {
  id: number;
  question: string;
  options: string[];
}

interface TestSession {
  testId: number;
  questions: Question[];
  totalQuestions: number;
}

interface TestResult {
  passed: boolean;
  score: number;
  total: number;
  percentage: number;
  cooldownUntil: string | null;
  discordRoleAssigned: boolean;
  licenseActivated: boolean;
}

type Phase = 'idle' | 'cooldown' | 'citizenid' | 'loading' | 'test' | 'result';

export default function WhitelistPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<TestSession | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<TestResult | null>(null);
  const [cooldown, setCooldown] = useState<{ remainingSeconds: number } | null>(null);
  const [citizenid, setCitizenid] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('reality_token');
    if (!t) { router.push('/'); return; }
    setToken(t);
    checkCooldown(t);
  }, [router]);

  async function checkCooldown(t: string) {
    try {
      const res = await fetch('/api/whitelist/cooldown', {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (data.isOnCooldown) {
        setCooldown({ remainingSeconds: data.remainingSeconds });
        setPhase('cooldown');
      } else {
        setPhase('citizenid');
      }
    } catch {
      setPhase('idle');
    }
  }

  const startTest = useCallback(async () => {
    if (!citizenid.trim()) return;
    setPhase('loading');
    setError('');

    try {
      const res = await fetch('/api/whitelist/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ citizenid: citizenid.trim() }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setCooldown({ remainingSeconds: data.remainingSeconds });
        setPhase('cooldown');
        return;
      }

      if (!res.ok) throw new Error('Failed to start test');

      const data: TestSession = await res.json();
      setSession(data);
      setAnswers(new Array(data.totalQuestions).fill(-1));
      setCurrentQ(0);
      setPhase('test');
    } catch (e: any) {
      setError(e.message || 'Failed to start test');
      setPhase('citizenid');
    }
  }, [citizenid, token]);

  const selectAnswer = useCallback((optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = optionIndex;
      return next;
    });
  }, [currentQ]);

  const nextQuestion = useCallback(() => {
    if (session && currentQ < session.totalQuestions - 1) {
      setCurrentQ((p) => p + 1);
    }
  }, [session, currentQ]);

  const prevQuestion = useCallback(() => {
    if (currentQ > 0) setCurrentQ((p) => p - 1);
  }, [currentQ]);

  const submitTest = useCallback(async () => {
    if (!session) return;
    if (answers.includes(-1)) {
      setError('Please answer all questions before submitting');
      return;
    }

    setPhase('loading');
    setError('');

    try {
      const res = await fetch(`/api/whitelist/submit/${session.testId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) throw new Error('Failed to submit test');

      const data: TestResult = await res.json();
      setResult(data);
      setPhase('result');
    } catch (e: any) {
      setError(e.message || 'Submission failed');
      setPhase('test');
    }
  }, [session, answers, token]);

  // ─── Cooldown Countdown Timer ─────────────────────────────
  function CooldownTimer({ seconds }: { seconds: number }) {
    const [remaining, setRemaining] = useState(seconds);

    useEffect(() => {
      const interval = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setPhase('citizenid');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }, []);

    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;

    return (
      <div className="text-center">
        <div className="text-5xl font-mono font-bold text-fire mb-4 tracking-wider">
          {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </div>
        <p className="text-gray-500 text-sm">Cooldown — try again later</p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <main className="min-h-screen bg-carbon-900 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full"
          style={{ border: '2px solid rgba(255,107,0,0.3)', borderTopColor: '#FF6B00', animation: 'spin 0.8s linear infinite' }} />
      </main>
    );
  }

  if (phase === 'cooldown' && cooldown) {
    return (
      <main className="min-h-screen bg-carbon-900 flex items-center justify-center px-6">
        <div className="glass-panel p-12 max-w-md w-full text-center"
          style={{ animation: 'fadeIn 0.6s ease-out' }}>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ border: '2px solid rgba(255,107,0,0.2)' }}>
            <span className="text-2xl text-fire">!</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-6">Test Locked</h2>
          <CooldownTimer seconds={cooldown.remainingSeconds} />
        </div>
      </main>
    );
  }

  if (phase === 'citizenid') {
    return (
      <main className="min-h-screen bg-carbon-900 flex items-center justify-center px-6">
        <div className="glass-panel p-12 max-w-md w-full"
          style={{ animation: 'fadeIn 0.6s ease-out' }}>
          <h2 className="text-2xl font-bold text-white mb-2 text-center">Whitelist Test</h2>
          <p className="text-gray-500 text-sm mb-8 text-center">Enter your Citizen ID to begin</p>
          {error && (
            <div className="mb-6 p-3 rounded-lg text-sm"
              style={{ background: 'rgba(255,0,0,0.1)', color: '#ff4444', border: '1px solid rgba(255,0,0,0.2)' }}>
              {error}
            </div>
          )}
          <input
            value={citizenid}
            onChange={(e) => setCitizenid(e.target.value)}
            placeholder="Citizen ID (e.g., ABC123)"
            className="w-full px-4 py-3 rounded-xl bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none mb-6 transition-colors"
            style={{ borderColor: citizenid ? 'rgba(255,107,0,0.3)' : undefined }}
            onKeyDown={(e) => e.key === 'Enter' && startTest()}
          />
          <button
            onClick={startTest}
            disabled={!citizenid.trim()}
            className="w-full py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-40"
            style={{
              background: citizenid.trim() ? 'linear-gradient(135deg, #FF6B00, #FFA500)' : 'rgba(255,107,0,0.1)',
              color: citizenid.trim() ? '#0D0D0D' : '#666',
              boxShadow: citizenid.trim() ? '0 0 20px rgba(255,107,0,0.3)' : 'none',
            }}>
            Start Test
          </button>
        </div>
      </main>
    );
  }

  if (phase === 'test' && session) {
    const question = session.questions[currentQ];
    const selected = answers[currentQ];
    const allAnswered = !answers.includes(-1);

    return (
      <main className="min-h-screen bg-carbon-900 flex items-center justify-center px-6">
        <div className="glass-panel p-8 md:p-12 max-w-2xl w-full"
          style={{ animation: 'fadeIn 0.4s ease-out' }}>
          {/* Progress */}
          <div className="flex items-center justify-between mb-8">
            <span className="text-xs font-mono text-gray-600">
              Question {currentQ + 1} / {session.totalQuestions}
            </span>
            <div className="flex gap-1">
              {answers.map((a, i) => (
                <div key={i} className="w-2 h-2 rounded-full transition-colors duration-300"
                  style={{ background: a >= 0 ? '#FF6B00' : i === currentQ ? 'rgba(255,107,0,0.3)' : '#333' }} />
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 rounded-full bg-carbon-700 mb-8 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${((currentQ + 1) / session.totalQuestions) * 100}%`, background: 'linear-gradient(90deg, #FF6B00, #FFA500)' }} />
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg text-sm"
              style={{ background: 'rgba(255,0,0,0.1)', color: '#ff4444', border: '1px solid rgba(255,0,0,0.2)' }}>
              {error}
            </div>
          )}

          {/* Question */}
          <h3 className="text-xl font-semibold text-white mb-8 leading-relaxed"
            style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {question.question}
          </h3>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => selectAnswer(idx)}
                className="w-full text-left px-5 py-4 rounded-xl transition-all duration-200"
                style={{
                  background: selected === idx
                    ? 'linear-gradient(135deg, rgba(255,107,0,0.15), rgba(255,107,0,0.05))'
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selected === idx ? 'rgba(255,107,0,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: selected === idx ? '0 0 15px rgba(255,107,0,0.1)' : 'none',
                  animation: 'fadeIn 0.3s ease-out',
                  animationDelay: `${idx * 0.08}s`,
                  animationFillMode: 'both',
                }}>
                <div className="flex items-center gap-4">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono flex-shrink-0 transition-colors"
                    style={{
                      background: selected === idx ? '#FF6B00' : 'rgba(255,255,255,0.05)',
                      color: selected === idx ? '#0D0D0D' : '#666',
                      border: `1px solid ${selected === idx ? '#FF6B00' : 'rgba(255,255,255,0.1)'}`,
                    }}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-sm text-gray-300">{option}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10 pt-6"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={prevQuestion}
              disabled={currentQ === 0}
              className="px-5 py-2 rounded-lg text-sm transition-all disabled:opacity-30"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#999' }}>
              Previous
            </button>

            {currentQ < session.totalQuestions - 1 ? (
              <button
                onClick={nextQuestion}
                disabled={selected < 0}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30"
                style={{
                  background: selected >= 0 ? 'rgba(255,107,0,0.15)' : 'transparent',
                  color: selected >= 0 ? '#FF6B00' : '#666',
                  border: `1px solid ${selected >= 0 ? 'rgba(255,107,0,0.3)' : 'rgba(255,255,255,0.1)'}`,
                }}>
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={!allAnswered}
                className="px-6 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                style={{
                  background: allAnswered ? 'linear-gradient(135deg, #FF6B00, #FFA500)' : 'rgba(255,107,0,0.1)',
                  color: allAnswered ? '#0D0D0D' : '#666',
                  boxShadow: allAnswered ? '0 0 20px rgba(255,107,0,0.3)' : 'none',
                }}>
                Submit Test
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (phase === 'result' && result) {
    return (
      <main className="min-h-screen bg-carbon-900 flex items-center justify-center px-6">
        <div className="glass-panel p-12 max-w-lg w-full text-center"
          style={{ animation: 'fadeIn 0.6s ease-out' }}>
          {/* Status Icon */}
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${result.passed ? 'glow-orange' : ''}`}
            style={{
              background: result.passed
                ? 'linear-gradient(135deg, rgba(255,107,0,0.2), rgba(255,107,0,0.05))'
                : 'rgba(255,0,0,0.1)',
              border: `1px solid ${result.passed ? 'rgba(255,107,0,0.3)' : 'rgba(255,0,0,0.2)'}`,
            }}>
            {result.passed ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <span className="text-3xl" style={{ color: '#ff4444' }}>✕</span>
            )}
          </div>

          {/* Score */}
          <h2 className={`text-2xl font-bold mb-2 ${result.passed ? 'text-gradient' : 'text-white'}`}>
            {result.passed ? 'Congratulations!' : 'Test Failed'}
          </h2>
          <p className="text-gray-500 mb-6">
            {result.passed
              ? 'You passed the whitelist test'
              : 'You did not meet the passing score'}
          </p>

          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{result.score}</div>
              <div className="text-xs text-gray-600 mt-1">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{result.total}</div>
              <div className="text-xs text-gray-600 mt-1">Total</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${result.passed ? 'text-fire' : 'text-red-500'}`}>
                {result.percentage}%
              </div>
              <div className="text-xs text-gray-600 mt-1">Score</div>
            </div>
          </div>

          {/* Pass Details */}
          {result.passed && (
            <div className="space-y-2 mb-6">
              {result.discordRoleAssigned && (
                <div className="text-sm text-green-500">✓ Discord Citizen role assigned</div>
              )}
              {result.licenseActivated && (
                <div className="text-sm text-green-500">✓ FiveM license activated</div>
              )}
            </div>
          )}

          {/* Action */}
          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 py-3 rounded-xl font-semibold transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #FF6B00, #FFA500)',
              color: '#0D0D0D',
              boxShadow: '0 0 20px rgba(255,107,0,0.3)',
            }}>
            Return to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-carbon-900 flex items-center justify-center px-6">
      <div className="glass-panel p-12 max-w-md w-full text-center">
        <h2 className="text-xl font-semibold text-white mb-4">Whitelist Test</h2>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-fire hover:underline text-sm">
          Return to Dashboard
        </button>
      </div>
    </main>
  );
}
