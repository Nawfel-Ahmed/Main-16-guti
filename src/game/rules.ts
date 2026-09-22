import { PieceColor, Player, FullMove, HistoryMove } from '../types';
import {
  ADJACENCY,
  JUMPS_FROM,
  NODES,
  GRAND_HUBS,
  CENTRAL_COLUMN_NODES,
  CENTRAL_ROW_NODES,
  CENTRAL_CORRIDORS,
  DEAD_END_NODES,
  FRINGE_CORNER_NODES,
  SIDE_WING_HUBS,
  SIDE_WING_FLANK_NODES,
} from './boardGeometry';

// Return opponent's color
export function getOpponentColor(color: PieceColor): PieceColor {
  if (color === 'red') return 'blue';
  if (color === 'blue') return 'red';
  return null;
}

export function playerToColor(player: Player): PieceColor {
  return player === 'you' ? 'blue' : 'red';
}

export function colorToPlayer(color: PieceColor): Player {
  return color === 'blue' ? 'you' : 'opponent';
}

// Check all immediate single jumps available from `node` for `color`
export function getSingleJumpsFrom(
  board: PieceColor[],
  node: number,
  color: PieceColor
): { over: number; to: number }[] {
  const enemyColor = getOpponentColor(color);
  if (!enemyColor) return [];

  const possibleJumps = JUMPS_FROM[node];
  const validJumps: { over: number; to: number }[] = [];

  for (let i = 0; i < possibleJumps.length; i++) {
    const j = possibleJumps[i];
    if (board[j.over] === enemyColor && board[j.to] === null) {
      validJumps.push({ over: j.over, to: j.to });
    }
  }

  return validJumps;
}

// Find all full capture chains starting from a specific node
export function getCaptureChainsFromNode(
  board: PieceColor[],
  startNode: number,
  color: PieceColor
): FullMove[] {
  const results: FullMove[] = [];
  const currentBoard = [...board];

  function search(currentNode: number, path: number[], captured: number[]) {
    const singleJumps = getSingleJumpsFrom(currentBoard, currentNode, color);

    if (singleJumps.length === 0) {
      // If we made at least one jump, this terminal point is a complete chain move
      if (captured.length > 0) {
        results.push({
          from: startNode,
          to: currentNode,
          path: [...path],
          captured: [...captured],
          isCapture: true,
        });
      }
      return;
    }

    for (let i = 0; i < singleJumps.length; i++) {
      const jump = singleJumps[i];
      const enemyPiece = currentBoard[jump.over];

      // Temporarily apply jump
      currentBoard[currentNode] = null;
      currentBoard[jump.over] = null;
      currentBoard[jump.to] = color;

      path.push(jump.to);
      captured.push(jump.over);

      search(jump.to, path, captured);

      // Backtrack
      path.pop();
      captured.pop();

      currentBoard[jump.to] = null;
      currentBoard[jump.over] = enemyPiece;
      currentBoard[currentNode] = color;
    }
  }

  search(startNode, [startNode], []);
  return results;
}

// Find all capture moves available on the entire board for `color`
export function getAllCaptureMoves(
  board: PieceColor[],
  color: PieceColor
): FullMove[] {
  const captureMoves: FullMove[] = [];

  for (let i = 0; i < 37; i++) {
    if (board[i] === color) {
      const chains = getCaptureChainsFromNode(board, i, color);
      if (chains.length > 0) {
        for (let c = 0; c < chains.length; c++) {
          captureMoves.push(chains[c]);
        }
      }
    }
  }

  return captureMoves;
}

// Find all regular 1-step moves for `color`
export function getAllRegularMoves(
  board: PieceColor[],
  color: PieceColor
): FullMove[] {
  const regularMoves: FullMove[] = [];

  for (let i = 0; i < 37; i++) {
    if (board[i] === color) {
      const neighbors = ADJACENCY[i];
      for (let j = 0; j < neighbors.length; j++) {
        const dest = neighbors[j];
        if (board[dest] === null) {
          regularMoves.push({
            from: i,
            to: dest,
            path: [i, dest],
            captured: [],
            isCapture: false,
          });
        }
      }
    }
  }

  return regularMoves;
}

