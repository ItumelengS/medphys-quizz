# MedPhys Speed Quiz — Build Specification

## OVERVIEW

Build a Progressive Web App (PWA) called **MedPhys Speed Quiz** — a timed multiple-choice quiz game for medical physics professionals preparing for board exams, CPD, or interview prep.

**Target audience:** Medical physics registrars, qualified medical physicists, and students in South Africa (HPCSA registration pathway) and internationally (ABR, ACPSEM, FRCR).

**Core loop:** Pick a topic → answer 20 timed questions → earn XP → climb the career ladder → beat your streak → check the leaderboard → come back tomorrow for the daily challenge.

**Tech stack:** React + TypeScript, Tailwind CSS, deployed as a PWA (Vercel/Netlify). Use localStorage for single-user persistence (MVP) with optional Supabase/Firebase backend for shared leaderboards later.

---

## ARCHITECTURE — MODULAR QUESTION BANK

**This is critical:** The question bank is a separate JSON file (`questions.json`) that the app imports. The app code never contains hardcoded questions. This means:

1. Anyone can add/edit/remove questions by editing the JSON file
2. New sections can be added by adding an entry to `sections[]` and a matching key in `questions{}`
3. The app dynamically renders whatever sections and questions exist in the JSON
4. A simple validation script checks that every question's `a` field exactly matches one of its `c` choices

### Question Schema
```json
{
  "id": "srt01",           // Unique ID (section prefix + number)
  "q": "Question text?",   // The question shown to the player
  "a": "Correct answer",   // MUST exactly match one string in "c"
  "c": ["A", "B", "C", "D"], // Exactly 4 choices, shuffled at runtime
  "e": "Explanation text"   // Shown after answering (especially on wrong answers)
}
```

### Section Schema
```json
{
  "id": "srt",
  "name": "SRT & Small Fields",
  "icon": "🎯",
  "color": "#f472b6",
  "description": "Stereotactic, TRS-483, Winston-Lutz"
}
```

The attached `questions.json` file contains 144 questions across 10 sections. The app should work with any number of sections and questions.

---

## GAME SYSTEMS

### 1. Speed Round (Core Mode)

- Player picks a section (or "All Topics")
- 20 random questions from that pool (or all questions if pool < 20)
- **15-second countdown timer** per question (circular ring animation)
- 4 shuffled multiple-choice options
- Immediate feedback: correct = green highlight, wrong = red + show correct answer + show explanation
- Timeout = auto-wrong, show answer + explanation
- After answering, brief pause (800ms) then auto-advance

**Scoring:**
- Base: 10 points per correct answer
- Time bonus: +1 point per 3 seconds remaining (so max +5 if answered in <1s)
- Streak multiplier: 3-6 streak = ×2, 7-9 = ×3, 10+ = ×5
- Formula: `points = (10 + timeBonus) × streakMultiplier`

**Streak system:**
- Counter increments on correct, resets on wrong/timeout
- Visual escalation: 3+ = ✨ sparkle, 5+ = 🔥 fire, 7+ = 🔥🔥 double fire, 10+ = ☄️ with screen shake
- Streak badge pulses and scales up with streak length
- Best streak tracked per session and all-time

### 2. Daily Challenge

- **Same 10 questions for all players each day**
- Seeded from date: `seed = YYYY-MM-DD` → deterministic shuffle of entire question bank → take first 10
- Available once per day (lock after completion, show "next challenge in X hours")
- Separate leaderboard (daily scores)
- Tighter timer: **12 seconds** per question
- Cannot replay until next day
- Show calendar streak: consecutive days played (like Wordle/Duolingo)
- Visual: special gold/orange theme for daily mode to distinguish from practice

### 3. Spaced Repetition (Smart Review)

This is what makes it a learning tool, not just a game.

**Per-question tracking (stored in localStorage):**
```json
{
  "questionId": "srt01",
  "timesShown": 5,
  "timesCorrect": 3,
  "lastShown": "2026-02-24T10:30:00Z",
  "nextDue": "2026-02-26T10:30:00Z",
  "easeFactor": 2.5,   // SM-2 algorithm ease
  "interval": 2,       // days until next review
  "streak": 2          // consecutive correct
}
```

