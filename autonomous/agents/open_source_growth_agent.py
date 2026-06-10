import os
from autonomous.llm_client import LocalLLMClient

class OpenSourceGrowthAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.report_file = "docs/oss_growth_strategy.md"

    def run(self):
        print("Running Open Source Growth Agent...")

        prompt = """
        You are an Open Source Growth Agent.
        Analyze our project: a fully autonomous, self-improving repository OS for real-time railway anomaly detection.
        Benchmark against projects like Supabase, Cal.com, LangGraph, and OpenHands.
        Generate a 3-point strategy to improve our repository labels, templates, and onboarding documentation to attract top tier developers.
        Output in Markdown.
        """

        report = self.llm.generate(prompt)

        if report:
            os.makedirs(os.path.dirname(self.report_file), exist_ok=True)
            with open(self.report_file, "w") as f:
                f.write("# Open Source Growth Strategy\n\n")
                f.write(report)
            print(f"OSS Growth strategy saved to {self.report_file}")

if __name__ == "__main__":
    agent = OpenSourceGrowthAgent()
    agent.run()
