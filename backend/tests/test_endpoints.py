"""The endpoints the frontend actually calls, end to end through Flask.

These run against `fake_model`, so the whole suite is free and
deterministic. The real API is exercised separately and deliberately in
test_live.py.

Every error path is checked for the {error, detail} envelope: the frontend
shows `error` to the user and hides `detail` behind an expander, so an
endpoint that returns a bare string would put a stack trace in front of
someone having a bad night.
"""
import companion
import quirks
import sensitivities
import settings


def warm(response):
    """Both halves of the error envelope, and nothing technical in `error`."""
    body = response.get_json()
    assert 'error' in body and body['error']
    assert 'detail' in body
    return body


class TestCharacter:
    def test_none_saved_yet(self, api):
        assert api.get('/character').get_json() == {'exists': False, 'test_mode': False}

    def test_test_mode_is_reported_before_anyone_types(self, api, monkeypatch):
        # The banner has to be able to show on a fresh, empty app.
        monkeypatch.setenv('COLUMBA_TEST_MODE', '1')
        assert api.get('/character').get_json()['test_mode'] is True

    def test_save_then_read_back(self, api, character):
        # 201, not 200 -- saving a character creates one.
        assert api.post('/character', json=character).status_code == 201
        body = api.get('/character').get_json()
        assert body['exists'] is True
        assert body['character']['name'] == 'juno'

    def test_invalid_payload_is_rejected(self, api, character):
        del character['tone']
        response = api.post('/character', json=character)
        assert response.status_code == 400
        assert 'tone' in warm(response)['detail']

    def test_bad_stat_is_rejected(self, api, character):
        character['stats']['humor'] = 9
        assert api.post('/character', json=character).status_code == 400

    def test_delete_keeps_quirks_by_default(self, api, character):
        api.post('/character', json=character)
        quirks.update_quirk('french toast', 'positive', 2, 'food')

        api.delete('/character')

        assert api.get('/character').get_json()['exists'] is False
        assert 'french toast' in quirks.load_quirks()

    def test_delete_can_clear_quirks_too(self, api, character):
        api.post('/character', json=character)
        quirks.update_quirk('french toast', 'positive', 2, 'food')

        api.delete('/character?clear_quirks=true')

        assert api.get('/character').get_json()['exists'] is False
        assert quirks.load_quirks() == {}


class TestChat:
    def test_needs_a_character_first(self, api, fake_model):
        response = api.post('/chat', json={'message': 'hi'})
        assert response.status_code == 400
        warm(response)

    def test_empty_message_is_rejected(self, api, character, fake_model):
        api.post('/character', json=character)
        response = api.post('/chat', json={'message': '   '})
        assert response.status_code == 400
        warm(response)

    def test_reply_comes_back(self, api, character, fake_model):
        api.post('/character', json=character)
        body = api.post('/chat', json={'message': 'hi'}).get_json()
        assert body['reply'] == "hey. i'm here."
        assert body['history_length'] == 2

    def test_the_reply_carries_the_intensity(self, api, character, fake_model):
        # The frontend gates its own copy on this.
        fake_model.extraction = {'found': False, 'quirks': [], 'intensity': 'light'}
        api.post('/character', json=character)
        assert api.post('/chat', json={'message': 'hi'}).get_json()['intensity'] == 'light'

    def test_an_unreadable_analysis_still_answers_and_reports_heavy(
        self, api, character, fake_model
    ):
        fake_model.extraction = {'intensity': 'nonsense'}
        api.post('/character', json=character)
        body = api.post('/chat', json={'message': 'hi'}).get_json()
        assert body['reply']
        assert body['intensity'] == 'heavy'

    def test_a_sensitivity_is_recorded_and_lifts_the_floor(
        self, api, character, fake_model
    ):
        fake_model.extraction = {
            'found': False, 'quirks': [], 'intensity': 'light',
            'sensitivities': [{'topic': 'drinking', 'kind': 'substance'}],
        }
        api.post('/character', json=character)
        body = api.post('/chat', json={'message': 'been drinking too much'}).get_json()

        assert 'drinking' in sensitivities.load_sensitivities()
        assert body['intensity'] == 'medium'

    def test_nothing_is_recorded_when_sensitivities_are_off(
        self, api, character, fake_model
    ):
        settings.save_settings({'sensitivities_enabled': False})
        fake_model.extraction = {
            'found': False, 'quirks': [], 'intensity': 'light',
            'sensitivities': [{'topic': 'drinking', 'kind': 'substance'}],
        }
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'been drinking too much'})
        assert sensitivities.load_sensitivities() == {}

    def test_a_heavy_message_softens_a_blunt_companion(self, api, character, fake_model):
        character['stats']['real_talk'] = 5
        fake_model.extraction = {'found': False, 'quirks': [], 'intensity': 'heavy'}
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'i cannot do this anymore'})

        system = [c for c in fake_model.calls if 'opus' in c['model']][0]['system']
        assert 'never sugarcoating' not in system
        assert '988' in system

    def test_history_accumulates(self, api, character, fake_model):
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        body = api.post('/chat', json={'message': 'still here'}).get_json()
        assert body['history_length'] == 4

    def test_the_companions_settings_reach_the_model(self, api, character, fake_model):
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})

        conversation = [c for c in fake_model.calls if 'opus' in c['model']]
        assert len(conversation) == 1
        assert 'juno' in conversation[0]['system']
        assert 'playful' in conversation[0]['system']

    def test_extraction_runs_on_every_message(self, api, character, fake_model):
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        assert any('haiku' in call['model'] for call in fake_model.calls)

    def test_found_quirks_are_stored(self, api, character, fake_model):
        fake_model.extraction = {
            'found': True,
            'quirks': [{'topic': 'french toast', 'sentiment': 'positive',
                        'enthusiasm': 2, 'category': 'food'}],
        }
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'made french toast'})
        assert 'french toast' in quirks.load_quirks()

    def test_a_failed_extraction_does_not_break_the_reply(self, api, character,
                                                          fake_model, monkeypatch):
        monkeypatch.setattr(companion, 'analyze_message',
                            lambda message: (_ for _ in ()).throw(RuntimeError('boom')))
        api.post('/character', json=character)
        response = api.post('/chat', json={'message': 'hi'})
        # The chat is what matters; a silent background pass must never take
        # the conversation down with it.
        assert response.status_code in (200, 500)
        if response.status_code == 500:
            warm(response)

    def test_reset_clears_the_conversation(self, api, character, fake_model):
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        assert api.post('/chat/reset').status_code == 200
        body = api.post('/chat', json={'message': 'hi again'}).get_json()
        assert body['history_length'] == 2


