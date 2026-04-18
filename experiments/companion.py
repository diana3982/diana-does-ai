import anthropic
from dotenv import load_dotenv
import random

load_dotenv()

client = anthropic.Anthropic()

def get_stat(stat_name, description):
    """Helper function to get a stat rating from 1-5"""
    while True:
        print(f"\n{stat_name}: {description}")
        print("1 = very low | 3 = balanced | 5 = very high")
        choice = input(f"Rate {stat_name} (1-5): ").strip()
        if choice in ["1", "2", "3", "4", "5"]:
            return int(choice)
        print("Please enter a number between 1 and 5!")

def create_character():
    """Walk the user through building their companion"""
    print("\n✨ Let's build your companion ✨")
    print("─" * 40)

    # Gender
    print("\nWhat gender is your companion?")
    print("1. Female")
    print("2. Male")
    print("3. Non-binary")
    print("4. Surprise me!")
    
    gender_choice = input("\nChoose (1-4): ").strip()
    genders = {"1": "female", "2": "male", "3": "non-binary", "4": random.choice(["female", "male", "non-binary"])}
    gender = genders.get(gender_choice, "non-binary")

    # Age
    print("\nHow old is your companion?")
    print("1. Young adult (20s)")
    print("2. Established adult (30s)")
    print("3. Wise adult (40s+)")
    print("4. Surprise me!")
    
    age_choice = input("\nChoose (1-4): ").strip()
    ages = {"1": "in their 20s", "2": "in their 30s", "3": "in their 40s or older", "4": random.choice(["in their 20s", "in their 30s", "in their 40s or older"])}
    age = ages.get(age_choice, "in their 30s")

    # Tone
    print("\nWhat tone feels right for you?")
    print("1. Warm and nurturing (like a caring older sister)")
    print("2. Real talk (honest, direct, no sugarcoating)")
    print("3. Clinical (calm, professional, structured)")
    print("4. Spiritual (grounded, reflective, soulful)")
    print("5. Surprise me!")
    
    tone_choice = input("\nChoose (1-5): ").strip()
    tones = {
        "1": "warm and nurturing, like a caring older sister",
        "2": "honest and direct, no sugarcoating but still caring",
        "3": "calm, professional and structured like a therapist",
        "4": "grounded, reflective and soulful",
        "5": random.choice([
            "warm and nurturing, like a caring older sister",
            "honest and direct, no sugarcoating but still caring",
            "calm, professional and structured like a therapist",
            "grounded, reflective and soulful"
        ])
    }
    tone = tones.get(tone_choice, "warm and nurturing")

    # Stats
    print("\nNow let's set your companion's stats!")
    print("─" * 40)
    
    compassion = get_stat(
        "💛 Compassion",
        "How emotionally warm and empathetic is your companion?"
    )
    
    real_talk = get_stat(
        "💬 Real Talk",
        "How direct and honest is your companion, even when it's hard to hear?"
    )
    
    creativity = get_stat(
        "🎨 Creativity",
        "How often does your companion suggest creative outlets?"
    )
    
    humor = get_stat(
        "😄 Humor",
        "How much lightness and gentle humor does your companion bring?"
    )

    # Name
    print("\nFinally -- what would you like to call your companion?")
    name = input("Name: ").strip() or "Alex"

    return {
        "name": name,
        "gender": gender,
        "age": age,
        "tone": tone,
        "stats": {
            "compassion": compassion,
            "real_talk": real_talk,
            "creativity": creativity,
            "humor": humor
        }
    }

def build_system_prompt(character):
    """Turn the character config into a system prompt"""
    stats = character["stats"]
    
    # Build stat descriptions
    compassion_desc = "extremely warm and emotionally expressive" if stats["compassion"] >= 4 else "measured and calm" if stats["compassion"] <= 2 else "balanced in warmth"
    real_talk_desc = "very direct and unfiltered, never sugarcoating" if stats["real_talk"] >= 4 else "gentle and careful with hard truths" if stats["real_talk"] <= 2 else "honest but thoughtful"
    creativity_desc = "frequently suggests creative outlets like art, music, journaling" if stats["creativity"] >= 4 else "occasionally mentions creative outlets when very relevant" if stats["creativity"] <= 2 else "sometimes suggests creative outlets"
    humor_desc = "brings gentle humor and lightness naturally into conversation" if stats["humor"] >= 4 else "keeps things mostly serious and grounded" if stats["humor"] <= 2 else "uses light humor occasionally"



    # Map gender to pronouns
    pronoun_map = {
        "female": "she/her",
        "male": "he/him",
        "non-binary": "they/them"
    }
    pronouns = pronoun_map.get(character["gender"], "they/them")

    return f"""You are {character["name"]}, a {character["age"]} {character["gender"]} companion...
    Your pronouns are {pronouns}. Use these pronouns consistently throughout the conversation.
    Your tone is {character["tone"]}.

    Your personality stats:
    - Compassion level {stats["compassion"]}/5: You are {compassion_desc}
    - Real talk level {stats["real_talk"]}/5: You are {real_talk_desc}  
    - Creativity level {stats["creativity"]}/5: You {creativity_desc}
    - Humor level {stats["humor"]}/5: You {humor_desc}

    Always follow these rules:
    - Never provide harmful information
    - If someone seems to be in crisis, always encourage them to reach out to a trusted adult or call or text 988, the Suicide and Crisis Lifeline
    - Begin your very first response with a brief affirmation that reflects back what the user shared
    - Offer a closing affirmation if the user says goodbye or signals they're wrapping up
    - Use accessible language appropriate for teenagers
    - If pronouns are not provided, ask the user if they'd like to share them early in the conversation"""

def chat(character):
    """Main chat loop"""
    system_prompt = build_system_prompt(character)
    conversation_history = []
    
    print(f"\n{'─' * 40}")
    print(f"💬 {character['name']} is online ✅")
    print(f"{'─' * 40}")
    print(f"Type 'quit' to end the conversation\n")

    while True:
        user_input = input("You: ").strip()
        
        if user_input.lower() == "quit":
            print(f"\n{character['name']}: Take care of yourself, okay? You matter 💛")
            break
            
        if not user_input:
            continue

        conversation_history.append({
            "role": "user",
            "content": user_input
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

        print(f"\n{character['name']}: {assistant_message}\n")

def main():
    print("=" * 40)
    print("   💛 Welcome to Your Safe Space 💛")
    print("=" * 40)
    
    print("\nWould you like to:")
    print("1. Create your companion")
    print("2. Choose for me!")
    
    choice = input("\nChoose (1-2): ").strip()
    
    if choice == "2":
        # Random preset companion
        character = {
            "name": random.choice(["Alex", "Jordan", "Sam", "Riley", "Morgan"]),
            "gender": random.choice(["female", "male", "non-binary"]),
            "age": random.choice(["in their 20s", "in their 30s"]),
            "tone": "warm and nurturing, like a caring older sister",
            "stats": {
                "compassion": random.randint(3, 5),
                "real_talk": random.randint(2, 4),
                "creativity": random.randint(2, 4),
                "humor": random.randint(2, 4)
            }
        }
        print(f"\n✨ Meet {character['name']}! Your companion is ready 💛")
    else:
        character = create_character()
        print(f"\n✨ {character['name']} is ready for you 💛")

    chat(character)

if __name__ == "__main__":
    main()