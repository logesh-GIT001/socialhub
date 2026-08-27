from typing import Generator, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_token
from app.models.all import User, Permission

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """Authenticates the incoming request's JWT access token and returns the current user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    sub = verify_token(token, token_type="access")
    if sub is None:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == int(sub)).first()
    if user is None:
        raise credentials_exception
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
        
    return user


class PermissionChecker:
    """FastAPI dependency to verify if the authenticated user holds specific permissions."""
    def __init__(self, required_permissions: List[str]):
        self.required_permissions = required_permissions

    def __call__(
        self, current_user: User = Depends(get_current_user)
    ) -> User:
        user_permissions = current_user.permissions

        # Check if user holds all required permissions
        for perm in self.required_permissions:
            if perm not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permissions required: {self.required_permissions}. Action forbidden.",
                )
                
        return current_user
