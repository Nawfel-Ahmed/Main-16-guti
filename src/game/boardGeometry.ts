import { BoardNode, BoardEdge, JumpTriplet } from '../types';

// Total 37 nodes strictly mapped across 9 rows
export const NODES: BoardNode[] = [
  // Row 0: 3 nodes (Columns 0, 2, 4 in 5-column system)
  { id: 0, row: 0, col: 0, x: 32, y: 44 },
  { id: 1, row: 0, col: 2, x: 180, y: 44 },
  { id: 2, row: 0, col: 4, x: 328, y: 44 },

  // Row 1: 3 nodes (Columns 1, 2, 3)
  { id: 3, row: 1, col: 1, x: 106, y: 106 },
  { id: 4, row: 1, col: 2, x: 180, y: 106 },
  { id: 5, row: 1, col: 3, x: 254, y: 106 },

  // Row 2: Upper main grid (Columns 0, 1, 2, 3, 4)
  { id: 6, row: 2, col: 0, x: 32, y: 168 },
  { id: 7, row: 2, col: 1, x: 106, y: 168 },
  { id: 8, row: 2, col: 2, x: 180, y: 168 },
  { id: 9, row: 2, col: 3, x: 254, y: 168 },
  { id: 10, row: 2, col: 4, x: 328, y: 168 },

  // Row 3: Upper main grid (Columns 0, 1, 2, 3, 4)
  { id: 11, row: 3, col: 0, x: 32, y: 230 },
  { id: 12, row: 3, col: 1, x: 106, y: 230 },
  { id: 13, row: 3, col: 2, x: 180, y: 230 },
  { id: 14, row: 3, col: 3, x: 254, y: 230 },
  { id: 15, row: 3, col: 4, x: 328, y: 230 },

  // Row 4: Central middle row (starts empty, Columns 0, 1, 2, 3, 4)
  { id: 16, row: 4, col: 0, x: 32, y: 292 },
  { id: 17, row: 4, col: 1, x: 106, y: 292 },
  { id: 18, row: 4, col: 2, x: 180, y: 292 },
  { id: 19, row: 4, col: 3, x: 254, y: 292 },
  { id: 20, row: 4, col: 4, x: 328, y: 292 },

  // Row 5: Lower main grid (Columns 0, 1, 2, 3, 4)
  { id: 21, row: 5, col: 0, x: 32, y: 354 },
  { id: 22, row: 5, col: 1, x: 106, y: 354 },
  { id: 23, row: 5, col: 2, x: 180, y: 354 },
  { id: 24, row: 5, col: 3, x: 254, y: 354 },
  { id: 25, row: 5, col: 4, x: 328, y: 354 },

  // Row 6: Lower main grid (Columns 0, 1, 2, 3, 4)
  { id: 26, row: 6, col: 0, x: 32, y: 416 },
  { id: 27, row: 6, col: 1, x: 106, y: 416 },
  { id: 28, row: 6, col: 2, x: 180, y: 416 },
  { id: 29, row: 6, col: 3, x: 254, y: 416 },
  { id: 30, row: 6, col: 4, x: 328, y: 416 },

  // Row 7: 3 nodes (Columns 1, 2, 3)
  { id: 31, row: 7, col: 1, x: 106, y: 478 },
  { id: 32, row: 7, col: 2, x: 180, y: 478 },
  { id: 33, row: 7, col: 3, x: 254, y: 478 },

  // Row 8: 3 nodes (Columns 0, 2, 4)
  { id: 34, row: 8, col: 0, x: 32, y: 540 },
  { id: 35, row: 8, col: 2, x: 180, y: 540 },
  { id: 36, row: 8, col: 4, x: 328, y: 540 },
];

