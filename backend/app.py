import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

# This tells Python to look for companion.py and quirks.py 
# in the same folder as app.py
sys.path.insert(0, os.path.dirname(__file__))

from companion import chat, load_character, save_character, build_system_prompt
from quirks import load_quirks, forget_quirk

app = Flask(__name__)
CORS(app)


# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

# Every error response has the same shape:
#   {"error": <warm message the UI can show>, "detail": <technical text>}
# The frontend shows `error` and tucks `detail` behind an expander, so the
# app stays gentle without hiding what actually went wrong.
def fail(message, detail=None, status=500):
    if status >= 500:
        app.logger.error(detail)
    else:
        app.logger.warning(detail)
    return jsonify({"error": message, "detail": detail}), status


REQUIRED_STATS = ('compassion', 'real_talk', 'creativity', 'humor')


def validate_character(character):
    """Returns a list of problems -- empty means the payload is good.

    build_system_prompt() indexes these keys directly, so a payload that
    saves with one missing would make every later /chat call fail. Catch
    it here, at the boundary, while we can still say why.
    """
    problems = []

    if not isinstance(character, dict):
        return ["Character must be a JSON object"]

    for field in ('name', 'age', 'gender', 'tone'):
        value = character.get(field)
        if value is None or (isinstance(value, str) and not value.strip()):
            problems.append(f"Missing required field: {field}")

    stats = character.get('stats')
    if not isinstance(stats, dict):
        problems.append("Missing required field: stats (object)")
        return problems

    for stat in REQUIRED_STATS:
        value = stats.get(stat)
        if not isinstance(value, int) or isinstance(value, bool):
            problems.append(f"stats.{stat} must be a whole number 1-5")
        elif not 1 <= value <= 5:
            problems.append(f"stats.{stat} must be between 1 and 5 (got {value})")

    return problems

# We store conversation history in memory for now
# (resets when server restarts -- we'll persist this later!)
conversation_history = []

# ─────────────────────────────────────────
# CHARACTER ROUTES
# ─────────────────────────────────────────

@app.route('/character', methods=['GET'])
def get_character():
    """Frontend asks: is there a saved character?"""
    try:
        character = load_character()
        if character:
            return jsonify({"exists": True, "character": character}), 200
        return jsonify({"exists": False}), 200
    except Exception as e:
        return fail("Couldn't reach your companion right now.", str(e))


@app.route('/character', methods=['POST'])
def set_character():
    """Frontend sends a new character config to save"""
    try:
        character = request.get_json(silent=True)

        problems = validate_character(character)
        if problems:
            return fail(
                "Hmm, couldn't save that. Give it another try?",
                "; ".join(problems),
                status=400,
            )

        save_character(character)
        return jsonify({"success": True, "character": character}), 201
    except Exception as e:
        return fail("Hmm, couldn't save that. Give it another try?", str(e))


# ─────────────────────────────────────────
# CHAT ROUTES
# ─────────────────────────────────────────

@app.route('/chat', methods=['POST'])
def send_message():
    """Frontend sends a message, gets a reply back"""
    global conversation_history

    try:
        data = request.get_json()
        message = data.get('message', '').strip()

        if not message:
            return fail("Type something first 💙", "Message cannot be empty", status=400)

        character = load_character()
        if not character:
            return fail(
                "Let's set up your companion first.",
                "No character configured yet",
                status=400,
            )

        reply, conversation_history = chat(
            message=message,
            conversation_history=conversation_history,
            character=character
        )

        return jsonify({
            "reply": reply,
            "history_length": len(conversation_history)
        }), 200

    except Exception as e:
        return fail("Something went wrong — try again in a moment 💙", str(e))


@app.route('/chat/reset', methods=['POST'])
def reset_chat():
    """Clears conversation history -- fresh start!!"""
    global conversation_history
    conversation_history = []
    return jsonify({"success": True}), 200


# ─────────────────────────────────────────
# QUIRKS ROUTES
# ─────────────────────────────────────────

@app.route('/quirks', methods=['GET'])
def get_quirks():
    """Frontend asks: what does the companion know about the user?"""
    try:
        quirks = load_quirks()
        return jsonify({"quirks": quirks}), 200
    except Exception as e:
        return fail("Couldn't load quirks right now.", str(e))


@app.route('/quirks/<topic>', methods=['DELETE'])
def delete_quirk(topic):
    """User wants to remove something from their profile"""
    try:
        success = forget_quirk(topic)
        if success:
            return jsonify({"success": True}), 200
        return fail(
            "Couldn't forget that one — try again?",
            f"Topic not found: {topic}",
            status=404,
        )
    except Exception as e:
        return fail("Couldn't forget that one — try again?", str(e))


# ─────────────────────────────────────────
# RUN THE APP
# ─────────────────────────────────────────

if __name__ == '__main__':
    app.run(debug=True, port=5000)