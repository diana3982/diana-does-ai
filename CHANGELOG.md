# Changelog

What changed, why it changed, and what prompted it. Newest first.

This is a build log rather than a release log — Columba has no versions yet,
so entries are grouped by the phase in `SPEC.md` they belong to.

Every entry opens with what triggered it, because a decision is only really
legible alongside the thing that forced it. Several of the choices here came
from a bug, a stray observation, or a question asked mid-conversation, and
saying so is more honest than presenting them as a plan that went to plan.

---

## Two findings written into Phase 7 · 2026-09-07

> **Triggered by** a question asked while testing the send queue in the
> browser: is losing the conversation on reload the intended behaviour? It
> is, for now — but the more interesting half was the observation attached
> to it, that the companion still remembered what had been said.

It does, because history has never been in the browser. `conversation_history`
is a module-level global in `app.py`; the frontend only ever held a copy for
rendering, and a reload throws that copy away while the server keeps every
turn. Two consequences are now recorded as Phase 7 items 28 and 29.

The conversation goes invisible rather than away — someone can return to a
blank window and get a reply that plainly remembers something they can no
longer see. And `[ clear this chat ]` gates on `messages.length === 0`, so
after a reload the one control that would clear that history is disabled
while the history is still there. Nothing else in the UI reaches it; starting
genuinely fresh means restarting Flask.

Neither is fixed here. Both belong to the phase that makes sessions last, and
they change what that phase has to account for: the button has to gate on what
the server holds rather than on what is on screen.

---

## Letting someone finish their thought · 2026-09-07

> **Triggered by** a question asked from the other end. We had been talking
> about the companion sending several bubbles the way a person texts, and the
> question was: what happens when the *user* does that? The answer, in the
> code as it stood, was that they couldn't — `waiting` disabled the composer,
> so the person most likely to text in fragments was the one the UI locked
> out mid-sentence.

**A bubble is no longer a turn.** Fragments sent close together are held in
`frontend/src/lib/sendQueue.js`, joined with newlines, and sent as one turn.
The companion answers the whole thought instead of answering "hi" while
someone is still typing the part that mattered.

**The composer never locks.** Someone mid-thought must always be able to keep
going, including while a turn is in flight. Anything sent during a live
request is collected and goes out after it, rather than being refused.

**The composer itself became the signal.** Testing in the browser turned up
replies landing mid-sentence when typing resumed just after a window closed.
No window is short or long enough to fix that — moving the number only moves
where the boundary sits. But words already sitting in the composer are not a
moment, they are a state, and they say plainly that someone isn't finished.
Nothing goes out while the box has something in it. The 20s ceiling forces
past that, so half a sentence somebody typed and walked away from can't hold
a sent message for good; it never forces past a live request, because the
backend has already written that turn.

A pre-commit read of that ceiling found it could be dropped: it was passed
into the flush as an argument, so a ceiling that came due while a request
was in flight was lost, and a draft left in the composer could then hold the
batch indefinitely. Coming due is a state on the queue now, so it survives
the busy moment and acts the first chance it gets.

**A third window, added after the first browser test.** Two seconds turned
out to be too short in real use: sending "hi" and then thinking about how to
say the next part reliably ran past it, so the follow-up became its own turn
and the companion answered twice. A fragment shorter than 30 characters is
now treated as an opener and gets 5s instead of 2s. The goals genuinely
conflict — a lone message should go quickly, a follow-up should be caught,
and only one can win inside any given second — so the length of what was sent
decides which. The asymmetry makes that safe: guessing "opener" wrong costs a
few seconds of dots, guessing "complete" wrong costs an interrupted sentence.
Punctuation would be the obvious signal and is useless here; almost nobody
puts a full stop on a text.

**A held Enter key sent the same message twice.** `draft` is state, so on the
second keydown of a repeat it is still the old text. `event.repeat` is now
ignored. Found while looking for the cause of the doubling above; it wasn't
the cause, but it was real.

