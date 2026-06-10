import asyncio
import os
import uvicorn
from datetime import datetime
from dotenv import load_dotenv

# Ensure env variables are loaded before imports
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ..services.db_client import db_client

from .routes import router
from .websocket import websocket_endpoint, websocket_manager # type: ignore
from ..agents.graph import railmind_graph # type: ignore
from ..agents.state import AgentState # type: ignore
from ..services.railways_api import RailwaysAPIClient

agent_wakeup_event = asyncio.Event()
hero_lock = asyncio.Lock()

app = FastAPI(
    title="RailMind Operations API",
    description="Autonomous railway operations intelligence agent API",
    version="0.1.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize railways client for fallback train list queries
api_key = os.getenv("RAILWAYS_API_KEY", "mock_key")
railways_client = RailwaysAPIClient(api_key=api_key)

# Global reference storing the most recent loop state from the agent background thread
latest_agent_state = {
    "raw_train_data": [],
    "anomalies": [],
    "claude_reasoning": "",
    "reroute_plan": None,
    "department_tasks": [],
    "sms_alerts_sent": [],
    "incident_report": None,
    "loop_count": 0,
    "should_continue": False,
    "last_api_call": "Never",
    "railways_latency_ms": 0,
    "ai_latency_ms": 0,
    "processed_trains": [],
    "simulate_hero": False
}

async def run_agent_loop():
    """
    Runs the LangGraph agent graph continuously in a background loop.
    """
    print("[AGENT LOOP] Starting background autonomous agent runner")

    if os.getenv("DEMO_MODE", "").lower() == "true":
        await agent_wakeup_event.wait()
        agent_wakeup_event.clear()
    
    while True:
        try:
            initial_state = AgentState(
                raw_train_data=[],
                anomalies=[],
                claude_reasoning="",
                reroute_plan=None,
                department_tasks=[],
                sms_alerts_sent=[],
                incident_report=None,
                loop_count=latest_agent_state.get("loop_count", 0),
                should_continue=False,
                last_api_call=latest_agent_state.get("last_api_call", "Never"),
                railways_latency_ms=latest_agent_state.get("railways_latency_ms", 0),
                ai_latency_ms=latest_agent_state.get("ai_latency_ms", 0),
                processed_trains=latest_agent_state.get("processed_trains", []),
                simulate_hero=latest_agent_state.get("simulate_hero", False)
            )
            hero_was_running = initial_state.get("simulate_hero", False)
            # Invoke graph using ainvoke
            result = await railmind_graph.ainvoke(initial_state)
            
            # Increment loop count on successful iteration
            if result:
                hero_requested_during_cycle = (
                    latest_agent_state.get("simulate_hero", False)
                    and not hero_was_running
                )
                result["loop_count"] = result.get("loop_count", 0) + 1
                # Sync to global object
                latest_agent_state.update(result)
                
                if hero_requested_during_cycle:
                    latest_agent_state["simulate_hero"] = True
                elif hero_was_running:
                    print("[RAILMIND] Hero scenario cycle complete. Resetting hero lock.")
                    latest_agent_state["simulate_hero"] = False
        except Exception as e:
            print(f"[RAILMIND] Agent loop error: {e}")
            latest_agent_state["simulate_hero"] = False
        finally:
            try:
                await asyncio.wait_for(agent_wakeup_event.wait(), timeout=60)
                agent_wakeup_event.clear()
            except asyncio.TimeoutError:
                pass

@app.on_event("startup")
async def startup_event():
    # Test connection on startup and clean collections:
    try:
        from ..services.db_client import client, db
        await asyncio.wait_for(client.admin.command('ping'), timeout=3.0)
        print("[RAILMIND] MongoDB Atlas connected [OK]")
    except Exception as e:
        print(f"[RAILMIND] MongoDB connection/cleanup failed: {e}")
        db_client.use_fallback = True

    # Run the agent workflow loop asynchronously in the background on API startup
    asyncio.create_task(run_agent_loop())

# Include general REST routers
app.include_router(router, prefix="/api")

# Mounting direct WebSocket handler
@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket_endpoint(websocket)

# REST Endpoint: GET /api/incidents - Fetch last 20 incidents (last 24h by default, or all=true)
@app.get("/api/incidents")
async def get_incidents_api(all: bool = False):
    try:
        from datetime import datetime, timedelta
        # Fetch up to 1000 incidents
        incidents = await db_client.get_incidents(limit=1000)
        if all:
            return incidents
            
        cutoff = datetime.utcnow() - timedelta(hours=24)
        filtered = []
        for inc in incidents:
            ts_str = inc.get("timestamp")
            if not ts_str:
                continue
            try:
                if isinstance(ts_str, datetime):
                    ts = ts_str
                else:
                    ts = datetime.fromisoformat(str(ts_str).replace("Z", "+00:00"))
                if ts.tzinfo is not None:
                    ts = ts.replace(tzinfo=None)
                if ts >= cutoff:
                    filtered.append(inc)
            except Exception:
                filtered.append(inc)
        return filtered
    except Exception as e:
        print(f"Error fetching incidents: {e}")
        return []

# REST Endpoint: GET /api/trains - Fetch current train statuses
@app.get("/api/trains")
async def get_trains_api():
    trains = latest_agent_state.get("raw_train_data", [])
    if not trains:
        # Fallback to mock data if empty
        return railways_client.mock_train_data()
    return trains

# REST Endpoint: GET /api/dept-tasks - Fetch pending tasks
@app.get("/api/dept-tasks")
async def get_dept_tasks_api():
    try:
        return await db_client.get_pending_department_tasks()
    except Exception as e:
        print(f"Error fetching department tasks: {e}")
        return []

# REST Endpoint: POST /api/dept-tasks/{id}/resolve - Mark task resolved
@app.post("/api/dept-tasks/{id}/resolve")
async def resolve_task_api(id: str):
    try:
        modified_count = await db_client.resolve_department_task(id)
        return {"status": "resolved", "modified_count": modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# REST Endpoint: POST /api/incidents/{id}/approve - Approve reroute plan
@app.post("/api/incidents/{id}/approve")
async def approve_incident_api(id: str):
    try:
        modified_count = await db_client.approve_incident(id)
        return {"status": "approved", "modified_count": modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# REST Endpoint: POST /api/simulate-hero - Trigger hero scenario
@app.post("/api/simulate-hero")
async def simulate_hero_api():
    async with hero_lock:
        if latest_agent_state.get("simulate_hero"):
            return {"status": "hero_scenario_already_in_progress", "message": "Hero scenario already active"}
        latest_agent_state["simulate_hero"] = True

    # Automatic Demo Cleanup (Issue 4 Modification 3)
    try:
        from ..services.db_client import db_client
        if not db_client.use_fallback:
            await asyncio.wait_for(
                asyncio.gather(
                    db_client.db.incidents.delete_many({}),
                    db_client.db.department_tasks.delete_many({})
                ),
                timeout=2.0
            )
        else:
            db_client._write_fallback({"incidents": [], "department_tasks": []})

        latest_agent_state["loop_count"] = 0
        latest_agent_state["anomalies"] = []
        latest_agent_state["department_tasks"] = []
        latest_agent_state["processed_trains"] = [] # Fix priority 1
        print("[RAILMIND] Automatic demo cleanup successful. Starting hero scenario.")
    except Exception as e:
        print(f"[RAILMIND] Demo cleanup warning: {e}")

    agent_wakeup_event.set()
    return {"status": "hero_scenario_activated"}

# REST Endpoint: GET /api/system-status -> returns all system statuses
@app.get("/api/system-status")
async def get_system_status():
    mongo_status = "Disconnected"
    try:
        from ..services.db_client import client
        await client.admin.command('ping')
        mongo_status = "Connected"
    except Exception:
        pass

    # Railways API
    railways_api_key = os.getenv("RAILWAYS_API_KEY", "")
    rapidapi_key = os.getenv("RAPIDAPI_KEY", "")
    is_railways_connected = (railways_api_key not in ["", "your_railways_api_key_here"]) or (rapidapi_key not in ["", "your_key_here"])
    railways_status = "Connected" if is_railways_connected else "Disconnected"

    # Twilio SMS
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    is_twilio_connected = twilio_sid not in ["", "mock_sid"] and twilio_token not in ["", "mock_token"]
    twilio_status = "Connected" if is_twilio_connected else "Disconnected"

    return {
        "agent_status": "ACTIVE",
        "model": "Gemini 2.0 Flash (primary) / Claude (fallback)",
        "railways_api": railways_status,
        "twilio_sms": twilio_status,
        "mongodb": mongo_status,
        "contacts": {
            "maintenance": os.getenv("MAINTENANCE_PHONE", "+919651058174"),
            "operations": os.getenv("OPERATIONS_PHONE", "+919651058174"),
            "station_manager": os.getenv("STATION_PHONE", "+919651058174")
        }
    }

# REST Endpoint: GET /api/telemetry -> returns timing metrics
@app.get("/api/telemetry")
async def get_telemetry_api():
    incident_count = 0
    task_count = 0
    try:
        from ..services.db_client import db
        incident_count, task_count = await asyncio.wait_for(
            asyncio.gather(
                db["incidents"].count_documents({}),
                db["department_tasks"].count_documents({})
            ),
            timeout=1.0
        )
    except Exception:
        pass

    return {
        "agent_loop_status": "running",
        "last_api_call": latest_agent_state.get("last_api_call", "Never"),
        "railways_latency_ms": latest_agent_state.get("railways_latency_ms", 0),
        "ai_latency_ms": latest_agent_state.get("ai_latency_ms", 0),
        "websocket_clients": len(websocket_manager.active_connections),
        "mongodb_incidents": incident_count,
        "mongodb_tasks": task_count,
        "is_hero_running": latest_agent_state.get("simulate_hero", False)
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
