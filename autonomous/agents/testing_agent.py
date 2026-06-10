import os
import subprocess
from autonomous.llm_client import LocalLLMClient

class TestingAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.report_file = "docs/testing_report.md"

    def run(self):
        print("Running Test Suite Integration...")

        test_output = ""
        try:
            print("Executing test_all.py...")
            result = subprocess.run(
                ["python", "test_all.py"],
                capture_output=True, text=True, timeout=120
            )
            test_output = result.stdout
        except subprocess.TimeoutExpired:
            test_output = "Test execution timed out."
        except Exception as e:
            test_output = f"Test execution failed: {e}"

        prompt = f"""
        You are a Testing and QA Agent.
        Review the following test output:

        {test_output[-2000:]}

        Identify any failures and propose 2 new unit test scenarios we should add to improve coverage.
        Output as a concise Markdown report.
        """

        print("Generating test analysis via LLM...")
        analysis = self.llm.generate(prompt)

        if analysis:
            os.makedirs(os.path.dirname(self.report_file), exist_ok=True)
            with open(self.report_file, "w") as f:
                f.write("# Autonomous Testing Report\n\n")
                f.write("## Recent Run Output Summary\n")
                f.write("```text\n")
                f.write(test_output[-1000:] if test_output else "No output.")
                f.write("\n```\n\n")
                f.write("## Test Gap Analysis\n")
                f.write(analysis)
            print(f"Testing report saved to {self.report_file}")

if __name__ == "__main__":
    agent = TestingAgent()
    agent.run()
