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
├── pages/
│   ├── SetupScreen.jsx ← first-time companion creation
│   └── ChatScreen.jsx  ← the chat interface
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

Vitest, no jsdom — these cover the pure logic, which is where a bug here is
silent rather than visible: what the API layer does with a failure, whether
the lighter status copy can reach a heavy conversation, and whether the
companion's profile holds together for every combination of settings.

There are no component tests yet.

## Conventions

- Functional components only; `async/await`, never `.then()` chains.
- **No `fetch()` in components** — it goes in `src/api/columba.js`.
- **No CSS framework.** Plain CSS with the custom properties in `App.css`.
- All colors come from tokens. Never hardcode a hex outside `:root`.
- Errors are warm and inline, never raw API text — see `ERROR HANDLING UX` in
  `SPEC.md`. The technical reason lives on `err.detail`, for an expander.
- **Copy goes in `src/copy/`**, never inline in a component. It gets reviewed
  as writing, and some of it is tested as behaviour.

See `../SPEC.md` for the full component spec and `../CLAUDE.md` for project context.
