from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Manages active WebSocket connections and broadcasting.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        try:
            await websocket.send_json({"type": "connection_established", "message": "Connected to RailMind WebSocket"})
        except Exception as e:
            logger.error(f"Error sending connection response: {e}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        # Create a list of failed connections to remove after broadcasting
        failed_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                failed_connections.append(connection)
        for connection in failed_connections:
            self.disconnect(connection)

websocket_manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket):
    """
    Handle live streaming of railway operations updates.
    """
    await websocket_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({
                "type": "echo",
                "received": data
            })
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        websocket_manager.disconnect(websocket)