// Get all legal moves for `color`.
// Strictly enforces 16 Ghuti Mandatory Capture rules: if any capture is available,
// only capture moves are legal; quiet regular moves are disallowed.
export function getLegalMoves(
  board: PieceColor[],
  color: PieceColor
): FullMove[] {
  const captures = getAllCaptureMoves(board, color);
  if (captures.length > 0) {
    return captures;
  }
  return getAllRegularMoves(board, color);
}

// Check if any piece can capture
export function hasAnyCaptures(
  board: PieceColor[],
  color: PieceColor
): boolean {
  for (let i = 0; i < 37; i++) {
    if (board[i] === color) {
      const jumps = getSingleJumpsFrom(board, i, color);
      if (jumps.length > 0) return true;
    }
  }
  return false;
}

// Check game over
export function checkGameOver(
  board: PieceColor[],
  currentTurn: Player
): { isOver: boolean; winner: Player | 'draw' | null; reason?: string } {
  let redCount = 0;
  let blueCount = 0;

  for (let i = 0; i < 37; i++) {
    if (board[i] === 'red') redCount++;
    else if (board[i] === 'blue') blueCount++;
  }

  if (redCount === 0) {
    return {
      isOver: true,
      winner: 'you',
      reason: 'Captured all 16 opponent pieces!',
    };
  }

  if (blueCount === 0) {
    return {
      isOver: true,
      winner: 'opponent',
      reason: 'Opponent captured all 16 pieces!',
    };
  }

  // Check if player whose turn it is has any legal moves
  const currentColor = playerToColor(currentTurn);
  const legalMoves = getLegalMoves(board, currentColor);

  if (legalMoves.length === 0) {
    const winner: Player = currentTurn === 'you' ? 'opponent' : 'you';
    const reason =
      currentTurn === 'you'
        ? 'You have no legal moves left (fully blocked)!'
        : 'Opponent has no legal moves left (fully blocked)!';
    return {
      isOver: true,
      winner,
      reason,
    };
  }

  return { isOver: false, winner: null };
}

// Safety and strategic analysis for candidate moves
export interface MoveSafetyResult {
  isBlunder: boolean;
  isLoopReversal: boolean;
  progressDelta: number;
  netGain: number;
  ourCaptures: number;
  opponentMaxCounterCaptures: number;
  threatCount: number;
  isFork: boolean;
  safetyScore: number;
  explanation: string;
}

// Check if candidate move is an oscillation / back-and-forth loop reversal from recent moves
export function isMoveLoopReversal(
  move: FullMove,
  sideToMove: PieceColor,
  history?: HistoryMove[]
): boolean {
  if (!history || history.length === 0 || move.isCapture) return false;

  const playerSide = colorToPlayer(sideToMove);
  // Check the player's last 3 turns (up to 6 plies in history)
  const recentHistory = history.slice(-6);

  for (let i = recentHistory.length - 1; i >= 0; i--) {
    const h = recentHistory[i];
    if (h.player === playerSide && !h.isCapture) {
      if (h.from === move.to && h.to === move.from) {
        return true;
      }
    }
  }
  return false;
}

