# backend/data

## What lives here

| File | Committed? | What it is |
|---|---|---|
| `character.example.json` | ✅ yes | Sample companion config — shows the shape `POST /character` expects |
| `quirks.example.json` | ✅ yes | Sample quirks profile — shows the shape `GET /quirks` returns |
| `character.json` | ❌ **never** | A real person's companion |
| `quirks.json` | ❌ **never** | A real person's quirks profile |
| `profile.json` | ❌ **never** | What a real person said about themselves |
| `profile.example.json` | ✅ yes | The shape `GET /profile` returns |
| `usage.jsonl` | ❌ **never** | Token counts per API call — see below |

## Why the real files are gitignored

Columba is an emotional support companion. What someone tells their companion —
and what it learns about them — is theirs and theirs alone. Think therapist and
patient: the conversation doesn't leave the room.

`quirks.json` is a profile of a real person's interests, and it is built from
things they said while they may have been struggling. That never goes to GitHub,
not in a commit, not in history, not in a fix-up later. It stays on the machine
that created it.

The `.example.json` files exist so anyone reading this repo can understand the
data shapes without a single real user's data being published. **The example
files are fabricated. There is no person behind them.**

## Nothing to set up

Both real files are created automatically the first time they're needed —
`load_character()` and `load_quirks()` return `{}` when the file is absent, and
the save functions create it. A fresh clone runs with no manual steps.

To poke around with sample data instead of starting empty:

```bash
cp character.example.json character.json
cp quirks.example.json quirks.json
```

Those copies are gitignored, so they will not be committed.

## sensitivities.json

Things this person has had a hard time with, so the companion can steer
around them -- a substance they are working on, a relationship that hurts, a
loss. **Withhold-only**: nothing in this file can make the companion raise a
subject, only stop it suggesting one. No scores and no confidence, because
being noticed once is the whole bar: wrongly withholding a brunch suggestion
costs nothing, and missing one costs something real.

Readable and deletable item by item in *my settings*, and the whole feature
can be switched off there.

## settings.json

The handful of choices someone makes about how the app behaves. Missing keys
fall back to defaults, so a file written by an older version still loads.


## profile.json

What this person has told the companion about themselves. Today that is
pronouns; the store is shaped to hold more.

```json
{ "pronouns": "they/them" }
```

Only ever written from an outright statement — never inferred from a name, a
turn of phrase, or anything about how someone writes.

`"none"` is a real value: this person uses **no pronouns**, and the companion
is told never to use he, she or they for them. It is the opposite of `"any"`,
which means use whatever pronouns you like. Absence is never stored as a word
— a message that says nothing about pronouns leaves the file untouched.

**Use, never raise.** A fact here lets the companion understand what someone
says; it never lets it start a subject. Facts go stale in ways nothing here
can detect — a partner becomes an ex, a job ends between two sessions — and
the whole cost of that sits in raising one unprompted. Used only when the
user opens the subject, a stale fact corrects itself on the message that
reveals it.

It survives clearing the chat on purpose. Clearing a conversation should
forget the conversation, not forget who you are.

## usage.jsonl

What each API call cost, in tokens. One JSON object per line:

```json
{"at": "2026-09-13T21:45:10+00:00", "call": "chat", "model": "claude-opus-5",
 "input_tokens": 2, "output_tokens": 70,
 "cache_creation_input_tokens": 82, "cache_read_input_tokens": 613,
 "history_turns": 3, "duration_ms": 2045, "refusal": 0,
 "user_profile_found": 0, "user_profile_saved": 0, "user_profile_referenced": 1}
```

Every field describes whether the system worked, never how the person was
doing — the full list, and what is deliberately left out, is in `usage.py`.

**Counts only, never content.** No message, no reply, no topic — `usage.py`
reads named numeric fields off the API response and has no path to the text.
A test (`test_nothing_the_user_said_is_written_down`) sends a distinctive
string through a real conversation and fails if it turns up in the log.

It is still gitignored and still stays local. Even without content, this is a
record of when someone talked to their companion and for how long, and that
belongs to them. Note that the `*.json` rule does not cover `.jsonl` — there
is a separate line in `.gitignore` for it.

What it is for: `docs/cost-model.md` makes claims about what this app costs
to run, and this file is what lets those claims be checked against real
sessions instead of estimated from list prices.
