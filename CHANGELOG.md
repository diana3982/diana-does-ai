# Changelog

What changed and, more usefully, *why*. Newest first.

This is a build log rather than a release log — Columba has no versions yet,
so entries are grouped by the phase in `SPEC.md` they belong to.

---

## Phase 3 — The chat window · 2026-09-05 → 09-06

The AIM-style two-panel chat: buddy info on the left, conversation on the
right. Message bubbles, a typing indicator, Enter to send, an input that grows
to three lines, and auto-scroll that follows the conversation down.

**Recovery, because failing is part of the design.** A send that fails
mid-conversation leaves the companion *online* — they are still there, the
message just did not make it — restores the words to the box, and offers
`[ try again ]`. Losing what someone has just written is the worst failure
this screen has: they may not have it in them to type it twice.

When the app cannot be reached at all, the status goes *away* and the action
becomes `[ reconnect ]` rather than a page reload, since a refresh would take
the draft and the conversation with it. While away, a 5-second poll checks the
link and flips the dot back on its own, the way a buddy list did — skipping a
hidden tab, and checking immediately when you return to the window.

Clearing the chat asks first, in the panel where the button was rather than in
a modal, so the conversation stays visible behind the question. Focus lands on
"nevermind"; Escape or a click outside backs out.

**The about-me panel is a profile, not a stat block.** "real talk 4 / humor 4"
says what was set without saying who is there. It now reads as a few short
lines in the companion's own voice, built from the same descriptors someone
read while moving the sliders — every setting still stated plainly, none of it
hidden. Built from the character rather than stored beside it, so editing a
companion later rewrites it for free.

**Fixed: quirk extraction had never once worked.** The model was returning its
JSON inside a ```` ```json ```` fence, `json.loads()` was raising, and the
error was being swallowed — so every extraction silently reported nothing, for
the entire life of the feature. Now the outermost `{...}` is taken and
whatever wraps it ignored.

**Quirks are used sideways or not at all.** After the first real conversation,
recall felt like being *seen* rather than watched, and the reason was the
phrasing: "you know what sounds good..." leaves someone free to claim it or
let it pass, while "I know you like X" hands them evidence that a file is
being kept. That is now an explicit instruction rather than luck, including
the part that matters most — if nothing fits what they are actually talking
about, say nothing.

**Extraction tightened.** Forty messages of testing produced 38 quirks,
including "chaos mode", "building courage", and both "edm" and "edm music". It
now records only concrete, nameable things, at most three per message, one
entry per thing, with no `other` category to escape through.

---

## Tests · 2026-09-06

76 backend tests and 34 frontend ones, all offline and free. The backend swaps
in a fake client that dispatches on model name the way the real code does, so
the endpoint tests exercise the whole Flask path without spending anything.

**No test can reach real data.** The `isolated_data` fixture is autouse: every
test is pointed at a temp directory before it runs. Autouse rather than
opt-in, so the protection covers tests written later by someone who never read
the fixture.

Live tests are opt-in (`COLUMBA_LIVE=1`) and capped by a counter wrapped
around the client, because an accidental loop there spends real money. They
cover the one thing a fake client cannot: that the prompts still come back in
the shape we parse.

Each run writes a summary to `backend/tests/logs/`, gitignored — a record of
your runs, not of the project.

---

## Phase 2 — Setup · 2026-09-05

Companion creation: name, age range, gender, tone, and four personality
sliders, each with a descriptor that changes as you move it.

**Age is a range, and nothing is pre-selected.** An exact age excludes people
at both ends, and a pre-filled default quietly suggests who the app is for.
Nobody should feel written out of it before they have typed anything.

**"Choose for me" fills the form and stops.** It does not submit — someone
should see what they are getting and agree to it.

"Doesn't matter" for gender saves `gender-neutral`, which assigns no identity
the user did not choose.

---

## Phase 1 — Foundation · 2026-09-04 → 09-05

Vite + React, the full design-token system in `App.css`, and every backend
call behind `src/api/columba.js`.

**Errors carry two halves.** The backend returns `{ error, detail }`: warm copy
for the person, technical detail for an expander. A stack trace should never
land in front of someone having a bad night.

**Privacy became structural rather than intended.** Real data files are
gitignored, fabricated examples are committed in their place, and every loader
tolerates a missing file so a fresh clone just works. Someone's conversations
with their companion are theirs.

The backend gained payload validation at the boundary, so a malformed
character is caught where it can still be explained rather than becoming a 500
on every later message.
