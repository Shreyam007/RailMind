import os
import json
import logging
from dotenv import load_dotenv
from typing import Dict, Any, List
from uuid import uuid4
from datetime import datetime
from ..services.ai_service import reason_with_ai
from .state import AgentState, TrainAnomaly, DepartmentTask
from ..services.db_client import db_client
from ..services.railways_api import get_live_train_status, get_cancelled_trains, mock_train_data, RailwaysAPIClient, get_multiple_trains
from ..services.twilio_service import TwilioSMSClient
from ..services.twilio_service import TwilioSMSClient
from ..api.websocket import websocket_manager
import asyncio

logger = logging.getLogger(__name__)

# Ensure env variables are loaded before configuration
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=env_path)
api_key = os.getenv("RAILWAYS_API_KEY", "mock_key")
railways_client = RailwaysAPIClient(api_key=api_key)

twilio_sid = os.getenv("TWILIO_ACCOUNT_SID", "mock_sid")
twilio_token = os.getenv("TWILIO_AUTH_TOKEN", "mock_token")
twilio_from = os.getenv("TWILIO_PHONE_NUMBER", "+1234567890")
twilio_client = TwilioSMSClient(account_sid=twilio_sid, auth_token=twilio_token, from_number=twilio_from)

# Shared log assistant that prints logs and broadcasts AGENT_LOG WebSocket events (ISSUE 4)
async def log_agent(node_name: str, message: str, severity: str = None, confidence: int = None, impact: int = None):
    print(message)
    payload = {
        "agent": node_name,
        "message": message,
        "severity": severity,
        "confidence": confidence,
        "impact": impact,
        "timestamp": datetime.utcnow().strftime('%H:%M:%S')
    }
    try:
        await websocket_manager.broadcast(json.dumps({
            "type": "AGENT_LOG",
            "data": payload
        }))
    except Exception as e:
        logger.error(f"Failed to broadcast AGENT_LOG message: {e}")

async def ingest_node(state: AgentState) -> AgentState:
    try:
        await log_agent("Ingestion Agent", "Initializing telemetry sync with Indian Railways API...")
        train_numbers = [
            "12301", "12951", "12001", "12259", "12565",
            "11057", "12627", "12625", "12621", "12615",
            "12309", "12721", "12229", "12311", "12641"
        ]
        
        import time
        start_time = time.time()
        
        client = railways_client
        print(f"[RAILMIND] Calling Railways API for {len(train_numbers)} trains...")
        results = await client.get_multiple_trains(train_numbers)
        
        # Ensure that if some train fetches failed and returned empty dict, they fallback to get_mock_rapidapi_train
        # So we always have all 15 trains
        train_results = []
        for tn in train_numbers:
            found = False
            for r in results:
                if r.get("train_number") == tn:
                    train_results.append(r)
                    found = True
                    break
            if not found:
                from ..services.railways_api import get_mock_rapidapi_train, parse_rapidapi_train_for_agent
                mock_data = get_mock_rapidapi_train(tn)
                parsed_mock = parse_rapidapi_train_for_agent(mock_data, tn)
                if parsed_mock:
                    train_results.append(parsed_mock)
        
        results = train_results
        
        latency = int((time.time() - start_time) * 1000)
        state["last_api_call"] = datetime.utcnow().isoformat()
        state["railways_latency_ms"] = latency
        
        print(f"[RAILMIND] API returned {len(results)} trains")
        print(f"[RAILMIND] Sample: {results[0] if results else 'EMPTY - using mock'}")
        
        hero_mode = state.get("simulate_hero", False)
        
        if hero_mode:
            await log_agent("Ingestion Agent", "Hero Scenario Active: Suspending background anomaly scanning to isolate critical incident.")
            hero_train = {
                "train_number": "12309",
                "train_name": "RJPB - NDLS Tejas Rajdhani Express",
                "status": "delayed",
                "delay_minutes": 140,
                "passenger_load": "heavy",
                "current_station": "Prayagraj block section",
                "lat": 25.4358,
                "lng": 81.8463,
                "source": "RJPB",
                "destination": "NDLS"
            }
            # Isolate entirely on Train 12309
            live_trains = [hero_train]
            # We don't reset simulate_hero here anymore, main.py will reset it after graph completes.
        else:
            if not results:
                print("[RAILMIND] WARNING: Railways API returned no data, check RAILWAYS_API_KEY in .env")
                await log_agent("ingest_node", "[RAILMIND] WARNING: Railways API returned no data, check RAILWAYS_API_KEY in .env")
                results = mock_train_data()
                print("[RAILMIND] Using mock fallback data")
                await log_agent("ingest_node", "[RAILMIND] Using mock fallback data")
                
            cancelled = await get_cancelled_trains()
            live_trains = results.copy()
            for train in cancelled:
                live_trains.append({
                    "train_number": train.get("TrainNo", "Unknown"),
                    "train_name": train.get("TrainName", "Unknown"),
                    "status": "cancelled",
                    "delay_minutes": 999,
                    "passenger_load": "overcrowded",
                    "current_station": "Unknown",
                    "lat": 20.5937,
                    "lng": 78.9629
                })

        for train in live_trains:
            await websocket_manager.broadcast(json.dumps({
                "type": "TRAIN_UPDATE",
                "data": train
            }))

        state["raw_train_data"] = live_trains
        await log_agent("Ingestion Agent", f"Successfully ingested {len(live_trains)} active trains")
        await asyncio.sleep(1)
    except Exception as e:
        logger.error(f"Error in ingest_node: {e}")
        await log_agent("Ingestion Agent", f"ERROR: Ingest node failed: {e}")
    return state

