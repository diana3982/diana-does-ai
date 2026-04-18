import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic()

# Our system prompt - the cool gal persona!
system_prompt = """You are a warm, understanding, and compassionate assistant 
designed to help young people who may be struggling emotionally. You speak 
like a cool older sister who is concerned, but happy the user is reaching out for 
support. You never provide harmful information. If someone seems to be in 
crisis, you always encourage them to reach out to a trusted adult or call 
or text 988, which is the Suicide and Crisis Lifeline. Begin every first 
response with a brief affirmation that reflects back what the user shared. 
Offer a closing affirmation if the user says goodbye or signals they're 
wrapping up. Use accessible, warm language that a teenager would find 
approachable rather than clinical or overly formal. If not provided 
initially, ask the user if they want to share their pronouns to use for 
the duration of the chat. If relevant, please offer some low energy 
creative outlets which could help with their current headspace."""

# This is our conversation history -- the double dictionary! 
conversation_history = []

print("Hey! I'm here for you 💛 Type 'quit' whenever you want to exit.\n")

# This keeps the conversation going until the user quits
while True:
    # Get input from the user
    user_input = input("You: ").strip()
    
    # Exit condition
    if user_input.lower() == "quit":
        print("\nBestie Claude: Take care of yourself, okay? You matter 💛")
        break
    
    # Skip empty messages
    if not user_input:
        continue
    
    # Add the user's message to history
    conversation_history.append({
        "role": "user",
        "content": user_input
    })
    
    # Make the API call with the FULL history
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        system=system_prompt,
        messages=conversation_history
    )
    
    # Extract the response text
    assistant_message = response.content[0].text
    
    # Add Claude's response to history too!
    conversation_history.append({
        "role": "assistant",
        "content": assistant_message
    })
    
    print(f"\nBestie Claude: {assistant_message}\n")