**Two silences, not one.** A short window (2s) covers the gap between sending
one fragment and starting the next. Once typing resumes, each keystroke buys
a longer one (5s) — room to finish a sentence without being interrupted. A
20s ceiling means nobody's words are ever held indefinitely. The first window
is deliberately not shorter: firing inside the pause before someone starts
typing again is the exact failure the queue exists to prevent, and it costs
nothing to wait, because the reply takes several seconds regardless.

**The typing indicator goes up on send, before anything is sent.** This was
the one genuinely debatable call. Strictly, the companion isn't typing yet —
the app is waiting. It stays because it is how people actually text: you see
the dots, you know you were heard, and you keep writing. It also tells the
truth about the thing that matters, which is that the message landed.

**Why none of this is on the backend.** `/chat` is request/response, so the
server has no idea anyone is typing between calls, and giving it that would
mean WebSockets or SSE against a module-level `conversation_history` — a
concurrency problem bought for information the composer already has. Worth
recording separately: `companion.py` appends the user's message to history
*before* the API call, so once a request is out it cannot be taken back. All
joining has to happen before the send, never by cancelling one.

**Component tests, finally.** `@testing-library/react` and `jsdom` are in as
dev dependencies. `ChatScreen` opts into jsdom per-file rather than switching
the whole suite, so the pure logic tests stay fast. The pure queue tests can
prove the timing rule but not that the screen is wired to it — that a bubble
appears before the send, that the composer never disables, that a failure
returns the words.

**One bug caught in review, in the new code's own error path.** The failed
send removed the last *n* bubbles by position; a fragment sent while that
batch was in the air sits behind it, so a failure would have deleted the
wrong message. Removal is by id now.


## Code review — best practices pass · 2026-09-07

> **Triggered by** a request to check the code against six specific habits:
> no unnecessary dependency injection, no hand-rolled crypto, no redundant
> state, no leaks or unhandled failure paths, no needless complexity, and no
> configuration invented before it is needed. Reading for those six turned up
> two real bugs neither of us was looking for.

**Test mode was writing to the real settings file.** The redirect in `app.py`
named three of the four stores by hand, and `settings.py` — added later — was
never added to it. So switching sensitivities off during a test session wrote
to the live `data/settings.json` and quietly disarmed the feature for the real
companion. That is the exact failure test mode exists to prevent.

The store list now lives in `backend/storage.py`, and both things that need
it — the test-mode redirect and the `isolated_data` fixture — read from there.
The list had already drifted once before, when `sensitivities.py` and
`settings.py` each wrote a real file during a test run. Two copies of a safety
list is one copy too many. The guard test also now reads the source of every
module in `backend/` rather than a hand-kept list of imports, so it catches a
whole new module and not just a new constant in an old one.

**A hung backend left the composer disabled forever.** `fetch` had no timeout,
so a request that was accepted and then stalled never settled: `waiting` stayed
true, the input stayed disabled, and no error ever rendered. Every other
failure in this app has a warm path; that one had no path at all. Requests now
give up after 30 seconds and report as a timeout rather than as an unreachable
backend — the companion has not stepped out, so the dot stays on and the offer
is "try again", with the message still sitting in the box.

The rest was weight, not danger. `extract_quirks` was an alias for
`analyze_message` kept "for callers that only want the quirk half", and there
were none. `getStatusLabel` was exported, unused, and returned its argument.
`App.jsx` held `characterExists` alongside `character` — two variables for one
fact, and two things that can disagree; the character is now both the routing
decision and the data. `status.js` spelled the three intensity tiers twice, as
an object and an array; the array is derived from the object now.

One deletion taught something. The mount effect in `App.jsx` carried a
`cancelled` flag it read before its first `await`, so the flag could never be
true and protected nothing. Removing it broke the lint — not for the flag, but
because the async wrapper around it was what satisfied
`react-hooks/set-state-in-effect`. The wrapper is back, now labelled for the
reason that is actually true rather than the reason someone assumed.

