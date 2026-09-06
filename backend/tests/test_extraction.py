"""The silent background pass -- parsing, and failing closed.

Extraction runs on every message and its failures are invisible by design:
`chat()` carries on regardless. That is the right behaviour and also why it
went unnoticed for a whole build that every extraction was returning
nothing -- the model was fencing its JSON and json.loads() was raising.
These tests are the reason that can't happen quietly again.
"""
import json
from types import SimpleNamespace

import pytest

import companion


class TestParsing:
    def test_bare_json(self):
        assert companion._parse_json_object('{"found": true}') == {'found': True}

    def test_fenced_json(self):
        raw = '```json\n{"found": true, "quirks": []}\n```'
        assert companion._parse_json_object(raw)['found'] is True

    def test_json_after_prose(self):
        assert companion._parse_json_object('Sure!\n{"found": false}') == {'found': False}

    def test_nested_braces_survive(self):
        raw = '{"quirks": [{"topic": "zhu"}]}'
        assert companion._parse_json_object(raw)['quirks'][0]['topic'] == 'zhu'

    def test_no_json_raises(self):
        with pytest.raises((ValueError, json.JSONDecodeError)):
            companion._parse_json_object('I could not find anything.')


class TestFailsClosed:
    """A failure must return "nothing found", never propagate into the chat."""

    def _client_that(self, behaviour):
        def create(**kwargs):
            return behaviour()
        return SimpleNamespace(messages=SimpleNamespace(create=create))

    def test_api_error(self, monkeypatch):
        def boom():
            raise RuntimeError('api down')
        monkeypatch.setattr(companion, 'client', self._client_that(boom))
        assert companion.extract_quirks('hi') == {'found': False, 'quirks': []}

    def test_unparseable_reply(self, monkeypatch):
        def garbage():
            return SimpleNamespace(content=[SimpleNamespace(text='no json here')])
        monkeypatch.setattr(companion, 'client', self._client_that(garbage))
        assert companion.extract_quirks('hi') == {'found': False, 'quirks': []}

    def test_empty_reply(self, monkeypatch):
        def empty():
            return SimpleNamespace(content=[SimpleNamespace(text='')])
        monkeypatch.setattr(companion, 'client', self._client_that(empty))
        assert companion.extract_quirks('hi') == {'found': False, 'quirks': []}
