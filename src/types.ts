export type Player = 'you' | 'opponent'; // 'you' = Blue (moves first), 'opponent' = Red

export type PieceColor = 'red' | 'blue' | null;

export interface BoardNode {
  id: number; // 0 to 36
  row: number; // 0 to 8
  col: number; // 0 to 4
  x: number; // SVG pixel X
  y: number; // SVG pixel Y
}

export interface BoardEdge {
  from: number;
  to: number;
}

export interface JumpTriplet {
  from: number;
  over: number;
  to: number;
}

export interface MoveStep {
  from: number;
  to: number;
  captured?: number; // node index of captured piece, if any
}

export interface FullMove {
  from: number;
  to: number;
  path: number[]; // sequence of nodes visited: [from, step1, step2, ...]
  captured: number[]; // node indices of all pieces captured in this move chain
  isCapture: boolean;
}

export interface GameState {
  board: PieceColor[]; // array of length 37: 'red' | 'blue' | null
  currentTurn: Player;
  scoreYou: number; // Red pieces captured by You (max 16)
  scoreOpponent: number; // Blue pieces captured by Opponent (max 16)
  selectedNode: number | null;
  validDestinations: number[]; // node IDs player can move to currently
  activeChainFrom: number | null; // if mid-chain capture
  inChainCapture: boolean;
  winner: Player | 'draw' | null;
  winReason?: string;
}

export interface HistoryMove {
  from: number;
  to: number;
  player: Player;
  isCapture: boolean;
}

export interface RankedCandidateMove {
  move: FullMove;
  score: number;
  isBlunder: boolean;
  isLoopReversal?: boolean;
  progressDelta?: number;
  threatCount?: number;
  isFork?: boolean;
  explanation: string;
}

export interface HintResult {
  bestMove: FullMove;
  depthReached: number;
  score: number;
  timeMs: number;
  rank?: number;
  totalCandidates?: number;
  isBlunderFree?: boolean;
  explanation?: string;
  rankedMoves?: RankedCandidateMove[];
}
