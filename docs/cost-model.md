# What Columba costs to run

Columba uses two models on purpose: `claude-opus-5` for the conversation and
`claude-haiku-4-5` for a silent background pass on every message. The reason
given for that split has always been cost and efficiency. This document is
the evidence for it, because a claim about efficiency with no measurement
behind it is just a preference.

Short version: a 20-turn conversation costs **$0.128**. The same conversation
without either optimization costs **$0.414** — the two together take about
**69%** off. They also compound in a way that wasn't obvious up front, which
is the most interesting thing in here.

---

## How these numbers were produced

Four sources, kept separate on purpose, because they carry different weight:

| | source | confidence |
|---|---|---|
| Prices | Anthropic's published rates, September 2026 | exact |
| Prompt sizes | `client.messages.count_tokens` against the real prompts | exact |
| Per-turn usage | `response.usage` from two live runs — a scripted one and a real session | measured |
| Turn 4 and beyond | extrapolated from the observed growth rate | **estimated** |

Everything through turn 3 is observed. Anything past it is arithmetic on an
observed growth rate, and it is labelled wherever it appears.

**Token counts are model-specific.** Opus 4.7 and later use a newer tokenizer
that produces roughly 30% more tokens for the same text, so every Opus figure
below was re-measured against `claude-opus-5` rather than carried over.
Haiku 4.5 still uses the previous tokenizer.

No conversation content was read to produce any of this. The scripted
measurements redirect storage to a temp directory first, using the same
mechanism test mode uses; the real-session figures come from `usage.jsonl`,
which holds counts and nothing else.

## Prices

| | input | output | cache write (5m) | cache read |
|---|---|---|---|---|
| `claude-opus-5` | $5.00 / MTok | $25.00 / MTok | $6.25 / MTok | $0.50 / MTok |
| `claude-haiku-4-5` | $1.00 / MTok | $5.00 / MTok | $1.25 / MTok | $0.10 / MTok |

Haiku is exactly one fifth of Opus on both input and output. That ratio is
what the dual-model argument rests on, and it is a property of the price
sheet rather than of anything this app does.

## What the prompts weigh

| | tokens |
|---|---|
| `ANALYSIS_PROMPT` — the Haiku system prompt | 770 |
| Chat system prompt — fresh companion, nothing learned | 608 |
| Chat system prompt — 5 quirks rendered | 915 |
| Chat system prompt — a real companion in use | **1,140** |

That last row is the one worth looking at, and it breaks down like this:

| | tokens |
|---|---|
| Character, rules and API overhead | 614 |
| Quirks block — 2 rendered | 218 |
| Sensitivities block — 8 topics | 308 |

**The quirks block is cheap and the confidence gate is why.** That companion
has 47 quirks stored and renders 2 — everything below MEDIUM confidence is
still being verified and never reaches the prompt. A design decision made for
accuracy turns out to be the reason the prompt doesn't grow without bound.

The sensitivities block costs more than the quirks block despite holding
fewer items, because most of it is the withhold-only instruction paragraph
rather than the list. That is a fixed cost paid on every message from the
moment a single sensitivity is noted.

---

## Claim 1: the background pass is cheaper on Haiku

**True, and the number is exact.** The analysis call costs **$0.0012** on
Haiku against **$0.0058** on Opus — 5.0x, holding at any message length,
because Haiku is one fifth of Opus on both dimensions.

What this buys is not only money. The analysis runs *before* the chat call
and blocks it, deliberately: the system prompt is built after the analysis
writes, so the reply already knows whatever the message just revealed. That
puts the background pass on the critical path of every message, which makes
Haiku being the fastest model load-bearing rather than incidental. The
latency half is not yet measured — `usage.jsonl` records tokens, not timings.

## Claim 2: caching pays for the conversation history

**True, larger than the model split, and not free on the first turn.** The
chat call resends the entire conversation every turn, because the API is
stateless. Before caching, that resent history was 78% of chat input tokens
by turn 20.

### Two live runs

**A scripted run against a fresh companion** — nothing learned, short messages:

| turn | uncached in | cache write | cache read | reply out |
|---|---|---|---|---|
| 1 | 2 | 613 | 0 | 83 |
| 2 | 2 | 82 | **613** | 70 |
| 3 | 2 | 79 | **695** | 43 |

