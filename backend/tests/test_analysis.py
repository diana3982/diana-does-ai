"""Phase 3.5 -- what the companion notices in the background.

The rule running through all of it: every field fails safe on its own, and
intensity fails *heavy*. A classifier that fails open is the one bug in this
system that could actually hurt someone.
"""
import pytest

import companion
import sensitivities
import settings


class TestIntensityFailsHeavy:
    @pytest.mark.parametrize('value', [
        None, '', 'nonsense', 'LIGHT', 'severe', 0, 3, True, [], {},
    ])
    def test_anything_unrecognised_becomes_heavy(self, value):
        assert companion.normalise_analysis({'intensity': value})['intensity'] == 'heavy'

    def test_a_missing_field_becomes_heavy(self):
        assert companion.normalise_analysis({})['intensity'] == 'heavy'

    def test_a_reply_that_is_not_an_object_is_entirely_safe(self):
        for raw in ['a string', 42, None, []]:
            assert companion.normalise_analysis(raw) == companion.safe_analysis()

    @pytest.mark.parametrize('tier', ['light', 'medium', 'heavy'])
    def test_valid_tiers_survive(self, tier):
        assert companion.normalise_analysis({'intensity': tier})['intensity'] == tier


class TestSensitivityFloor:
    def test_a_sensitivity_lifts_light_to_medium(self):
        result = companion.normalise_analysis({
            'intensity': 'light',
            'sensitivities': [{'topic': 'drinking', 'kind': 'substance'}],
        })
        assert result['intensity'] == 'medium'

    def test_it_is_a_floor_not_a_ceiling(self):
        result = companion.normalise_analysis({
            'intensity': 'heavy',
            'sensitivities': [{'topic': 'drinking', 'kind': 'substance'}],
        })
        assert result['intensity'] == 'heavy'

    def test_no_sensitivities_leaves_light_alone(self):
        assert companion.normalise_analysis({'intensity': 'light'})['intensity'] == 'light'


class TestCleaning:
    def test_malformed_quirks_are_dropped_not_crashed_on(self):
        # chat() indexes these keys directly: one bad entry from the model
        # would otherwise become a 500 on a message someone just poured out.
        result = companion.normalise_analysis({'quirks': [
            {'topic': 'zhu', 'sentiment': 'positive', 'enthusiasm': 2, 'category': 'music'},
            {'topic': 'broken'},
            {'sentiment': 'positive', 'enthusiasm': 2, 'category': 'food'},
            {'topic': 'x', 'sentiment': 'maybe', 'enthusiasm': 2, 'category': 'food'},
            {'topic': 'y', 'sentiment': 'positive', 'enthusiasm': 9, 'category': 'food'},
            {'topic': 'z', 'sentiment': 'positive', 'enthusiasm': True, 'category': 'food'},
            'not even a dict',
        ]})
        assert [q['topic'] for q in result['quirks']] == ['zhu']

    def test_quirks_are_capped_at_three(self):
        many = [
            {'topic': f't{i}', 'sentiment': 'positive', 'enthusiasm': 1, 'category': 'food'}
            for i in range(10)
        ]
        assert len(companion.normalise_analysis({'quirks': many})['quirks']) == 3

    def test_found_reflects_what_survived_cleaning(self):
        assert companion.normalise_analysis({'found': True, 'quirks': ['junk']})['found'] is False

    def test_topics_are_lowercased(self):
        result = companion.normalise_analysis({'quirks': [
            {'topic': '  French Toast ', 'sentiment': 'positive', 'enthusiasm': 2, 'category': 'food'},
        ]})
        assert result['quirks'][0]['topic'] == 'french toast'

    def test_an_unknown_sensitivity_kind_becomes_other(self):
        result = companion.normalise_analysis({'sensitivities': [{'topic': 'x', 'kind': 'zzz'}]})
        assert result['sensitivities'][0]['kind'] == 'other'

    def test_a_bare_string_sensitivity_still_counts(self):
        result = companion.normalise_analysis({'sensitivities': ['drinking']})
        assert result['sensitivities'][0] == {'topic': 'drinking', 'kind': 'other'}

    @pytest.mark.parametrize('cue,expected', [
        ('she', 'she'), ('HE', 'he'), (' they ', 'they'),
        ('it', None), ('', None), (None, None), (5, None),
    ])
    def test_gender_cues_are_constrained(self, cue, expected):
        assert companion.normalise_analysis({'gender_cue': cue})['gender_cue'] == expected


class TestSensitivityStore:
    def test_noting_one(self):
        sensitivities.note_sensitivity('drinking', 'substance')
        stored = sensitivities.load_sensitivities()
        assert stored['drinking']['kind'] == 'substance'
        assert stored['drinking']['mentions'] == 1

    def test_mentions_accumulate_without_a_score(self):
        sensitivities.note_sensitivity('drinking', 'substance')
        sensitivities.note_sensitivity('drinking', 'substance')
        stored = sensitivities.load_sensitivities()['drinking']
        assert stored['mentions'] == 2
        assert 'score' not in stored and 'confidence' not in stored

    def test_topics_are_normalised(self):
        sensitivities.note_sensitivity('  Drinking  ', 'substance')
        assert 'drinking' in sensitivities.load_sensitivities()

    def test_an_empty_topic_is_ignored(self):
        assert sensitivities.note_sensitivity('   ') is None
        assert sensitivities.load_sensitivities() == {}

    def test_forget_and_clear(self):
        sensitivities.note_sensitivity('drinking', 'substance')
        sensitivities.note_sensitivity('family', 'family')
        assert sensitivities.forget_sensitivity('Drinking') is True
        assert list(sensitivities.load_sensitivities()) == ['family']
        sensitivities.clear_sensitivities()
        assert sensitivities.load_sensitivities() == {}

    def test_forgetting_an_unknown_one_is_not_an_error(self):
        assert sensitivities.forget_sensitivity('nothing') is False


