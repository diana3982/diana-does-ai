"""Payload validation at the API boundary.

build_system_prompt() indexes these keys directly, so a character saved
with one missing would break every later /chat call -- far from the request
that caused it.
"""
import copy

import pytest

import app as flask_app


def test_valid_character_passes(character):
    assert flask_app.validate_character(character) == []


@pytest.mark.parametrize('field', ['name', 'age', 'gender', 'tone'])
def test_missing_field_is_caught(character, field):
    del character[field]
    assert any(field in problem for problem in flask_app.validate_character(character))


@pytest.mark.parametrize('field', ['name', 'age', 'gender', 'tone'])
def test_blank_field_is_caught(character, field):
    character[field] = '   '
    assert any(field in problem for problem in flask_app.validate_character(character))


@pytest.mark.parametrize('stat', ['compassion', 'real_talk', 'creativity', 'humor'])
def test_missing_stat_is_caught(character, stat):
    del character['stats'][stat]
    assert any(stat in problem for problem in flask_app.validate_character(character))


@pytest.mark.parametrize('value', [0, 6, -1, 3.5, '3', None])
def test_out_of_range_stat_is_caught(character, value):
    character['stats']['humor'] = value
    assert flask_app.validate_character(character) != []


def test_boolean_is_not_a_number(character):
    # True == 1 in Python, so a bool would sail through a naive check.
    character['stats']['humor'] = True
    assert flask_app.validate_character(character) != []


def test_missing_stats_object_is_caught(character):
    del character['stats']
    assert flask_app.validate_character(character) != []


@pytest.mark.parametrize('payload', ['juno', 42, None, []])
def test_non_object_payload_is_caught(payload):
    assert flask_app.validate_character(payload) != []


def test_a_valid_character_is_not_mutated(character):
    before = copy.deepcopy(character)
    flask_app.validate_character(character)
    assert character == before
