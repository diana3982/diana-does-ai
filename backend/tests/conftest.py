"""Shared fixtures.

The most important thing in this file is `isolated_data`: it is autouse, so
every test in the suite is pointed at a throwaway directory before it runs.
Nothing here can read or write the real character.json or quirks.json, and
that holds for tests written later by someone who never read this comment.
"""
import json
import os
import sys
from types import SimpleNamespace

import pytest

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)

import app as flask_app          # noqa: E402
import companion                 # noqa: E402
import quirks                    # noqa: E402


@pytest.fixture(autouse=True)
def isolated_data(tmp_path, monkeypatch):
    """Point both storage modules at a temp directory. Never opt out."""
    monkeypatch.setattr(companion, 'CHARACTER_FILE', str(tmp_path / 'character.json'))
    monkeypatch.setattr(quirks, 'QUIRKS_FILE', str(tmp_path / 'quirks.json'))
    return tmp_path


@pytest.fixture
def character():
    return {
        'name': 'juno',
        'age': '31-40',
        'gender': 'nonbinary',
        'tone': 'playful',
        'stats': {'compassion': 3, 'real_talk': 3, 'creativity': 3, 'humor': 3},
    }


@pytest.fixture
def fake_model(monkeypatch):
    """Stands in for the Anthropic client, so no test spends money.

    Dispatches on the model name the way the real code does: the haiku call
    is the silent extraction pass and must get JSON back, the opus call is
    the conversation and gets prose. Records every call so a test can assert
    on what was actually sent -- including the system prompt.
    """
    recorder = SimpleNamespace(
        calls=[],
        extraction={'found': False, 'quirks': []},
        reply="hey. i'm here.",
    )

    def create(**kwargs):
        recorder.calls.append(kwargs)
        is_extraction = 'haiku' in kwargs.get('model', '')
        text = json.dumps(recorder.extraction) if is_extraction else recorder.reply
        return SimpleNamespace(content=[SimpleNamespace(text=text)])

    monkeypatch.setattr(companion, 'client', SimpleNamespace(messages=SimpleNamespace(create=create)))
    return recorder


@pytest.fixture
def api(monkeypatch):
    """Flask test client, with the module-level conversation history reset.

    That history is a global (app.py), so without this a test would inherit
    whatever the previous one said.
    """
    monkeypatch.setattr(flask_app, 'conversation_history', [])
    flask_app.app.config['TESTING'] = True
    with flask_app.app.test_client() as client:
        yield client
