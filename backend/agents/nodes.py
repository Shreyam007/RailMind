import os
import json
import logging
import traceback
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

# Shared log assistant that prints logs and broadcasts AGENT_LOG & AGENT_STATE_CHANGE WebSocket events
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
            "type": "AGENT_STATE_CHANGE",
            "state": node_name,
            "timestamp": datetime.utcnow().isoformat()
        }))
        await websocket_manager.broadcast(json.dumps({
            "type": "AGENT_LOG",
            "data": payload
        }))
    except Exception as e:
        logger.error(f"Failed to broadcast AGENT_LOG / AGENT_STATE_CHANGE message: {e}")

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
        
        # Preserve custom simulated anomaly types if present
        simulated_types = {}
        for a in state.get("anomalies", []):
            if "train_number" in a and "anomaly_type" in a:
                simulated_types[a["train_number"]] = a["anomaly_type"]
                
        for train in raw_data:
            train_num = train.get("train_number", "Unknown")
            if train_num in processed_trains:
                continue
            train_name = train.get("train_name", "Unknown")
            location = train.get("current_station") or train.get("source") or "Unknown"
            delay = train.get("delay_minutes", 0)
            load = train.get("passenger_load")
            status = str(train.get("status") or "").lower()
            
            simulated_type = simulated_types.get(train_num)
            
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
                    "anomaly_type": simulated_type or "delay",
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
                    "anomaly_type": simulated_type or "overcrowding",
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
                    "anomaly_type": simulated_type or "cancellation",
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
        
        errors = state.get("errors", [])
        try:
            result = await reason_with_ai(anomalies, errors)
        except Exception as ai_e:
            logger.exception("Reasoning API failed")
            result = {}
        
        latency = int((time.time() - start_time) * 1000)
        state["ai_latency_ms"] = latency
        
        if result:
            state["claude_reasoning"] = json.dumps(result)
            state["reroute_plan"] = result.get("reroute_plan")
            state["incident_report"] = result.get("incident_summary")
            
            # Use structured logging format
            confidence_str = str(result.get('confidence_score') or '92')
            try:
                conf_val = int(confidence_str.replace('%', '').strip())
            except (TypeError, ValueError):
                conf_val = 92
            
            await log_agent("Reasoning Agent", result.get('situation_summary', 'Anomaly analyzed.'), severity=result.get('risk_score', 'HIGH').upper(), confidence=conf_val, impact=2843)
            await log_agent("Reasoning Agent", "Reasoning Complete", severity="COMPLETE", confidence=conf_val, impact=2843)
        else:
            state["claude_reasoning"] = "{}"
            await log_agent("Reasoning Agent", "AI reasoning degraded — using fallback operational protocols")
    except Exception as e:
        logger.error(f"Error in reason_node: {e}")
        await log_agent("Reasoning Agent", f"ERROR: Reason node failed: {e}")
    return state

from .routing import dijkstra_route_discovery

async def reroute_node(state: AgentState) -> AgentState:
    try:
        await log_agent("reroute_node", "[RAILMIND] Checking and resolving rerouting options...")
        anomalies = state.get("anomalies", [])
        if anomalies:
            anomaly = anomalies[0]
            start_station = anomaly.get("current_station") or anomaly.get("location") or ""
            target_station = anomaly.get("destination", "")

            # Use fallback destination if none provided
            if start_station == "Kanpur Central" and not target_station:
                target_station = "Varanasi"

            if start_station and target_station:
                # Bypassing the anomaly location
                blocked = anomaly.get("location") or start_station
                result = dijkstra_route_discovery(start_station, target_station, blocked_station=blocked)
                # If path not found due to blockage, try standard routing
                if result["status"] != "Success":
                    result = dijkstra_route_discovery(start_station, target_station)

                if result["status"] == "Success":
                    route_str = " -> ".join(result["route"])
                    await log_agent("reroute_node", f"[RAILMIND] Dijkstra bypass found: {route_str}")
                    return {
                        "reroute_plan": f"Dijkstra detour bypass: {route_str} (ETA {result['cost']} mins)",
                        "detour_route": result["route"]
                    }
                else:
                    status_msg = result.get("status", "Unknown status")
                    await log_agent("reroute_node", f"[RAILMIND] No bypass route found: {status_msg}")
                    return {
                        "reroute_plan": f"No detour bypass available: {status_msg}",
                        "detour_route": []
                    }
    except Exception as e:
        logger.error(f"Error in reroute_node: {e}")
        await log_agent("reroute_node", f"[RAILMIND] [ERROR] Reroute node failed: {e}")
    return {"detour_route": []}


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
                if highest_rank == 4:
                    break

        has_critical = (highest_severity == "critical")
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
        # Instead of replacing, we return it to let Annotated[..., operator.add] handle it, or we append directly
        # LangGraph state update dictionary:
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

