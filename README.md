# 🕊️ Columba

> *In astronomy, Columba is the constellation of the dove — a celestial symbol of peace, hope, and guidance through darkness. It was named for the dove said to have guided sailors safely home. That's what this app tries to be: a steady, gentle presence for anyone navigating their own storm.*

---

## What is Columba?

Columba is an AI-powered emotional support companion designed for anyone who might be struggling — and who might not have someone to talk to right now.

It's not therapy. It's not a hotline. It's something in between: a warm, non-judgmental presence that listens, reflects, and meets you exactly where you are — at 2am when you can't sleep, or on a Tuesday when everything just feels like too much.

Built with the Anthropic API and designed from day one with **safety, inclusion, and ethical AI practices at the center.**

---

## Why I Built This

Mental health support has a reach problem. Not everyone has access to a therapist. Not everyone feels safe talking to a parent or a friend. And for anyone navigating their identity — their gender, their sexuality, their place in the world — the stakes of not having support can be devastating.

I know this firsthand — from both sides.

I've navigated depression and anxiety for most of my life. It wasn't until four years into therapy that I started to truly understand what was happening inside me, and I often wish I'd had that understanding so much sooner. As a kid, I didn't have the resources or the network to make sense of my emotions, let alone learn how to work through them in a healthy way. Columba is, in part, the resource I wish I'd had back then.

I've also seen this pain reflected in the people I love. I've lost someone dear to me — someone who needed exactly the kind of support this app tries to offer. I've watched friends carry burdens that no one should have to carry alone — the pain of not being accepted for who they are, the exhaustion of feeling unseen, the quiet weight of navigating a world that doesn't always make space for them. I've learned that sometimes the most powerful thing you can offer someone is simply a safe place to land.

Columba exists because I believe technology, built thoughtfully and with intention, can genuinely change and save lives. Every design decision in this app — from how users are addressed to the 988 routing to the user-configurable persona — was made with a real person in mind. Someone like me. Someone like the people I love.

---

## Features

### 🎨 Create Your Companion
Users build their own companion from the ground up — gender, age, tone, and personality stats including:
- 💛 **Compassion** — how warm and emotionally expressive
- 💬 **Real Talk** — how direct and honest
- 🎨 **Creativity** — how often creative outlets are suggested
- 😄 **Humor** — how much lightness comes through

Don't want to choose? The **"Choose for me"** option generates a companion instantly.

### 🧠 Dynamic Quirks System
Columba listens. As conversations unfold, a silent background process detects personal interests, preferences, and dislikes — and builds a personalized profile over time. No forms to fill out. No upfront interrogation. Just organic, natural personalization.

Each quirk is tracked with:
- A **score** (0–5) based on enthusiasm and sentiment
- A **confidence level** (LOW → MEDIUM → HIGH) that grows with mentions
- A **category** (music, hobbies, food, etc.)

Low confidence quirks are surfaced for user confirmation before being used. Users can view and delete anything at any time — because **transparency and user control are non-negotiable.**

### 🌟 Inclusive by Design
Columba is built for everyone — no assumptions about who you are, where you come from, or what you believe. Every user is met with the same warmth and respect. Users are invited to share how they'd like to be addressed, in a way that helps them feel seen and valued. Every choice is always optional and judgment free.

### 🤫 Private by Default
What someone tells their companion — and what it learns about them — never leaves
their machine. Think therapist and patient: the conversation doesn't leave the room.

The character config and the quirks profile are written to local JSON and are
**gitignored, permanently**. They are not committed, not synced, not uploaded.
The repo carries `character.example.json` and `quirks.example.json` instead — a
fabricated test user — so anyone reading the code can understand the data shapes
without a single real person's story being published.

Your privacy isn't something you have to think about here. It's the foundation — built in from the start, not bolted on after. Your session data stays local to you.

