"""What actually reaches the model.

Every setting someone chose has to survive into the system prompt. This
suite exists because a line was once deleted while editing an adjacent one,
and the companion would have quietly stopped using the chosen tone with
nothing failing anywhere.
"""
import companion
import quirks


class TestSystemPrompt:
    def test_carries_every_setting(self, character):
        prompt = companion.build_system_prompt(character)
        for expected in ('juno', '31-40', 'nonbinary', 'playful'):
            assert expected in prompt, f'{expected!r} missing from the system prompt'

    def test_carries_the_crisis_line(self, character):
        assert '988' in companion.build_system_prompt(character)

    def test_high_and_low_stats_read_differently(self, character):
        character['stats']['real_talk'] = 5
        blunt = companion.build_system_prompt(character)
        character['stats']['real_talk'] = 1
        gentle = companion.build_system_prompt(character)
        assert blunt != gentle

    def test_no_quirks_means_no_quirk_section(self, character):
        assert 'Things you know about this user' not in companion.build_system_prompt(character)

    def test_quirks_are_appended_when_they_exist(self, character):
        for _ in range(3):
            quirks.update_quirk('french toast', 'positive', 2, 'food')
        assert 'french toast' in companion.build_system_prompt(character)


class TestQuirkContext:
    def _confident(self, topic):
        for _ in range(3):
            quirks.update_quirk(topic, 'positive', 2, 'food')

    def test_empty_profile_produces_nothing(self):
        assert quirks.build_quirks_context() == ''

    def test_low_confidence_alone_produces_nothing(self):
        quirks.update_quirk('green curry', 'positive', 2, 'food')
        assert quirks.build_quirks_context() == ''

    def test_low_confidence_is_filtered_out(self):
        self._confident('french toast')
        quirks.update_quirk('green curry', 'positive', 2, 'food')
        context = quirks.build_quirks_context()
        assert 'french toast' in context
        assert 'green curry' not in context

    def test_carries_the_never_announce_rule(self):
        self._confident('french toast')
        context = quirks.build_quirks_context()
        assert 'Never announce what you know' in context
        assert 'Silence is always better' in context
