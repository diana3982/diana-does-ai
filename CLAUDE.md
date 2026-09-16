# 🕊️ Columba — CLAUDE.md

This is the project context file for Claude Code. Read this at the start of every session.

---

## What Is This Project?

Columba is an AI-powered emotional support companion app built for anyone who might be struggling and doesn't have someone to talk to. It uses the Anthropic API (dual-model architecture) with a Flask backend. The frontend is being built in React.

This is a portfolio project built by Diana Juarez — a Senior Software Engineer pivoting into AI/ML roles. Code quality, thoughtful architecture, and responsible AI practices matter here. Every decision should reflect that.

---

## Repo Structure

```
diana-does-ai/
│
├── backend/
│   ├── app.py           ← Flask REST API
│   ├── companion.py     ← Claude API logic + dual-model architecture
│   ├── quirks.py        ← Quirks management (scoring, confidence, sentiment)
│   ├── sensitivities.py ← things to steer around — withhold-only, never suggested
│   ├── user_profile.py  ← what the user said about themselves — use, never raise
│   ├── settings.py      ← user-controlled settings
│   ├── storage.py       ← every file this app writes, in one list
│   ├── usage.py         ← token counts per API call — counts only, never content
│   ├── tests/           ← pytest suite (see backend/tests/README.md)
│   │   └── logs/        ← one summary per run, gitignored
│   └── data/            ← gitignored; only *.example.json is committed
│       ├── character.json
│       └── quirks.json
│
├── frontend/            ← React app
│   ├── README.md        ← frontend conventions and scripts
│   ├── src/
│   │   ├── components/
│   │   ├── copy/        ← every word the user reads (see below)
│   │   ├── lib/         ← client-side logic: send and reply queues, text size
│   │   ├── pages/
│   │   ├── api/         ← Flask API calls live here
│   │   └── App.jsx
│   ├── public/
│   └── package.json
│
├── .env                 ← Never commit this
└── requirements.txt
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python + Flask (already built, do not modify unless asked) |
| Frontend | React (Vite) |
| Styling | Plain CSS + custom properties — NO Tailwind, NO CSS Modules, NO styled-components |
| AI | Anthropic API (claude-opus-5 for chat, claude-haiku-4-5 for the background pass) — see `docs/cost-model.md` |
| State | React useState/useEffect — no Redux, no router, keep it simple |
| Tests | pytest (backend) · Vitest (frontend) |

---

## Flask API Endpoints (Backend — already exists at localhost:5000)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/character` | Check if a character config is saved |
| POST | `/character` | Save a new character config |
| DELETE | `/character` | Start over — forget the companion (quirks are kept) |
| POST | `/chat` | Send a message, get a reply |
| POST | `/chat/reset` | Clear conversation history |
| GET | `/quirks` | View the user's quirks profile |
| DELETE | `/quirks` | Clear every quirk, keeping the companion |
| DELETE | `/quirks/<topic>` | Remove a specific quirk |
| GET | `/sensitivities` | What the companion steers around |
| DELETE | `/sensitivities` | Forget all of them |
| DELETE | `/sensitivities/<topic>` | Forget one |
| GET | `/profile` | What the user has told the companion about themselves |
| DELETE | `/profile` | Forget it |
| GET | `/settings` | Read user settings |
| PATCH | `/settings` | Update user settings |

All API calls go to `http://127.0.0.1:5000`. CORS is already enabled on the backend.

---

## Design System

### Brand Colors
```css
--color-bg:        #1a1a2e;   /* deep navy — primary background */
--color-accent:    #CA7DF9;   /* lavender purple — primary accent */
--color-surface:   #16213e;   /* slightly lighter navy — cards/panels */
--color-border:    #2a2a4a;   /* subtle border color */
--color-text:      #e8e8f0;   /* off-white — primary text */
--color-text-muted:#9090b0;   /* muted text — timestamps, labels */
--color-sent:      #CA7DF9;   /* user message bubble */
--color-received:  #16213e;   /* companion message bubble */
--color-danger:    #ff6b6b;   /* errors, delete actions */
```

