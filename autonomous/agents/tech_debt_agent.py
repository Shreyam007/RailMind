import os
import subprocess
from autonomous.llm_client import LocalLLMClient

class TechDebtAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.report_file = "docs/tech_debt_report.md"

    def run(self):
        print("Running Technical Debt Agent...")

        # Look for TODOs or FIXMEs in the codebase
        todos = []
        try:
            result = subprocess.run(
                ["grep", "-rnI", "TODO\\|FIXME", "backend/"],
                capture_output=True, text=True
            )
            if result.stdout:
                todos = result.stdout.strip().split("\n")
        except Exception:
            pass

        todos_snippet = "\n".join(todos[:20]) if todos else "No explicit TODOs/FIXMEs found."

        prompt = f"""
        You are a Technical Debt Management Agent.
        Analyze the following extracted TODO/FIXME comments and technical debt indicators:

        {todos_snippet}

        Generate a prioritized technical debt roadmap with actionable remediation steps. Output in Markdown.
        """

        report = self.llm.generate(prompt)

        if report:
            os.makedirs(os.path.dirname(self.report_file), exist_ok=True)
            with open(self.report_file, "w") as f:
                f.write("# Technical Debt Report\n\n")
                f.write(report)
            print(f"Tech Debt report saved to {self.report_file}")

if __name__ == "__main__":
    agent = TechDebtAgent()
    agent.run()
