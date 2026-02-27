import type { CrosswordPuzzle, CrosswordWord, CrosswordCell } from "./types";

interface WordEntry {
  answer: string;
  clue: string;
  questionId: string;
}

interface Placement {
  word: string;
  x: number;
  y: number;
  direction: "across" | "down";
  intersections: number;
}

const GRID_SIZE = 15;
const TARGET_MIN = 8;
const TARGET_MAX = 12;
const MAX_ATTEMPTS = 3;

export function generateCrossword(
  entries: WordEntry[]
): CrosswordPuzzle | null {
  // Normalize and filter
  const cleaned = entries
    .map((e) => ({
      ...e,
      answer: e.answer.toUpperCase().replace(/[^A-Z]/g, ""),
    }))
    .filter((e) => e.answer.length >= 3 && e.answer.length <= 15);

  if (cleaned.length < 6) return null;

  let bestResult: { placed: PlacedWord[]; grid: (string | null)[][] } | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const shuffled = [...cleaned].sort(() => Math.random() - 0.5);
    // Sort by length descending for greedy placement
    shuffled.sort((a, b) => b.answer.length - a.answer.length);

    const result = tryPlace(shuffled.slice(0, 20));
    if (result && result.placed.length >= TARGET_MIN) {
      bestResult = result;
      break;
    }
    if (!bestResult || (result && result.placed.length > bestResult.placed.length)) {
      bestResult = result;
    }
  }

  if (!bestResult || bestResult.placed.length < 6) return null;

  // Trim to target max
  const placed = bestResult.placed.slice(0, TARGET_MAX);
  const grid = bestResult.grid;

  // Find bounding box
  let minX = GRID_SIZE, maxX = 0, minY = GRID_SIZE, maxY = 0;
  for (const pw of placed) {
    for (const cell of pw.cells) {
      minX = Math.min(minX, cell.x);
      maxX = Math.max(maxX, cell.x);
      minY = Math.min(minY, cell.y);
      maxY = Math.max(maxY, cell.y);
    }
  }

  // Add 1-cell padding
  minX = Math.max(0, minX - 1);
  minY = Math.max(0, minY - 1);
  maxX = Math.min(GRID_SIZE - 1, maxX + 1);
  maxY = Math.min(GRID_SIZE - 1, maxY + 1);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // Build output grid
  const outputGrid: (CrosswordCell | null)[][] = [];
  for (let y = 0; y < height; y++) {
    outputGrid[y] = [];
    for (let x = 0; x < width; x++) {
      const srcX = x + minX;
      const srcY = y + minY;
      const letter = grid[srcY]?.[srcX];
      if (letter) {
        outputGrid[y][x] = {
          letter,
          wordIndices: [],
          x,
          y,
        };
      } else {
        outputGrid[y][x] = null;
      }
    }
  }

  // Build words with adjusted coordinates
  const words: CrosswordWord[] = placed.map((pw, idx) => {
    const cells = pw.cells.map((c) => ({
      x: c.x - minX,
      y: c.y - minY,
    }));

    // Tag cells with word indices
    for (const cell of cells) {
      const gridCell = outputGrid[cell.y]?.[cell.x];
      if (gridCell) {
        gridCell.wordIndices.push(idx);
      }
    }

    return {
      index: idx,
      clue: pw.clue,
      answer: pw.answer,
      questionId: pw.questionId,
      direction: pw.direction,
      startX: cells[0].x,
      startY: cells[0].y,
      cells,
    };
  });

  // Assign clue numbers (sorted by position: top-left first)
  const numberMap = new Map<string, number>();
  let clueNum = 0;
  const sortedStarts = words
    .map((w, i) => ({ i, y: w.startY, x: w.startX }))
    .sort((a, b) => a.y - b.y || a.x - b.x);

  for (const s of sortedStarts) {
    const key = `${s.x},${s.y}`;
    if (!numberMap.has(key)) {
      clueNum++;
      numberMap.set(key, clueNum);
    }
    words[s.i].index = numberMap.get(key)!;
  }

  return { width, height, grid: outputGrid, words };
}

interface PlacedWord {
  answer: string;
  clue: string;
  questionId: string;
  direction: "across" | "down";
  cells: { x: number; y: number }[];
}

