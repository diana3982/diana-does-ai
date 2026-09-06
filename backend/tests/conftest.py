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


# ---------------------------------------------------------------------------
# Run log
#
# Every run drops a short markdown summary in tests/logs/ so a result can be
# looked back at later without re-running anything -- what ran, what came of
# it, and anything worth a second look.
# ---------------------------------------------------------------------------

LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')

#: Timed here rather than read off the reporter -- pytest has renamed that
#: private attribute between versions, and a run log is not worth a crash.
_RUN = {}


def pytest_sessionstart(session):
    import time
    _RUN['started'] = time.time()


def _notable(reporter, live):
    """Anything a reader should notice, beyond pass/fail counts."""
    notes = []

    if live:
        notes.append(
            'Live run -- real API calls were made, capped by MAX_CALLS in test_live.py.'
        )
    else:
        notes.append('Offline run -- no API calls, no cost. Live tests skipped by design.')

    slow = []
    for reports in reporter.stats.values():
        for report in reports:
            duration = getattr(report, 'duration', 0)
            if getattr(report, 'when', None) == 'call' and duration > 1.0:
                slow.append(f'{report.nodeid} ({duration:.1f}s)')
    if slow:
        notes.append('Slow tests (>1s): ' + ', '.join(sorted(slow)))

    if reporter.stats.get('error'):
        notes.append('Collection or fixture errors occurred -- read those before the failures.')

    return notes


def pytest_terminal_summary(terminalreporter, exitstatus, config):
    import datetime

    reporter = terminalreporter
    counts = {
        outcome: len(reporter.stats.get(outcome, []))
        for outcome in ('passed', 'failed', 'error', 'skipped', 'xfailed', 'xpassed')
    }
    live = os.getenv('COLUMBA_LIVE') == '1'
    import time

    started = datetime.datetime.now()
    duration = time.time() - _RUN.get('started', time.time())

    # Group by file, so the log reads like the suite is laid out.
    per_file = {}
    for outcome in ('passed', 'failed', 'skipped'):
        for report in reporter.stats.get(outcome, []):
            # A skip is recorded during setup; everything else during the call.
            allowed = ('setup',) if outcome == 'skipped' else (None, 'call')
            if getattr(report, 'when', None) not in allowed:
                continue
            path = report.nodeid.split('::')[0]
            bucket = per_file.setdefault(path, {'passed': 0, 'failed': 0, 'skipped': 0})
            bucket[outcome] += 1

    lines = [
        f"# Test run — {started:%Y-%m-%d %H:%M:%S}",
        '',
        f"**{'PASSED' if exitstatus == 0 else 'FAILED'}** — "
        f"{counts['passed']} passed, {counts['failed']} failed, "
        f"{counts['skipped']} skipped in {duration:.2f}s",
        '',
        '## By file',
        '',
        '| file | passed | failed | skipped |',
        '| --- | --- | --- | --- |',
    ]
    for path in sorted(per_file):
        b = per_file[path]
        lines.append(f"| `{path}` | {b['passed']} | {b['failed']} | {b['skipped']} |")

    failures = reporter.stats.get('failed', []) + reporter.stats.get('error', [])
    if failures:
        lines += ['', '## Failures', '']
        for report in failures:
            summary = str(getattr(report, 'longrepr', '')).strip().splitlines()
            reason = summary[-1] if summary else 'no detail'
            lines.append(f'- `{report.nodeid}` — {reason}')

    lines += ['', '## Worth noting', '']
    lines += [f'- {note}' for note in _notable(reporter, live)]
    lines.append('')

    os.makedirs(LOG_DIR, exist_ok=True)
    filename = f"{started:%Y-%m-%d_%H%M%S}{'_live' if live else ''}.md"
    with open(os.path.join(LOG_DIR, filename), 'w') as f:
        f.write('\n'.join(lines))

    reporter.write_line(f'run log: tests/logs/{filename}')
