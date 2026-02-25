"use client";

import { getSectionMasteryColor } from "@/lib/scoring";

interface SectionMasteryRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export default function SectionMasteryRing({
  percent,
  size = 48,
  strokeWidth = 3,
  showLabel = true,
}: SectionMasteryRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  const color = getSectionMasteryColor(percent);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
        />
      </svg>
      {showLabel && (
        <span className="absolute font-mono text-xs font-bold" style={{ color }}>
          {percent >= 90 ? "✓" : `${Math.round(percent)}%`}
        </span>
      )}
    </div>
  );
}