// Single source of truth for all connecting line edges (no duplicates, no floaters)
export const EDGES: BoardEdge[] = [
  // 1. Horizontal connections
  // Row 0
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  // Row 1
  { from: 3, to: 4 },
  { from: 4, to: 5 },
  // Row 2
  { from: 6, to: 7 },
  { from: 7, to: 8 },
  { from: 8, to: 9 },
  { from: 9, to: 10 },
  // Row 3
  { from: 11, to: 12 },
  { from: 12, to: 13 },
  { from: 13, to: 14 },
  { from: 14, to: 15 },
  // Row 4
  { from: 16, to: 17 },
  { from: 17, to: 18 },
  { from: 18, to: 19 },
  { from: 19, to: 20 },
  // Row 5
  { from: 21, to: 22 },
  { from: 22, to: 23 },
  { from: 23, to: 24 },
  { from: 24, to: 25 },
  // Row 6
  { from: 26, to: 27 },
  { from: 27, to: 28 },
  { from: 28, to: 29 },
  { from: 29, to: 30 },
  // Row 7
  { from: 31, to: 32 },
  { from: 32, to: 33 },
  // Row 8
  { from: 34, to: 35 },
  { from: 35, to: 36 },

  // 2. Vertical connections
  // Column 0
  { from: 6, to: 11 },
  { from: 11, to: 16 },
  { from: 16, to: 21 },
  { from: 21, to: 26 },
  // Column 1
  { from: 7, to: 12 },
  { from: 12, to: 17 },
  { from: 17, to: 22 },
  { from: 22, to: 27 },
  // Column 2 (continuous all through rows 0 to 8)
  { from: 1, to: 4 },
  { from: 4, to: 8 },
  { from: 8, to: 13 },
  { from: 13, to: 18 },
  { from: 18, to: 23 },
  { from: 23, to: 28 },
  { from: 28, to: 32 },
  { from: 32, to: 35 },
  // Column 3
  { from: 9, to: 14 },
  { from: 14, to: 19 },
  { from: 19, to: 24 },
  { from: 24, to: 29 },
  // Column 4
  { from: 10, to: 15 },
  { from: 15, to: 20 },
  { from: 20, to: 25 },
  { from: 25, to: 30 },

  // 3. Diagonal connections
  // Top taper diagonals (outer boundary converging to apex at Row 2 Center Node 8)
  { from: 0, to: 3 },
  { from: 3, to: 8 },
  { from: 2, to: 5 },
  { from: 5, to: 8 },

  // Main 5x5 grid diagonals (4 quadrants with center X patterns)
  // Top-Left Quadrant
  { from: 6, to: 12 },
  { from: 12, to: 18 },
  { from: 8, to: 12 },
  { from: 12, to: 16 },
  // Top-Right Quadrant
  { from: 8, to: 14 },
  { from: 14, to: 20 },
  { from: 10, to: 14 },
  { from: 14, to: 18 },
  // Bottom-Left Quadrant
  { from: 16, to: 22 },
  { from: 22, to: 28 },
  { from: 18, to: 22 },
  { from: 22, to: 26 },
  // Bottom-Right Quadrant
  { from: 18, to: 24 },
  { from: 24, to: 30 },
  { from: 20, to: 24 },
  { from: 24, to: 28 },

  // Bottom taper diagonals (exact geometric mirror diverging from apex at Row 6 Center Node 28)
  { from: 28, to: 31 },
  { from: 31, to: 34 },
  { from: 28, to: 33 },
  { from: 33, to: 36 },
];

// Precompute adjacency map: node id -> array of neighbor node ids
export const ADJACENCY: number[][] = Array.from({ length: 37 }, () => []);

for (const edge of EDGES) {
  if (!ADJACENCY[edge.from].includes(edge.to)) {
    ADJACENCY[edge.from].push(edge.to);
  }
  if (!ADJACENCY[edge.to].includes(edge.from)) {
    ADJACENCY[edge.to].push(edge.from);
  }
}

// Sort neighbor lists for deterministic iteration
for (let i = 0; i < 37; i++) {
  ADJACENCY[i].sort((a, b) => a - b);
}

