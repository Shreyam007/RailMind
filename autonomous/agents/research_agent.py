import os
from autonomous.llm_client import LocalLLMClient

class ResearchAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.report_file = "docs/ideas/research_directions.md"

    def run(self):
        print("Running Research Scientist Agent...")

        prompt = """
        You are the Principal Research Scientist for the RailMind Autonomous OS.
        Generate a brief report on the state-of-the-art in autonomous multi-agent orchestration for anomaly detection in real-time streams.
        Identify 2 cutting-edge techniques we should integrate (e.g., specific advanced RAG methods or novel LangGraph node types).
        Output in Markdown format.
        """

        report = self.llm.generate(prompt)

        if report:
            os.makedirs(os.path.dirname(self.report_file), exist_ok=True)
            with open(self.report_file, "w") as f:
                f.write("# Autonomous Research Directions\n\n")
                f.write(report)
            print(f"Research directions saved to {self.report_file}")

if __name__ == "__main__":
    agent = ResearchAgent()
    agent.run()
