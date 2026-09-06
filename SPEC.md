# 🕊️ Columba — Frontend Specification

> This document defines the React frontend for Columba. Claude Code should treat this as the source of truth for what to build. When in doubt, refer here first.

---

## Aesthetic Direction

### The Vibe: AIM/MSN Messenger meets the night sky
Columba's UI is intentionally retro — think AIM buddy lists, MSN Messenger chat windows, away message culture. Y2K never died. This is NOT a modern, minimal, clean SaaS app. It has panels, borders, status indicators, and personality.

Layered on top of that retro foundation is a **celestial undertone**: Columba is a constellation. The color palette is deep space. Details can whisper stars, doves, and soft cosmic glow — never loud, always tasteful.

The result: a chat app that feels like something you'd have found on your parents' old Dell at 2am — but make it *cosmic*.

### Typography
- **UI chrome** (labels, buttons, panel headers): `'Courier New', Courier, monospace` — leans into the retro terminal feel
- **Chat messages**: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif` — readable, warm, human
- **App title / logo**: monospace, slightly larger, with a soft lavender glow effect

### Color Tokens
```css
--color-bg:           #1a1a2e;   /* deep navy — primary background */
--color-surface:      #16213e;   /* slightly lighter navy — panels, cards */
--color-surface-alt:  #0f3460;   /* deeper blue — active states, hover */
--color-border:       #2a2a4a;   /* subtle panel borders */
--color-accent:       #CA7DF9;   /* lavender — primary accent, highlights */
--color-accent-dim:   #9b5cc4;   /* dimmer lavender — secondary accent */
--color-text:         #e8e8f0;   /* off-white — primary text */
--color-text-muted:   #9090b0;   /* muted — timestamps, labels, hints */
--color-sent:         #2d1f4e;   /* user message bubble background */
--color-sent-border:  #CA7DF9;   /* user message bubble border */
--color-received:     #16213e;   /* companion message bubble background */
--color-online:       #7fff9a;   /* online/active status dot */
--color-danger:       #ff6b6b;   /* errors, delete */
```

### Retro Details to Include
- Thin `1px solid var(--color-border)` borders on all panels — like old OS windows
- Panel title bars with a slightly different background and small label text
- Status indicators (green dot = online/active)
- Scrollbars styled to match the palette (where CSS allows)
- Message timestamps in muted monospace, right-aligned
- Subtle box shadows using the accent color (`box-shadow: 0 0 8px rgba(202, 125, 249, 0.15)`)

### What to Avoid
- Rounded pill buttons (use slight radius only — `border-radius: 4px` max on most elements)
- Drop shadows with warm grey (`rgba(0,0,0,0.1)`) — use accent-tinted shadows instead
- Any "glassmorphism" or frosted glass effects
- Modern gradient hero sections
- Anything that looks like Slack, iMessage, or a SaaS dashboard

---

## App Structure

```
src/
├── api/
│   └── columba.js         ← All Flask API calls live here
├── components/
│   ├── MessageBubble.jsx
│   ├── StatSlider.jsx
│   ├── CompanionAvatar.jsx
│   ├── QuirksPanel.jsx
│   └── TitleBar.jsx       ← Retro panel title bar component
├── pages/
│   ├── SetupScreen.jsx
│   └── ChatScreen.jsx
├── App.jsx                ← Routing logic (setup vs chat)
├── App.css                ← Global styles + CSS custom properties
└── main.jsx
```

---

## Screen 1: SetupScreen

### When it Shows
App loads → calls `GET /character` → if `exists: false`, show SetupScreen.

### Layout
Two-panel layout styled like an MSN Messenger sign-in / profile setup window:
- Left panel: Columba branding — the dove emoji 🕊️, app name, and a one-liner tagline ("a steady presence for anyone navigating their own storm")
- Right panel: the setup form

The whole thing is centered on the page, like a floating OS window. Fixed width (~700px), auto height.

### Form Fields

**Companion Name**
- Text input
- Placeholder: `"Give your companion a name..."`
- Required

**Age**
- Select of age *ranges*: `15-19 | 20-25 | 26-30 | 31-40 | 41-50 | 51+`
- Label: `"How old is your companion?"`
- **Nothing is pre-selected.** A default would quietly speak for someone, and
  no age here is more "normal" than another. Required before submit
- The range tells the companion how to carry itself and how to speak; an
  exact number never did

**Gender**
- Radio buttons or small pill toggles: `Girl | Boy | Nonbinary | Doesn't matter`
- Render as clickable options, not a dropdown

