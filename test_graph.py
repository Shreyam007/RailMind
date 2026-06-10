import asyncio
import os
import sys

# Ensure backend can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.agents.graph import railmind_graph # type: ignore
from backend.agents.state import AgentState # type: ignore

async def main():
    # Initial state
    initial_state = {
        "raw_train_data": [],
        "anomalies": [],
        "claude_reasoning": "",
        "reroute_plan": None,
        "department_tasks": [],
        "sms_alerts_sent": [],
        "incident_report": None,
        "loop_count": 0,
        "should_continue": False
    }
    
    print("--- Running RailMind Graph test run ---")
    
    # We will step through the graph for a single cycle
    # Since it loops infinitely back to ingest_node, we can stream the steps and stop after detect_node
    step_count = 0
    config = {"configurable": {"thread_id": "test_graph_1"}, "recursion_limit": 20}

    visited_nodes = []

    async for event in railmind_graph.astream(initial_state, config):
        node_names = list(event.keys())
        visited_nodes.extend(node_names)
        print(f"\n[EVENT] Node complete: {node_names}")
        for node_name, state_val in event.items():
            print(f"  - Raw trains count: {len(state_val.get('raw_train_data', []))}")
            print(f"  - Anomalies count: {len(state_val.get('anomalies', []))}")
            print(f"  - Should continue: {state_val.get('should_continue')}")
        
        step_count += 1
        if step_count >= 15:
            print("\n[TEST] Stopping stream to prevent infinite test loop.")
            break

    assert "supervisor_node" in visited_nodes, "The graph should route through the supervisor_node."
    assert "report_node" in visited_nodes or "END" in visited_nodes or (visited_nodes[-1] == "supervisor_node" and len(visited_nodes) < 15), "The run should eventually reach the report_node or gracefully END based on routing logic."

    print("\n[SUCCESS] Graph architecture behaves as expected.")

if __name__ == "__main__":
    asyncio.run(main())