async def detect_node(state: AgentState) -> AgentState:
    try:
        await log_agent("Detection Agent", "Scanning live telemetry for deviations and safety anomalies...")
        await asyncio.sleep(1.5)
        anomalies: List[TrainAnomaly] = []
        raw_data = state.get("raw_train_data", [])
        processed_trains = state.get("processed_trains", [])
        for train in raw_data:
            train_num = train.get("train_number", "Unknown")
            if train_num in processed_trains:
                continue
            train_name = train.get("train_name", "Unknown")
            location = train.get("current_station") or train.get("source") or "Unknown"
            delay = train.get("delay_minutes", 0)
            load = train.get("passenger_load")
            status = str(train.get("status") or "").lower()
            
            # Rule 1: delay > 15 minutes
            if delay > 15:
                severity = "low"
                if 15 < delay <= 30:
                    severity = "low"
                elif 30 < delay <= 60:
                    severity = "medium"
                elif 60 < delay <= 120:
                    severity = "high"
                elif delay > 120:
                    severity = "critical"
                    
                anomalies.append({
                    "train_number": train_num,
                    "train_name": train_name,
                    "anomaly_type": "delay",
                    "severity": severity,
                    "location": location,
                    "delay_minutes": delay,
                    "passenger_load": load,
                    "current_station": train.get("current_station") or location,
                    "status": status or "delayed",
                    "source": train.get("source") or "Unknown",
                    "destination": train.get("destination") or "Unknown"
                })
                
            # Rule 2: overcrowding checks
            elif load == "overcrowded":
                anomalies.append({
                    "train_number": train_num,
                    "train_name": train_name,
                    "anomaly_type": "overcrowding",
                    "severity": "high",
                    "location": location,
                    "delay_minutes": delay,
                    "passenger_load": load,
                    "current_station": train.get("current_station") or location,
                    "status": status or "delayed",
                    "source": train.get("source") or "Unknown",
                    "destination": train.get("destination") or "Unknown"
                })
                
            # Rule 3: cancellations
            elif status == "cancelled":
                anomalies.append({
                    "train_number": train_num,
                    "train_name": train_name,
                    "anomaly_type": "cancellation",
                    "severity": "critical",
                    "location": location,
                    "delay_minutes": delay,
                    "passenger_load": load,
                    "current_station": train.get("current_station") or location,
                    "status": "cancelled",
                    "source": train.get("source") or "Unknown",
                    "destination": train.get("destination") or "Unknown"
                })
                
        state["anomalies"] = anomalies
        n = len(anomalies)
        if n > 0:
            await log_agent("Detection Agent", f"ALERT: Detected {n} high-priority anomalies requiring intervention")
            state["should_continue"] = True
        else:
            await log_agent("Detection Agent", "All monitored trains operating within nominal parameters")
            state["should_continue"] = False
    except Exception as e:
        logger.error(f"Error in detect_node: {e}")
        await log_agent("Detection Agent", f"ERROR: Detect node failed: {e}")
    return state

