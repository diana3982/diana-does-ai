"""Scoring: how a mention becomes something the companion believes.

This file exists because a mutation sweep found the gap. Flipping
`sentiment == 'positive'` to `!=` in `quirks.py` -- which inverts scoring
outright, so saying you hate something raises your score for it -- broke
nothing in the suite. Neither did moving the "loves"/"likes" thresholds.
The extraction tests cover what gets *pulled out* of a message; nothing
covered what the numbers then do.

That matters more here than the coverage gap suggests. These scores decide
what the companion thinks you love, and `build_quirks_context` says it out
loud in the system prompt. Inverted scoring would not crash anything -- it
would produce a companion that is confidently wrong about someone, which is
the specific failure this app can least afford.

Every test below was checked by breaking the line it covers and watching it
go red. Topics are invented, per CLAUDE.md.
"""
import pytest

import quirks


def score_of(topic):
    return quirks.load_quirks()[topic]['score']


class TestSentimentDirection:
    """Which way the number moves. The sweep's biggest survivor."""

    def test_liking_something_raises_the_score(self):
        quirks.update_quirk('kite flying', 'positive', 2, 'hobby')
        first = score_of('kite flying')
        quirks.update_quirk('kite flying', 'positive', 2, 'hobby')

        assert score_of('kite flying') > first

    def test_disliking_something_lowers_it(self):
        quirks.update_quirk('parsnips', 'positive', 4, 'food')
        first = score_of('parsnips')
        quirks.update_quirk('parsnips', 'negative', 1, 'food')

        assert score_of('parsnips') < first

    def test_a_negative_first_mention_starts_at_zero(self):
        # Not merely "low". A brand-new topic someone brought up to complain
        # about must not begin life looking like a mild preference.
        quirks.update_quirk('parsnips', 'negative', 5, 'food')

        assert score_of('parsnips') == 0.0

    def test_a_positive_first_mention_starts_above_zero(self):
        quirks.update_quirk('kite flying', 'positive', 2, 'hobby')

        assert score_of('kite flying') > 0.0

    def test_enthusiasm_scales_the_first_mention(self):
        quirks.update_quirk('kite flying', 'positive', 1, 'hobby')
        quiet = score_of('kite flying')
        quirks.update_quirk('sea glass', 'positive', 5, 'hobby')

        assert score_of('sea glass') > quiet


class TestScoreBounds:
    """The clamps. Neither end may be crossed, however often it is said."""

    def test_enthusiasm_cannot_push_past_five(self):
        for _ in range(12):
            quirks.update_quirk('kite flying', 'positive', 5, 'hobby')

        assert score_of('kite flying') == 5.0

    def test_repeated_dislike_cannot_go_below_zero(self):
        for _ in range(12):
            quirks.update_quirk('parsnips', 'negative', 5, 'food')

        assert score_of('parsnips') == 0.0


class TestConfidence:
    """LOW until it has been heard enough times to be worth acting on."""

    @pytest.mark.parametrize('mentions,expected', [
        (1, 'LOW'), (2, 'LOW'),
        (3, 'MEDIUM'), (4, 'MEDIUM'),
        (5, 'HIGH'), (9, 'HIGH'),
    ])
    def test_confidence_rises_on_the_documented_counts(self, mentions, expected):
        # Both sides of each boundary, so moving a >= by one is caught.
        for _ in range(mentions):
            quirks.update_quirk('kite flying', 'positive', 1, 'hobby')

        assert quirks.load_quirks()['kite flying']['confidence'] == expected


class TestWhatTheModelIsTold:
    """The wording the score turns into, and its exact boundaries."""

    def seed(self, topic, score, confidence='HIGH'):
        stored = quirks.load_quirks()
        stored[topic] = {
            'score': score, 'mentions': 5,
            'confidence': confidence, 'sentiment': 'positive',
            'category': 'hobby',
        }
        quirks.save_quirks(stored)

    @pytest.mark.parametrize('score,expected', [
        (5.0, 'loves'),
        (3.5, 'loves'),    # on the boundary, not above it
        (3.4, 'likes'),
        (2.0, 'likes'),    # likewise
        (1.9, 'dislikes'),
        (0.0, 'dislikes'),
    ])
    def test_the_label_matches_the_score(self, score, expected):
        self.seed('kite flying', score)

        # The leading "- " is load-bearing, not tidiness: "likes kite flying"
        # is a substring of "dislikes kite flying", so the looser assertion
        # passed even with the 2.0 threshold broken. The mutation sweep
        # caught that in this very test.
        assert f'- {expected} kite flying' in quirks.build_quirks_context()

    def test_unverified_quirks_are_withheld(self):
        # LOW confidence is still being checked; saying it out loud would
        # have the companion assert something it is not sure of.
        self.seed('kite flying', 4.5, confidence='LOW')

        assert quirks.build_quirks_context() == ''

    def test_nothing_known_says_nothing(self):
        assert quirks.build_quirks_context() == ''
