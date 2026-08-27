from datetime import datetime, timedelta, timezone
from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import PermissionChecker, get_current_user
from app.models.all import User, SocialAccount, OAuthToken
from app.schemas.social import (
    SocialAccountResponse,
    SocialAccountConnectRequest,
    PlatformStatus,
)
from app.core.security import encrypt_token, decrypt_token
from app.services.social_platforms.manager import platform_manager
from app.services.audit_logger import log_action

router = APIRouter()

SUPPORTED_PLATFORMS = ["instagram", "linkedin", "x", "naukri"]


@router.get(
    "/accounts",
    response_model=List[SocialAccountResponse],
    dependencies=[Depends(PermissionChecker(["social_accounts:view"]))],
)
def get_connected_accounts(
    db: Session = Depends(get_db)
) -> Any:
    """List all connected social media accounts."""
    return db.query(SocialAccount).all()


@router.get(
    "/connect/{platform}",
    dependencies=[Depends(PermissionChecker(["social_accounts:connect"]))],
)
def get_connect_url(
    platform: str,
    state: str = "state123",
) -> Any:
    """Generates the authorization URL for a social platform OAuth flow."""
    if platform.lower() not in SUPPORTED_PLATFORMS:
        raise HTTPException(
            status_code=400,
            detail=f"Platform '{platform}' is not supported.",
        )
    
    # Embed platform into state to avoid query parameters in redirect_uri
    oauth_state = f"platform:{platform.lower()}"
    
    adapter = platform_manager.get_adapter(platform)
    if adapter.is_mock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"API credentials for '{platform}' are not configured. Please set them in your backend/.env file.",
        )
    
    auth_url = adapter.get_authorization_url(state=oauth_state)
    
    return {"platform": platform, "authorization_url": auth_url}


@router.post(
    "/connect",
    response_model=SocialAccountResponse,
    dependencies=[Depends(PermissionChecker(["social_accounts:connect"]))],
)
async def connect_platform_account(
    connect_in: SocialAccountConnectRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Handles OAuth callback logic: swaps authorization code for token, encrypts, and saves."""
    platform = connect_in.platform.lower()
    if platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")

    try:
        adapter = platform_manager.get_adapter(platform)
        token_info = await adapter.fetch_access_token(
            auth_code=connect_in.code,
            redirect_uri=connect_in.redirect_uri
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to fetch access token from platform: {str(e)}",
        )

    # Check if this account was already connected
    existing_account = (
        db.query(SocialAccount)
        .filter(SocialAccount.platform == platform)
        .filter(SocialAccount.platform_user_id == token_info["platform_user_id"])
        .first()
    )

    if existing_account:
        # Re-activate and update
        account = existing_account
        account.name = token_info["account_name"]
        account.is_active = True
        account.connected_by_id = current_user.id
        account.updated_at = datetime.now(timezone.utc)
    else:
        # Create new connection
        account = SocialAccount(
            platform=platform,
            name=token_info["account_name"],
            platform_user_id=token_info["platform_user_id"],
            is_active=True,
            connected_by_id=current_user.id,
        )
        db.add(account)
        db.flush()

    # Encrypt tokens
    encrypted_access = encrypt_token(token_info["access_token"])
    encrypted_refresh = encrypt_token(token_info["refresh_token"]) if token_info.get("refresh_token") else None
    
    expires_delta = token_info.get("expires_in_seconds")
    expires_at = None
    if expires_delta:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_delta))

    # Save or update OAuth token
    token_record = db.query(OAuthToken).filter(OAuthToken.social_account_id == account.id).first()
    if token_record:
        token_record.access_token = encrypted_access
        token_record.refresh_token = encrypted_refresh or token_record.refresh_token
        token_record.expires_at = expires_at or token_record.expires_at
        token_record.updated_at = datetime.now(timezone.utc)
    else:
        token_record = OAuthToken(
            social_account_id=account.id,
            access_token=encrypted_access,
            refresh_token=encrypted_refresh,
            expires_at=expires_at,
        )
        db.add(token_record)

    db.commit()
    db.refresh(account)

    log_action(
        db,
        user_id=current_user.id,
        action="social_account_connect",
        target_object=f"social_account:{account.id}",
        details={"platform": platform, "account_name": account.name},
        request=request
    )

    return account


@router.delete(
    "/accounts/{account_id}",
    dependencies=[Depends(PermissionChecker(["social_accounts:connect"]))],
)
def disconnect_account(
    account_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Disconnects and removes a social account and its encrypted tokens."""
    account = db.query(SocialAccount).filter(SocialAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Social account not found.")

    # Audit log before deletion
    log_action(
        db,
        user_id=current_user.id,
        action="social_account_disconnect",
        target_object=f"social_account:{account_id}",
        details={"platform": account.platform, "name": account.name},
        request=request
    )

    db.delete(account)
    db.commit()
    return {"message": "Account disconnected successfully."}


@router.get(
    "/status",
    response_model=List[PlatformStatus],
    dependencies=[Depends(PermissionChecker(["social_accounts:view"]))],
)
def get_connection_status(
    db: Session = Depends(get_db)
) -> Any:
    """Returns the connection status summary of all supported platforms."""
    accounts = db.query(SocialAccount).filter(SocialAccount.is_active == True).all()
    account_map = {acc.platform.lower(): acc for acc in accounts}
    
    status_list = []
    now = datetime.now(timezone.utc)
    
    for platform in SUPPORTED_PLATFORMS:
        acc = account_map.get(platform)
        if acc:
            token = db.query(OAuthToken).filter(OAuthToken.social_account_id == acc.id).first()
            reauth = False
            expires_at = None
            if token and token.expires_at:
                expires_at = token.expires_at.replace(tzinfo=timezone.utc) if token.expires_at.tzinfo is None else token.expires_at
                # If expiring within 24 hours, flag reauthorization
                reauth = expires_at < (now + timedelta(hours=24))
                
            status_list.append({
                "platform": platform,
                "connected": True,
                "account_name": acc.name,
                "reauth_required": reauth,
                "expires_at": expires_at,
            })
        else:
            status_list.append({
                "platform": platform,
                "connected": False,
                "account_name": None,
                "reauth_required": False,
                "expires_at": None,
            })
            
    return status_list
