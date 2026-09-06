# backend/data

## What lives here

| File | Committed? | What it is |
|---|---|---|
| `character.example.json` | ✅ yes | Sample companion config — shows the shape `POST /character` expects |
| `quirks.example.json` | ✅ yes | Sample quirks profile — shows the shape `GET /quirks` returns |
| `character.json` | ❌ **never** | A real person's companion |
| `quirks.json` | ❌ **never** | A real person's quirks profile |

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
