from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from ..core.database import get_db
from ..core.security import get_current_user, get_optional_user
from ..models.models import Notification, User
from ..schemas.schemas import NotificationOut

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationOut])
def get_notifications(
    role: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    target_role = role or (current_user.role if current_user else "CITIZEN")
    
    query = db.query(Notification)
    if current_user:
        query = query.filter(
            or_(
                Notification.user_id == current_user.id,
                Notification.target_role == current_user.role
            )
        )
    else:
        query = query.filter(Notification.target_role == target_role)
        
    return query.order_by(desc(Notification.created_at)).limit(limit).all()

@router.patch("/{id}/read")
def mark_notification_read(id: int, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "SUCCESS"}
