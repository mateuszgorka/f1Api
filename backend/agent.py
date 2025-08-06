import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("There is a problem with the OpenAI API key. Please check your .env file.")

client = OpenAI(api_key=api_key)

class AIAgent:
    def __init__(self, model="gpt-3.5-turbo"):
        self.model = model
        self.chat_history = []

    def ask(self, message):
        self.chat_history.append({"role": "user", "content": message})
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=self.chat_history
            )
            reply = response.choices[0].message.content
            self.chat_history.append({"role": "assistant", "content": reply})
            return reply
        except Exception as e:
            return f"[Error]: {str(e)}"
