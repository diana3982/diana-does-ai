import anthropic
from dotenv import load_dotenv

# Load your API key from .env
load_dotenv()

# Create the client
client = anthropic.Anthropic()

# Send a message!
message = client.messages.create(
    model="claude-opus-4-5",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello Claude! I'm Diana and I'm just learning how to use the Anthropic API for the first time. Do you know any silly AI jokes?"}
    ]
)

print(message.content[0].text)