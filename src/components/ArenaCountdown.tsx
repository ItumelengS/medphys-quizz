"use client";

import { useState, useEffect, useRef } from "react";

interface ArenaCountdownProps {
  /** Called when countdown finishes and player is ready */
  onReady: () => void;
  /** Called when player abandons (backs out or timer expires without confirming) */
  onAbandon: () => void;
  /** Variant display name */
  variantLabel: string;
  /** Variant icon */
  variantIcon: string;
  /** Accent color */
  color: string;
  /** Whether berserk is active */
  berserk?: boolean;
}

export default function ArenaCountdown({
  onReady,
  onAbandon,
  variantLabel,
  variantIcon,
  color,
  berserk,
}: ArenaCountdownProps) {
  const [countdown, setCountdown] = useState(10);
  const [confirmed, setConfirmed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // When countdown hits 0 without confirmation → abandon
  useEffect(() => {
    if (countdown === 0 && !confirmed) {
      onAbandon();
    }
  }, [countdown, confirmed, onAbandon]);

  function handleConfirm() {
    if (confirmed) return;
    setConfirmed(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    onReady();
  }

  function handleLeave() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onAbandon();
  }

  const progress = (countdown / 10) * 100;

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        {/* Icon */}
        <div className="text-6xl mb-4">{variantIcon}</div>

        {/* Title */}
        <h1 className="text-2xl font-black uppercase tracking-wider mb-1" style={{ color }}>
          {variantLabel}
        </h1>
        {berserk && (
          <div className="text-xs font-bold text-bauhaus-red border border-bauhaus-red px-2 py-0.5 uppercase tracking-wider inline-block mb-4">
            💀 Berserk
          </div>
        )}

        {/* Countdown ring */}
        <div className="relative w-32 h-32 mx-auto my-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="6"
            />
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke={countdown <= 3 ? "#ef4444" : color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-mono text-4xl font-black ${countdown <= 3 ? "text-bauhaus-red" : "text-text-primary"}`}>
              {countdown}
            </span>
          </div>
        </div>

        <p className="text-text-secondary text-sm mb-6">
          Round starts in {countdown}s. Ready?
        </p>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleConfirm}
            disabled={confirmed}
            className="w-full py-4 rounded-none font-black text-lg uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-50"
            style={{ background: color }}
          >
            {confirmed ? "Starting..." : "Start Round"}
          </button>
          <button
            onClick={handleLeave}
            className="w-full py-3 rounded-none border-2 border-bauhaus-red/40 text-bauhaus-red text-sm font-bold uppercase tracking-widest hover:bg-bauhaus-red/10 transition-all"
          >
            Leave (0 score penalty)
          </button>
        </div>
      </div>
    </main>
  );
}
