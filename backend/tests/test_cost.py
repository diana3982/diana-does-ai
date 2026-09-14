"""The things that make this app's cost claim true.

docs/cost-model.md says three things: the background pass runs on a model a
fifth the price, conversation history is read from cache rather than paid for
again, and both are measured rather than asserted. Each of those is a
property of the request this code actually sends, so each is tested here.

The privacy test matters most. A usage log is only acceptable because it
holds counts and never content -- if that ever stops being true, this file
is what says so.
"""
import json

import pytest

import companion
import usage
import user_profile


def _call(recorder, model_fragment):
    """The recorded request whose model contains `model_fragment`."""
    for kwargs in recorder.calls:
        if model_fragment in kwargs.get('model', ''):
            return kwargs
    raise AssertionError(f'no {model_fragment} call was made')


class TestModelChoice:
    def test_the_conversation_runs_on_opus(self, api, character, fake_model):
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        assert _call(fake_model, 'opus')['model'] == 'claude-opus-5'

    def test_the_background_pass_runs_on_haiku(self, api, character, fake_model):
        """The whole cost argument. If this ever quietly becomes opus, the
        silent pass gets five times more expensive and nothing looks wrong."""
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        assert 'haiku' in _call(fake_model, 'haiku')['model']

    def test_max_tokens_leaves_room_for_thinking(self, api, character, fake_model):
        """Opus 5 counts thinking against max_tokens. Sized around the reply
        alone -- as it was on 4.5 -- someone gets cut off mid-sentence."""
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        assert _call(fake_model, 'opus')['max_tokens'] >= 4096

    def test_effort_is_set_explicitly(self, api, character, fake_model):
        """Effort is the main cost lever; defaulting to `high` by omission
        is a choice worth making on purpose."""
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        effort = _call(fake_model, 'opus')['output_config']['effort']
        assert effort in ('low', 'medium', 'high')


class TestCaching:
    def test_the_conversation_asks_for_caching(self, api, character, fake_model):
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        assert _call(fake_model, 'opus')['cache_control'] == {'type': 'ephemeral'}

    def test_the_quirks_block_is_ordered(self, character):
        """The system prompt sits in front of the cached prefix, so a line
        that moves for no reason costs a full cache miss."""
        import quirks
        for topic in ('waffles', 'accordion', 'bouldering'):
            for _ in range(3):                       # reach MEDIUM confidence
                quirks.update_quirk(topic, 'positive', 2, 'food')

        prompt = companion.build_system_prompt(character)
        listed = [line for line in prompt.splitlines() if line.startswith('- likes')]
        assert listed == sorted(listed)


class TestUsageLog:
    def test_both_calls_are_recorded(self, api, character, fake_model):
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})

        recorded = usage.load_usage()
        assert {entry['call'] for entry in recorded} == {'analysis', 'chat'}

    def test_counts_are_captured(self, api, character, fake_model):
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})

        chat_entry = next(e for e in usage.load_usage() if e['call'] == 'chat')
        assert chat_entry['input_tokens'] == 1000
        assert chat_entry['output_tokens'] == 200
        assert chat_entry['cache_read_input_tokens'] == 0
        assert 'history_turns' in chat_entry

    def test_nothing_the_user_said_is_written_down(self, api, character, fake_model):
        """The guarantee the whole log rests on.

        A usage log is defensible because it holds numbers. If a field ever
        starts carrying text -- a message, a reply, a topic -- this fails,
        and it should, because that log would then be a transcript.
        """
        secret = 'zzquarkzz'
        fake_model.reply = f'reply mentioning {secret}'
        api.post('/character', json=character)
        api.post('/chat', json={'message': f'i love {secret}'})

        assert usage.load_usage()                     # something was written
        assert secret not in open(usage.USAGE_FILE).read()

    def test_a_broken_log_never_costs_someone_their_message(
            self, api, character, fake_model, monkeypatch):
        """Instrumentation that can take down the thing it measures is
        worse than no instrumentation."""
        monkeypatch.setattr(usage, 'USAGE_FILE', '/nowhere/that/exists/usage.jsonl')
        api.post('/character', json=character)
        response = api.post('/chat', json={'message': 'hi'})
        assert response.status_code == 200

    def test_a_junk_line_does_not_break_reading(self, api, character, fake_model):
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        with open(usage.USAGE_FILE, 'a') as f:
            f.write('not json at all\n')
        assert usage.load_usage()                     # the good lines survive


class TestOpusFiveResponses:
    def test_a_thinking_block_does_not_hide_the_reply(self, api, character, fake_model):
        """content[0] is a thinking block on Opus 5. Indexing it blindly was
        a crash waiting for the first message someone poured out."""
        fake_model.thinking = True
        fake_model.reply = 'here, and glad you said something'
        api.post('/character', json=character)
        response = api.post('/chat', json={'message': 'hi'})
        assert response.get_json()['reply'] == 'here, and glad you said something'

    def test_a_refusal_is_answered_warmly_and_names_the_line(
            self, api, character, fake_model):
        """A declined request arrives as a normal 200. Unhandled, someone
        gets a 500 on the message that was hardest to send."""
        fake_model.stop_reason = 'refusal'
        api.post('/character', json=character)
        response = api.post('/chat', json={'message': 'hi'})

        assert response.status_code == 200
        reply = response.get_json()['reply']
        assert '988' in reply
        assert 'sorry' in reply.lower()

    def test_a_refusal_still_leaves_a_usable_conversation(
            self, api, character, fake_model):
        fake_model.stop_reason = 'refusal'
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        second = api.post('/chat', json={'message': 'ok'})
        assert second.status_code == 200