**Tone**
- Small select or pill options: `warm | chill | uplifting | playful | gentle`

**Personality Stats** (rendered via `StatSlider` component)
- Compassion (1–5)
- Real Talk (1–5)
- Creativity (1–5)
- Humor (1–5)

Each slider has:
- A label with an emoji (💛 Compassion, 💬 Real Talk, 🎨 Creativity, 😄 Humor)
- The current value displayed as a number
- A short descriptor that updates based on value (e.g., Compassion 5 = "deeply empathetic", 1 = "calm and measured")

**"Choose for me" Button**
- Fills every field with valid random values — does NOT submit. The user
  reviews the choices and confirms, so the app's first act isn't deciding
  for them
- Label: `[ ✨ choose for me ]` — monospace style, feels like a command

**Submit Button**
- Label: `[ meet your companion → ]`
- On click: POST /character with form data, then transition to ChatScreen

### Acceptance Criteria
- [x] All fields are present and functional
- [x] Sliders update descriptors in real time
- [x] "Choose for me" fills in valid random values for all fields
- [x] An age range is required — nothing is pre-selected, and submitting
      without one is caught warmly
- [x] POST /character is called with correct payload on submit
- [x] On success, ChatScreen renders
- [x] Error state shown warmly if POST fails ("Hmm, couldn't save that. Give it another try?")

---

## Screen 2: ChatScreen

### When it Shows
App loads → `GET /character` returns `exists: true` → show ChatScreen.

### Layout
Classic AIM/MSN two-panel layout:

```
┌─────────────────────────────────────────────────────┐
│  🕊️ COLUMBA                              [– □ ×]   │  ← TitleBar
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│  BUDDY INFO  │         CHAT WINDOW                  │
│              │                                      │
│  [avatar]    │  ┌──────────────────────────────┐   │
│  [name]      │  │  message history (scrollable) │   │
│  ● online    │  └──────────────────────────────┘   │
│              │  ┌──────────────────────────────┐   │
│  ─────────── │  │  type a message...      [send]│   │
│  ABOUT ME    │  └──────────────────────────────┘   │
│  [tone]      │                                      │
│  [stats]     │                                      │
│              │                                      │
│  ─────────── │                                      │
│  [quirks →]  │                                      │
│  [reset]     │                                      │
└──────────────┴──────────────────────────────────────┘
```

### Left Panel: Buddy Info
- `CompanionAvatar` — a dove emoji or simple generated avatar in a small square with a border
- Companion name (styled like an AIM screen name — bold, lavender)
- Green status dot + "online" label
- Divider line
- "About me" section showing tone + top 2 personality stats
- Divider line
- `[ view my quirks ]` button — opens QuirksPanel
- `[ start over ]` button — calls POST /chat/reset, clears message history in state

### Right Panel: Chat Window
- Scrollable message history area — auto-scrolls to bottom on new message
- Message input textarea (expands slightly with content, max 3 lines)
- Send button: `[ send ]` — monospace, accent colored border
- Send on Enter key (Shift+Enter for newline)
- Input disabled while waiting for response

### MessageBubble Component
Two variants:

**User message (sent)**
```
                    hey, I'm having a rough day ·  2:34 PM
                    ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
```
- Right-aligned
- Background: `--color-sent` with `--color-sent-border` left border (1px) or subtle left accent
- Timestamp: right-aligned, muted, monospace

**Companion message (received)**
```
[ 🕊️ Luna ]
hey, I'm really glad you reached out. tell me more ·  2:34 PM
▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
```
- Left-aligned
- Companion name above message in lavender
- Background: `--color-received`

**Loading state**
- Show a typing indicator while waiting: three dots animating ( `· · ·` )
- Use CSS animation, keep it subtle

### Acceptance Criteria
- [ ] Chat window renders existing character info on load
- [ ] Messages send on button click and Enter key
- [ ] Input is disabled while response is loading
- [ ] Loading indicator shows while waiting for reply
- [ ] Auto-scroll to latest message on new message
- [ ] Companion name + avatar appear correctly
- [ ] POST /chat called with correct payload
- [ ] Reset button calls POST /chat/reset and clears UI history
- [ ] Error shown warmly if chat call fails

---

## QuirksPanel

### What It Is
A slide-in side panel (or modal) that shows what the companion has learned about the user.

### When It Opens
User clicks `[ view my quirks ]` in the left panel.

