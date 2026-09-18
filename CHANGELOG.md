# Changelog

What changed, why it changed, and what prompted it. Newest first.

This is a build log rather than a release log — Columba has no versions yet,
so entries are grouped by the phase in `SPEC.md` they belong to.

Every entry opens with what triggered it, because a decision is only really
legible alongside the thing that forced it. Several of the choices here came
from a bug, a stray observation, or a question asked mid-conversation, and
saying so is more honest than presenting them as a plan that went to plan.

---

## Modes: asking for what you actually need · 2026-09-17

> **Triggered by** the half of UAT 1 that yesterday's fix could not reach.
> UAT user 1 chose `creativity: 1` — labelled *"grounded and practical"* — and
> got the fewest suggestions of anything. `#12` made the label honest. It did
> not create the thing being reached for: **there was no way to ask for plain
> advice, and no way at all to ask simply to be heard.**

The `creativity` slider is gone. In its place, four things a person can ask
for, one at a time:

| | |
|---|---|
| 👂 | **just listen** |
| 🧩 | **help me unpack it** |
| 💬 | **give me advice** |
| 💡 | **give me an idea** |

Of the four, `listen` is the one the app had no way to ask for before.

**One at a time, not several.** Some pairs contradict outright — *just listen*
and *give me advice* would ask the companion to hold back and to offer in the
same breath — and every combination would be a behaviour someone has to test.

**Not named for therapy.** The first sketch of this list included
*"conversational therapy simulation"*. In an app that routes crisis to 988
precisely because it is **not** clinical care, a mode named *therapy* invites
being taken as treatment by the person least able to afford the confusion.
`unpack` does the same work without the claim.

**It lives in settings, not in the character config** — a reversal of the
earlier plan, and the reasoning is the interesting part. A stat says who the
companion *is*; a mode says what this person wants *today*, and it can be a
different answer tomorrow. Storing it in settings also meant the back-compat
came free: `load_settings()` already merges onto `DEFAULTS`, an idiom with a
test pinning it since it was written, so a settings file from before modes
existed simply gets the default. `PATCH /settings` already existed too, so
switching modes later needs no new endpoint.

**The accepted cost, recorded because it is real:** mode is global rather
than per-companion, and there is **no migration** — a companion that had
`creativity: 5` lands on the default like everyone else. "Behaviour preserved
approximately" is not preserved. One person uses this app today; the
simplicity is worth more than the fidelity.

**`settings.py` could store any word as a mode, and would have.** Its
coercion keys off the *type of the default*, so booleans were cleaned and a
string was stored exactly as sent. `PATCH /settings` would have accepted
`mode: "anything"` and the prompt would have carried it. There is now an
explicit guard on the way in — the same "refuse at the boundary, index freely
afterwards" that `validate_character` and `_clean_quirks` already argue for.
Kept as one `if` rather than a registry of validators: one enum key does not
earn the indirection, and a second is when to generalise.

### The part that is about safety

`listen` is the only mode that tells the companion to **withhold**, which
makes it the only one that could withhold the wrong thing. Its rule ends with
the sentence `sensitivities.py` already uses for the same purpose: *"if
someone is in danger, respond fully and point them to help."* Not offering
suggestions is about advice; it is never about someone's safety, and the
person most likely to choose *just listen* on a bad night is exactly who that
carve-out is for.

It is pinned at **every** intensity rather than once, because the tier is
decided by a model — so the unlucky combination is the one nobody would have
tried by hand. `988` is asserted present under all four modes.

### The bug that removing a stat would have shipped

`buildAboutMe` destructured four descriptors by name and rendered
`` `${third}. ${fourth}.` ``. With three stats, `fourth` is `undefined` and the
sidebar would have read **"creatively minded. undefined."** to the user.

**All eight tests in `about.test.js` passed through that.** The "no *and and
and*" regex does not match `undefined`; the lowercase check passes because
`'undefined'` is already lowercase; and the length test pins *three returned
lines*, not three stats. It now builds from however many traits there are,
and a test asserts no line contains `undefined` for every tone × every value
— checked by reintroducing the four-way destructure and watching it go red.

That is the fifth test this week found to be green for the wrong reason, and
the first caught before the code was written rather than after.

