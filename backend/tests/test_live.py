"""Real API calls -- opt-in, and hard-capped.

    COLUMBA_LIVE=1 pytest backend/tests/test_live.py

Skipped by default so the ordinary suite stays free and deterministic. What
these cover is the one thing a fake client cannot: that the prompts we send
still produce the shape we parse. The fenced-JSON bug lived exactly there.

MAX_CALLS is enforced, not documented -- an accidental loop here spends real
money, so the counter fails the run rather than trusting the tests to behave.
"""
import os

import pytest

import companion

LIVE = os.getenv('COLUMBA_LIVE') == '1'
pytestmark = pytest.mark.skipif(not LIVE, reason='set COLUMBA_LIVE=1 to spend real API calls')

#: Total requests this file may make. Two conversation turns plus their
#: extraction passes, and nothing more.
MAX_CALLS = 5


@pytest.fixture(autouse=True)
def capped(monkeypatch):
    """Wrap the real client and stop the run if this file gets greedy."""
    real_create = companion.client.messages.create
    state = {'calls': 0}

    def counted(**kwargs):
        state['calls'] += 1
        if state['calls'] > MAX_CALLS:
            raise AssertionError(
                f'live tests exceeded MAX_CALLS ({MAX_CALLS}) -- refusing to keep spending'
            )
        return real_create(**kwargs)

    monkeypatch.setattr(companion.client.messages, 'create', counted)
    return state


def test_extraction_returns_the_shape_we_parse(capped):
    """The silent pass must come back as parseable JSON with the right keys."""
    result = companion.extract_quirks(
        'made french toast on sunday and put on some zhu, best part of the week'
    )
    assert isinstance(result, dict)
    assert 'found' in result
    if result['found']:
        for quirk in result['quirks']:
            assert set(quirk) >= {'topic', 'sentiment', 'enthusiasm', 'category'}
            assert quirk['sentiment'] in ('positive', 'negative')
            assert quirk['category'] in ('music', 'food', 'sports', 'hobby', 'media', 'place')


def test_extraction_ignores_feelings_and_sensitive_ground(capped):
    """The tightened brief: moods and health are not preferences."""
    result = companion.extract_quirks(
        'i have been anxious in crowds and drinking more than i want to, '
        'and trying to build up the courage to text her back'
    )
    topics = [q['topic'] for q in result.get('quirks', [])]
    assert topics == [], f'expected nothing recordable, got {topics}'


def test_a_real_conversation_turn(capped, character):
    """One full round trip, exactly as /chat runs it."""
    reply, history = companion.chat('hey, rough week', [], character)
    assert isinstance(reply, str) and reply.strip()
    assert len(history) == 2
    assert history[0]['role'] == 'user'
    assert history[1]['role'] == 'assistant'
