"use client";

import { useState } from "react";
import type { CareerLevel } from "@/lib/types";

interface LevelUpModalProps {
  level: CareerLevel;
  onClose: () => void;
}

const SHAPES = ["circle", "square", "triangle"] as const;
const COLORS = ["#dc2626", "#2563eb", "#eab308"];

export default function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  const [confettiPieces] = useState(() =>
    Array.from({ length: 20 }).map((_, i) => ({
      left: `${Math.random() * 100}%`,
      color: COLORS[i % 3],
      shape: SHAPES[i % 3],
      animation: `confetti-fall ${1.5 + Math.random() * 2}s ease-out ${Math.random() * 0.5}s forwards`,
    }))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10, 10, 10, 0.92)" }}
    >
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiPieces.map((piece, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: piece.left,
              top: "-10px",
              animation: piece.animation,
            }}
          >
            {piece.shape === "circle" && (
              <div className="w-3 h-3 rounded-full" style={{ background: piece.color }} />
            )}
            {piece.shape === "square" && (
              <div className="w-3 h-3" style={{ background: piece.color }} />
            )}
            {piece.shape === "triangle" && (
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderBottom: `10px solid ${piece.color}`,
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="animate-scale-in text-center max-w-sm">
        <div className="text-6xl mb-4">{level.icon}</div>
        <h2 className="text-2xl font-black text-bauhaus-blue mb-2 uppercase tracking-widest">Level Up!</h2>
        <p className="text-text-primary text-lg font-light mb-1">
          You are now a
        </p>
        <p className="text-3xl font-black mb-6" style={{ color: "#eab308" }}>
          {level.title}
        </p>
        <button
          onClick={onClose}
          className="px-8 py-3 rounded-none font-bold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: "#2563eb" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