def _chat_line():
    """The most recent chat entry in the usage log."""
    return [e for e in usage.load_usage() if e['call'] == 'chat'][-1]


def _extract(fake_model, **fields):
    fake_model.extraction = {'found': False, 'quirks': [], 'intensity': 'light', **fields}


class TestDiagnostics:
    """Whether the machinery worked -- never how the person was doing.

    Every field here was added because a question could not be answered
    without it. The pronoun bug that prompted most of them took four wrong
    guesses to find, and was only solved by getting the original message
    back from the companion's own memory. These make the next one visible.
    """

    # ── timing ───────────────────────────────────────────────────────────

    def test_both_calls_are_timed(self, api, character, fake_model):
        """The analysis call blocks every reply, so "Haiku is fast enough"
        was an argument until this measured it."""
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        for entry in usage.load_usage():
            assert isinstance(entry['duration_ms'], int)
            assert entry['duration_ms'] >= 0

    # ── refusal ──────────────────────────────────────────────────────────

    def test_an_ordinary_reply_is_not_a_refusal(self, api, character, fake_model):
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        assert _chat_line()['refusal'] == 0

    def test_a_refusal_is_counted(self, api, character, fake_model):
        """The refusal path is justified by "should never is not cannot".
        This is what finds out which."""
        fake_model.stop_reason = 'refusal'
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        assert _chat_line()['refusal'] == 1

    # ── the profile: found / saved / referenced ──────────────────────────

    def test_nothing_said_nothing_stored(self, api, character, fake_model):
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        line = _chat_line()
        assert (line['user_profile_found'], line['user_profile_saved'],
                line['user_profile_referenced']) == (0, 0, 0)

    def test_said_saved_and_used(self, api, character, fake_model):
        _extract(fake_model, user_pronouns='they/them')
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'i use they/them'})
        line = _chat_line()
        assert (line['user_profile_found'], line['user_profile_saved'],
                line['user_profile_referenced']) == (1, 1, 1)

    def test_offered_but_refused_is_visible(self, api, character, fake_model):
        """The case that could not be told apart before.

        A model answer that the shape check refuses used to look identical
        to the model seeing nothing at all. found: 1, saved: 0 is the
        difference -- a rejection, not a miss.
        """
        _extract(fake_model, user_pronouns='star / stars')      # spaces: refused
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'star / stars please'})
        line = _chat_line()
        assert line['user_profile_found'] == 1
        assert line['user_profile_saved'] == 0

    def test_a_stale_profile_being_fed_to_the_model_shows_up(self, api, character,
                                                             fake_model):
        """The actual harm from the bug, as it would have logged.

        Pronouns on file, a change the model did not catch: nothing found,
        nothing saved -- and the OLD profile still went into the prompt.
        found and saved alone show a miss; referenced shows the stale
        pronouns reaching every reply after it.
        """
        user_profile.set_pronouns('she/her')
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'is it okay to change my pronouns?'})
        line = _chat_line()
        assert (line['user_profile_found'], line['user_profile_saved'],
                line['user_profile_referenced']) == (0, 0, 1)

    def test_restating_is_not_a_change(self, api, character, fake_model):
        """Saved means a value changed, not that a write happened.

        Restating pronouns already on file leaves the system prompt
        byte-identical and cannot cost a cache miss -- so counting it would
        break the correlation this number is most useful for.
        """
        user_profile.set_pronouns('she/her')
        _extract(fake_model, user_pronouns='she/her')
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'i use she/her'})
        line = _chat_line()
        assert line['user_profile_found'] == 1
        assert line['user_profile_saved'] == 0

    def test_referenced_is_checked_against_the_prompt_actually_sent(
            self, api, character, fake_model):
        """Not assumed from the profile having contents -- verified in the
        system prompt that went to the model."""
        user_profile.set_pronouns('xe/xem')
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        sent = _call(fake_model, 'opus')['system']
        assert 'xe/xem' in sent
        assert _chat_line()['user_profile_referenced'] == 1

    # ── the line ─────────────────────────────────────────────────────────

    def test_no_new_field_carries_what_was_said(self, api, character, fake_model):
        """The guarantee survives the new fields: they are all integers, and
        neither the pronouns nor the message reach the log."""
        _extract(fake_model, user_pronouns='fae/faer')
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'zzquarkzz i use fae/faer'})

        text = open(usage.USAGE_FILE).read()
        assert 'zzquarkzz' not in text
        assert 'fae/faer' not in text
        assert 'pronouns' not in text

        line = _chat_line()
        for key in ('duration_ms', 'refusal', 'user_profile_found',
                    'user_profile_saved', 'user_profile_referenced'):
            assert isinstance(line[key], int)

    def test_intensity_is_never_logged(self, api, character, fake_model):
        """A tier per turn is a mood diary. See usage.py."""
        _extract(fake_model, intensity='heavy')
        api.post('/character', json=character)
        api.post('/chat', json={'message': 'hi'})
        for entry in usage.load_usage():
            assert 'intensity' not in entry
            assert 'heavy' not in str(entry.values())
