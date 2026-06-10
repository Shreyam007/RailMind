import os
from autonomous.llm_client import LocalLLMClient

class IdeationEngine:
    def __init__(self):
        self.llm = LocalLLMClient()
        self.roadmap_file = "docs/ROADMAP.md"
        self.ideas_dir = "docs/ideas"

    def run(self):
        print("Running Ideation & Roadmap Generation...")

        prompt = """
        You are the Product Manager and Founder for the RailMind Autonomous OS.
        Based on our mission to build a self-improving repository organization, suggest 3 highly innovative, patent-worthy features for our next major release.

        Output a Markdown report with feature descriptions, potential research directions, and strategic advantages.
        """

        print("Generating product ideas via LLM...")
        ideas = self.llm.generate(prompt)

        if ideas:
            os.makedirs(self.ideas_dir, exist_ok=True)
            import uuid
            idea_file = os.path.join(self.ideas_dir, f"idea_{uuid.uuid4().hex[:8]}.md")
            with open(idea_file, "w") as f:
                f.write("# Autonomous Ideation Engine Output\n\n")
                f.write(ideas)
            print(f"New product ideas saved to {idea_file}")

            # Update the roadmap file summary
            os.makedirs(os.path.dirname(self.roadmap_file), exist_ok=True)
            with open(self.roadmap_file, "w") as f:
                f.write("# RailMind Autonomous Roadmap\n\n")
                f.write("## Upcoming Initiatives (Auto-Generated)\n")
                f.write("Please check the `docs/ideas/` folder for the latest generated research and product directions.\n")
            print(f"Updated {self.roadmap_file}")

if __name__ == "__main__":
    agent = IdeationEngine()
    agent.run()
