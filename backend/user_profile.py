"""What this person has told the companion about themselves.

The other three stores are all about the *companion* or about what it has
noticed. This one holds what someone said plainly about their own life, and
it exists because of a specific failure: the app asked for pronouns, was
told, wrote the answer only into the in-memory conversation, and asked again
after the next restart. Being asked your pronouns repeatedly by something
whose whole promise is remembering you is worse than never asking.

Identity is not a transcript detail. It belongs somewhere that survives a
restart and survives clearing the chat -- clearing a conversation should
forget the conversation, not forget who you are.

Two rules make this safe, and both matter more as this store grows:

  * Only what was said outright. Never inferred from a name, a turn of
    phrase, or anything about how someone writes. If they did not say it,
    it is not here.
  * **Use, never raise.** A fact here lets the companion understand what
    someone says; it never lets it start a subject. Facts go stale in ways
    nothing here can detect -- a partner becomes an ex, a job ends between
    one session and the next -- and the whole cost of that staleness sits
    in raising it unprompted. Used only when the user opens the subject,
    a stale fact corrects itself on the same message that reveals it.

Named `user_profile` rather than `profile` because `backend/` goes on the
front of `sys.path`, so a module called `profile.py` shadows the standard
library profiler for the whole process. Nothing here imports it -- but a
name collision that only surfaces when someone reaches for a debugging tool
is the worst kind to leave lying around.

Everything here is local and gitignored, like the rest of the user's data.
"""
import json
import os
import re

PROFILE_FILE = os.path.join(os.path.dirname(__file__), 'data/profile.json')

#: Deliberately a pattern and not a list of accepted pronouns.
#:
#: A fixed set -- she/her, he/him, they/them -- would be simpler and would
#: quietly turn away anyone using neopronouns, in an app that claims pronoun
#: inclusivity as a commitment. So the shape is checked rather than the
#: value: lowercase words, optionally separated by slashes or a space, short
#: enough that no instruction could be smuggled through the field.
#:
#: No spaces, which is the part doing the real work. An earlier version
#: allowed them and happily accepted "not sure really" -- three ordinary
#: lowercase words -- which would have had the companion told that this
#: person uses "not sure really" pronouns. Storing nonsense is worse than
#: refusing a rare phrasing, because refusing only means asking again.
#:
#: Accepts: she/her · they/them · xe/xem · she/they · he/him/his · any
#: Rejects: prose, punctuation, anything past 24 characters.
PRONOUN_PATTERN = re.compile(r'^[a-z]+(/[a-z]+){0,3}$')

#: "any pronouns" is a real answer people give, and the only reason it would
#: fail the pattern is a trailing noun. Dropped rather than special-cased in
#: the regex, so the shape rule stays one readable line.
TRAILING_NOUN = re.compile(r'\s+pronouns?$')

#: Words a model writes when it means "nothing here". They pass the shape
#: check -- "null" is four lowercase letters, "n/a" even has a slash -- so
#: without this a model writing the WORD null instead of a JSON null would
#: have the companion told that this person uses "null" pronouns.
#:
#: The schema invites exactly that, showing the field as a quoted string
#: ending "...or null". gender_cue is safe from it only because it checks
#: against a fixed set; this field is checked by shape and so is exposed.
#:
#: "none" is deliberately NOT here -- see NO_PRONOUNS. It is a real answer,
#: not an absence.
NO_VALUE = frozenset({'null', 'nil', 'undefined', 'n/a', 'unknown'})

#: The stored value for someone who uses no pronouns at all.
#:
#: "none" rather than "undefined", which was also proposed: "undefined" is
#: in NO_VALUE, the words a model writes when it found NOTHING, so storing
#: it would make one word mean both "nothing said" and "said they use no
#: pronouns" -- and the first reading would silently stop the companion
#: using pronouns for someone who never asked. It is also the wrong meaning:
#: someone who uses no pronouns has set a preference, not left one unset.
#:
#: Kept apart from absence by where the judgment sits. The model returns a
#: real JSON null when nothing was said, and the word "none" only for a
#: stated preference; the prompt spells that out.
NO_PRONOUNS = 'none'


def load_profile():
    if not os.path.exists(PROFILE_FILE):
        return {}
    with open(PROFILE_FILE, 'r') as f:
        return json.load(f)


def save_profile(profile):
    os.makedirs(os.path.dirname(PROFILE_FILE), exist_ok=True)
    with open(PROFILE_FILE, 'w') as f:
        json.dump(profile, f, indent=2)


def clean_pronouns(value):
    """A usable pronoun string, or None. Never raises on odd input."""
    if not isinstance(value, str):
        return None
    cleaned = TRAILING_NOUN.sub('', value.lower().strip())
    if len(cleaned) > 24 or cleaned in NO_VALUE:
        return None
    return cleaned if PRONOUN_PATTERN.match(cleaned) else None


def is_offered(value):
    """Whether a model put an actual answer in the field, before validation.

    Kept separate from clean_pronouns on purpose. An answer can be offered
    and still refused -- "star / stars", with spaces -- and telling "the
    model saw nothing" apart from "the model saw something and it was
    rejected" is the whole point of the diagnostic this feeds. Answers that
    only mean "nothing here" are not offered.
    """
    if value is None:
        return False
    if isinstance(value, str):
        stripped = value.strip().lower()
        return bool(stripped) and stripped not in NO_VALUE
    return True


def set_pronouns(value):
    """Record how this person refers to themselves.

    The latest statement wins outright -- no scoring, no confidence, no
    counting mentions. People correct themselves, and a correction that
    had to out-vote the original would be the wrong design for this of all
    fields.
    """
    cleaned = clean_pronouns(value)
    if cleaned is None:
        return None

    profile = load_profile()
    profile['pronouns'] = cleaned
    save_profile(profile)
    return profile


def clear_profile():
    """Forget all of it. Offered wherever starting over is."""
    save_profile({})


def build_profile_context():
    """The prompt block, or "" when nothing is known.

    Returns nothing at all rather than an empty heading, so a companion that
    has been told nothing is never handed instructions about handling facts
    it does not have.
    """
    profile = load_profile()
    pronouns = profile.get('pronouns')
    if not pronouns:
        return ""

    if pronouns == NO_PRONOUNS:
        # Not "uses none pronouns" -- which is what the general line produced
        # before this existed, and read as a garbled instruction every turn.
        # In a one-to-one chat "you" covers almost everything, so the real
        # instruction is to never reach for he, she or they.
        opening = (
            "This person uses no pronouns. Never refer to them as he, she or "
            "they. Talking with them, \"you\" is all you need; if you ever "
            "have to refer to them another way, use their name if they have "
            "shared it, and otherwise rephrase so no pronoun is needed."
        )
    else:
        opening = f"This person uses {pronouns} pronouns. Use them."

    return f"{opening}\n\n{_REMEMBERED}"


#: Shared by every profile line, so no variant can quietly drop it.
_REMEMBERED = (
    "They told you this themselves, so do not ask again and do not "
    "mention that you know -- \"I remember you use those\" turns having "
    "been listened to into having been filed. Simply get it right. "
    "Never raise anything you know about their life yourself; use it to "
    "understand what they bring up, and let them be the one to bring it."
)
