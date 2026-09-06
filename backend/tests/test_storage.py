"""Character and quirk storage.

Both loaders must tolerate a missing file: that is the state of a fresh
clone, since the real data files are gitignored and never shipped.
"""
import companion
import quirks


class TestCharacter:
    def test_missing_file_is_empty(self):
        assert companion.load_character() == {}

    def test_round_trip(self, character):
        companion.save_character(character)
        assert companion.load_character() == character

    def test_delete(self, character):
        companion.save_character(character)
        companion.delete_character()
        assert companion.load_character() == {}

    def test_delete_when_absent_is_not_an_error(self):
        companion.delete_character()
        assert companion.load_character() == {}


class TestQuirks:
    def test_missing_file_is_empty(self):
        assert quirks.load_quirks() == {}

    def test_new_topic_starts_low(self):
        stored = quirks.update_quirk('french toast', 'positive', 2, 'food')
        assert stored['french toast']['confidence'] == 'LOW'
        assert stored['french toast']['mentions'] == 1

    def test_confidence_climbs_with_mentions(self):
        for _ in range(3):
            stored = quirks.update_quirk('french toast', 'positive', 2, 'food')
        assert stored['french toast']['confidence'] == 'MEDIUM'
        for _ in range(2):
            stored = quirks.update_quirk('french toast', 'positive', 2, 'food')
        assert stored['french toast']['confidence'] == 'HIGH'

    def test_score_is_capped_at_five(self):
        for _ in range(20):
            stored = quirks.update_quirk('zhu', 'positive', 3, 'music')
        assert stored['zhu']['score'] <= 5.0

    def test_score_never_goes_below_zero(self):
        for _ in range(10):
            stored = quirks.update_quirk('crowds', 'negative', 3, 'other')
        assert stored['crowds']['score'] >= 0.0

    def test_topics_are_normalised(self):
        quirks.update_quirk('  French Toast  ', 'positive', 2, 'food')
        assert 'french toast' in quirks.load_quirks()

    def test_forget_is_case_insensitive(self):
        quirks.update_quirk('french toast', 'positive', 2, 'food')
        assert quirks.forget_quirk('French Toast') is True
        assert quirks.load_quirks() == {}

    def test_forgetting_something_absent_is_not_an_error(self):
        assert quirks.forget_quirk('nothing') is False

    def test_clear(self):
        quirks.update_quirk('zhu', 'positive', 2, 'music')
        quirks.clear_quirks()
        assert quirks.load_quirks() == {}
