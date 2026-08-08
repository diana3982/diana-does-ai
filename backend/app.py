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
        return jsonify({"error": str(e)}), 500


@app.route('/character', methods=['POST'])
def set_character():
    """Frontend sends a new character config to save"""
    try:
        character = request.get_json()
        save_character(character)
        return jsonify({"success": True, "character": character}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
            return jsonify({"error": "Message cannot be empty"}), 400

        character = load_character()
        if not character:
            return jsonify({"error": "No character configured yet"}), 400

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
        return jsonify({"error": str(e)}), 500


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
        return jsonify({"error": str(e)}), 500


@app.route('/quirks/<topic>', methods=['DELETE'])
def delete_quirk(topic):
    """User wants to remove something from their profile"""
    try:
        success = forget_quirk(topic)
        if success:
            return jsonify({"success": True}), 200
        return jsonify({"error": "Topic not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# RUN THE APP
# ─────────────────────────────────────────

if __name__ == '__main__':
    app.run(debug=True, port=5000)