**A real session in the running app** — a companion with 47 quirks and 8
sensitivities behind it:

| turn | uncached in | cache write | cache read | reply out |
|---|---|---|---|---|
| 1 | 2 | 1,155 | 0 | 122 |
| 2 | 2 | 127 | **1,155** | 116 |

In both, uncached input falls to **2 tokens**: each turn writes only what is
new and reads everything prior at a tenth of the input price.

### What the difference between them says

| | scripted, fresh | real, in use |
|---|---|---|
| Cached prefix at turn 2 | 613 | **1,155** |
| Reply length | 43–83 | 116–122 |
| Cost per turn (turn 2) | $0.0036 | $0.0055 |
| Saved on turn 2 vs no cache | 31% | **54%** |

A real companion costs more per turn and saves more from caching, and both
come from the same cause: the prompt carries what it has learned about
someone. **The benefit of caching scales with how well the companion knows
you** — the longer someone uses it, the more there is to cache and the more
the cache is worth. Any figure measured against a fresh companion is a floor,
which is why both runs are here rather than the flattering one.

### The first turn costs more, not less

Cache writes bill at 1.25x the input price, so turn 1 is **$0.0102 cached
against $0.0088 uncached** — about 16% worse. It is ahead from turn 2 onward
and never looks back. Worth stating plainly: a benchmark that stopped after
one message would conclude caching made things worse.

## Why Opus 5 and not Opus 4.5

Opus 4.5 and Opus 5 cost exactly the same per token — $5 in, $25 out. So the
obvious question is whether the newer model is worth anything, given that
Opus 4.7 and later use a tokenizer that emits roughly **30% more tokens for
the same text**. More tokens at the same price is more money, and on that
reasoning Opus 4.5 looks like the cheaper choice.

Measured, it isn't, and the reason is caching.

| | Opus 4.5 | Opus 5 |
|---|---|---|
| The same system prompt | 851 tokens | 1,140 tokens |
| Minimum cacheable prefix | 1,024 | 512 |
| Cache writes over 3 live turns | **0** | 613, 82, 79 |

**Caching never engaged on Opus 4.5.** Three real turns with the real prompt
returned `cache_creation_input_tokens: 0` every time — the prefix (958, 995,
1,046 tokens) sits under its minimum, and falling short fails silently. Every
one of those tokens billed at the full $5/MTok. On Opus 5 the same
conversation caches from the first turn and reads at $0.50.

So the tokenizer penalty is real and lands almost entirely on tokens billed
at a tenth of the price, while the older model pays full freight on
everything:

| turns | Opus 4.5, uncached | Opus 5, cached | |
|---|---|---|---|
| 2 | $0.0167 | $0.0169 | 4.5 ahead by 1% |
| 5 | $0.0453 | $0.0339 | **Opus 5 is 25% cheaper** |
| 10 | $0.1025 | $0.0635 | **38% cheaper** |
| 20 | $0.2524 | $0.1275 | **49% cheaper** |
| 40 | $0.6949 | $0.2745 | **60% cheaper** |

They are level for the first couple of messages and diverge from there. A
newer model that counts more tokens ends up costing roughly half as much,
because what changed wasn't the price — it was what qualifies for the
discount. Comparing the two on token counts alone gives the wrong answer,
which is the argument for measuring rather than reasoning about it.

---

## The two together

Projected from the real session's parameters — a 1,155-token prefix growing
~127 tokens a turn, ~119-token replies:

| | today | cache off | cache off, analysis on Opus | saved |
|---|---|---|---|---|
| 3 turns | $0.0225 | $0.0317 | $0.0459 | 51% |
| 10 turns | $0.0635 | $0.1279 | $0.1753 | 64% |
| 20 turns | **$0.1275** | $0.3193 | $0.4141 | **69%** |
| 40 turns | $0.2745 | $0.8927 | $1.0821 | 75% |

*Turns 1–2 measured; beyond that, extrapolated.*

**They compound, in the direction nobody predicted.** Caching collapses the
chat call, which makes the background pass a *larger* share of what remains —
18% of a turn by turn 20, against 4% before caching. Optimizing the expensive
half made the cheap half matter more, not less. Anyone reasoning about which
of the two to keep would get the answer wrong by looking at either alone.

