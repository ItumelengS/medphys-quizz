"use client";

interface TimerRingProps {
  timeRemaining: number;
  totalTime: number;
  size?: number;
}

export default function TimerRing({
  timeRemaining,
  totalTime,
  size = 72,
}: TimerRingProps) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = timeRemaining / totalTime;
  const offset = circumference * (1 - progress);

  const color =
    progress > 0.5
      ? "#00e5a0"
      : progress > 0.25
        ? "#fbbf24"
        : "#ef4444";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
      >
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
          style={{ transition: "stroke-dashoffset 0.3s linear, stroke 0.5s ease" }}
        />
      </svg>
      <span
        className="absolute font-mono font-bold text-lg"
        style={{ color }}
      >
        {Math.ceil(timeRemaining)}
      </span>
    </div>
  );
}