### One more thing that had to move

Dropping `creativity` from `STATS` **re-armed the privacy hook against it**.
`app_stat_keys()` scrapes the stat list out of `setup.js` at hook runtime, so
the moment the word stopped being a stat key it stopped being exempt — and it
is a real learned topic locally. Every commit mentioning the slider it used to
be, including this changelog entry, would have been refused. It is retired
into `APP_VOCABULARY` by hand, with the reason written beside it.

---

## Bold letters reach every window, and the slider descriptions get readable · 2026-09-16

> **Triggered by** trying it: *"having bold letters on in the create
> companion menu did nothing though btw"* — and then, on being offered a
> choice of how far to extend it, *"i think bold setting should be for all
> windows since it is an accessibility thing."*

**That reason overrides the question.** Bold was scoped by a rule — "prose,
not chrome" — reasoned entirely about the chat, where weight on labels and
timestamps would compete with message text. On a form there is no long prose
to compete with, so the rule imported an assumption that did not hold and
left the setting doing nothing on the create-companion screen. Which is the
screen someone was squinting at when they asked for any of this.

It now applies **once, on `body`**, and reaches everything. The per-component
declarations are gone.

**Hierarchy survives, and that is why this works rather than a hope.**
Everything meant to stand out already declares 700 or more: headings,
primary buttons, the companion's name. Body text moves 400 → 600 underneath
them, so the gap narrows and never closes. `index.css` gives form controls
`font: inherit`, so the name field and the dropdowns come along without
being named.

**One weight deliberately does not follow the setting.** The values in the
bold submenu stay at 400, because that submenu is where bold is previewed —
"on" is written in the weight it turns on. If those inherited the setting,
then with bold already on both options would render at 600 and the preview
would show nothing: the control would stop describing itself. A test pins
it, since it looks exactly like an oversight worth tidying.

**The generalisation, recorded because two narrower versions were both wrong
the same way:** an accessibility setting does not get an opinion about which
windows deserve it, and a list of selectors is how it quietly acquires one.

---

**Separately, the slider descriptions were the least readable text in the
app.** `.stat-slider-descriptor` — *"creatively minded"*, the line someone
reads to decide what a level means — was `--text-xs` (the smallest size),
*italic*, and muted grey. The three least readable choices available, on the
line that decides the answer.

Nobody chose that combination for this content; it inherited the styling of
a caption. It now reads like the content it is: `--text-sm`, upright, normal
text colour. **For everyone**, not only for whoever finds the settings menu
— which is the point. The people most likely to need this are the least
likely to go looking for a preference.

**Verification.** Three mutations, all caught: `body` losing the weight
(bold does nothing anywhere), the on-rule nested inside `:root` (invalid,
silently ignored), and the preview menu made to follow the setting.

---

## The creativity slider stops promising the opposite of what it does · 2026-09-16

> **Triggered by** diagnosing UAT 1 rather than by anything UAT user 1 said.
> They chose `creativity: 1`, whose label read **"grounded and practical"**,
> and got the fewest suggestions of anything — the label promised the
> opposite of the behaviour.

The slider sets how often creative outlets come up, and 1 is the *fewest*.
"Grounded and practical" reads as a promise of practical advice, so someone
wanting practical help picks the rung that gives them least of everything.
A label promising the opposite of its behaviour is worse than a vague one:
vague makes you look, wrong makes you choose wrong.

Level 1 is now **"not the artsy type"** — honest about the creative bent,
and silent about advice it does not control.

**The descriptors are not only slider labels, which decided the fix.** The
first draft rewrote all five as behaviour — *"suggests an outlet
sometimes"* — until `about.js` turned out to build the companion's
first-person profile blurb from this exact text. That would have put a job
description inside a paragraph about who it is: *"light when you need it.
suggests an outlet sometimes."* They stay self-descriptive, and the reason
is now a comment in `setup.js` so the next person doesn't rediscover it.

Checked by rendering the real blurb rather than reasoning about it:

```
creativity 1   light when you need it. not the artsy type.
creativity 3   creatively minded. light when you need it.
creativity 5   sees everything as art. warm and caring too — that's where i live.
```

