import { useState, useCallback, useRef, useEffect } from 'react';
import { Player, PieceColor, FullMove, HintResult, RankedCandidateMove, HistoryMove } from './types';
import { getInitialBoard, ADJACENCY, JUMPS_FROM } from './game/boardGeometry';
import {
  getSingleJumpsFrom,
  hasAnyCaptures,
  checkGameOver,
  playerToColor,
  colorToPlayer,
  getOpponentColor,
} from './game/rules';
import { globalAiEngine, getBoardKey } from './game/aiEngine';
import { sound } from './utils/audio';

import { HomeScreen } from './components/HomeScreen';
import { PlayerCard } from './components/PlayerCard';
import { BoardView } from './components/BoardView';
import {
  ConfirmLeaveModal,
  GameOverModal,
  ThinkingOverlay,
  FirstMoveModal,
} from './components/Modals';

import { ArrowLeft, RotateCcw, Lightbulb, Volume2, VolumeX } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'home' | 'game'>('home');

  // Game state
  const [board, setBoard] = useState<PieceColor[]>(getInitialBoard);
  const [currentTurn, setCurrentTurn] = useState<Player>('you');
  const [scoreYou, setScoreYou] = useState(0);
  const [scoreOpponent, setScoreOpponent] = useState(0);

  // Move and interaction state
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [validDestinations, setValidDestinations] = useState<number[]>([]);
  const [inChainCapture, setInChainCapture] = useState(false);
  const [activeChainFrom, setActiveChainFrom] = useState<number | null>(null);

  // Mandatory capture reminder toast
  const [mandatoryNotice, setMandatoryNotice] = useState<string | null>(null);

  // Move history for anti-loop and oscillation prevention
  const [moveHistory, setMoveHistory] = useState<HistoryMove[]>([]);
  const [chainOrigin, setChainOrigin] = useState<number | null>(null);

  // Hint state & candidate cycling
  const [hintResult, setHintResult] = useState<HintResult | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingDepth, setThinkingDepth] = useState(1);
  const [elapsedThinkingSeconds, setElapsedThinkingSeconds] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const thinkingTimerRef = useRef<number | null>(null);
  const [cachedRankedMoves, setCachedRankedMoves] = useState<RankedCandidateMove[]>([]);
  const [cachedBoardKey, setCachedBoardKey] = useState<string | null>(null);
  const [currentHintIndex, setCurrentHintIndex] = useState<number>(0);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    };
  }, []);

  // Cancel thinking on user demand
  const handleCancelThinking = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Audio mute
  const [isMuted, setIsMuted] = useState(false);

  // Modals
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showFirstMoveModal, setShowFirstMoveModal] = useState(false);
  const [gameOver, setGameOver] = useState<{
    isOver: boolean;
    winner: Player | 'draw' | null;
    reason?: string;
  }>({ isOver: false, winner: null });

  // Start match with selected first color
  const startMatchWithColor = useCallback((firstColor: 'blue' | 'red') => {
    sound.playMove();
    const startPlayer: Player = firstColor === 'blue' ? 'you' : 'opponent';
    setBoard(getInitialBoard());
    setCurrentTurn(startPlayer);
    setScoreYou(0);
    setScoreOpponent(0);
    setSelectedNode(null);
    setValidDestinations([]);
    setInChainCapture(false);
    setActiveChainFrom(null);
    setChainOrigin(null);
    setMoveHistory([]);
    setHintResult(null);
    setCachedRankedMoves([]);
    setCachedBoardKey(null);
    setCurrentHintIndex(0);
    setIsThinking(false);
    setMandatoryNotice(null);
    setGameOver({ isOver: false, winner: null });
    setShowFirstMoveModal(false);
    setView('game');
  }, []);

  // Open first move selection popup
  const handleOpenFirstMoveModal = useCallback(() => {
    sound.playPieceSelect();
    setShowFirstMoveModal(true);
  }, []);

  // Start new match from Home
  const handleStartMatch = () => {
    handleOpenFirstMoveModal();
  };

  // Toggle sound
  const toggleSound = () => {
    sound.enabled = !sound.enabled;
    setIsMuted(!sound.enabled);
  };

  // Request deep adversarial search hint with multi-move cycling on repeated clicks
  const handleRequestHint = async () => {
    if (isThinking || gameOver.isOver) return;

    const currentColor = playerToColor(currentTurn);
    const currentKey = getBoardKey(board, currentColor);

    // If user clicks Hint repeatedly on the same board, cycle through the ranked moves!
    if (cachedBoardKey === currentKey && cachedRankedMoves.length > 1) {
      sound.playPieceSelect();
      const nextIndex = (currentHintIndex + 1) % cachedRankedMoves.length;
      setCurrentHintIndex(nextIndex);
      const candidate = cachedRankedMoves[nextIndex];
      setHintResult({
        bestMove: candidate.move,
        depthReached: hintResult?.depthReached ?? 10,
        score: candidate.score,
        timeMs: 0,
        rank: nextIndex + 1,
        totalCandidates: cachedRankedMoves.length,
        isBlunderFree: !candidate.isBlunder,
        explanation: candidate.explanation,
        rankedMoves: cachedRankedMoves,
      });
      sound.playHint();
      return;
    }

    sound.playPieceSelect();
    setIsThinking(true);
    setThinkingDepth(1);
    setElapsedThinkingSeconds(0);
    setHintResult(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const startTimestamp = performance.now();
    if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    thinkingTimerRef.current = window.setInterval(() => {
      const sec = (performance.now() - startTimestamp) / 1000;
      setElapsedThinkingSeconds(sec);
    }, 100);

    try {
      // 12 to 14 plies deep iterative deepening search (12,000ms grandmaster time budget)
      const result = await globalAiEngine.searchRankedMoves(
        board,
        currentColor,
        14,
        12000,
        moveHistory,
        (depth) => {
          setThinkingDepth(depth);
        },
        controller.signal
      );

      setCachedBoardKey(currentKey);
      setCachedRankedMoves(result.rankedMoves ?? []);
      setCurrentHintIndex(0);
      setHintResult(result);
      sound.playHint();
    } catch {
      // Handle error or cancellation gracefully
    } finally {
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
      setIsThinking(false);
    }
  };

  // Node click handler
  const handleNodeClick = (nodeId: number) => {
    if (gameOver.isOver || isThinking) return;

    const currentColor = playerToColor(currentTurn);
    const opponentColor = getOpponentColor(currentColor)!;

    // --- Scenario A: In the middle of a multi-jump capture chain ---
    if (inChainCapture && activeChainFrom !== null) {
      if (validDestinations.includes(nodeId)) {
        // Execute the next jump in the chain
        const jump = JUMPS_FROM[activeChainFrom].find(
          (j) =>
            j.to === nodeId &&
            board[j.over] === opponentColor &&
            board[nodeId] === null
        );

        if (jump) {
          const newBoard = [...board];
          newBoard[activeChainFrom] = null;
          newBoard[jump.over] = null;
          newBoard[nodeId] = currentColor;

          // Increment score
          if (currentTurn === 'you') {
            setScoreYou((s) => s + 1);
          } else {
            setScoreOpponent((s) => s + 1);
          }

          sound.playCapture();

          // Check if another jump is available from the new landing node
          const furtherJumps = getSingleJumpsFrom(newBoard, nodeId, currentColor);

          if (furtherJumps.length > 0) {
            // Must continue jumping!
            setBoard(newBoard);
            setActiveChainFrom(nodeId);
            setSelectedNode(nodeId);
            setValidDestinations(furtherJumps.map((j) => j.to));
          } else {
            // Multi-jump chain complete! Pass turn.
            const fromNode = chainOrigin ?? activeChainFrom;
            setMoveHistory((prev) => [
              ...prev,
              {
                from: fromNode,
                to: nodeId,
                player: currentTurn,
                isCapture: true,
              },
            ]);
            setChainOrigin(null);

            setBoard(newBoard);
            setInChainCapture(false);
            setActiveChainFrom(null);
            setSelectedNode(null);
            setValidDestinations([]);
            setHintResult(null);
            setCachedRankedMoves([]);
            setCachedBoardKey(null);
            setCurrentHintIndex(0);
            setMandatoryNotice(null);

            const nextTurn: Player = currentTurn === 'you' ? 'opponent' : 'you';
            setCurrentTurn(nextTurn);

            const gameStatus = checkGameOver(newBoard, nextTurn);
            if (gameStatus.isOver) {
              setGameOver(gameStatus);
              sound.playVictory();
            }
          }
        }
      }
      return;
    }

    // --- Scenario B: Standard turn selection and movement ---
    const pieceAtNode = board[nodeId];

    // Clicking own piece
    if (pieceAtNode === currentColor) {
      // Find both jump captures and normal adjacent empty nodes
      const pieceJumps = getSingleJumpsFrom(board, nodeId, currentColor);
      const emptyNeighbors = ADJACENCY[nodeId].filter((n) => board[n] === null);

      const allDestinations = [
        ...pieceJumps.map((j) => j.to),
        ...emptyNeighbors,
      ];

      if (allDestinations.length > 0) {
        setSelectedNode(nodeId);
        setValidDestinations(allDestinations);
        setMandatoryNotice(null);
        sound.playPieceSelect();
      }
      return;
    }

    // Clicking an empty destination that is in validDestinations
    if (selectedNode !== null && validDestinations.includes(nodeId)) {
      const jump = JUMPS_FROM[selectedNode].find(
        (j) =>
          j.to === nodeId &&
          board[j.over] === opponentColor &&
          board[nodeId] === null
      );

      if (jump) {
        // --- Single or Initial Capture Move ---
        const newBoard = [...board];
        newBoard[selectedNode] = null;
        newBoard[jump.over] = null;
        newBoard[nodeId] = currentColor;

        if (currentTurn === 'you') {
          setScoreYou((s) => s + 1);
        } else {
          setScoreOpponent((s) => s + 1);
        }

        sound.playCapture();

        // Check if chain continues
        const furtherJumps = getSingleJumpsFrom(newBoard, nodeId, currentColor);

        if (furtherJumps.length > 0) {
          // Enter chain capture state
          setBoard(newBoard);
          setInChainCapture(true);
          setChainOrigin(selectedNode);
          setActiveChainFrom(nodeId);
          setSelectedNode(nodeId);
          setValidDestinations(furtherJumps.map((j) => j.to));
          setMandatoryNotice('Chain capture! You must continue jumping.');
        } else {
          // Single capture finished
          setMoveHistory((prev) => [
            ...prev,
            {
              from: selectedNode,
              to: nodeId,
              player: currentTurn,
              isCapture: true,
            },
          ]);
          setChainOrigin(null);

          setBoard(newBoard);
          setSelectedNode(null);
          setValidDestinations([]);
          setHintResult(null);
          setCachedRankedMoves([]);
          setCachedBoardKey(null);
          setCurrentHintIndex(0);
          setMandatoryNotice(null);

          const nextTurn: Player = currentTurn === 'you' ? 'opponent' : 'you';
          setCurrentTurn(nextTurn);

          const gameStatus = checkGameOver(newBoard, nextTurn);
          if (gameStatus.isOver) {
            setGameOver(gameStatus);
            sound.playVictory();
          }
        }
      } else {
        // --- Regular 1-Step Move ---
        const newBoard = [...board];
        newBoard[selectedNode] = null;
        newBoard[nodeId] = currentColor;

        sound.playMove();

        setMoveHistory((prev) => [
          ...prev,
          {
            from: selectedNode,
            to: nodeId,
            player: currentTurn,
            isCapture: false,
          },
        ]);

        setBoard(newBoard);
        setSelectedNode(null);
        setValidDestinations([]);
        setHintResult(null);
        setCachedRankedMoves([]);
        setCachedBoardKey(null);
        setCurrentHintIndex(0);
        setMandatoryNotice(null);

        const nextTurn: Player = currentTurn === 'you' ? 'opponent' : 'you';
        setCurrentTurn(nextTurn);

        const gameStatus = checkGameOver(newBoard, nextTurn);
        if (gameStatus.isOver) {
          setGameOver(gameStatus);
          sound.playVictory();
        }
      }
    } else {
      // Clicked outside valid destinations
      if (!inChainCapture) {
        setSelectedNode(null);
        setValidDestinations([]);
        setMandatoryNotice(null);
      }
    }
  };

  // If on Home view, render minimal Home Screen
  if (view === 'home') {
    return (
      <div className="min-h-screen w-full wood-bg flex flex-col justify-center">
        <HomeScreen onStart={handleStartMatch} />
        <FirstMoveModal
          isOpen={showFirstMoveModal}
          onSelectColor={startMatchWithColor}
          onClose={() => setShowFirstMoveModal(false)}
        />
      </div>
    );
  }

  // Otherwise, render Game Board Screen
  return (
    <div className="relative min-h-screen w-full wood-bg flex flex-col items-center justify-between py-3 px-3 overflow-x-hidden select-none">
      {/* Top Header Bar: Back Button, Opponent Card, Reset Button */}
      <header className="w-full max-w-[420px] flex items-center justify-between gap-2.5 z-20">
        {/* Back Button (top-left circular icon button) */}
        <button
          id="back-button"
          onClick={() => setShowLeaveConfirm(true)}
          title="Exit match"
          className="w-11 h-11 rounded-full flex items-center justify-center wood-button cursor-pointer text-[#fff0d4] hover:text-white transition-transform"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Opponent Card */}
        <div className="flex-1">
          <PlayerCard
            player="opponent"
            score={scoreOpponent}
            isTurn={currentTurn === 'opponent'}
          />
        </div>

        {/* Reset Button (top-right circular icon button) */}
        <button
          id="reset-button"
          onClick={handleOpenFirstMoveModal}
          title="Reset board"
          className="w-11 h-11 rounded-full flex items-center justify-center wood-button cursor-pointer text-[#fff0d4] hover:text-white transition-transform"
        >
          <RotateCcw className="w-5 h-5 stroke-[2.5]" />
        </button>
      </header>

      {/* Main Board Stage */}
      <main className="relative w-full max-w-[420px] my-auto flex flex-col items-center justify-center">
        {/* AI Thinking Indicator */}
        <ThinkingOverlay
          isThinking={isThinking}
          currentDepth={thinkingDepth}
          elapsedSeconds={elapsedThinkingSeconds}
          onCancel={handleCancelThinking}
        />

        {/* Mandatory capture warning notice (zero-lag crisp banner) */}
        {mandatoryNotice && (
          <div className="absolute -top-3 z-30 px-3.5 py-1.5 rounded-full bg-amber-900/95 text-amber-100 text-xs font-bold border-2 border-amber-500 shadow-xl">
            {mandatoryNotice}
          </div>
        )}

        {/* 16 Ghuti SVG Board */}
        <BoardView
          board={board}
          currentTurn={currentTurn}
          selectedNode={selectedNode}
          validDestinations={validDestinations}
          hintMove={hintResult?.bestMove ?? null}
          onNodeClick={handleNodeClick}
          inChainCapture={inChainCapture}
          activeChainFrom={activeChainFrom}
        />

        {/* Hint Info Pill Bar */}
        {hintResult && (
          <div className="mt-1 flex flex-col gap-1 px-3.5 py-1.5 rounded-2xl bg-[#341b09]/95 border border-amber-500/80 shadow-lg text-xs text-amber-100 z-10 animate-in fade-in max-w-[400px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/50 text-[10px] font-black text-amber-300">
                  Move #{hintResult.rank ?? 1} of {hintResult.totalCandidates ?? 1}
                </span>
                {hintResult.isBlunderFree ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/50 text-[9px] font-bold text-emerald-300">
                    ✓ Safe
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-md bg-rose-950/80 border border-rose-500/50 text-[9px] font-bold text-rose-300">
                    ⚠ Risky
                  </span>
                )}
                <span className="text-[11px] font-medium text-amber-200">
                  {hintResult.explanation ||
                    (hintResult.bestMove.isCapture
                      ? `Capture (${hintResult.bestMove.captured.length})`
                      : 'Positional Move')}
                </span>
              </div>
              <button
                onClick={() => setHintResult(null)}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-100 underline cursor-pointer shrink-0 ml-1"
              >
                Dismiss
              </button>
            </div>
            {(hintResult.totalCandidates ?? 0) > 1 && (
              <div className="flex items-center justify-between text-[10px] text-amber-300/80 border-t border-amber-900/50 pt-1">
                <span>🔄 Click <strong>HINT</strong> again to see alternative #{((currentHintIndex + 1) % (hintResult.totalCandidates ?? 1)) + 1}</span>
                <span className="font-mono text-[9px] opacity-75">Depth {hintResult.depthReached}</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Footer Bar: Hint Button, You Card, Audio Toggle */}
      <footer className="w-full max-w-[420px] flex items-center justify-between gap-2.5 z-20">
        {/* Large Circular Wooden HINT Button (Matches screenshot) */}
        <div className="flex flex-col items-center">
          <button
            id="hint-button"
            onClick={handleRequestHint}
            disabled={isThinking || gameOver.isOver}
            title={
              cachedRankedMoves.length > 1
                ? 'Cycle to next best move'
                : 'Get Deep AI Search Hint'
            }
            className={`relative w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
              isThinking
                ? 'opacity-60 scale-95'
                : 'active:scale-95 hover:scale-105'
            }`}
            style={{
              background:
                'radial-gradient(circle at 35% 30%, #d97706 0%, #92400e 65%, #451a03 100%)',
              border: '2px solid #b45309',
              boxShadow:
                '0 6px 14px rgba(45, 19, 4, 0.5), inset 0 1.5px 2px rgba(255, 255, 255, 0.4), inset 0 -2px 3px rgba(0, 0, 0, 0.6)',
            }}
          >
            <Lightbulb
              className={`w-6 h-6 ${
                isThinking
                  ? 'text-amber-300 animate-pulse'
                  : 'text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
              }`}
            />
            <span
              className="absolute -bottom-2 px-1.5 py-0.2 rounded-md bg-stone-900 text-[9px] font-black tracking-widest text-amber-100 uppercase border border-amber-900/80 shadow-xs"
              style={{ textShadow: '0 1px 1px #000' }}
            >
              {cachedRankedMoves.length > 1 ? 'NEXT' : 'HINT'}
            </span>
          </button>
        </div>

        {/* You Card (mirrored layout) */}
        <div className="flex-1">
          <PlayerCard
            player="you"
            score={scoreYou}
            isTurn={currentTurn === 'you'}
          />
        </div>

        {/* Mute / Audio Toggle */}
        <button
          onClick={toggleSound}
          title={isMuted ? 'Unmute audio' : 'Mute audio'}
          className="w-11 h-11 rounded-full flex items-center justify-center wood-button cursor-pointer text-[#fff0d4] hover:text-white transition-transform"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 opacity-70" />
          ) : (
            <Volume2 className="w-5 h-5 stroke-[2.5]" />
          )}
        </button>
      </footer>

      {/* Leave Match Confirmation Modal */}
      <ConfirmLeaveModal
        isOpen={showLeaveConfirm}
        onConfirm={() => {
          setShowLeaveConfirm(false);
          setView('home');
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {/* Game Over Win/Loss Modal */}
      <GameOverModal
        isOpen={gameOver.isOver}
        winner={gameOver.winner}
        winReason={gameOver.reason}
        scoreYou={scoreYou}
        scoreOpponent={scoreOpponent}
        onPlayAgain={() => {
          setGameOver({ isOver: false, winner: null });
          handleOpenFirstMoveModal();
        }}
        onBackHome={() => {
          setGameOver({ isOver: false, winner: null });
          setView('home');
        }}
      />

      {/* First Move Selection Popup Modal */}
      <FirstMoveModal
        isOpen={showFirstMoveModal}
        onSelectColor={startMatchWithColor}
        onClose={() => setShowFirstMoveModal(false)}
      />
    </div>
  );
}
