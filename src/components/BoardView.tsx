import React from 'react';
import { PieceColor, Player, FullMove } from '../types';
import { NODES, EDGES } from '../game/boardGeometry';

interface BoardViewProps {
  board: PieceColor[];
  currentTurn: Player;
  selectedNode: number | null;
  validDestinations: number[];
  hintMove: FullMove | null;
  onNodeClick: (nodeId: number) => void;
  inChainCapture: boolean;
  activeChainFrom: number | null;
}

export const BoardView: React.FC<BoardViewProps> = React.memo(({
  board,
  selectedNode,
  validDestinations,
  hintMove,
  onNodeClick,
  inChainCapture,
  activeChainFrom,
}) => {
  // SVG canvas dimensions
  const width = 360;
  const height = 584;

  return (
    <div className="relative w-full max-w-[420px] mx-auto select-none touch-manipulation">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
      >
        <defs>
          {/* Radial Gradient for Red Pawn */}
          <radialGradient id="redPawnGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="35%" stopColor="#dc2626" />
            <stop offset="85%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#5f1010" />
          </radialGradient>

          {/* Radial Gradient for Blue Pawn */}
          <radialGradient id="bluePawnGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="35%" stopColor="#2563eb" />
            <stop offset="85%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#111827" />
          </radialGradient>

          {/* Arrow marker for hint path */}
          <marker
            id="hintArrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />
          </marker>
        </defs>

        {/* 1. Wood Inset Board Lines (Crisp bevel groove, non-interactive for instant click dispatch) */}
        <g id="board-lines" pointerEvents="none">
          {EDGES.map((edge) => {
            const n1 = NODES[edge.from];
            const n2 = NODES[edge.to];
            return (
              <g key={`edge-${edge.from}-${edge.to}`}>
                {/* Background darker line groove */}
                <line
                  x1={n1.x}
                  y1={n1.y}
                  x2={n2.x}
                  y2={n2.y}
                  stroke="#42220e"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                {/* Inner highlight line */}
                <line
                  x1={n1.x}
                  y1={n1.y}
                  x2={n2.x}
                  y2={n2.y}
                  stroke="#6d3916"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </g>

        {/* 2. Board Intersection Nodes (Wooden Carved Pits, non-interactive) */}
        <g id="board-nodes" pointerEvents="none">
          {NODES.map((node) => (
            <g key={`node-pit-${node.id}`}>
              {/* Outer soft shadow pit */}
              <circle cx={node.x} cy={node.y} r="5.5" fill="#311909" />
              {/* Center brass rivet dot */}
              <circle cx={node.x} cy={node.y} r="3.2" fill="#8d562c" />
              <circle cx={node.x - 0.7} cy={node.y - 0.7} r="1" fill="#fcd34d" opacity="0.6" />
            </g>
          ))}
        </g>

        {/* 3. Hint Overlay Path and Arrows (Zero-lag crisp rendering, non-interactive) */}
        {hintMove && (
          <g id="hint-overlay" pointerEvents="none">
            {/* Draw lines along hint path */}
            {hintMove.path.map((nodeId, idx) => {
              if (idx === 0) return null;
              const prevNode = NODES[hintMove.path[idx - 1]];
              const currNode = NODES[nodeId];
              return (
                <line
                  key={`hint-line-${idx}`}
                  x1={prevNode.x}
                  y1={prevNode.y}
                  x2={currNode.x}
                  y2={currNode.y}
                  stroke="#f59e0b"
                  strokeWidth="4"
                  strokeDasharray="6,4"
                  strokeLinecap="round"
                  markerEnd="url(#hintArrow)"
                />
              );
            })}

            {/* Hint Source Node */}
            {(() => {
              const src = NODES[hintMove.from];
              return (
                <circle
                  cx={src.x}
                  cy={src.y}
                  r="19"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3.5"
                />
              );
            })()}

            {/* Hint Intermediate Nodes */}
            {hintMove.path.slice(1, -1).map((nodeId) => {
              const n = NODES[nodeId];
              return (
                <circle
                  key={`hint-mid-${nodeId}`}
                  cx={n.x}
                  cy={n.y}
                  r="16"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="3"
                  strokeDasharray="4,3"
                />
              );
            })}

            {/* Hint Destination Node */}
            {(() => {
              const dst = NODES[hintMove.to];
              return (
                <circle
                  cx={dst.x}
                  cy={dst.y}
                  r="18"
                  fill="rgba(245, 158, 11, 0.25)"
                  stroke="#10b981"
                  strokeWidth="3.5"
                />
              );
            })()}

            {/* Hint Captured Enemies (Crisp warning ring) */}
            {hintMove.captured.map((cId) => {
              const n = NODES[cId];
              return (
                <circle
                  key={`hint-cap-${cId}`}
                  cx={n.x}
                  cy={n.y}
                  r="20"
                  fill="rgba(239, 68, 68, 0.2)"
                  stroke="#ef4444"
                  strokeWidth="3"
                  strokeDasharray="4,4"
                />
              );
            })}
          </g>
        )}

        {/* 4. Valid Move Destination Indicators (Instant zero-lag targets) */}
        <g id="valid-destinations">
          {validDestinations.map((destId) => {
            const dest = NODES[destId];
            return (
              <g
                key={`dest-${destId}`}
                onClick={() => onNodeClick(destId)}
                className="cursor-pointer touch-manipulation"
              >
                {/* Wide invisible touch target for effortless tapping */}
                <circle cx={dest.x} cy={dest.y} r="22" fill="transparent" />

                {/* Outer crisp target ring */}
                <circle
                  cx={dest.x}
                  cy={dest.y}
                  r="16"
                  fill="rgba(34, 197, 94, 0.3)"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                />
                {/* Inner solid target bullseye */}
                <circle
                  cx={dest.x}
                  cy={dest.y}
                  r="6.5"
                  fill="#16a34a"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
              </g>
            );
          })}
        </g>

        {/* 5. Interactive Pawns (Pieces) - Instant click response, zero transition lag */}
        <g id="pawns">
          {NODES.map((node) => {
            const piece = board[node.id];
            const isSelected = selectedNode === node.id || (inChainCapture && activeChainFrom === node.id);

            return (
              <g
                key={`pawn-node-${node.id}`}
                onClick={() => onNodeClick(node.id)}
                className="cursor-pointer touch-manipulation"
              >
                {/* Wide invisible click zone for effortless touch response */}
                <circle cx={node.x} cy={node.y} r="22" fill="transparent" />

                {/* Pawn Body (if piece exists) */}
                {piece && (
                  <g>
                    {/* Native hardware-accelerated contact shadow without GPU filter latency */}
                    <ellipse
                      cx={node.x}
                      cy={node.y + 2.5}
                      rx="15"
                      ry="13.5"
                      fill="#1e0b02"
                      opacity="0.45"
                    />

                    {/* Active Selected Pawn Halo (Crisp high-contrast double ring) */}
                    {isSelected && (
                      <>
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="20"
                          fill="rgba(245, 158, 11, 0.25)"
                          stroke="#fbbf24"
                          strokeWidth="3.5"
                        />
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="16.5"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          opacity="0.9"
                        />
                      </>
                    )}

                    {/* Outer Wood Rim */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="15"
                      fill={piece === 'red' ? '#7f1d1d' : '#1e3a8a'}
                      stroke={piece === 'red' ? '#991b1b' : '#2563eb'}
                      strokeWidth="1.5"
                    />

                    {/* Main 3D Gradient Face */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="13.5"
                      fill={`url(#${piece === 'red' ? 'redPawnGrad' : 'bluePawnGrad'})`}
                    />

                    {/* Inner Inset Ring */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="9.5"
                      fill="none"
                      stroke={piece === 'red' ? '#b91c1c' : '#3b82f6'}
                      strokeWidth="0.8"
                      opacity="0.8"
                    />

                    {/* Engraved 8-Point Star Emblem */}
                    <g
                      transform={`translate(${node.x}, ${node.y}) scale(0.65)`}
                      opacity="0.9"
                    >
                      {/* 8-point geometric star */}
                      <polygon
                        points="0,-8 2,-2 8,0 2,2 0,8 -2,2 -8,0 -2,-2"
                        fill={piece === 'red' ? '#fca5a5' : '#93c5fd'}
                      />
                      <polygon
                        points="0,-6 1.5,-1.5 6,0 1.5,1.5 0,6 -1.5,1.5 -6,0 -1.5,-1.5"
                        fill={piece === 'red' ? '#7f1d1d' : '#1e3a8a'}
                        opacity="0.4"
                      />
                      <circle
                        cx="0"
                        cy="0"
                        r="1.8"
                        fill={piece === 'red' ? '#fee2e2' : '#dbeafe'}
                      />
                    </g>

                    {/* Specular Highlight Arc */}
                    <path
                      d={`M ${node.x - 9} ${node.y - 4} A 11 11 0 0 1 ${node.x + 4} ${node.y - 9}`}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
});
