import os
from autonomous.llm_client import LocalLLMClient

class DocumentationAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.readme_file = "README.md"

    def run(self):
        print("Reviewing Documentation...")

        # Read current README
        try:
            with open(self.readme_file, "r") as f:
                current_readme = f.read()
        except FileNotFoundError:
            current_readme = "No existing README found."

        prompt = f"""
        You are the Documentation Agent for the RailMind Autonomous OS.
        Review the current README and suggest additions related to the new autonomous agent architecture (Security, Repo Intelligence, Refactoring, Docs, Testing).

        Current README excerpt:
        {current_readme[:1500]} ...

        Generate a Markdown section titled "## 🤖 Autonomous OS Capabilities" to be appended to the README.
        """

        print("Generating README updates via LLM...")
        new_section = self.llm.generate(prompt)

        if new_section:
            # We append it if it doesn't already exist to avoid duplicating
            if "Autonomous OS Capabilities" not in current_readme:
                with open(self.readme_file, "a") as f:
                    f.write("\n\n" + new_section + "\n")
                print(f"Updated {self.readme_file} with new autonomous capabilities.")
            else:
                print("README already contains Autonomous OS Capabilities section.")

if __name__ == "__main__":
    agent = DocumentationAgent()
    agent.run()