class TestSensitivityContext:
    def test_nothing_known_means_no_instruction(self):
        assert sensitivities.build_sensitivities_context() == ''

    def test_switched_off_means_no_instruction(self):
        sensitivities.note_sensitivity('drinking', 'substance')
        assert sensitivities.build_sensitivities_context(enabled=False) == ''

    def test_it_is_withhold_only(self):
        sensitivities.note_sensitivity('drinking', 'substance')
        context = sensitivities.build_sensitivities_context()
        assert 'drinking' in context
        assert 'never raise any of them yourself' in context
        assert 'never ask after them' in context

    def test_crisis_is_carved_out(self):
        sensitivities.note_sensitivity('drinking', 'substance')
        assert 'crisis' in sensitivities.build_sensitivities_context()


class TestPromptIntegration:
    def test_real_talk_is_capped_when_things_are_heavy(self, character):
        character['stats']['real_talk'] = 5
        heavy = companion.build_system_prompt(character, intensity='heavy')
        ordinary = companion.build_system_prompt(character, intensity='light')

        assert 'never sugarcoating' in ordinary
        assert 'never sugarcoating' not in heavy
        assert 'gentle right now' in heavy

    def test_a_gentle_companion_is_unchanged_by_intensity(self, character):
        character['stats']['real_talk'] = 1
        assert (companion.build_system_prompt(character, intensity='heavy')
                == companion.build_system_prompt(character, intensity='light'))

    def test_crisis_guidance_survives_every_tier(self, character):
        for tier in (None, 'light', 'medium', 'heavy'):
            assert '988' in companion.build_system_prompt(character, intensity=tier)

    def test_the_subject_change_rule_is_present(self, character):
        prompt = companion.build_system_prompt(character)
        assert 'change the subject' in prompt
        assert 'never ask them to confirm' in prompt

    def test_sensitivities_reach_the_prompt(self, character):
        sensitivities.note_sensitivity('drinking', 'substance')
        assert 'drinking' in companion.build_system_prompt(character)

    def test_switching_them_off_keeps_them_out_of_the_prompt(self, character):
        sensitivities.note_sensitivity('drinking', 'substance')
        settings.save_settings({'sensitivities_enabled': False})
        assert 'drinking' not in companion.build_system_prompt(character)


class TestSettings:
    def test_defaults_when_nothing_saved(self):
        assert settings.load_settings() == {'sensitivities_enabled': True}

    def test_sensitivities_default_to_on(self):
        assert settings.load_settings()['sensitivities_enabled'] is True

    def test_saving_a_partial_update(self):
        assert settings.save_settings({'sensitivities_enabled': False}) == {
            'sensitivities_enabled': False,
        }
        assert settings.load_settings()['sensitivities_enabled'] is False

    def test_unknown_keys_are_ignored_not_stored(self):
        assert 'nonsense' not in settings.save_settings({'nonsense': True})

    def test_a_file_from_an_older_version_still_loads(self, isolated_data):
        (isolated_data / 'settings.json').write_text('{}')
        assert settings.load_settings() == settings.DEFAULTS


class TestTestMode:
    def test_off_by_default(self, monkeypatch):
        monkeypatch.delenv('COLUMBA_TEST_MODE', raising=False)
        assert companion.test_mode_enabled() is False

    def test_on_only_for_an_exact_value(self, monkeypatch):
        monkeypatch.setenv('COLUMBA_TEST_MODE', 'yes')
        assert companion.test_mode_enabled() is False
        monkeypatch.setenv('COLUMBA_TEST_MODE', '1')
        assert companion.test_mode_enabled() is True

    def test_no_forced_tier_by_default(self, monkeypatch):
        monkeypatch.delenv('COLUMBA_FORCE_INTENSITY', raising=False)
        assert companion.forced_intensity() is None

    def test_a_nonsense_tier_is_refused(self, monkeypatch):
        monkeypatch.setenv('COLUMBA_FORCE_INTENSITY', 'extremely')
        assert companion.forced_intensity() is None

    @pytest.mark.parametrize('tier', ['light', 'medium', 'heavy'])
    def test_a_valid_tier_is_honoured(self, monkeypatch, tier):
        monkeypatch.setenv('COLUMBA_FORCE_INTENSITY', tier)
        assert companion.forced_intensity() == tier

    def test_forcing_a_tier_never_tells_the_model_anything(self, monkeypatch, character):
        # Saying "this is a test" would change how the companion replies,
        # which invalidates any read on how it actually behaves. Forcing the
        # tier and telling the model are kept separate on purpose.
        monkeypatch.setenv('COLUMBA_TEST_MODE', '1')
        monkeypatch.setenv('COLUMBA_FORCE_INTENSITY', 'heavy')
        prompt = companion.build_system_prompt(character, intensity='heavy')
        assert 'test' not in prompt.lower().replace('latest', '')
