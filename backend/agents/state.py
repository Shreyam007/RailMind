from typing import TypedDict, List, Optional, Annotated
import operator

class TrainAnomaly(TypedDict):
    train_number: str
    train_name: str
    anomaly_type: str  # "delay", "overcrowding", "track_fault", "cancellation"
    severity: str      # "low", "medium", "high", "critical"
    location: str
    delay_minutes: Optional[int]
    passenger_load: Optional[str]

class DepartmentTask(TypedDict):
    department: str    # "maintenance", "operations", "station_manager"
    task_description: str
    urgency: str
    action_required: str

class AgentState(TypedDict):
    raw_train_data: List[dict]
    anomalies: List[TrainAnomaly]
    claude_reasoning: str
    reroute_plan: Optional[str]
    department_tasks: List[DepartmentTask]
    sms_alerts_sent: List[str]
    incident_report: Optional[str]
    loop_count: int
    should_continue: bool
    last_api_call: str
    railways_latency_ms: int
    ai_latency_ms: int
    processed_trains: List[str]