export function evaluateMoveSafety(
  board: PieceColor[],
  move: FullMove,
  sideToMove: PieceColor,
  history?: HistoryMove[]
): MoveSafetyResult {
  const enemySide = getOpponentColor(sideToMove)!;

  // Clone and apply candidate move
  const nextBoard = [...board];
  nextBoard[move.from] = null;
  for (let i = 0; i < move.captured.length; i++) {
    nextBoard[move.captured[i]] = null;
  }
  nextBoard[move.to] = sideToMove;

  // Check opponent capture options on the resulting board
  const opponentCaptures = getAllCaptureMoves(nextBoard, enemySide);

  const ourCaptures = move.captured.length;
  let opponentMaxCounterCaptures = 0;
  if (opponentCaptures.length > 0) {
    for (let i = 0; i < opponentCaptures.length; i++) {
      const capCount = opponentCaptures[i].captured.length;
      if (capCount > opponentMaxCounterCaptures) {
        opponentMaxCounterCaptures = capCount;
      }
    }
  }

  const netGain = ourCaptures - opponentMaxCounterCaptures;
  const isLoop = isMoveLoopReversal(move, sideToMove, history);

  // Directional progress:
  // For Blue (starts bottom, rows 5-8): moving to smaller row index is forward (fromRow - toRow > 0)
  // For Red (starts top, rows 0-3): moving to larger row index is forward (toRow - fromRow > 0)
  const fromRow = NODES[move.from].row;
  const toRow = NODES[move.to].row;
  const progressDelta = sideToMove === 'blue' ? fromRow - toRow : toRow - fromRow;

  // 1. ZERO MATERIAL LOSS RULE (Supreme Safety Gatekeeper):
  // Any quiet move that allows the opponent to counter-capture ANY piece is an unconditional fatal blunder.
  // Material loss penalty is infinite negative (-1,000,000,000), preventing the engine from ever suggesting it.
  if (!move.isCapture && opponentMaxCounterCaptures > 0) {
    return {
      isBlunder: true,
      isLoopReversal: isLoop,
      progressDelta,
      netGain: -opponentMaxCounterCaptures,
      ourCaptures: 0,
      opponentMaxCounterCaptures,
      threatCount: 0,
      isFork: false,
      safetyScore: -1000000000 - opponentMaxCounterCaptures * 100000000,
      explanation: `মারাত্মক আত্মঘাতী ভুল! এই চাল দিলে প্রতিপক্ষ পরবর্তী চালে আপনার ${opponentMaxCounterCaptures}টি গুটি খেয়ে ফেলবে (শূন্য সুরক্ষা)।`,
    };
  }

  // 2. Loop / Oscillation penalty
  if (isLoop) {
    return {
      isBlunder: true,
      isLoopReversal: true,
      progressDelta,
      netGain: 0,
      ourCaptures: 0,
      opponentMaxCounterCaptures: 0,
      threatCount: 0,
      isFork: false,
      safetyScore: -1000000000,
      explanation: 'লুপ সতর্কবার্তা! একই গুটি বারবার সামনে-পিছনে ঘোরানো হচ্ছে। নতুন অবস্থানে মুভ করুন।',
    };
  }

  // Check threats, forks and combinations created on nextBoard
  const ourFutureCaptures = getAllCaptureMoves(nextBoard, sideToMove);
  const threatenedEnemies = new Set(ourFutureCaptures.flatMap((c) => c.captured));
  const threatCount = threatenedEnemies.size;
  const isFork = threatCount >= 2;
  const hasMultiJumpThreat = ourFutureCaptures.some((c) => c.captured.length >= 2);

  // Check opponent mobility and constriction
  const oppMovesBefore = getLegalMoves(board, enemySide).length;
  const oppMovesAfter = getLegalMoves(nextBoard, enemySide).length;
  const trappedReduction = oppMovesBefore - oppMovesAfter;

  // Check game win (opponent completely suffocated/blocked)
  if (oppMovesAfter === 0) {
    return {
      isBlunder: false,
      isLoopReversal: false,
      progressDelta,
      netGain: ourCaptures,
      ourCaptures,
      opponentMaxCounterCaptures: 0,
      threatCount,
      isFork,
      safetyScore: 200000,
      explanation: 'অনিবার্য বিজয়! প্রতিপক্ষ সম্পূর্ণরূপে অবরুদ্ধ ও চালহীন (Checkmate/Blocked)।',
    };
  }

  // 3. Captures & Multi-capture Trade Logic
  if (move.isCapture) {
    if (netGain < 0) {
      // Self-destruct move: eating 1 piece but giving away 2+ pieces!
      return {
        isBlunder: true,
        isLoopReversal: false,
        progressDelta,
        netGain,
        ourCaptures,
        opponentMaxCounterCaptures,
        threatCount,
        isFork,
        safetyScore: -1000000000 + netGain * 100000000,
        explanation: `ক্ষতিকর আত্মঘাতী বিনিময়! আপনি ${ourCaptures}টি খাবেন কিন্তু প্রতিপক্ষ পাল্টা ${opponentMaxCounterCaptures}টি খাবে।`,
      };
    } else if (opponentMaxCounterCaptures === 0) {
      // Clean, unpunished capture (ZERO material loss)
      let capScore = 10000000 + 5000000 * ourCaptures;
      if (ourCaptures >= 2) capScore += 3000000 * (ourCaptures - 1); // Multi-jump combo bonus
      if (isFork) capScore += 1000000;
      if (hasMultiJumpThreat) capScore += 1000000;
      if (oppMovesAfter <= 2) capScore += 1000000;

      return {
        isBlunder: false,
        isLoopReversal: false,
        progressDelta,
        netGain,
        ourCaptures,
        opponentMaxCounterCaptures: 0,
        threatCount,
        isFork,
        safetyScore: capScore,
        explanation:
          ourCaptures >= 3
            ? `বিধ্বংসী ট্রিপল জাম্প! প্রতিপক্ষের ৩টি গুটি একবারে সাফ (শূন্য ক্ষতি)।`
            : ourCaptures === 2
            ? `মারাত্মক ডাবল জাম্প! প্রতিপক্ষের ২টি গুটি একবারে সাফ (শূন্য ক্ষতি)।`
            : `নিখুঁত ও সম্পূর্ণ নিরাপদ ক্যাপচার! প্রতিপক্ষের ১টি গুটি খতম (আপনার কোনো গুটি হারাবে না)।`,
      };
    } else {
      // Trade: our piece is captured in return
      // Clean captures always outrank trades to uphold Zero Material Loss rule
      let tradeScore = netGain > 0 ? 500000 * netGain : -5000000;
      tradeScore -= opponentMaxCounterCaptures * 1000000;

      return {
        isBlunder: false,
        isLoopReversal: false,
        progressDelta,
        netGain,
        ourCaptures,
        opponentMaxCounterCaptures,
        threatCount,
        isFork,
        safetyScore: tradeScore,
        explanation:
          netGain > 0
            ? `লাভজনক মাল্টি-ট্রেড! আপনি ${ourCaptures}টি নিচ্ছেন, প্রতিপক্ষ পাল্টা ${opponentMaxCounterCaptures}টি খাবে।`
            : `সমান বিনিময় (${ourCaptures}টি বনাম ${opponentMaxCounterCaptures}টি): গুটি খাওয়ার সুযোগ থাকলেও আপনার ১টি গুটি মারা পড়বে।`,
      };
    }
  }

  // 4. Safe Quiet Move: Attacking Traps, Forks & Strategic Backbone Positioning
  let strategicBonus = 0;
  let explanation = 'নিরাপদ কৌশলগত অবস্থান (শূন্য ক্ষতি)।';

  const fromIsGrandHub = GRAND_HUBS.includes(move.from);
  const fromIsBackbone =
    fromIsGrandHub ||
    CENTRAL_CORRIDORS.includes(move.from) ||
    CENTRAL_COLUMN_NODES.includes(move.from);
  const toIsGrandHub = GRAND_HUBS.includes(move.to);
  const toIsCenter = move.to === 18;
  const toIsCentralColumn = CENTRAL_COLUMN_NODES.includes(move.to);
  const toIsCorridor = CENTRAL_CORRIDORS.includes(move.to);
  const toIsCentralRow = CENTRAL_ROW_NODES.includes(move.to);
  const toIsSideWingHub = SIDE_WING_HUBS.includes(move.to);
  const toIsWingFlank = SIDE_WING_FLANK_NODES.includes(move.to);
  const toIsDeadEnd = DEAD_END_NODES.includes(move.to);
  const toIsFringeCorner = FRINGE_CORNER_NODES.includes(move.to);

  // CHECK 1: False Safety & Dead-End Elimination (Permanently Banned)
  // Never move quietly into dead-ends or fringe corners to hide; it forfeits the game
  if (toIsDeadEnd || toIsFringeCorner) {
    return {
      isBlunder: true,
      isLoopReversal: false,
      progressDelta,
      netGain: 0,
      ourCaptures: 0,
      opponentMaxCounterCaptures: 0,
      threatCount: 0,
      isFork: false,
      safetyScore: -500000,
      explanation: 'কোণায় বা ডেড-এন্ডে গুটি লুকিয়ে ফলস সেফটি খোঁজা নিষিদ্ধ! ব্যাকবোন ত্যাগ করে নিজেকে অবরুদ্ধ করার মারাত্মক ভুল।',
    };
  }

  if (
    fromIsGrandHub &&
    !toIsGrandHub &&
    !toIsCorridor &&
    !toIsCentralColumn &&
    !toIsCentralRow &&
    !toIsSideWingHub &&
    threatCount === 0
  ) {
    // Stepping away from an 8-degree grand hub onto an outer low-influence node without threat
    strategicBonus -= 15000;
    explanation = 'ব্যাকবোন হাব থেকে সরে যাওয়ায় আক্রমণাত্মক প্রভাব হ্রাস।';
  }

  // CHECK 2: Multi-step Attacking, Crushing Forks & Combo Traps from Backbone
  if (isFork) {
    strategicBonus += 85000 + (threatCount - 2) * 25000;
    if (toIsCenter || toIsGrandHub) {
      explanation = `ব্যাকবোন থেকে বিধ্বংসী ফোর্ক (Fork)! একসাথে ${threatCount}টি গুটি শিকারের অপ্রতিরোধ্য ডাবল অ্যাটাক।`;
    } else if (toIsSideWingHub) {
      explanation = `সাইড উইং থেকে বিধ্বংসী ফোর্ক (Fork)! পার্শ্বদেশ থেকে একসাথে ${threatCount}টি গুটি শিকারের অপ্রতিরোধ্য ফাঁদ।`;
    } else {
      explanation = `বিধ্বংসী ফোর্ক (Fork) ডাবল অ্যাটাক! একসাথে ${threatCount}টি গুটি শিকারের অপ্রতিরোধ্য ফাঁদ।`;
    }
  } else if (hasMultiJumpThreat) {
    strategicBonus += 75000;
    if (toIsCenter || toIsGrandHub) {
      explanation = 'ব্যাকবোন থেকে মাল্টি-জাম্প কম্বিনেশন ট্র্যাপ! পরবর্তী চালে একের পর এক গুটি শিকার।';
    } else if (toIsSideWingHub) {
      explanation = 'সাইড উইং থেকে মাল্টি-জাম্প কম্বিনেশন ট্র্যাপ! উইং ও ডায়াগনাল লাইনে একের পর এক গুটি শিকার।';
    } else {
      explanation = 'ফিউচার কম্বিনেশন ট্র্যাপ! পরবর্তী চালে একসাথে একাধিক গুটি সাফ করার ফাঁদ।';
    }
  } else if (threatCount === 1) {
    strategicBonus += 32000;
    if (toIsCenter) {
      explanation = 'সেন্ট্রাল নোড ১৮ দখল ও সরাসরি আক্রমণ! কেন্দ্র থেকে প্রতিপক্ষের গুটি খাওয়ার তাৎক্ষণিক হুমকি।';
    } else if (toIsSideWingHub) {
      explanation = 'সাইড উইং পজিশন থেকে ক্ষিপ্র আক্রমণ! উইং লাইন ও ডায়াগনাল থেকে সরাসরি গুটি শিকারের হুমকি।';
    } else if (toIsGrandHub) {
      explanation = 'ব্যাকবোন হাব থেকে সরাসরি আক্রমণ! পরের চালেই প্রতিপক্ষের গুটি শিকারের হুমকি।';
    } else if (toIsCentralColumn) {
      explanation = 'সেন্ট্রাল কলাম থেকে আক্রমণাত্মক ফাঁদ তৈরি! প্রতিপক্ষের ওপর সরাসরি চাপ।';
    } else {
      explanation = 'আক্রমণাত্মক ফাঁদ তৈরি! পরের চালেই প্রতিপক্ষের গুটি খাওয়ার সরাসরি হুমকি।';
    }
  }

  // Severe constriction bonus
  if (oppMovesAfter <= 2) {
    strategicBonus += 35000;
    if (!isFork && !hasMultiJumpThreat) {
      explanation = 'ব্যাকবোন আধিপত্যে প্রতিপক্ষকে সম্পূর্ণ অবরুদ্ধ ও কোণঠাসা (Paralyzed / Restricted) করা হয়েছে।';
    }
  } else if (trappedReduction > 0) {
    strategicBonus += trappedReduction * 3500;
    if (explanation === 'নিরাপদ কৌশলগত অবস্থান।') {
      explanation = 'প্রতিপক্ষের চলাচলের পথ অবরুদ্ধ করে ট্র্যাপ তৈরি।';
    }
  }

  // CHECK 3: Backbone & Side Wing Dominance
  if (toIsCenter) {
    strategicBonus += 32000;
    if (explanation === 'নিরাপদ কৌশলগত অবস্থান।') {
      explanation = 'সেন্ট্রাল নোড ১৮ দখল! সম্পূর্ণ বোর্ডের ব্যাকবোন ও আটদিকের ক্রসিং নিয়ন্ত্রণ।';
    }
  } else if (toIsSideWingHub) {
    // Nodes 16 and 20 - Crucial outer wing anchors controlling side flanks and 5 attack/defense trajectories
    strategicBonus += 25000;
    if (explanation === 'নিরাপদ কৌশলগত অবস্থান।') {
      explanation = 'সাইড ও উইং পজিশন (Wing Hub) দখল! পার্শ্বদেশ থেকে আক্রমণ ও উভয় ফ্ল্যাঙ্ক সম্পূর্ণ নিয়ন্ত্রণ।';
    }
  } else if (toIsGrandHub) {
    strategicBonus += 22000;
    if (explanation === 'নিরাপদ কৌশলগত অবস্থান।') {
      explanation = 'ব্যাকবোনের মূল হাব দখল! আটদিকের সংযোগ ও ডায়াগনাল লাইনে সর্বোচ্চ আক্রমণাত্মক নিয়ন্ত্রণ।';
    }
  } else if (toIsCentralColumn) {
    strategicBonus += 15000;
    if (explanation === 'নিরাপদ কৌশলগত অবস্থান।') {
      explanation = 'সেন্ট্রাল কলামের মূল মেরুদণ্ড (Backbone) শক্ত অবস্থান ও নিয়ন্ত্রণ।';
    }
  } else if (toIsWingFlank) {
    strategicBonus += 12500;
    if (explanation === 'নিরাপদ কৌশলগত অবস্থান।') {
      explanation = 'সাইড ফ্ল্যাঙ্ক (Wing Flank) নিয়ন্ত্রণ ও পার্শ্ব দিক থেকে সুরক্ষিত অবস্থান।';
    }
  } else if (toIsCorridor) {
    strategicBonus += 11000;
    if (explanation === 'নিরাপদ কৌশলগত অবস্থান।') {
      explanation = 'সেন্ট্রাল করিডোর দখল ও কেন্দ্র ১৮ অভিমুখে শক্তিশালী ব্যালেন্স।';
    }
  } else if (toIsCentralRow) {
    strategicBonus += 8500;
    if (explanation === 'নিরাপদ কৌশলগত অবস্থান।') {
      explanation = 'সেন্ট্রাল ফ্রন্টলাইন ফ্ল্যাঙ্ক নিয়ন্ত্রণ ও সুরক্ষিত অগ্রগতি।';
    }
  }

  // Forward advancement
  if (progressDelta > 0) {
    strategicBonus += progressDelta * 5000;

    // Infiltration
    if (sideToMove === 'blue' && toRow <= 3) {
      strategicBonus += (4 - toRow) * 2500;
      if (explanation === 'নিরাপদ কৌশলগত অবস্থান।') {
        explanation = 'প্রতিপক্ষের এলাকায় গভীর আক্রমণ ও অঞ্চল দখল।';
      }
    } else if (sideToMove === 'red' && toRow >= 5) {
      strategicBonus += (toRow - 4) * 2500;
      if (explanation === 'নিরাপদ কৌশলগত অবস্থান।') {
        explanation = 'প্রতিপক্ষের এলাকায় গভীর আক্রমণ ও অঞ্চল দখল।';
      }
    }

    if (explanation === 'নিরাপদ কৌশলগত অবস্থান।') {
      explanation = 'প্রোঅ্যাক্টিভ অগ্রগতি ও সামনের অঞ্চল বিস্তার।';
    }
  } else if (progressDelta === 0) {
    strategicBonus += 800;
  } else {
    // Backward retreat: safe repositioning
    strategicBonus -= 6000 * Math.abs(progressDelta);
    if (explanation === 'নিরাপদ কৌশলগত অবস্থান (শূন্য ক্ষতি)।') {
      explanation = 'পেছনের দিকে কৌশলগত সুরক্ষা ও পুনর্বিন্যাস (শূন্য ক্ষতি)।';
    }
  }

  return {
    isBlunder: false,
    isLoopReversal: false,
    progressDelta,
    netGain: 0,
    ourCaptures: 0,
    opponentMaxCounterCaptures: 0,
    threatCount,
    isFork,
    safetyScore: strategicBonus,
    explanation,
  };
}

