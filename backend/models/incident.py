from pydantic import BaseModel, Field  # type: ignore
from datetime import datetime, timezone
from typing import Optional, Dict, Any

class IncidentModel(BaseModel):
    """
    Data model representing a railway operation incident inside MongoDB.
    """
    id: Optional[str] = Field(default=None, alias="_id")
    title: str
    description: str
    severity: str  # e.g., 'Low', 'Medium', 'High', 'Critical'
    status: str    # e.g., 'Reported', 'Investigating', 'Resolved'
    train_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Optional[Dict[str, Any]] = None

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "title": "Track Blockage at Vadodara Junction",
                "description": "Debris detected on track Platform 2",
                "severity": "Critical",
                "status": "Reported",
                "train_id": "12951",
            }
        }
    }
