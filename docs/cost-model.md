# What Columba costs to run

Columba uses two models on purpose: `claude-opus-5` for the conversation and
`claude-haiku-4-5` for a silent background pass on every message. The reason
given for that split has always been cost and efficiency. This document is
the evidence for that claim, because a claim about efficiency with no
measurement behind it is just a preference.

Short version: a 20-turn conversation costs **$0.078**. The same conversation
without either optimization costs **$0.283** — so the two together take about
**73%** off. They also compound in a way that wasn't obvious up front, which
is the most interesting thing in here.

---

## How these numbers were produced

Three sources, kept separate on purpose:

| | source | confidence |
|---|---|---|
| Prices | Anthropic's published rates, September 2026 | exact |
| Token counts | `client.messages.count_tokens` against the real prompts | exact |
| Per-turn usage | `response.usage` from 3 real turns against the live API | measured |
| Turn 5 and beyond | extrapolated from the growth rate of those 3 turns | **estimated** |

Everything through turn 3 is observed. Anything past it is arithmetic on an
observed growth rate, and it is labelled as such wherever it appears. As real
sessions accumulate in `backend/data/usage.jsonl`, the extrapolation can be
replaced with the real distribution.

No user data was read to produce any of this. The measurement scripts
redirect storage to a temp directory first, using the same mechanism test
mode uses.

## Prices

| | input | output | cache write (5m) | cache read |
|---|---|---|---|---|
| `claude-opus-5` | $5.00 / MTok | $25.00 / MTok | $6.25 / MTok | $0.50 / MTok |
| `claude-haiku-4-5` | $1.00 / MTok | $5.00 / MTok | $1.25 / MTok | $0.10 / MTok |

Haiku is exactly one fifth of Opus on both input and output. That ratio is
what the dual-model argument rests on, and it is a property of the price
sheet rather than of anything this app does.

## What the prompts actually weigh

Measured with `count_tokens`:

| | tokens |
|---|---|
| `ANALYSIS_PROMPT` — the Haiku system prompt | 769 |
| Chat system prompt, no quirks learned yet | 368 |
| Chat system prompt, 5 quirks rendered | 597 |
| A typical user message | 13–52 |

And measured live, per turn:

| | tokens |
|---|---|
| Analysis call, input | 775–783 |
| Analysis call, output (the JSON) | 50 |
| Chat reply, output | 43–83 |
| Conversation prefix growth, per turn | ~82 |

---

## Claim 1: the background pass is cheaper on Haiku

**True, and the number is exact.** The analysis call costs **$0.00103** on
Haiku and would cost **$0.00515** on Opus — 5.0x, holding for any message
length, because Haiku is one fifth of Opus on both dimensions.

What this buys is not just money. The analysis runs *before* the chat call
and blocks it, deliberately: the system prompt is built after the analysis
writes, so the reply already knows whatever the message just revealed. That
puts the background pass on the critical path of every message, which makes
Haiku being the fastest model load-bearing rather than incidental. The
latency half of that is not yet measured — `usage.jsonl` records tokens, not
timings.

## Claim 2: prompt caching pays for the conversation history

**True, and larger than the model split.** The chat call resends the entire
conversation on every turn, because the API is stateless. Before caching,
that resent history was the single biggest line item in the app — 78% of
chat input tokens by turn 20.

Automatic caching, measured live across three turns:

| turn | uncached input | cache write | cache read |
|---|---|---|---|
| 1 | 2 | 613 | 0 |
| 2 | 2 | 82 | **613** |
| 3 | 2 | 79 | **695** |

Each turn now writes only what is new and reads everything prior at a tenth
of the input price. Uncached input falls to **2 tokens**.

## The two together

Per-turn cost, and what the same turn cost before either change:

| turn | chat (cached) | chat (uncached) | analysis | total now | total before | saved |
|---|---|---|---|---|---|---|
| 2 | $0.00245 | $0.00510 | $0.00103 | **$0.00348** | $0.01025 | 66% |
| 5 | $0.00258 | $0.00633 | $0.00103 | **$0.00361** | $0.01148 | 69% |
| 10 | $0.00278 | $0.00838 | $0.00103 | **$0.00381** | $0.01353 | 72% |
| 20 | $0.00319 | $0.01248 | $0.00103 | **$0.00422** | $0.01763 | 76% |
| 40 | $0.00401 | $0.02068 | $0.00103 | **$0.00504** | $0.02583 | 81% |

*Turn 2 is measured. Turns 5+ extrapolate the observed growth rate.*

