"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { CrosswordPuzzle, CrosswordWord } from "@/lib/types";

export interface PuzzleSubmitResult {
  allCorrect: boolean;
  wordsCorrect: number;
  totalWords: number;
  wordsWithHint: number;
  hintsUsed: number;
}

interface CrosswordGridProps {
  puzzle: CrosswordPuzzle;
  onPuzzleSubmit: (result: PuzzleSubmitResult) => void;
}

interface CellState {
  value: string;
  pencil: boolean;
  revealed: boolean;
  wrong: boolean;
}

export default function CrosswordGrid({ puzzle, onPuzzleSubmit }: CrosswordGridProps) {
  const { width, height, grid, words } = puzzle;

  const [cellStates, setCellStates] = useState<Record<string, CellState>>(() => {
    const states: Record<string, CellState> = {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y][x]) {
          states[`${x},${y}`] = { value: "", pencil: false, revealed: false, wrong: false };
        }
      }
    }
    return states;
  });

  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [pencilMode, setPencilMode] = useState(false);
  const [correctWords, setCorrectWords] = useState<Set<number>>(new Set());
  const [hintedWords, setHintedWords] = useState<Set<number>>(new Set());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const getActiveWord = useCallback((): CrosswordWord | null => {
    if (!selectedCell) return null;
    const cell = grid[selectedCell.y]?.[selectedCell.x];
    if (!cell) return null;

    for (const wi of cell.wordIndices) {
      const word = words.find((w) => w.index === wi);
      if (word && word.direction === direction) return word;
    }
    for (const wi of cell.wordIndices) {
      const word = words.find((w) => w.index === wi);
      if (word) return word;
    }
    return null;
  }, [selectedCell, direction, grid, words]);

  const activeWord = getActiveWord();

  // Clue number map: position key → clue number
  const clueNumMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of words) {
      const key = `${w.startX},${w.startY}`;
      if (!map.has(key)) {
        map.set(key, w.index);
      }
    }
    return map;
  }, [words]);

  // Responsive cell size
  const [cellSize, setCellSize] = useState(32);
  useEffect(() => {
    function calc() {
      const vw = window.innerWidth;
      const maxGrid = Math.min(vw - 32, 480);
      setCellSize(Math.max(26, Math.min(40, Math.floor(maxGrid / width))));
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [width]);

  function handleCellClick(x: number, y: number) {
    if (!grid[y][x]) return;
    if (selectedCell?.x === x && selectedCell?.y === y) {
      setDirection((d) => (d === "across" ? "down" : "across"));
    } else {
      setSelectedCell({ x, y });
    }
    inputRef.current?.focus();
  }

  function handleKeyInput(key: string) {
    if (!selectedCell) return;

    if (key === "Backspace") {
      const k = `${selectedCell.x},${selectedCell.y}`;
      const current = cellStates[k];
      if (current?.revealed) return; // don't delete hinted letters
      if (current?.value) {
        setCellStates((prev) => ({
          ...prev,
          [k]: { ...prev[k], value: "", wrong: false },
        }));
      } else {
        moveCursor(-1);
        setTimeout(() => {
          setSelectedCell((sel) => {
            if (sel) {
              const nk = `${sel.x},${sel.y}`;
              setCellStates((prev) => {
                if (prev[nk]?.revealed) return prev; // don't delete hinted letters
                return {
                  ...prev,
                  [nk]: { ...prev[nk], value: "", wrong: false },
                };
              });
            }
            return sel;
          });
        }, 0);
      }
      return;
    }

    if (key === "Tab") {
      if (activeWord) {
        const currentIdx = words.indexOf(activeWord);
        const next = words[(currentIdx + 1) % words.length];
        setSelectedCell({ x: next.startX, y: next.startY });
        setDirection(next.direction);
      }
      return;
    }

    const letter = key.toUpperCase();
    if (!/^[A-Z]$/.test(letter)) return;

    const k = `${selectedCell.x},${selectedCell.y}`;
    if (cellStates[k]?.revealed) {
      // skip over hinted cells
      moveCursor(1);
      return;
    }

    setCellStates((prev) => ({
      ...prev,
      [k]: { ...prev[k], value: letter, pencil: pencilMode, wrong: false },
    }));

    // Clear submitted state when user edits after a failed submit
    if (submitted) setSubmitted(false);

    moveCursor(1);
  }

  function moveCursor(delta: number) {
    if (!selectedCell || !activeWord) return;
    const cells = activeWord.cells;
    const currentIdx = cells.findIndex((c) => c.x === selectedCell.x && c.y === selectedCell.y);
    const nextIdx = currentIdx + delta;
    if (nextIdx >= 0 && nextIdx < cells.length) {
      setSelectedCell(cells[nextIdx]);
    }
  }

  function handleHint() {
    if (!activeWord || correctWords.has(activeWord.index)) return;

    // Find unrevealed cells that don't already have the correct letter
    const candidates = activeWord.cells
      .map((c, i) => ({ c, i }))
      .filter(({ c, i }) => {
        const state = cellStates[`${c.x},${c.y}`];
        return !state?.revealed && state?.value !== activeWord.answer[i];
      });

    if (candidates.length === 0) return;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const k = `${pick.c.x},${pick.c.y}`;
    const correctLetter = activeWord.answer[pick.i];

    setCellStates((prev) => ({
      ...prev,
      [k]: { ...prev[k], value: correctLetter, revealed: true, pencil: false, wrong: false },
    }));

    setHintedWords((prev) => new Set(prev).add(activeWord.index));
    setHintsUsed((h) => h + 1);
    if (submitted) setSubmitted(false);
  }

  function handleSubmitPuzzle() {
    setSubmitted(true);
    const newCorrect = new Set(correctWords);
    let allCorrect = true;

    setCellStates((prev) => {
      const updated = { ...prev };

      for (const word of words) {
        if (newCorrect.has(word.index)) continue;

        const wordCorrect = word.cells.every(
          (c, i) => updated[`${c.x},${c.y}`]?.value === word.answer[i]
        );

        if (wordCorrect) {
          newCorrect.add(word.index);
        } else {
          allCorrect = false;
          // Mark wrong cells
          for (let i = 0; i < word.cells.length; i++) {
            const c = word.cells[i];
            const k = `${c.x},${c.y}`;
            if (updated[k].value && updated[k].value !== word.answer[i]) {
              updated[k] = { ...updated[k], wrong: true };
            }
          }
        }
      }

      return updated;
    });

    setCorrectWords(newCorrect);

    onPuzzleSubmit({
      allCorrect,
      wordsCorrect: newCorrect.size,
      totalWords: words.length,
      wordsWithHint: [...newCorrect].filter((wi) => hintedWords.has(wi)).length,
      hintsUsed,
    });
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if the hidden input is focused — it handles its own events
      const fromInput = e.target === inputRef.current;
      if (e.key === "Tab") { e.preventDefault(); handleKeyInput("Tab"); return; }
      if (e.key === "Backspace" && !fromInput) { e.preventDefault(); handleKeyInput("Backspace"); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); setDirection("across"); moveCursor(1); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); setDirection("across"); moveCursor(-1); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setDirection("down"); moveCursor(1); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setDirection("down"); moveCursor(-1); return; }
      if (e.key.length === 1 && !fromInput) handleKeyInput(e.key);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCell, direction, activeWord, pencilMode, submitted]);

  function isInActiveWord(x: number, y: number): boolean {
    if (!activeWord) return false;
    return activeWord.cells.some((c) => c.x === x && c.y === y);
  }

  const acrossClues = words.filter((w) => w.direction === "across").sort((a, b) => a.index - b.index);
  const downClues = words.filter((w) => w.direction === "down").sort((a, b) => a.index - b.index);

  const gridWidth = cellSize * width;
  const numFontSize = Math.max(9, cellSize * 0.3);
  const letterFontSize = Math.max(14, cellSize * 0.5);

  // Check if all cells are filled (for enabling submit button)
  const allFilled = useMemo(() => {
    return words.every((word) =>
      word.cells.every((c) => cellStates[`${c.x},${c.y}`]?.value !== "")
    );
  }, [cellStates, words]);

  const allSolved = correctWords.size === words.length;

  return (
    <div className="select-none">
      {/* Hidden input for mobile keyboard */}
      <input
        ref={inputRef}
        className="opacity-0 absolute w-0 h-0"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        inputMode="text"
        onInput={(e) => {
          const val = (e.target as HTMLInputElement).value;
          if (val) {
            handleKeyInput(val.slice(-1));
            (e.target as HTMLInputElement).value = "";
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Backspace") {
            e.preventDefault();
            handleKeyInput("Backspace");
          }
        }}
      />

      {/* Active clue banner */}
      <div
        className="mb-4 px-4 py-3 transition-all duration-200"
        style={{
          background: activeWord ? "rgba(37, 99, 235, 0.08)" : "transparent",
          borderLeft: activeWord ? "3px solid #3b82f6" : "3px solid transparent",
          minHeight: 56,
        }}
      >
        {activeWord ? (
          <div className="flex items-start gap-3">
            <span
              className="shrink-0 inline-flex items-center justify-center font-mono font-bold text-white rounded-sm"
              style={{ width: 26, height: 26, fontSize: 12, background: "#3b82f6" }}
            >
              {activeWord.index}
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.15em] font-semibold text-blue-400/70 mb-0.5">
                {activeWord.direction}
              </div>
              <div className="text-sm text-text-primary leading-snug">{activeWord.clue}</div>
            </div>
          </div>
        ) : (
          <span className="text-text-dim text-sm">Tap a cell to begin</span>
        )}
      </div>

      {/* Grid */}
      <div className="flex justify-center mb-5">
        <div
          ref={gridRef}
          className="relative"
          style={{
            width: gridWidth + 2,
            border: "2px solid #222",
            background: "#222",
            boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
          }}
          onClick={() => inputRef.current?.focus()}
        >
          {Array.from({ length: height }).map((_, y) => (
            <div key={y} className="flex">
              {Array.from({ length: width }).map((_, x) => {
                const cell = grid[y][x];
                if (!cell) {
                  return (
                    <div
                      key={x}
                      style={{ width: cellSize, height: cellSize, background: "#222" }}
                    />
                  );
                }

                const k = `${x},${y}`;
                const state = cellStates[k];
                const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                const inWord = isInActiveWord(x, y);
                const isCorrectWord = cell.wordIndices.some((wi) => correctWords.has(wi));
                const clueNum = clueNumMap.get(k);

                let bg: string;
                if (isSelected) {
                  bg = "#fbbf24";
                } else if (state?.wrong) {
                  bg = "#fecaca"; // light red for wrong cells
                } else if (isCorrectWord) {
                  bg = "#d1fae5"; // green for correct words
                } else if (inWord) {
                  bg = "#dbeafe";
                } else {
                  bg = "#ffffff";
                }

                let textColor: string;
                if (state?.revealed) {
                  textColor = "#3b82f6";
                } else if (state?.wrong) {
                  textColor = "#dc2626";
                } else if (isCorrectWord) {
                  textColor = "#16a34a";
                } else if (state?.pencil) {
                  textColor = "#9ca3af";
                } else {
                  textColor = "#111";
                }

                return (
                  <div
                    key={x}
                    className="relative cursor-pointer"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: bg,
                      borderRight: "1px solid #bbb",
                      borderBottom: "1px solid #bbb",
                      transition: "background 0.15s ease",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCellClick(x, y);
                    }}
                  >
                    {/* Clue number — top-left, tight positioning */}
                    {clueNum !== undefined && (
                      <span
                        className="absolute font-mono font-bold leading-none pointer-events-none"
                        style={{
                          top: 1,
                          left: 2,
                          fontSize: numFontSize,
                          color: isSelected ? "#92400e" : "#666",
                          lineHeight: 1,
                        }}
                      >
                        {clueNum}
                      </span>
                    )}
                    {/* Letter — centered, shifted down when number present */}
                    {state?.value && (
                      <span
                        className="absolute inset-0 flex items-center justify-center font-bold pointer-events-none"
                        style={{
                          fontSize: letterFontSize,
                          color: textColor,
                          paddingTop: clueNum ? Math.max(2, numFontSize * 0.5) : 0,
                          fontFamily: "system-ui, -apple-system, sans-serif",
                        }}
                      >
                        {state.value}
                      </span>
                    )}
                    {/* Wrong marker */}
                    {state?.wrong && (
                      <svg
                        className="absolute pointer-events-none"
                        style={{ top: 2, right: 2, width: cellSize * 0.22, height: cellSize * 0.22 }}
                        viewBox="0 0 10 10"
                      >
                        <line x1="0" y1="10" x2="10" y2="0" stroke="#dc2626" strokeWidth="2" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          onClick={() => setPencilMode(!pencilMode)}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-2 transition-all active:scale-95 ${
            pencilMode
              ? "border-bauhaus-yellow text-bauhaus-yellow bg-bauhaus-yellow/10"
              : "border-surface-border text-text-secondary hover:bg-surface"
          }`}
        >
          {pencilMode ? "Pencil On" : "Pencil"}
        </button>
        <button
          onClick={handleHint}
          disabled={!activeWord || correctWords.has(activeWord?.index ?? -1) || allSolved}
          className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-2 border-surface-border text-text-secondary hover:bg-surface transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Hint (-5pts)
        </button>
        <button
          onClick={handleSubmitPuzzle}
          disabled={!allFilled || allSolved}
          className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-2 border-bauhaus-blue text-bauhaus-blue hover:bg-bauhaus-blue/10 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {allSolved ? "Solved!" : "Submit Puzzle"}
        </button>
      </div>

      {/* Feedback after submit */}
      {submitted && !allSolved && (
        <div className="text-center mb-4 px-4 py-2 border-2 border-bauhaus-red/30 text-bauhaus-red text-sm font-bold">
          Some words are wrong — incorrect cells are highlighted in red. Fix them and resubmit.
        </div>
      )}

      {/* Clue lists */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Across */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-bauhaus-blue pb-2 mb-1 border-b-2 border-bauhaus-blue/20">
            Across
          </h3>
          <div className="space-y-0">
            {acrossClues.map((w) => {
              const isActive = activeWord?.index === w.index && activeWord?.direction === "across";
              const done = correctWords.has(w.index);
              return (
                <button
                  key={`a-${w.index}`}
                  onClick={() => {
                    setSelectedCell({ x: w.startX, y: w.startY });
                    setDirection("across");
                    inputRef.current?.focus();
                  }}
                  className={`w-full text-left px-3 py-2 text-[13px] leading-relaxed transition-colors flex gap-2 ${
                    isActive
                      ? "bg-bauhaus-blue/10 text-text-primary"
                      : done
                        ? "text-text-dim line-through decoration-surface-border"
                        : "text-text-secondary hover:bg-surface/50"
                  }`}
                  style={{
                    borderLeft: isActive ? "3px solid #3b82f6" : "3px solid transparent",
                  }}
                >
                  <span className={`font-mono font-bold shrink-0 w-6 text-right ${isActive ? "text-bauhaus-blue" : done ? "text-text-dim" : "text-text-secondary"}`}>
                    {w.index}
                  </span>
                  <span>{w.clue}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Down */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-bauhaus-blue pb-2 mb-1 border-b-2 border-bauhaus-blue/20">
            Down
          </h3>
          <div className="space-y-0">
            {downClues.map((w) => {
              const isActive = activeWord?.index === w.index && activeWord?.direction === "down";
              const done = correctWords.has(w.index);
              return (
                <button
                  key={`d-${w.index}`}
                  onClick={() => {
                    setSelectedCell({ x: w.startX, y: w.startY });
                    setDirection("down");
                    inputRef.current?.focus();
                  }}
                  className={`w-full text-left px-3 py-2 text-[13px] leading-relaxed transition-colors flex gap-2 ${
                    isActive
                      ? "bg-bauhaus-blue/10 text-text-primary"
                      : done
                        ? "text-text-dim line-through decoration-surface-border"
                        : "text-text-secondary hover:bg-surface/50"
                  }`}
                  style={{
                    borderLeft: isActive ? "3px solid #3b82f6" : "3px solid transparent",
                  }}
                >
                  <span className={`font-mono font-bold shrink-0 w-6 text-right ${isActive ? "text-bauhaus-blue" : done ? "text-text-dim" : "text-text-secondary"}`}>
                    {w.index}
                  </span>
                  <span>{w.clue}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