// Central and strategic node bonuses for the 37 nodes
// Node 18 is the absolute heart; Grand Hubs (8, 28, 12, 14, 22, 24) have 8 connections each.
// Central Column 2 (1, 4, 8, 13, 18, 23, 28, 32, 35) is the primary board backbone.
// Nodes 16 & 20 are pivotal Side Wing Hubs (5 connections, flank anchors).
export const POSITION_WEIGHTS: number[] = [
  // Row 0 (ids 0..2) - Dead ends 0, 2 are penalizing
  -500, 500, -500,
  // Row 1 (ids 3..5)
  240, 700, 240,
  // Row 2 (ids 6..10) - Node 8 is Grand Hub (8 connections)
  -200, 500, 1800, 500, -200,
  // Row 3 (ids 11..15) - Nodes 11 & 15 are Upper Wing Flanks, 12 & 14 are Grand Hubs, 13 is Central Corridor
  1100, 1600, 1200, 1600, 1100,
  // Row 4 (ids 16..20) - Nodes 16 & 20 are Pivotal Side Wing Hubs, Node 18 is Absolute Center, 17 & 19 are Central Corridors
  2200, 1100, 3000, 1100, 2200,
  // Row 5 (ids 21..25) - Nodes 21 & 25 are Lower Wing Flanks, 22 & 24 are Grand Hubs, 23 is Central Corridor
  1100, 1600, 1200, 1600, 1100,
  // Row 6 (ids 26..30) - Node 28 is Grand Hub (8 connections)
  -200, 500, 1800, 500, -200,
  // Row 7 (ids 31..33)
  240, 700, 240,
  // Row 8 (ids 34..36) - Dead ends 34, 36 are penalizing
  -500, 500, -500,
];

