import os
import glob
from autonomous.llm_client import LocalLLMClient

class RepoIntelligenceAgent:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.knowledge_file = "docs/knowledge_graph.md"

    def run(self):
        print("Analyzing repository structure and code logic...")

        # Get a high-level view of the backend directory structure and read core logic
        files = glob.glob("backend/**/*.py", recursive=True)
        file_contents = []
        for file in files:
            try:
                with open(file, "r") as f:
                    content = f.read()
                    # Include up to the first 50 lines to avoid token explosion but capture intent
                    lines = content.split('\n')[:50]
                    file_contents.append(f"--- File: {file} ---\n" + "\n".join(lines) + "\n")
            except Exception:
                pass

        files_snippet = "\n".join(file_contents)

        prompt = f"""
        Analyze the following Python files and their contents from the repository. Generate a high-level summary of the architecture:

        {files_snippet}

        Output a Markdown document with:
        1. A brief overview of the actual logic implemented.
        2. Key components identified from the source.
        3. Detailed potential agent workflows based on the actual classes and functions present.
        """

        print("Requesting insights from Local LLM...")
        summary = self.llm.generate(prompt)

        if summary:
            os.makedirs(os.path.dirname(self.knowledge_file), exist_ok=True)
            with open(self.knowledge_file, "w") as f:
                f.write(summary)
            print(f"Knowledge graph saved to {self.knowledge_file}")
        else:
            print("Failed to generate knowledge graph due to LLM error or timeout.")

if __name__ == "__main__":
    agent = RepoIntelligenceAgent()
    agent.run()
