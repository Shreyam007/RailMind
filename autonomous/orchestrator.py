import os
import sys

# Ensure autonomous module can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from autonomous.agents.repo_intelligence import RepoIntelligenceAgent
from autonomous.agents.architecture_agent import ArchitectureAgent
from autonomous.agents.security_agent import SecurityAgent
from autonomous.agents.refactoring_agent import RefactoringAgent
from autonomous.agents.documentation_agent import DocumentationAgent
from autonomous.agents.testing_agent import TestingAgent
from autonomous.agents.ideation_engine import IdeationEngine
from autonomous.agents.bug_hunter_agent import BugHunterAgent
from autonomous.agents.red_team_agent import RedTeamAgent
from autonomous.agents.blue_team_agent import BlueTeamAgent
from autonomous.agents.performance_agent import PerformanceAgent
from autonomous.agents.devops_agent import DevOpsAgent
from autonomous.agents.cicd_agent import CICDAgent
from autonomous.agents.research_agent import ResearchAgent
from autonomous.agents.contributor_experience_agent import ContributorExperienceAgent
from autonomous.agents.open_source_growth_agent import OpenSourceGrowthAgent
from autonomous.agents.dependency_agent import DependencyAgent
from autonomous.agents.release_agent import ReleaseAgent
from autonomous.agents.tech_debt_agent import TechDebtAgent
from autonomous.agents.roadmap_agent import RoadmapAgent

def main():
    print("🤖 Starting RailMind Autonomous OS Loop (Full 20-Agent Roster)...")

    agents = [
        ("Repository Intelligence", RepoIntelligenceAgent),
        ("Architecture", ArchitectureAgent),
        ("Security", SecurityAgent),
        ("Bug Hunter", BugHunterAgent),
        ("Red Team", RedTeamAgent),
        ("Blue Team", BlueTeamAgent),
        ("Dependency", DependencyAgent),
        ("Performance", PerformanceAgent),
        ("Refactoring", RefactoringAgent),
        ("Testing", TestingAgent),
        ("DevOps", DevOpsAgent),
        ("CI/CD Evolution", CICDAgent),
        ("Documentation", DocumentationAgent),
        ("Ideation", IdeationEngine),
        ("Research Scientist", ResearchAgent),
        ("Contributor Experience", ContributorExperienceAgent),
        ("Open Source Growth", OpenSourceGrowthAgent),
        ("Release Management", ReleaseAgent),
        ("Technical Debt", TechDebtAgent),
        ("Roadmap", RoadmapAgent)
    ]

    for i, (name, agent_class) in enumerate(agents, 1):
        print(f"\n[{i}/{len(agents)}] Running {name} Agent...")
        try:
            agent_instance = agent_class()
            agent_instance.run()
        except Exception as e:
            print(f"⚠️ Error running {name} Agent: {e}")

    print("\n✅ Autonomous OS Loop Completed Successfully.")

if __name__ == "__main__":
    main()
