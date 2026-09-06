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
│   └── data/
│       ├── character.json
│       └── quirks.json
│
├── frontend/            ← React app (this is what we're building)
│   ├── src/
│   │   ├── components/
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
| Styling | CSS Modules or plain CSS — NO Tailwind, NO styled-components |
| AI | Anthropic API (claude-opus-4-5 for chat, claude-haiku-4-5 for quirks) |
| State | React useState/useEffect — no Redux, keep it simple |

---

## Flask API Endpoints (Backend — already exists at localhost:5000)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/character` | Check if a character config is saved |
| POST | `/character` | Save a new character config |
| POST | `/chat` | Send a message, get a reply |
| POST | `/chat/reset` | Clear conversation history |
| GET | `/quirks` | View the user's quirks profile |
| DELETE | `/quirks/<topic>` | Remove a specific quirk |

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
1. **SetupScreen** — first-time character creation (name, age, gender, tone, stat sliders). Shows if no character is saved yet.
2. **ChatScreen** — main chat interface. Message list + input. Shows once character exists.
3. **QuirksPanel** — slide-out or side panel showing what the companion has learned. Delete buttons per quirk.

### Shared Components
- `MessageBubble` — renders a single chat message (user vs companion styling)
- `StatSlider` — labeled slider for compassion/real talk/creativity/humor (1–5)
- `CompanionAvatar` — small avatar/icon for the companion in chat
- `ResetButton` — clears conversation history via POST /chat/reset

---

## Conventions

- Functional components only, no class components
- `async/await` for all API calls — no `.then()` chains
- API calls go in `src/api/` — keep them out of components
- Props should be explicit — no spreading unknown props
- Comment non-obvious logic
- Keep components focused — if it's doing too much, split it

---

## What NOT to Do

- Do NOT modify backend files (app.py, companion.py, quirks.py) unless explicitly asked
- Do NOT add Tailwind, Bootstrap, or any CSS framework
- Do NOT use Redux or any external state management
- Do NOT make the UI look like a modern chat app (Slack, iMessage aesthetic) — lean into the retro AIM/MSN vibe
- Do NOT commit .env or any API keys
- Do NOT add dependencies without asking first

---

## Responsible AI Notes (Read These)

Columba is an emotional support app for vulnerable users, including teenagers. The backend already handles:
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
# Backend (already built)
cd backend
python app.py
# Runs at http://127.0.0.1:5000

# Frontend (React/Vite)
cd frontend
npm install
npm run dev
# Runs at http://localhost:5173
```

---

*🕊️ Columba — for anyone who needs a light in the dark*
