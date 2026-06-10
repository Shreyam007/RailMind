import os
import subprocess
from autonomous.llm_client import LocalLLMClient

class BugHunterAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.report_file = "docs/bug_hunter_report.md"

    def run(self):
        print("Running Bug Hunter Agent...")

        # Run static analysis and linting
        try:
            import glob
            files = glob.glob("backend/**/*.py", recursive=True)
            if not files:
                lint_output = "No python files found to lint."
            else:
                # We'll use pylint/flake8 style output but simple compilation checks for now
                result = subprocess.run(
                    ["python", "-m", "py_compile"] + files,
                    capture_output=True, text=True
                )
                lint_output = result.stderr if result.returncode != 0 else "No compilation errors."
        except Exception as e:
            lint_output = f"Error running static checks: {e}"

        prompt = f"""
        You are an autonomous Bug Hunter Agent.
        Analyze the following output from static analysis tools running on our codebase:

        {lint_output}

        Identify any edge cases, race conditions, memory leaks, or syntax errors. Output a Markdown report.
        """

        report = self.llm.generate(prompt)

        if report:
            os.makedirs(os.path.dirname(self.report_file), exist_ok=True)
            with open(self.report_file, "w") as f:
                f.write("# Bug Hunter Analysis\n\n")
                f.write(report)
            print(f"Bug Hunter report saved to {self.report_file}")

if __name__ == "__main__":
    agent = BugHunterAgent()
    agent.run()
