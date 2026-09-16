import React from 'react';
import { useViewport } from '@xyflow/react';
import { useCollabStore } from '../../stores/collabStore';

export const RemoteCursors: React.FC = () => {
  const { remoteCursors, isLive } = useCollabStore();
  const { x, y, zoom } = useViewport();

  if (!isLive) return null;

  const now = Date.now();
  const activeCursors = Object.values(remoteCursors).filter(
    (c) => now - c.lastUpdate < 15000 // Mantener cursores activos de los últimos 15s
  );

  if (activeCursors.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {activeCursors.map((cursor) => {
        const screenX = cursor.x * zoom + x;
        const screenY = cursor.y * zoom + y;

        return (
          <div
            key={cursor.userId}
            className="absolute transition-transform duration-75 ease-out"
            style={{
              transform: `translate3d(${screenX}px, ${screenY}px, 0)`
            }}
          >
            {/* Custom SVG pointer */}
            <svg
              className="w-5 h-5 drop-shadow-md"
              viewBox="0 0 24 24"
              fill={cursor.color}
              stroke="#0F172A"
              strokeWidth="1.5"
            >
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z" />
            </svg>

            {/* Colaborador Name Pill */}
            <div
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white whitespace-nowrap shadow-lg tracking-wide select-none ml-3 -mt-1 flex items-center gap-1 border border-black/20"
              style={{ backgroundColor: cursor.color }}
            >
              <span>{cursor.name}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