**One caveat on the absolute numbers.** These were measured against a fresh
companion with nothing learned yet, so the cached prefix starts at 613
tokens. A companion that has been used for a while renders its quirks and
sensitivities into the system prompt, and that prefix runs closer to 1,150 —
which makes a turn cost more, and makes caching save *more*, than the table
above. The benefit scales with how much the companion knows about you: the
longer someone has been talking to it, the more the cache is worth. The
percentages hold; the dollar figures are a floor.

Over a 20-turn conversation:

| | cost |
|---|---|
| Today — Haiku pass, caching on | **$0.0775** |
| Caching off | $0.2005 |
| Caching off, analysis on Opus too | $0.2829 |

**They compound, in the direction nobody predicted.** Caching collapses the
chat call, which makes the background pass a *larger* share of what is left —
24% of a turn by turn 20, against 4% before caching. Optimizing the expensive
half made the cheap half matter more, not less. Anyone reasoning about which
of the two to keep would get the answer wrong by looking at either in
isolation.

---

## What is not optimized yet

Ordered by expected size. Each one has a reason it hasn't been done, because
a roadmap without those is a wish list.

### 1. Cap the prefix instead of letting it grow — Phase 7

The cached prefix grows by ~82 tokens a turn and never shrinks. Cache reads
are cheap, not free, so a very long conversation still creeps upward — and
eventually meets the context window regardless of price.

The rolling summary planned for Phase 7 was scoped as a memory feature: keep
the feeling of being remembered without keeping every word. It is also the
only lever that bounds this curve rather than discounting it. Two arguments,
one piece of work.

### 2. Move volatile content out of the system prompt

The system prompt renders *before* the messages, so anything that changes in
it invalidates the entire cached conversation behind it. Three things in it
can change mid-conversation: the heavy-intensity real-talk override, a quirk
crossing into MEDIUM confidence, and a newly noted sensitivity.

Opus 5 supports mid-conversation system messages — a `{"role": "system"}`
entry appended to `messages` rather than an edit to the top-level `system`
field. Moving the volatile parts there would leave a frozen system prompt in
front of a cache that stops being thrown away.

**Deliberately not done yet.** It restructures the prompt of an emotional
support app to save money, and the size of the prize depends entirely on how
often those three things actually change in a real conversation — which is
now a question `usage.jsonl` can answer by showing how often
`cache_read_input_tokens` comes back zero when it shouldn't. Measure, then
restructure. One cheap piece of it *is* done: the quirks block is sorted
rather than insertion-ordered, so a re-learned quirk cannot reorder the
prompt and cost a miss for nothing.

### 3. Tune effort

`output_config.effort` is set to `medium`. Opus 5 is unusually strong at the
lower levels and effort is the primary cost and latency lever, so `low` is
the obvious next experiment. It is set to `medium` rather than `low` because
reading someone correctly is this app's entire job and there is already a
blocking call in front of every reply — but that is a judgment, and it is now
a measurable one.

### 4. Shorten the analysis prompt

At 769 tokens sent on every single message, `ANALYSIS_PROMPT` is now the
largest fixed cost in the app — about a fifth of a turn.

Caching it does not work, and this was tested rather than assumed: sending it
with `cache_control` returns `cache_creation_input_tokens: 0` on both a first
and second identical call. It sits below Haiku 4.5's minimum cacheable
prefix, and falling short of that minimum fails **silently** — no error, no
warning, just no cache. Padding it past the minimum would cost more than it
saves. The only real lever is to make it shorter.

### 5. Things considered and rejected

- **Batch API — 50% off both directions.** Incompatible with this design.
  The analysis has to finish before the reply is generated, because that is
  what lets the companion respond to what a message just revealed. Batching
  it would trade the feature for the discount.
- **1-hour cache TTL.** Costs 2x on write and pays off after two reads.
  Conversation turns are usually seconds apart, well inside the 5-minute
  default. Worth revisiting only if `usage.jsonl` shows reads coming back
  zero after natural pauses.
- **A cheaper chat model.** Not a cost decision. This is the model someone
  talks to on their worst night.

---

## Reading your own numbers

Every API call appends one line to `backend/data/usage.jsonl`:

```json
{"at": "2026-09-08T15:45:10+00:00", "call": "chat", "model": "claude-opus-5",
 "input_tokens": 2, "output_tokens": 70,
 "cache_creation_input_tokens": 82, "cache_read_input_tokens": 613,
 "history_turns": 3}
```

**Counts only, never content.** No message, no reply, no topic. That is
enforced by a test (`test_nothing_the_user_said_is_written_down`) rather than
left to good intentions, and the file is gitignored like everything else a
session produces — it stays on the machine that made it.

To sanity-check the cache is working, look for `cache_read_input_tokens`
climbing across a conversation. If it is zero on every turn, something in the
system prompt is changing that shouldn't be.
