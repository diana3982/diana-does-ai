"""What each API call actually cost, in tokens.

Written so a claim about this app's efficiency can be checked rather than
asserted. The dual-model split and the prompt cache are both cost arguments,
and an argument with no measurement behind it is just a preference.

**This file records counts and never content.** No message, no reply, no
quirk, no topic -- only the numbers the API hands back plus which call they
came from. That is structural, not a convention: `record()` reads named
numeric fields off the response and has no way to reach the text. It stays
local and gitignored like everything else the user's session produces.

**What may go in here: the line.** Everything in this file answers "did the
system work?" -- never "how was this person doing?". That test decides every
field, including ones added later.

  Allowed, because they describe the machinery:
    duration_ms              how long a call took
    refusal                  whether the chat model declined (0/1)
    user_profile_found       profile fields the model offered this message
    user_profile_saved       profile fields whose value actually changed
    user_profile_referenced  whether the profile was put in the prompt (0/1)
    history_turns            conversation length

  Never allowed, even as counts:
    intensity per turn       a column reading heavy at 2am, 3am, 4am is a
                             mood diary, whatever format it is kept in
    crisis / 988 triggers    a health record
    profile field names      "pronouns: 1" is the specificity the generic
    or values                user_profile_* names exist to avoid

The dangerous fields are the ones that look harmless as numbers. Intensity
is only a tier and crisis is only a flag -- but *when* they happened is
enough to reconstruct someone's hardest night, and that is not the app's to
keep.
"""
import json
import os
from datetime import datetime, timezone

USAGE_FILE = os.path.join(os.path.dirname(__file__), 'data/usage.jsonl')

#: Only these come off the usage object. Anything the API adds later is
#: ignored until it is added here on purpose -- a log that quietly widens
#: is how content ends up somewhere it was never meant to be.
FIELDS = (
    'input_tokens',
    'output_tokens',
    'cache_creation_input_tokens',
    'cache_read_input_tokens',
)


def record(call, model, response, **counts):
    """Append one line for one API call. Never raises.

    A failure here must never cost someone their message, so everything is
    swallowed. Instrumentation that can take down the thing it measures is
    worse than no instrumentation.

    :param call:     'chat' or 'analysis'
    :param model:    the model id the call was made against
    :param response: the API response, read for `.usage` only
    :param counts:   extra integers worth keeping (e.g. history_turns)
    """
    try:
        usage = getattr(response, 'usage', None)
        entry = {
            'at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
            'call': call,
            'model': model,
        }
        for field in FIELDS:
            value = getattr(usage, field, None)
            entry[field] = value if isinstance(value, int) else 0
        for key, value in counts.items():
            if isinstance(value, int):
                entry[key] = value

        os.makedirs(os.path.dirname(USAGE_FILE), exist_ok=True)
        with open(USAGE_FILE, 'a') as f:
            f.write(json.dumps(entry) + '\n')
    except Exception as e:                       # noqa: BLE001
        print(f'Usage logging error (ignored): {e}')


def load_usage():
    """Every recorded call, oldest first. Malformed lines are skipped."""
    if not os.path.exists(USAGE_FILE):
        return []
    entries = []
    with open(USAGE_FILE, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return entries
