import { PieceColor, FullMove, HintResult, RankedCandidateMove, HistoryMove } from '../types';
import {
  GRAND_HUBS,
  CENTRAL_COLUMN_NODES,
  CENTRAL_CORRIDORS,
  SIDE_WING_HUBS,
  SIDE_WING_FLANK_NODES,
} from './boardGeometry';
import {
  getLegalMoves,
  getAllCaptureMoves,
  getOpponentColor,
  evaluateBoard,
  evaluateMoveSafety,
  POSITION_WEIGHTS,
} from './rules';

const WIN_SCORE = 800000;
const LOSS_SCORE = -800000;
const MAX_TT_ENTRIES = 150000;

// ==========================================
// 64-bit Zobrist Hashing for Position Cache
// ==========================================
// 37 nodes * 2 piece types (0: blue, 1: red) = 74 keys + 1 side key
const ZOBRIST_PIECES = new BigInt64Array(37 * 2);

function xorShift64(state: bigint): bigint {
  let x = state;
  x ^= (x << 13n) & 0xffffffffffffffffn;
  x ^= (x >> 7n) & 0xffffffffffffffffn;
  x ^= (x << 17n) & 0xffffffffffffffffn;
  return x & 0xffffffffffffffffn;
}

let seed = 0x2b992ddfa23249d6n;
for (let i = 0; i < 37 * 2; i++) {
  seed = xorShift64(seed);
  ZOBRIST_PIECES[i] = seed;
}
const ZOBRIST_SIDE = xorShift64(seed);

/**
 * Compute the full 64-bit Zobrist hash of a board and side to move.
 */
export function computeBoardHash(board: PieceColor[], sideToMove: PieceColor): bigint {
  let hash = 0n;
  for (let i = 0; i < 37; i++) {
    const p = board[i];
    if (p === 'blue') {
      hash ^= ZOBRIST_PIECES[i * 2];
    } else if (p === 'red') {
      hash ^= ZOBRIST_PIECES[i * 2 + 1];
    }
  }
  if (sideToMove === 'red') {
    hash ^= ZOBRIST_SIDE;
  }
  return hash;
}

/**
 * Fast string key for backward compatibility with App.tsx state caching
 */
export function getBoardKey(board: PieceColor[], side: PieceColor): string {
  let key = side === 'blue' ? 'B:' : 'R:';
  for (let i = 0; i < 37; i++) {
    const p = board[i];
    key += p === 'blue' ? '1' : p === 'red' ? '2' : '0';
  }
  return key;
}

/**
 * Fast O(1) calculation of hash difference (delta) when applying/undoing a move.
 */
function getMoveHashDelta(move: FullMove, pieceColor: PieceColor): bigint {
  const pIdx = pieceColor === 'blue' ? 0 : 1;
  const oppIdx = 1 - pIdx;

  let delta = ZOBRIST_PIECES[move.from * 2 + pIdx] ^ ZOBRIST_PIECES[move.to * 2 + pIdx] ^ ZOBRIST_SIDE;
  for (let i = 0; i < move.captured.length; i++) {
    delta ^= ZOBRIST_PIECES[move.captured[i] * 2 + oppIdx];
  }
  return delta;
}

// In-place board manipulation for maximum search performance
function applyMoveInPlace(board: PieceColor[], move: FullMove, pieceColor: PieceColor): void {
  board[move.from] = null;
  for (let i = 0; i < move.captured.length; i++) {
    board[move.captured[i]] = null;
  }
  board[move.to] = pieceColor;
}

function undoMoveInPlace(
  board: PieceColor[],
  move: FullMove,
  pieceColor: PieceColor,
  enemyColor: PieceColor
): void {
  board[move.to] = null;
  for (let i = 0; i < move.captured.length; i++) {
    board[move.captured[i]] = enemyColor;
  }
  board[move.from] = pieceColor;
}

interface TTEntry {
  depth: number;
  score: number;
  flag: 'exact' | 'lower' | 'upper';
  bestMove?: FullMove;
  age: number;
}

class SearchTimeoutError extends Error {
  constructor() {
    super('Search timed out');
  }
}

export class AdversarialEngine {
  // Persistent Transposition Table across moves and searches
  private tt = new Map<bigint, TTEntry>();
  private searchAge = 0;
  private nodesVisited = 0;
  private deadline = 0;
  public ttHits = 0;

