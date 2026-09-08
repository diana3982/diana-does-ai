"""Every place this app writes to disk, in one list.

Two very different things need to know the complete set of stores: the
test-mode redirect in app.py, and the isolation fixture in tests/conftest.py.
Both exist for the same reason -- to keep something away from a real person's
data -- and both fail silently and completely if a store is added and only
one of them is updated. That is not hypothetical: sensitivities.py and
settings.py were each written without updating conftest, and each wrote a
real file during a test run before anyone noticed.

Keeping the list in one place makes adding a store a single edit, and makes
forgetting a single edit rather than a leak.
"""
import os

import companion
import quirks
import sensitivities
import settings
import usage

#: (module, constant name, filename).
#:
#: The redirect reassigns the module-level constant rather than passing a
#: path around. That covers every caller at once, including ones written
#: later by someone who never read this file -- which is the whole point.
STORES = (
    (companion, 'CHARACTER_FILE', 'character.json'),
    (quirks, 'QUIRKS_FILE', 'quirks.json'),
    (sensitivities, 'SENSITIVITIES_FILE', 'sensitivities.json'),
    (settings, 'SETTINGS_FILE', 'settings.json'),
    (usage, 'USAGE_FILE', 'usage.jsonl'),
)


def redirect_to(directory):
    """Point every store at `directory` instead of backend/data/."""
    for module, constant, filename in STORES:
        setattr(module, constant, os.path.join(directory, filename))
