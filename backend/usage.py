"""What each API call actually cost, in tokens.

Written so a claim about this app's efficiency can be checked rather than
asserted. The dual-model split and the prompt cache are both cost arguments,
and an argument with no measurement behind it is just a preference.

**This file records counts and never content.** No message, no reply, no
quirk, no topic -- only the numbers the API hands back plus which call they
came from. That is structural, not a convention: `record()` reads named
numeric fields off the response and has no way to reach the text. It stays
local and gitignored like everything else the user's session produces.
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
