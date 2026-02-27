"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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

  // Clue number map
  const clueNumMap = useMemo(() => {
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

  // Responsive cell size
  const [cellSize, setCellSize] = useState(32);
  useEffect(() => {
    function calc() {
      const vw = window.innerWidth;
      const maxGrid = Math.min(vw - 32, 500);
      setCellSize(Math.max(24, Math.min(36, Math.floor(maxGrid / width))));
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
      if (current?.value) {
        setCellStates((prev) => ({
          ...prev,
          [k]: { ...prev[k], value: "", wrong: false, checked: false },
        }));
      } else {
        moveCursor(-1);
        // Clear the cell we moved to
        setTimeout(() => {
          setSelectedCell((sel) => {
            if (sel) {
              const nk = `${sel.x},${sel.y}`;
              setCellStates((prev) => ({
                ...prev,
                [nk]: { ...prev[nk], value: "", wrong: false, checked: false },
              }));
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
    setCellStates((prev) => {
      const updated = {
        ...prev,
        [k]: { ...prev[k], value: letter, pencil: pencilMode, wrong: false, checked: false },
      };
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
      const allFilled = word.cells.every((c) => states[`${c.x},${c.y}`]?.value !== "");
      if (!allFilled) continue;
      const allCorrect = word.cells.every((c, i) => states[`${c.x},${c.y}`]?.value === word.answer[i]);
      if (allCorrect) {
        newCompleted.add(word.index);
        changed = true;
        onWordComplete(word.index, revealedWords.has(word.index));
      }
    }

    if (changed) {
      setCompletedWords(newCompleted);
      if (newCompleted.size === words.length) onAllComplete();
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
            updated[k] = { ...state, checked: true, wrong: state.value !== word.answer[i] };
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
        updated[k] = { value: activeWord.answer[i], pencil: false, revealed: true, checked: false, wrong: false };
      }
      setTimeout(() => checkWordCompletion(updated), 0);
      return updated;
    });
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Tab") { e.preventDefault(); handleKeyInput("Tab"); return; }
      if (e.key === "Backspace") { e.preventDefault(); handleKeyInput("Backspace"); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); setDirection("across"); moveCursor(1); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); setDirection("across"); moveCursor(-1); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setDirection("down"); moveCursor(1); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setDirection("down"); moveCursor(-1); return; }
      if (e.key.length === 1) handleKeyInput(e.key);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCell, direction, activeWord, pencilMode]);

  function isInActiveWord(x: number, y: number): boolean {
    if (!activeWord) return false;
    return activeWord.cells.some((c) => c.x === x && c.y === y);
  }

  const acrossClues = words.filter((w) => w.direction === "across").sort((a, b) => a.index - b.index);
  const downClues = words.filter((w) => w.direction === "down").sort((a, b) => a.index - b.index);

  const gridWidth = cellSize * width;

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

      {/* Active clue banner — NYT style */}
      <div
        className="mb-4 flex items-start gap-3 px-4 py-3 transition-all duration-200"
        style={{
          background: activeWord ? "rgba(37, 99, 235, 0.06)" : "rgba(255,255,255,0.02)",
          borderLeft: activeWord ? "3px solid #3b82f6" : "3px solid transparent",
        }}
      >
        {activeWord ? (
          <>
            <span
              className="shrink-0 inline-flex items-center justify-center font-bold text-white rounded-sm"
              style={{
                width: 28,
                height: 28,
                fontSize: 13,
                background: "#3b82f6",
              }}
            >
              {activeWord.index}
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.15em] font-semibold text-blue-400/70 mb-0.5">
                {activeWord.direction}
              </div>
              <div className="text-sm text-text-primary leading-snug">{activeWord.clue}</div>
            </div>
          </>
        ) : (
          <span className="text-text-dim text-sm italic">Tap a cell to begin</span>
        )}
      </div>

      {/* Grid — NYT-style black & white */}
      <div className="flex justify-center mb-4">
        <div
          ref={gridRef}
          className="relative"
          style={{
            width: gridWidth + 2,
            border: "2px solid #1a1a2e",
            background: "#1a1a2e",
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
                      style={{ width: cellSize, height: cellSize, background: "#1a1a2e" }}
                    />
                  );
                }

                const k = `${x},${y}`;
                const state = cellStates[k];
                const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                const inWord = isInActiveWord(x, y);
                const isComplete = cell.wordIndices.some((wi) => completedWords.has(wi));
                const clueNum = clueNumMap.get(k);

                // NYT color palette
                let bg: string;
                if (isSelected) {
                  bg = "#fbbf24"; // gold cursor
                } else if (inWord) {
                  bg = "#a5d8ff"; // light blue word highlight
                } else if (isComplete) {
                  bg = "#d1fae5"; // soft green completed
                } else {
                  bg = "#ffffff"; // white cell
                }

                let textColor: string;
                if (isSelected) {
                  textColor = "#1a1a2e";
                } else if (state?.revealed) {
                  textColor = "#3b82f6";
                } else if (state?.wrong) {
                  textColor = "#dc2626";
                } else if (state?.pencil) {
                  textColor = "#9ca3af";
                } else {
                  textColor = "#1a1a2e";
                }

                return (
                  <div
                    key={x}
                    className="relative cursor-pointer"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: bg,
                      borderRight: "1px solid #c4c4c4",
                      borderBottom: "1px solid #c4c4c4",
                      transition: "background 0.1s ease",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCellClick(x, y);
                    }}
                  >
                    {/* Clue number */}
                    {clueNum && (
                      <span
                        className="absolute font-sans font-bold leading-none pointer-events-none"
                        style={{
                          top: 1,
                          left: 2,
                          fontSize: Math.max(8, cellSize * 0.28),
                          color: isSelected ? "#92400e" : "#555",
                        }}
                      >
                        {clueNum}
                      </span>
                    )}
                    {/* Letter */}
                    <span
                      className="absolute inset-0 flex items-center justify-center font-serif font-bold pointer-events-none"
                      style={{
                        fontSize: Math.max(14, cellSize * 0.52),
                        color: textColor,
                        paddingTop: clueNum ? 3 : 0,
                      }}
                    >
                      {state?.value || ""}
                    </span>
                    {/* Wrong indicator */}
                    {state?.wrong && (
                      <svg
                        className="absolute pointer-events-none"
                        style={{ top: 2, right: 2, width: cellSize * 0.25, height: cellSize * 0.25 }}
                        viewBox="0 0 10 10"
                      >
                        <line x1="0" y1="10" x2="10" y2="0" stroke="#dc2626" strokeWidth="1.5" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar — clean, minimal */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          onClick={handleCheck}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border border-gray-600 text-gray-300 hover:bg-white/5 active:scale-95 transition-all"
        >
          Check
        </button>
        <button
          onClick={handleRevealWord}
          disabled={!activeWord}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Reveal
        </button>
        <button
          onClick={() => setPencilMode(!pencilMode)}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border transition-all active:scale-95 ${
            pencilMode
              ? "border-amber-400 text-amber-400 bg-amber-400/10"
              : "border-gray-600 text-gray-400 hover:bg-white/5"
          }`}
        >
          {pencilMode ? "Pencil On" : "Pencil"}
        </button>
      </div>

      {/* Clue lists — NYT two-column layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Across */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 pb-2 mb-2 border-b border-blue-400/20">
            Across
          </h3>
          <ol className="space-y-0">
            {acrossClues.map((w) => {
              const isActive = activeWord?.index === w.index && activeWord?.direction === "across";
              const done = completedWords.has(w.index);
              return (
                <li key={`a-${w.index}`}>
                  <button
                    onClick={() => {
                      setSelectedCell({ x: w.startX, y: w.startY });
                      setDirection("across");
                      inputRef.current?.focus();
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-[13px] leading-relaxed transition-colors ${
                      isActive
                        ? "bg-blue-500/10 text-text-primary"
                        : done
                          ? "text-gray-500 line-through decoration-gray-600"
                          : "text-gray-300 hover:bg-white/[0.03]"
                    }`}
                    style={isActive ? { borderLeft: "2px solid #3b82f6", paddingLeft: 8 } : { borderLeft: "2px solid transparent", paddingLeft: 8 }}
                  >
                    <span className={`font-bold tabular-nums mr-1.5 ${isActive ? "text-blue-400" : done ? "text-gray-600" : "text-gray-400"}`}>
                      {w.index}
                    </span>
                    {w.clue}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Down */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 pb-2 mb-2 border-b border-blue-400/20">
            Down
          </h3>
          <ol className="space-y-0">
            {downClues.map((w) => {
              const isActive = activeWord?.index === w.index && activeWord?.direction === "down";
              const done = completedWords.has(w.index);
              return (
                <li key={`d-${w.index}`}>
                  <button
                    onClick={() => {
                      setSelectedCell({ x: w.startX, y: w.startY });
                      setDirection("down");
                      inputRef.current?.focus();
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-[13px] leading-relaxed transition-colors ${
                      isActive
                        ? "bg-blue-500/10 text-text-primary"
                        : done
                          ? "text-gray-500 line-through decoration-gray-600"
                          : "text-gray-300 hover:bg-white/[0.03]"
                    }`}
                    style={isActive ? { borderLeft: "2px solid #3b82f6", paddingLeft: 8 } : { borderLeft: "2px solid transparent", paddingLeft: 8 }}
                  >
                    <span className={`font-bold tabular-nums mr-1.5 ${isActive ? "text-blue-400" : done ? "text-gray-600" : "text-gray-400"}`}>
                      {w.index}
                    </span>
                    {w.clue}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
