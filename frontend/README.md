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

## Structure

```
src/
├── api/
│   └── columba.js      ← every call to the Flask backend
├── components/         ← MessageBubble, StatSlider, TitleBar, ...
├── pages/
│   ├── SetupScreen.jsx ← first-time companion creation
│   └── ChatScreen.jsx  ← the chat interface
├── App.jsx             ← setup-vs-chat routing
├── App.css             ← design tokens + global styles
└── index.css           ← structural reset only
```

## Conventions

- Functional components only; `async/await`, never `.then()` chains.
- **No `fetch()` in components** — it goes in `src/api/columba.js`.
- **No CSS framework.** Plain CSS with the custom properties in `App.css`.
- All colors come from tokens. Never hardcode a hex outside `:root`.
- Errors are warm and inline, never raw API text — see `ERROR HANDLING UX` in
  `SPEC.md`. The technical reason lives on `err.detail`, for an expander.

See `../SPEC.md` for the full component spec and `../CLAUDE.md` for project context.
