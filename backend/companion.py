import anthropic
import json
import os
from dotenv import load_dotenv
from quirks import update_quirk, build_quirks_context
from sensitivities import KINDS as SENSITIVITY_KINDS, note_sensitivity, build_sensitivities_context
from settings import load_settings

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

client = anthropic.Anthropic()

CHARACTER_FILE = os.path.join(os.path.dirname(__file__), 'data/character.json')

def load_character():
    # The real character file is gitignored -- it holds one person's
    # companion. A fresh clone has no file at all, so treat "missing"
    # the same as "no character yet" instead of crashing.
    if not os.path.exists(CHARACTER_FILE):
        return {}
    with open(CHARACTER_FILE, 'r') as f:
        return json.load(f)

def save_character(character):
    os.makedirs(os.path.dirname(CHARACTER_FILE), exist_ok=True)
    with open(CHARACTER_FILE, 'w') as f:
        json.dump(character, f, indent=2)

def delete_character():
    """Forget the companion entirely, so setup runs again.

    Quirks are deliberately left alone -- they belong to the person, not to
    the companion, so starting over doesn't silently erase what they shared.
    Anything they want gone can be removed from the quirks panel.
    """
    if os.path.exists(CHARACTER_FILE):
        os.remove(CHARACTER_FILE)
        return True
    return False

def test_mode_enabled():
    """True when the app is being exercised rather than used.

    Env-gated on purpose: never a button someone could find. Test mode
    changes where data is written, never what the companion is allowed to
    do -- crisis handling is identical in it.
    """
    return os.getenv('COLUMBA_TEST_MODE') == '1'


def forced_intensity():
    """An intensity tier pinned by env, for exercising the tiers.

    Deliberately separate from telling the model it is a test: saying so
    would change how it replies, which invalidates any read on how the
    companion actually behaves. This only overrides the tag.
    """
    tier = os.getenv('COLUMBA_FORCE_INTENSITY')
    return tier if tier in INTENSITY_TIERS else None


def build_system_prompt(character, intensity=None):
    stats = character["stats"]

    compassion_desc = (
        "extremely warm and emotionally expressive" if stats["compassion"] >= 4
        else "measured and calm" if stats["compassion"] <= 2
        else "balanced in warmth"
    )
    real_talk_desc = (
        "very direct and unfiltered, never sugarcoating" if stats["real_talk"] >= 4
        else "gentle and careful with hard truths" if stats["real_talk"] <= 2
        else "honest but thoughtful"
    )

    # The one place the app overrides a choice someone made, and it does so
    # deliberately. "Never sugarcoating" is good company on an ordinary day
    # and the wrong voice entirely for someone in crisis.
    if intensity == 'heavy' and stats["real_talk"] >= 4:
        real_talk_desc = (
            "honest, but gentle right now -- this person is going through "
            "something heavy, so soften the delivery without lying to them"
        )
    creativity_desc = (
        "frequently suggests creative outlets like art, music, journaling" if stats["creativity"] >= 4
        else "occasionally mentions creative outlets when very relevant" if stats["creativity"] <= 2
        else "sometimes suggests creative outlets"
    )
    humor_desc = (
        "brings gentle humor and lightness naturally into conversation" if stats["humor"] >= 4
        else "keeps things mostly serious and grounded" if stats["humor"] <= 2
        else "uses light humor occasionally"
    )

    # Pull in any verified quirks
    quirks_context = build_quirks_context()

    base_prompt = f"""You are {character["name"]}, a {character["gender"]} companion designed to support people who may be struggling emotionally.

You come across as someone in the {character["age"]} age range. Let that shape how you
carry yourself and how you speak -- your references, your rhythm, how much you have
lived through. Never state your age outright unless you are asked.

Your tone is {character["tone"]}.

Your personality stats:
- Compassion level {stats["compassion"]}/5: You are {compassion_desc}
- Real talk level {stats["real_talk"]}/5: You are {real_talk_desc}
- Creativity level {stats["creativity"]}/5: You {creativity_desc}
- Humor level {stats["humor"]}/5: You {humor_desc}

Always follow these rules:
- Never provide harmful information
- If someone seems to be in crisis, always encourage them to reach out to someone they trust in their life, and to call or text 988, the Suicide and Crisis Lifeline
- Begin your very first response with a brief affirmation that reflects back what the user shared
- Offer a closing affirmation if the user says goodbye or signals they're wrapping up
- Use warm, accessible language -- never clinical or formal. Meet people where they are, whatever age they are
- If pronouns are not provided, ask the user if they'd like to share them early in the conversation
- If someone moves from something heavy to something light, read it as them
  wanting to change the subject. Follow their lead. Name once that the door
  stays open, then let it go -- never ask them to confirm they want to move
  on, which is pressure wearing the clothes of care"""

    if quirks_context:
        base_prompt += f"\n\n{quirks_context}"

    # Withhold-only, and only if the user has left the feature on.
    sensitivities_context = build_sensitivities_context(
        load_settings().get('sensitivities_enabled', True)
    )
    if sensitivities_context:
        base_prompt += f"\n\n{sensitivities_context}"

    return base_prompt

