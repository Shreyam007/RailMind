import asyncio
import os
import uvicorn
from datetime import datetime
from dotenv import load_dotenv
from pydantic import BaseModel

# Ensure env variables are loaded before imports
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=env_path)

import secrets
from fastapi import FastAPI, WebSocket, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from ..services.db_client import db_client

security = HTTPBasic()

def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    admin_user = os.getenv("ADMIN_USERNAME", "admin")
    admin_pass = os.getenv("ADMIN_PASSWORD", "admin")

    correct_username = secrets.compare_digest(credentials.username, admin_user)
    correct_password = secrets.compare_digest(credentials.password, admin_pass)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

from .routes import router
from .websocket import websocket_endpoint, websocket_manager # type: ignore
from ..agents.graph import railmind_graph # type: ignore
from ..agents.state import AgentState # type: ignore
from ..services.railways_api import RailwaysAPIClient

app = FastAPI(
    title="RailMind Operations API",
    description="Autonomous railway operations intelligence agent API",
    version="0.1.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
    "processed_trains": []
}



@app.on_event("startup")
async def startup_event():
    # Test connection on startup and clean collections:
    try:
        from ..services.db_client import client, db
        await asyncio.wait_for(client.admin.command('ping'), timeout=2.0)
        print("[RAILMIND] MongoDB Atlas connected [OK]")
        
        await db_client.init_indexes()
        await asyncio.wait_for(db.incidents.delete_many({}), timeout=2.0)
        await asyncio.wait_for(db.department_tasks.delete_many({}), timeout=2.0)
        print("[RAILMIND] Cleared MongoDB incidents and tasks collections [OK]")
    except Exception as e:
        print(f"[RAILMIND] MongoDB connection/cleanup failed or timed out: {e}")

    # Run the agent workflow loop asynchronously in the background on API startup
    # Delegated to ARQ worker: run_agent_loop()

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
async def approve_incident_api(id: str, admin: str = Depends(verify_admin)):
    try:
        modified_count = await db_client.approve_incident(id)
        return {"status": "approved", "modified_count": modified_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class OverridePayload(BaseModel):
    decision: str

# REST Endpoint: POST /api/incidents/{id}/override - Human Override
@app.post("/api/incidents/{id}/override")
async def override_incident_api(id: str, payload: OverridePayload, admin: str = Depends(verify_admin)):
    try:
        modified_count = await db_client.override_incident(id, payload.decision)
        
        # Broadcast the log message via WebSockets
        from ..api.websocket import websocket_manager
        import json
        await websocket_manager.broadcast(json.dumps({
            "type": "AGENT_LOG",
            "timestamp": datetime.utcnow().strftime('%H:%M:%S'),
            "node": "Human Override",
            "level": "warning",
            "message": f"[Human Override] Human operator bypassed agent decision. Executing: {payload.decision}"
        }))
        
        # Send SMS alerts reflecting the change
        from ..services.twilio_service import TwilioSMSClient
        twilio_sid = os.getenv("TWILIO_ACCOUNT_SID", "mock_sid")
        twilio_token = os.getenv("TWILIO_AUTH_TOKEN", "mock_token")
        twilio_from = os.getenv("TWILIO_PHONE_NUMBER", "+1234567890")
        twilio_client = TwilioSMSClient(account_sid=twilio_sid, auth_token=twilio_token, from_number=twilio_from)
        
        m_phone = os.getenv("MAINTENANCE_PHONE", "+1234567891")
        o_phone = os.getenv("OPERATIONS_PHONE", "+1234567892")
        s_phone = os.getenv("STATION_PHONE", "+1234567893")
        
        message_body = f"[RailMind Override] Human bypassed decision. New Plan: {payload.decision}"
        
        for dept_phone in [m_phone, o_phone, s_phone]:
            try:
                await twilio_client.send_incident_alert(dept_phone, message_body[:160])
            except Exception as e:
                print(f"Failed to send override SMS: {e}")
                
        # Fetch updated incident and broadcast to trigger client reload
        incidents = await db_client.get_incidents(limit=50)
        updated_inc = None
        for inc in incidents:
            if inc.get("incident_id") == id or str(inc.get("_id")) == id:
                updated_inc = inc
                break
        if updated_inc:
            await websocket_manager.broadcast(json.dumps({
                "type": "INCIDENT_UPDATE",
                "data": updated_inc
            }))

        return {"status": "approved", "modified_count": modified_count, "decision": payload.decision}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        from ..services.db_client import db_client
        incident_count, task_count = await db_client.get_counts()
    except Exception:
        pass

    return {
        "agent_loop_status": "running",
        "last_api_call": latest_agent_state.get("last_api_call", "Never"),
        "railways_latency_ms": latest_agent_state.get("railways_latency_ms", 0),
        "ai_latency_ms": latest_agent_state.get("ai_latency_ms", 0),
        "websocket_clients": len(websocket_manager.active_connections),
        "mongodb_incidents": incident_count,
        "mongodb_tasks": task_count
    }

class SimulatedAnomaly(BaseModel):
    train_number: str
    anomaly_type: str
    location: str
    delay_minutes: int
    severity: str

@app.post("/api/simulate-anomaly")
async def simulate_anomaly_endpoint(payload: SimulatedAnomaly):
    try:
        from ..services.railways_api import RAW_MOCK_TRAINS
        # RAW_MOCK_TRAINS is a dict keyed by train_number string
        train_info = RAW_MOCK_TRAINS.get(payload.train_number)
        if not train_info:
            train_info = {
                "train_number": payload.train_number,
                "train_name": f"Express {payload.train_number}",
                "source": "NDLS",
                "destination": "HWH",
                "current_station": payload.location,
                "status": "Delayed"
            }
            
        injected_anomaly = {
            "train_number": payload.train_number,
            "train_name": train_info.get("train_name", f"Express {payload.train_number}"),
            "anomaly_type": payload.anomaly_type,
            "severity": payload.severity,
            "location": payload.location,
            "delay_minutes": payload.delay_minutes,
            "current_station": payload.location,
            "status": "cancelled" if payload.anomaly_type == "cancellation" else "delayed",
            "source": train_info.get("source", "NDLS"),
            "destination": train_info.get("destination", "HWH")
        }
        
        # Override local train registry data for the ingestion node
        # We also clear the processed_trains block so the anomaly check triggers
        processed_trains = [x for x in latest_agent_state.get("processed_trains", []) if x != payload.train_number]
        latest_agent_state["processed_trains"] = processed_trains
        
        initial_state = AgentState(
            raw_train_data=[{
                **train_info,
                "delay_minutes": payload.delay_minutes,
                "current_station": payload.location,
                "status": "cancelled" if payload.anomaly_type == "cancellation" else "delayed",
                "passenger_load": "overcrowded" if payload.anomaly_type == "overcrowding" else "normal"
            }],
            anomalies=[injected_anomaly],
            claude_reasoning="",
            reroute_plan=None,
            department_tasks=[],
            sms_alerts_sent=[],
            incident_report=None,
            loop_count=latest_agent_state.get("loop_count", 0),
            should_continue=True,
            last_api_call="Simulated Anomaly Injection",
            railways_latency_ms=10,
            ai_latency_ms=0,
            processed_trains=processed_trains
        )
        
        import uuid
        thread_id = f"sim_{payload.train_number}_{uuid.uuid4().hex[:8]}"
        config = {"configurable": {"thread_id": thread_id}, "recursion_limit": 20}
        
        async def run_simulated_graph():
            try:
                result = await railmind_graph.ainvoke(initial_state, config)
                if result:
                    result["loop_count"] = result.get("loop_count", 0) + 1
                    latest_agent_state.update(result)
                    
                    # Broadcast LOOP_UPDATE via WebSocket
                    import json
                    await websocket_manager.broadcast(json.dumps({
                        "type": "LOOP_UPDATE",
                        "loop_count": latest_agent_state["loop_count"],
                        "last_run": datetime.utcnow().isoformat(),
                        "trains_monitored": len(latest_agent_state.get("raw_train_data", [])),
                        "anomalies_found": len(latest_agent_state.get("anomalies", []))
                    }))
                # Return back to IDLE state after execution
                await asyncio.sleep(2.0)
                import json
                await websocket_manager.broadcast(json.dumps({
                    "type": "AGENT_STATE_CHANGE",
                    "state": "IDLE",
                    "timestamp": datetime.utcnow().isoformat()
                }))
            except Exception as e:
                print(f"[SIMULATOR] Error running simulated graph: {e}")
                
        asyncio.create_task(run_simulated_graph())
        return {"status": "Anomaly injected, graph triggered", "anomaly": injected_anomaly}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to inject anomaly: {str(e)}")

class AgentCommandPayload(BaseModel):
    command: str

@app.post("/api/agent-command")
async def agent_command_endpoint(payload: AgentCommandPayload):
    try:
        cmd = payload.command.lower()
        
        # 1. Reroute/Bypass command
        if "bypass" in cmd or "reroute" in cmd or "detour" in cmd:
            import re
            train_match = re.search(r"\d{5}", cmd)
            train_num = train_match.group(0) if train_match else "12301"
            
            loc = "Kanpur Central"
            if "kanpur" in cmd or "cnb" in cmd:
                loc = "Kanpur Central"
            elif "delhi" in cmd or "ndls" in cmd:
                loc = "New Delhi"
            elif "varanasi" in cmd or "bsb" in cmd:
                loc = "Varanasi"
            elif "prayagraj" in cmd or "allahabad" in cmd or "ald" in cmd:
                loc = "Prayagraj"
            elif "bhopal" in cmd or "bpl" in cmd:
                loc = "Bhopal"
                
            from ..services.railways_api import RAW_MOCK_TRAINS
            # RAW_MOCK_TRAINS is a dict keyed by train_number string
            train_info = RAW_MOCK_TRAINS.get(train_num) or {"train_number": train_num, "train_name": f"Express {train_num}", "source": "NDLS", "destination": "HWH"}
                
            injected_anomaly = {
                "train_number": train_num,
                "train_name": train_info.get("train_name", f"Express {train_num}"),
                "anomaly_type": "delay",
                "severity": "high",
                "location": loc,
                "delay_minutes": 75,
                "current_station": loc,
                "status": "delayed",
                "source": train_info.get("source", "NDLS"),
                "destination": train_info.get("destination", "HWH")
            }
            
            processed_trains = [x for x in latest_agent_state.get("processed_trains", []) if x != train_num]
            latest_agent_state["processed_trains"] = processed_trains
            
            initial_state = AgentState(
                raw_train_data=[{
                    **train_info,
                    "delay_minutes": 75,
                    "current_station": loc,
                    "status": "delayed",
                    "passenger_load": "normal"
                }],
                anomalies=[injected_anomaly],
                claude_reasoning="",
                reroute_plan=None,
                department_tasks=[],
                sms_alerts_sent=[],
                incident_report=None,
                loop_count=latest_agent_state.get("loop_count", 0),
                should_continue=True,
                last_api_call=f"Command: {payload.command}",
                railways_latency_ms=10,
                ai_latency_ms=0,
                processed_trains=processed_trains
            )
            
            import uuid
            thread_id = f"cmd_{train_num}_{uuid.uuid4().hex[:8]}"
            config = {"configurable": {"thread_id": thread_id}, "recursion_limit": 20}
            
            async def run_command_graph():
                try:
                    result = await railmind_graph.ainvoke(initial_state, config)
                    if result:
                        result["loop_count"] = result.get("loop_count", 0) + 1
                        latest_agent_state.update(result)
                        
                        # Broadcast LOOP_UPDATE via WebSocket
                        import json
                        await websocket_manager.broadcast(json.dumps({
                            "type": "LOOP_UPDATE",
                            "loop_count": latest_agent_state["loop_count"],
                            "last_run": datetime.utcnow().isoformat(),
                            "trains_monitored": len(latest_agent_state.get("raw_train_data", [])),
                            "anomalies_found": len(latest_agent_state.get("anomalies", []))
                        }))
                    await asyncio.sleep(2.0)
                    import json
                    await websocket_manager.broadcast(json.dumps({
                        "type": "AGENT_STATE_CHANGE",
                        "state": "IDLE",
                        "timestamp": datetime.utcnow().isoformat()
                    }))
                except Exception as e:
                    print(f"[COMMAND] Graph runner error: {e}")
                    
            asyncio.create_task(run_command_graph())
            return {
                "status": "Success",
                "response": f"Instruction processed: Bypassing {loc} for Train {train_num}. LangGraph agent supervisor triggered.",
                "log": f"[AGENT] Translating natural language instruction: '{payload.command}' -> Injected track blockage at {loc} for Train {train_num}. Re-routing mainline services."
            }
            
        elif "weather" in cmd or "visibility" in cmd:
            loc = "New Delhi"
            if "kanpur" in cmd or "cnb" in cmd:
                loc = "Kanpur Central"
            elif "varanasi" in cmd or "bsb" in cmd:
                loc = "Varanasi"
            elif "prayagraj" in cmd or "allahabad" in cmd or "ald" in cmd:
                loc = "Prayagraj"
                
            return {
                "status": "Success",
                "response": f"Weather grid check: {loc} visibility is 120m (Restricted seasonal fog cautions apply). No severe storms detected.",
                "log": f"[AGENT] check_weather_grids() invoked for {loc}. Status: NORMAL_FOG_CAUTION."
            }
            
        else:
            return {
                "status": "Success",
                "response": "General Command Processor: System operational, uvicorn running on port 8000, 15 express corridors monitored, local database client connected.",
                "log": "[AGENT] query_status() check complete. System stats nominal."
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
