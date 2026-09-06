import json
import os

QUIRKS_FILE = os.path.join(os.path.dirname(__file__), 'data/quirks.json')

def load_quirks():
    # Gitignored, like the character file -- what the companion has
    # learned about someone never leaves their machine. Missing file
    # just means nothing has been learned yet.
    if not os.path.exists(QUIRKS_FILE):
        return {}
    with open(QUIRKS_FILE, 'r') as f:
        return json.load(f)

def save_quirks(quirks):
    os.makedirs(os.path.dirname(QUIRKS_FILE), exist_ok=True)
    with open(QUIRKS_FILE, 'w') as f:
        json.dump(quirks, f, indent=2)

def update_quirk(topic, sentiment, enthusiasm, category):
    quirks = load_quirks()
    
    topic = topic.lower().strip()
    
    if topic in quirks:
        # Topic exists -- update it
        quirks[topic]['mentions'] += 1
        
        # Bump score based on sentiment and enthusiasm
        if sentiment == 'positive':
            quirks[topic]['score'] = min(5.0, quirks[topic]['score'] + (0.5 * enthusiasm))
        elif sentiment == 'negative':
            quirks[topic]['score'] = max(0.0, quirks[topic]['score'] - 0.5)
        
        # Update confidence based on mention count
        mentions = quirks[topic]['mentions']
        if mentions >= 5:
            quirks[topic]['confidence'] = 'HIGH'
        elif mentions >= 3:
            quirks[topic]['confidence'] = 'MEDIUM'
        else:
            quirks[topic]['confidence'] = 'LOW'
            
        quirks[topic]['sentiment'] = sentiment
        
    else:
        # Brand new topic!!
        initial_score = 0.5 * enthusiasm if sentiment == 'positive' else 0.0
        quirks[topic] = {
            'score': round(initial_score, 1),
            'mentions': 1,
            'confidence': 'LOW',
            'sentiment': sentiment,
            'category': category
        }
    
    save_quirks(quirks)
    return quirks

def clear_quirks():
    """Forget everything at once -- offered when someone starts over.

    Never called on its own: starting over asks first, and keeping quirks
    is just as valid a choice as clearing them.
    """
    save_quirks({})
    return True

def forget_quirk(topic):
    quirks = load_quirks()
    topic = topic.lower().strip()
    
    if topic in quirks:
        del quirks[topic]
        save_quirks(quirks)
        return True
    return False

def build_quirks_context():
    quirks = load_quirks()
    
    if not quirks:
        return ""
    
    # Only inject MEDIUM or HIGH confidence quirks into system prompt
    # LOW confidence ones are still being verified
    relevant = {k: v for k, v in quirks.items() 
                if v['confidence'] in ['MEDIUM', 'HIGH']}
    
    if not relevant:
        return ""
    
    lines = ["Things you know about this user:"]
    for topic, data in relevant.items():
        sentiment_label = "loves" if data['score'] >= 3.5 else "likes" if data['score'] >= 2.0 else "dislikes"
        lines.append(f"- {sentiment_label} {topic} (confidence: {data['confidence']}, score: {data['score']}/5)")

    # How these get used matters more than whether they do. Being remembered
    # should feel like being seen, not like being watched, and the whole
    # difference is in the phrasing: "you know what sounds good..." leaves
    # someone free to claim it or let it pass, while "i know you like X"
    # hands them evidence that a file is being kept on them.
    lines.append("")
    lines.append(
        "Never announce what you know. Do not say \"I know you like X\" or "
        "\"you mentioned X before\" -- that turns being remembered into being "
        "recorded, and it puts the user on the spot. Let it show up sideways "
        "instead, inside something you were already saying: what you suggest, "
        "what you notice, an example you reach for. Leave them free to pick it "
        "up or let it pass without comment. If none of it fits what they are "
        "actually talking about right now, do not mention any of it. Silence is "
        "always better than a detail worked in for its own sake."
    )

    return "\n".join(lines)