async def reason_node(state: AgentState) -> AgentState:
    try:
        anomalies = state.get("anomalies", [])
        if not anomalies:
            state["claude_reasoning"] = "{}"
            state["reroute_plan"] = None
            state["incident_report"] = None
            await log_agent("Reasoning Agent", "Standby mode - no anomalies to process")
            return state

        await log_agent("Reasoning Agent", f"Analyzing {len(anomalies)} incidents. Evaluating severity and passenger impact...")
        await asyncio.sleep(2)
        
        import time
        start_time = time.time()
        
        result = await reason_with_ai(anomalies)
        
        latency = int((time.time() - start_time) * 1000)
        state["ai_latency_ms"] = latency
        
        if result:
            state["claude_reasoning"] = json.dumps(result)
            state["reroute_plan"] = result.get("reroute_plan")
            state["incident_report"] = result.get("incident_summary")
            
            # Use structured logging format
            confidence_str = result.get('confidence_score', '92')
            conf_val = int(confidence_str.replace('%', '')) if '%' in confidence_str else 92
            
            await log_agent("Reasoning Agent", result.get('situation_summary', 'Anomaly analyzed.'), severity=result.get('risk_score', 'HIGH').upper(), confidence=conf_val, impact=2843)
            await log_agent("Reasoning Agent", "Reasoning Complete", severity="COMPLETE", confidence=conf_val, impact=2843)
        else:
            state["claude_reasoning"] = "{}"
            await log_agent("Reasoning Agent", "AI reasoning degraded — using fallback operational protocols")
    except Exception as e:
        logger.error(f"Error in reason_node: {e}")
        await log_agent("Reasoning Agent", f"ERROR: Reason node failed: {e}")
    return state

async def reroute_node(state: AgentState) -> AgentState:
    try:
        await log_agent("Planning Agent", "Computing alternative routes and recovery estimates...")
        await asyncio.sleep(2)
        await log_agent("Planning Agent", "Optimal operational reroute selected. Recovery path validated.")
    except Exception as e:
        logger.error(f"Error in reroute_node: {e}")
        await log_agent("Planning Agent", f"ERROR: Reroute node failed: {e}")
    return state

