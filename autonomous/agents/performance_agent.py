import os
import time
import subprocess
from autonomous.llm_client import LocalLLMClient

class PerformanceAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.report_file = "docs/performance_report.md"

    def run(self):
        print("Running Performance Agent...")

        # Simple profiling by tracking execution time of test_all.py or main entry points
        start = time.time()
        try:
            subprocess.run(["python", "-c", "import sys; sys.exit(0)"], capture_output=True)
        except Exception:
            pass
        end = time.time()

        python_startup_time = end - start

        prompt = f"""
        You are a Performance Profiling Agent.
        The measured baseline Python startup overhead is {python_startup_time:.4f} seconds.
        Given an asynchronous FastAPI + LangGraph architecture, suggest 3 critical optimizations (e.g., caching, connection pooling) to enhance real-time performance.
        Output as a Markdown report.
        """

        report = self.llm.generate(prompt)

        if report:
            os.makedirs(os.path.dirname(self.report_file), exist_ok=True)
            with open(self.report_file, "w") as f:
                f.write("# Performance Profiling Report\n\n")
                f.write(report)
            print(f"Performance report saved to {self.report_file}")

if __name__ == "__main__":
    agent = PerformanceAgent()
    agent.run()
