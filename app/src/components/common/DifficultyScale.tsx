import React from 'react';
import { getDifficultyColor, getDifficultyLabel } from '../../utils/courseUtils';

interface DifficultyScaleProps {
  level: number | null;
  compact?: boolean;
}

export const DifficultyScale: React.FC<DifficultyScaleProps> = ({ level, compact }) => {
  const MAX_SEGMENTS = 5;
  const filled = level ? Math.min(level, MAX_SEGMENTS) : 0;
  const color = getDifficultyColor(level);

  if (compact) {
    return (
      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold text-white ${color}`}>
        N{level ?? '?'}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: MAX_SEGMENTS }).map((_, i) => (
          <span key={i} className={`h-1.5 w-3.5 rounded-sm ${i < filled ? color : 'bg-zinc-700'}`} />
        ))}
      </div>
      <span className="text-[10px] text-zinc-400">{getDifficultyLabel(level)}</span>
    </div>
  );
};
