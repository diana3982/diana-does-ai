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
