# 🕊️ Columba — Frontend

The React frontend for Columba. AIM/MSN Messenger aesthetic, celestial undertone,
dark mode only.

## Requirements

- **Node 20+** (Vite 8 requires it). The repo pins it in `.nvmrc`:
  ```bash
  nvm use
  ```
- The Flask backend running at `http://127.0.0.1:5000` — see the root README.

## Running

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm test` | Vitest, once |
| `npm run test:watch` | Vitest, watching |

## Structure

```
src/
├── api/
│   ├── columba.js      ← every call to the Flask backend
│   └── __tests__/      ← including the error envelope and status 0
├── components/
│   ├── CompanionAvatar.jsx
│   ├── MessageBubble.jsx
│   ├── StatSlider.jsx
│   ├── TitleBar.jsx
│   └── TypingIndicator.jsx
├── copy/               ← every word the user reads
│   ├── app.js          ← loading, connection failure
│   ├── setup.js        ← ages, genders, tones, stat descriptors
│   ├── chat.js         ← placeholders, failures, confirmations
│   ├── status.js       ← AIM-style status messages, gated by intensity
│   ├── quirks.js       ← the "about quirks" explainer
│   ├── about.js        ← builds the companion's profile blurb
│   └── __tests__/
├── lib/
│   ├── sendQueue.js    ← holds fragments so a thought can finish
│   └── __tests__/      ← the timing rule, on fake timers
├── pages/
│   ├── SetupScreen.jsx ← first-time companion creation
│   ├── ChatScreen.jsx  ← the chat interface
│   └── __tests__/      ← the send-queue wiring, on jsdom
├── App.jsx             ← setup-vs-chat routing
├── App.css             ← design tokens + global styles
└── index.css           ← structural reset only
```

Each component keeps its styles in a `.css` file beside it; only tokens and
shared primitives live in `App.css`.

## Testing

```bash
npm test
```

Vitest. Most of these cover pure logic, which is where a bug here is silent
rather than visible: what the API layer does with a failure, whether the
lighter status copy can reach a heavy conversation, whether the companion's
profile holds together for every combination of settings, and when the send
queue decides someone has finished typing.

`ChatScreen` is the one component test, and it opts into jsdom per-file with
a `// @vitest-environment jsdom` docblock rather than switching the whole
suite over — the logic tests are faster without it. It covers the wiring the
pure tests can't reach: that a fragment shows a bubble before anything is
sent, that a burst arrives at the API as one turn, that the composer is
never disabled, and that a failed send hands back every word.

## Test mode

When the backend runs with `COLUMBA_TEST_MODE=1`, a banner sits above
everything saying so. It is the one element in this app allowed to be loud:
everything else is built to be gentle, and this exists so a test session can
never be mistaken for a real conversation — which matters most to whoever is
reading over a shoulder.

## Conventions

- Functional components only; `async/await`, never `.then()` chains.
- **No `fetch()` in components** — it goes in `src/api/columba.js`.
- **No CSS framework.** Plain CSS with the custom properties in `App.css`.
- All colors come from tokens. Never hardcode a hex outside `:root`.
- Errors are warm and inline, never raw API text — see `ERROR HANDLING UX` in
  `SPEC.md`. The technical reason lives on `err.detail`, for an expander.
- **Copy goes in `src/copy/`**, never inline in a component. It gets reviewed
  as writing, and some of it is tested as behaviour.
- **The composer never disables.** Someone in the middle of a thought must
  always be able to keep typing, including while a turn is in flight. Timing
  logic goes in `src/lib/` where it can be tested without a DOM.

See `../SPEC.md` for the full component spec and `../CLAUDE.md` for project context.