### Layout
```
┌─────────────────────────────┐
│  what [ name ] knows  [ × ] │
├─────────────────────────────┤
│                             │
│  🎵 music                   │
│  loves · score 4.5 · HIGH   │
│                    [ forget ]│
│  ─────────────────────────  │
│  🍕 pizza                   │
│  likes · score 2.5 · MEDIUM │
│                    [ forget ]│
│  ─────────────────────────  │
│                             │
│  (empty state if no quirks) │
│  "nothing yet — just keep   │
│   talking 💙"               │
│                             │
└─────────────────────────────┘
```

### Per-Quirk Display
- Topic name (capitalized)
- Category emoji (music 🎵, food 🍕, sports ⚽, hobby 🎨, other ✨)
- Sentiment label: "loves" / "likes" / "dislikes"
- Score out of 5
- Confidence badge: LOW (muted) / MEDIUM (lavender) / HIGH (bright lavender)
- `[ forget ]` button — calls DELETE /quirks/:topic, removes from UI on success

### Acceptance Criteria
- [ ] Panel opens and closes smoothly
- [ ] GET /quirks called on open
- [ ] All quirk data displays correctly
- [ ] Forget button calls DELETE /quirks/:topic
- [ ] Quirk removed from UI immediately on delete (optimistic update)
- [ ] Empty state shown when no quirks exist
- [ ] Panel is scrollable if many quirks

---

## API Module (src/api/columba.js)

All fetch calls live here. Components import from this file — never write fetch() directly in a component.

```javascript
const BASE_URL = 'http://127.0.0.1:5000';

export async function getCharacter() { ... }
export async function saveCharacter(character) { ... }
export async function sendMessage(message) { ... }
export async function resetChat() { ... }
export async function getQuirks() { ... }
export async function deleteQuirk(topic) { ... }
```

All functions should:
- Use async/await
- Return the parsed JSON response
- Throw on non-ok responses so components can catch and handle

---

## App.jsx — Routing Logic

Simple conditional render — no React Router needed:

```jsx
// Pseudocode
if (loading) → show a simple loading state ("connecting... 🕊️")
if (!characterExists) → render <SetupScreen />
if (characterExists) → render <ChatScreen />
```

State lives in App.jsx:
- `characterExists` (bool)
- `loading` (bool)

On mount, call `getCharacter()`. Update state based on response.

---

## Starting Over

`[ start over ]` opens a small panel with two checkboxes rather than a yes/no
confirmation, because these are two separate decisions:

```
  start over
    [ ] my companion     forget them, and set up a new one
    [ ] what they know   clear every quirk

          [ start over ]   ← disabled until something is checked
```

Both unchecked does nothing, and the button says so by being disabled. This
also allows the combination a confirmation dialog can't express: **clear what
the companion knows while keeping the companion.**

Neither box is pre-ticked. Quirks belong to the person, not the companion, so
nothing is erased unless it's asked for.

| checked | call |
|---|---|
| companion | `DELETE /character` |
| quirks | `DELETE /quirks` |
| both | `DELETE /character?clear_quirks=true` (one atomic call) |

---

## Error Handling UX

Errors should never feel cold or technical. Follow this pattern:

| Situation | Message to show |
|---|---|
| Chat API fails | "Something went wrong — try again in a moment 💙" |
| Character save fails | "Hmm, couldn't save that. Give it another try?" |
| Quirks load fails | "Couldn't load quirks right now." |
| Quirk delete fails | "Couldn't forget that one — try again?" |

Show errors inline near the relevant action, not as full-page errors. Auto-dismiss after 4 seconds or let user dismiss.

---

## Phased Build Order (Do This Weekend)

### Phase 1 — Foundation
1. Vite + React project setup in `/frontend`
2. `App.css` with all CSS custom properties
3. `src/api/columba.js` with all API functions
4. `App.jsx` with character check + conditional routing

### Phase 2 — Setup Flow
5. `TitleBar` component
6. `StatSlider` component
7. `SetupScreen` — full form, submit, "choose for me"

### Phase 3 — Chat Flow
8. `CompanionAvatar` component
9. `MessageBubble` component
10. `ChatScreen` — full layout, send/receive, loading state

### Phase 4 — Quirks
11. `QuirksPanel` — slide-in, list, delete

### Phase 5 — Polish
12. Typing indicator animation
13. Auto-scroll behavior
14. Error states
15. Keyboard shortcuts (Enter to send)
16. Responsive adjustments if needed

---

*🕊️ Columba — for anyone who needs a light in the dark*
