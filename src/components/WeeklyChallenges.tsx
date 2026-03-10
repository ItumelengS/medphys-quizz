"use client";

import ProgressBar from "@/components/ProgressBar";

interface ChallengeWithProgress {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  bonus_xp: number;
  progress: {
    current_value: number;
    completed: boolean;
    xp_awarded: boolean;
  };
}

interface WeeklyChallengesProps {
  challenges: ChallengeWithProgress[];
}

function formatProgress(
  type: string,
  current: number,
  target: number
): string {
  switch (type) {
    case "section_accuracy":
      return `${current}% / ${target}%`;
    case "streak":
      return `${current} / ${target} streak`;
    case "games_played":
      return `${current} / ${target} games`;
    case "perfect_round":
      return `${current} / ${target} perfect`;
    case "variant_score":
      return `${current} / ${target} score`;
    default:
      return `${current} / ${target}`;
  }
}

function getProgressPercent(
  type: string,
  current: number,
  target: number
): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export default function WeeklyChallenges({ challenges }: WeeklyChallengesProps) {
  if (!challenges || challenges.length === 0) return null;

  return (
    <div className="mb-4 animate-fade-up stagger-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎯</span>
        <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">
          Weekly Challenges
        </span>
      </div>

      <div className="space-y-2">
        {challenges.map((challenge) => {
          const { progress } = challenge;
          const percent = progress.completed
            ? 100
            : getProgressPercent(
                challenge.challenge_type,
                progress.current_value,
                challenge.target_value
              );

          return (
            <div
              key={challenge.id}
              className={`p-3 rounded-none border-2 transition-all ${
                progress.completed
                  ? "border-bauhaus-yellow/40 bg-bauhaus-yellow/5"
                  : "border-surface-border bg-surface"
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-text-primary truncate">
                      {challenge.title}
                    </span>
                    {progress.completed && (
                      <span className="shrink-0 text-xs font-mono font-bold text-bauhaus-yellow uppercase tracking-wider">
                        Claimed
                      </span>
                    )}
                  </div>
                  <div className="text-text-secondary text-xs font-light mt-0.5">
                    {challenge.description}
                  </div>
                </div>
                <div className="shrink-0 ml-3 text-right">
                  <span className="font-mono text-xs font-bold text-bauhaus-blue">
                    +{challenge.bonus_xp} XP
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ProgressBar
                    progress={percent}
                    color={progress.completed ? "#eab308" : "#2563eb"}
                    height={4}
                  />
                </div>
                <span className="text-text-dim text-xs font-mono shrink-0">
                  {progress.completed
                    ? "Done"
                    : formatProgress(
                        challenge.challenge_type,
                        progress.current_value,
                        challenge.target_value
                      )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