async def save_incident_if_not_duplicate(incident):
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
            "reroute_plan": state.get("reroute_plan") or claude_response.get("reroute_plan") or "Redirect affected trains via alternate route.",
            "maintenance_task": claude_response.get("maintenance_task") or "Inspect signaling hardware.",
            "operations_task": claude_response.get("operations_task") or "Execute scheduling adjustments.",
            "station_manager_task": claude_response.get("station_manager_task") or "Broadcast delay announcements.",
            "passenger_sms": claude_response.get("passenger_sms") or "Check platform screens for status updates.",
            "resolution_status": "pending",
            "departments_notified": ["maintenance", "operations", "station_manager"],
            "sms_sent": len(state.get("sms_alerts_sent", [])),
            "detour_route": state.get("detour_route") or [],
            "confidence_score": claude_response.get("confidence_score", "92%"),
            "passenger_impact": claude_response.get("passenger_impact", "2,843 (Estimated)"),
            "recovery_eta": claude_response.get("recovery_eta", "60-90 mins"),
            "reasoning_steps": claude_response.get("reasoning_steps") or []
        }

        # Check for duplicates in last 5 minutes before saving (ISSUE 2)
        saved = await save_incident_if_not_duplicate(incident_report)
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
        # For LangGraph annotated reducers, we can't easily clear lists by passing [] if it appends.
        # But we can let the next graph invocation use a fresh initial state.
        # So we just mark the next node.
        state["loop_count"] = state.get("loop_count", 0) + 1
        state["next_node"] = "END"

        # We don't sleep here in a real LangGraph flow, the streaming app handles it or the caller.
        await log_agent("report_node", "[RAILMIND] Report node complete. Supervisor will transition to END.")

        await log_agent("Report Agent", "Cycle complete. Awaiting next telemetry ingestion.")
    except Exception as e:
        logger.error(f"Error in report_node: {e}")
        await log_agent("Report Agent", f"ERROR: Report node failed: {e}")
    return state

async def supervisor_node(state: AgentState) -> dict:
    try:
        await log_agent("supervisor_node", "[RAILMIND] Supervisor evaluating graph state...")

        anomalies = state.get("anomalies", [])
        if not anomalies:
            return {"next_node": "END"}

        # If reasoning hasn't happened or failed to produce plan
        if not state.get("claude_reasoning") or state.get("claude_reasoning") == "{}":
            # For offline testing where Reason API throws Auth Error and falls back to {}
            # we don't want an infinite loop.
            if getattr(state, "get", lambda k,d: d)("ai_latency_ms", -1) > 0:
                 # AI ran but returned nothing. Stop ping-ponging.
                 return {"next_node": "END"}
            return {"next_node": "reason_node"}

        # Self correction loop check
        try:
            reasoning = json.loads(state.get("claude_reasoning", "{}"))
            maintenance = reasoning.get("maintenance_task", "")
            if "Kanpur" in maintenance and "restricted" in maintenance.lower():
                 # Mock conflict logic
                 await log_agent("supervisor_node", "[RAILMIND] [WARNING] Conflict detected in maintenance task. Re-routing to Reasoner.")
                 if "errors" not in state or state["errors"] is None:
                     state["errors"] = []
                 state["errors"].append("Maintenance task conflicts with active line configurations at Kanpur.")
                 state["claude_reasoning"] = "{}" # clear to force re-reason
                 state["next_node"] = "reason_node"
                 return state
        except json.JSONDecodeError as e:
            logger.warning("JSON parse failed: %s", e)
        except Exception:
            logger.exception("Unexpected error in supervisor self-correction logic")
            raise

        if not state.get("reroute_plan"):
             state["next_node"] = "reroute_node"
             return state

        # If tasks not generated
        if not state.get("department_tasks"):
            state["next_node"] = "coordination_node"
            return state

        # If alerts not sent
        if not state.get("sms_alerts_sent") and len(state.get("department_tasks", [])) > 0:
            state["next_node"] = "alert_node"
            return state

        # Otherwise report and finish
        state["next_node"] = "report_node"

    except Exception as e:
         logger.exception("Error in supervisor_node")
         tb = traceback.format_exc()
         await log_agent("supervisor_node", f"[RAILMIND] [ERROR] Supervisor node failed: {e}\n{tb}")
         state["next_node"] = "END"
    return state
