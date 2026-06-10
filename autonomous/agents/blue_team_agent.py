import os
from autonomous.llm_client import LocalLLMClient

class BlueTeamAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.report_file = "docs/blue_team_report.md"

    def run(self):
        print("Running Blue Team Agent...")

        # In a real scenario, this reads the Red Team's output
        red_team_output = "No current red team data found."
        try:
            with open("docs/red_team_report.md", "r") as f:
                red_team_output = f.read()
        except Exception:
            pass

        prompt = f"""
        You are an elite Blue Team Security Agent.
        Based on the following Red Team Exploit Report:

        {red_team_output}

        Generate actionable defensive strategies, patches, and safeguard implementations for the repository. Output in Markdown.
        """

        report = self.llm.generate(prompt)

        if report:
            os.makedirs(os.path.dirname(self.report_file), exist_ok=True)
            with open(self.report_file, "w") as f:
                f.write("# Blue Team Defense Strategies\n\n")
                f.write(report)
            print(f"Blue Team report saved to {self.report_file}")

if __name__ == "__main__":
    agent = BlueTeamAgent()
    agent.run()
