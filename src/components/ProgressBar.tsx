"use client";

interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  height?: number;
}

export default function ProgressBar({
  progress,
  color = "#00e5a0",
  height = 4,
}: ProgressBarProps) {
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, background: "rgba(255,255,255,0.06)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${Math.min(100, Math.max(0, progress))}%`,
          background: `linear-gradient(90deg, ${color}, #00e5a0)`,
        }}
      />
    </div>
  );
}
