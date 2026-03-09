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
  score: number;
}

interface PlacedWord {
  answer: string;
  clue: string;
  questionId: string;
  direction: "across" | "down";
  cells: { x: number; y: number }[];
}

const GRID_SIZE = 25;
const TARGET_WORDS = 18;
const MAX_ATTEMPTS = 20;

export function generateCrossword(
  entries: WordEntry[]
): CrosswordPuzzle | null {
  const cleaned = entries
    .map((e) => ({
      ...e,
      answer: e.answer.toUpperCase().replace(/[^A-Z]/g, ""),
    }))
    .filter((e) => e.answer.length >= 3 && e.answer.length <= 15);

  if (cleaned.length < 6) return null;

  let bestResult: { placed: PlacedWord[]; grid: (string | null)[][] } | null =
    null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Vary the ordering strategy each attempt
    const shuffled = [...cleaned].sort(() => Math.random() - 0.5);

    if (attempt % 3 === 0) {
      // Length-first (long words create more intersection opportunities)
      shuffled.sort((a, b) => b.answer.length - a.answer.length);
    } else if (attempt % 3 === 1) {
      // Letter-frequency-first (common letters = more intersections)
      const freq = "ETAOINSHRDLCUMWFGYPBVKJXQZ";
      const letterScore = (w: string) =>
        [...w].reduce((s, c) => s + (26 - freq.indexOf(c)), 0) / w.length;
      shuffled.sort((a, b) => letterScore(b.answer) - letterScore(a.answer));
    }
    // else: random order

    const result = tryPlace(shuffled.slice(0, 35));
    if (!result || result.placed.length < 6) continue;

    const score = scoreResult(result.placed, result.grid);
    if (score > bestScore) {
      bestScore = score;
      bestResult = result;
    }

    // Early exit if we have a great result
    if (result.placed.length >= TARGET_WORDS && score > 200) break;
  }

  if (!bestResult || bestResult.placed.length < 6) return null;

  return buildPuzzle(bestResult.placed, bestResult.grid);
}

/** Score a placement result — higher = better density and connectivity */
function scoreResult(
  placed: PlacedWord[],
  grid: (string | null)[][]
): number {
  // Count total intersections (cells shared by 2+ words)
  const cellOwners = new Map<string, number>();
  for (const pw of placed) {
    for (const c of pw.cells) {
      const k = `${c.x},${c.y}`;
      cellOwners.set(k, (cellOwners.get(k) || 0) + 1);
    }
  }
  const intersections = [...cellOwners.values()].filter((v) => v >= 2).length;
  const totalCells = cellOwners.size;

  // Bounding box
  const bb = getBoundingBox(placed);
  const area = bb.w * bb.h;

  // Density: cells used / bounding box area
  const density = totalCells / Math.max(1, area);

  // Intersection ratio: what fraction of cells are intersections
  const intersectionRatio = intersections / Math.max(1, totalCells);

  return (
    placed.length * 8 +
    intersections * 12 +
    density * 100 +
    intersectionRatio * 150 -
    area * 0.3
  );
}

function getBoundingBox(placed: PlacedWord[]) {
  let minX = GRID_SIZE,
    maxX = 0,
    minY = GRID_SIZE,
    maxY = 0;
  for (const pw of placed) {
    for (const c of pw.cells) {
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y);
      maxY = Math.max(maxY, c.y);
    }
  }
  return {
    minX,
    maxX,
    minY,
    maxY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
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
  placeWord(grid, placed, first, startX, startY, "across");

  // Main placement pass
  const unplaced: WordEntry[] = [];
  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i];
    const best = findBestPlacement(grid, entry.answer, placed);
    if (best) {
      placeWord(grid, placed, entry, best.x, best.y, best.direction);
    } else {
      unplaced.push(entry);
    }
  }

  // Second pass — retry unplaced words (more placed words = more intersections possible)
  for (const entry of unplaced) {
    const best = findBestPlacement(grid, entry.answer, placed);
    if (best) {
      placeWord(grid, placed, entry, best.x, best.y, best.direction);
    }
  }

  return { placed, grid };
}

