"""Things to be careful with.

Deliberately not part of the quirks system. A quirk pushes the companion
toward something -- "you know what sounds good..." -- while a sensitivity
only ever removes an option before it is offered. Storing "drinking" as a
disliked quirk put it in the same slot as disliking cilantro, scored and
sentiment-labelled, and rendered it into the prompt as "dislikes drinking
(score: 0.0/5)", which is both wrong and unpleasant to read.

The rules that make this safe:

  * Withhold-only. Nothing here can ever cause the companion to raise a
    topic. It can only stop one being suggested. If a sensitivity could
    prompt, this would be surveillance with good intentions.
  * The door is the user's. If they bring it up themselves, the companion
    follows them there for as long as they stay with it, and lets it go
    when they move on.
  * No scoring and no confidence decay. One mention is enough: wrongly
    withholding a brunch suggestion costs nothing, and missing one costs
    something real.
  * Never touches crisis handling. A sensitivity can suppress a
    suggestion, never a safety response.

Everything here is local and gitignored, like the rest of the user's data.
"""
import json
import os

SENSITIVITIES_FILE = os.path.join(os.path.dirname(__file__), 'data/sensitivities.json')

#: What a sensitivity can be about. The model is held to this list so the
#: store cannot fill up with whatever phrasing a reply happened to use.
KINDS = ('health', 'substance', 'family', 'relationship', 'grief', 'money', 'work', 'other')


def load_sensitivities():
    if not os.path.exists(SENSITIVITIES_FILE):
        return {}
    with open(SENSITIVITIES_FILE, 'r') as f:
        return json.load(f)


def save_sensitivities(sensitivities):
    os.makedirs(os.path.dirname(SENSITIVITIES_FILE), exist_ok=True)
    with open(SENSITIVITIES_FILE, 'w') as f:
        json.dump(sensitivities, f, indent=2)


def note_sensitivity(topic, kind='other'):
    """Record one, or count another mention of one already known.

    No score to raise and no confidence to earn -- being noticed once is
    the whole bar. `mentions` is kept only so the user can see how often
    something has come up when they read the list.
    """
    topic = (topic or '').lower().strip()
    if not topic:
        return None

    if kind not in KINDS:
        kind = 'other'

    stored = load_sensitivities()
    if topic in stored:
        stored[topic]['mentions'] += 1
    else:
        stored[topic] = {'kind': kind, 'mentions': 1}

    save_sensitivities(stored)
    return stored


def forget_sensitivity(topic):
    stored = load_sensitivities()
    topic = (topic or '').lower().strip()
    if topic in stored:
        del stored[topic]
        save_sensitivities(stored)
        return True
    return False


def clear_sensitivities():
    save_sensitivities({})
    return True


def build_sensitivities_context(enabled=True):
    """The withhold-only instruction, or nothing at all.

    Returns "" when the feature is off or nothing is known, so a companion
    with no sensitivities is never told how to handle them.
    """
    if not enabled:
        return ""

    stored = load_sensitivities()
    if not stored:
        return ""

    lines = ["Do not suggest, recommend or steer towards any of these:"]
    for topic in sorted(stored):
        lines.append(f"- {topic}")

    lines.append("")
    lines.append(
        "These are things this person has had a hard time with. You must never "
        "raise any of them yourself, never allude to knowing about them, and "
        "never ask after them -- doing so would tell someone that a list is "
        "being kept about them, which is its own harm. Simply make sure your "
        "suggestions go elsewhere: do not offer a drink to someone who struggles "
        "with drinking, or time with family to someone for whom family is hard. "
        "If they bring one up themselves, follow them there for as long as they "
        "stay with it -- they have chosen to open that door and it is theirs to "
        "open. When they move on to something else, let it go completely and do "
        "not steer back. None of this ever applies to a crisis: if someone is in "
        "danger, respond fully and point them to help."
    )

    return "\n".join(lines)
