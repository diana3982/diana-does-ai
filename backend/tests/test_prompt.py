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


class TestAffirmationAnswersToCompassion:
    """Warmth is a setting, and the opening affirmation was ignoring it.

    UAT 1 set compassion to 1 and still felt over-validated. The reason was
    structural: the opening affirmation sat in the rules list as its own
    instruction, so no dial reached it. Someone could turn warmth all the
    way down and still be met with a reflection of their own words.

    Each test asserts both that the right rule is present and that the other
    one is absent. Presence alone would pass if both were emitted, which is
    the most likely way this breaks -- the negative half is the test.
    """
    OPENS_WARM = 'Begin your very first response with a brief affirmation'
    GETS_TO_THE_POINT = 'Do not open with an affirmation'

    def build(self, character, compassion, intensity=None):
        character['stats']['compassion'] = compassion
        return companion.build_system_prompt(character, intensity=intensity)

    def test_a_warm_companion_still_opens_with_one(self, character):
        prompt = self.build(character, 5)

        assert self.OPENS_WARM in prompt
        assert self.GETS_TO_THE_POINT not in prompt

    def test_a_measured_companion_answers_the_question_instead(self, character):
        prompt = self.build(character, 1)

        assert self.GETS_TO_THE_POINT in prompt
        assert self.OPENS_WARM not in prompt

    def test_the_boundary_sits_where_the_descriptor_does(self, character):
        # compassion_desc calls <= 2 "measured and calm". The affirmation
        # follows the same split rather than inventing a second one.
        assert self.GETS_TO_THE_POINT in self.build(character, 2)
        assert self.OPENS_WARM in self.build(character, 3)

    def test_a_heavy_conversation_is_met_warmly_whatever_the_dial_says(self, character):
        # The same override real_talk gets, for the same reason: a setting
        # chosen on an ordinary day should not decide how someone is met on
        # the worst one.
        prompt = self.build(character, 1, intensity='heavy')

        assert self.OPENS_WARM in prompt
        assert self.GETS_TO_THE_POINT not in prompt

    def test_a_light_conversation_does_not_get_that_override(self, character):
        # Pins the override to 'heavy' specifically. Without this, widening
        # it to every intensity would pass everything above.
        assert self.GETS_TO_THE_POINT in self.build(character, 1, intensity='light')
        assert self.GETS_TO_THE_POINT in self.build(character, 1, intensity='medium')


class TestHowSuggestionsAreOffered:
    """UAT 1 asked for suggestions delivered like a friend's, not a list.

    These are presence checks, not behaviour checks -- whether the model
    actually lands the register can only be read in a real conversation.
    What they defend against is the failure this file was written for: a
    line deleted while editing the one next to it.
    """

    def test_a_suggestion_is_offered_not_prescribed(self, character):
        prompt = companion.build_system_prompt(character)

        assert 'have you tried' in prompt
        assert 'never a list of options' in prompt

    def test_the_companion_does_not_borrow_a_life_it_does_not_have(self, character):
        # The one rule here with a real cost attached. Claiming to have been
        # through what someone just disclosed is the kind of thing that
        # retroactively poisons every warm thing the companion said.
        prompt = companion.build_system_prompt(character)

        assert 'Do not speak from your own experience' in prompt
        assert 'never claim to' in prompt

    def test_it_still_sounds_its_age(self, character):
        # The two rules could be read as contradicting each other, so both
        # stay pinned: the age shapes the voice, and is not a history to
        # narrate.
        prompt = companion.build_system_prompt(character)

        assert 'how much you have\nlived through' in prompt or 'lived through' in prompt
        assert 'not a history you narrate' in prompt


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