Nothing was found under hand-rolled crypto or premature configuration. There
is no crypto in this app at all, which is right for local single-user storage —
encrypting a file with a key sitting beside it buys nothing. If Phase 7 ever
encrypts persisted history, that is a library's job, never a homemade scheme.

---

## Housekeeping · 2026-09-06

> **Triggered by** a README refresh, which turned up two virtualenvs — with
> the docs pointing at the one nobody was running.

One virtualenv, at the repo root next to `requirements.txt`. There were two,
holding different versions of the Anthropic SDK — everything had been running
against `anthropic 0.95.0`, below the `>=0.122.0` the project itself declares,
so a fresh clone would have installed a library nothing had been tested on.

Dependencies now carry major-version caps. An unbounded `>=` will happily
install the next breaking release on someone else's machine; the floors are
the versions actually verified against the live API, and raising a cap is now
a deliberate act with a test to run first.

---

## Phase 3.5 — What the companion notices · 2026-09-06

> **Triggered by** a question about the practical use of knowing someone's
> struggles: if the companion knows a person is working on their drinking, it
> should not suggest a mimosa at brunch. That is the app doing its job — care,
> not surveillance — and it did not fit anywhere in the quirks system.

Four signals now ride the one Haiku call that already ran on every message:
quirks, conversation intensity, sensitivities, and a gender cue. Same round
trip, same latency, one JSON object.

**Intensity fails heavy.** Every field falls back on its own, so a reply that
gets one thing wrong does not cost the other three — but a missing,
unparseable or errored intensity is treated as the heaviest, never the
lightest. A classifier that fails open is the one bug here that could actually
hurt someone. Malformed quirks are dropped rather than indexed into, which
would otherwise turn a bad model reply into a 500 on a message someone just
poured out.

**Sensitivities are their own store, deliberately not quirks.** Recording
"drinking" as a disliked quirk put it in the same slot as disliking cilantro,
scored and sentiment-labelled, and rendered it into the prompt as *"dislikes
drinking (score: 0.0/5)"*. A sensitivity is a different kind of thing: it only
ever removes an option before it is offered, so the companion does not suggest
a drink to someone working on their drinking, or family time to someone for
whom family is the wound. It can never raise the subject, allude to knowing,
or ask after it. If the user opens that door themselves, the companion follows
them there for as long as they hold it open, then lets it go. None of it
applies in a crisis.

One mention is enough — no score, no confidence to earn. Wrongly withholding a
brunch suggestion costs nothing; missing one costs something real.

A sensitivity in play lifts a light reading to medium: a floor, not a ceiling.
At heavy, a companion set to blunt real talk is softened — the one place the
app overrides an explicit user choice.

**Test mode** is env-gated and writes to `backend/data/test/`, verified end to
end rather than merely intended. Forcing an intensity tier is kept separate
from telling the model anything, since saying "this is a test" changes how it
replies and invalidates the read. The frontend shows an unmissable banner.

Frontend: the transient statuses now follow the conversation while the
always-visible one does not — a status that rewrites itself while you are
looking at it is unsettling. A session's reading is monotonic: once a
conversation has been heavy it stays out of the playful copy, because someone
who has just been in a hard place should not be met with a joke ten minutes
later.

---

## Phase 3 — The chat window · 2026-09-05 → 09-06

> **Triggered by** the setup flow being finished, and then by the first real
> conversation with a companion — which is where the recall bug and the
> phrasing question both surfaced.

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

> **Triggered by** a quirk-extraction bug that ran silently for an entire
> build. Nothing failed, nothing logged, and the feature simply never worked.
> Lint and a manual click-through cannot catch that class of thing.

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

> **Triggered by** the API layer and routing being in place, and by a review
> of the prototypes in `experiments/`, which had been written as though the
> only people who might need this were teenagers.

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

> **Triggered by** the backend being finished and needing something to talk
> to, and by a pass over `.gitignore` before the first push — which is when
> the question of what must never leave the machine got settled properly.

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
