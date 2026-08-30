import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const dimensions = {
    sm: { box: 24, font: 'text-sm' },
    md: { box: 32, font: 'text-lg' },
    lg: { box: 44, font: 'text-2xl' }
  }[size];

  return (
    <div className={`flex items-center gap-2.5 font-semibold tracking-tight select-none ${className}`}>
      {/* SVG Geometric CASE Tool Logo */}
      <svg
        width={dimensions.box}
        height={dimensions.box}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm"
      >
        <defs>
          <linearGradient id="logo-grad-primary" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B82F6" />
            <stop offset="0.5" stopColor="#6366F1" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="logo-grad-accent" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#60A5FA" />
            <stop offset="1" stopColor="#A78BFA" />
          </linearGradient>
        </defs>

        {/* Outer Hexagon / Canvas Frame */}
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="10"
          fill="#111827"
          stroke="url(#logo-grad-primary)"
          strokeWidth="2.5"
        />

        {/* Main UML Class Box (Top Left) */}
        <rect x="8" y="9" width="16" height="12" rx="3" fill="#1E293B" stroke="#60A5FA" strokeWidth="1.5" />
        <line x1="8" y1="13" x2="24" y2="13" stroke="#60A5FA" strokeWidth="1" strokeOpacity="0.6" />
        <line x1="8" y1="17" x2="24" y2="17" stroke="#60A5FA" strokeWidth="1" strokeOpacity="0.4" />

        {/* Target UML Class Box (Bottom Right) */}
        <rect x="24" y="27" width="16" height="12" rx="3" fill="#1E293B" stroke="#A78BFA" strokeWidth="1.5" />
        <line x1="24" y1="31" x2="40" y2="31" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.6" />
        <line x1="24" y1="35" x2="40" y2="35" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.4" />

        {/* Association / Relationship Connector Line */}
        <path
          d="M 24 15 L 32 15 L 32 27"
          stroke="url(#logo-grad-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Diamond Composition / Arrowhead */}
        <polygon points="32,23 34,26 32,29 30,26" fill="#8B5CF6" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`${dimensions.font} font-bold text-white tracking-wide`}>CASE</span>
            <span className={`${dimensions.font} font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400`}>Tool</span>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-medium">UML Architecture</span>
        </div>
      )}
    </div>
  );
};
