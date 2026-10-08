import logging
import re
from typing import Optional
from sqlalchemy.orm import Session
from ..models.models import Notification, Complaint, User

logger = logging.getLogger("urbangrid.notifications")

def clean_safe_ascii(text_str: str) -> str:
    """Removes emojis and unencodable characters to ensure compatibility with all DB encodings"""
    if not text_str:
        return ""
    # Replace em-dashes and common symbols
    s = text_str.replace("—", "-").replace("–", "-").replace("→", "->")
    # Remove emojis and high code-point characters
    s = re.sub(r'[^\x00-\x7F]+', ' ', s)
    return s.strip()

def create_notification(
    db: Session,
    target_role: str,
    title: str,
    message: str,
    complaint_id: Optional[int] = None,
    user_id: Optional[int] = None,
    notification_type: str = "INFO"
) -> Notification:
    """
    Creates an in-app civic notification stored in PostgreSQL.
    """
    safe_title = clean_safe_ascii(title)
    safe_message = clean_safe_ascii(message)
    
    notif = Notification(
        user_id=user_id,
        target_role=target_role,
        complaint_id=complaint_id,
        title=safe_title,
        message=safe_message,
        type=notification_type,
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    logger.info(f"[NOTIFICATION] Role: {target_role}, Complaint: {complaint_id}, Title: {safe_title}")
    return notif