### 🔒 Responsible AI, Always
- Crisis escalation built in — users in distress are always encouraged to reach out to a trusted adult or contact the **988 Suicide and Crisis Lifeline**
- Trauma-informed response design — users feel *seen* before being redirected
- The AI never provides harmful information, full stop
- Outputs are critically evaluated, not blindly trusted

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10+ · Flask · flask-cors |
| Frontend | React 19 · Vite 8 (Node 20+, pinned in `.nvmrc`) |
| Styling | Plain CSS + custom properties — no framework, no CSS-in-JS |
| State | React `useState` / `useEffect` — no Redux, no router |
| AI Models | Anthropic API |
| Conversation | Claude Opus-class (warm, context-aware responses) |
| Background analysis | Claude Haiku-class (silent, never seen by the user) |
| Data | Local JSON (companion + quirks), gitignored, never leaves the machine |
| Tests | pytest (backend) · Vitest (frontend) |
| Environment | python-dotenv |

### Why Two Models?
Columba uses a **dual API call architecture** — a deliberate production-grade design decision:

- **Opus-class model** handles the actual conversation. Quality matters here.
- **Haiku-class model** runs silently in the background after every message, extracting quirks from what the user said. It's faster, cheaper, and the user never sees it.

This pattern keeps costs manageable without sacrificing the quality of the core experience. It's also a real-world cost optimization pattern used in production AI systems.

---

## Architecture

```
diana-does-ai/
│
├── backend/
│   ├── app.py          ← Flask REST API (character, chat, quirks)
│   ├── companion.py    ← Claude API logic + dual-call architecture
│   ├── quirks.py       ← Quirks management (scoring, confidence, sentiment)
│   ├── tests/          ← pytest suite + its own README
│   │   └── logs/       ← a summary per run, gitignored
│   └── data/
│       ├── README.md              ← why the real data is never committed
│       ├── character.example.json ← sample config (committed)
│       ├── quirks.example.json    ← sample quirks (committed)
│       ├── character.json         ← yours — gitignored, stays local
│       └── quirks.json            ← yours — gitignored, stays local
│
├── frontend/           ← React + Vite, AIM/MSN Messenger aesthetic
│   ├── README.md            ← frontend conventions and scripts
│   ├── .nvmrc               ← Node 20
│   └── src/
│       ├── api/columba.js   ← every call to the Flask API
│       ├── components/      ← CompanionAvatar, MessageBubble, StatSlider,
│       │                       TitleBar, TypingIndicator
│       ├── copy/            ← every word the user reads, kept out of the
│       │                       components: app, setup, chat, status,
│       │                       quirks, about
│       ├── pages/           ← SetupScreen, ChatScreen
│       ├── App.jsx          ← setup-vs-chat routing
│       ├── App.css          ← design tokens + global styles
│       └── index.css        ← structural reset only
│
├── experiments/        ← Early prototypes and explorations
├── CLAUDE.md           ← project context for Claude Code
├── SPEC.md             ← frontend specification and build order
├── CHANGELOG.md        ← what changed, and why
├── .env                ← API keys (never committed)
├── .env.example        ← copy this to .env to get started
├── .gitignore
├── requirements.txt
└── requirements-dev.txt
```

**Why `copy/` is its own directory.** Every word someone reads lives there
rather than inline in a component. The wording in an app like this is not
decoration — an error message lands on a person who may already be having the
worst day of their year — so it gets reviewed as its own thing, and it can be
tested. Some of it is unit-tested: the lighter status lines, for instance, are
asserted never to appear over a heavy conversation.

---

## Running Locally

