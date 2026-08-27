from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import PermissionChecker, get_current_user
from app.models.all import Setting, User
from app.services.audit_logger import log_action

router = APIRouter()


@router.get(
    "/",
    dependencies=[Depends(PermissionChecker(["settings:manage"]))],
)
def get_all_settings(
    db: Session = Depends(get_db)
) -> Any:
    """Retrieve all system settings as key-value pairs."""
    records = db.query(Setting).all()
    # If settings table is empty, seed defaults
    if not records:
        defaults = {
            "mfa_required": "false",
            "rate_limit_per_minute": "60",
            "allowed_email_domains": "socialhub.corp,company.com",
            "media_max_upload_size_mb": "50",
        }
        for k, v in defaults.items():
            db.add(Setting(key=k, value=v, description=f"System setting '{k}'"))
        db.commit()
        records = db.query(Setting).all()

    return {r.key: r.value for r in records}


@router.put(
    "/",
    dependencies=[Depends(PermissionChecker(["settings:manage"]))],
)
def update_settings(
    payload: Dict[str, str],
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Updates one or more settings."""
    for k, v in payload.items():
        setting = db.query(Setting).filter(Setting.key == k).first()
        if setting:
            setting.value = v
        else:
            setting = Setting(key=k, value=v, description=f"Custom setting '{k}'")
            db.add(setting)

    db.commit()

    log_action(
        db,
        user_id=current_user.id,
        action="settings_update",
        target_object="settings",
        details=list(payload.keys()),
        request=request
    )

    return {"message": "Settings updated successfully."}
