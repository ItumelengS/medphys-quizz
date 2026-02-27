"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { CrosswordPuzzle, CrosswordWord } from "@/lib/types";

interface CrosswordGridProps {
  puzzle: CrosswordPuzzle;
  onWordComplete: (wordIndex: number, revealed: boolean) => void;
  onAllComplete: () => void;
}

interface CellState {
  value: string;
  pencil: boolean;
  revealed: boolean;
  checked: boolean;
  wrong: boolean;
}

export default function CrosswordGrid({ puzzle, onWordComplete, onAllComplete }: CrosswordGridProps) {
  const { width, height, grid, words } = puzzle;

  const [cellStates, setCellStates] = useState<Record<string, CellState>>(() => {
    const states: Record<string, CellState> = {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y][x]) {
          states[`${x},${y}`] = { value: "", pencil: false, revealed: false, checked: false, wrong: false };
        }
      }
    }
    return states;
  });

  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [pencilMode, setPencilMode] = useState(false);
  const [completedWords, setCompletedWords] = useState<Set<number>>(new Set());
  const [revealedWords, setRevealedWords] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const getActiveWord = useCallback((): CrosswordWord | null => {
    if (!selectedCell) return null;
    const cell = grid[selectedCell.y]?.[selectedCell.x];
    if (!cell) return null;

    // Find word matching current direction
    for (const wi of cell.wordIndices) {
      const word = words.find((w) => w.index === wi);
      if (word && word.direction === direction) return word;
    }
    // Fall back to any word
    for (const wi of cell.wordIndices) {
      const word = words.find((w) => w.index === wi);
      if (word) return word;
    }
    return null;
  }, [selectedCell, direction, grid, words]);

  const activeWord = getActiveWord();

  // Build clue number map (word index -> clue number at start cell)
  const clueNumbers = useCallback(() => {
    const map = new Map<string, number>();
    const sorted = [...words].sort((a, b) => a.startY - b.startY || a.startX - b.startX);
    let num = 0;
    for (const w of sorted) {
      const key = `${w.startX},${w.startY}`;
      if (!map.has(key)) {
        num++;
        map.set(key, num);
      }
    }
    return map;
  }, [words]);

  const clueNumMap = clueNumbers();

  function handleCellClick(x: number, y: number) {
    if (!grid[y][x]) return;

    if (selectedCell?.x === x && selectedCell?.y === y) {
      // Toggle direction
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
      setCellStates((prev) => ({
        ...prev,
        [k]: { ...prev[k], value: "", wrong: false, checked: false },
      }));
      // Move backward
      moveCursor(-1);
      return;
    }

    if (key === "Tab") {
      // Jump to next word
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
    setCellStates((prev) => {
      const updated = {
        ...prev,
        [k]: { ...prev[k], value: letter, pencil: pencilMode, wrong: false, checked: false },
      };
      // Check if any word just got completed
      setTimeout(() => checkWordCompletion(updated), 0);
      return updated;
    });

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

  function checkWordCompletion(states: Record<string, CellState>) {
    const newCompleted = new Set(completedWords);
    let changed = false;

    for (const word of words) {
      if (newCompleted.has(word.index)) continue;

      const allFilled = word.cells.every((c) => {
        const state = states[`${c.x},${c.y}`];
        return state && state.value !== "";
      });

      if (!allFilled) continue;

      const allCorrect = word.cells.every((c, i) => {
        const state = states[`${c.x},${c.y}`];
        return state && state.value === word.answer[i];
      });

      if (allCorrect) {
        newCompleted.add(word.index);
        changed = true;
        onWordComplete(word.index, revealedWords.has(word.index));
      }
    }

    if (changed) {
      setCompletedWords(newCompleted);
      if (newCompleted.size === words.length) {
        onAllComplete();
      }
    }
  }

  function handleCheck() {
    setCellStates((prev) => {
      const updated = { ...prev };
      for (const word of words) {
        for (let i = 0; i < word.cells.length; i++) {
          const c = word.cells[i];
          const k = `${c.x},${c.y}`;
          const state = updated[k];
          if (state && state.value !== "") {
            const isCorrect = state.value === word.answer[i];
            updated[k] = { ...state, checked: true, wrong: !isCorrect };
          }
        }
      }
      return updated;
    });
  }

  function handleRevealWord() {
    if (!activeWord) return;

    setRevealedWords((prev) => new Set(prev).add(activeWord.index));

    setCellStates((prev) => {
      const updated = { ...prev };
      for (let i = 0; i < activeWord.cells.length; i++) {
        const c = activeWord.cells[i];
        const k = `${c.x},${c.y}`;
        updated[k] = {
          value: activeWord.answer[i],
          pencil: false,
          revealed: true,
          checked: false,
          wrong: false,
        };
      }
      setTimeout(() => checkWordCompletion(updated), 0);
      return updated;
    });
  }

  // Handle keyboard events
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Tab") {
        e.preventDefault();
        handleKeyInput("Tab");
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        handleKeyInput("Backspace");
        return;
      }
      if (e.key === "ArrowRight") { setDirection("across"); moveCursor(1); return; }
      if (e.key === "ArrowLeft") { setDirection("across"); moveCursor(-1); return; }
      if (e.key === "ArrowDown") { setDirection("down"); moveCursor(1); return; }
      if (e.key === "ArrowUp") { setDirection("down"); moveCursor(-1); return; }
      if (e.key.length === 1) {
        handleKeyInput(e.key);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCell, direction, activeWord, pencilMode]);

  const cellSize = Math.min(32, Math.floor((window?.innerWidth ? Math.min(window.innerWidth - 32, 480) : 360) / width));

  function isInActiveWord(x: number, y: number): boolean {
    if (!activeWord) return false;
    return activeWord.cells.some((c) => c.x === x && c.y === y);
  }

  // Across and down clues
  const acrossClues = words.filter((w) => w.direction === "across").sort((a, b) => a.index - b.index);
  const downClues = words.filter((w) => w.direction === "down").sort((a, b) => a.index - b.index);

  return (
    <div>
      {/* Hidden input for mobile keyboard */}
      <input
        ref={inputRef}
        className="opacity-0 absolute w-0 h-0"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
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

      {/* Active clue bar */}
      <div className="mb-3 p-3 rounded-none bg-surface border-2 border-bauhaus-blue/20 min-h-[3rem] flex items-center">
        {activeWord ? (
          <div className="text-sm">
            <span className="font-bold text-bauhaus-blue mr-2">
              {activeWord.index}{activeWord.direction === "across" ? "A" : "D"}
            </span>
            <span className="text-text-primary font-light">{activeWord.clue}</span>
          </div>
        ) : (
          <span className="text-text-dim text-sm">Tap a cell to begin</span>
        )}
      </div>

      {/* Grid */}
      <div
        className="mx-auto mb-4 border-2 border-surface-border inline-block"
        style={{ width: cellSize * width + 4 }}
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
                    style={{ width: cellSize, height: cellSize }}
                    className="bg-bg"
                  />
                );
              }

              const k = `${x},${y}`;
              const state = cellStates[k];
              const isSelected = selectedCell?.x === x && selectedCell?.y === y;
              const inWord = isInActiveWord(x, y);
              const isComplete = cell.wordIndices.some((wi) => completedWords.has(wi));

              // Get clue number
              const clueNum = clueNumMap.get(k);

              let bg = "rgba(255,255,255,0.04)";
              if (isSelected) bg = "rgba(37, 99, 235, 0.3)";
              else if (inWord) bg = "rgba(37, 99, 235, 0.12)";
              else if (isComplete) bg = "rgba(22, 163, 74, 0.08)";

              let textColor = "#e8ecf4";
              if (state?.revealed) textColor = "#60a5fa";
              else if (state?.wrong) textColor = "#dc2626";
              else if (state?.pencil) textColor = "#6b7280";
              else if (isComplete) textColor = "#16a34a";

              return (
                <div
                  key={x}
                  className="relative border border-surface-border cursor-pointer select-none flex items-center justify-center"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: bg,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCellClick(x, y);
                  }}
                >
                  {clueNum && (
                    <span
                      className="absolute font-mono font-bold"
                      style={{
                        top: 1,
                        left: 2,
                        fontSize: Math.max(8, cellSize * 0.25),
                        lineHeight: 1,
                        color: "#6b7280",
                      }}
                    >
                      {clueNum}
                    </span>
                  )}
                  <span
                    className="font-mono font-bold"
                    style={{
                      fontSize: Math.max(12, cellSize * 0.5),
                      color: textColor,
                    }}
                  >
                    {state?.value || ""}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={handleCheck}
          className="px-3 py-2 rounded-none text-xs font-bold border-2 border-bauhaus-blue/30 text-bauhaus-blue hover:bg-bauhaus-blue/10 transition-all"
        >
          Check
        </button>
        <button
          onClick={handleRevealWord}
          disabled={!activeWord}
          className="px-3 py-2 rounded-none text-xs font-bold border-2 border-bauhaus-yellow/30 text-bauhaus-yellow hover:bg-bauhaus-yellow/10 transition-all disabled:opacity-30"
        >
          Reveal Word
        </button>
        <button
          onClick={() => setPencilMode(!pencilMode)}
          className={`px-3 py-2 rounded-none text-xs font-bold border-2 transition-all ${
            pencilMode
              ? "border-text-primary text-text-primary bg-surface"
              : "border-surface-border text-text-dim hover:bg-surface"
          }`}
        >
          {pencilMode ? "Pencil ON" : "Pencil"}
        </button>
      </div>

      {/* Clue lists */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <h3 className="font-bold text-sm text-bauhaus-blue uppercase tracking-wider mb-2">Across</h3>
          <div className="space-y-1.5">
            {acrossClues.map((w) => {
              const isActive = activeWord?.index === w.index && activeWord?.direction === "across";
              const done = completedWords.has(w.index);
              return (
                <button
                  key={`a-${w.index}`}
                  onClick={() => {
                    setSelectedCell({ x: w.startX, y: w.startY });
                    setDirection("across");
                    inputRef.current?.focus();
                  }}
                  className={`block w-full text-left text-xs p-2 rounded-none transition-all ${
                    isActive
                      ? "bg-bauhaus-blue/10 border-l-2 border-l-bauhaus-blue"
                      : done
                        ? "opacity-60 line-through"
                        : "hover:bg-surface"
                  }`}
                >
                  <span className="font-bold text-text-primary mr-1">{w.index}.</span>
                  <span className="text-text-secondary font-light">{w.clue}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <h3 className="font-bold text-sm text-bauhaus-blue uppercase tracking-wider mb-2">Down</h3>
          <div className="space-y-1.5">
            {downClues.map((w) => {
              const isActive = activeWord?.index === w.index && activeWord?.direction === "down";
              const done = completedWords.has(w.index);
              return (
                <button
                  key={`d-${w.index}`}
                  onClick={() => {
                    setSelectedCell({ x: w.startX, y: w.startY });
                    setDirection("down");
                    inputRef.current?.focus();
                  }}
                  className={`block w-full text-left text-xs p-2 rounded-none transition-all ${
                    isActive
                      ? "bg-bauhaus-blue/10 border-l-2 border-l-bauhaus-blue"
                      : done
                        ? "opacity-60 line-through"
                        : "hover:bg-surface"
                  }`}
                >
                  <span className="font-bold text-text-primary mr-1">{w.index}.</span>
                  <span className="text-text-secondary font-light">{w.clue}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
