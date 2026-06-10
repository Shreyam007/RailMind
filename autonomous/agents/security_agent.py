import os
import subprocess
from autonomous.llm_client import LocalLLMClient

class SecurityAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.report_file = "docs/security_report.md"

    def run(self):
        print("Running Security Checks...")

        # 1. Check for sensitive files or API keys exposed in common places
        # For a full implementation, this would integrate with Semgrep/Trivy outputs
        # from the GitHub action.
        findings = []

        try:
            # Simple grep for potential hardcoded secrets (excluding mock/test files)
            result = subprocess.run(
                ["grep", "-rnI", "-e", "api_key", "-e", "secret", "backend/"],
                capture_output=True, text=True
            )
            if result.stdout:
                # Filter out safe hits like environment variable accesses
                suspicious = [line for line in result.stdout.split('\n') if "os.getenv" not in line and line.strip()]
                if suspicious:
                    findings.append("Potential hardcoded secrets found:\n" + "\n".join(suspicious[:5]))
        except Exception:
            pass

        # 2. Red Teaming Simulation via LLM
        prompt = """
        You are a Red Team Security Agent attacking a multi-agent system (FastAPI, LangGraph, MongoDB).
        Generate 3 potential attack vectors focusing on:
        1. Prompt injection against the agent logic.
        2. RAG poisoning or data manipulation in the telemetry stream.
        3. Privilege escalation in the API.

        Output a concise Markdown list of threats.
        """

        print("Running LLM Red Team simulation...")
        red_team_analysis = self.llm.generate(prompt)

        # 3. Report Generation
        os.makedirs(os.path.dirname(self.report_file), exist_ok=True)
        with open(self.report_file, "w") as f:
            f.write("# Autonomous Security Report\n\n")

            if findings:
                f.write("## Static Analysis Findings\n")
                for finding in findings:
                    f.write(f"```text\n{finding}\n```\n")
            else:
                f.write("## Static Analysis Findings\nNo immediate hardcoded secrets detected.\n\n")

            f.write("## Red Team Threat Modeling\n")
            f.write(red_team_analysis if red_team_analysis else "Simulation failed.")

        print(f"Security report saved to {self.report_file}")

if __name__ == "__main__":
    agent = SecurityAgent()
    agent.run()