---

## What is not optimized yet

Ordered by expected size. Each has a reason it hasn't been done, because a
roadmap without those is a wish list.

### 1. Cap the prefix instead of letting it grow — Phase 7

The cached prefix grows every turn and never shrinks. Cache reads are cheap,
not free, so a long conversation still creeps upward — and eventually meets
the context window regardless of price.

The rolling summary planned for Phase 7 was scoped as a memory feature: keep
the feeling of being remembered without keeping every word. It is also the
only lever that *bounds* this curve rather than discounting it. Two
arguments, one piece of work.

### 2. Move volatile content out of the system prompt

The system prompt renders *before* the messages, so anything that changes in
it invalidates the whole cached conversation behind it. Three things can
change mid-conversation: the heavy-intensity real-talk override, a quirk
crossing into MEDIUM confidence, and a newly noted sensitivity.

Opus 5 supports mid-conversation system messages — a `{"role": "system"}`
entry appended to `messages` rather than an edit to the top-level `system`
field. Moving the volatile parts there would leave a frozen system prompt in
front of a cache that stops being thrown away.

**Deliberately not done yet.** It restructures the prompt of an emotional
support app to save money, and the size of the prize depends on how often
those three things actually change in a real conversation — which
`usage.jsonl` can now answer, by showing how often `cache_read_input_tokens`
comes back zero when it shouldn't. Measure, then restructure. One cheap piece
is already done: the quirks block is sorted rather than insertion-ordered, so
a re-learned quirk can't reorder the prompt and cost a miss for nothing.

### 3. Trim the sensitivities instruction

308 tokens on every message once a single sensitivity exists, most of it the
fixed instruction paragraph rather than the list. It is carefully written and
it is doing real work, so this is an edit to make slowly — but it is the
largest single block in the prompt that is prose rather than data.

### 4. Shorten the analysis prompt

At 770 tokens sent on every message, `ANALYSIS_PROMPT` is the largest fixed
cost on the Haiku side.

Caching it does not work, and this was tested rather than assumed: sent with
`cache_control`, it returns `cache_creation_input_tokens: 0` on both a first
and a second identical call. It sits below Haiku 4.5's minimum cacheable
prefix, and falling short of that minimum fails **silently** — no error, no
warning, no cache. Padding it past the minimum would cost more than it saves.
The only real lever is to make it shorter.

### 5. Tune effort

`output_config.effort` is `medium`. Opus 5 is unusually strong at the lower
levels and effort is the primary cost and latency lever, so `low` is the
obvious next experiment. `medium` was chosen because reading someone
correctly is this app's entire job and there is already a blocking call in
front of every reply — a judgment, but now a measurable one.

### 6. Considered and rejected

- **Batch API — 50% off both directions.** Incompatible with this design.
  The analysis must finish before the reply is generated; that is what lets
  the companion respond to what a message just revealed. Batching it would
  trade the feature for the discount.
- **1-hour cache TTL.** Costs 2x on write, pays off after two reads. Turns
  are usually seconds apart, well inside the 5-minute default. Revisit only
  if `usage.jsonl` shows reads coming back zero after natural pauses.
- **A cheaper chat model.** Not a cost decision. This is the model someone
  talks to on their worst night.

---

## Reading your own numbers

Every API call appends one line to `backend/data/usage.jsonl`:

```json
{"at": "2026-09-08T16:25:10+00:00", "call": "chat", "model": "claude-opus-5",
 "input_tokens": 2, "output_tokens": 116,
 "cache_creation_input_tokens": 127, "cache_read_input_tokens": 1155,
 "history_turns": 3}
```

**Counts only, never content.** No message, no reply, no topic. That is
enforced by a test (`test_nothing_the_user_said_is_written_down`) rather than
left to good intentions, and the file is gitignored like everything else a
session produces — note that the `*.json` rule doesn't match `.jsonl`, so it
has its own line.

To check the cache is working, watch `cache_read_input_tokens` climb across a
conversation. If it is zero on every turn, something in the system prompt is
changing that shouldn't be.
