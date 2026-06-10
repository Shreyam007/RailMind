import os
from autonomous.llm_client import LocalLLMClient

class RedTeamAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.report_file = "docs/red_team_report.md"

    def run(self):
        print("Running Red Team Agent...")

        prompt = """
        You are an elite Red Team Security Agent.
        Analyze the system architecture of a multi-agent orchestration platform using FastAPI, LangGraph, and MongoDB.
        Construct 3 advanced attack scenarios focusing on:
        - Supply-chain vulnerabilities in dependencies
        - Agent manipulation/Jailbreaking
        - Secret leakage through logs

        Output a detailed exploit report in Markdown.
        """

        report = self.llm.generate(prompt)

        if report:
            os.makedirs(os.path.dirname(self.report_file), exist_ok=True)
            with open(self.report_file, "w") as f:
                f.write("# Red Team Exploit Report\n\n")
                f.write(report)
            print(f"Red Team report saved to {self.report_file}")

if __name__ == "__main__":
    agent = RedTeamAgent()
    agent.run()
