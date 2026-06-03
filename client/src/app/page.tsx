'use client';

import { useEffect, useState } from 'react';
import ParticleBackground from '@/components/ParticleBackground';
import NeonButton from '@/components/NeonButton';
import { authApi } from '@/lib/api';

const DISCORD_ICON = (
  <svg
    viewBox="0 0 127.14 96.36"
    fill="currentColor"
    width="20"
    height="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
  </svg>
);

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDiscordLogin = () => {
    setIsLoading(true);
    window.location.href = authApi.login();
  };

  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-carbon-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-fire rounded-full border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-carbon-900">
      {/* Particle Background */}
      <ParticleBackground />

      {/* Gradient Overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(255, 107, 0, 0.08) 0%, transparent 60%)',
          zIndex: 1,
        }}
      />

      {/* Main Content */}
      <div
        className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6"
        style={{
          opacity: mounted ? 1 : 0,
          transition: 'opacity 1s ease-in-out',
        }}
      >
        {/* Brand Section */}
        <div className="text-center mb-16">
          {/* Logo Mark */}
          <div
            className="mb-8 inline-flex items-center justify-center"
            style={{
              animation: mounted ? 'float 6s ease-in-out infinite' : 'none',
            }}
          >
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-3xl"
                style={{
                  background: 'rgba(255, 107, 0, 0.15)',
                  transform: 'scale(1.5)',
                }}
              />
              <div
                className="relative w-24 h-24 rounded-full flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255, 107, 0, 0.15), rgba(255, 107, 0, 0.05))',
                  border: '1px solid rgba(255, 107, 0, 0.2)',
                }}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF6B00" />
                      <stop offset="100%" stopColor="#FFA500" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M50 5 L55 40 L90 50 L55 60 L50 95 L45 60 L10 50 L45 40 Z"
                    fill="url(#logoGradient)"
                    opacity="0.9"
                  />
                  <circle cx="50" cy="50" r="8" fill="#0D0D0D" />
                </svg>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1
            className="text-6xl md:text-8xl font-extrabold tracking-tight mb-4"
            style={{
              background: 'linear-gradient(135deg, #FF6B00 0%, #FFA500 50%, #FF6B00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em',
            }}
          >
            REALITY
          </h1>

          {/* Subtitle */}
          <p
            className="text-lg md:text-xl text-gray-500 font-light tracking-[0.3em] uppercase"
            style={{
              animation: mounted ? 'fadeInUp 1s ease-out 0.3s both' : 'none',
            }}
          >
            FiveM Roleplay
          </p>
        </div>

        {/* CTA Section */}
        <div
          className="flex flex-col items-center gap-6"
          style={{
            animation: mounted ? 'fadeInUp 1s ease-out 0.6s both' : 'none',
          }}
        >
          <NeonButton
            label="Continue with Discord"
            icon={DISCORD_ICON}
            onClick={handleDiscordLogin}
            disabled={isLoading}
          />

          <p className="text-xs text-gray-600 font-mono">
            {isLoading ? 'Redirecting to Discord...' : 'Authenticate to access the portal'}
          </p>
        </div>

        {/* Footer */}
        <footer
          className="absolute bottom-8 left-0 right-0 text-center"
          style={{
            animation: mounted ? 'fadeInUp 1s ease-out 1s both' : 'none',
          }}
        >
          <p className="text-xs text-gray-700 font-mono">
            &copy; {new Date().getFullYear()} Reality Roleplay &mdash; All rights reserved
          </p>
        </footer>
      </div>

      {/* Fade-in keyframes */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
