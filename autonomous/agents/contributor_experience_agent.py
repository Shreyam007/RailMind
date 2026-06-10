import os
from autonomous.llm_client import LocalLLMClient

class ContributorExperienceAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.report_file = "docs/contributor_experience.md"

    def run(self):
        print("Running Contributor Experience Agent...")

        prompt = """
        You are a Developer Relations and Contributor Experience Agent.
        Review the concept of our autonomous self-improving repository.
        Generate a set of guidelines and a template structure for new open-source contributors interacting with a codebase that rewrites itself.
        How should humans review machine PRs? Output in Markdown.
        """

        report = self.llm.generate(prompt)

        if report:
            os.makedirs(os.path.dirname(self.report_file), exist_ok=True)
            with open(self.report_file, "w") as f:
                f.write("# Contributor Experience Guidelines\n\n")
                f.write(report)
            print(f"Contributor Experience report saved to {self.report_file}")

if __name__ == "__main__":
    agent = ContributorExperienceAgent()
    agent.run()
