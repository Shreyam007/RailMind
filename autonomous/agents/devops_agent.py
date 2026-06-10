import os
from autonomous.llm_client import LocalLLMClient

class DevOpsAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.report_file = "docs/devops_report.md"

    def run(self):
        print("Running DevOps Agent...")

        prompt = """
        You are a DevOps Automation Agent.
        Analyze the current system requirements (Python backend, React frontend, local MongoDB, Dockerized Ollama).
        Suggest an optimized deployment strategy utilizing self-hosted infrastructure (e.g. Kubernetes, Docker Swarm) ensuring high availability for the multi-agent system.
        Output as a Markdown report.
        """

        report = self.llm.generate(prompt)

        if report:
            os.makedirs(os.path.dirname(self.report_file), exist_ok=True)
            with open(self.report_file, "w") as f:
                f.write("# DevOps & Deployment Strategy\n\n")
                f.write(report)
            print(f"DevOps report saved to {self.report_file}")

if __name__ == "__main__":
    agent = DevOpsAgent()
    agent.run()
