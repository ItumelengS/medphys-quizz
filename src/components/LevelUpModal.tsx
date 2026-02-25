"use client";

import { useState } from "react";
import type { CareerLevel } from "@/lib/types";

interface LevelUpModalProps {
  level: CareerLevel;
  onClose: () => void;
}

export default function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  const [confettiPieces] = useState(() =>
    Array.from({ length: 20 }).map((_, i) => ({
      left: `${Math.random() * 100}%`,
      background: ["#00e5a0", "#fbbf24", "#f472b6", "#60a5fa", "#c084fc"][i % 5],
      animation: `confetti-fall ${1.5 + Math.random() * 2}s ease-out ${Math.random() * 0.5}s forwards`,
    }))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6, 10, 20, 0.9)", backdropFilter: "blur(8px)" }}
    >
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiPieces.map((piece, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: piece.left,
              top: "-10px",
              background: piece.background,
              animation: piece.animation,
            }}
          />
        ))}
      </div>

      <div className="animate-scale-in text-center max-w-sm">
        <div className="text-6xl mb-4">{level.icon}</div>
        <h2 className="text-2xl font-black text-accent mb-2">Level Up!</h2>
        <p className="text-text-primary text-lg font-bold mb-1">
          You are now a
        </p>
        <p className="text-3xl font-black mb-6" style={{ color: "#fbbf24" }}>
          {level.title}
        </p>
        <button
          onClick={onClose}
          className="px-8 py-3 rounded-xl font-bold text-bg transition-all hover:opacity-90 active:scale-95"
          style={{ background: "#00e5a0" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