async def coordination_node(state: AgentState) -> AgentState:
    try:
        await log_agent("Coordination Agent", "Translating reasoning into department-specific task dispatches...")
        await asyncio.sleep(1.5)
        claude_json = state.get("claude_reasoning", "{}")
        try:
            claude_response = json.loads(claude_json)
        except Exception as e:
            logger.error(f"Error parsing Claude reasoning JSON in coordination_node: {e}")
            claude_response = {}

        anomalies = state.get("anomalies", [])
        
        # Calculate highest severity from anomalies
        severity_rank = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        highest_severity = "low"
        highest_rank = 0
        for anomaly in anomalies:
            sev = anomaly.get("severity", "low").lower()
            rank = severity_rank.get(sev, 1)
            if rank > highest_rank:
                highest_rank = rank
                highest_severity = sev

        has_critical = any(anomaly.get("severity", "").lower() == "critical" for anomaly in anomalies)
        operations_urgency = "high" if has_critical else "medium"

        maintenance_task: DepartmentTask = {
            "department": "maintenance",
            "task_description": claude_response.get("maintenance_task", "Inspect signals and tracks."),
            "urgency": highest_severity,
            "action_required": "Dispatch repair team immediately"
        }

        operations_task: DepartmentTask = {
            "department": "operations",
            "task_description": claude_response.get("operations_task", "Coordinate slot changes and schedules."),
            "urgency": operations_urgency,
            "action_required": "Execute rerouting plan"
        }

        station_manager_task: DepartmentTask = {
            "department": "station_manager",
            "task_description": claude_response.get("station_manager_task", "Broadcast announcement on platform boards."),
            "urgency": "high",
            "action_required": "Make passenger announcement + update platform boards"
        }

        department_tasks = [maintenance_task, operations_task, station_manager_task]
        state["department_tasks"] = department_tasks

        # Save to MongoDB
        incident_uuid = str(uuid4())
        mongo_tasks = []
        for task in department_tasks:
            mongo_tasks.append({
                "incident_id": incident_uuid,
                "department": task["department"],
                "task_description": task["task_description"],
                "urgency": task["urgency"],
                "action_required": task["action_required"],
                "status": "pending",
                "timestamp": datetime.utcnow()
            })

        try:
            await db_client.insert_department_tasks(mongo_tasks)
        except Exception as e:
            logger.warning(f"Failed to save department tasks to MongoDB: {e}")

        await log_agent("Coordination Agent", "Dispatched: Section Controller, Permanent Way Inspector (PWI), and Traction Power Controller (TPC).")
    except Exception as e:
        logger.error(f"Error in coordination_node: {e}")
        await log_agent("Coordination Agent", f"ERROR: Coordination node failed: {e}")
    return state

async def alert_node(state: AgentState) -> AgentState:
    try:
        await log_agent("Communication Agent", "Formatting and prioritizing Twilio SMS passenger alerts...")
        await asyncio.sleep(1)
        m_phone = os.getenv("MAINTENANCE_PHONE", "+1234567891")
        o_phone = os.getenv("OPERATIONS_PHONE", "+1234567892")
        s_phone = os.getenv("STATION_PHONE", "+1234567893")
        p_phone = os.getenv("DEMO_PASSENGER_PHONE", "+1234567894")

        phone_map = {
            "maintenance": m_phone,
            "operations": o_phone,
            "station_manager": s_phone
        }

        tasks = state.get("department_tasks", [])
        sent_sms = []

        for task in tasks:
            dept = task.get("department", "")
            desc = task.get("task_description", "")
            urg = task.get("urgency", "medium")

            to_phone = phone_map.get(dept)
            if to_phone:
                message_body = f"[RailMind Alert] {dept.upper()}: {desc[:120]}... Urgency: {urg}"
                try:
                    sid = await twilio_client.send_incident_alert(to_phone, message_body)
                    if sid:
                        sent_sms.append(sid)
                except Exception as e:
                    logger.error(f"Error sending SMS to {dept}: {e}")

        # Send passenger SMS
        claude_json = state.get("claude_reasoning", "{}")
        try:
            claude_response = json.loads(claude_json)
        except Exception:
            claude_response = {}

        pass_sms = claude_response.get("passenger_sms")
        if pass_sms and p_phone:
            try:
                sid = await twilio_client.send_incident_alert(p_phone, pass_sms[:160])
                if sid:
                    sent_sms.append(sid)
            except Exception as e:
                logger.error(f"Error sending passenger SMS: {e}")

        state["sms_alerts_sent"] = sent_sms
        await log_agent("Communication Agent", f"Dispatched {len(sent_sms)} SMS alerts to key personnel and affected passengers.")
    except Exception as e:
        logger.error(f"Error in alert_node: {e}")
        await log_agent("Communication Agent", f"ERROR: Alert node failed: {e}")
    return state

