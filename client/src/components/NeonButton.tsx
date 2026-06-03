'use client';

import { ButtonHTMLAttributes, useState } from 'react';

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export default function NeonButton({
  label,
  icon,
  onClick,
  className = '',
  disabled = false,
  ...props
}: NeonButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative group overflow-hidden
        px-10 py-4 rounded-xl
        font-semibold text-base tracking-wide
        transition-all duration-500 ease-out
        disabled:opacity-40 disabled:cursor-not-allowed
        ${className}
      `}
      style={{
        background: isHovered
          ? 'linear-gradient(135deg, #FF6B00 0%, #FF8500 50%, #FFA500 100%)'
          : 'rgba(255, 107, 0, 0.1)',
        border: '1px solid rgba(255, 107, 0, 0.3)',
        color: isHovered ? '#0D0D0D' : '#FF6B00',
        boxShadow: isHovered
          ? '0 0 30px rgba(255, 107, 0, 0.5), 0 0 60px rgba(255, 107, 0, 0.2), inset 0 0 20px rgba(255, 107, 0, 0.1)'
          : '0 0 15px rgba(255, 107, 0, 0.15)',
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
      }}
      {...props}
    >
      {/* Glow ring */}
      <span
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          boxShadow: 'inset 0 0 40px rgba(255, 107, 0, 0.15)',
        }}
      />

      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-3">
        {icon && <span className="w-5 h-5">{icon}</span>}
        {label}
      </span>

      {/* Hover shine effect */}
      <span
        className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          pointerEvents: 'none',
        }}
      />
    </button>
  );
}
