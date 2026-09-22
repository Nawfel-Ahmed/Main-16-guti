import React from 'react';
import { Player } from '../types';

interface ConfirmLeaveModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmLeaveModal: React.FC<ConfirmLeaveModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl border-2 border-[#b88c56] bg-[#f5e6c8]"
        style={{
          boxShadow: '0 20px 40px rgba(0,0,0,0.6), inset 0 2px 2px rgba(255,255,255,0.7)',
        }}
      >
        <h3 className="text-2xl font-black text-[#451a03] mb-2">Leave Match?</h3>
        <p className="text-sm font-medium text-[#78350f] mb-6">
          Your current match progress will be lost. Return to the Home screen?
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-[#451a03] bg-[#e6cfab] border border-[#b88c56] hover:bg-[#d9be96] active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white bg-red-700 hover:bg-red-800 border border-red-900 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

export interface FirstMoveModalProps {
  isOpen: boolean;
  onSelectColor: (color: 'blue' | 'red') => void;
  onClose?: () => void;
}

export const FirstMoveModal: React.FC<FirstMoveModalProps> = ({
  isOpen,
  onSelectColor,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl border-2 border-[#b88c56] bg-[#f5e6c8]"
        style={{
          boxShadow: '0 20px 45px rgba(0,0,0,0.7), inset 0 2px 2px rgba(255,255,255,0.7)',
        }}
      >
        {/* Decorative mini pawns header */}
        <div className="flex items-center justify-center gap-3 mb-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-800 border-2 border-red-950 shadow-md flex items-center justify-center">
            <span className="w-3.5 h-3.5 rounded-full bg-red-200 shadow-inner" />
          </div>
          <span className="text-[#8c5e2d] font-black text-sm tracking-wider">VS</span>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-800 border-2 border-blue-950 shadow-md flex items-center justify-center">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-200 shadow-inner" />
          </div>
        </div>

        {/* Modal Title */}
        <h3 className="text-2xl font-black text-[#451a03] mb-1">
          কে প্রথম চাল দেবে?
        </h3>
        <p className="text-xs font-bold text-[#8c5e2d] uppercase tracking-wider mb-5">
          Who will play the first move?
        </p>

        {/* Color Selection Cards */}
        <div className="flex flex-col gap-3 mb-4">
          {/* Blue Option (নীল) */}
          <button
            id="select-blue-first"
            onClick={() => onSelectColor('blue')}
            className="w-full p-3.5 rounded-2xl flex items-center justify-between border-2 border-blue-600 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 active:scale-98 transition-all cursor-pointer group"
            style={{
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-900 border-2 border-blue-300 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <div className="w-6 h-6 rounded-full bg-gradient-to-b from-blue-300 to-blue-500 shadow-xs" />
              </div>
              <div className="text-left">
                <div className="text-base font-black tracking-wide text-white">
                  নীল (Blue)
                </div>
                <div className="text-[11px] font-medium text-blue-200">
                  নিচের গুটি • Blue moves first
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-500/40 border border-blue-300/50 text-blue-100">
              Start
            </span>
          </button>

          {/* Red Option (লাল) */}
          <button
            id="select-red-first"
            onClick={() => onSelectColor('red')}
            className="w-full p-3.5 rounded-2xl flex items-center justify-between border-2 border-red-600 bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white shadow-lg hover:from-red-600 hover:to-red-700 active:scale-98 transition-all cursor-pointer group"
            style={{
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-red-900 border-2 border-red-300 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <div className="w-6 h-6 rounded-full bg-gradient-to-b from-red-300 to-red-500 shadow-xs" />
              </div>
              <div className="text-left">
                <div className="text-base font-black tracking-wide text-white">
                  লাল (Red)
                </div>
                <div className="text-[11px] font-medium text-red-200">
                  উপরের গুটি • Red moves first
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-500/40 border border-red-300/50 text-red-100">
              Start
            </span>
          </button>
        </div>

        {/* Cancel Button */}
        {onClose && (
          <button
            id="cancel-first-move"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold text-xs text-[#5c3312] hover:text-[#301602] hover:bg-[#e9d2af] transition-all cursor-pointer"
          >
            বাতিল (Cancel)
          </button>
        )}
      </div>
    </div>
  );
};

interface GameOverModalProps {
  isOpen: boolean;
  winner: Player | 'draw' | null;
  winReason?: string;
  scoreYou: number;
  scoreOpponent: number;
  onPlayAgain: () => void;
  onBackHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  winReason,
  scoreYou,
  scoreOpponent,
  onPlayAgain,
  onBackHome,
}) => {
  if (!isOpen) return null;

  const isYouWinner = winner === 'you';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-300">
      <div
        className="w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl border-2 border-[#b88c56] bg-[#f5e6c8]"
        style={{
          boxShadow: '0 20px 50px rgba(0,0,0,0.7), inset 0 2px 3px rgba(255,255,255,0.8)',
        }}
      >
        {/* Crown or Trophy Graphic */}
        <div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center bg-amber-400 border-2 border-amber-600 shadow-md">
          <span className="text-3xl">🏆</span>
        </div>

        <h2 className="text-3xl font-black text-[#451a03] mb-1">
          {winner === 'draw' ? 'Match Draw!' : isYouWinner ? 'You Win!' : 'Opponent Wins!'}
        </h2>

        {winReason && (
          <p className="text-xs font-semibold text-[#78350f] uppercase tracking-wide mb-4">
            {winReason}
          </p>
        )}

        {/* Final Score Board */}
        <div className="bg-[#ebd3aa] rounded-2xl p-4 mb-6 border border-[#b88c56]/60 flex justify-around items-center">
          <div className="text-center">
            <div className="text-xs font-bold text-blue-800 uppercase">You</div>
            <div className="text-3xl font-black text-blue-900">{scoreYou}</div>
          </div>
          <div className="text-xl font-extrabold text-[#78350f]">:</div>
          <div className="text-center">
            <div className="text-xs font-bold text-red-800 uppercase">Opponent</div>
            <div className="text-3xl font-black text-red-900">{scoreOpponent}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 rounded-xl font-extrabold text-base tracking-wide uppercase text-amber-950 bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 border-2 border-amber-600 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            Play Again
          </button>
          <button
            onClick={onBackHome}
            className="w-full py-3 rounded-xl font-bold text-sm text-[#451a03] bg-[#dfc59b] hover:bg-[#d4b584] border border-[#b88c56] active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

interface ThinkingOverlayProps {
  isThinking: boolean;
  currentDepth: number;
  elapsedSeconds?: number;
  onCancel?: () => void;
}

export const ThinkingOverlay: React.FC<ThinkingOverlayProps> = ({
  isThinking,
  currentDepth,
  elapsedSeconds = 0,
  onCancel,
}) => {
  if (!isThinking) return null;

  return (
    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-40 w-[92%] max-w-[380px] px-4 py-2.5 rounded-2xl bg-[#241105]/95 border-2 border-amber-500 shadow-2xl flex flex-col gap-1.5 text-amber-100 backdrop-blur-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-xs font-black tracking-wide text-amber-200">
            গ্র্যান্ডমাস্টার এআই বিশ্লেষণ চলছে...
          </span>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-2 py-0.5 rounded-md bg-amber-900/80 hover:bg-amber-800 text-[10px] font-bold text-amber-300 border border-amber-600/50 cursor-pointer"
          >
            থামান
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-amber-300/90 pt-0.5 border-t border-amber-900/60">
        <span className="font-semibold">
          ডেপথ: <strong className="text-white text-xs">{currentDepth || 1}</strong> / ১৪ প্লাই
        </span>
        <span className="text-[10px] text-amber-200 font-sans">
          সময়: <strong className="font-mono text-xs text-white">{elapsedSeconds.toFixed(1)}</strong> সে (১০-১৫ সে)
        </span>
      </div>

      {/* Progress visual indicator */}
      <div className="w-full bg-stone-900/90 h-1.5 rounded-full overflow-hidden border border-amber-950">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(8, (currentDepth / 14) * 100))}%` }}
        />
      </div>
    </div>
  );
};
