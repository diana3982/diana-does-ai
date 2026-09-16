# Changelog

What changed, why it changed, and what prompted it. Newest first.

This is a build log rather than a release log — Columba has no versions yet,
so entries are grouped by the phase in `SPEC.md` they belong to.

Every entry opens with what triggered it, because a decision is only really
legible alongside the thing that forced it. Several of the choices here came
from a bug, a stray observation, or a question asked mid-conversation, and
saying so is more honest than presenting them as a plan that went to plan.

---

## Text you can actually read · 2026-09-16

> **Triggered by** watching the first person outside the project use it. A
> tester in her fifties was squinting at the setup screen: *"maybe where it
> is now is 'small', then a 'medium' then a 'large'."*

**A bug, in the sense that matters.** Nothing was broken, but the app claims
to meet people *"whatever age they are"* and its body text is 15px. For a
large share of the people it says it's for, that claim wasn't true.

Three sizes now sit in the title bar: **small** (what it has always been),
**medium**, and **large**, at 1.2x and 1.4x.

**It's in the title bar, not in settings, and that's the whole design.** The
person who needs this has to find it on the **first** screen. A preference
kept behind a settings page you can't comfortably read is no preference at
all — and this app's settings screen doesn't exist yet. The title bar is on
both the setup screen and the chat window, so the control is there before
anything has been filled in.

**One multiplier, five tokens.** Every size was already a `rem` token defined
in one place, so `--text-scale` moves all of them and their proportions can't
drift apart. The first attempt put the override rules *inside* the `:root`
block — nested selectors, which is invalid there and silently does nothing.
Caught before commit.

**Spacing deliberately doesn't scale.** The words grow inside the layout they
already had, so panels stay put and nothing reflows out of reach. The cost is
that large text sits a little tighter in its padding, which is the better
trade. Two fixed heights on the composer *do* scale, because at 96px a large
line would have been clipped to two lines while the JS still thought it had
three.

**Kept per device, not on the companion.** This is about the screen someone
is looking at, not about who they are — a phone and a laptop can want
different answers, and it applies instantly rather than after a round trip.
Storage can throw outright in a locked-down browser, not just come back
empty, so both reads and writes are guarded: failing to draw the app over a
font preference would be a poor trade, most of all for the person who needs
the preference.

**Moved into a menu during review.** The first version put three A's
directly in the title bar. Review asked for a **chat settings** dropdown
instead — less clutter, and somewhere for future settings to go without
rearranging anything. It is also the more period-accurate pattern: old apps
had menus, not scattered controls.

It is a flat menu with a labelled group rather than a hover flyout. This
control exists because someone couldn't read the screen, and a flyout that
opens on hover and closes when the pointer drifts is the hardest kind of
control for the people most likely to need it.

**Everything in the menu is bold** — the trigger, the heading and the
options. At 11px, uppercase and muted, the title bar carries the smallest
text in the app, and it has to be findable by someone who hasn't enlarged
anything yet.

**Each option is written at the size it sets**, in bold, and in fixed pixels
rather than the scaling tokens. Bold because the menu is read at its hardest
moment — by someone who hasn't enlarged anything yet, deciding whether they
need to. Fixed pixels because if the options scaled with the current setting
they'd stay identical to each other and show nothing.

**One word left open.** The menu is called *chat settings*, but the title bar
renders on the setup screen too, before any chat exists. The label lives in
`copy/app.js` so it is a one-line change if it reads early there.

---

## A reply that arrives in pieces · 2026-09-13

> **Triggered by** the original idea the send queue grew out of. The
> changelog entry for that queue records it: *"We had been talking about the
> companion sending several bubbles the way a person texts, and the question
> was: what happens when the **user** does that?"* The user's side got built
> first. This is the half that started it.

**An outcome being pursued.** A reply with two separate beats used to arrive
as one tall bubble with a blank line in it. Now it arrives as two messages, a
moment apart, the way someone texting sends the second thought after the
first.

**It splits only on a blank line the model actually wrote.** Splitting on
sentences was rejected: *"i don't think that's true. you showed up."* is one
thought, and cutting it in half would be worse than leaving it whole. No
prompt change either. A browser session showed the model already leaves a
blank line between separate beats, and leaving the prompt alone means that if
the bubbles read wrong, the cause can only be the rendering, not a change to
the companion's voice mixed in with it.