**SM-2 Algorithm (simplified):**
- Correct answer: increase interval. If streak ≥ 3, interval grows faster.
  - New interval = previous interval × easeFactor
  - easeFactor increases by 0.1 (max 3.0)
- Wrong answer: reset interval to 1 day, reduce easeFactor by 0.2 (min 1.3)
- Questions never seen before have interval = 0 (due immediately)

**"Review" mode:**
- Shows questions that are "due" (nextDue ≤ now)
- Prioritises: (1) questions answered wrong recently, (2) questions never seen, (3) questions due for review
- Shows a count: "23 questions due for review"
- After the review round, show stats: "You reviewed 20 questions. 15 correct, 5 need more practice."

### 4. XP & Progression

**Career ladder:**
| Level | Title | XP Required | Icon |
|-------|-------|-------------|------|
| 1 | Intern | 0 | 🔬 |
| 2 | Registrar | 500 | 📖 |
| 3 | Medical Physicist | 1,500 | ⚛️ |
| 4 | Senior Physicist | 3,500 | 🎯 |
| 5 | Chief Physicist | 7,000 | 👨‍🔬 |
| 6 | Consultant | 12,000 | 🏅 |
| 7 | Professor | 20,000 | 🎓 |

**XP sources:**
- Speed round: total points earned
- Daily challenge: points × 1.5 bonus multiplier
- Review mode: 5 XP per correct, 2 XP per attempt
- Perfect round (20/20): +100 XP bonus
- Daily streak bonus: consecutive days × 10 XP

**Level-up animation:** Full-screen celebration with new title, icon, and confetti effect. Show "You are now a Senior Physicist! 🎯"

**Section mastery:** Track % correct per section. Show as progress rings on the home screen.
- < 50% = Red
- 50-74% = Orange  
- 75-89% = Blue
- 90%+ = Green with ✓

### 5. Leaderboard

**Personal leaderboard (MVP — localStorage):**
- Top 20 scores with: name, score/total, points, best streak, section, date
- Sorted by score, then points as tiebreaker
- Highlight personal best with ⭐ badge

**Shared leaderboard (Phase 2 — needs backend):**
- Daily challenge scores shared across all users
- All-time top scores
- Requires user authentication (simple: just a name + device ID for MVP)

### 6. Explanations

