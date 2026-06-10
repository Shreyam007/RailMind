import os
from autonomous.llm_client import LocalLLMClient

class RoadmapAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.report_file = "docs/ROADMAP.md"

    def run(self):
        print("Running Roadmap Agent...")

        prompt = """
        You are a Strategic Roadmap Agent.
        Based on our mission to build a fully autonomous, multi-agent repository orchestration system for RailMind, generate a clear, quarter-by-quarter roadmap.
        Include milestones for:
        1. Agent maturity and observability
        2. Live operations scaling
        3. Security hardening

        Output in Markdown.
        """

        report = self.llm.generate(prompt)

        if report:
            os.makedirs(os.path.dirname(self.report_file), exist_ok=True)
            with open(self.report_file, "w") as f:
                f.write("# RailMind Autonomous Roadmap\n\n")
                f.write(report)
            print(f"Roadmap saved to {self.report_file}")

if __name__ == "__main__":
    agent = RoadmapAgent()
    agent.run()
