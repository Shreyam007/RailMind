import os
import json
import httpx
from typing import Dict, Any, Optional

class LocalLLMClient:
    """Client for interacting with local Ollama models for autonomous repository tasks."""

    def __init__(self, host: str = "http://127.0.0.1:11434", model: str = "llama3.1"):
        self.host = os.getenv("OLLAMA_HOST", host)
        self.model = os.getenv("OLLAMA_MODEL", model)
        self.api_url = f"{self.host}/api/generate"

    def generate(self, prompt: str, system_prompt: Optional[str] = None, json_format: bool = False) -> str:
        """Generate a response from the local LLM."""

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False
        }

        if system_prompt:
            payload["system"] = system_prompt

        if json_format:
            payload["format"] = "json"

        try:
            with httpx.Client(timeout=300.0) as client:
                response = client.post(self.api_url, json=payload)
                response.raise_for_status()
                return response.json().get("response", "")
        except Exception as e:
            print(f"Error calling local LLM: {e}")
            return "{}" if json_format else ""

    def generate_json(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Generate a JSON response from the local LLM and parse it."""
        response_text = self.generate(prompt, system_prompt, json_format=True)
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            print(f"Failed to parse LLM response as JSON: {response_text}")
            return {}