- After every wrong answer: show the explanation (`e` field) in a styled card below the choices
- After timeout: show explanation  
- After correct answer: brief "✓ Correct!" then advance (don't show explanation to keep pace — but offer a "📖 Why?" button that expands it)
- Explanations should be concise: 1-2 sentences max
- In Review mode: always show explanation regardless of correct/wrong

---

## UI/UX DESIGN

### Visual Identity

**Aesthetic:** Dark, clinical precision with neon accents. Think "medical lab meets arcade game." Not playful/childish — this is for professionals. Clean, dense, information-rich.

**Color system:**
- Background: `#060a14` (near-black navy)
- Surfaces: `rgba(255,255,255,0.025)` with `rgba(255,255,255,0.06)` borders
- Primary accent: `#00e5a0` (electric green — for correct, XP, success)
- Error: `#ef4444` (red — wrong answers, warnings)
- Section colors: each section has its own accent color (defined in JSON)
- Text: `#e8ecf4` primary, `#7a8599` secondary, `#3d4756` dim

**Typography:**
- Headings: Outfit (Google Fonts) — weight 700-900
- Body: Outfit weight 400-600
- Numbers/stats: JetBrains Mono — for that terminal/data feel
- Never use Inter, Roboto, or system defaults

**Key UI patterns:**
- Timer: circular SVG ring that depletes, color shifts green→yellow→red
- Cards: subtle glass-morphism with backdrop blur on modals
- Buttons: filled with section color at ~8% opacity, border at ~15%, hover brightens
- Progress bars: thin (4px), gradient from section color to accent
- Streak badge: floating pill with fire emoji, scales up with streak
- Points popup: flies up and fades from the question card on correct answer

### Screens

**1. Home Screen**
- App title with gradient text
- Player name (editable)
- Current level + XP bar showing progress to next level
- Section grid: each section as a card showing name, icon, question count, mastery %
- "All Topics" card at top (hero card, larger)
- Daily Challenge card (gold border, shows if completed today, countdown to next)
- Review Due badge (if questions are due): "🔄 23 due for review"
- Bottom: Leaderboard button, Stats button

**2. Section Select → Quiz Screen** (seamless transition)
- Top bar: section icon + name, question counter (3/20), streak badge, score
- Timer ring (left or top-right, prominent)
- Question card (large, centered)
- 4 choice buttons in 2×2 grid
- On answer: highlight correct/wrong → show explanation (if wrong) → auto-advance
- Points fly-up animation on correct

**3. Results Screen**
- Large score with grade emoji (🏆 ≥90%, 🌟 ≥75%, 👏 ≥60%, 💪 ≥40%, 📚 <40%)
- Stats: points, best streak, time, accuracy %
- XP earned breakdown (base + bonuses)
- "NEW PERSONAL BEST" badge if applicable
- Level-up celebration if threshold crossed
- Section mastery change (before → after)
- Buttons: Play Again (same section), Home, Share Score

**4. Daily Challenge Screen**
- Distinguished by gold/amber theme
- Same quiz flow but 10 questions, 12-second timer
- Results show: daily rank (if shared LB available), calendar streak
- "Come back tomorrow!" with countdown

**5. Review Screen**
- Shows count of due questions
- Same quiz flow but always shows explanation
- No timer pressure (or longer: 30 seconds)
- At end: summary of what was reviewed and accuracy
- "Well done! Next review in X hours"

**6. Leaderboard Screen**
- Tabs: All Time / Daily / By Section
- Each entry: rank, name, score, points, streak, date
- Top 3 get medal emojis (🥇🥈🥉)
- Personal entries highlighted

**7. Stats/Profile Screen**
- Total questions answered, accuracy %, total XP
- Section mastery rings (10 rings showing %)
- Calendar heatmap of activity (like GitHub contributions)
- Best streak, total daily streaks
- Level progress bar

### Animations & Micro-interactions

- **Page transitions:** Fade-up (opacity 0→1, translateY 12px→0, 300ms ease-out)
- **Choice buttons:** Hover lifts (translateY -1px), correct answer pulses green, wrong shakes
- **Timer ring:** Smooth SVG stroke-dashoffset transition, color interpolation
- **Streak badge:** Scales up on increment, pulses at 5+, shakes at 10+
- **Points popup:** Fly-up from question card, fade out over 600ms
- **Level up:** Full overlay with scale-in animation, confetti (CSS-only or canvas)
- **Score count-up:** Numbers animate from 0 to final value on results screen
- **Section cards:** Staggered fade-in on home screen (animation-delay per card)

---

## PWA CONFIGURATION

### manifest.json
```json
{
  "name": "MedPhys Speed Quiz",
  "short_name": "MedPhys Quiz",
  "description": "Speed quiz game for medical physics professionals",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#060a14",
  "theme_color": "#00e5a0",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker (basic offline)
- Cache the app shell, fonts, and question JSON on install
- Serve from cache when offline
- Update cache on new version (cache-first with background update)

### Mobile optimization
- Viewport meta tag with `user-scalable=no` for app-like feel
- Touch targets ≥ 44px
- No horizontal scroll
- Safe area padding for notched phones
- Haptic feedback on answer selection (if Vibration API available: 10ms on correct, [10, 50, 10] pattern on wrong)

---

## DATA PERSISTENCE (localStorage MVP)

Store everything under a single key `medphys-quiz-data`:

```typescript
interface AppState {
  version: number;
  player: {
    name: string;
    xp: number;
    createdAt: string;
  };
  stats: {
    totalAnswered: number;
    totalCorrect: number;
    gamesPlayed: number;
    bestScore: number | null;
    bestStreak: number;
    dailyStreak: number;
    lastDailyDate: string | null;
  };
  leaderboard: LeaderboardEntry[];  // top 50
  questionHistory: Record<string, QuestionRecord>;  // keyed by question ID
  dailyChallenge: {
    lastCompletedDate: string | null;
    score: number | null;
  };
}
```

---

## QUESTION VALIDATION SCRIPT

Include a script (`validate-questions.ts` or `validate-questions.js`) that:
1. Loads `questions.json`
2. Checks every question's `a` field exactly matches one of its `c` values
3. Checks all `id` fields are unique
4. Checks all `s` fields reference a valid section
5. Checks each question has exactly 4 choices
6. Reports any errors and exits with code 1 if invalid
7. Run this in CI/CD or as a pre-commit hook

```bash
node validate-questions.js
# Output: ✅ 144 questions validated. 0 errors.
```

---

## DEPLOYMENT

**Recommended:** Vercel (free tier)
1. `npx create-react-app medphys-quiz --template typescript` (or Vite)
2. Add Tailwind CSS
3. Drop in `questions.json`
4. Build components per spec above
5. `vercel deploy`

**Alternative:** Netlify, Cloudflare Pages, or GitHub Pages

**Domain:** Something like `medphysquiz.co.za` or `medphys.quiz`

---

## PHASE 2 (FUTURE — NOT IN MVP)

These are stretch goals. Do not build these in the first version:

- **Backend (Supabase):** Shared leaderboards, user accounts, cloud sync
- **Image questions:** "Identify this artefact," "What's wrong with this DVH?"
- **Custom quiz builder:** Users create and share question packs
- **Multiplayer:** Real-time head-to-head quiz battles
- **Push notifications:** "Your daily challenge is ready!" / "You have 15 questions due for review"
- **Analytics dashboard:** Which topics are weakest across all users (aggregate)
- **Payment:** Stripe integration for premium question packs
- **Admin panel:** Web UI for adding/editing questions without touching JSON

---

## FILE STRUCTURE

```
medphys-quiz/
├── public/
│   ├── manifest.json
│   ├── sw.js              (service worker)
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── data/
│   │   └── questions.json        ← THE MODULAR QUESTION BANK
│   ├── utils/
│   │   ├── spaced-repetition.ts  ← SM-2 algorithm
│   │   ├── daily-seed.ts         ← Deterministic daily shuffle
│   │   ├── scoring.ts            ← Points, XP, levels
│   │   ├── storage.ts            ← localStorage read/write
│   │   └── validate.ts           ← Question bank validator
│   ├── components/
│   │   ├── TimerRing.tsx
│   │   ├── StreakBadge.tsx
│   │   ├── ChoiceButton.tsx
│   │   ├── QuestionCard.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── LevelUpModal.tsx
│   │   ├── ExplanationCard.tsx
│   │   └── SectionMasteryRing.tsx
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── QuizScreen.tsx
│   │   ├── ResultsScreen.tsx
│   │   ├── DailyChallengeScreen.tsx
│   │   ├── ReviewScreen.tsx
│   │   ├── LeaderboardScreen.tsx
│   │   └── StatsScreen.tsx
│   ├── App.tsx
│   └── index.tsx
├── scripts/
│   └── validate-questions.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## SUMMARY

Build this app in order:
1. **Question bank loading** — parse JSON, validate, flatten for quiz use
2. **Core quiz loop** — timer, choices, scoring, streak, auto-advance
3. **Results screen** — score, XP, level check
4. **Home screen** — section grid, level display, navigation
5. **Spaced repetition** — question history tracking, SM-2 scheduling, review mode
6. **Daily challenge** — seeded shuffle, once-per-day lock, calendar streak
7. **Leaderboard** — localStorage for MVP
8. **PWA setup** — manifest, service worker, icons
9. **Polish** — animations, responsive, haptics

The question bank (`questions.json`) is attached separately. It contains 144 questions across 10 sections, each with explanations. The app must dynamically render whatever is in that file — never hardcode questions.
