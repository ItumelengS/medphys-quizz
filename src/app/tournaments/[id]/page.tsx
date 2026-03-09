"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOURNAMENT_TYPES } from "@/lib/tournaments";
import type { DbTournament, DbTournamentParticipant } from "@/lib/types";

interface TournamentDetail {
  tournament: DbTournament;
  leaderboard: DbTournamentParticipant[];
  participant_count: number;
  userRecord: DbTournamentParticipant | null;
  userRank: number | null;
  tiebreakerEligible: boolean;
}

function Countdown({ target, onReached, expiredText = "Now!", prefix }: { target: string; onReached?: () => void; expiredText?: string; prefix?: string }) {
  const [text, setText] = useState("");
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    let fired = false;
    function update() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setText(expiredText);
        setExpired(true);
        if (!fired && onReached) { fired = true; onReached(); }
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setText(h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    }
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [target, onReached, expiredText]);
  return <span className="font-mono">{expired ? text : prefix ? `${prefix} ${text}` : text}</span>;
}

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [berserk, setBerserk] = useState(false);

  const fetchDetail = useCallback(() => {
    fetch(`/api/tournaments/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.tournament) setDetail(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchDetail();
    // Poll every 10s only while active/upcoming — stop when finished
    const iv = setInterval(() => {
      if (detail?.tournament.status !== "finished") fetchDetail();
    }, 10000);
    return () => clearInterval(iv);
  }, [fetchDetail, detail?.tournament.status]);

  async function handleJoin() {
    setJoining(true);
    await fetch(`/api/tournaments/${id}/join`, { method: "POST" });
    fetchDetail();
    setJoining(false);
  }

  if (!session) return null;
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-text-secondary">
        Loading...
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-text-secondary">
        Tournament not found
      </div>
    );
  }

  const { tournament, leaderboard, participant_count, userRecord, userRank, tiebreakerEligible } = detail;
  const config = TOURNAMENT_TYPES[tournament.type] || TOURNAMENT_TYPES.blitz;
  const isActive = tournament.status === "active";
  const isUpcoming = tournament.status === "upcoming";
  const isFinished = tournament.status === "finished";
  const hasJoined = !!userRecord;
  const roundsPlayed = userRecord?.rounds_played ?? 0;
  const maxRounds = config.maxRounds ?? 2;
  const roundLimitReached = roundsPlayed >= maxRounds && (maxRounds === 1 || !tiebreakerEligible);
  const canPlay = isActive && hasJoined && (roundsPlayed < maxRounds || (maxRounds > 1 && tiebreakerEligible && roundsPlayed < maxRounds + 1));

  const isCrossword = tournament.type.startsWith("crossword-");
  const isSuddenDeath = tournament.type.startsWith("sudden-death-");
  const isSprint = tournament.type.startsWith("sprint-");
  const isMatch = tournament.type.startsWith("match-");
  const isHotSeat = tournament.type.startsWith("hot-seat-");
  const isWordle = tournament.type.startsWith("wordle-");
  const isConnections = tournament.type.startsWith("connections-");
  const tournamentDiscipline = (tournament as DbTournament & { discipline?: string }).discipline || "open";
  const userDiscipline = session?.user?.discipline || "physicist";
  const disciplineMismatch = tournamentDiscipline !== "open" && tournamentDiscipline !== userDiscipline;

  function getColorClass(type: string) {
    if (type === "blitz") return "text-bauhaus-red";
    if (type === "rapid") return "text-bauhaus-blue";
    if (type === "crossword-blitz") return "text-blue-500";
    if (type === "crossword-rapid") return "text-indigo-500";
    if (type === "crossword-marathon") return "text-violet-500";
    if (type === "sudden-death-blitz") return "text-red-900";
    if (type === "sudden-death-rapid") return "text-red-950";
    if (type === "sprint-blitz") return "text-yellow-600";
    if (type === "sprint-rapid") return "text-yellow-700";
    if (type.startsWith("match-")) return "text-violet-500";
    if (type.startsWith("hot-seat-")) return "text-amber-600";
    if (type.startsWith("wordle-")) return "text-green-600";
    if (type.startsWith("connections-")) return "text-purple-500";
    return "text-bauhaus-yellow";
  }

  function getBorderColor(type: string) {
    if (type === "blitz") return "border-bauhaus-red";
    if (type === "rapid") return "border-bauhaus-blue";
    if (type === "crossword-blitz") return "border-blue-500";
    if (type === "crossword-rapid") return "border-indigo-500";
    if (type === "crossword-marathon") return "border-violet-500";
    if (type === "sudden-death-blitz" || type === "sudden-death-rapid") return "border-red-900";
    if (type === "sprint-blitz" || type === "sprint-rapid") return "border-yellow-600";
    if (type.startsWith("match-")) return "border-violet-500";
    if (type.startsWith("hot-seat-")) return "border-amber-600";
    if (type.startsWith("wordle-")) return "border-green-600";
    if (type.startsWith("connections-")) return "border-purple-500";
    return "border-bauhaus-yellow";
  }

  function getBgStyle(type: string) {
    if (type === "blitz") return { background: "rgba(220, 38, 38, 0.08)" };
    if (type === "rapid") return { background: "rgba(37, 99, 235, 0.08)" };
    if (type === "crossword-blitz") return { background: "rgba(59, 130, 246, 0.08)" };
    if (type === "crossword-rapid") return { background: "rgba(99, 102, 241, 0.08)" };
    if (type === "crossword-marathon") return { background: "rgba(139, 92, 246, 0.08)" };
    if (type.startsWith("sudden-death-")) return { background: "rgba(127, 29, 29, 0.08)" };
    if (type.startsWith("sprint-")) return { background: "rgba(202, 138, 4, 0.08)" };
    if (type.startsWith("match-")) return { background: "rgba(139, 92, 246, 0.08)" };
    if (type.startsWith("hot-seat-")) return { background: "rgba(217, 119, 6, 0.08)" };
    if (type.startsWith("wordle-")) return { background: "rgba(22, 163, 74, 0.08)" };
    if (type.startsWith("connections-")) return { background: "rgba(168, 85, 247, 0.08)" };
    return { background: "rgba(234, 179, 8, 0.08)" };
  }

  function getAccentBg(type: string) {
    if (type === "blitz") return "bg-bauhaus-red";
    if (type === "rapid") return "bg-bauhaus-blue";
    if (type === "crossword-blitz") return "bg-blue-500";
    if (type === "crossword-rapid") return "bg-indigo-500";
    if (type === "crossword-marathon") return "bg-violet-500";
    if (type.startsWith("sudden-death-")) return "bg-red-900";
    if (type.startsWith("sprint-")) return "bg-yellow-600";
    if (type.startsWith("match-")) return "bg-violet-500";
    if (type.startsWith("hot-seat-")) return "bg-amber-600";
    if (type.startsWith("wordle-")) return "bg-green-600";
    if (type.startsWith("connections-")) return "bg-purple-500";
    return "bg-bauhaus-yellow";
  }

  return (
    <main className="min-h-dvh pb-32 px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="animate-fade-up mb-6">
        <Link href="/tournaments" className="text-text-dim text-xs uppercase tracking-widest mb-2 block">
          ← Arena
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{config.icon}</span>
          <div>
            <h1 className={`text-2xl font-black uppercase tracking-wider ${getColorClass(tournament.type)}`}>
              {config.label} Arena
            </h1>
            {tournamentDiscipline !== "open" && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 border border-surface-border text-text-dim font-bold inline-block mt-1">
                {tournamentDiscipline} only
              </span>
            )}
            <div className="text-text-secondary text-xs font-mono">
              {isCrossword
                ? `${Math.floor(config.timerSeconds / 60)}min · ${config.wordsTarget || 20} words · ${config.durationMinutes}min`
                : isSuddenDeath
                  ? `1 life · ${config.timerSeconds}s adaptive · ${config.durationMinutes}min`
                  : isSprint
                    ? `${config.timerSeconds}s clock · -3s penalty · ${config.durationMinutes}min`
                    : isMatch
                      ? `${config.pairsCount || 8} pairs · memory · ${config.durationMinutes}min`
                      : isHotSeat
                        ? `15 questions · lifelines · ${config.durationMinutes}min`
                        : isWordle
                          ? `1 word · 6 guesses · ${config.durationMinutes}min`
                          : isConnections
                            ? `4 groups · 4 mistakes · ${config.durationMinutes}min`
                            : `${config.timerSeconds}s · ${config.questionsPerRound}q · ${config.durationMinutes}min`
              }
            </div>
          </div>
        </div>
        <div className={`w-12 h-1 mt-2 ${getAccentBg(tournament.type)}`} />
      </div>

      {/* Status banner */}
      <div className={`animate-fade-up stagger-1 mb-6 p-4 rounded-none border-2 ${getBorderColor(tournament.type)}`} style={getBgStyle(tournament.type)}>
        {isActive && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="font-bold text-sm uppercase tracking-wider text-success">Live</span>
            </div>
            <div className="text-text-secondary text-sm">
              <Countdown target={tournament.ends_at} expiredText="Ended" prefix="Ends in" />
            </div>
          </div>
        )}
        {isUpcoming && (
          <div className="text-center">
            <div className={`text-2xl font-mono font-bold ${getColorClass(tournament.type)}`}>
              <Countdown target={tournament.starts_at} onReached={fetchDetail} expiredText="Starting now..." prefix="Starts in" />
            </div>
          </div>
        )}
        {isFinished && (
          <div className="text-center text-text-secondary font-bold text-sm uppercase tracking-wider">
            Tournament Finished
          </div>
        )}
        <div className="text-text-dim text-xs text-center mt-2">
          {participant_count} player{participant_count !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Podium — only for finished tournaments with 1+ participants */}
      {isFinished && leaderboard.length > 0 && (
        <div className="animate-fade-up stagger-2 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-4 text-center">Podium</h2>
          <div className="flex items-end justify-center gap-3">
            {/* 2nd place */}
            {leaderboard[1] && (
              <div className="flex flex-col items-center w-24">
                <div className="text-2xl mb-1">🥈</div>
                <div className="w-full bg-surface border-2 border-surface-border p-2 text-center" style={{ height: 80 }}>
                  <div className="text-xs font-bold text-text-secondary truncate">{leaderboard[1].display_name}</div>
                  <div className="font-mono text-sm font-bold text-text-primary mt-1">{leaderboard[1].total_points}</div>
                  <div className="text-[10px] text-text-dim">{leaderboard[1].rounds_played}r</div>
                </div>
              </div>
            )}
            {/* 1st place */}
            {leaderboard[0] && (
              <div className="flex flex-col items-center w-28">
                <div className="text-3xl mb-1">🥇</div>
                <div className={`w-full border-2 ${getBorderColor(tournament.type)} p-3 text-center`} style={{ ...getBgStyle(tournament.type), height: 100 }}>
                  <div className="text-xs font-black text-text-primary truncate">{leaderboard[0].display_name}</div>
                  <div className={`font-mono text-lg font-black mt-1 ${getColorClass(tournament.type)}`}>{leaderboard[0].total_points}</div>
                  <div className="text-[10px] text-text-dim">
                    {leaderboard[0].rounds_played}r
                    {leaderboard[0].fire_streak > 0 && ` · 🔥${leaderboard[0].fire_streak}`}
                  </div>
                </div>
              </div>
            )}
            {/* 3rd place */}
            {leaderboard[2] && (
              <div className="flex flex-col items-center w-24">
                <div className="text-2xl mb-1">🥉</div>
                <div className="w-full bg-surface border-2 border-surface-border p-2 text-center" style={{ height: 64 }}>
                  <div className="text-xs font-bold text-text-secondary truncate">{leaderboard[2].display_name}</div>
                  <div className="font-mono text-sm font-bold text-text-primary mt-1">{leaderboard[2].total_points}</div>
                  <div className="text-[10px] text-text-dim">{leaderboard[2].rounds_played}r</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User stats */}
      {userRecord && (
        <div className={`animate-fade-up ${isFinished ? "stagger-3" : "stagger-2"} mb-6 p-3 rounded-none border-2 border-surface-border bg-surface`}>
          <div className="flex items-center justify-between text-sm">
            <div className="text-text-secondary">
              {isFinished ? "Your final rank" : "Rank"} <span className="font-mono font-bold text-text-primary">#{userRank}</span>
              {isFinished && <span className="text-text-dim"> of {participant_count}</span>}
            </div>
            <div className="font-mono font-bold text-bauhaus-blue">{userRecord.total_points} pts</div>
          </div>
          <div className="flex items-center justify-between text-xs text-text-dim mt-1">
            <span>{userRecord.rounds_played}/{maxRounds > 1 && tiebreakerEligible ? maxRounds + 1 : maxRounds} round{maxRounds > 1 ? "s" : ""} · best round {userRecord.best_round_score}pts</span>
            {userRecord.fire_streak > 0 && <span>🔥 {userRecord.fire_streak}</span>}
            {userRecord.berserk_rounds > 0 && <span>💀 {userRecord.berserk_rounds}</span>}
          </div>
        </div>
      )}

      {/* Leaderboard / Full standings */}
      <div className={`animate-fade-up ${isFinished ? "stagger-4" : "stagger-3"} mb-6`}>
        <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-3">
          {isFinished ? "Final Standings" : "Leaderboard"}
        </h2>
        {leaderboard.length === 0 ? (
          <div className="text-text-dim text-sm text-center py-6">No participants yet</div>
        ) : (
          <div className="space-y-1">
            {leaderboard.map((p, i) => {
              const isUser = p.user_id === session?.user?.id;
              return (
                <div
                  key={p.user_id}
                  className={`flex items-center justify-between p-3 rounded-none border-2 transition-all ${
                    isUser
                      ? `${getBorderColor(tournament.type)} border-l-4`
                      : isFinished && i < 3
                        ? "border-surface-border bg-surface"
                        : "border-surface-border"
                  }`}
                  style={isUser ? getBgStyle(tournament.type) : undefined}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-text-dim w-6 text-right">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                    </span>
                    <div>
                      <div className={`text-sm font-bold ${isUser ? "text-text-primary" : "text-text-secondary"}`}>
                        {p.display_name}
                      </div>
                      <div className="text-xs text-text-dim">
                        {p.rounds_played}r
                        {isFinished && <span> · best {p.best_round_score}</span>}
                        {p.fire_streak > 0 && <span> · 🔥{p.fire_streak}</span>}
                        {p.berserk_rounds > 0 && <span> · 💀{p.berserk_rounds}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm text-text-primary">
                    {p.total_points}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t-2 border-surface-border bg-bg p-4">
        <div className="max-w-lg mx-auto">
          {isActive && hasJoined && canPlay && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setBerserk(!berserk)}
                className={`px-4 py-3 rounded-none border-2 text-sm font-bold uppercase tracking-wider transition-all ${
                  berserk
                    ? "border-bauhaus-red bg-bauhaus-red/10 text-bauhaus-red"
                    : "border-surface-border text-text-dim"
                }`}
              >
                💀 Berserk
              </button>
              <button
                onClick={() => {
                  const playPath = isCrossword
                    ? `/tournaments/${id}/play-crossword?berserk=${berserk}`
                    : isSuddenDeath
                      ? `/tournaments/${id}/play-sudden-death?berserk=${berserk}`
                      : isSprint
                        ? `/tournaments/${id}/play-sprint?berserk=${berserk}`
                        : isMatch
                          ? `/tournaments/${id}/play-match?berserk=${berserk}`
                          : isHotSeat
                            ? `/tournaments/${id}/play-hot-seat?berserk=${berserk}`
                            : isWordle
                              ? `/tournaments/${id}/play-wordle`
                              : isConnections
                                ? `/tournaments/${id}/play-connections`
                                : `/tournaments/${id}/play?berserk=${berserk}`;
                  router.push(playPath);
                }}
                className={`flex-1 py-3 rounded-none border-2 font-black text-sm uppercase tracking-widest transition-all ${getBorderColor(tournament.type)} hover:scale-[1.01]`}
                style={getBgStyle(tournament.type)}
              >
                {tiebreakerEligible && roundsPlayed === maxRounds
                  ? "Tiebreaker Round!"
                  : isCrossword ? "Play Puzzle" : isSuddenDeath ? "Enter Arena" : isSprint ? "Start Sprint" : isMatch ? "Play Match" : isHotSeat ? "Play Hot Seat" : isWordle ? "Play Wordle" : isConnections ? "Play Connections" : "Play Round"}
              </button>
            </div>
          )}
          {isActive && hasJoined && !canPlay && (
            <div className="text-center py-3">
              <div className="text-text-dim text-sm uppercase tracking-wider font-bold">
                {roundsPlayed}/{maxRounds > 1 && tiebreakerEligible ? maxRounds + 1 : maxRounds} round{maxRounds > 1 ? "s" : ""} played
              </div>
              {roundLimitReached && (
                <div className="text-text-dim text-xs mt-1">Round limit reached</div>
              )}
            </div>
          )}
          {isActive && !hasJoined && !disciplineMismatch && (
            <button
              onClick={handleJoin}
              disabled={joining}
              className={`w-full py-3 rounded-none border-2 font-black text-sm uppercase tracking-widest ${getBorderColor(tournament.type)}`}
              style={getBgStyle(tournament.type)}
            >
              {joining ? "Joining..." : "Join Tournament"}
            </button>
          )}
          {isUpcoming && !hasJoined && !disciplineMismatch && (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3 rounded-none border-2 border-surface-border font-bold text-sm uppercase tracking-widest text-text-secondary"
            >
              {joining ? "Joining..." : "Join Early"}
            </button>
          )}
          {!hasJoined && disciplineMismatch && (isActive || isUpcoming) && (
            <div className="text-center py-3">
              <div className="text-text-dim text-sm">
                This tournament is for <span className="font-bold">{tournamentDiscipline}s</span> only.
              </div>
              <Link href="/profile" className="text-bauhaus-blue text-xs hover:underline mt-1 inline-block">
                Change your discipline in profile settings
              </Link>
            </div>
          )}
          {isUpcoming && hasJoined && (
            <div className="text-center text-text-dim text-sm uppercase tracking-wider">
              Joined — waiting for start
            </div>
          )}
          {isFinished && (
            <Link
              href="/tournaments"
              className="block w-full py-3 rounded-none border-2 border-surface-border font-bold text-sm uppercase tracking-widest text-text-secondary text-center"
            >
              Back to Arena
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
