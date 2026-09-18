"""The privacy hook's one dangerous edge.

`scripts/hooks/pre-commit` refuses a commit containing anything the companion
has learned. It carries one exemption: a companion named after one of the
app's own "choose for me" suggestions is not flagged, because a name handed
to every user identifies nobody and the app's own copy contains them all.

That exemption is the only place this could quietly stop working. If it ever
widened from "the companion's name" to "any topic", a real preference spelled
like a celestial name would sail through and nobody would notice, because a
hook that stops finding things looks exactly like a clean repo.
"""
import importlib.util
import json
import os

import pytest

HOOK = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'scripts', 'hooks', 'pre-commit',
)


@pytest.fixture
def hook():
    spec = importlib.util.spec_from_loader(
        'precommit', importlib.machinery.SourceFileLoader('precommit', HOOK))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def fake_repo(tmp_path):
    """A repo-shaped directory: the app's name list, and some learned data."""
    copy_dir = tmp_path / 'frontend' / 'src' / 'copy'
    copy_dir.mkdir(parents=True)
    (copy_dir / 'setup.js').write_text(
        "export const RANDOM_NAMES = [\n  'luna',\n  'vega',\n  'wren',\n]\n"
        "\nexport const STATS = [\n"
        "  { key: 'compassion', descriptors: {} },\n"
        "  { key: 'real_talk', descriptors: {} },\n"
        "  { key: 'humor', descriptors: {} },\n"
        "]\n")

    data = tmp_path / 'backend' / 'data'
    data.mkdir(parents=True)
    return tmp_path


def _write(repo, filename, payload):
    (repo / 'backend' / 'data' / filename).write_text(json.dumps(payload))


class TestSuggestedNames:
    def test_the_list_is_read_from_source(self, hook, fake_repo):
        assert hook.app_suggested_names(fake_repo) == {'luna', 'vega', 'wren'}

    def test_an_unreadable_list_guards_the_name(self, hook, tmp_path):
        """Conservative direction: no list means no exemption."""
        assert hook.app_suggested_names(tmp_path) == set()


class TestNameExemption:
    def test_a_companion_named_by_the_app_is_not_flagged(self, hook, fake_repo):
        _write(fake_repo, 'character.json', {'name': 'vega'})
        assert 'vega' not in hook.learned_topics(fake_repo)

    def test_a_companion_named_by_the_user_is_flagged(self, hook, fake_repo):
        _write(fake_repo, 'character.json', {'name': 'bramblewick'})
        assert 'bramblewick' in hook.learned_topics(fake_repo)

    def test_the_exemption_never_reaches_a_quirk(self, hook, fake_repo):
        """The failure this file exists for.

        Someone who says they like the constellation Vega has told you
        something about themselves. That it collides with a name the app
        offers is a coincidence, not a licence to stop guarding it.
        """
        _write(fake_repo, 'quirks.json', {'vega': {'confidence': 'HIGH'}})
        assert 'vega' in hook.learned_topics(fake_repo)

    def test_the_exemption_never_reaches_a_sensitivity(self, hook, fake_repo):
        _write(fake_repo, 'sensitivities.json', {'luna': {'kind': 'other'}})
        assert 'luna' in hook.learned_topics(fake_repo)


class TestStatKeys:
    """The four sliders are schema, and cannot be guarded as topics.

    `creativity` was a stat key AND a real topic in one contributor's local
    data, so every commit touching the slider was refused. A guard that
    fires on the app's own vocabulary teaches people to pass --no-verify,
    which removes it entirely -- so the word the app uses in a dozen files
    is exempt, and the exemption stops precisely there.

    These use `humor`, a key that is still in STATS. `creativity` would pass
    them for the wrong reason now: modes replaced it, so it is pinned in
    APP_VOCABULARY by hand and would be exempt whether or not app_stat_keys
    worked at all.
    """

    def test_the_keys_are_read_from_source(self, hook, tmp_path):
        # Deliberately NOT the app's four. Asserting the real names would
        # pass just as well against a hardcoded list, which is the thing
        # this test exists to rule out -- and it did, until a mutation
        # showed the hardcoded version passing.
        copy_dir = tmp_path / 'frontend' / 'src' / 'copy'
        copy_dir.mkdir(parents=True)
        (copy_dir / 'setup.js').write_text(
            "export const STATS = [\n"
            "  { key: 'patience', descriptors: {} },\n"
            "  { key: 'wit', descriptors: {} },\n"
            "]\n")

        assert hook.app_stat_keys(tmp_path) == {'patience', 'wit'}

    def test_it_reads_the_keys_the_app_actually_has(self, hook, fake_repo):
        assert hook.app_stat_keys(fake_repo) == {'compassion', 'real_talk', 'humor'}

    def test_an_unreadable_file_guards_them_as_before(self, hook, tmp_path):
        """Conservative direction, the same as the name list."""
        assert hook.app_stat_keys(tmp_path) == set()

    def test_a_quirk_named_after_a_stat_is_not_flagged(self, hook, fake_repo):
        _write(fake_repo, 'quirks.json', {'humor': {}})

        assert hook.learned_topics(fake_repo) == set()

    def test_a_real_quirk_alongside_it_is_still_flagged(self, hook, fake_repo):
        # The half that matters. An exemption that quietly swallowed its
        # neighbours would look exactly like a clean repo.
        _write(fake_repo, 'quirks.json', {'humor': {}, 'kite flying': {}})

        assert hook.learned_topics(fake_repo) == {'kite flying'}

    def test_the_exemption_never_reaches_the_companion_name(self, hook, fake_repo):
        # A companion named after a stat is still a name its owner chose.
        # Widening a topic exemption to cover the name is the failure this
        # file was written to catch, in the other direction.
        _write(fake_repo, 'character.json', {'name': 'humor'})

        assert hook.learned_topics(fake_repo) == {'humor'}

    def test_the_exemption_never_reaches_a_sensitivity_either(self, hook, fake_repo):
        _write(fake_repo, 'sensitivities.json', {'drinking': {}})

        assert hook.learned_topics(fake_repo) == {'drinking'}


class TestStillCatchesEverythingElse:
    def test_quirks_and_sensitivities_are_both_read(self, hook, fake_repo):
        _write(fake_repo, 'quirks.json', {'accordion': {}})
        _write(fake_repo, 'sensitivities.json', {'thunderstorms': {}})
        assert {'accordion', 'thunderstorms'} <= hook.learned_topics(fake_repo)

    def test_app_schema_words_are_allowlisted(self, hook, fake_repo):
        _write(fake_repo, 'quirks.json', {'food': {}, 'music': {}})
        assert not hook.learned_topics(fake_repo) & {'food', 'music'}

    def test_very_short_topics_are_ignored_as_noise(self, hook, fake_repo):
        _write(fake_repo, 'quirks.json', {'ok': {}})
        assert 'ok' not in hook.learned_topics(fake_repo)

    def test_no_data_means_nothing_to_guard(self, hook, fake_repo):
        assert hook.learned_topics(fake_repo) == set()
