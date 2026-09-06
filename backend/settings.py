"""App settings the user controls.

Only what someone can switch. The character is their companion, quirks and
sensitivities are what it has noticed; this is the handful of choices about
how the app itself behaves.
"""
import json
import os

SETTINGS_FILE = os.path.join(os.path.dirname(__file__), 'data/settings.json')

#: Sensitivities default ON. Defensible because the list is visible, is
#: deletable item by item, and the whole feature can be switched off -- and
#: because the harm it prevents (suggesting a drink to someone working on
#: their drinking) is real and immediate.
DEFAULTS = {
    'sensitivities_enabled': True,
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
    """Apply a partial update. Unknown keys are ignored, not stored."""
    settings = load_settings()
    for key, value in (updates or {}).items():
        if key in DEFAULTS:
            settings[key] = bool(value) if isinstance(DEFAULTS[key], bool) else value

    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(settings, f, indent=2)
    return settings