function tryPlace(entries: WordEntry[]) {
  const grid: (string | null)[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(null)
  );
  const placed: PlacedWord[] = [];

  if (entries.length === 0) return null;

  // Place first word horizontally at center
  const first = entries[0];
  const startX = Math.floor((GRID_SIZE - first.answer.length) / 2);
  const startY = Math.floor(GRID_SIZE / 2);

  const firstCells: { x: number; y: number }[] = [];
  for (let i = 0; i < first.answer.length; i++) {
    grid[startY][startX + i] = first.answer[i];
    firstCells.push({ x: startX + i, y: startY });
  }
  placed.push({
    answer: first.answer,
    clue: first.clue,
    questionId: first.questionId,
    direction: "across",
    cells: firstCells,
  });

  // Try to place remaining words
  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i];
    const best = findBestPlacement(grid, entry.answer, placed);
    if (!best) continue;

    const cells: { x: number; y: number }[] = [];
    for (let j = 0; j < entry.answer.length; j++) {
      const cx = best.direction === "across" ? best.x + j : best.x;
      const cy = best.direction === "down" ? best.y + j : best.y;
      grid[cy][cx] = entry.answer[j];
      cells.push({ x: cx, y: cy });
    }
    placed.push({
      answer: entry.answer,
      clue: entry.clue,
      questionId: entry.questionId,
      direction: best.direction,
      cells,
    });
  }

  return { placed, grid };
}

function findBestPlacement(
  grid: (string | null)[][],
  word: string,
  placed: PlacedWord[]
): Placement | null {
  const candidates: Placement[] = [];

  for (const pw of placed) {
    for (let pi = 0; pi < pw.answer.length; pi++) {
      for (let wi = 0; wi < word.length; wi++) {
        if (pw.answer[pi] !== word[wi]) continue;

        // Try placing perpendicular to the existing word
        const dir: "across" | "down" = pw.direction === "across" ? "down" : "across";
        const cell = pw.cells[pi];

        let x: number, y: number;
        if (dir === "across") {
          x = cell.x - wi;
          y = cell.y;
        } else {
          x = cell.x;
          y = cell.y - wi;
        }

        if (canPlace(grid, word, x, y, dir)) {
          const intersections = countIntersections(grid, word, x, y, dir);
          candidates.push({ word, x, y, direction: dir, intersections });
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  // Sort: more intersections better, closer to center better
  candidates.sort((a, b) => {
    if (b.intersections !== a.intersections) return b.intersections - a.intersections;
    const centerX = GRID_SIZE / 2;
    const centerY = GRID_SIZE / 2;
    const distA = Math.abs(a.x - centerX) + Math.abs(a.y - centerY);
    const distB = Math.abs(b.x - centerX) + Math.abs(b.y - centerY);
    return distA - distB;
  });

  return candidates[0];
}

function canPlace(
  grid: (string | null)[][],
  word: string,
  x: number,
  y: number,
  direction: "across" | "down"
): boolean {
  const dx = direction === "across" ? 1 : 0;
  const dy = direction === "down" ? 1 : 0;

  // Check bounds
  const endX = x + dx * (word.length - 1);
  const endY = y + dy * (word.length - 1);
  if (x < 0 || y < 0 || endX >= GRID_SIZE || endY >= GRID_SIZE) return false;

  // Check cell before word start is empty
  const beforeX = x - dx;
  const beforeY = y - dy;
  if (beforeX >= 0 && beforeY >= 0 && grid[beforeY][beforeX] !== null) return false;

  // Check cell after word end is empty
  const afterX = endX + dx;
  const afterY = endY + dy;
  if (afterX < GRID_SIZE && afterY < GRID_SIZE && grid[afterY][afterX] !== null) return false;

  let hasIntersection = false;

  for (let i = 0; i < word.length; i++) {
    const cx = x + dx * i;
    const cy = y + dy * i;
    const existing = grid[cy][cx];

    if (existing !== null) {
      if (existing !== word[i]) return false;
      hasIntersection = true;
    } else {
      // Check parallel neighbors (perpendicular to direction)
      if (direction === "across") {
        if (cy > 0 && grid[cy - 1][cx] !== null) return false;
        if (cy < GRID_SIZE - 1 && grid[cy + 1][cx] !== null) return false;
      } else {
        if (cx > 0 && grid[cy][cx - 1] !== null) return false;
        if (cx < GRID_SIZE - 1 && grid[cy][cx + 1] !== null) return false;
      }
    }
  }

  return hasIntersection;
}

function countIntersections(
  grid: (string | null)[][],
  word: string,
  x: number,
  y: number,
  direction: "across" | "down"
): number {
  const dx = direction === "across" ? 1 : 0;
  const dy = direction === "down" ? 1 : 0;
  let count = 0;
  for (let i = 0; i < word.length; i++) {
    const cx = x + dx * i;
    const cy = y + dy * i;
    if (grid[cy][cx] === word[i]) count++;
  }
  return count;
}
