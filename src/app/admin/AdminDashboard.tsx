"use client";

import { useState } from "react";
import Link from "next/link";
import type { DbSection, DbQuestion } from "@/lib/types";

interface Props {
  sections: DbSection[];
  initialQuestions: DbQuestion[];
}

export default function AdminDashboard({ sections, initialQuestions }: Props) {
  const [questions, setQuestions] = useState<DbQuestion[]>(initialQuestions);
  const [filterSection, setFilterSection] = useState<string>("all");
  const [editing, setEditing] = useState<DbQuestion | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = filterSection === "all"
    ? questions
    : questions.filter((q) => q.section_id === filterSection);

  const emptyQuestion: DbQuestion = {
    id: "",
    section_id: sections[0]?.id || "",
    question: "",
    answer: "",
    choices: ["", "", "", ""],
    explanation: "",
    difficulty: 5,
  };

  async function handleSave(q: DbQuestion) {
    setSaving(true);
    try {
      if (creating) {
        const res = await fetch("/api/admin/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(q),
        });
        if (!res.ok) throw new Error(await res.text());
        const created = await res.json();
        setQuestions((prev) => [...prev, created]);
      } else {
        const res = await fetch(`/api/admin/questions/${q.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(q),
        });
        if (!res.ok) throw new Error(await res.text());
        const updated = await res.json();
        setQuestions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
      setEditing(null);
      setCreating(false);
    } catch (err) {
      alert("Save failed: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this question?")) return;
    const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      if (editing?.id === id) setEditing(null);
    }
  }

  return (
    <main className="min-h-dvh px-4 pt-6 pb-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-text-primary">Admin</h1>
        <Link href="/" className="text-text-secondary text-sm hover:text-text-primary transition-colors">
          ← Back
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <select
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary"
        >
          <option value="all">All Sections</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
          ))}
        </select>

        <button
          onClick={() => { setCreating(true); setEditing({ ...emptyQuestion }); }}
          className="px-4 py-2 rounded-lg text-sm font-bold bg-accent text-bg hover:opacity-90"
        >
          + Add Question
        </button>

        <span className="text-text-dim text-sm ml-auto">{filtered.length} questions</span>
      </div>

      {/* Edit form */}
      {editing && (
        <QuestionForm
          question={editing}
          sections={sections}
          isNew={creating}
          saving={saving}
          onSave={handleSave}
          onCancel={() => { setEditing(null); setCreating(false); }}
        />
      )}

      {/* Question list */}
      <div className="space-y-2">
        {filtered.map((q) => (
          <div
            key={q.id}
            className="p-3 rounded-xl bg-surface border border-surface-border flex items-start gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs text-text-dim font-mono mb-1">{q.id}</div>
              <div className="text-sm text-text-primary">{q.question}</div>
              <div className="text-xs text-accent mt-1">{q.answer}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => { setCreating(false); setEditing({ ...q }); }}
                className="text-xs px-3 py-1 rounded-lg border border-surface-border text-text-secondary hover:text-text-primary"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(q.id)}
                className="text-xs px-3 py-1 rounded-lg border border-error/30 text-error hover:bg-error/10"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function QuestionForm({
  question,
  sections,
  isNew,
  saving,
  onSave,
  onCancel,
}: {
  question: DbQuestion;
  sections: DbSection[];
  isNew: boolean;
  saving: boolean;
  onSave: (q: DbQuestion) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<DbQuestion>(question);

  function updateChoice(index: number, value: string) {
    const newChoices = [...form.choices];
    newChoices[index] = value;
    setForm({ ...form, choices: newChoices });
  }

  return (
    <div className="mb-6 p-4 rounded-xl bg-surface border-2 border-accent/30 space-y-3">
      <div className="text-sm font-bold text-accent mb-2">
        {isNew ? "New Question" : `Edit: ${form.id}`}
      </div>

      {isNew && (
        <input
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          placeholder="Question ID (e.g. srt16)"
          className="w-full bg-bg border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary"
        />
      )}

      <select
        value={form.section_id}
        onChange={(e) => setForm({ ...form, section_id: e.target.value })}
        className="w-full bg-bg border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary"
      >
        {sections.map((s) => (
          <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
        ))}
      </select>

      <textarea
        value={form.question}
        onChange={(e) => setForm({ ...form, question: e.target.value })}
        placeholder="Question text"
        rows={2}
        className="w-full bg-bg border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary"
      />

      <input
        value={form.answer}
        onChange={(e) => setForm({ ...form, answer: e.target.value })}
        placeholder="Correct answer (must match one choice exactly)"
        className="w-full bg-bg border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary"
      />

      <div className="grid grid-cols-2 gap-2">
        {form.choices.map((c, i) => (
          <input
            key={i}
            value={c}
            onChange={(e) => updateChoice(i, e.target.value)}
            placeholder={`Choice ${i + 1}`}
            className={`bg-bg border rounded-lg px-3 py-2 text-sm text-text-primary ${
              c === form.answer ? "border-accent/50" : "border-surface-border"
            }`}
          />
        ))}
      </div>

      <textarea
        value={form.explanation}
        onChange={(e) => setForm({ ...form, explanation: e.target.value })}
        placeholder="Explanation"
        rows={2}
        className="w-full bg-bg border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary"
      />

      <div className="flex gap-2">
        <button
          onClick={() => onSave(form)}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-bold bg-accent text-bg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : isNew ? "Create" : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm border border-surface-border text-text-secondary hover:text-text-primary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
