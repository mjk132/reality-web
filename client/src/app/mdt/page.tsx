'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CitizenProfile {
  citizenid: string;
  cash: number;
  bank: number;
  charinfo: { firstname: string; lastname: string; birthdate: string; nationality: string; phone: string } | null;
  licenses: { driver: boolean; weapon: boolean } | null;
  job: { name: string; label: string; grade: number; gradeName: string } | null;
  vehicles: Array<{ plate: string; vehicle: string; fuel: number; engine: number; body: number }>;
  cases: Array<{ id: string; title: string; status: string; createdAt: Date }>;
  warrants: Array<{ id: string; reason: string; status: string; createdAt: Date }>;
}

interface MdtCase {
  id: string;
  officerId: string;
  officerName: string | null;
  citizenid: string | null;
  citizenName: string | null;
  plate: string | null;
  title: string;
  description: string;
  charges: string | null;
  evidenceUrls: string | null;
  status: string;
  createdAt: Date;
}

interface Warrant {
  id: string;
  citizenid: string;
  citizenName: string | null;
  plate: string | null;
  issuedBy: string;
  issuedByName: string | null;
  reason: string;
  status: string;
  createdAt: Date;
  expiresAt: Date | null;
}

type Tab = 'search' | 'cases' | 'warrants';

export default function MdtPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'citizenid' | 'name' | 'plate'>('citizenid');
  const [searchResult, setSearchResult] = useState<CitizenProfile | CitizenProfile[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Case state
  const [cases, setCases] = useState<MdtCase[]>([]);
  const [casePage, setCasePage] = useState(1);
  const [caseTotal, setCaseTotal] = useState(0);
  const [caseLoading, setCaseLoading] = useState(false);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [caseForm, setCaseForm] = useState({ citizenid: '', citizenName: '', plate: '', title: '', description: '', charges: '' });

  // Warrant state
  const [warrants, setWarrants] = useState<Warrant[]>([]);
  const [warrantLoading, setWarrantLoading] = useState(false);
  const [showWarrantForm, setShowWarrantForm] = useState(false);
  const [warrantForm, setWarrantForm] = useState({ citizenid: '', citizenName: '', plate: '', reason: '', expiresInHours: '72' });

  useEffect(() => {
    const t = localStorage.getItem('reality_token');
    if (!t) { router.push('/'); return; }
    setToken(t);
  }, [router]);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/mdt/search?query=${encodeURIComponent(searchQuery)}&type=${searchType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setMessage('Access denied — police role required');
        setMsgType('error');
        setSearchResult(null);
        return;
      }
      if (!res.ok) { setSearchResult(null); setMessage('No results found'); setMsgType('error'); return; }
      const data = await res.json();
      setSearchResult(data);
    } catch { setMessage('Search failed'); setMsgType('error'); }
    finally { setSearchLoading(false); }
  }

  async function fetchCases(page = 1) {
    setCaseLoading(true);
    try {
      const res = await fetch(`/api/mdt/cases?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setCases(data.cases);
      setCaseTotal(data.total);
      setCasePage(data.page);
    } finally { setCaseLoading(false); }
  }

  async function handleCreateCase() {
    try {
      const charges = caseForm.charges ? caseForm.charges.split(',').map((c) => c.trim()).filter(Boolean) : [];
      const res = await fetch('/api/mdt/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...caseForm, charges }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage('Case created');
      setMsgType('success');
      setShowCaseForm(false);
      setCaseForm({ citizenid: '', citizenName: '', plate: '', title: '', description: '', charges: '' });
      fetchCases();
    } catch (e: any) { setMessage(e.message); setMsgType('error'); }
  }

  async function fetchWarrants() {
    setWarrantLoading(true);
    try {
      const res = await fetch('/api/mdt/warrants', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setWarrants(await res.json());
    } finally { setWarrantLoading(false); }
  }

  async function handleIssueWarrant() {
    try {
      const res = await fetch('/api/mdt/warrants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...warrantForm,
          expiresInHours: parseInt(warrantForm.expiresInHours, 10) || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage(`Warrant issued for ${warrantForm.citizenName || warrantForm.citizenid}`);
      setMsgType('success');
      setShowWarrantForm(false);
      setWarrantForm({ citizenid: '', citizenName: '', plate: '', reason: '', expiresInHours: '72' });
      fetchWarrants();
    } catch (e: any) { setMessage(e.message); setMsgType('error'); }
  }

  async function handleExecuteWarrant(id: string) {
    try {
      await fetch(`/api/mdt/warrants/${id}/execute`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchWarrants();
    } catch {}
  }

  useEffect(() => {
    if (token && activeTab === 'cases') fetchCases();
    if (token && activeTab === 'warrants') fetchWarrants();
  }, [activeTab, token]);

  const isArray = Array.isArray(searchResult);

  return (
    <main className="min-h-screen bg-carbon-900">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Officer Portal</h1>
            <p className="text-xs text-gray-600 font-mono mt-1">MDT v1 — Tactical Law Enforcement System</p>
          </div>
          <button onClick={() => router.push('/dashboard')}
            className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#999' }}>
            Dashboard
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {(['search', 'cases', 'warrants'] as Tab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all uppercase tracking-wider ${
                activeTab === tab ? 'text-white' : 'text-gray-600'
              }`}
              style={activeTab === tab ? { background: 'rgba(255,107,0,0.15)', color: '#FF6B00' } : {}}>
              {tab === 'search' ? 'Criminal Search' : tab === 'cases' ? 'Case Files' : 'Active Warrants'}
            </button>
          ))}
        </div>

        {message && (
          <div className={`mb-6 p-3 rounded-lg text-sm ${msgType === 'error' ? 'text-red-500' : 'text-green-500'}`}
            style={{ background: msgType === 'error' ? 'rgba(255,0,0,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${msgType === 'error' ? 'rgba(255,0,0,0.2)' : 'rgba(34,197,94,0.2)'}` }}>
            {message}
          </div>
        )}

        {/* ─── SEARCH TAB ─────────────────────────────────── */}
        {activeTab === 'search' && (
          <div>
            <div className="flex gap-3 mb-6">
              <div className="flex gap-1.5">
                {(['citizenid', 'name', 'plate'] as const).map((t) => (
                  <button key={t} onClick={() => setSearchType(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
                    style={{
                      background: searchType === t ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.03)',
                      color: searchType === t ? '#FF6B00' : '#666',
                      border: `1px solid ${searchType === t ? 'rgba(255,107,0,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    }}>
                    {t === 'citizenid' ? 'Citizen ID' : t === 'name' ? 'Name' : 'Plate'}
                  </button>
                ))}
              </div>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={`Search by ${searchType}...`}
                className="flex-1 px-4 py-2.5 rounded-xl bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm font-mono" />
              <button onClick={handleSearch} disabled={searchLoading || !searchQuery.trim()}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #FF6B00, #FFA500)',
                  color: '#0D0D0D',
                  boxShadow: '0 0 15px rgba(255,107,0,0.2)',
                }}>
                {searchLoading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Search Results */}
            {searchResult && !isArray && (
              <div className="glass-panel p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-xs font-mono text-gray-600 mb-1">Citizen ID</p>
                    <h2 className="text-xl font-bold text-white">{searchResult.citizenid}</h2>
                    <p className="text-gray-400 mt-0.5">
                      {searchResult.charinfo
                        ? `${searchResult.charinfo.firstname} ${searchResult.charinfo.lastname}`
                        : 'Unknown'}
                    </p>
                  </div>
                  {searchResult.warrants.length > 0 && (
                    <div className="px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{ background: 'rgba(255,0,0,0.15)', color: '#FF4444', border: '1px solid rgba(255,0,0,0.3)', animation: 'pulse 2s infinite' }}>
                      ⚠ ACTIVE WARRANT
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <InfoBox label="Cash" value={`$${searchResult.cash.toLocaleString()}`} />
                  <InfoBox label="Bank" value={`$${searchResult.bank.toLocaleString()}`} color="#FF6B00" />
                  <InfoBox label="Job" value={searchResult.job?.label || 'None'} />
                  <InfoBox label="Phone" value={searchResult.charinfo?.phone || 'N/A'} />
                </div>

                {/* Licenses */}
                <div className="flex gap-2 mb-6">
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${searchResult.licenses?.driver ? 'text-green-500' : 'text-gray-700'}`}
                    style={{ background: searchResult.licenses?.driver ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${searchResult.licenses?.driver ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)'}` }}>
                    DRIVER
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${searchResult.licenses?.weapon ? 'text-fire' : 'text-gray-700'}`}
                    style={{ background: searchResult.licenses?.weapon ? 'rgba(255,107,0,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${searchResult.licenses?.weapon ? 'rgba(255,107,0,0.3)' : 'rgba(255,255,255,0.05)'}` }}>
                    WEAPON
                  </div>
                </div>

                {/* Vehicles */}
                {searchResult.vehicles.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-mono text-gray-600 uppercase tracking-wider mb-3">Vehicles</p>
                    <div className="space-y-2">
                      {searchResult.vehicles.map((v) => (
                        <div key={v.plate} className="flex items-center justify-between p-3 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <p className="text-sm text-white">{v.vehicle}</p>
                            <p className="text-xs font-mono text-gray-600">{v.plate}</p>
                          </div>
                          <div className="flex gap-3 text-xs font-mono text-gray-500">
                            <span>E: {v.engine}/1000</span>
                            <span>B: {v.body}/1000</span>
                            <span>F: {v.fuel}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prior Cases */}
                {searchResult.cases.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-mono text-gray-600 uppercase tracking-wider mb-3">Criminal Record</p>
                    <div className="space-y-2">
                      {searchResult.cases.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <p className="text-sm text-white">{c.title}</p>
                            <p className="text-xs font-mono text-gray-700">{new Date(c.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-mono ${
                            c.status === 'OPEN' ? 'text-yellow-500' : c.status === 'CLOSED' ? 'text-green-500' : 'text-gray-600'
                          }`}
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Warrants */}
                {searchResult.warrants.length > 0 && (
                  <div>
                    <p className="text-xs font-mono text-red-500 uppercase tracking-wider mb-3">Active Warrants</p>
                    {searchResult.warrants.map((w) => (
                      <div key={w.id} className="p-3 rounded-xl mb-2"
                        style={{ background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.2)' }}>
                        <p className="text-sm text-red-400">{w.reason}</p>
                        <p className="text-xs font-mono text-red-700 mt-1">Issued: {new Date(w.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {searchResult && isArray && (
              <div className="space-y-3">
                {searchResult.length === 0 && (
                  <div className="glass-panel p-8 text-center text-gray-600 text-sm">No citizens found</div>
                )}
                {searchResult.map((p: CitizenProfile) => (
                  <div key={p.citizenid} className="glass-panel p-4 cursor-pointer hover:border-glow transition-all"
                    onClick={() => setSearchResult(p)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {p.charinfo ? `${p.charinfo.firstname} ${p.charinfo.lastname}` : 'Unknown'}
                        </p>
                        <p className="text-xs font-mono text-gray-700 mt-0.5">ID: {p.citizenid}</p>
                      </div>
                      <span className="text-xs text-gray-600 font-mono">{p.job?.label || 'No Job'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── CASES TAB ──────────────────────────────────── */}
        {activeTab === 'cases' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-600 font-mono">{caseTotal} total cases</p>
              <button onClick={() => setShowCaseForm(!showCaseForm)}
                className="px-4 py-2 rounded-lg text-xs font-semibold"
                style={{ background: showCaseForm ? 'rgba(255,0,0,0.1)' : 'rgba(255,107,0,0.1)', color: showCaseForm ? '#FF4444' : '#FF6B00', border: `1px solid ${showCaseForm ? 'rgba(255,0,0,0.2)' : 'rgba(255,107,0,0.2)'}` }}>
                {showCaseForm ? 'Cancel' : '+ New Case'}
              </button>
            </div>

            {showCaseForm && (
              <div className="glass-panel p-5 mb-6">
                <h3 className="text-sm font-semibold text-white mb-4">New Case Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input value={caseForm.citizenid} onChange={(e) => setCaseForm({ ...caseForm, citizenid: e.target.value })} placeholder="Citizen ID" className="px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm" />
                  <input value={caseForm.citizenName} onChange={(e) => setCaseForm({ ...caseForm, citizenName: e.target.value })} placeholder="Citizen Name" className="px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm" />
                  <input value={caseForm.plate} onChange={(e) => setCaseForm({ ...caseForm, plate: e.target.value })} placeholder="Plate (optional)" className="px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm" />
                </div>
                <input value={caseForm.title} onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })} placeholder="Case Title" className="w-full px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm mb-3" />
                <textarea value={caseForm.description} onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })} placeholder="Case Description" rows={4} className="w-full px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm mb-3 resize-none" />
                <input value={caseForm.charges} onChange={(e) => setCaseForm({ ...caseForm, charges: e.target.value })} placeholder="Charges (comma-separated)" className="w-full px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm mb-3" />
                <button onClick={handleCreateCase}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #FF6B00, #FFA500)', color: '#0D0D0D' }}>
                  Create Case
                </button>
              </div>
            )}

            {caseLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full" style={{ border: '2px solid rgba(255,107,0,0.3)', borderTopColor: '#FF6B00', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : (
              <div className="space-y-3">
                {cases.map((c) => (
                  <div key={c.id} className="glass-panel p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{c.title}</h3>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Filed by {c.officerName || 'Unknown Officer'} · {c.citizenName || c.citizenid || 'N/A'}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-mono ${
                        c.status === 'OPEN' ? 'text-yellow-500' : c.status === 'CLOSED' ? 'text-green-500' : 'text-gray-500'
                      }`}
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{c.description}</p>
                    <p className="text-xs font-mono text-gray-700 mt-2">{new Date(c.createdAt).toLocaleString()}</p>
                    {c.charges && c.charges !== '[]' && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {(JSON.parse(c.charges) as string[]).map((chg, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(255,107,0,0.08)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.15)' }}>
                            {chg}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {caseTotal > 20 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <button onClick={() => fetchCases(casePage - 1)} disabled={casePage <= 1}
                      className="px-3 py-1.5 rounded-lg text-xs" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#666' }}>
                      Previous
                    </button>
                    <span className="px-3 py-1.5 text-xs text-gray-600 font-mono">Page {casePage}</span>
                    <button onClick={() => fetchCases(casePage + 1)} disabled={casePage * 20 >= caseTotal}
                      className="px-3 py-1.5 rounded-lg text-xs" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#666' }}>
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── WARRANTS TAB ───────────────────────────────── */}
        {activeTab === 'warrants' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-600 font-mono">{warrants.length} active warrant{warrants.length !== 1 ? 's' : ''}</p>
              <button onClick={() => setShowWarrantForm(!showWarrantForm)}
                className="px-4 py-2 rounded-lg text-xs font-semibold"
                style={{ background: showWarrantForm ? 'rgba(255,0,0,0.1)' : 'rgba(255,0,0,0.15)', color: showWarrantForm ? '#FF4444' : '#FF4444', border: `1px solid ${showWarrantForm ? 'rgba(255,0,0,0.2)' : 'rgba(255,0,0,0.3)'}` }}>
                {showWarrantForm ? 'Cancel' : '+ Issue Warrant'}
              </button>
            </div>

            {showWarrantForm && (
              <div className="glass-panel p-5 mb-6" style={{ borderColor: 'rgba(255,0,0,0.2)' }}>
                <h3 className="text-sm font-semibold text-red-500 mb-4">Issue Live Warrant</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input value={warrantForm.citizenid} onChange={(e) => setWarrantForm({ ...warrantForm, citizenid: e.target.value })} placeholder="Citizen ID *" className="px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm" />
                  <input value={warrantForm.citizenName} onChange={(e) => setWarrantForm({ ...warrantForm, citizenName: e.target.value })} placeholder="Citizen Name" className="px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm" />
                </div>
                <input value={warrantForm.plate} onChange={(e) => setWarrantForm({ ...warrantForm, plate: e.target.value })} placeholder="Plate (optional)" className="w-full px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm mb-3" />
                <textarea value={warrantForm.reason} onChange={(e) => setWarrantForm({ ...warrantForm, reason: e.target.value })} placeholder="Reason for warrant *" rows={3} className="w-full px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm mb-3 resize-none" />
                <input value={warrantForm.expiresInHours} onChange={(e) => setWarrantForm({ ...warrantForm, expiresInHours: e.target.value.replace(/\D/g, '') })} placeholder="Expires in (hours)" className="w-40 px-3 py-2 rounded-lg bg-carbon-800 border border-carbon-600 text-white placeholder-gray-600 outline-none text-sm mb-3" />
                <div className="text-xs text-gray-700 mb-3">⚠ A Discord alert will be sent to the raid channel</div>
                <button onClick={handleIssueWarrant}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #FF0000, #CC0000)', color: 'white', boxShadow: '0 0 15px rgba(255,0,0,0.2)' }}>
                  Issue Warrant
                </button>
              </div>
            )}

            {warrantLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full" style={{ border: '2px solid rgba(255,0,0,0.3)', borderTopColor: '#FF0000', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : (
              <div className="space-y-3">
                {warrants.map((w) => (
                  <div key={w.id} className="glass-panel p-4" style={{ borderLeft: '3px solid #FF4444' }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <h3 className="text-sm font-semibold text-white">{w.citizenName || w.citizenid}</h3>
                        </div>
                        <p className="text-xs text-red-400">{w.reason}</p>
                      </div>
                      <button onClick={() => handleExecuteWarrant(w.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono"
                        style={{ border: '1px solid rgba(255,0,0,0.2)', color: '#FF4444', background: 'rgba(255,0,0,0.05)' }}>
                        Mark Executed
                      </button>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-700 font-mono">
                      <span>By: {w.issuedByName || w.issuedBy}</span>
                      {w.plate && <span>Plate: {w.plate}</span>}
                      <span>Issued: {new Date(w.createdAt).toLocaleDateString()}</span>
                      {w.expiresAt && <span>Expires: {new Date(w.expiresAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                ))}
                {warrants.length === 0 && (
                  <div className="glass-panel p-8 text-center">
                    <p className="text-gray-600 text-sm">No active warrants</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function InfoBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="text-xs font-mono text-gray-700 mb-1">{label}</p>
      <p className="text-sm font-bold font-mono" style={{ color: color || '#e0e0e0' }}>{value}</p>
    </div>
  );
}
