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

#: Total requests this file may make. Five analysis passes plus one full
#: conversation turn (which is two calls of its own), and nothing more.
MAX_CALLS = 8


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


def test_analysis_returns_the_shape_we_parse(capped):
    """The silent pass must come back as parseable JSON with the right keys."""
    result = companion.analyze_message(
        'made french toast on sunday and put on some zhu, best part of the week'
    )
    assert isinstance(result, dict)
    assert set(result) == set(companion.safe_analysis())
    assert result['intensity'] in companion.INTENSITY_TIERS
    if result['found']:
        for quirk in result['quirks']:
            assert set(quirk) >= {'topic', 'sentiment', 'enthusiasm', 'category'}
            assert quirk['sentiment'] in ('positive', 'negative')
            assert quirk['category'] in ('music', 'food', 'sports', 'hobby', 'media', 'place')


def test_extraction_ignores_feelings_and_sensitive_ground(capped):
    """The tightened brief: moods and health are not preferences."""
    result = companion.analyze_message(
        'i have been anxious in crowds and drinking more than i want to, '
        'and trying to build up the courage to text her back'
    )
    topics = [q['topic'] for q in result.get('quirks', [])]
    assert topics == [], f'expected nothing recordable, got {topics}'


@pytest.mark.parametrize('message,expected', [
    ('made french toast this morning, pretty good sunday', ('light', 'medium')),
    ("i can't stop crying and i don't see the point in any of it", ('heavy',)),
])
def test_intensity_lands_in_the_right_range(capped, message, expected):
    """The tag the whole tier system rests on, checked against the real model."""
    assert companion.analyze_message(message)['intensity'] in expected


def test_a_hard_thing_is_noticed_as_a_sensitivity(capped):
    result = companion.analyze_message(
        "i have been drinking way more than i want to and it scares me"
    )
    topics = [item['topic'] for item in result['sensitivities']]
    assert topics, 'expected the drinking to be noted as something to steer around'
    # ...and never as a preference.
    assert not any('drink' in quirk['topic'] for quirk in result['quirks'])


def test_a_real_conversation_turn(capped, character):
    """One full round trip, exactly as /chat runs it."""
    reply, history, analysis = companion.chat('hey, rough week', [], character)
    assert isinstance(reply, str) and reply.strip()
    assert len(history) == 2
    assert history[0]['role'] == 'user'
    assert history[1]['role'] == 'assistant'
    assert analysis['intensity'] in companion.INTENSITY_TIERS