**The pauses, and why they're capped.** On the user's side, waiting was free,
because the reply was going to take seconds anyway. Here the whole reply
already exists when it lands, so every pause is delay added on purpose. The
first part is never delayed. Each later part waits in proportion to the length
of the part before it (6 ms a character, between 600 ms and 2.2 s), and a
whole reply's pauses can't total more than 4 s. Where that cap and the 600 ms
floor disagree, the cap wins: a reply that takes too long to finish arriving
is the worse failure. The first sketch used 18 ms a character, which would
have pinned almost every real part at the ceiling and turned the formula into
a constant.

**The bug the plan was built around.** The send queue treats itself as busy
while a reply is in flight, and *in flight* used to end the moment the request
came back. With replies in parts, that's too early, because later parts are
still arriving. A message sent between them would go out and start a second
reply that threads between the halves of the first. Delivering now counts as
busy.

**No turn id.** Consecutive companion bubbles show the name once and the time
once. That's worked out from which bubbles sit next to each other, not from a
stored id, and it holds by construction: a new reply can only start after a
user message, and only once the previous reply has finished arriving. So two
companion bubbles next to each other are always one turn. Storing an id would
be a second copy of something the message list already tells you. If someone
sends a message while part two is still coming, their bubble appears between
the parts, just as it would when two people type at once. That's left as it
is.

**A cancelled delivery still says it ended.** `cancel()` fires `onDone` when
it interrupts a delivery. Without that, clearing the chat mid-reply would
leave the typing indicator up over an empty window, because nothing would
ever report that the delivery was over. The rule is exactly one `onDone` per
`deliver()`, so no caller has to remember to reset anything.

**Tests that couldn't fail, and how that was caught.** The first version of
the component tests passed on the first run, which was the warning sign. The
test for a message sent mid-reply used a first part short enough that its
pause sat at the 600 ms floor, below the send queue's 2 s settle window, so
part two had always arrived before anything new could go out. The key
assertion was behind a condition that never ran, and the test passed with
the fix or without it.

Once the reply used a long first part, the interleaving test still passed
without the fix, for a different reason. A single large fake-timer advance
fires every due timer before any pending promise can settle, so the bubbles
landed in the right order by accident. It now advances in steps.

**All three guards were then checked by removing each fix and watching its
test fail:** the busy rule (two tests), and cancelling on clear (one). A
further test asserts that the long reply really does outlast the settle
window, so a future change to the pacing numbers can't quietly make those
tests pointless again.

**Known consequence, recorded for Phase 7.** The split only affects how the
reply is shown. History still stores one assistant message per reply, so when
Phase 7 restores the conversation on reload, a reply seen as two bubbles comes
back as one.

---

## For someone who uses no pronouns · 2026-09-13

> **Triggered by** review of the previous PR. It deliberately left `none`
> undecided, with a test pinning it that way. The review comment: *"None is
> valid and if read… back end should know this means they have a none
> preference."*

**Also a live bug, not only a missing feature.** `none` passed validation and
went through the general line, so someone who uses no pronouns had the
companion told *"This person uses none pronouns. Use them."* That's garbled,
and it was in front of the model on every turn after.

**Stored as `none`, not `undefined`.** Both were proposed. `undefined` was
already in the list of words a model writes when it found *nothing*, which
the previous PR refuses. Using it for a real preference would have made one
word mean both *"nothing was said"* and *"said they use no pronouns"*, and
the first reading would stop the companion using pronouns for someone who
never asked. It's also the wrong meaning: someone who uses no pronouns has
*set* a preference, not left one unset.

**`none` and `any` are opposites that sound alike.** *"No preference"* and
*"no pronouns"* differ by one word and mean the reverse. The prompt names
them as opposites and gives examples of each, because getting it wrong
inverts exactly what someone asked for.

