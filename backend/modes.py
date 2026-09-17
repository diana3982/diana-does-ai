"""What the person has asked the companion for -- listening, or an answer.

This replaced the `creativity` slider, and the reason is worth keeping. That
slider set how often creative outlets came up, and its lowest rung was
labelled "grounded and practical". Someone who wanted practical help read
that label, chose 1, and got the fewest suggestions of anything: the label
promised the opposite of the behaviour. Making the label honest fixed the
lie but not the gap -- there was still no way to ask for plain advice, and
no way at all to ask to simply be heard.

A mode is not a personality trait. Compassion and humour describe who the
companion is; a mode describes what this person wants from it right now, and
it can change between one conversation and the next. That is why it lives in
settings rather than in the character config, and why the prompt keeps it in
its own section rather than in the list of stats.

One mode is active at a time. Some pairs contradict outright -- "just
listen" and "give me advice" would ask the companion to hold back and to
offer in the same breath -- and every combination would be a behaviour
someone has to test.
"""

#: The sentence every suppressive rule ends with, lifted verbatim from
#: sensitivities.py so there is one wording for one idea. A mode must never
#: be able to talk the companion out of crisis guidance: "do not offer
#: anything" is about advice, never about someone's safety, and the one
#: person most likely to choose "just listen" on a bad night is exactly the
#: person this carve-out is for.
SAFETY = (
    "None of this applies to safety: if someone is in danger, respond fully "
    "and point them to help."
)

#: Each mode's instruction, keyed by what the setting stores. Written as a
#: direction for the turn rather than a description of a character, so the
#: model reads it as "do this now" and not "be this sort of person".
MODES = {
    'listen': (
        "They have asked you to listen, not to solve. Reflect back what you "
        "heard and stay there with them. Do not offer suggestions, advice, or "
        "things to try, and do not ask what they are going to do about it -- "
        "being heard is the whole of what this turn is for. " + SAFETY
    ),
    'unpack': (
        "They want to understand what they are feeling. Help them put words "
        "to it: one gentle question at a time, and an observation before an "
        "answer. Do not move to what to do about it unless they do."
    ),
    'advice': (
        "They have asked for advice, so give it. Say plainly what you would "
        "suggest rather than hedging it into something that commits to "
        "nothing -- vagueness reads as withholding when someone has asked "
        "outright. Still one thing, and still theirs to turn down."
    ),
    'suggest': (
        "They want something to try. Offer one concrete thing -- an outlet, "
        "an activity, a small step that fits the day they are having."
    ),
}

#: Where someone lands before they have chosen, and the fallback for a value
#: this version does not recognise. `unpack` because it is closest to what
#: the app already did with no mode at all: reflect, and help someone find
#: the words.
DEFAULT_MODE = 'unpack'


def is_mode(value):
    """Whether this is a mode this version knows about."""
    return value in MODES


def rule_for(mode):
    """The instruction for `mode`, falling back rather than raising.

    Anything unrecognised -- a hand-edited settings file, a value from a
    newer version, None -- lands on the default. The alternative is a prompt
    builder that raises on a settings file it does not like, which would
    take the whole conversation down over a preference.
    """
    return MODES.get(mode, MODES[DEFAULT_MODE])