**This fixes the label, not the gap.** There is still no dial for *"give me
practical advice"* — UAT user 1 wanted one and reached for the nearest
label. Honest wording stops the next person being misled; it does not give
them what they asked for. That is the mode picker, which replaces this
slider outright, and `SPEC.md 17.7` now records the follow-on: suggest
outlets the person already likes before reaching for new ones, using quirks
that are already collected and consulted by nothing.

**The commit was refused, and the hook was right to notice.** `creativity`
is a stat key *and* was a real topic in local data, so `scripts/hooks/pre-commit`
read the CHANGELOG entry as leaking a quirk. The word appears in `setup.js`,
`companion.py`, `SPEC.md` and most of this file, so every future commit
touching the slider would have been refused too — which is how a guard
teaches people to pass `--no-verify`, and that removes it entirely. The four
stat keys are now exempt **as topics**, read from `setup.js` rather than
typed in, the same way the "choose for me" name list already was.

The exemption stops exactly there. A companion *named* after a stat is still
a name its owner chose, and the first draft of this widened far enough to
swallow it — the filter now runs before the name is added rather than after.
Three mutations were run against the tests; the third, hardcoding the keys
instead of reading them, **survived**, because asserting the four real names
passes just as well against a hardcoded list. That test now uses stat keys
the app does not have.

---

## Warmth answers to the setting, and a suggestion sounds like a friend's · 2026-09-16

> **Triggered by** UAT 1. Two separate notes from the same session, both
> about how the companion talks rather than what the app does.

**The affirmation was ignoring the compassion dial, and the reason was
structural.** UAT user 1 set compassion to 1 and still came away feeling
over-validated. Nothing was misbehaving: *"Begin your very first response
with a brief affirmation that reflects back what the user shared"* sat in the
rules list as an instruction of its own, so no setting reached it. Someone
could turn warmth all the way down and still be met with a reflection of
their own words.

It now answers to compassion, and the boundary is `>= 3` rather than a new
number, because `compassion_desc` already calls `<= 2` *"measured and
calm"* — the affirmation follows a split the file already believed in. Below
it, the rule is replaced rather than merely dropped: *"Do not open with an
affirmation, and do not reflect their words back to them before answering."*
Dropping it would have left the model free to do it anyway.

**With one override, which is not a new idea either.** A heavy conversation
gets the warm opening whatever the dial says. That is the same exception
`real_talk` has carried since it was written, for the same reason: a setting
chosen on an ordinary day should not decide how someone is met on the worst
one.

**Suggestions are offered, not prescribed.** The other note from UAT 1 was
about register — a recommendation that lands like a friend's rather than a
worksheet. So: one thing, tentatively, easy to turn down, *"have you
tried..."* rather than *"I recommend..."*, and never a list. A list is a
worksheet, and it puts work on someone who came here because things are
already hard.

**The companion does not borrow a life it does not have.** The phrasing UAT
user 1 liked was grounded in the speaker's own experience — *"I know that
when I'm feeling that way, I do this and it's helped me"* — and the
companion has none. Three options were weighed, including allowing general
first-person coping talk, which the existing prompt arguably already licenses
when it says the companion's age should shape *"how much you have lived
through"*. The decision was the strict one: **no speaking from experience at
all.** The register carries the warmth; a claim to share the feeling is not
needed for it, and the cost of being caught at it is that every warm thing
the companion ever said turns retroactively hollow.

The two rules could read as contradicting each other, so both are pinned by
tests: the age shapes the voice, and is not a history to narrate.

**Every test here asserts both directions** — the right rule present *and*
the wrong one absent. Presence alone would pass if both were emitted, which
is the likeliest way this breaks. Four deliberate mutations were run against
them, including removing the gating entirely, which is the original bug; all
four were caught.

---

## Every test, checked against broken code · 2026-09-16

> **Triggered by** review on #10, after two tests in that PR turned out to
> pass against deliberately broken code: *"Let's deliberately try to break
> the code in the test suites. We need positive and negative testing
> always."*

`scripts/mutate.py` changes one operator or constant at a time, runs the
suite, and reports every change nothing caught. 81 mutations were caught;
the survivors were then judged one at a time, because **a survivor is not
automatically a missing test**.

