import os
import subprocess
from autonomous.llm_client import LocalLLMClient

class RefactoringAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.report_file = "docs/tech_debt_report.md"

    def run(self):
        print("Analyzing codebase for tech debt...")

        # Look for large Python files (rough proxy for complexity)
        large_files = []
        try:
            result = subprocess.run(
                ["find", "backend/", "-name", "*.py", "-size", "+2k"],
                capture_output=True, text=True
            )
            if result.stdout:
                large_files = result.stdout.strip().split("\n")
        except Exception:
            pass

        file_contents = []
        for file in large_files:
            if not file.strip():
                continue
            try:
                with open(file, "r") as f:
                    content = f.read()
                    lines = content.split('\n')
                    # Include more content for refactoring analysis
                    file_contents.append(f"--- File: {file} ---\n" + "\n".join(lines[:150]) + "\n")
            except Exception:
                pass

        files_snippet = "\n".join(file_contents) if file_contents else "No complex files found."

        prompt = f"""
        You are a Technical Debt and Refactoring Agent.
        Analyze the source code of the most complex files in the repository:

        {files_snippet}

        Suggest 3 specific, actionable structural refactoring improvements to modularize the codebase based on the code provided above. Identify functions or classes that violate single-responsibility principles.
        Output as a Markdown report.
        """

        print("Generating refactor plan via LLM...")
        report = self.llm.generate(prompt)

        if report:
            os.makedirs(os.path.dirname(self.report_file), exist_ok=True)
            with open(self.report_file, "w") as f:
                f.write("# Technical Debt & Refactoring Plan\n\n")
                f.write(report)
            print(f"Refactoring plan saved to {self.report_file}")

if __name__ == "__main__":
    agent = RefactoringAgent()
    agent.run()