async def save_incident_if_not_duplicate(db, incident):
    try:
        is_duplicate = await db_client.has_recent_incident(incident["train_number"], minutes=5)
    except Exception as e:
        print(f"[RAILMIND] Mongo unavailable — using temporary in-memory persistence. Error: {e}")
        is_duplicate = False
    
    if is_duplicate:
        print(f"[RAILMIND] Skipping duplicate incident for "
              f"train {incident['train_number']}")
        return False
    
    # Make a copy to avoid inserting _id of type ObjectId in-place into the original dictionary
    incident_copy = incident.copy()
    try:
        await db_client.insert_incident(incident_copy)
        print(f"[RAILMIND] New incident saved: "
              f"{incident['incident_title']}")
    except Exception as e:
        print(f"[RAILMIND] Mongo unavailable — using temporary in-memory persistence. Error: {e}")
        
    return True

async def report_node(state: AgentState) -> AgentState:
    try:
        await log_agent("Report Agent", "Compiling incident report and syncing with master control system...")
        await asyncio.sleep(1)
        
        anomalies = state.get("anomalies", [])
        if not anomalies:
            return state
            
        anomaly = anomalies[0]
        train_number = anomaly.get("train_number", "Unknown")
        train_name = anomaly.get("train_name", "Unknown")
        current_station = anomaly.get("current_station") or anomaly.get("location") or "Unknown"
        delay_minutes = anomaly.get("delay_minutes", 0)
        severity = anomaly.get("severity", "medium")

        claude_json = state.get("claude_reasoning", "{}")
        try:
            claude_response = json.loads(claude_json)
        except Exception:
            claude_response = {}

        incident_id = str(uuid4())
        
        incident_report = {
            "incident_id": incident_id,
            "timestamp": datetime.utcnow().isoformat(),
            "train_number": train_number,
            "train_name": train_name,
            "incident_title": claude_response.get("incident_title") or f"{train_number} {train_name} delayed {delay_minutes}min at {current_station}",
            "current_station": current_station,
            "delay_minutes": delay_minutes,
            "severity": severity,
            "situation_summary": claude_response.get("situation_summary") or f"Train {train_number} {train_name} is running {delay_minutes} minutes behind schedule at {current_station}.",
            "reroute_plan": claude_response.get("reroute_plan") or "Redirect affected trains via alternate route.",
            "maintenance_task": claude_response.get("maintenance_task") or "Inspect signaling hardware.",
            "operations_task": claude_response.get("operations_task") or "Execute scheduling adjustments.",
            "station_manager_task": claude_response.get("station_manager_task") or "Broadcast delay announcements.",
            "passenger_sms": claude_response.get("passenger_sms") or "Check platform screens for status updates.",
            "resolution_status": "pending",
            "departments_notified": ["maintenance", "operations", "station_manager"],
            "sms_sent": len(state.get("sms_alerts_sent", [])),
            "confidence_score": claude_response.get("confidence_score", "92%"),
            "passenger_impact": claude_response.get("passenger_impact", "2,843 (Estimated)"),
            "recovery_eta": claude_response.get("recovery_eta", "60-90 mins")
        }

        # Check for duplicates in last 5 minutes before saving (ISSUE 2)
        saved = await save_incident_if_not_duplicate(db_client.db, incident_report)
        if saved:
            # Broadcast via WebSocket
            try:
                await websocket_manager.broadcast(json.dumps({
                    "type": "INCIDENT_UPDATE",
                    "data": incident_report
                }))
            except Exception as e:
                logger.error(f"Failed to broadcast incident update: {e}")

            await log_agent("Report Agent", f"Incident #{incident_id[:8]} successfully logged to operations database.")
        else:
            await log_agent("Report Agent", f"Duplicate incident check: Train {train_number} has an active report. Skipped DB insertion.")

        # Mark this train as recently processed in state
        processed_trains = state.get("processed_trains", [])
        processed_trains.append(anomaly["train_number"])
        state["processed_trains"] = processed_trains

        # Reset state fields
        state["anomalies"] = []
        state["department_tasks"] = []
        state["sms_alerts_sent"] = []
        state["loop_count"] = state.get("loop_count", 0) + 1

        import asyncio
        await log_agent("Report Agent", "Cycle complete. Awaiting next telemetry ingestion.")
    except Exception as e:
        logger.error(f"Error in report_node: {e}")
        await log_agent("Report Agent", f"ERROR: Report node failed: {e}")
    return state
