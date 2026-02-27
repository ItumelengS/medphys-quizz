"use client";

import Link from "next/link";
import { VARIANT_LIST } from "@/lib/game-variants";

export default function GamesHubPage() {
  return (
    <main className="min-h-dvh pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="animate-fade-up mb-2">
        <Link href="/" className="text-text-dim text-xs uppercase tracking-widest hover:text-text-secondary">
          ← Home
        </Link>
      </div>

      <div className="animate-fade-up mb-6">
        <h1 className="text-3xl font-black text-text-primary">
          Game <span className="text-bauhaus-red">Variants</span>
        </h1>
        <div className="w-12 h-1 bg-bauhaus-red mt-2 mb-1" />
        <p className="text-text-secondary text-sm font-light">
          Same questions, remixed mechanics. Pick your poison.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {VARIANT_LIST.map((variant, i) => (
          <Link
            key={variant.id}
            href={`/games/${variant.id}`}
            className={`animate-fade-up stagger-${i + 1}`}
          >
            <div
              className="p-5 rounded-none border-2 transition-all hover:border-l-4"
              style={{
                background: `${variant.color}08`,
                borderColor: `${variant.color}40`,
                ["--hover-border" as string]: variant.color,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderLeftColor = variant.color;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderLeftColor = `${variant.color}40`;
              }}
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">{variant.icon}</span>
                <div className="flex-1">
                  <div
                    className="font-black text-lg uppercase tracking-wider mb-1"
                    style={{ color: variant.color }}
                  >
                    {variant.name}
                  </div>
                  <p className="text-text-secondary text-sm font-light mb-3">
                    {variant.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variant.rules.slice(0, 3).map((rule, j) => (
                      <span
                        key={j}
                        className="text-xs px-2 py-0.5 rounded-none border font-mono"
                        style={{
                          borderColor: `${variant.color}30`,
                          color: `${variant.color}cc`,
                        }}
                      >
                        {rule}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: `${variant.color}20` }}>
                <span className="text-xs text-text-dim font-mono uppercase tracking-wider">
                  {variant.xpMultiplier}x XP
                </span>
                <span className="text-sm font-bold" style={{ color: variant.color }}>
                  Play →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