// Static evaluation from perspective of `povColor` (Blue = positive for You, Red = positive for Opponent)
// Highly optimized single-pass evaluation for grandmaster minimax search up to 14-20 plies
export function evaluateBoard(board: PieceColor[], povColor: PieceColor): number {
  let blueScore = 0;
  let redScore = 0;
  let blueMobility = 0;
  let redMobility = 0;
  let blueJumps = 0;
  let redJumps = 0;
  let blueGrandHubCount = 0;
  let redGrandHubCount = 0;
  let blueCol2Count = 0;
  let redCol2Count = 0;
  let blueHoldsCenter = false;
  let redHoldsCenter = false;
  let blueHoldsLeftWing = false;
  let blueHoldsRightWing = false;
  let redHoldsLeftWing = false;
  let redHoldsRightWing = false;
  let blueDeadEndCount = 0;
  let redDeadEndCount = 0;

  for (let i = 0; i < 37; i++) {
    const piece = board[i];
    if (piece === null) continue;

    const neighbors = ADJACENCY[i];
    const r = NODES[i].row;
    const isDeadEnd = DEAD_END_NODES.includes(i);
    const isFringeCorner = FRINGE_CORNER_NODES.includes(i);

    if (piece === 'blue') {
      blueScore += 100000 + POSITION_WEIGHTS[i];
      if (r <= 3) blueScore += (4 - r) * 90;

      if (isDeadEnd) blueDeadEndCount++;
      else if (isFringeCorner) blueScore -= 800;

      if (i === 18) {
        blueHoldsCenter = true;
        blueScore += 2500;
      }
      if (i === 16) {
        blueHoldsLeftWing = true;
        blueScore += 2200;
      } else if (i === 20) {
        blueHoldsRightWing = true;
        blueScore += 2200;
      } else if (SIDE_WING_FLANK_NODES.includes(i)) {
        blueScore += 800;
      }

      if (GRAND_HUBS.includes(i)) {
        blueGrandHubCount++;
        blueScore += 1200;
      }
      if (CENTRAL_COLUMN_NODES.includes(i)) {
        blueCol2Count++;
        blueScore += 600;
      }

      for (let j = 0; j < neighbors.length; j++) {
        const nIdx = neighbors[j];
        const nPiece = board[nIdx];
        if (nPiece === 'blue') {
          blueScore += 25;
        } else if (nPiece === null) {
          blueMobility++;
        }
      }

      const possibleJumps = JUMPS_FROM[i];
      for (let j = 0; j < possibleJumps.length; j++) {
        const jmp = possibleJumps[j];
        if (board[jmp.over] === 'red' && board[jmp.to] === null) {
          blueJumps++;
        }
      }
    } else {
      redScore += 100000 + POSITION_WEIGHTS[i];
      if (r >= 5) redScore += (r - 4) * 90;

      if (isDeadEnd) redDeadEndCount++;
      else if (isFringeCorner) redScore -= 800;

      if (i === 18) {
        redHoldsCenter = true;
        redScore += 2500;
      }
      if (i === 16) {
        redHoldsLeftWing = true;
        redScore += 2200;
      } else if (i === 20) {
        redHoldsRightWing = true;
        redScore += 2200;
      } else if (SIDE_WING_FLANK_NODES.includes(i)) {
        redScore += 800;
      }

      if (GRAND_HUBS.includes(i)) {
        redGrandHubCount++;
        redScore += 1200;
      }
      if (CENTRAL_COLUMN_NODES.includes(i)) {
        redCol2Count++;
        redScore += 600;
      }

      for (let j = 0; j < neighbors.length; j++) {
        const nIdx = neighbors[j];
        const nPiece = board[nIdx];
        if (nPiece === 'red') {
          redScore += 25;
        } else if (nPiece === null) {
          redMobility++;
        }
      }

      const possibleJumps = JUMPS_FROM[i];
      for (let j = 0; j < possibleJumps.length; j++) {
        const jmp = possibleJumps[j];
        if (board[jmp.over] === 'blue' && board[jmp.to] === null) {
          redJumps++;
        }
      }
    }
  }

  // Heavy penalties for dead-end hiding: pieces stuck in corners cannot jump and easily get trapped
  blueScore -= blueDeadEndCount * 2200;
  redScore -= redDeadEndCount * 2200;

  // Backbone Network Bonus: controlling Center 18 plus at least 2 other Grand Hubs creates an ironclad fortress
  if (blueHoldsCenter && blueGrandHubCount >= 2) {
    blueScore += 3000;
  }
  if (redHoldsCenter && redGrandHubCount >= 2) {
    redScore += 3000;
  }

  // Dual Wing Control Bonus: Controlling both Left Wing (16) and Right Wing (20) dominates the board flanks
  if (blueHoldsLeftWing && blueHoldsRightWing) {
    blueScore += 2800;
  }
  if (redHoldsLeftWing && redHoldsRightWing) {
    redScore += 2800;
  }

  // Combined Center & Wing Pincer Bonus: Controlling Center 18 plus at least one Side Wing (16 or 20)
  if (blueHoldsCenter && (blueHoldsLeftWing || blueHoldsRightWing)) {
    blueScore += 2200;
  }
  if (redHoldsCenter && (redHoldsLeftWing || redHoldsRightWing)) {
    redScore += 2200;
  }

  // Edge Stranding / Constriction penalty: player with zero backbone presence is easily surrounded
  if (blueGrandHubCount === 0 && blueCol2Count === 0) {
    blueScore -= 4000;
  }
  if (redGrandHubCount === 0 && redCol2Count === 0) {
    redScore -= 4000;
  }

  // Constriction penalty if piece mobility is suffocated
  const blueConstriction = blueMobility <= 3 ? (4 - blueMobility) * 4500 : 0;
  const redConstriction = redMobility <= 3 ? (4 - redMobility) * 4500 : 0;

  const total =
    (blueScore - redScore) +
    (blueMobility - redMobility) * 35 +
    (blueJumps - redJumps) * 6000 +
    (redConstriction - blueConstriction);

  return povColor === 'blue' ? total : -total;
}