  // Move ordering heuristics for deep 8-12 ply pruning
  private killerMoves: [FullMove | null, FullMove | null][] = Array.from(
    { length: 32 },
    () => [null, null]
  );
  private historyTable: Int32Array = new Int32Array(37 * 37);

  /**
   * Clears the transposition table memory if ever requested
   */
  public clearCache(): void {
    this.tt.clear();
    this.historyTable.fill(0);
    this.killerMoves = Array.from({ length: 32 }, () => [null, null]);
    this.searchAge = 0;
  }

  /**
   * Store an entry in the Transposition Table with replacement and aging strategy
   */
  private storeTT(
    hash: bigint,
    depth: number,
    score: number,
    flag: 'exact' | 'lower' | 'upper',
    bestMove?: FullMove
  ): void {
    const existing = this.tt.get(hash);
    if (!existing || depth >= existing.depth || flag === 'exact') {
      this.tt.set(hash, {
        depth,
        score,
        flag,
        bestMove: bestMove ?? existing?.bestMove,
        age: this.searchAge,
      });
    }

    // Periodically prune oldest entries if table capacity is exceeded
    if (this.tt.size > MAX_TT_ENTRIES) {
      const targetPruneAge = this.searchAge - 2;
      for (const [key, entry] of this.tt.entries()) {
        if (entry.age < targetPruneAge) {
          this.tt.delete(key);
        }
        if (this.tt.size <= MAX_TT_ENTRIES * 0.8) break;
      }
    }
  }