**The finding: `quirks.py` scoring had no tests at all.** There was no
`test_quirks.py`. Flipping `sentiment == 'positive'` to `!=` — which inverts
scoring outright, so saying you hate something raises your score for it —
broke nothing in 286 tests. Neither did moving the "loves"/"likes"
thresholds. The extraction tests covered what gets pulled *out* of a
message; nothing covered what the numbers then did with it.

That is the worst place in this codebase for that gap. These scores decide
what the companion believes about someone, and `build_quirks_context` says
it out loud in the system prompt. Inverted scoring would not crash anything
— it would produce a companion **confidently wrong about a person**, which is
the one failure this app can least afford.

`test_quirks.py` now covers sentiment direction, both clamps, the confidence
boundaries from both sides, and the label thresholds pinned at 3.5 and 2.0
exactly. The **24-character pronoun cap** was untested too, and it is not
decoration: `PRONOUN_PATTERN` has no length of its own, so without the cap a
model returning a paragraph of lowercase letters would be stored and read
back as someone's pronouns.

**The sweep also caught a bad test written to close a gap.** The threshold
test asserted `"likes kite flying" in context` — and that is a *substring of*
`"dislikes kite flying"`, so with the 2.0 threshold broken the label flipped
and the assertion still passed. It now asserts on the leading `- ` that only
the real line has. Three tests this week were green for the wrong reason;
this was the first found by machine rather than by guessing where to look,
which is the argument for doing it in bulk.

**What was deliberately left alone**, because reporting an honest equivalent
beats inflating a kill rate: four `indent=2` → `3` (JSON cosmetics),
`round(score, 1)` → `2` (enthusiasm is 1–5, so `0.5 × n` never has two
decimals), every timing dial in `sendQueue` and `replyQueue` — 600ms → 601ms
*should* survive, since pinning it would test the knob and not the behaviour
— two boundary comparisons in `splitReply` that produce an identical array at
exactly `MAX_PARTS`, and one unreachable guard against an empty flush.

**One survivor was a real finding, and not a test gap.**
`clear_profile()`, `clear_sensitivities()` and `clear_quirks()` each ended in
an unconditional `True` that no caller reads and that can never be `False` —
a success signal that does not exist, waiting for someone to branch on it.
All three are gone. `forget_quirk()` and `forget_sensitivity()` keep theirs:
those genuinely report whether the topic was there, and `app.py` answers 404
with it.

---

## Bold letters, and one shape for every display setting · 2026-09-16

> **Triggered by** UAT 1, in the same sitting. UAT user 1 wanted the menu
> items easier to read at first glance — and when that turned into bolding
> the values themselves, Diana pushed back: *"someone might expect the text
> to be bolded once selected... It could be another option in chat settings,
> 'Enable Bold Letters'."*

The pushback was the useful part. Weight was already doing a job in that
menu — it marks what you **operate**, and the current value is marked in
accent colour. Bolding the values would have given one meaning two signals
and taken weight away from the setting that should own it.

So bold became a setting. **Off by default**, and it applies to **prose** —
the companion's profile line, the conversation, and the message being typed —
never to labels, buttons or timestamps. Bold everywhere flattens the
difference between a heading and a sentence, and the chrome is already
heavier than the prose.

**The composer was missed on the first pass, and the rule was the reason.**
It was written as *"what you read, not what you operate"*, which sounds right
and put the message box on the wrong side of the line. Review caught it:
*"we want this within the text box as the user types since it is an
accessibility feature."* The composer is both things at once, and the
half-written sentence in it is the one piece of text in the app that isn't
there yet — which makes it the worst place to make someone squint, not an
acceptable one.

**Weight 600, not 700.** Full bold removes some of the letterform variation
the eye tracks with, so a whole conversation in it reads denser rather than
clearer. Dark mode sharpens that — light text on a dark ground already looks
thicker than the same weight the other way round, and this app has no light
theme. It is an accessibility setting, not a style one: Windows ships the
same thing as *"Make text bolder"*, and for many low-vision readers weight
helps more than size does.

