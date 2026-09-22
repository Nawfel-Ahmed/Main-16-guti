import React from 'react';
import { sound } from '../utils/audio';

interface HomeScreenProps {
  onStart: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onStart }) => {
  const handleStart = () => {
    sound.playPieceSelect();
    onStart();
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between py-16 px-6 select-none overflow-hidden">
      {/* Top Title & Logo */}
      <div className="flex flex-col items-center text-center mt-8 z-10">
        {/* Game Icon Graphic */}
        <div className="w-24 h-24 mb-4 rounded-3xl bg-[#3f210b] p-3 border-2 border-[#b88c56] shadow-2xl flex items-center justify-center transform -rotate-3 hover:rotate-0 transition-transform duration-300">
          <svg viewBox="0 0 64 64" className="w-full h-full" fill="none">
            {/* Mini board grid lines */}
            <rect x="8" y="8" width="48" height="48" rx="4" stroke="#8d562c" strokeWidth="2.5" />
            <line x1="8" y1="32" x2="56" y2="32" stroke="#8d562c" strokeWidth="2" />
            <line x1="32" y1="8" x2="32" y2="56" stroke="#8d562c" strokeWidth="2" />
            <line x1="8" y1="8" x2="56" y2="56" stroke="#8d562c" strokeWidth="2" />
            <line x1="8" y1="56" x2="56" y2="8" stroke="#8d562c" strokeWidth="2" />
            {/* Red and Blue piece tokens */}
            <circle cx="20" cy="20" r="7" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
            <circle cx="44" cy="44" r="7" fill="#2563eb" stroke="#1e40af" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Title */}
        <h1
          className="text-5xl md:text-6xl font-black tracking-tight text-[#fde68a] drop-shadow-lg"
          style={{
            textShadow: '0 4px 12px rgba(40, 15, 5, 0.8), 0 2px 2px #3b1802',
          }}
        >
          16 Ghuti
        </h1>

        <p className="mt-2 text-sm font-semibold tracking-widest uppercase text-[#d6a56b] opacity-90">
          ষোল গুটি • Classic Bengali Strategy
        </p>
      </div>

      {/* Single Large Centered START Button */}
      <div className="my-auto z-10 w-full max-w-xs flex flex-col items-center">
        <button
          onClick={handleStart}
          className="w-full py-5 rounded-2xl font-black text-2xl tracking-wider uppercase text-[#fff4db] transition-all duration-200 transform active:scale-95 shadow-2xl cursor-pointer"
          style={{
            background: 'linear-gradient(180deg, #d97706 0%, #b45309 60%, #78350f 100%)',
            border: '2px solid #fde68a',
            boxShadow:
              '0 10px 25px -3px rgba(0, 0, 0, 0.6), inset 0 2px 3px rgba(255, 255, 255, 0.4), inset 0 -3px 4px rgba(0, 0, 0, 0.5)',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.6)',
          }}
        >
          START
        </button>
      </div>

      {/* Subtle bottom note */}
      <div className="text-xs font-medium text-[#c49866]/80 text-center z-10">
        Pass and Play • 2 Players
      </div>
    </div>
  );
};
