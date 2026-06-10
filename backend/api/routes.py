from fastapi import APIRouter
from typing import Dict

router = APIRouter()

@router.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Check API health and status.
    """
    return {"status": "healthy", "agent": "RailMind"}

