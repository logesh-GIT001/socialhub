from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import PermissionChecker, get_current_user
from app.models.all import Role, Permission, User
from app.schemas.user import RoleResponse
from app.services.audit_logger import log_action

router = APIRouter()


@router.get(
    "/",
    response_model=List[RoleResponse],
    dependencies=[Depends(PermissionChecker(["roles:manage"]))],
)
def get_roles(
    db: Session = Depends(get_db)
) -> Any:
    """Retrieve all roles with their permissions."""
    return db.query(Role).all()


@router.put(
    "/{role_id}/permissions",
    response_model=RoleResponse,
    dependencies=[Depends(PermissionChecker(["roles:manage"]))],
)
def update_role_permissions(
    role_id: int,
    permission_names: List[str],
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Updates the permissions assigned to a role."""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")

    # Fetch permissions from DB matching names
    permissions = (
        db.query(Permission)
        .filter(Permission.name.in_(permission_names))
        .all()
    )

    role.permissions = permissions
    db.commit()
    db.refresh(role)

    log_action(
        db,
        user_id=current_user.id,
        action="role_permissions_update",
        target_object=f"role:{role.id}",
        details={"permissions": permission_names},
        request=request
    )

    return role
