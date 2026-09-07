import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

# This tells Python to look for companion.py and quirks.py 
# in the same folder as app.py
sys.path.insert(0, os.path.dirname(__file__))

import storage
from companion import (
    chat, load_character, save_character, delete_character, test_mode_enabled,
)
from quirks import load_quirks, forget_quirk, clear_quirks
from sensitivities import load_sensitivities, forget_sensitivity, clear_sensitivities
from settings import load_settings, save_settings

# Test mode writes to its own directory. The requirement is that exercising
# the app can never touch someone's real companion or what it has learned,
# and the cheapest way to guarantee that is to point the storage somewhere
# else entirely rather than to remember not to write.
#
# Redirecting through storage.STORES rather than naming files here is what
# makes that guarantee hold: this used to list three of the four stores, so
# toggling sensitivities off in a test session wrote to the real settings
# file and quietly disarmed the feature for the real companion.
if test_mode_enabled():
    storage.redirect_to(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data/test')
    )
    print('\n*** TEST MODE -- data is being written to backend/data/test/ ***\n')

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

# One conversation for the whole app, in memory, reset on restart.
#
# Global on purpose: two browser tabs are the same conversation, because a
# companion that forgets you when you open a new window is the failure this
# app exists to avoid. That is only safe while "global" and "this one
# person" mean the same thing. If Columba is ever hosted for more than one
# person, scoping becomes mandatory -- and the boundary is per user, not per
# tab. Persistence and a rolling summary are Phase 7.
conversation_history = []

# ─────────────────────────────────────────
# CHARACTER ROUTES
# ─────────────────────────────────────────

@app.route('/character', methods=['GET'])
def get_character():
    """Frontend asks: is there a saved character?"""
    try:
        character = load_character()
        # test_mode rides along so the frontend can say so on screen before
        # anyone has typed anything. A test session must never be mistaken
        # for a real one.
        if character:
            return jsonify({
                "exists": True,
                "character": character,
                "test_mode": test_mode_enabled(),
            }), 200
        return jsonify({"exists": False, "test_mode": test_mode_enabled()}), 200
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


@app.route('/character', methods=['DELETE'])
def clear_character():
    """Start over -- forget the companion and run setup again.

    Quirks survive by default: they belong to the person, not the companion,
    so a new companion can carry them forward. Pass ?clear_quirks=true to
    wipe them instead. The UI asks which one before calling this.
    """
    global conversation_history

    try:
        # Quirks are kept unless explicitly asked for: ?clear_quirks=true
        # They belong to the person, not the companion, so carrying them to
        # a new companion is the default and clearing them is a choice.
        wants_clear = request.args.get('clear_quirks', '').lower() in ('1', 'true', 'yes')

        existed = delete_character()
        if wants_clear:
            # Sensitivities go with them. The checkbox says "what they know",
            # and leaving anything behind would make that label a lie.
            clear_quirks()
            clear_sensitivities()
        conversation_history = []

        return jsonify({
            "success": True,
            "existed": existed,
            "quirks_cleared": wants_clear,
        }), 200
    except Exception as e:
        return fail("Couldn't start over just now. Try again in a moment?", str(e))


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

        reply, conversation_history, analysis = chat(
            message=message,
            conversation_history=conversation_history,
            character=character
        )

        return jsonify({
            "reply": reply,
            "history_length": len(conversation_history),
            # The frontend gates its own copy on this -- what the app is
            # allowed to be playful about while this is going on.
            "intensity": analysis["intensity"],
            "test_mode": test_mode_enabled(),
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

# ─────────────────────────────────────────
# SENSITIVITY ROUTES
#
# Things to be careful with. Read and delete only -- nothing here can be
# added by hand, because a sensitivity is only ever recorded from what
# someone said about themselves.
# ─────────────────────────────────────────

@app.route('/sensitivities', methods=['GET'])
def get_sensitivities():
    """Everything the companion is quietly steering around."""
    try:
        return jsonify({
            "sensitivities": load_sensitivities(),
            "enabled": load_settings().get('sensitivities_enabled', True),
        }), 200
    except Exception as e:
        return fail("Couldn't load that just now 💙", str(e))


@app.route('/sensitivities', methods=['DELETE'])
def delete_all_sensitivities():
    try:
        clear_sensitivities()
        return jsonify({"success": True}), 200
    except Exception as e:
        return fail("Couldn't clear those just now 💙", str(e))


@app.route('/sensitivities/<topic>', methods=['DELETE'])
def delete_sensitivity(topic):
    try:
        if forget_sensitivity(topic):
            return jsonify({"success": True}), 200
        return fail(
            "Couldn't find that one to forget 💙",
            f"No sensitivity recorded for {topic!r}",
            status=404,
        )
    except Exception as e:
        return fail("Couldn't forget that one — try again?", str(e))


# ─────────────────────────────────────────
# SETTINGS ROUTES
# ─────────────────────────────────────────

@app.route('/settings', methods=['GET'])
def get_settings():
    try:
        return jsonify(load_settings()), 200
    except Exception as e:
        return fail("Couldn't load your settings just now 💙", str(e))


@app.route('/settings', methods=['PATCH'])
def patch_settings():
    """Partial update. Unknown keys are ignored rather than stored."""
    try:
        return jsonify(save_settings(request.get_json(silent=True) or {})), 200
    except Exception as e:
        return fail("Couldn't save that just now 💙", str(e))


@app.route('/quirks', methods=['GET'])
def get_quirks():
    """Frontend asks: what does the companion know about the user?"""
    try:
        quirks = load_quirks()
        return jsonify({"quirks": quirks}), 200
    except Exception as e:
        return fail("Couldn't load quirks right now.", str(e))


@app.route('/quirks', methods=['DELETE'])
def clear_all_quirks():
    """Forget everything the companion has learned, keeping the companion.

    Separate from DELETE /character on purpose: starting over on what's
    known about you and starting over on who you're talking to are two
    different decisions, and someone may want either one alone.
    """
    try:
        clear_quirks()
        return jsonify({"success": True}), 200
    except Exception as e:
        return fail("Couldn't clear those just now — try again?", str(e))


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