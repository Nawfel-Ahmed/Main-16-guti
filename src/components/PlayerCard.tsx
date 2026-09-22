import React from 'react';
import { Player } from '../types';

interface PlayerCardProps {
  player: Player;
  score: number;
  isTurn: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, score, isTurn }) => {
  const isYou = player === 'you';
  const name = isYou ? 'You' : 'Opponent';

  return (
    <div
      className={`relative flex items-center justify-between px-6 py-2 rounded-2xl transition-all duration-300 shadow-md ${
        isYou
          ? isTurn
            ? 'bg-amber-50/95 border-2 border-blue-600 ring-2 ring-blue-400/50 shadow-blue-900/20'
            : 'bg-[#f4e4c1]/90 border border-[#b88c56] text-[#4a2e12]'
          : isTurn
          ? 'bg-amber-50/95 border-2 border-red-600 ring-2 ring-red-400/50 shadow-red-900/20'
          : 'bg-[#f4e4c1]/90 border border-[#b88c56] text-[#4a2e12]'
      }`}
      style={{
        boxShadow: isTurn
          ? '0 6px 18px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.7)'
          : '0 3px 8px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.5)',
      }}
    >
      {/* Player Name */}
      <div className="flex items-center gap-2">
        <span
          className={`font-bold tracking-wide text-base ${
            isTurn
              ? isYou
                ? 'text-blue-700 font-extrabold'
                : 'text-red-700 font-extrabold'
              : 'text-[#4e2f15]'
          }`}
        >
          {name}
        </span>
        {isTurn && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 animate-pulse uppercase tracking-wider">
            Turn
          </span>
        )}
      </div>

      {/* Center Avatar */}
      <div className="relative -my-3">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center p-0.5 border-2 shadow-sm transition-transform duration-300 ${
            isTurn ? 'scale-110' : 'scale-100'
          } ${
            isYou
              ? 'border-blue-500 bg-gradient-to-b from-blue-100 to-amber-100 ring-2 ring-blue-300'
              : 'border-red-500 bg-gradient-to-b from-red-100 to-amber-100 ring-2 ring-red-300'
          }`}
        >
          {isYou ? (
            /* Smiling boy avatar */
            <svg viewBox="0 0 36 36" className="w-10 h-10 rounded-full" fill="none">
              <rect width="36" height="36" rx="18" fill="#FDE68A" />
              {/* Hair */}
              <path
                d="M10 16C10 10 13 8 18 8C23 8 26 10 26 16C26 18 25 17 24 16C23 15 21 16 18 16C15 16 13 15 12 16C11 17 10 18 10 16Z"
                fill="#78350F"
              />
              {/* Face */}
              <circle cx="18" cy="19" r="7" fill="#FBBF24" />
              {/* Eyes */}
              <circle cx="16" cy="18" r="1" fill="#451A03" />
              <circle cx="20" cy="18" r="1" fill="#451A03" />
              {/* Smile */}
              <path
                d="M16 21C16.5 22.2 19.5 22.2 20 21"
                stroke="#451A03"
                strokeWidth="1"
                strokeLinecap="round"
              />
              {/* Shirt */}
              <path d="M11 32C11 26 14 25 18 25C22 25 25 26 25 32H11Z" fill="#3B82F6" />
            </svg>
          ) : (
            /* Opponent thinking avatar */
            <svg viewBox="0 0 36 36" className="w-10 h-10 rounded-full" fill="none">
              <rect width="36" height="36" rx="18" fill="#FECDD3" />
              {/* Hair */}
              <path
                d="M9 16C9 9 13 7 18 7C23 7 27 9 27 16C26 18 24 16 22 16C20 16 19 15 18 15C17 15 16 16 14 16C12 16 10 18 9 16Z"
                fill="#451A03"
              />
              {/* Face */}
              <circle cx="18" cy="19" r="7" fill="#FDE047" />
              {/* Eyes */}
              <circle cx="15.5" cy="17.5" r="1" fill="#1C1917" />
              <circle cx="20.5" cy="17.5" r="1" fill="#1C1917" />
              {/* Thinking mouth */}
              <circle cx="18" cy="22" r="1" fill="#991B1B" />
              {/* Shirt */}
              <path d="M11 32C11 26 14 25 18 25C22 25 25 26 25 32H11Z" fill="#DC2626" />
            </svg>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center gap-1.5 font-bold text-base text-[#4a2e12]">
        <span className="text-xs uppercase font-semibold text-[#8c5e2d]">Score:</span>
        <span className="text-lg font-black text-[#38200d] tabular-nums">{score}</span>
      </div>
    </div>
  );
};
