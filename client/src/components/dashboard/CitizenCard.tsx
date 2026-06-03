'use client';

import { useRef, useState, useEffect } from 'react';

interface CitizenCardData {
  citizenid: string;
  cash: number;
  bank: number;
  charinfo: { firstname: string; lastname: string; birthdate: string; nationality: string; phone: string } | null;
  licenses: { driver: boolean; weapon: boolean } | null;
  job: { name: string; label: string; grade: number; gradeName: string } | null;
}

export default function CitizenCard({ data }: { data: CitizenCardData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glowX, setGlowX] = useState(50);
  const [glowY, setGlowY] = useState(50);
  const [isHovered, setIsHovered] = useState(false);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rx = ((y - centerY) / centerY) * -15;
    const ry = ((x - centerX) / centerX) * 15;
    setRotateX(rx);
    setRotateY(ry);
    setGlowX((x / rect.width) * 100);
    setGlowY((y / rect.height) * 100);
  }

  function handleMouseEnter() { setIsHovered(true); }
  function handleMouseLeave() {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
    setGlowX(50);
    setGlowY(50);
  }

  const fullName = data.charinfo
    ? `${data.charinfo.firstname} ${data.charinfo.lastname}`
    : 'Unknown';

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative rounded-2xl overflow-hidden cursor-default transition-transform duration-200 ease-out"
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transformStyle: 'preserve-3d',
        background: 'linear-gradient(135deg, #1A1A1A 0%, #111111 50%, #1A1A1A 100%)',
        border: '1px solid rgba(255, 107, 0, 0.15)',
        boxShadow: isHovered
          ? '0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(255,107,0,0.1)'
          : '0 10px 30px rgba(0,0,0,0.3)',
      }}
    >
      {/* Glow follow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: isHovered ? 0.15 : 0,
          background: `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(255,107,0,0.6), transparent 60%)`,
        }}
      />

      {/* Border glow */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          boxShadow: 'inset 0 0 30px rgba(255,107,0,0.05)',
        }}
      />

      <div className="relative p-6 md:p-8" style={{ transform: 'translateZ(30px)' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-mono text-gray-600 uppercase tracking-wider mb-1">State ID</p>
            <h2 className="text-lg font-bold text-white">{data.citizenid}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{fullName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-gray-600 uppercase tracking-wider mb-1">License</p>
            <div className="flex gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${data.licenses?.driver ? 'text-green-500' : 'text-gray-700'}`}
                style={{ border: `1px solid ${data.licenses?.driver ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)'}`, background: data.licenses?.driver ? 'rgba(34,197,94,0.1)' : 'transparent' }}>
                D
              </div>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${data.licenses?.weapon ? 'text-fire' : 'text-gray-700'}`}
                style={{ border: `1px solid ${data.licenses?.weapon ? 'rgba(255,107,0,0.3)' : 'rgba(255,255,255,0.05)'}`, background: data.licenses?.weapon ? 'rgba(255,107,0,0.1)' : 'transparent' }}>
                W
              </div>
            </div>
          </div>
        </div>

        {/* Finance */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs font-mono text-gray-600 mb-1">Cash</p>
            <p className="text-xl font-bold text-white font-mono">${data.cash.toLocaleString()}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,107,0,0.05)', border: '1px solid rgba(255,107,0,0.1)' }}>
            <p className="text-xs font-mono text-gray-600 mb-1">Bank</p>
            <p className="text-xl font-bold text-gradient font-mono">${data.bank.toLocaleString()}</p>
          </div>
        </div>

        {/* Job */}
        {data.job && (
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'rgba(255,107,0,0.1)', color: '#FF6B00' }}>
              {data.job.label.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{data.job.label}</p>
              <p className="text-xs text-gray-600 font-mono">{data.job.gradeName} · Grade {data.job.grade}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
