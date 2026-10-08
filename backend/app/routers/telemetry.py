from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Any
from pydantic import BaseModel
from datetime import datetime

from ..core.database import get_db
from ..models.models import AITelemetryLog

router = APIRouter(prefix="/api/telemetry", tags=["AI Telemetry"])

class TelemetryLogOut(BaseModel):
    id: int
    timestamp: datetime
    provider: str
    model: str
    operation: str
    success: bool
    latency_ms: int
    tokens_used: int
    structured_result: Any
    confidence: float | None
    error_message: str | None

    class Config:
        from_attributes = True

@router.get("/ai", response_model=List[TelemetryLogOut])
def get_ai_telemetry_logs(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(AITelemetryLog).order_by(desc(AITelemetryLog.timestamp)).limit(limit).all()
    return logs
