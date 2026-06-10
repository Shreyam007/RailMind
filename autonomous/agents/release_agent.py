import os
from autonomous.llm_client import LocalLLMClient

class ReleaseAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.changelog_file = "CHANGELOG.md"

    def run(self):
        print("Running Release Agent...")

        prompt = """
        You are a Release Management Agent.
        The repository has just integrated a massive 20-agent autonomous operating system using local LLMs and GitHub actions.
        Generate a comprehensive, exciting v1.0.0 CHANGELOG entry detailing this transformation.
        Output ONLY the Markdown content for the release notes.
        """

        report = self.llm.generate(prompt)

        if report:
            with open(self.changelog_file, "w") as f:
                f.write(report)
            print(f"Changelog generated at {self.changelog_file}")

if __name__ == "__main__":
    agent = ReleaseAgent()
    agent.run()
