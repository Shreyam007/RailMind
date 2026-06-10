from langgraph.graph import StateGraph, END  # type: ignore
from .state import AgentState  # type: ignore
from .nodes import (  # type: ignore
    ingest_node, detect_node, reason_node,
    reroute_node, coordination_node, alert_node, report_node
)

workflow = StateGraph(AgentState)
workflow.add_node("ingest_node", ingest_node)
workflow.add_node("detect_node", detect_node)
workflow.add_node("reason_node", reason_node)
workflow.add_node("reroute_node", reroute_node)
workflow.add_node("coordination_node", coordination_node)
workflow.add_node("alert_node", alert_node)
workflow.add_node("report_node", report_node)

workflow.set_entry_point("ingest_node")

def route_from_detect(state: AgentState) -> str:
    anomalies = state.get("anomalies", [])
    if not anomalies:
        return "ingest_node"
    return "reason_node"

workflow.add_conditional_edges("detect_node", route_from_detect)
workflow.add_edge("ingest_node", "detect_node")
workflow.add_edge("reason_node", "reroute_node")
workflow.add_edge("reroute_node", "coordination_node")
workflow.add_edge("coordination_node", "alert_node")
workflow.add_edge("alert_node", "report_node")
workflow.add_edge("report_node", END)

railmind_graph = workflow.compile()