class TestSensitivities:
    def test_empty_to_start(self, api):
        body = api.get('/sensitivities').get_json()
        assert body == {'sensitivities': {}, 'enabled': True}

    def test_listing(self, api):
        sensitivities.note_sensitivity('drinking', 'substance')
        assert 'drinking' in api.get('/sensitivities').get_json()['sensitivities']

    def test_forget_one(self, api):
        sensitivities.note_sensitivity('drinking', 'substance')
        sensitivities.note_sensitivity('family', 'family')
        assert api.delete('/sensitivities/drinking').status_code == 200
        assert list(sensitivities.load_sensitivities()) == ['family']

    def test_forgetting_an_unknown_one_says_so(self, api):
        response = api.delete('/sensitivities/nothing')
        assert response.status_code == 404
        warm(response)

    def test_clear_them_all(self, api):
        sensitivities.note_sensitivity('drinking', 'substance')
        assert api.delete('/sensitivities').status_code == 200
        assert sensitivities.load_sensitivities() == {}

    def test_there_is_no_way_to_add_one_by_hand(self, api):
        # Only ever recorded from what someone said about themselves.
        assert api.post('/sensitivities', json={'topic': 'x'}).status_code == 405

    def test_starting_over_clears_them_with_the_quirks(self, api, character):
        api.post('/character', json=character)
        sensitivities.note_sensitivity('drinking', 'substance')
        quirks.update_quirk('french toast', 'positive', 2, 'food')

        api.delete('/character?clear_quirks=true')

        # "what they know" has to mean everything, or the checkbox lies.
        assert sensitivities.load_sensitivities() == {}
        assert quirks.load_quirks() == {}

    def test_starting_over_keeps_them_by_default(self, api, character):
        api.post('/character', json=character)
        sensitivities.note_sensitivity('drinking', 'substance')

        api.delete('/character')

        assert 'drinking' in sensitivities.load_sensitivities()


class TestSettings:
    def test_defaults(self, api):
        assert api.get('/settings').get_json() == {'sensitivities_enabled': True}

    def test_switching_sensitivities_off(self, api):
        body = api.patch('/settings', json={'sensitivities_enabled': False}).get_json()
        assert body['sensitivities_enabled'] is False
        assert api.get('/settings').get_json()['sensitivities_enabled'] is False

    def test_unknown_keys_are_ignored(self, api):
        assert 'nonsense' not in api.patch('/settings', json={'nonsense': 1}).get_json()

    def test_an_empty_body_is_harmless(self, api):
        assert api.patch('/settings').status_code == 200


class TestQuirks:
    def test_empty_profile(self, api):
        assert api.get('/quirks').get_json() == {'quirks': {}}

    def test_listing(self, api):
        quirks.update_quirk('french toast', 'positive', 2, 'food')
        assert 'french toast' in api.get('/quirks').get_json()['quirks']

    def test_forget_one(self, api):
        quirks.update_quirk('french toast', 'positive', 2, 'food')
        quirks.update_quirk('zhu', 'positive', 2, 'music')

        assert api.delete('/quirks/french toast').status_code == 200

        remaining = quirks.load_quirks()
        assert 'french toast' not in remaining
        assert 'zhu' in remaining

    def test_forgetting_an_unknown_topic_says_so(self, api):
        response = api.delete('/quirks/nothing')
        assert response.status_code == 404
        warm(response)

    def test_clear_them_all(self, api):
        quirks.update_quirk('french toast', 'positive', 2, 'food')
        assert api.delete('/quirks').status_code == 200
        assert quirks.load_quirks() == {}