**The second setting is what forced the shape.** One setting can be written
any way at all; two is where the duplication would have started. Text size
and bold now declare only what they *are* — key, values, default — and
`lib/preference.js` holds the storage, the fallback and the document-root
write once. `SettingsMenu` renders from a list, so a third setting is an
entry there and a label in `copy/`. No new markup, no new state, no branch.

**Where the number lives mattered too.** 600 is a CSS token, not a JavaScript
constant: CSS cannot import from JS, so a copy in `boldText.js` would have
been a second definition of the same number waiting to disagree with the
first. That is now written down in `CLAUDE.md` alongside the rule that
prompted it — *"moving forward no more hard coding, please"* — after a
renamed menu label broke eight tests that had spelled the label out.

**A guard test, because this seam fails silently.** A display setting is
joined to the stylesheet by nothing but a string. A renamed attribute, a
value with no rule, a token defined and never read, or a rule nested inside
`:root` — which is invalid and simply ignored — all leave a setting that
stores and applies correctly and changes nothing on screen. That last one was
written in this project and caught by eye. `displayPreferences.test.js` now
reads the CSS as text, the way the backend's storage guard reads
`backend/*.py`.

Three of the new tests passed at first for the wrong reason and were rewritten
after being checked against a deliberately broken version: one asserted a DOM
attribute that gets written either way, and two checked the stylesheets a file
at a time — which is how the guard sat green while the composer had no weight
at all, since the file it lives in was already satisfied by a different rule.
It checks one selector at a time now, and fails on the exact state the review
found.

---

## Text you can actually read · 2026-09-16

> **Triggered by** UAT 1 — the first session run with someone outside the
> project. UAT user 1 could not comfortably read the setup screen: *"maybe
> where it is now is 'small', then a 'medium' then a 'large'."* Age range
> fifties — recorded, with consent, because it is the cause rather than
> colour: age-related vision change is why 15px failed, and why the fix is
> size and not contrast.

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
directly in the title bar. Review asked for a **settings** dropdown instead —
less clutter, and somewhere for future settings to go without rearranging
anything. It is also the more period-accurate pattern: old apps had menus,
not scattered controls.

It is called *settings* rather than *chat settings* because the title bar
renders on the setup screen too, before any chat exists — and because not
every setting it will hold is about the chat.

**It nests, and submenus open on click.** The first attempt at the menu was
flat, on the grounds that flyouts are hard to use. That conflated *flyout*
with *hover* — and hover is the actual problem, since hover menus close when
the pointer drifts and cannot be used by touch at all. Opening on click keeps
the nesting, which is what stays short as settings are added, with none of
the cost. The top level lists what can be changed; values appear when a
setting is opened. A test pins that, so it cannot drift back into a flat
list.

**Bold marks what you operate, not what you pick.** The trigger and the
setting names are bold; the values are not. Weight reads as "selected", and
selection was already shown in accent colour — two signals for one meaning,
one of them wrong. It also leaves weight free for a bold-text setting to own
later.

**Each value is written at the size it sets**, in fixed pixels rather than
the scaling tokens. If they scaled with the current setting they would stay
identical to each other and show nothing.

**The default moved from small to medium.** 15px body was never actually
chosen — it is what got built first, and the first person to use the app from
to use this app from outside the project could not read it comfortably.
Nobody had asked for it. Small stays
available for anyone who prefers the density. Sizing up only the setup screen
was considered and rejected: someone who picked *large* would have had setup
render *smaller* than they asked for, and a size change between screens reads
as something breaking.

**The test-mode banner stopped covering the title bar.** Found while
reviewing this, and older than this work: the banner was `position: fixed`,
so it was out of the layout entirely and nothing reserved room for it. As
soon as its sentence wrapped to a second line it sat on top of the title
bar — and a narrow window and a larger text size both cause that wrap, so
making medium the default is what brought it into view.

It now sits above the app rather than inside it, and is `sticky` rather than
`fixed`: still pinned while scrolling, but taking real space, so it cannot
overlap anything. The page became a column to hold it.

**The submenu opens leftward**, because the menu is pinned to the right edge
of the title bar and would otherwise run off the window. On a narrow window
there is no room beside it at all, so values sit beneath their setting
instead.

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
