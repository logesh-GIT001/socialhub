from typing import Any, Optional
from sqlalchemy.orm import Session
from fastapi import Request
from app.models.all import AuditLog, User


def log_action(
    db: Session,
    user_id: Optional[int],
    action: str,
    target_object: Optional[str] = None,
    details: Optional[Any] = None,
    request: Optional[Request] = None,
) -> None:
    """Logs an action to the audit logs. Action and user details are captured."""
    ip_address = None
    user_agent = None

    if request:
        # Extract IP and User-Agent from HTTP Request context
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

    log_entry = AuditLog(
        user_id=user_id,
        action=action,
        target_object=target_object,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(log_entry)
    db.commit()