def _parse_json_object(raw):
    """Parse a JSON object out of a model reply.

    Asking for "only JSON" gets JSON, but often inside a ```json fence --
    which json.loads() rejects, so every extraction silently returned
    nothing. Take the outermost {...} and ignore whatever wraps it.
    """
    start = raw.find('{')
    end = raw.rfind('}')
    if start == -1 or end == -1:
        raise ValueError(f"no JSON object in model reply: {raw[:80]!r}")
    return json.loads(raw[start:end + 1])

#: Conversation intensity, lightest first. Used to decide what the app is
#: allowed to be playful about, so the order matters.
INTENSITY_TIERS = ('light', 'medium', 'heavy')

#: The value everything falls back to. A tag that fails OPEN is the one bug
#: in this system that could actually hurt someone -- a missing, unparseable
#: or errored intensity must never unlock the lighter copy.
SAFEST_INTENSITY = 'heavy'

#: How someone refers to their companion, when they chose "any" at setup.
GENDER_CUES = ('she', 'he', 'they')

ANALYSIS_PROMPT = """You are a silent background analyzer. You never speak to the user. You read one message and report four things about it.

1. QUIRKS -- specific things this person likes or dislikes.

Record only CONCRETE, NAMEABLE things -- a dish, a band, an artist, a game,
a show, a sport, a place, an activity someone actually does. If you could
not point at it, it is not a quirk.

Never record:
- feelings, moods, or states of mind ("chaos mode", "building courage")
- abstractions, values, or coping strategies ("trying new things", "routine and comfort")
- health, mental health, medication, substance use, sexuality, religion, or politics.
  Those belong in sensitivities below, never here.
- anything the person did not say themselves

At most 3 per message, fewer is better. Use the simplest common name for a
thing: "edm", not "edm music". When unsure, leave it out -- anything that
matters comes up again.

2. INTENSITY -- how heavy this message is, for the app's own tone.

- "light"  : everyday talk. nothing painful in it.
- "medium" : real feeling, a hard day, frustration, worry, something weighing on them.
- "heavy"  : distress, crisis, self-harm, abuse, grief, hopelessness, or anything close.

When it sits between two, choose the heavier one. This decides whether the
app is allowed to be playful, and being playful at the wrong moment is the
more costly mistake by far.

3. SENSITIVITIES -- things this person has a hard time with, that should
never be suggested back to them.

Record these only from what they actually said about themselves: a
substance they are struggling with, a relationship that hurts, a loss, an
illness, a situation that causes them pain. The point is practical -- so
the companion does not suggest a drink to someone working on their
drinking, or family time to someone for whom family is the wound.

Do not record a topic merely mentioned in passing, and never guess from
mood alone.

4. GENDER CUE -- how they referred to their companion, if they did:
"she", "he", "they", or null. Only from an actual pronoun they used for the
companion. Never from anything about the user themselves.

Respond ONLY with valid JSON in exactly this format, no other text:
{
  "found": true or false,
  "quirks": [
    {
      "topic": "topic name in lowercase",
      "sentiment": "positive or negative",
      "enthusiasm": 1 to 3 (1=mild, 2=moderate, 3=strong),
      "category": "music, food, sports, hobby, media, place"
    }
  ],
  "intensity": "light or medium or heavy",
  "sensitivities": [
    {
      "topic": "short lowercase name",
      "kind": "health, substance, family, relationship, grief, money, work, other"
    }
  ],
  "gender_cue": "she or he or they, or null"
}

"found" refers to quirks only. If a quirk does not fit one of its
categories, do not record it at all. Intensity is always required.
"""


def safe_analysis():
    """What every failure returns. Cautious in every field."""
    return {
        'found': False,
        'quirks': [],
        'intensity': SAFEST_INTENSITY,
        'sensitivities': [],
        'gender_cue': None,
    }


