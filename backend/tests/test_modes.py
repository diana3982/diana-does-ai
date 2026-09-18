"""What the person asked for, and the one thing it must never override.

Modes replaced the `creativity` slider. The slider set how often creative
outlets came up and labelled its lowest rung "grounded and practical", so
someone wanting practical help chose the rung that gave them least of
everything. Modes exist so that "give me advice" and "just listen" are
things a person can actually ask for.

The load-bearing test in this file is not that each mode reads differently.
It is that `listen` -- the only mode that tells the companion to withhold --
cannot withhold crisis guidance. Someone choosing "just listen" on a bad
night is precisely the person that carve-out is for, so it is pinned at
every intensity rather than once.
"""
import pytest

import companion
import modes
import settings


@pytest.fixture
def prompt_for(character):
    """The system prompt built with a given mode in force."""
    def build(mode, intensity=None):
        settings.save_settings({'mode': mode})
        return companion.build_system_prompt(character, intensity=intensity)
    return build


class TestEachModeReadsDifferently:
    @pytest.mark.parametrize('mode', sorted(modes.MODES))
    def test_the_chosen_mode_is_the_only_one_in_the_prompt(self, prompt_for, mode):
        # Both halves. Presence alone would pass if every mode were emitted
        # at once, which is the likeliest way this breaks -- and a companion
        # told to both withhold and advise is worse than either.
        prompt = prompt_for(mode)

        assert modes.MODES[mode] in prompt
        for other in modes.MODES:
            if other != mode:
                assert modes.MODES[other] not in prompt

    def test_the_slider_it_replaced_is_gone(self, prompt_for):
        assert 'Creativity level' not in prompt_for('unpack')


class TestSafety:
    """A mode may shape the answer. It may not reach the crisis line."""

    @pytest.mark.parametrize('mode', sorted(modes.MODES))
    def test_988_survives_every_mode(self, prompt_for, mode):
        assert '988' in prompt_for(mode)

    @pytest.mark.parametrize('intensity', [None, 'light', 'medium', 'heavy'])
    def test_just_listen_keeps_its_carve_out_at_every_intensity(self, prompt_for, intensity):
        # "Do not offer suggestions" is about advice, never about safety.
        # Pinned per tier because the tier is decided by a model, so the
        # unlucky combination is the one nobody would have tried by hand.
        prompt = prompt_for('listen', intensity=intensity)

        assert modes.SAFETY in prompt
        assert '988' in prompt

    def test_the_only_withholding_mode_carries_the_carve_out(self):
        # `listen` is the one mode that tells the companion to hold back, so
        # it is the one that could hold back the wrong thing. If a second
        # withholding mode is ever added, it belongs in this assertion --
        # which is the point of naming the rule rather than inlining it.
        assert modes.SAFETY in modes.MODES['listen']


class TestFallingBack:
    """A settings file is a file, and files get edited by hand."""

    @pytest.mark.parametrize('value', ['nonsense', '', None, 5, 'LISTEN'])
    def test_anything_unrecognised_lands_on_the_default(self, value):
        assert modes.rule_for(value) == modes.MODES[modes.DEFAULT_MODE]

    def test_a_known_mode_is_returned_as_itself(self):
        assert modes.rule_for('advice') == modes.MODES['advice']

    def test_the_default_is_a_mode_that_exists(self):
        # Trivial until someone renames a key and not the default.
        assert modes.DEFAULT_MODE in modes.MODES

    def test_it_recognises_its_own_modes_and_nothing_else(self):
        assert modes.is_mode('listen') is True
        assert modes.is_mode('listening') is False


class TestWhatCanBeStored:
    """`mode` is the first setting with a fixed set of values."""

    def test_a_real_mode_is_saved(self):
        assert settings.save_settings({'mode': 'listen'})['mode'] == 'listen'

    @pytest.mark.parametrize('value', ['nonsense', '', None, 5, True])
    def test_a_value_that_is_not_a_mode_is_refused(self, value):
        settings.save_settings({'mode': 'advice'})

        # Refused, and the previous choice is left standing -- a bad write
        # must not quietly reset someone to the default either.
        assert settings.save_settings({'mode': value})['mode'] == 'advice'
        assert settings.load_settings()['mode'] == 'advice'

    def test_a_settings_file_from_before_modes_gets_the_default(self, isolated_data):
        (isolated_data / 'settings.json').write_text('{"sensitivities_enabled": true}')

        assert settings.load_settings()['mode'] == modes.DEFAULT_MODE

    def test_a_refused_mode_does_not_block_the_rest_of_the_update(self):
        saved = settings.save_settings({'mode': 'nonsense', 'sensitivities_enabled': False})

        assert saved['sensitivities_enabled'] is False
        assert saved['mode'] == modes.DEFAULT_MODE
