from typing import List, Optional, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import PermissionChecker
from app.models.all import AuditLog
from app.schemas.audit import AuditLogResponse

router = APIRouter()


@router.get(
    "/",
    response_model=List[AuditLogResponse],
    dependencies=[Depends(PermissionChecker(["audit:view"]))],
)
def get_audit_logs(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
) -> Any:
    """Retrieve system security audit logs, filtered by user or action type."""
    query = db.query(AuditLog)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
        
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    
    # Decorate with username manually to avoid lazy loading issues
    for log in logs:
        log.user_name = log.user.full_name if log.user else "System"
        
    return logs
