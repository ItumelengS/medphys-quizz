"use client";

import type { ArenaTitle } from "@/lib/arena-titles";

interface ArenaBadgesProps {
  titles: ArenaTitle[];
  /** Show all or just the primary title */
  mode?: "all" | "primary";
}

export default function ArenaBadges({ titles, mode = "all" }: ArenaBadgesProps) {
  if (titles.length === 0) return null;

  const display = mode === "primary" ? [titles[0]] : titles;

  return (
    <div className="flex flex-wrap gap-1.5">
      {display.map((title) => (
        <span
          key={title.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none border text-[10px] font-bold uppercase tracking-widest"
          style={{ borderColor: title.color, color: title.color }}
          title={title.description}
        >
          {title.icon} {title.title}
        </span>
      ))}
    </div>
  );
}
