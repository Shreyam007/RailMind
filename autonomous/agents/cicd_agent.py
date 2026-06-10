import os
import glob
from autonomous.llm_client import LocalLLMClient

class CICDAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.report_file = "docs/cicd_report.md"

    def run(self):
        print("Running CI/CD Evolution Agent...")

        # Read current workflows
        workflows = glob.glob(".github/workflows/*.yml")
        workflow_contents = []
        for wf in workflows:
            try:
                with open(wf, "r") as f:
                    workflow_contents.append(f"--- Workflow: {wf} ---\n{f.read()}\n")
            except Exception:
                pass

        wf_data = "\n".join(workflow_contents) if workflow_contents else "No workflows found."

        prompt = f"""
        You are a CI/CD Evolution Agent.
        Analyze the current GitHub Actions workflows:

        {wf_data}

        Suggest 3 improvements for faster builds, better caching, and robust security scanning. Output as a Markdown report.
        """

        report = self.llm.generate(prompt)

        if report:
            os.makedirs(os.path.dirname(self.report_file), exist_ok=True)
            with open(self.report_file, "w") as f:
                f.write("# CI/CD Evolution Plan\n\n")
                f.write(report)
            print(f"CI/CD report saved to {self.report_file}")

if __name__ == "__main__":
    agent = CICDAgent()
    agent.run()
