"use client";

import { getStreakEmoji, getStreakMultiplier } from "@/lib/scoring";

interface StreakBadgeProps {
  streak: number;
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak < 3) return null;

  const emoji = getStreakEmoji(streak);
  const multiplier = getStreakMultiplier(streak);
  const isHot = streak >= 10;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none font-mono text-sm font-bold
        ${isHot ? "animate-shake" : streak >= 5 ? "animate-pulse-glow" : ""}
      `}
      style={{
        background: "rgba(234, 179, 8, 0.15)",
        border: "2px solid rgba(234, 179, 8, 0.3)",
        color: "#eab308",
      }}
    >
      <span>{emoji}</span>
      <span>{streak}</span>
      <span className="text-xs opacity-75">x{multiplier}</span>
    </div>
  );
}
