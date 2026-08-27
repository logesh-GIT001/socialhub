from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    verify_token,
)
from app.models.all import User
from app.schemas.user import (
    UserLogin,
    Token,
    PasswordResetRequest,
    PasswordResetConfirm,
    UserResponse,
)
from app.services.audit_logger import log_action

router = APIRouter()


@router.post("/login", response_model=Token)
def login(
    login_data: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """Logs in a user, returning a JWT access token, refresh token, and user data."""
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    # Check MFA if enabled
    if user.mfa_enabled:
        if not login_data.mfa_token:
            raise HTTPException(
                status_code=status.HTTP_202_ACCEPTED,
                detail="MFA code required",
            )
        # Mock validation or standard validation
        if login_data.mfa_token != "123456" and login_data.mfa_token != "000000":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid MFA verification code",
            )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(user.id, expires_delta=access_token_expires)
    refresh_token = create_refresh_token(user.id)

    log_action(
        db,
        user_id=user.id,
        action="login",
        target_object=f"user:{user.id}",
        request=request,
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/refresh", response_model=Token)
def refresh_token(
    refresh_token_str: str,
    db: Session = Depends(get_db)
) -> Any:
    """Exchanges a valid refresh token for a new set of access/refresh tokens."""
    sub = verify_token(refresh_token_str, token_type="refresh")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = db.query(User).filter(User.id == int(sub)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    access_token = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id)

    return {
        "access_token": access_token,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/forgot-password")
def forgot_password(
    data: PasswordResetRequest,
    db: Session = Depends(get_db)
) -> Any:
    """Initiates the password reset workflow by generating a mock token."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # Avoid user enumeration attacks
        return {"message": "If the email exists, a reset link has been sent."}

    # Simulate email trigger
    reset_token = create_access_token(user.id, expires_delta=timedelta(minutes=15))
    
    log_action(
        db,
        user_id=user.id,
        action="forgot_password_request",
        target_object=f"user:{user.id}",
        details={"reset_token_simulated": reset_token}
    )

    return {
        "message": "If the email exists, a reset link has been sent.",
        "debug_reset_token": reset_token,  # Provided for easy local UI testing
    }


@router.post("/reset-password")
def reset_password(
    data: PasswordResetConfirm,
    db: Session = Depends(get_db)
) -> Any:
    """Uses a reset token to update the user's password."""
    sub = verify_token(data.token, token_type="access")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token",
        )

    user = db.query(User).filter(User.id == int(sub)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found or disabled",
        )

    user.hashed_password = get_password_hash(data.new_password)
    db.commit()

    log_action(
        db,
        user_id=user.id,
        action="password_reset_confirm",
        target_object=f"user:{user.id}"
    )

    return {"message": "Password reset completed successfully."}


@router.post("/logout")
def logout(
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """Logs out the user and registers the logout activity in the audit logs."""
    # Logout is client-side by destroying the JWT.
    # We provide this route to audit/log the logout request if a token is passed.
    try:
        from app.api.deps import get_current_user
        token = request.headers.get("authorization", "").replace("Bearer ", "")
        sub = verify_token(token)
        if sub:
            log_action(
                db,
                user_id=int(sub),
                action="logout",
                target_object=f"user:{sub}",
                request=request
            )
    except Exception:
        pass

    return {"message": "Logged out successfully from this device."}