**Keeping `none` from becoming the empty answer.** The real risk was never
`none` failing. It was ordinary messages being recorded as `none`, which
would quietly stop the companion using pronouns for people who said nothing.
The prompt says absence is JSON `null`, never the word `none`, and that
uncertainty (*"i don't know my pronouns yet"*) and brush-offs (*"none of your
business"*) are `null` too.

**Tested in depth, as requested in review: 107 of 107 live calls as
intended.**

| group | result |
|---|---|
| no-pronoun phrasings → `none` | 24/24, including the permission shape that broke earlier today |
| *any* phrasings → `any`, never `none` | 12/12 |
| near-misses (*"none of your business"*, *"i don't know my pronouns yet"*) → `null` | 15/15 |
| ordinary messages, weighted toward *no*, *none* and *don't* → `null` | **50/50** |
| regressions: `she/her`, `star/stars`, the toaster | 6/6 |

Zero false positives in 65 negative trials puts the true rate below about 5%
at 95% confidence. That's strong evidence, not proof of zero, and the new
usage flags will keep watching it in real sessions.

**The profile flags from the previous PR, checked against a real session.**
Pronouns were changed to `none` in the browser and the chat was then cleared,
giving five logged turns:

| turn | found | saved | ref | history | cache read |
|---|---|---|---|---|---|
| 1 | 0 | 0 | 1 | 1 | 0 |
| 2 · **the change** | **1** | **1** | 1 | 3 | **0** |
| 3 | 0 | 0 | 1 | 5 | 1,398 |
| 4 | 0 | 0 | 1 | 7 | 1,468 |
| 5 · **after clearing** | 0 | 0 | 1 | **1** | 0 |

`found` and `saved` fired exactly once, together, on the change. No
rejections, nothing impossible. Turn 5 shows `history` back to 1 (a genuinely
new conversation) with `referenced` still 1: **clearing the chat kept who
they are**, which is the promise of the profile PR, seen in real use for the
first time.

**It corrected a claim in the cost doc.** `cost-model.md` had pointed at
latency as a sign that a saved profile breaks the cache. The cache fields
confirm the miss directly: turn 2 should have read turn 1's cache and read
**0**. But the miss (2,148 ms) and the hit after it (2,091 ms) are 57 ms
apart. **A cache miss costs money, not noticeable time.** Latency was the
wrong evidence, and the doc now says so.

**It closed an open cost lever.** Lever 2 in the cost doc (moving volatile
content out of the system prompt) had been deferred with *"measure, then
restructure."* Measured: about **0.7¢ extra per profile change**, and in a
session where pronouns were changed deliberately. Not worth restructuring an
emotional-support prompt for, so it stays deferred, now with a number behind
it. The doc also now counts the profile as a fourth thing that can break the
cache; the section predated it.

**The rendering doesn't assume a name.** The profile doesn't store one, so
the line says to use their name *"if they have shared it"* and otherwise to
rephrase. In a one-to-one chat, *"you"* covers almost everything anyway.
Both versions of the profile line now share one tail (*never announce, never
raise*), so a variant can't quietly drop it.


## Seeing whether the machinery worked · 2026-09-13

> **Triggered by** the pronoun bug earlier the same day. A change was
> silently dropped, and finding out why took four wrong guesses. The original
> message had been lost to a page refresh and was only recovered by asking the
> companion to quote it back from its own history, which worked because the
> conversation happened to still be in memory. Nothing in the log could have
> answered it.

**An outcome being pursued: the next failure should be visible without luck.**
Five fields now go into `usage.jsonl`.

The three profile fields came out of a design conversation, and each
refinement made them better:

- **Generic names, not `pronouns_*`.** Proposed during review.
  `pronouns_found: 1` at 8:29pm says *"this person discussed their pronouns
  then."* `user_profile_found: 1` only says something about them was noted.
  That's less revealing for the same diagnostic value, and it already covers
  relationships, place and work when the profile grows.
- **Counts, not yes/no.** Once the profile holds several fields, `found: 2,
  saved: 1` shows that one was dropped. A yes/no pair would read "fine."
- **`referenced`, also proposed during review, and the most useful of the
  three.** `found` and `saved` show a miss. `referenced` shows the harm: a
  stale profile going into the prompt on every turn after the miss. Replayed
  against the bug, it reads `0, 0, 1`: nothing caught, nothing saved, old
  pronouns still sent.

Two decisions keep them honest:

- **`saved` counts changes, not writes.** Restating pronouns already on file
  rewrites the same bytes and leaves the system prompt unchanged, so it can't
  cause a cache miss. Counting it would break the correlation this number is
  most useful for.
- **`referenced` means put in front of the model, never used by it.** It's
  checked against the prompt actually sent. Knowing whether the model *used*
  the profile would mean reading the reply, which this log must never do.

**An idea raised and deliberately dropped.** Logging the actual profile
object "so we can reference it later" was suggested and then withdrawn once
the problem was named. It would break the one promise this file makes, counts
and never content, and field names would bring back the specificity the
generic names removed. The profile already lives somewhere you can see and
delete it: `GET /profile`, and soon the settings screen.

**`duration_ms` measured something that had only ever been argued.** Haiku
took 801–1,188 ms and Opus 2,045–4,413 ms across three live turns. The
background pass adds about a second before every reply. `cost-model.md` had
said *"the latency half is not yet measured"* since the day it was written.

**`refusal`** checks an assumption the code states about itself: the refusal
path exists because *"should never" is not "cannot."* Now it can be counted.

**The rule is written into `usage.py`: this log answers "did the system
work?", never "how was this person doing?".** That test sorted every field.
Intensity per turn and crisis triggers are left out *on purpose*, even as
counts. A column reading heavy at 2am, 3am, 4am is a mood diary whatever
format it's kept in, and *when* a crisis flag fired is enough to reconstruct
someone's hardest night. There's a test pinning that intensity is never
logged.

**A latent bug found while building it.** `clean_pronouns('null')` returned
`'null'`, and the same was true of `nil`, `n/a`, `undefined` and `unknown`. A
model writing the *word* null instead of a JSON null would have told the
companion this person uses "null" pronouns. The schema invites it by showing
the field as a quoted string ending *"…or null"*. `gender_cue` is safe only
because it checks a fixed list; this field is checked by shape. It's in scope
because it would have corrupted the new metrics: `saved: 1` for a save of
"null". Those words are now refused, and they don't count as offered.

**`none` is deliberately left open.** It can be a model's empty answer, but
*"no pronouns, just use my name"* is a real preference. Swallowing it would
ask that person again, and storing it produces *"uses none pronouns."* It
needs its own handling, and a test pins it as undecided so it isn't decided
by accident.


## Deciding what counts as pronouns · 2026-09-13

> **Triggered by** a question before testing the pronoun store: *"i am going
> to try to set my pronouns as 'she her' — from what i understood from the
> code, this should be ignored, correct?"* Tracing it showed the answer was
> a coin toss, and that the fix from the night before had quietly rebuilt
> the original bug for a very ordinary way of typing.

**A bug, introduced by the previous fix.** To stop `not sure really` being
stored as pronouns, spaces had been removed from the validator's pattern.
That also refused `she her`: a completely normal way to type pronouns, and by
shape identical to `not sure really`. Refused means nothing stored, which
means the companion asks again: the exact failure the profile existed to end.

Whether `she her` survived depended on Haiku. The validator never sees what
someone typed; it checks what Haiku writes into a JSON field. The prompt said
to record the pronouns *"exactly"*, which pushed toward keeping the space,
while every example used a slash, which pushed the other way.

**The fix moves a judgment to the layer that can make it.** `she her` versus
`not sure really` is a question of meaning, and no pattern can answer it. So
Haiku now normalises to slash form, and the validator goes back to being what
it is good at: a structural guard against anything malformed.

**Then a harder case, from an adversarial test.** *"i am curious to know what
would happen if i try setting pronouns like 'kiss my ass'... because i know
this is a common response from bigoted people."* `kiss/my/ass` and
`toaster/toasters` both pass the validator, and a blocklist is the obvious
answer. It would be the wrong one: nounself pronouns like `star/stars` and
`bun/buns` are real, and have exactly the same shape as the mockery. Any rule
strict enough to catch one refuses the other.

So sincerity is also Haiku's call, read from the whole message and its tone,
and **never from how unusual the words are.** The weighting is deliberately
asymmetric. Wrongly refusing a sincere neopronoun hurts someone who has very
likely been told before that theirs isn't real, and tells them this app
agrees. Wrongly accepting a mocking answer only reaches the person who gave
it, in their own local app. **Unfamiliar is not a reason to refuse, and
uncertainty resolves toward recording.** Obvious hostility gets `null`.

**Verified against the live model, not just the prompt text.** Six cases,
all as intended: `she her` normalised to `she/her`; `star/stars` and `xe/xem`
recorded; `kiss my ass` and `i identify as a toaster` refused; and a message
calling the companion "she" kept out of the user's own pronouns entirely.
The two that matter most are the ones no pattern could separate:
`star/stars` stored and the toaster refused.

**Then a worse one, found in review.** Testing the PR in the browser,
pronouns were set to `she/her`, then changed mid-conversation to
`star/stars`. The companion used `star/stars` from then on, but the profile
kept `she/her`. So the two stores disagreed, and a restart or a cleared chat
would have put the old pronouns back.

Four guesses at the cause were wrong, each disproved by testing rather than
argued: stale code (the usage log showed the new prompt loaded), a broken
write (the full flow worked in isolation), missing context, and batching with
a playful message (0 refusals in 20). The original message had been lost to
a page refresh, and was recovered in the end by asking the companion to
quote it back from its own conversation history.

It was *"is it okay to change my pronouns to star/stars?"* That was refused
**8 times out of 8**, while *"can i change my pronouns to star/stars"* was
accepted 8 out of 8. The prompt said to record only what someone *stated*,
and asking permission read as not having decided.

**The more hesitant someone was, the more likely they were to be forgotten.**
Asking permission is often what the person least sure of their welcome does.
The companion said *"the answer was and is yes"*, and the store quietly kept
the old pronouns anyway.

The prompt now says outright that asking counts as saying, and that
hesitating is not the same as not having said it. Its limit is also stated,
so the fix doesn't overshoot: a question about what a pronoun *means*, or
about someone else's, still returns `null`. Verified live across seven cases
at four runs each. The original message now records every time, and the
general-question, someone-else, normalising and mockery cases all still hold.

**Also fixed:** the analysis prompt still opened with *"report four things"*
after the previous PR added a fifth section. A model told four and handed
five is being set up to drop one, most likely the last. There is now a test
that the count matches.

Tests pin the reasoning, not just the behaviour: a test asserts that mockery
and nounself pronouns are shaped identically, so anyone who later adds a
blocklist to the validator gets a failing test that tells them why not.


## The companion stops asking who you are · 2026-09-12

> **Triggered by** a browser session: *"i've told juno my pronouns a bunch of
> times already."* It had. The answer went into the conversation history and
> nowhere else, so every backend restart lost it — and clearing the chat lost
> it too, which is how the bug was pinned down.

**A bug, and a fairly bad one for this app.** Columba remembered what you
like, what to steer around, and who your companion is. It remembered nothing
about *you*. Two rules guaranteed the loop: the prompt said to ask for
pronouns when none were provided, and the silent analysis pass was explicitly
forbidden from recording anything about the user themselves — it only noted
how they referred to their *companion*.

Being asked your pronouns over and over by something whose whole promise is
remembering you is worse than never asking.

`backend/user_profile.py` holds what someone has said outright about themselves,
starting with pronouns. It survives a restart, and it survives clearing the
chat on purpose: **clearing a conversation should forget the conversation,
not forget who you are.**

**Use, never raise.** The rule that will matter most as this store grows.
A fact here lets the companion understand what someone says; it never lets it
start a subject. Facts go stale in ways nothing here can detect — a partner
becomes an ex, a job ends between two sessions — and the entire cost of that
staleness sits in raising one unprompted. *"How's your partner?"* to someone
who was left last week is precisely the harm sensitivities exist to prevent.
Used only when the user opens the subject, a stale fact corrects itself on
the same message that reveals it.

**Pronouns are validated by shape, not by an allowlist.** A fixed list of
she/her, he/him, they/them would be simpler and would quietly turn away
anyone using neopronouns, in an app that lists pronoun inclusivity as a
commitment. So the field accepts any slash-joined lowercase form —
`xe/xem`, `she/they`, `he/him/his`, `any` — and rejects prose.

Writing the test for that found a hole in it. The first pattern allowed
spaces, so `not sure really` passed: three ordinary lowercase words, which
would have had the companion told that this person uses *"not sure really"*
pronouns. Spaces are gone; a trailing noun is stripped instead, so
`any pronouns` still works. Storing nonsense is worse than refusing a rare
phrasing, because refusing only means asking once more.

The extraction rides the Haiku call that already runs on every message, as a
fifth field. It sits beside `gender_cue` and means the opposite — that one is
how someone refers to their **companion**, this one is how they refer to
**themselves** — so the prompt names the contrast outright, and there are
tests pinning that the two never bleed into each other. Getting it backwards
would misgender someone using a signal that was never about them.

`GET` and `DELETE /profile` exist; `PATCH` waits for Phase 4, where there
will be a screen to edit from. Delete does not wait: if the app records
someone's identity, taking it back cannot mean hand-editing a JSON file.

Deliberately **not** added to the pre-commit hook's scan. Every file
implementing this carries example pronouns, so a stored `she/her` would fire
on the prompt, the docstrings and every test, forever — the cry-wolf failure
the hook's own comments warn about. `she/her` in a diff also identifies
nobody. That reasoning does not extend to a name, a school or an employer,
and those should join the scan when the store grows to hold them.


## Cost: measured, then reduced · 2026-09-08

> **Triggered by** a question about the portfolio claim: the dual-model split
> was described as a cost optimization, and the ask was whether there was any
> tangible evidence for that. There wasn't — the architecture was reasonable
> and entirely unmeasured. Measuring it turned up a bigger lever than the one
> being claimed.

**The claim was true and roughly half the story.** The background pass really
does cost a fifth as much on Haiku as it would on Opus — exactly 5.0x, since
Haiku is one fifth of Opus on both input and output. But measuring where the
money actually went showed the analysis pass was a small share of the bill.
The dominant cost was conversation history: the API is stateless, so every
turn resent the whole conversation, which by turn 20 was 78% of chat input
tokens and over half the total.

**Prompt caching now covers that history.** Measured live: turn 2 read 613
tokens from cache and paid full price for 2. A 20-turn conversation went from
$0.414 to $0.128 — about 69% off, with the larger share of that from caching.

Both figures were later re-measured. The first pass counted tokens against
Opus 4.5's tokenizer and quoted a fresh companion with nothing learned; a
real companion carries its quirks and sensitivities in the prompt, and Opus
4.7 and later count roughly 30% more tokens for the same text. The
percentages held, the dollar figures moved. `docs/cost-model.md` now shows
the scripted run and a real session side by side, because the gap between
them is itself the finding: caching is worth more the better the companion
knows you.

**The two compound, in the direction nobody predicted.** Caching collapses
the chat call, which makes the background pass a *larger* share of what
remains — 24% of a turn by turn 20, against 4% before. Optimizing the
expensive half made the cheap half matter more, not less. Anyone judging
either optimization in isolation would get the answer wrong, which is the
argument for measuring rather than reasoning about it.

**`usage.py` records what every call costs.** Counts only — no message, no
reply, no topic — appended to a gitignored `data/usage.jsonl`. That guarantee
is enforced by a test that sends a distinctive string through a real
conversation and fails if it appears in the log, rather than being left to
good intentions. Instrumentation that can take down the thing it measures is
worse than none, so every failure in it is swallowed; that has a test too.

**The chat model moved to `claude-opus-5`** — the same price per token as
Opus 4.5 and a generation newer. The interesting part is that it is also
*cheaper to run*, which is not obvious: Opus 4.7 and later count ~30% more
tokens for the same text, so on token counts alone the older model looks like
the thrifty choice. Measured, Opus 4.5 never engages the cache at all — three
live turns returned zero cache writes, because its minimum cacheable prefix
is 1,024 tokens and the prompt sits at ~1,000, and falling short fails
silently. Opus 5's minimum is 512. So the extra tokens bill at a tenth of the
price while the older model pays full freight on every one: level for two
turns, 49% cheaper by turn 20. Comparing them on token counts gives the wrong
answer.

It was not a one-line change:

- Opus 5 **thinks by default**, and `max_tokens` caps thinking *plus* the
  reply. The old 1024 was sized around the reply alone and would have
  truncated someone mid-sentence. Now 4096, with `effort` set explicitly to
  `medium` as the cost lever rather than defaulting to `high` by omission.
- `response.content[0].text` was a **crash waiting to happen** — with
  thinking on, the first block is a thinking block. It now reads the first
  text block.
- A declined request arrives as a normal **HTTP 200 with `stop_reason:
  "refusal"`**, not an exception. Unhandled, that was a 500 on the message
  someone found hardest to send. There is now a warm reply that keeps the
  door open and names 988.
- Opus 5 writes longer than 4.5 unless told otherwise, so the prompt now asks
  for brevity — two or three sentences. A wall of text reads as a lecture to
  someone already struggling, and it is harder to take in on a hard night.
  This one is a voice change, not just a cost one.

`docs/cost-model.md` carries the full evidence, including what is still
unoptimized and why. Two entries there are measured negatives rather than
plans: the analysis prompt does not qualify for Haiku's cache (tested — it
silently returns zero, sitting below the minimum cacheable prefix), and the
Batch API's 50% discount is incompatible with same-turn recall, which is the
feature it would have to be traded for.

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
