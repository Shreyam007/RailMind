from pydantic import BaseModel  # type: ignore
from typing import List, Optional

class TrainModel(BaseModel):
    """
    Data model representing standard train status and route information.
    """
    train_id: str
    name: str
    route: List[str]
    current_station: str
    delay_minutes: int
    status: str  # e.g., 'On Time', 'Delayed', 'Suspended'
    last_updated: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "train_id": "12002",
                "name": "Shatabdi Express",
                "route": ["NDLS", "MTJ", "AGC", "GWL", "VGLJ"],
                "current_station": "AGC",
                "delay_minutes": 5,
                "status": "On Time"
            }
        }
    }