function placeWord(
  grid: (string | null)[][],
  placed: PlacedWord[],
  entry: WordEntry,
  x: number,
  y: number,
  direction: "across" | "down"
) {
  const dx = direction === "across" ? 1 : 0;
  const dy = direction === "down" ? 1 : 0;
  const cells: { x: number; y: number }[] = [];

  for (let j = 0; j < entry.answer.length; j++) {
    const cx = x + dx * j;
    const cy = y + dy * j;
    grid[cy][cx] = entry.answer[j];
    cells.push({ x: cx, y: cy });
  }

  placed.push({
    answer: entry.answer,
    clue: entry.clue,
    questionId: entry.questionId,
    direction,
    cells,
  });
}

function findBestPlacement(
  grid: (string | null)[][],
  word: string,
  placed: PlacedWord[]
): Placement | null {
  const candidates: Placement[] = [];

  // Compute centroid of existing placements for compactness scoring
  let cx = 0,
    cy = 0,
    cc = 0;
  for (const pw of placed) {
    for (const c of pw.cells) {
      cx += c.x;
      cy += c.y;
      cc++;
    }
  }
  const centroidX = cc > 0 ? cx / cc : GRID_SIZE / 2;
  const centroidY = cc > 0 ? cy / cc : GRID_SIZE / 2;

  for (const pw of placed) {
    for (let pi = 0; pi < pw.answer.length; pi++) {
      for (let wi = 0; wi < word.length; wi++) {
        if (pw.answer[pi] !== word[wi]) continue;

        // Try placing perpendicular to the existing word
        const dir: "across" | "down" =
          pw.direction === "across" ? "down" : "across";
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

          // Score: prioritize intersections, then compactness
          const midX = dir === "across" ? x + word.length / 2 : x;
          const midY = dir === "down" ? y + word.length / 2 : y;
          const distFromCentroid =
            Math.abs(midX - centroidX) + Math.abs(midY - centroidY);

          const score =
            intersections * 20 - distFromCentroid * 2 - word.length * 0.5;

          candidates.push({ word, x, y, direction: dir, intersections, score });
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  // Sort by composite score
  candidates.sort((a, b) => b.score - a.score);

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

  const endX = x + dx * (word.length - 1);
  const endY = y + dy * (word.length - 1);
  if (x < 0 || y < 0 || endX >= GRID_SIZE || endY >= GRID_SIZE) return false;

  // Cell before word start must be empty
  const beforeX = x - dx;
  const beforeY = y - dy;
  if (
    beforeX >= 0 &&
    beforeY >= 0 &&
    grid[beforeY][beforeX] !== null
  )
    return false;

  // Cell after word end must be empty
  const afterX = endX + dx;
  const afterY = endY + dy;
  if (
    afterX < GRID_SIZE &&
    afterY < GRID_SIZE &&
    grid[afterY][afterX] !== null
  )
    return false;

  let hasIntersection = false;

  for (let i = 0; i < word.length; i++) {
    const cx = x + dx * i;
    const cy = y + dy * i;
    const existing = grid[cy][cx];

    if (existing !== null) {
      if (existing !== word[i]) return false;
      hasIntersection = true;
    } else {
      // Non-intersection cells must not have parallel neighbors
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

function buildPuzzle(
  placed: PlacedWord[],
  grid: (string | null)[][]
): CrosswordPuzzle {
  const bb = getBoundingBox(placed);

  const width = bb.w;
  const height = bb.h;

  // Build output grid
  const outputGrid: (CrosswordCell | null)[][] = [];
  for (let y = 0; y < height; y++) {
    outputGrid[y] = [];
    for (let x = 0; x < width; x++) {
      const srcX = x + bb.minX;
      const srcY = y + bb.minY;
      const letter = grid[srcY]?.[srcX];
      if (letter) {
        outputGrid[y][x] = { letter, wordIndices: [], x, y };
      } else {
        outputGrid[y][x] = null;
      }
    }
  }

  // Build words with adjusted coordinates
  const words: CrosswordWord[] = placed.map((pw, idx) => {
    const cells = pw.cells.map((c) => ({
      x: c.x - bb.minX,
      y: c.y - bb.minY,
    }));
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

  // Assign clue numbers (sorted top-left first)
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

  // Tag cells with word indices
  for (const word of words) {
    for (const cell of word.cells) {
      const gridCell = outputGrid[cell.y]?.[cell.x];
      if (gridCell) {
        gridCell.wordIndices.push(word.index);
      }
    }
  }

  return { width, height, grid: outputGrid, words };
}