### Aesthetic Direction
- **AIM/MSN Messenger inspired** — retro Y2K chat UI. Think buddy list panels, chat windows, away message energy. NOT a modern sleek UI.
- Dark mode only.
- Fonts: monospace or pixel-adjacent for UI chrome; readable sans-serif for chat messages.
- Subtle retro details encouraged: thin borders, panel-style layouts, small icons, status indicators.
- **Celestial undertone** — stars, doves, soft glow effects where tasteful. This is Columba (the constellation), not a generic chat app.

### Tone
Warm, gentle, non-clinical. The UI should feel like a safe space — never sterile, never corporate.

---

## React Component Map

### Pages / Screens
1. **SetupScreen** ✅ — first-time character creation (name, age, gender, tone, stat sliders). Shows if no character is saved yet.
2. **ChatScreen** ✅ — main chat interface. Message list + input. Shows once character exists.
3. **My settings** — *not built yet.* Everything about the user in one place: edit your companion (setup form, prefilled), read and delete what it has noticed, and start over with checkboxes rather than an "are you sure". Not called a *profile* — a profile implies something other people see, and nothing here is.

### Shared Components
- `MessageBubble` ✅ — renders a single chat message (user vs companion styling)
- `StatSlider` ✅ — labeled slider for compassion/real talk/creativity/humor (1–5)
- `CompanionAvatar` ✅ — small avatar/icon for the companion in chat
- `TitleBar` ✅ — the Y2K window chrome
- `TypingIndicator` ✅ — three dots plus the companion's typing status
- `SettingsMenu` ✅ — the title bar dropdown holding the display settings
  (text size, bold letters). In the title bar rather than behind a settings
  screen because it renders on the setup screen too — a preference kept
  behind a page you cannot comfortably read is no preference at all

### `src/copy/`
Every word the user reads lives here, never inline in a component. The wording
in this app is not decoration — an error message lands on someone who may
already be having the worst day of their year — so it is reviewed as writing
and some of it is tested as behaviour.

---

## Conventions

- Functional components only, no class components
- `async/await` for all API calls — no `.then()` chains
- API calls go in `src/api/` — keep them out of components
- Props should be explicit — no spreading unknown props
- Comment non-obvious logic
- Keep components focused — if it's doing too much, split it
- User-facing strings go in `src/copy/`, never inline
- **Never write the same fact in two places.** A label lives in `src/copy/`
  and is read from there by the component *and* by its tests; a number the
  CSS needs is a token, not a constant CSS cannot import. Renaming one menu
  label once broke eight tests that had spelled it out — the tests were
  wrong, not the rename
- **Loosely coupled, highly cohesive.** A new thing of an existing kind
  should be a list entry, not a branch: its own file says what it *is*, the
  shared piece handles the rest, and the component renders them all the same
  way. Not inheritance — a shared function and a plain list
- **Run `pytest` before every commit** and report the result — the
  pre-commit hook enforces this too, but report the result either way
- **Never use a real quirk, sensitivity or companion name as example or
  test data.** Invent them. `scripts/hooks/pre-commit` enforces this —
  install with `git config core.hooksPath scripts/hooks`
- **Never identify a UAT participant.** Refer to them as **UAT user N**,
  numbered by the UAT session (`UAT 1` → `UAT user 1`). Never a name, never
  a relationship to anyone on the project, never gender or pronouns. This
  applies everywhere, not just in code: commit messages, PR titles and
  descriptions, PR comments, the CHANGELOG, code comments and test fixtures.

  This is the same rule the app itself runs on, pointed at the people who
  help build it. Columba's promise is that someone's story is theirs and the
  companion's alone; a project that names a tester in its own commit log has
  broken that promise where it is permanent and public.

  **Use no pronouns at all.** Repeat *UAT user N* rather than reach for one,
  the way `user_profile.py` handles someone whose pronouns are `none` — the
  app's own rule, turned on the people who help test it. In a repo where the
  author is named, *"she wanted bigger text"* narrows to one person about as
  fast as a name does, and *UAT user 1 wanted bigger text* reads identically.

  **A personal detail goes in only when the fix causally depends on it**, and
  the causal link is written down beside it. Age range earned its place in
  the text-size work because age-related vision change is *why* 15px failed —
  it is the reason the fix is size rather than contrast. The test is not
  "does this make the story better", it is **"is the change incoherent
  without it"**. Consent is asked per session before even a qualifying detail
  is recorded, never assumed from a previous one.

  A name and a relationship never pass that test. No fix has ever depended on
  them: they identify a person and explain nothing.

  **Commit messages and PR titles cannot be edited after the fact**, and a
  force-push does not remove the original from GitHub — it stays reachable by
  SHA. So this gets checked *before* the commit, not after.

