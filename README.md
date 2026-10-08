# Clera — candidate onboarding & track

A production-grade implementation of the **Clera · Redesign** Figma flow: onboarding (A1–A2), Home (A4, 01), Matches (B1), the five states of a role (R1–R5) and connecting an AI assistant (C1–C2).

Reference exports of every frame live in [`design/`](design).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + interaction tests (Vitest, Testing Library)
npm run typecheck
npm run lint
npm run build
```

## Walking the flow

| Frame | Route | How to get there |
| --- | --- | --- |
| A1 · Add your resume | `/onboarding/resume` | First visit |
| A2 · Confirm essentials | `/onboarding/essentials` | Upload a PDF, or "Enter details manually" |
| A4 · Home · looking | `/` | Press **Start matching** |
| 01 · Home · matches ready | `/` | Matches arrive ~12s later (or **Settings → Deliver first matches now**) |
| B1 · Matches | `/matches` | |
| R1 · Role · match | `/roles/:id` | **Details** / **Request intro** on a match |
| R2 · Request sent | `/roles/:id` | **Send introduction** |
| R3 · Invited | `/roles/:id` | **Settings → Company replies** |
| R4 · Booked | `/roles/:id` | Pick a time → **Confirm interview** |
| R5 · Not moving forward | `/roles/:id` | **Settings → Company closes role** |
| C1 / C2 · Connect your AI | `/settings/ai` | |

**Settings → Prototype controls** can also load the sample account from frame 01, reset to a new candidate, and switch the mock network to *slow* or *flaky* so you can see the loading and error states.

## Stack

- **Vite + React 19 + TypeScript**, React Router 7
- **CSS Modules** on top of design tokens in `src/styles/tokens.css`, which mirror the Figma variables and text styles one to one
- **GSAP 3** (`@gsap/react`, `SplitText`) for micro-interactions
- **lucide-react** icons. The Figma Icon component is specified as "Lucide, 2px stroke".
- **Manrope** is self-hosted via `@fontsource`, so there are no external font requests

## Interaction design

Every animation goes through `src/lib/motion.ts` and turns itself off under `prefers-reduced-motion`.

- **Buttons and chips** (`usePress`): squash on press and spring back, triggered by both pointer and keyboard.
- **Cards** (`useHoverLift`): 1–2px lift on hover with a cursor-following spotlight, in the spirit of React Bits' *SpotlightCard*. Fine pointers only.
- **Navigation:**
  - The sidebar's active background slides between items, and each icon has its own hover gesture.
  - The filter pills slide their dark active state between options.
- **Page entrances** (`useReveal`): sections rise in with a stagger, and key headings reveal word by word with SplitText.
- **Status:**
  - The *Needs you* status pill breathes.
  - The stage tracker draws its connectors in.
  - Fit percentages count up.
  - The "Why 86 percent" popover scales in from its anchor.
- **Feedback:**
  - Dismissed matches collapse out, with an undo toast.
  - Selection checks pop in.
  - Clera's "Rewrite" types out the new draft.
  - The interview selection card slides in once you pick a time.

## Edge cases handled

- **Resume upload:**
  - Accepts PDF only. Each of these gets its own message: wrong type, empty file, larger than 10 MB, or a renamed file without a `%PDF-` signature.
  - Drag and drop with a drag-depth counter, so the zone doesn't flicker over child elements.
  - Multiple files: it uses the first and tells you.
  - The upload can be cancelled (it uses `AbortSignal`). Dropping a file outside the zone doesn't navigate the browser away.
- **Essentials:**
  - Validation runs on blur and on submit. Submitting moves focus to the first invalid field.
  - Pay accepts `145k`, `$145,000` and similar.
  - Autosaves 600ms after the last edit, shows *Saving… / All changes saved / Could not save · Retry*, and warns before closing the tab mid-save.
  - "From your resume" tags disappear once you edit a field.
  - Deep links into a step you haven't reached redirect you back.
- **Introductions:**
  - Required answers have length limits.
  - Drafts survive navigation and reloads.
  - Sends can't be doubled.
  - Withdraw and cancel both ask for confirmation.
  - Time slots render in a time zone you can change. Slots in the past are disabled, and if every slot has passed you get a recovery state. DST-safe time-zone maths lives in `src/lib/time.ts`.
  - Booked interviews download a real `.ics` file.
- **State:**
  - Persisted to `localStorage` with a schema version. Corrupt or foreign data falls back to a fresh state, references to removed roles are dropped, and if storage is unavailable (private mode) the app runs in memory.
  - Writes are flushed on `pagehide`. Tabs stay in sync through the `storage` event.
- **Assistant:**
  - Enter sends and Shift+Enter adds a newline, with IME composition handled.
  - Empty or whitespace-only messages are blocked, and there's a 2,000-character cap with a counter near the limit.
  - A failed send shows a retry. Each page keeps its own conversation, and an in-flight reply is cancelled when you navigate away.
- **Accessibility:**
  - A skip link and visible focus rings.
  - Radio and checkbox semantics with arrow-key navigation on chip groups.
  - `aria-live` for save status, toasts and chat.
  - Sheets trap focus, close on Escape, and restore focus when they close.
- **Responsive:**
  - At 1280px and up: the three-column layout, as designed.
  - At 1024px and up: the assistant becomes a slide-over.
  - Below 1024px: a top bar with a menu drawer.
  - On phones: layouts stack, and there's no horizontal scroll at 390px.

## Where the build deviates from the Figma file, and why

- **The black outline on "hero" cards** (Next step, Your selection, Start with one decision) uses `sage-200`. That's the value the Figma variables give. The exported PNGs render it as `#000`, which matches no token, and the same render shows black stage dots where the variable didn't resolve.
- **Upcoming stage-tracker dots** are hollow grey rings rather than solid black, for the same reason.
- **Text that the 1440px frames clip** (match card meta, the "Posted" fact, the privacy note) wraps instead of being cut off.
- **Interview times** aren't pre-selected. You pick one, then review it in the selection card.

## Not wired up yet

`src/api/client.ts` is the single boundary to the backend. Every function there is async, can fail and accepts an `AbortSignal`, but returns mock data. Replace those bodies with real calls. The same goes for:

- **Assistant replies** (`src/assistant/replies.ts`): answers are generated locally from your state.
- **"Tell Clera in chat"**: for now it routes to manual entry.
- **Manual-setup MCP URL**: comes from `VITE_CLERA_MCP_URL`. The default value is a placeholder.
- **AI marks**: these are simplified monochrome glyphs, not the official logo files.
