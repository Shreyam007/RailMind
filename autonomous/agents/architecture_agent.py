import os
import glob
from autonomous.llm_client import LocalLLMClient

class ArchitectureAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.output_dir = "docs/architecture"

    def run(self):
        print("Generating Architecture Diagrams...")
        os.makedirs(self.output_dir, exist_ok=True)

        # Read workflow definitions to understand actual architecture instead of a hardcoded string
        files = glob.glob("backend/agents/*.py") + glob.glob("backend/api/*.py")
        file_contents = []
        for file in files:
            try:
                with open(file, "r") as f:
                    content = f.read()
                    # Include up to the first 100 lines for graph logic
                    lines = content.split('\n')[:100]
                    file_contents.append(f"--- File: {file} ---\n" + "\n".join(lines) + "\n")
            except Exception:
                pass

        files_snippet = "\n".join(file_contents)

        prompt = f"""
        Based on the actual source code of our backend orchestration system:

        {files_snippet}

        Generate a valid Mermaid.js graph diagram illustrating the actual system architecture, nodes, and agent interactions based *only* on the code provided.
        Return ONLY the raw mermaid code inside a ```mermaid block. No other text.
        """

        response = self.llm.generate(prompt)

        if response and "```mermaid" in response:
            try:
                # Extract just the mermaid block
                mermaid_content = response.split("```mermaid")[1].split("```")[0].strip()

                output_file = os.path.join(self.output_dir, "system_architecture.md")
                with open(output_file, "w") as f:
                    f.write("# System Architecture\n\n```mermaid\n" + mermaid_content + "\n```\n")

                print(f"Architecture diagram saved to {output_file}")
            except Exception as e:
                print(f"Error parsing mermaid output: {e}")
        else:
            print("Failed to generate architecture diagram or invalid format received.")

if __name__ == "__main__":
    agent = ArchitectureAgent()
    agent.run()
