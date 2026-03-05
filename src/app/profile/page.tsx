"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { DISCIPLINES } from "@/lib/types";

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [discipline, setDiscipline] = useState(session?.user?.discipline || "physicist");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleDisciplineChange(newDiscipline: string) {
    setDiscipline(newDiscipline);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discipline: newDiscipline }),
      });
      if (res.ok) {
        setSaved(true);
        await updateSession();
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!session) return null;

  return (
    <main className="min-h-dvh pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="animate-fade-up mb-6">
        <Link href="/" className="text-text-dim text-xs uppercase tracking-widest mb-2 block">
          &larr; Home
        </Link>
        <h1 className="text-3xl font-black">
          <span className="text-bauhaus-blue">Profile</span>{" "}
          <span className="text-text-primary">Settings</span>
        </h1>
        <div className="w-12 h-1 bg-bauhaus-blue mt-2" />
      </div>

      <div className="animate-fade-up stagger-1 space-y-6">
        {/* Display name */}
        <div className="p-4 border-2 border-surface-border bg-surface">
          <div className="text-text-secondary text-xs uppercase tracking-widest mb-1">Display Name</div>
          <div className="text-text-primary font-bold">{session.user.displayName}</div>
        </div>

        {/* Discipline */}
        <div className="p-4 border-2 border-surface-border bg-surface">
          <label htmlFor="discipline" className="text-text-secondary text-xs uppercase tracking-widest mb-2 block">
            Discipline
          </label>
          <select
            id="discipline"
            value={discipline}
            onChange={(e) => handleDisciplineChange(e.target.value)}
            disabled={saving}
            className="w-full px-4 py-3 rounded-none bg-bg border-2 border-surface-border text-text-primary text-sm font-light focus:outline-none focus:border-bauhaus-blue disabled:opacity-50"
          >
            {DISCIPLINES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <p className="text-text-dim text-xs mt-2">
            Physicists see all questions. Other disciplines see their relevant questions plus general physics.
          </p>
          {saving && <p className="text-text-secondary text-xs mt-1">Saving...</p>}
          {saved && <p className="text-success text-xs mt-1">Saved!</p>}
        </div>

        {/* XP */}
        <div className="p-4 border-2 border-surface-border bg-surface">
          <div className="text-text-secondary text-xs uppercase tracking-widest mb-1">XP</div>
          <div className="text-text-primary font-bold font-mono">{session.user.xp}</div>
        </div>
      </div>
    </main>
  );
}
