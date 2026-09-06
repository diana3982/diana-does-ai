import anthropic
import json
import os
from dotenv import load_dotenv
from quirks import update_quirk, build_quirks_context

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

def build_system_prompt(character):
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
- If pronouns are not provided, ask the user if they'd like to share them early in the conversation"""

    if quirks_context:
        base_prompt += f"\n\n{quirks_context}"

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

def extract_quirks(message):
    """Silent background call to extract quirks from user message"""
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            system="""You are a silent background analyzer. Your ONLY job is to detect specific things this person likes or dislikes, from their own words.

Record only CONCRETE, NAMEABLE things -- a dish, a band, an artist, a game,
a show, a sport, a place, an activity someone actually does. If you could
not point at it, it is not a quirk.

Never record:
- feelings, moods, or states of mind ("chaos mode", "building courage")
- abstractions, values, or coping strategies ("trying new things", "routine and comfort")
- health, mental health, medication, substance use, sexuality, religion, or politics.
  These matter, but they are not preferences and they do not belong in a
  likes-and-dislikes profile.
- anything the person did not say themselves

Rules:
- At most 3 per message. Fewer is better.
- Use the simplest common name for a thing: "edm", not "edm music". One entry
  per thing, never a specific and a general version of the same one.
- When unsure, leave it out. Anything that genuinely matters to someone comes
  up again, and repetition is what earns confidence here.

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
  ]
}

If it does not fit one of those categories, do not record it at all.
If nothing specific is mentioned, return {"found": false, "quirks": []}""",
            messages=[{"role": "user", "content": message}]
        )

        return _parse_json_object(response.content[0].text)

    except Exception as e:
        print(f"Quirk extraction error: {e}")
        return {"found": False, "quirks": []}

def chat(message, conversation_history, character):
    """Main chat function -- returns reply and updates quirks silently"""

    # Run quirk extraction silently in background
    quirk_data = extract_quirks(message)

    if quirk_data.get("found"):
        for quirk in quirk_data.get("quirks", []):
            update_quirk(
                topic=quirk["topic"],
                sentiment=quirk["sentiment"],
                enthusiasm=quirk["enthusiasm"],
                category=quirk["category"]
            )

    # Build system prompt with latest quirks injected
    system_prompt = build_system_prompt(character)

    # Add user message to history
    conversation_history.append({
        "role": "user",
        "content": message
    })

    # Main API call
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        system=system_prompt,
        messages=conversation_history
    )

    assistant_message = response.content[0].text

    # Add response to history
    conversation_history.append({
        "role": "assistant",
        "content": assistant_message
    })

    return assistant_message, conversation_history