from typing import List, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import PermissionChecker
from app.models.all import Permission
from app.schemas.user import PermissionResponse

router = APIRouter()


@router.get(
    "/",
    response_model=List[PermissionResponse],
    dependencies=[Depends(PermissionChecker(["roles:manage"]))],
)
def get_permissions(
    db: Session = Depends(get_db)
) -> Any:
    """Retrieve all available system permissions."""
    return db.query(Permission).all()