def _clean_quirks(raw):
    """Drop anything malformed rather than trusting the reply.

    chat() indexes these keys directly, so one bad entry from the model
    would turn into a 500 on a message someone just poured out.
    """
    cleaned = []
    for quirk in raw if isinstance(raw, list) else []:
        if not isinstance(quirk, dict):
            continue
        topic = str(quirk.get('topic', '')).lower().strip()
        sentiment = quirk.get('sentiment')
        category = quirk.get('category')
        enthusiasm = quirk.get('enthusiasm')

        if not topic or sentiment not in ('positive', 'negative'):
            continue
        if not isinstance(enthusiasm, int) or isinstance(enthusiasm, bool):
            continue
        if not 1 <= enthusiasm <= 3:
            continue

        cleaned.append({
            'topic': topic,
            'sentiment': sentiment,
            'enthusiasm': enthusiasm,
            'category': str(category) if category else 'other',
        })
    return cleaned[:3]


def _clean_sensitivities(raw):
    cleaned = []
    for item in raw if isinstance(raw, list) else []:
        if isinstance(item, str):
            item = {'topic': item}
        if not isinstance(item, dict):
            continue
        topic = str(item.get('topic', '')).lower().strip()
        if not topic:
            continue
        kind = item.get('kind')
        cleaned.append({
            'topic': topic,
            'kind': kind if kind in SENSITIVITY_KINDS else 'other',
        })
    return cleaned


def normalise_analysis(raw):
    """Force a model reply into the shape the rest of the code relies on.

    Every field falls back on its own, so a reply that gets one thing wrong
    does not cost us the other three. Intensity falls back to heavy.
    """
    if not isinstance(raw, dict):
        return safe_analysis()

    intensity = raw.get('intensity')
    if intensity not in INTENSITY_TIERS:
        intensity = SAFEST_INTENSITY

    sensitivities = _clean_sensitivities(raw.get('sensitivities'))

    # A sensitivity in play raises the floor: whatever else this message
    # looks like, it is not the moment for the playful copy.
    if sensitivities and intensity == 'light':
        intensity = 'medium'

    quirks = _clean_quirks(raw.get('quirks'))

    cue = raw.get('gender_cue')
    if isinstance(cue, str):
        cue = cue.lower().strip()
    if cue not in GENDER_CUES:
        cue = None

    return {
        'found': bool(quirks),
        'quirks': quirks,
        'intensity': intensity,
        'sensitivities': sensitivities,
        'gender_cue': cue,
    }


def analyze_message(message):
    """One silent background pass: quirks, intensity, sensitivities, cue.

    All four ride the same Haiku call the quirk extraction always made --
    same round trip, same latency, one JSON object. Any failure returns
    safe_analysis(); this must never take the conversation down with it.
    """
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            system=ANALYSIS_PROMPT,
            messages=[{"role": "user", "content": message}]
        )
        return normalise_analysis(_parse_json_object(response.content[0].text))

    except Exception as e:
        print(f"Message analysis error: {e}")
        return safe_analysis()


def extract_quirks(message):
    """Kept for callers that only want the quirk half."""
    return analyze_message(message)


def chat(message, conversation_history, character):
    """One conversation turn.

    Returns (reply, history, analysis). The analysis is handed back so the
    frontend can act on the intensity -- it decides what the app is allowed
    to be playful about while this conversation is happening.
    """

    # One silent background pass: quirks, intensity, sensitivities, cue.
    analysis = analyze_message(message)

    forced = forced_intensity()
    if forced:
        analysis = dict(analysis, intensity=forced)

    for quirk in analysis.get("quirks", []):
        update_quirk(
            topic=quirk["topic"],
            sentiment=quirk["sentiment"],
            enthusiasm=quirk["enthusiasm"],
            category=quirk["category"]
        )

    # Only recorded when the user has left the feature on. Off means off:
    # nothing new is written, and nothing already there is consulted.
    if load_settings().get('sensitivities_enabled', True):
        for item in analysis.get("sensitivities", []):
            note_sensitivity(item["topic"], item["kind"])

    # Built after the writes above, so this turn's system prompt already
    # knows whatever this message just revealed.
    system_prompt = build_system_prompt(character, intensity=analysis["intensity"])

    conversation_history.append({
        "role": "user",
        "content": message
    })

    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        system=system_prompt,
        messages=conversation_history
    )

    assistant_message = response.content[0].text

    conversation_history.append({
        "role": "assistant",
        "content": assistant_message
    })

    return assistant_message, conversation_history, analysis