// Compute all valid jump triplets (from, over, to) where from->over and over->to are collinear along a board line
function buildJumpTriplets(): JumpTriplet[] {
  const triplets: JumpTriplet[] = [];
  const set = new Set<string>();

  for (let b = 0; b < 37; b++) {
    const bNode = NODES[b];
    const neighbors = ADJACENCY[b];

    for (let i = 0; i < neighbors.length; i++) {
      const a = neighbors[i];
      const aNode = NODES[a];
      const dx1 = bNode.x - aNode.x;
      const dy1 = bNode.y - aNode.y;

      for (let j = 0; j < neighbors.length; j++) {
        if (i === j) continue;
        const c = neighbors[j];
        const cNode = NODES[c];
        const dx2 = cNode.x - bNode.x;
        const dy2 = cNode.y - bNode.y;

        // Check if vectors are exactly collinear in the same forward direction
        if (dx1 === dx2 && dy1 === dy2) {
          const key = `${a}-${b}-${c}`;
          if (!set.has(key)) {
            set.add(key);
            triplets.push({ from: a, over: b, to: c });
          }
        }
      }
    }
  }

  triplets.sort((t1, t2) => t1.from - t2.from || t1.over - t2.over || t1.to - t2.to);
  return triplets;
}

export const JUMP_TRIPLETS: JumpTriplet[] = buildJumpTriplets();

// Pre-index jumps by `from` node for O(1) jump lookup during search & gameplay
export const JUMPS_FROM: JumpTriplet[][] = Array.from({ length: 37 }, () => []);
for (const jump of JUMP_TRIPLETS) {
  JUMPS_FROM[jump.from].push(jump);
}

// Initial board setup: 16 Red (0..15), 5 Empty (16..20), 16 Blue (21..36)
export function getInitialBoard(): ( 'red' | 'blue' | null )[] {
  const board: ( 'red' | 'blue' | null )[] = new Array(37).fill(null);
  for (let i = 0; i < 16; i++) {
    board[i] = 'red';
  }
  for (let i = 16; i < 21; i++) {
    board[i] = null;
  }
  for (let i = 21; i < 37; i++) {
    board[i] = 'blue';
  }
  return board;
}

// ==========================================
// 16 Ghuti Backbone & Central Topology
// ==========================================

// The 7 Grand 8-Degree Hubs (Heart of all diagonal & cross lines in 16 Ghuti)
// Node 18 is the absolute center; 8 & 28 are triangle apexes; 12, 14, 22, 24 are quadrant cross-centers.
export const GRAND_HUBS: number[] = [18, 8, 28, 12, 14, 22, 24];

// Central Column 2 (The primary vertical spine / backbone dividing left and right)
export const CENTRAL_COLUMN_NODES: number[] = [1, 4, 8, 13, 18, 23, 28, 32, 35];

// Central Row 4 (The equatorial frontline / horizontal spine)
export const CENTRAL_ROW_NODES: number[] = [16, 17, 18, 19, 20];

// Corridors directly bridging into Center Node 18
export const CENTRAL_CORRIDORS: number[] = [13, 23, 17, 19];

// Dead-end corners (Degree 2 only - zero escape diagonals, prime trapping zones)
export const DEAD_END_NODES: number[] = [0, 2, 34, 36];

// Vulnerable outer fringe corners (Degree 2 or 3 with minimal mobility)
export const FRINGE_CORNER_NODES: number[] = [0, 2, 6, 10, 26, 30, 34, 36];

// ==========================================
// Side & Wing Positions (Left & Right Flanks)
// ==========================================
// Central Side Wing Anchors (Nodes 16 & 20 - Row 4, Cols 0 & 4, middle side hubs with 5 connections each)
export const SIDE_WING_HUBS: number[] = [16, 20];

// Extended Wing Flank Nodes (Column 0: 11, 16, 21; Column 4: 15, 20, 25)
export const SIDE_WING_FLANK_NODES: number[] = [11, 16, 21, 15, 20, 25];
