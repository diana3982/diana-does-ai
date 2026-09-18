"""App settings the user controls.

Only what someone can switch. The character is their companion, quirks and
sensitivities are what it has noticed; this is the handful of choices about
how the app itself behaves.
"""
import json
import os

from modes import DEFAULT_MODE, is_mode

SETTINGS_FILE = os.path.join(os.path.dirname(__file__), 'data/settings.json')

#: Sensitivities default ON. Defensible because the list is visible, is
#: deletable item by item, and the whole feature can be switched off -- and
#: because the harm it prevents (suggesting a drink to someone working on
#: their drinking) is real and immediate.
#:
#: `mode` is what the person has asked the companion for right now -- see
#: modes.py. It sits here rather than in the character config because it is
#: about what someone wants today, not about who their companion is.
DEFAULTS = {
    'sensitivities_enabled': True,
    'mode': DEFAULT_MODE,
}


def load_settings():
    """Defaults, overlaid with whatever has been saved.

    Merging onto DEFAULTS rather than returning the file means a settings
    file written by an older version is still valid.
    """
    settings = dict(DEFAULTS)
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, 'r') as f:
            saved = json.load(f)
        for key in DEFAULTS:
            if key in saved:
                settings[key] = saved[key]
    return settings


def save_settings(updates):
    """Apply a partial update. Unknown keys are ignored, not stored.

    So is a value a setting has no room for. The bool coercion below keys off
    the type of the default, which means a setting whose default is a string
    was stored exactly as sent -- `mode` would have accepted any word at all,
    and the prompt would have carried it. Guarding on the way in is what the
    rest of this app does: validate_character and _clean_quirks both refuse
    at the boundary so everything downstream can index freely.
    """
    settings = load_settings()
    for key, value in (updates or {}).items():
        if key not in DEFAULTS:
            continue
        if isinstance(DEFAULTS[key], bool):
            value = bool(value)
        # One explicit guard rather than a registry of validators: `mode` is
        # the only setting with a fixed set of values, and one of them does
        # not earn the indirection. A second one is when to generalise.
        elif key == 'mode' and not is_mode(value):
            continue
        settings[key] = value

    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(settings, f, indent=2)
    return settings
