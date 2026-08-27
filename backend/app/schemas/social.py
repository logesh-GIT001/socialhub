from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class SocialAccountBase(BaseModel):
    platform: str
    name: str
    platform_user_id: str
    is_active: Optional[bool] = True


class SocialAccountResponse(SocialAccountBase):
    id: int
    connected_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SocialAccountConnectRequest(BaseModel):
    platform: str
    code: str
    redirect_uri: Optional[str] = None


# Connection status summary
class PlatformStatus(BaseModel):
    platform: str
    connected: bool
    account_name: Optional[str] = None
    reauth_required: bool
    expires_at: Optional[datetime] = None