### Prerequisites
- Python 3.10+
- Node 20+ (for the frontend — the repo pins it in `frontend/.nvmrc`)
- An [Anthropic API key](https://console.anthropic.com)

### Setup

```bash
# Clone the repo
git clone https://github.com/diana3982/diana-does-ai.git
cd diana-does-ai

# Create and activate the virtual environment (it lives in backend/)
python3 -m venv backend/venv
source backend/venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Set up your API key
cp .env.example .env
# then open .env and paste your key after ANTHROPIC_API_KEY=
```

### Running

Two terminals — backend and frontend.

```bash
# Terminal 1 — backend
source backend/venv/bin/activate
cd backend
python app.py            # → http://127.0.0.1:5000
```

```bash
# Terminal 2 — frontend
cd frontend
nvm use                  # Node 20, per .nvmrc
npm install
npm run dev              # → http://localhost:5173
```

Open `http://localhost:5173` and you'll be met with companion setup 🎉

No data files to create — they're generated on first use, and they stay on your
machine.

---

## Testing

```bash
# Backend — 76 tests, offline, under a second
pip install -r requirements.txt -r requirements-dev.txt
cd backend && pytest

# Frontend — 34 tests
cd frontend && npm test
```

Neither suite calls the Anthropic API. The backend swaps in a fake client that
dispatches on model name the way the real code does — Haiku gets JSON back,
Opus gets prose — so the endpoint tests exercise the whole Flask path for
nothing.

**No test can touch your data.** The `isolated_data` fixture is *autouse*:
every test is pointed at a temp directory before it runs, so nothing in the
suite can read or write a real `character.json` or `quirks.json`. It's autouse
rather than opt-in on purpose — the protection has to cover tests written later
by someone who never read the fixture.

What the suites are actually guarding:

- **Extraction fails closed.** An API error, a garbage reply or an empty one
  all return "nothing found" rather than taking the conversation down.
- **Fenced JSON parses.** The model likes to wrap its JSON in a code fence,
  which once made every extraction silently return nothing for an entire
  build. That case is pinned now.
- **Low-confidence quirks never reach the model**, and the never-announce rule
  travels with the ones that do.
- **Lighter status lines can't appear over a heavy conversation** — and an
  unknown intensity behaves like the worst case, not the best.
- **Away is distinguishable from a failed send.** A request that never left the
  machine is marked `status: 0`, which is what the chat window branches on.
- **Every setting survives into the system prompt**, the 988 crisis line
  included.

### Live tests

```bash
cd backend && COLUMBA_LIVE=1 pytest tests/test_live.py
```

Skipped unless asked for. They cover the one thing a fake client can't: that
the prompts still come back in the shape we parse. `MAX_CALLS` is enforced by a
counting wrapper around the client rather than documented and hoped for — an
accidental loop there spends real money.

A markdown summary of each run lands in `backend/tests/logs/`, gitignored,
since it's a record of your runs rather than of the project.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/character` | Check if a character is saved |
| POST | `/character` | Save a new character config |
| DELETE | `/character` | Start over — forget the companion (quirks are kept) |
| POST | `/chat` | Send a message, get a response |
| POST | `/chat/reset` | Clear conversation history |
| GET | `/quirks` | View the user's quirks profile |
| DELETE | `/quirks` | Clear every quirk, keeping the companion |
| DELETE | `/quirks/<topic>` | Remove a specific quirk |

---

## What's Coming

- 🎨 **Frontend UI** — *setup and chat are built.* AIM/MSN Messenger aesthetic, because Y2K never died and we refuse to let it. Still to come: a *my settings* screen for editing your companion and reading (or deleting) everything it has noticed
- 💾 **Persistent sessions** — conversations that survive closing the app, with an AIM-style sign-in
- 🕊️ **A gentler error screen** — if the connection drops, Phact (the dove, named for Alpha Columbae) shows up with something to do. What she offers depends on the conversation: a journal prompt, something drawn from your own interests, or — if things were heavy — just 988 and nothing else competing for your attention
- 🌙 **Aquarius mode** — a celestial-themed companion variant (because of course)

---

## Changelog

[`CHANGELOG.md`](CHANGELOG.md) — what changed and, more usefully, why.

---

## A Note on Responsible AI

This project is my attempt to answer a question I think about a lot:

*What does it look like to build AI that actually serves people — especially people who are vulnerable, underserved, or most at risk from AI moving too fast?*

Columba is my answer, in progress. Every feature was designed with a real human in mind. Every guardrail exists because someone's safety matters more than a slicker demo.

If you're building in this space and want to talk about ethical AI design, inclusive UX, or responsible development practices — I'd love to connect.

---

## Built By

**Diana Juarez** — Senior Software Engineer  
[LinkedIn](https://linkedin.com/in/dianajuarezz) · [GitHub](https://github.com/diana3982)

*"Good code isn't enough. It has to be built right, tested thoroughly, and worth building in the first place."*

---

*🕊️ Columba — for anyone who needs a light in the dark*