  /**
   * Fast in-place move ordering without allocating wrapper objects:
   * 1. TT Hash move immediately placed at index 0 for instant beta cutoffs
   * 2. Captures (Multi-jumps first, then single captures)
   * 3. Killer moves from same search ply
   * 4. History heuristic score
   * 5. Strategic positional weight
   */
  private orderMovesInPlace(
    moves: FullMove[],
    ply: number,
    hashMove?: FullMove | null
  ): void {
    if (moves.length <= 1) return;

    // 1. Hash move: swap to index 0 immediately
    if (hashMove) {
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].from === hashMove.from && moves[i].to === hashMove.to) {
          if (i !== 0) {
            const tmp = moves[0];
            moves[0] = moves[i];
            moves[i] = tmp;
          }
          break;
        }
      }
    }

    const startIdx =
      hashMove && moves[0].from === hashMove.from && moves[0].to === hashMove.to ? 1 : 0;
    if (startIdx >= moves.length - 1) return;

    const km1 = ply < 32 ? this.killerMoves[ply][0] : null;
    const km2 = ply < 32 ? this.killerMoves[ply][1] : null;

    const scores = new Int32Array(moves.length);
    for (let i = startIdx; i < moves.length; i++) {
      const m = moves[i];
      if (m.isCapture) {
        scores[i] = 5000000 + m.captured.length * 100000;
      } else {
        if (km1 && m.from === km1.from && m.to === km1.to) {
          scores[i] = 2000000;
        } else if (km2 && m.from === km2.from && m.to === km2.to) {
          scores[i] = 1500000;
        } else {
          let posBonus = (POSITION_WEIGHTS[m.to] || 0) * 35;
          if (m.to === 18) {
            posBonus += 250000;
          } else if (SIDE_WING_HUBS.includes(m.to)) {
            // Pivotal side wings (Nodes 16 & 20) with 5 connections
            posBonus += 180000;
          } else if (GRAND_HUBS.includes(m.to)) {
            posBonus += 150000;
          } else if (CENTRAL_COLUMN_NODES.includes(m.to)) {
            posBonus += 70000;
          } else if (SIDE_WING_FLANK_NODES.includes(m.to)) {
            posBonus += 60000;
          } else if (CENTRAL_CORRIDORS.includes(m.to)) {
            posBonus += 50000;
          }
          scores[i] = this.historyTable[m.from * 37 + m.to] + posBonus;
        }
      }
    }

    // In-place insertion sort
    for (let i = startIdx + 1; i < moves.length; i++) {
      const keyMove = moves[i];
      const keyScore = scores[i];
      let j = i - 1;
      while (j >= startIdx && scores[j] < keyScore) {
        moves[j + 1] = moves[j];
        scores[j + 1] = scores[j];
        j--;
      }
      moves[j + 1] = keyMove;
      scores[j + 1] = keyScore;
    }
  }

  /**
   * Quiescence Search: resolves all tactical capture sequences to prevent horizon blunders
   */
  private quiescence(
    board: PieceColor[],
    alpha: number,
    beta: number,
    sideToMove: PieceColor,
    rootSide: PieceColor,
    qDepth: number,
    currentHash: bigint
  ): number {
    this.nodesVisited++;
    if ((this.nodesVisited & 1023) === 0) {
      if (performance.now() > this.deadline) {
        throw new SearchTimeoutError();
      }
    }

    const enemySide = getOpponentColor(sideToMove)!;
    const isMaximizing = sideToMove === rootSide;

    // Check TT for quiescence state
    const ttEntry = this.tt.get(currentHash);
    if (ttEntry) {
      this.ttHits++;
      if (ttEntry.flag === 'exact') return ttEntry.score;
      if (ttEntry.flag === 'lower' && ttEntry.score > alpha) alpha = ttEntry.score;
      if (ttEntry.flag === 'upper' && ttEntry.score < beta) beta = ttEntry.score;
      if (alpha >= beta) return ttEntry.score;
    }

    const standPat = evaluateBoard(board, rootSide);

    // If quiet position or qDepth limit reached, return static evaluation
    const captures = getAllCaptureMoves(board, sideToMove);
    if (captures.length === 0 || qDepth <= 0) {
      return standPat;
    }

    this.orderMovesInPlace(captures, 0, ttEntry?.bestMove);

    if (isMaximizing) {
      let maxEval = standPat;
      if (maxEval > alpha) alpha = maxEval;
      if (alpha >= beta) return maxEval;

      for (let i = 0; i < captures.length; i++) {
        const move = captures[i];
        const delta = getMoveHashDelta(move, sideToMove);

        applyMoveInPlace(board, move, sideToMove);
        currentHash ^= delta;

        const score = this.quiescence(
          board,
          alpha,
          beta,
          enemySide,
          rootSide,
          qDepth - 1,
          currentHash
        );

        undoMoveInPlace(board, move, sideToMove, enemySide);
        currentHash ^= delta;

        if (score > maxEval) maxEval = score;
        if (score > alpha) alpha = score;
        if (alpha >= beta) break;
      }
      return maxEval;
    } else {
      let minEval = standPat;
      if (minEval < beta) beta = minEval;
      if (alpha >= beta) return minEval;

      for (let i = 0; i < captures.length; i++) {
        const move = captures[i];
        const delta = getMoveHashDelta(move, sideToMove);

        applyMoveInPlace(board, move, sideToMove);
        currentHash ^= delta;

        const score = this.quiescence(
          board,
          alpha,
          beta,
          enemySide,
          rootSide,
          qDepth - 1,
          currentHash
        );

        undoMoveInPlace(board, move, sideToMove, enemySide);
        currentHash ^= delta;

        if (score < minEval) minEval = score;
        if (score < beta) beta = score;
        if (alpha >= beta) break;
      }
      return minEval;
    }
  }

  /**
   * High-performance Alpha-Beta Minimax with Transposition Table caching & Move Ordering
   */
  private minimax(
    board: PieceColor[],
    depth: number,
    alpha: number,
    beta: number,
    sideToMove: PieceColor,
    rootSide: PieceColor,
    ply: number,
    currentHash: bigint
  ): { score: number; bestMove?: FullMove } {
    this.nodesVisited++;

    if ((this.nodesVisited & 1023) === 0) {
      if (performance.now() > this.deadline) {
        throw new SearchTimeoutError();
      }
    }

    const enemySide = getOpponentColor(sideToMove)!;

    // Transposition Table Lookup
    const ttEntry = this.tt.get(currentHash);
    if (ttEntry && ttEntry.depth >= depth) {
      this.ttHits++;
      if (ttEntry.flag === 'exact') {
        return { score: ttEntry.score, bestMove: ttEntry.bestMove };
      } else if (ttEntry.flag === 'lower' && ttEntry.score > alpha) {
        alpha = ttEntry.score;
      } else if (ttEntry.flag === 'upper' && ttEntry.score < beta) {
        beta = ttEntry.score;
      }
      if (alpha >= beta) {
        return { score: ttEntry.score, bestMove: ttEntry.bestMove };
      }
    }

    // Generate legal moves
    const legalMoves = getLegalMoves(board, sideToMove);

    // Terminal condition: no legal moves = game loss
    if (legalMoves.length === 0) {
      const lossScore = sideToMove === rootSide ? LOSS_SCORE - depth : WIN_SCORE + depth;
      return { score: lossScore };
    }

    // Depth reached: run Quiescence Search to resolve all pending captures
    if (depth <= 0) {
      const qScore = this.quiescence(
        board,
        alpha,
        beta,
        sideToMove,
        rootSide,
        6,
        currentHash
      );
      return { score: qScore };
    }

    const isMaximizing = sideToMove === rootSide;
    this.orderMovesInPlace(legalMoves, ply, ttEntry?.bestMove);
    let bestMove = legalMoves[0];
    const originalAlpha = alpha;
    const originalBeta = beta;

    if (isMaximizing) {
      let maxEval = -Infinity;

      for (let i = 0; i < legalMoves.length; i++) {
        const move = legalMoves[i];
        const delta = getMoveHashDelta(move, sideToMove);

        applyMoveInPlace(board, move, sideToMove);
        currentHash ^= delta;

        const result = this.minimax(
          board,
          depth - 1,
          alpha,
          beta,
          enemySide,
          rootSide,
          ply + 1,
          currentHash
        );

        undoMoveInPlace(board, move, sideToMove, enemySide);
        currentHash ^= delta;

        if (result.score > maxEval) {
          maxEval = result.score;
          bestMove = move;
        }

        if (result.score > alpha) {
          alpha = result.score;
        }

        if (alpha >= beta) {
          // Beta cutoff: update killer moves and history heuristic for quiet moves
          if (!move.isCapture && ply < 32) {
            if (this.killerMoves[ply][0]?.from !== move.from || this.killerMoves[ply][0]?.to !== move.to) {
              this.killerMoves[ply][1] = this.killerMoves[ply][0];
              this.killerMoves[ply][0] = move;
            }
            const histIdx = move.from * 37 + move.to;
            this.historyTable[histIdx] = Math.min(
              200000,
              this.historyTable[histIdx] + depth * depth * 32
            );
          }
          break;
        }
      }

      let flag: 'exact' | 'lower' | 'upper' = 'exact';
      if (maxEval <= originalAlpha) flag = 'upper';
      else if (maxEval >= beta) flag = 'lower';

      this.storeTT(currentHash, depth, maxEval, flag, bestMove);
      return { score: maxEval, bestMove };
    } else {
      let minEval = Infinity;

      for (let i = 0; i < legalMoves.length; i++) {
        const move = legalMoves[i];
        const delta = getMoveHashDelta(move, sideToMove);

        applyMoveInPlace(board, move, sideToMove);
        currentHash ^= delta;

        const result = this.minimax(
          board,
          depth - 1,
          alpha,
          beta,
          enemySide,
          rootSide,
          ply + 1,
          currentHash
        );

        undoMoveInPlace(board, move, sideToMove, enemySide);
        currentHash ^= delta;

        if (result.score < minEval) {
          minEval = result.score;
          bestMove = move;
        }

        if (result.score < beta) {
          beta = result.score;
        }

        if (alpha >= beta) {
          // Alpha cutoff for minimizing player
          if (!move.isCapture && ply < 32) {
            if (this.killerMoves[ply][0]?.from !== move.from || this.killerMoves[ply][0]?.to !== move.to) {
              this.killerMoves[ply][1] = this.killerMoves[ply][0];
              this.killerMoves[ply][0] = move;
            }
            const histIdx = move.from * 37 + move.to;
            this.historyTable[histIdx] = Math.min(
              200000,
              this.historyTable[histIdx] + depth * depth * 32
            );
          }
          break;
        }
      }

      let flag: 'exact' | 'lower' | 'upper' = 'exact';
      if (minEval <= originalAlpha) flag = 'upper';
      else if (minEval >= originalBeta) flag = 'lower';

      this.storeTT(currentHash, depth, minEval, flag, bestMove);
      return { score: minEval, bestMove };
    }
  }

  /**
   * Searches and ranks candidate root moves with 10 to 14+ plies deep Iterative Deepening.
   * Leverages Transposition Table, Zobrist hashing, and move ordering for grandmaster performance.
   * Default time budget is 12,000ms (12 seconds) up to 15,000ms for thorough, zero-mistake analysis.
   */
  public async searchRankedMoves(
    board: PieceColor[],
    sideToMove: PieceColor,
    maxDepth: number = 14,
    timeBudgetMs: number = 12000,
    history?: HistoryMove[],
    onProgress?: (depth: number, currentBest: FullMove, score: number, elapsedMs: number) => void,
    abortSignal?: AbortSignal
  ): Promise<HintResult> {
    const startTime = performance.now();
    this.deadline = startTime + timeBudgetMs;
    this.nodesVisited = 0;
    this.ttHits = 0;
    this.searchAge++;

    // Decay history table slightly to give fresh priority to current tactical context
    for (let i = 0; i < this.historyTable.length; i++) {
      this.historyTable[i] = (this.historyTable[i] * 3) >> 2;
    }
    this.killerMoves = Array.from({ length: 32 }, () => [null, null]);

    const enemySide = getOpponentColor(sideToMove)!;
    const legalMoves = getLegalMoves(board, sideToMove);
    if (legalMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    // Step 1: Pre-evaluate move safety, anti-loop history, and proactive progress for every candidate move
    const candidateEvaluations = legalMoves.map((m) => {
      const safety = evaluateMoveSafety(board, m, sideToMove, history);
      return {
        move: m,
        safetyScore: safety.safetyScore,
        isBlunder: safety.isBlunder,
        isLoopReversal: safety.isLoopReversal,
        progressDelta: safety.progressDelta,
        opponentMaxCounterCaptures: safety.opponentMaxCounterCaptures,
        netGain: safety.netGain,
        ourCaptures: safety.ourCaptures,
        threatCount: safety.threatCount,
        isFork: safety.isFork,
        explanation: safety.explanation,
        minimaxScore: 0,
        combinedScore: safety.safetyScore,
      };
    });

    let totalPieces = 0;
    for (let i = 0; i < 37; i++) {
      if (board[i] !== null) totalPieces++;
    }
    // Deep Horizon: Target 8-12 plies. Endgame with <= 14 pieces searches up to 12 plies.
    const effectiveMaxDepth = totalPieces <= 14 ? Math.max(maxDepth, 12) : maxDepth;

    // Sorting comparator: Blunder filter -> Anti-loop filter -> Zero Material Loss -> Aggressive Multi-Capture -> Fork -> Backbone Dominance -> Combined Score
    const sortCandidates = (
      a: (typeof candidateEvaluations)[0],
      b: (typeof candidateEvaluations)[0]
    ): number => {
      // 1. Blunders and self-destruct moves always lose to non-blunders
      if (!a.isBlunder && b.isBlunder) return -1;
      if (a.isBlunder && !b.isBlunder) return 1;

      // 2. Loop reversals always lose to genuine non-loop moves
      if (!a.isLoopReversal && b.isLoopReversal) return -1;
      if (a.isLoopReversal && !b.isLoopReversal) return 1;

      // 3. ZERO MATERIAL LOSS RULE (Safety First):
      // Moves where opponent gets ZERO counter-captures strictly beat moves with counter-capture risk!
      const aLoss = a.opponentMaxCounterCaptures || 0;
      const bLoss = b.opponentMaxCounterCaptures || 0;
      if (aLoss === 0 && bLoss > 0) return -1;
      if (aLoss > 0 && bLoss === 0) return 1;
      if (aLoss !== bLoss) return aLoss - bLoss; // Lower opponent counter-captures is always safer

      // 4. Multi-Captures: higher piece capture count takes precedence
      if (a.move.isCapture && b.move.isCapture && a.move.captured.length !== b.move.captured.length) {
        return b.move.captured.length - a.move.captured.length;
      }

      // 5. Clean Capture Priority: captures beat quiet moves
      if (a.move.isCapture && !b.move.isCapture) return -1;
      if (!a.move.isCapture && b.move.isCapture) return 1;

      // 6. Attacking Forks (Double Attacks): heavily prioritize moves that fork multiple enemy pieces
      if (!a.move.isCapture && !b.move.isCapture) {
        if (a.isFork && !b.isFork) return -1;
        if (!a.isFork && b.isFork) return 1;
        if (a.isFork && b.isFork && a.threatCount !== b.threatCount) {
          return b.threatCount - a.threatCount;
        }
      }

      // 7. Backbone Dominance (Grand Hubs & Central Column):
      // Prioritize moves seizing or anchoring Node 18, Grand Hubs, and Central Column 2
      if (!a.move.isCapture && !b.move.isCapture) {
        const aIs18 = a.move.to === 18;
        const bIs18 = b.move.to === 18;
        if (aIs18 && !bIs18 && a.combinedScore >= b.combinedScore - 2500) return -1;
        if (!aIs18 && bIs18 && b.combinedScore >= a.combinedScore - 2500) return 1;

        const aIsHub = GRAND_HUBS.includes(a.move.to);
        const bIsHub = GRAND_HUBS.includes(b.move.to);
        if (aIsHub && !bIsHub && a.combinedScore >= b.combinedScore - 2000) return -1;
        if (!aIsHub && bIsHub && b.combinedScore >= a.combinedScore - 2000) return 1;

        const aIsCol2 = CENTRAL_COLUMN_NODES.includes(a.move.to);
        const bIsCol2 = CENTRAL_COLUMN_NODES.includes(b.move.to);
        if (aIsCol2 && !bIsCol2 && a.combinedScore >= b.combinedScore - 1200) return -1;
        if (!aIsCol2 && bIsCol2 && b.combinedScore >= a.combinedScore - 1200) return 1;

        // 8. Side & Wing Position Dominance (Nodes 16 & 20 and Wing Flanks):
        // Prioritize moves seizing or anchoring pivotal outer side wing hubs and flanks
        const aIsWing = SIDE_WING_HUBS.includes(a.move.to);
        const bIsWing = SIDE_WING_HUBS.includes(b.move.to);
        if (aIsWing && !bIsWing && a.combinedScore >= b.combinedScore - 2200) return -1;
        if (!aIsWing && bIsWing && b.combinedScore >= a.combinedScore - 2200) return 1;

        const aIsFlank = SIDE_WING_FLANK_NODES.includes(a.move.to);
        const bIsFlank = SIDE_WING_FLANK_NODES.includes(b.move.to);
        if (aIsFlank && !bIsFlank && a.combinedScore >= b.combinedScore - 1000) return -1;
        if (!aIsFlank && bIsFlank && b.combinedScore >= a.combinedScore - 1000) return 1;
      }

      // 9. Forward progress tie breaker
      const scoreDiff = b.combinedScore - a.combinedScore;
      if (Math.abs(scoreDiff) < 600 && a.progressDelta !== b.progressDelta) {
        return b.progressDelta - a.progressDelta;
      }

      return scoreDiff;
    };

    const boardClone = [...board];
    const rootHash = computeBoardHash(board, sideToMove);
    let completedDepth = 1;

    // Check Transposition Table to seed move ordering with previous best move
    const rootEntry = this.tt.get(rootHash);
    if (rootEntry?.bestMove) {
      const idx = candidateEvaluations.findIndex(
        (c) => c.move.from === rootEntry.bestMove!.from && c.move.to === rootEntry.bestMove!.to
      );
      if (idx > 0) {
        const top = candidateEvaluations[idx];
        candidateEvaluations.splice(idx, 1);
        candidateEvaluations.unshift(top);
      }
    } else {
      candidateEvaluations.sort(sortCandidates);
    }

    // Target deep search: up to 20 plies within the 10-14 seconds budget
    const targetMaxDepth = 20;

    // Step 2: Iterative Deepening Minimax for each candidate root move (10 to 14+ seconds budget)
    for (let depth = 1; depth <= targetMaxDepth; depth++) {
      try {
        if (abortSignal?.aborted) break;

        // Yield to browser event loop between depths for zero UI freezing
        await new Promise((resolve) => setTimeout(resolve, 0));

        const elapsed = performance.now() - startTime;
        // Deep search condition: must spend at least 10,000ms (10-14s target) before exiting on depth
        if (depth > 6 && elapsed >= 10000 && (elapsed >= timeBudgetMs || performance.now() >= this.deadline - 50)) {
          break;
        }

        // Evaluate candidate root moves
        for (let i = 0; i < candidateEvaluations.length; i++) {
          if (abortSignal?.aborted) break;

          if (depth > 2 && performance.now() >= this.deadline) {
            throw new SearchTimeoutError();
          }

          const item = candidateEvaluations[i];
          const delta = getMoveHashDelta(item.move, sideToMove);

          applyMoveInPlace(boardClone, item.move, sideToMove);
          const nextHash = rootHash ^ delta;

          // Search opponent response
          const res = this.minimax(
            boardClone,
            depth - 1,
            -Infinity,
            Infinity,
            enemySide,
            sideToMove,
            1,
            nextHash
          );

          undoMoveInPlace(boardClone, item.move, sideToMove, enemySide);

          item.minimaxScore = res.score;
          // Heavily factor safety score so blunders and dead ends stay down
          item.combinedScore = res.score + item.safetyScore;

          // Yield periodically during deep iterations to keep UI butter-smooth
          if (depth >= 5 && i > 0 && i % 2 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        if (abortSignal?.aborted) break;

        completedDepth = depth;

        // Re-sort candidates based on the newly completed depth
        candidateEvaluations.sort(sortCandidates);

        // Store root position in Transposition Table
        this.storeTT(
          rootHash,
          completedDepth,
          candidateEvaluations[0].combinedScore,
          'exact',
          candidateEvaluations[0].move
        );

        onProgress?.(
          completedDepth,
          candidateEvaluations[0].move,
          candidateEvaluations[0].combinedScore,
          Math.round(performance.now() - startTime)
        );
      } catch (err) {
        if (err instanceof SearchTimeoutError) {
          break;
        }
        throw err;
      }
    }

    // Step 3: Final candidate pool filtering
    const safeCandidates = candidateEvaluations.filter(
      (c) => !c.isBlunder && !c.isLoopReversal
    );
    const candidatePool =
      safeCandidates.length > 0
        ? safeCandidates
        : candidateEvaluations.filter((c) => !c.isLoopReversal);
    const finalPool = candidatePool.length > 0 ? candidatePool : candidateEvaluations;

    // ZERO MATERIAL LOSS RULE (Safety First Guarantee):
    // If any candidate achieves ZERO piece loss (opponent counter-captures === 0),
    // strictly restrict recommendations to ONLY zero-loss moves!
    const zeroLossCandidates = finalPool.filter(
      (c) => (c.opponentMaxCounterCaptures || 0) === 0
    );
    const movesToShow =
      zeroLossCandidates.length > 0 ? zeroLossCandidates : finalPool;

    movesToShow.sort(sortCandidates);

    const rankedMoves: RankedCandidateMove[] = movesToShow.map((c) => ({
      move: c.move,
      score: c.combinedScore,
      isBlunder: c.isBlunder,
      isLoopReversal: c.isLoopReversal,
      progressDelta: c.progressDelta,
      threatCount: c.threatCount,
      isFork: c.isFork,
      explanation: c.explanation,
    }));

    const bestCandidate = rankedMoves[0];
    const elapsed = Math.round(performance.now() - startTime);

    return {
      bestMove: bestCandidate.move,
      depthReached: completedDepth,
      score: bestCandidate.score,
      timeMs: elapsed,
      rank: 1,
      totalCandidates: rankedMoves.length,
      isBlunderFree: !bestCandidate.isBlunder,
      explanation: bestCandidate.explanation,
      rankedMoves,
    };
  }

  public async searchBestMove(
    board: PieceColor[],
    sideToMove: PieceColor,
    maxDepth: number = 14,
    timeBudgetMs: number = 12000,
    history?: HistoryMove[],
    onProgress?: (depth: number, bestMove: FullMove, score: number, elapsedMs: number) => void,
    abortSignal?: AbortSignal
  ): Promise<HintResult> {
    return this.searchRankedMoves(
      board,
      sideToMove,
      maxDepth,
      timeBudgetMs,
      history,
      onProgress,
      abortSignal
    );
  }
}

export const globalAiEngine = new AdversarialEngine();