---

## What NOT to Do

- Do NOT modify backend files (app.py, companion.py, quirks.py, sensitivities.py, settings.py, storage.py, usage.py, user_profile.py) unless explicitly asked
- Do NOT add Tailwind, Bootstrap, or any CSS framework
- Do NOT use Redux or any external state management
- Do NOT make the UI look like a modern chat app (Slack, iMessage aesthetic) — lean into the retro AIM/MSN vibe
- Do NOT commit .env or any API keys
- Do NOT add dependencies without asking first

---

## Responsible AI Notes (Read These)

Columba is an emotional support app for anyone who might be struggling — any age, any background. The backend already handles:
- Crisis escalation to 988
- Trauma-informed response design
- Pronoun inclusivity

The frontend must support this:
- Never display loading states in a way that feels cold or abrupt
- Error messages should be warm, not technical ("Something went wrong, try again in a moment 💙" not "Error 500")
- Never expose raw API errors to the user

---

## Running the Project

```bash
# Backend
cd backend
python app.py
# Runs at http://127.0.0.1:5000

# Frontend (React/Vite) — needs Node 20+, pinned in .nvmrc
cd frontend
nvm use
npm install
npm run dev
# Runs at http://localhost:5173
```

## Testing

```bash
cd backend && pytest      # offline, free, under a second
cd frontend && npm test   # Vitest
```

Both suites run without touching the Anthropic API or any real data file —
`isolated_data` in `conftest.py` is autouse, so every test writes to a temp
directory. It reads the store list from `backend/storage.py`, the same one
test mode redirects — one list, so the two cannot drift apart. Live tests are opt-in (`COLUMBA_LIVE=1`) and capped by a counter
around the client.

**Test mode** is env-gated and writes to `backend/data/test/`, so exercising
the app can never touch a real companion:

```bash
COLUMBA_TEST_MODE=1 COLUMBA_FORCE_INTENSITY=heavy python app.py
```

Forcing a tier is kept separate from telling the model anything — saying "this
is a test" would change how it replies and invalidate the read. Crisis
handling is identical in test mode.

## Code Review Workflow
- All new features and significant changes must be developed on a separate branch, never directly on main
- Branch naming convention: feature/description-here or fix/description-here
- Every PR must include a description of what changed and why — where *why* names the specific thing that prompted it: a **bug** (what broke, and how it surfaced), a **deliberate design choice** (what else was considered, and what ruled it out), or an **outcome being pursued** (what should be true afterwards that isn't now). "Improves X" and "cleans up Y" are not whys — they are restatements of what
- Any architectural decision must include a brief note on the tradeoff considered before writing any code
- Any PR over ~10 files, or touching how user data is stored or deleted, gets a second review pass before merging
- Stop mid-task and confirm the approach if a change is heading past ~10 files, needs a new dependency, or needs a different design than the one agreed — do not finish it and ask afterwards
- Never merge to main without Diana's explicit approval
- Every PR comment Claude writes ends with an attribution line. `gh` posts with Diana's token, so GitHub records her as the author of both sides — without a signature the review thread reads as one person talking to themselves

Attribution matters here beyond tidiness. The point of reviewing in public is
that someone can later see a decision being questioned and answered — and that
only works if it is clear who did which. Commits already carry a
`Co-Authored-By` trailer; PR comments have no equivalent, so they are signed
by hand.

The standard for *why* is the one the CHANGELOG already holds: a decision is
only legible alongside the thing that forced it. Months later the question is
never "what does this code do" — that is readable — it is "what did they know
that made this the right call", and only the prompting fact answers it.

Blast radius, not layer count, is what predicts risk. A two-line change
spanning backend and frontend is safer than a 300-line refactor inside one of
them. The two real bugs this project has had — the test suite writing to live
data files, and test mode writing to the live settings file — were both
single-layer and both small, and both touched how user data is stored.

The stop-and-check rule is there because the expensive failure is not a wrong
approach, it is a wrong approach finished. A 20-file change handed over
complete is harder to redirect than a question asked at file three, and it
puts the reviewer in the position of either accepting it or throwing away
work.

---

*🕊️ Columba — for anyone who needs a light in the dark*
